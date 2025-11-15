# Firebase Setup Guide for FATTY CASINO

This guide will walk you through setting up Firebase Authentication and Firestore for your casino application.

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Enter a project name (e.g., "fatty-casino")
4. (Optional) Enable Google Analytics
5. Click "Create project"

## Step 2: Enable Google Authentication

1. In your Firebase project, click on "Authentication" in the left sidebar
2. Click "Get started" if this is your first time
3. Go to the "Sign-in method" tab
4. Click on "Google" in the providers list
5. Toggle "Enable"
6. Select a support email for your project
7. Click "Save"

## Step 3: Create Firestore Database

1. In your Firebase project, click on "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" for development (or production mode for deployment)
4. Select a Cloud Firestore location (choose one close to your users)
5. Click "Enable"

### Important: Update Firestore Security Rules

For development, you can use test mode. For production, update your rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write their own data
    match /users/{userId} {
      allow read: if true; // Anyone can read for leaderboard
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Step 4: Get Your Firebase Config

1. In your Firebase project, click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps"
4. Click the "</>" (Web) icon to add a web app
5. Enter an app nickname (e.g., "Fatty Casino Web")
6. Click "Register app"
7. You'll see a config object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc..."
};
```

## Step 5: Add Config to Your Project

1. Open the `.env` file in your project root
2. Copy the values from your Firebase config and paste them:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc...
```

3. Save the file

## Step 6: Configure Authorized Domains

1. In Firebase Console, go to Authentication > Settings > Authorized domains
2. Add `localhost` (should already be there)
3. When you deploy, add your production domain

## Step 7: Start Your Application

1. Make sure your `.env` file is configured
2. Restart your development server:
   ```bash
   npm run dev
   ```
3. Open http://localhost:5173/
4. You should see the login screen with "Sign in with Google" button
5. Click the button and sign in with your Google account

## Troubleshooting

### "Firebase not configured" error
- Make sure all environment variables in `.env` are filled in
- Restart the development server after updating `.env`

### Authentication popup doesn't appear
- Check that Google auth is enabled in Firebase Console
- Make sure `localhost` is in authorized domains
- Check browser console for errors

### Can't read/write to Firestore
- Check Firestore security rules
- Make sure you're signed in
- Check browser console for permission errors

### Data not persisting
- Check that Firestore is properly initialized
- Look for errors in browser console
- Verify Firestore rules allow your user to write

## Firestore Data Structure

The app uses this data structure:

```
users/{userId}
├── username: string
├── email: string
├── avatar: string
├── theme: string
├── balance: number
├── stats: object
│   ├── totalWagered: number
│   ├── totalWon: number
│   ├── totalLost: number
│   ├── gamesPlayed: number
│   ├── biggestWin: number
│   ├── winStreak: number
│   └── currentStreak: number
├── createdAt: timestamp
└── updatedAt: timestamp
```

## Next Steps

- Customize your Firestore security rules for production
- Set up Firebase Hosting for deployment
- Enable additional sign-in methods if desired
- Set up Cloud Functions for advanced features

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify all Firebase services are enabled
3. Check that `.env` variables are correct
4. Make sure you restarted the dev server after config changes
