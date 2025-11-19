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
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, orderBy, limit, getDocs, onSnapshot, addDoc, where, serverTimestamp, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore'

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

// Chat functions
export const sendChatMessage = async (userId, username, avatar, profileImage, message) => {
  if (!isConfigured) return
  try {
    await addDoc(collection(db, 'chat'), {
      userId,
      username,
      avatar,
      profileImage,
      message,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error sending message:', error)
    throw error
  }
}

export const subscribeToChatMessages = (callback, limitCount = 50) => {
  if (!isConfigured) {
    callback([])
    return () => {}
  }
  try {
    const q = query(
      collection(db, 'chat'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    )
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse()
      callback(messages)
    })
  } catch (error) {
    console.error('Error subscribing to chat:', error)
    callback([])
    return () => {}
  }
}

// Friend system functions
export const sendFriendRequest = async (fromUserId, toUserId) => {
  if (!isConfigured) return
  try {
    await addDoc(collection(db, 'friendRequests'), {
      from: fromUserId,
      to: toUserId,
      status: 'pending',
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error sending friend request:', error)
    throw error
  }
}

export const acceptFriendRequest = async (requestId, userId, friendId) => {
  if (!isConfigured) return
  try {
    // Add to both users' friend lists
    await updateDoc(doc(db, 'users', userId), {
      friends: arrayUnion(friendId)
    })
    await updateDoc(doc(db, 'users', friendId), {
      friends: arrayUnion(userId)
    })
    // Delete the friend request
    await deleteDoc(doc(db, 'friendRequests', requestId))
  } catch (error) {
    console.error('Error accepting friend request:', error)
    throw error
  }
}

export const declineFriendRequest = async (requestId) => {
  if (!isConfigured) return
  try {
    await deleteDoc(doc(db, 'friendRequests', requestId))
  } catch (error) {
    console.error('Error declining friend request:', error)
    throw error
  }
}

export const getFriendRequests = async (userId) => {
  if (!isConfigured) return []
  try {
    const q = query(
      collection(db, 'friendRequests'),
      where('to', '==', userId),
      where('status', '==', 'pending')
    )
    const querySnapshot = await getDocs(q)
    const requests = []
    for (const docSnap of querySnapshot.docs) {
      const requestData = docSnap.data()
      const fromUserDoc = await getDoc(doc(db, 'users', requestData.from))
      if (fromUserDoc.exists()) {
        requests.push({
          id: docSnap.id,
          ...requestData,
          fromUser: fromUserDoc.data()
        })
      }
    }
    return requests
  } catch (error) {
    console.error('Error getting friend requests:', error)
    return []
  }
}

export const getFriends = async (userId) => {
  if (!isConfigured) return []
  try {
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (!userDoc.exists()) return []

    const friendIds = userDoc.data().friends || []
    const friends = []

    for (const friendId of friendIds) {
      const friendDoc = await getDoc(doc(db, 'users', friendId))
      if (friendDoc.exists()) {
        friends.push({
          id: friendId,
          ...friendDoc.data()
        })
      }
    }
    return friends
  } catch (error) {
    console.error('Error getting friends:', error)
    return []
  }
}

// Gift system
export const sendGift = async (fromUserId, toUserId, amount) => {
  if (!isConfigured) return
  try {
    // Get both users' data
    const fromUserDoc = await getDoc(doc(db, 'users', fromUserId))
    const toUserDoc = await getDoc(doc(db, 'users', toUserId))

    if (!fromUserDoc.exists() || !toUserDoc.exists()) {
      throw new Error('User not found')
    }

    const fromUserBalance = fromUserDoc.data().balance || 0
    if (fromUserBalance < amount) {
      throw new Error('Insufficient balance')
    }

    // Update balances
    await updateDoc(doc(db, 'users', fromUserId), {
      balance: fromUserBalance - amount
    })

    const toUserBalance = toUserDoc.data().balance || 0
    await updateDoc(doc(db, 'users', toUserId), {
      balance: toUserBalance + amount
    })

    // Log the transaction
    await addDoc(collection(db, 'transactions'), {
      type: 'gift',
      from: fromUserId,
      to: toUserId,
      amount,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error sending gift:', error)
    throw error
  }
}

// Search users
export const searchUsers = async (searchTerm) => {
  if (!isConfigured) return []
  try {
    const q = query(collection(db, 'users'))
    const querySnapshot = await getDocs(q)
    const users = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(user =>
        user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 10) // Limit to 10 results
    return users
  } catch (error) {
    console.error('Error searching users:', error)
    return []
  }
}

export { isConfigured, auth, db }
