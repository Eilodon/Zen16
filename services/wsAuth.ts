import { auth } from './firebase';

const RAW_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'ws://localhost:8080';
const BACKEND_HTTP_URL = RAW_BACKEND_URL.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
const AUTH_TOKEN_ENDPOINT = import.meta.env.VITE_AUTH_TOKEN_ENDPOINT || `${BACKEND_HTTP_URL}/auth/ws-token`;
const WS_AUTH_REQUIRED_MODE = (import.meta.env.VITE_WS_AUTH_REQUIRED || 'auto').toLowerCase();
const AUTH_REQUIREMENT_CACHE_MS = 30_000;

interface IssuedWsToken {
  token: string;
  expires_at: number;
  expires_in: number;
}

interface AuthBridge {
  getIdToken?: () => Promise<string | null>;
}

let cachedWsToken: IssuedWsToken | null = null;
let cachedAuthRequirement: { required: boolean; expiresAt: number } | null = null;
let authRequirementPromise: Promise<boolean> | null = null;

const isAuthExplicitlyRequired = (): boolean => {
  return WS_AUTH_REQUIRED_MODE === 'on' || WS_AUTH_REQUIRED_MODE === 'true' || WS_AUTH_REQUIRED_MODE === '1';
};

const isAuthExplicitlyDisabled = (): boolean => {
  return WS_AUTH_REQUIRED_MODE === 'off' || WS_AUTH_REQUIRED_MODE === 'false' || WS_AUTH_REQUIRED_MODE === '0';
};

const inferAuthRequirementFromBackendUrl = (): boolean => {
  try {
    const backendHost = new URL(BACKEND_HTTP_URL).hostname;
    return backendHost.endsWith('.run.app');
  } catch {
    return false;
  }
};

const resolveBackendAuthRequirement = async (): Promise<boolean> => {
  if (isAuthExplicitlyRequired()) return true;
  if (isAuthExplicitlyDisabled()) return false;

  const now = Date.now();
  if (cachedAuthRequirement && cachedAuthRequirement.expiresAt > now) {
    return cachedAuthRequirement.required;
  }

  if (authRequirementPromise) {
    return authRequirementPromise;
  }

  authRequirementPromise = (async () => {
    const controller = new AbortController();
    const timer = globalThis.setTimeout(() => controller.abort(), 1500);

    try {
      const response = await fetch(`${BACKEND_HTTP_URL}/`, {
        method: 'GET',
        signal: controller.signal,
        credentials: 'omit',
      });

      if (response.ok) {
        const payload = await response.json();
        const required = Boolean(payload?.security?.auth_required);
        cachedAuthRequirement = {
          required,
          expiresAt: Date.now() + AUTH_REQUIREMENT_CACHE_MS,
        };
        return required;
      }
    } catch {
      // Ignore probe failures and use deterministic fallback below.
    } finally {
      globalThis.clearTimeout(timer);
    }

    const inferred = inferAuthRequirementFromBackendUrl();
    cachedAuthRequirement = {
      required: inferred,
      expiresAt: Date.now() + AUTH_REQUIREMENT_CACHE_MS,
    };
    return inferred;
  })()
    .finally(() => {
      authRequirementPromise = null;
    });

  return authRequirementPromise;
};

const getIdTokenFromBridge = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;
  const bridge = window.Zen16Auth as AuthBridge | undefined;
  const bridgeToken = await bridge?.getIdToken?.();
  return bridgeToken || null;
};

const getIdTokenFromFirebaseSdk = async (): Promise<string | null> => {
  if (!auth) return null;

  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady();
  }

  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
};

const getIdentityToken = async (): Promise<string | null> => {
  const fromBridge = await getIdTokenFromBridge();
  if (fromBridge) return fromBridge;

  try {
    return await getIdTokenFromFirebaseSdk();
  } catch (err) {
    console.warn('[Zen16 Auth] Firebase token resolve failed', err);
    return null;
  }
};

const isCachedTokenValid = (token: IssuedWsToken | null): token is IssuedWsToken => {
  if (!token) return false;
  const now = Math.floor(Date.now() / 1000);
  return token.expires_at - now > 20;
};

export const getWebSocketAccessToken = async (): Promise<string | null> => {
  if (isCachedTokenValid(cachedWsToken)) {
    return cachedWsToken.token;
  }

  const authRequired = await resolveBackendAuthRequirement();
  const idToken = await getIdentityToken();
  if (!idToken) {
    if (authRequired) {
      throw new Error('AUTH_REQUIRED');
    }
    return null;
  }

  const response = await fetch(AUTH_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('AUTH_REQUIRED');
    }
    if (!authRequired) {
      console.warn(`[Zen16 Auth] WS token issuer unavailable (${response.status}), continuing without token.`);
      return null;
    }
    throw new Error(`AUTH_ISSUER_FAILED:${response.status}`);
  }

  const payload = (await response.json()) as IssuedWsToken;
  if (!payload?.token || !payload?.expires_at) {
    if (!authRequired) {
      console.warn('[Zen16 Auth] WS token issuer returned invalid payload, continuing without token.');
      return null;
    }
    throw new Error('AUTH_ISSUER_INVALID_RESPONSE');
  }

  cachedWsToken = payload;
  return payload.token;
};

export const buildWsUrlWithToken = (baseWsUrl: string, token?: string | null): string => {
  if (!token) return baseWsUrl;

  try {
    const url = new URL(baseWsUrl);
    url.searchParams.set('token', token);
    return url.toString();
  } catch {
    const separator = baseWsUrl.includes('?') ? '&' : '?';
    return `${baseWsUrl}${separator}token=${encodeURIComponent(token)}`;
  }
};
