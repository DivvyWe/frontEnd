"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let _auth = null;
let _recaptcha = null;

function getFirebaseApp() {
  if (typeof window === "undefined") return null; // SSR guard

  if (!getApps().length) {
    if (!firebaseConfig.apiKey) {
      // Helps debugging if envs are missing
      console.warn(
        "[firebaseClient] Missing Firebase config env vars, check NEXT_PUBLIC_FIREBASE_*"
      );
    }
    initializeApp(firebaseConfig);
  }
  return getApp();
}

export function getFirebaseAuth() {
  if (typeof window === "undefined") {
    throw new Error("Firebase Auth can only be used in the browser");
  }
  if (_auth) return _auth;
  const app = getFirebaseApp();
  _auth = getAuth(app);
  return _auth;
}

export function getRecaptchaVerifier(
  containerId = "firebase-recaptcha-container"
) {
  if (typeof window === "undefined") {
    throw new Error("ReCAPTCHA can only be used in the browser");
  }

  if (_recaptcha) return _recaptcha;

  const auth = getFirebaseAuth();

  _recaptcha = new RecaptchaVerifier(auth, containerId, {
    size: "invisible", // we keep it invisible, you can change to "normal" if you want widget
  });

  return _recaptcha;
}

/**
 * Start phone sign-in by sending SMS.
 * Returns Firebase `confirmationResult`.
 */
export async function sendFirebaseSms(phoneE164) {
  const auth = getFirebaseAuth();
  const verifier = getRecaptchaVerifier();
  return signInWithPhoneNumber(auth, phoneE164, verifier);
}

/**
 * Get current Firebase user ID token (for backend verification).
 */
export async function getFirebaseIdToken(forceRefresh = true) {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No Firebase user is signed in");
  }
  return user.getIdToken(forceRefresh);
}
