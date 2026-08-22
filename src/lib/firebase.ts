// ============================================================
// KesslerX Firebase Client Configuration
// This file initializes the Firebase JS SDK for frontend use.
// Config values are populated after running `firebase login`
// and creating a project.
// ============================================================

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, type Auth } from 'firebase/auth';

// Firebase configuration for KesslerX (project: keerx-25b72)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDSY__r29xriVlwm1FYGqbJhOfK7H5Wc8M',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'keerx-25b72.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'keerx-25b72',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'keerx-25b72.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '657236903390',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:657236903390:web:6c4354afcb53c9960b894f',
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfig.apiKey) {
    console.warn('Firebase not configured. Set VITE_FIREBASE_* env vars.');
    return null;
  }
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!auth) {
    auth = getAuth(firebaseApp);
  }
  return auth;
}

export async function firebaseSignIn(email: string, password: string) {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) throw new Error('Firebase Auth not configured');
  return signInWithEmailAndPassword(firebaseAuth, email, password);
}

export async function firebaseSignOut() {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) return;
  return signOut(firebaseAuth);
}

export function isFirebaseConfigured(): boolean {
  return !!firebaseConfig.apiKey;
}
