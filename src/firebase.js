import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore'

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Check if Firebase is configured
const isConfigured = Object.values(firebaseConfig).every(val => val && val !== '')

let app, auth, db, provider

if (isConfigured) {
  // Initialize Firebase
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  provider = new GoogleAuthProvider()
} else {
  console.warn('Firebase not configured. Please add your Firebase config to .env file.')
}

// Auth functions
export const signInWithGoogle = async () => {
  if (!isConfigured) {
    throw new Error('Firebase not configured')
  }
  try {
    const result = await signInWithPopup(auth, provider)
    return result.user
  } catch (error) {
    console.error('Error signing in:', error)
    throw error
  }
}

export const signUpWithEmail = async (email, password) => {
  if (!isConfigured) {
    throw new Error('Firebase not configured')
  }
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    return result.user
  } catch (error) {
    console.error('Error signing up:', error)
    throw error
  }
}

export const signInWithEmail = async (email, password) => {
  if (!isConfigured) {
    throw new Error('Firebase not configured')
  }
  try {
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  } catch (error) {
    console.error('Error signing in:', error)
    throw error
  }
}

export const signOutUser = async () => {
  if (!isConfigured) return
  try {
    await signOut(auth)
  } catch (error) {
    console.error('Error signing out:', error)
    throw error
  }
}

export const onAuthChange = (callback) => {
  if (!isConfigured) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(auth, callback)
}

// Firestore functions
export const getUserData = async (userId) => {
  if (!isConfigured) return null
  try {
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (userDoc.exists()) {
      return userDoc.data()
    }
    return null
  } catch (error) {
    console.error('Error getting user data:', error)
    throw error
  }
}

export const createUserProfile = async (userId, userData) => {
  if (!isConfigured) return
  try {
    await setDoc(doc(db, 'users', userId), {
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error creating user profile:', error)
    throw error
  }
}

export const updateUserData = async (userId, data) => {
  if (!isConfigured) return
  try {
    await updateDoc(doc(db, 'users', userId), {
      ...data,
      updatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error updating user data:', error)
    throw error
  }
}

export const getLeaderboard = async (limitCount = 10) => {
  if (!isConfigured) return []
  try {
    const q = query(
      collection(db, 'users'),
      orderBy('balance', 'desc'),
      limit(limitCount)
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error getting leaderboard:', error)
    return []
  }
}

export const subscribeToLeaderboard = (callback, limitCount = 10) => {
  if (!isConfigured) {
    callback([])
    return () => {}
  }
  try {
    const q = query(
      collection(db, 'users'),
      orderBy('balance', 'desc'),
      limit(limitCount)
    )
    return onSnapshot(q, (snapshot) => {
      const leaderboard = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      callback(leaderboard)
    })
  } catch (error) {
    console.error('Error subscribing to leaderboard:', error)
    callback([])
    return () => {}
  }
}

export { isConfigured, auth, db }
