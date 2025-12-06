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
let _recaptchaContainerId = null;

function getFirebaseApp() {
  if (typeof window === "undefined") return null; // SSR guard

  if (!getApps().length) {
    if (!firebaseConfig.apiKey) {
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

  const auth = getFirebaseAuth();

  // If we already have one, but its DOM element is gone, reset it
  if (_recaptcha) {
    const el = document.getElementById(_recaptchaContainerId || containerId);
    if (!el) {
      try {
        _recaptcha.clear();
      } catch {
        // ignore
      }
      _recaptcha = null;
      _recaptchaContainerId = null;
    }
  }

  // Create if needed
  if (!_recaptcha) {
    const el = document.getElementById(containerId);
    if (!el) {
      console.warn(
        `[firebaseClient] reCAPTCHA container #${containerId} not found in DOM`
      );
    }

    _recaptchaContainerId = containerId;
    _recaptcha = new RecaptchaVerifier(auth, containerId, {
      size: "invisible", // keep invisible; you can switch to "normal" if you want a visible widget
    });
  }

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
