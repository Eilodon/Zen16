
import { create } from 'zustand';
import { AppState, ZenResponse, CulturalMode, Language, InputMode, ConversationEntry, ConnectionState, RealtimeMetrics } from '../types';

export type PermissionStatus = 'idle' | 'prompting' | 'granted' | 'denied';

export interface User {
  name: string;
  email: string;
  isGuest: boolean;
}

interface UIState {
  culturalMode: CulturalMode;
  language: Language;
  inputMode: InputMode;
  snackbar: { kind: "success" | "warn" | "error" | "info", text: string } | null;
  isLoading: boolean;
  showBreathing: boolean;
  emergencyActive: boolean;
  user: User | null;
  isOnboardingComplete: boolean;

  setCulturalMode: (mode: CulturalMode) => void;
  setLanguage: (lang: Language) => void;
  setInputMode: (mode: InputMode) => void;
  setSnackbar: (snack: UIState['snackbar']) => void;
  setIsLoading: (loading: boolean) => void;
  setShowBreathing: (show: boolean) => void;
  setEmergencyActive: (active: boolean) => void;
  setUser: (user: User | null) => void;
  setIsOnboardingComplete: (complete: boolean) => void;
}

interface ZenSessionState {
  status: AppState;
  connectionState: ConnectionState;
  zenData: ZenResponse | null;
  history: ConversationEntry[];
  connectionAttempts: number;

  // Permissions State
  micStatus: PermissionStatus;
  cameraStatus: PermissionStatus;
  metrics: RealtimeMetrics;

  setStatus: (status: AppState) => void;
  setConnectionState: (state: ConnectionState) => void;
  setZenData: (data: ZenResponse | null) => void;
  setHistory: (history: ConversationEntry[]) => void;
  addToHistory: (entry: ConversationEntry) => void;
  incrementConnectionAttempts: () => void;
  resetConnectionAttempts: () => void;

  setMicStatus: (status: PermissionStatus) => void;
  setCameraStatus: (status: PermissionStatus) => void;
  resetMetrics: () => void;
  updateMetrics: (updater: (metrics: RealtimeMetrics) => RealtimeMetrics) => void;
}

const initialMetrics: RealtimeMetrics = {
  sessionsStarted: 0,
  currentSessionStartedAt: null,
  lastTtfbMs: null,
  avgTtfbMs: null,
  ttfbSamples: 0,
  interruptions: 0,
  lastInterruptionAt: null,
  lastInterruptionRecoveryMs: null,
  avgInterruptionRecoveryMs: null,
  interruptionRecoverySamples: 0,
  reconnectAttempts: 0,
  reconnectSuccesses: 0,
  authRequests: 0,
  authFailures: 0,
  visionFramesSent: 0,
  visionFramesDropped: 0,
};

const cloneInitialMetrics = (): RealtimeMetrics => ({ ...initialMetrics });

export const useUIStore = create<UIState>((set) => ({
  culturalMode: 'Universal',
  language: 'vi',
  inputMode: 'voice',
  snackbar: null,
  isLoading: true,
  showBreathing: false,
  emergencyActive: false,
  user: null,
  isOnboardingComplete: false,

  setCulturalMode: (mode) => set({ culturalMode: mode }),
  setLanguage: (lang) => set({ language: lang }),
  setInputMode: (mode) => set({ inputMode: mode }),
  setSnackbar: (snack) => set({ snackbar: snack }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setShowBreathing: (show) => set({ showBreathing: show }),
  setEmergencyActive: (active) => set({ emergencyActive: active }),
  setUser: (user) => set({ user }),
  setIsOnboardingComplete: (complete) => set({ isOnboardingComplete: complete }),
}));

export const useZenStore = create<ZenSessionState>((set) => ({
  status: 'idle',
  connectionState: 'disconnected',
  zenData: null,
  history: [],
  connectionAttempts: 0,

  micStatus: 'idle',
  cameraStatus: 'idle',
  metrics: cloneInitialMetrics(),

  setStatus: (status) => set({ status }),
  setConnectionState: (state) => set({ connectionState: state }),
  setZenData: (data) => set({ zenData: data }),
  setHistory: (history) => set({ history: history.slice(-50) }),
  addToHistory: (entry) => set((state) => ({ history: [...state.history, entry].slice(-50) })),
  incrementConnectionAttempts: () => set((state) => ({ connectionAttempts: state.connectionAttempts + 1 })),
  resetConnectionAttempts: () => set({ connectionAttempts: 0 }),

  setMicStatus: (status) => set({ micStatus: status }),
  setCameraStatus: (status) => set({ cameraStatus: status }),
  resetMetrics: () => set({ metrics: cloneInitialMetrics() }),
  updateMetrics: (updater) => set((state) => ({ metrics: updater(state.metrics) })),
}));
