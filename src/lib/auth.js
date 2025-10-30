import { auth, db, functions } from './firebase.js';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export async function initializeUser() {
  const user = auth.currentUser;
  if (!user) throw new Error('No user signed in');

  // Check if user exists
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    // Initialize new user with economyInitUser Cloud Function
    const initUser = httpsCallable(functions, 'economyInitUser');
    try {
      const result = await initUser({ uid: user.uid });
      return result.data;
    } catch (error) {
      console.error('Error initializing user:', error);
      throw error;
    }
  }

  return userDoc.data();
}

export async function getCurrentUserData() {
  const user = auth.currentUser;
  if (!user) return null;

  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);

  return userDoc.exists() ? userDoc.data() : null;
}

export async function getUserBalance() {
  const userData = await getCurrentUserData();
  return userData?.balance || 0;
}
