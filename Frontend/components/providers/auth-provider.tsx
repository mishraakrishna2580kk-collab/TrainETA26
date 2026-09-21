'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  formatAuthError,
  getFirebaseApp,
  isFirebaseConfigured,
} from '@/lib/firebase/config'

export interface AuthUser {
  uid: string
  name: string
  email: string
  photoURL?: string | null
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  /** True when connected to a real Firebase project; false = local demo mode. */
  firebaseMode: boolean
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (
    name: string,
    email: string,
    password: string,
  ) => Promise<void>
  signInWithGoogle: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  signOut: () => Promise<void>
  updateName: (name: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/* ----------------------------- demo mode store --------------------------- */

const DEMO_USER_KEY = 'train-eta:auth-user'
const DEMO_USERS_KEY = 'train-eta:auth-users'

interface DemoRecord extends AuthUser {
  password: string
}

function readDemoUsers(): DemoRecord[] {
  try {
    return JSON.parse(localStorage.getItem(DEMO_USERS_KEY) ?? '[]')
  } catch {
    return []
  }
}

function writeDemoUsers(users: DemoRecord[]) {
  localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users))
}

function persistDemoUser(user: AuthUser | null) {
  if (user) localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user))
  else localStorage.removeItem(DEMO_USER_KEY)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const firebaseMode = isFirebaseConfigured()

  /* ----------------------- session bootstrap ----------------------- */
  useEffect(() => {
    let unsub: (() => void) | undefined

    async function bootstrap() {
      if (firebaseMode) {
        try {
          const app = getFirebaseApp()
          if (app) {
            const { getAuth, onAuthStateChanged } = await import('firebase/auth')
            const auth = getAuth(app)
            unsub = onAuthStateChanged(
              auth,
              (fbUser) => {
                setUser(
                  fbUser
                    ? {
                        uid: fbUser.uid,
                        name: fbUser.displayName ?? fbUser.email ?? 'Traveller',
                        email: fbUser.email ?? '',
                        photoURL: fbUser.photoURL,
                      }
                    : null,
                )
                setLoading(false)
              },
              (err) => {
                console.error('Firebase onAuthStateChanged error:', err)
                setLoading(false)
              },
            )
            return
          }
        } catch (err) {
          console.error('Firebase initialization error:', err)
          setLoading(false)
        }
      }
      // demo mode
      try {
        const raw = localStorage.getItem(DEMO_USER_KEY)
        setUser(raw ? (JSON.parse(raw) as AuthUser) : null)
      } catch {
        setUser(null)
      }
      setLoading(false)
    }

    bootstrap()
    return () => unsub?.()
  }, [firebaseMode])

  /* ----------------------------- actions --------------------------- */

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (firebaseMode) {
        try {
          const app = getFirebaseApp()!
          const { getAuth, signInWithEmailAndPassword } = await import(
            'firebase/auth'
          )
          const cred = await signInWithEmailAndPassword(getAuth(app), email, password)
          const fbUser = cred.user
          setUser({
            uid: fbUser.uid,
            name: fbUser.displayName ?? fbUser.email ?? 'Traveller',
            email: fbUser.email ?? '',
            photoURL: fbUser.photoURL,
          })
          return
        } catch (err) {
          throw new Error(formatAuthError(err))
        }
      }
      const record = readDemoUsers().find(
        (u) => u.email.toLowerCase() === email.toLowerCase(),
      )
      if (!record || record.password !== password) {
        throw new Error('Invalid email or password.')
      }
      const { password: _pw, ...safe } = record
      persistDemoUser(safe)
      setUser(safe)
    },
    [firebaseMode],
  )

  const signUpWithEmail = useCallback(
    async (name: string, email: string, password: string) => {
      if (firebaseMode) {
        try {
          const app = getFirebaseApp()!
          const { getAuth, createUserWithEmailAndPassword, updateProfile } =
            await import('firebase/auth')
          const cred = await createUserWithEmailAndPassword(
            getAuth(app),
            email,
            password,
          )
          if (name) {
            try {
              await updateProfile(cred.user, { displayName: name })
            } catch (profileErr) {
              console.warn('Could not set displayName on profile:', profileErr)
            }
          }
          setUser({
            uid: cred.user.uid,
            name: name || cred.user.displayName || cred.user.email || 'Traveller',
            email: cred.user.email ?? email,
            photoURL: cred.user.photoURL ?? null,
          })
          return
        } catch (err) {
          throw new Error(formatAuthError(err))
        }
      }
      const users = readDemoUsers()
      if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('An account with this email already exists.')
      }
      const record: DemoRecord = {
        uid: crypto.randomUUID(),
        name,
        email,
        photoURL: null,
        password,
      }
      writeDemoUsers([...users, record])
      const { password: _pw, ...safe } = record
      persistDemoUser(safe)
      setUser(safe)
    },
    [firebaseMode],
  )

  const signInWithGoogle = useCallback(async () => {
    if (firebaseMode) {
      try {
        const app = getFirebaseApp()!
        const { getAuth, GoogleAuthProvider, signInWithPopup } = await import(
          'firebase/auth'
        )
        const provider = new GoogleAuthProvider()
        provider.setCustomParameters({ prompt: 'select_account' })
        const cred = await signInWithPopup(getAuth(app), provider)
        const fbUser = cred.user
        setUser({
          uid: fbUser.uid,
          name: fbUser.displayName ?? fbUser.email ?? 'Traveller',
          email: fbUser.email ?? '',
          photoURL: fbUser.photoURL,
        })
        return
      } catch (err) {
        throw new Error(formatAuthError(err))
      }
    }
    const demo: AuthUser = {
      uid: 'google-demo',
      name: 'Aarav Sharma',
      email: 'aarav.sharma@gmail.com',
      photoURL: null,
    }
    persistDemoUser(demo)
    setUser(demo)
  }, [firebaseMode])

  const sendPasswordReset = useCallback(
    async (email: string) => {
      if (firebaseMode) {
        try {
          const app = getFirebaseApp()!
          const { getAuth, sendPasswordResetEmail } = await import(
            'firebase/auth'
          )
          await sendPasswordResetEmail(getAuth(app), email)
          return
        } catch (err) {
          throw new Error(formatAuthError(err))
        }
      }
      // demo mode: nothing to send, resolve so the UI can show confirmation
      await new Promise((r) => setTimeout(r, 500))
    },
    [firebaseMode],
  )

  const signOut = useCallback(async () => {
    if (firebaseMode) {
      try {
        const app = getFirebaseApp()!
        const { getAuth, signOut: fbSignOut } = await import('firebase/auth')
        await fbSignOut(getAuth(app))
      } catch (err) {
        console.error('Error signing out of Firebase:', err)
      }
      setUser(null)
      return
    }
    persistDemoUser(null)
    setUser(null)
  }, [firebaseMode])

  const updateName = useCallback(
    async (name: string) => {
      if (firebaseMode) {
        try {
          const app = getFirebaseApp()!
          const { getAuth, updateProfile } = await import('firebase/auth')
          const auth = getAuth(app)
          if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: name })
        } catch (err) {
          throw new Error(formatAuthError(err))
        }
      }
      setUser((prev) => {
        if (!prev) return prev
        const next = { ...prev, name }
        if (!firebaseMode) persistDemoUser(next)
        return next
      })
    },
    [firebaseMode],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      firebaseMode,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      sendPasswordReset,
      signOut,
      updateName,
    }),
    [
      user,
      loading,
      firebaseMode,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      sendPasswordReset,
      signOut,
      updateName,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
