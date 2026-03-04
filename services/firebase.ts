import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasRequiredConfig = Boolean(
    firebaseConfig.apiKey &&
        firebaseConfig.authDomain &&
        firebaseConfig.projectId
);

let app: ReturnType<typeof initializeApp> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

if (hasRequiredConfig) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
    } catch (error) {
        console.warn("[Zen16 Auth] Firebase init failed, running without Firebase Auth.", error);
        app = null;
        auth = null;
    }
} else {
    console.info("[Zen16 Auth] Firebase config missing, guest/bridge auth only.");
}

export { app, auth };
export const isFirebaseAuthAvailable = auth !== null;
