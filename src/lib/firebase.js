import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDrTWkB7FI7KGES0179xuMzx5gA21Cbvcc",
  authDomain: "fatty-casino.firebaseapp.com",
  projectId: "fatty-casino",
  storageBucket: "fatty-casino.appspot.com",
  messagingSenderId: "591342088549",
  appId: "1:591342088549:web:3e2b8791677f375881718c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Use emulators in development (optional - disabled for now)
// Uncomment below to use local emulators
/*
if (import.meta.env.DEV) {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5001);
  } catch (e) {
    // Emulators might already be connected
  }
}
*/

// Auth helpers
export async function signIn() {
  try {
    await signInAnonymously(auth);
    return auth.currentUser;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function signOut() {
  return auth.signOut();
}