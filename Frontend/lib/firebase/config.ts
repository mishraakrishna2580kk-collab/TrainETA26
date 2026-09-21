import { getApps, getApp, initializeApp, type FirebaseApp } from 'firebase/app'

/**
 * Firebase is configured entirely through public env vars (safe to expose —
 * these identify the project, they are not secrets). Add them in your Vercel
 * project settings / .env.local:
 *
 *   NEXT_PUBLIC_FIREBASE_API_KEY
 *   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 *   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 *   NEXT_PUBLIC_FIREBASE_APP_ID
 *
 * Any privileged server credentials (Admin SDK, service accounts) must NEVER be
 * prefixed with NEXT_PUBLIC and must stay in server-only env vars.
 */
function cleanEnv(val: string | undefined): string | undefined {
  if (!val) return undefined
  const trimmed = val.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

export const firebaseConfig = {
  apiKey: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
}

/** True only when every required Firebase env var is present. */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  )
}

/** Lazily initialise (and reuse) the Firebase app when configured. */
export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null
  return getApps().length ? getApp() : initializeApp(firebaseConfig)
}

/**
 * Maps Firebase Auth error codes and messages into user-friendly strings.
 */
export function formatAuthError(err: unknown): string {
  if (!err || typeof err !== 'object') {
    return 'An unexpected error occurred. Please try again.'
  }

  const code = 'code' in err ? String(err.code) : ''

  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password.'
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/user-disabled':
      return 'This account has been disabled.'
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a few minutes or reset your password.'
    case 'auth/operation-not-allowed':
      return 'This sign-in provider is not enabled in Firebase Console. Please enable Email/Password or Google in Authentication > Sign-in method.'
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for OAuth in Firebase Console. Add this domain (e.g. localhost) in Authentication > Settings > Authorized domains.'
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was closed before completing.'
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site.'
    case 'auth/cancelled-popup-request':
      return 'Sign-in popup was cancelled.'
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.'
    case 'auth/requires-recent-login':
      return 'Please sign out and sign in again before performing this action.'
    default:
      if ('message' in err && typeof err.message === 'string') {
        const cleaned = err.message
          .replace(/^Firebase:\s*/i, '')
          .replace(/\s*\([a-z0-9/-]+\)\.?$/i, '')
          .trim()
        return cleaned || 'Authentication failed. Please try again.'
      }
      return 'Authentication failed. Please try again.'
  }
}
