import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '',
};

function hasFirebaseConfig(): boolean {
  const has =
    !!(
      firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.storageBucket &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId
    )
  console.log("[Firebase] hasFirebaseConfig():", has, {
    apiKey: firebaseConfig.apiKey ? "(set)" : "(MISSING)",
    authDomain: firebaseConfig.authDomain ? "(set)" : "(MISSING)",
    projectId: firebaseConfig.projectId ? "(set)" : "(MISSING)",
    storageBucket: firebaseConfig.storageBucket ? "(set)" : "(MISSING)",
    messagingSenderId: firebaseConfig.messagingSenderId ? "(set)" : "(MISSING)",
    appId: firebaseConfig.appId ? "(set)" : "(MISSING)",
  })
  return has
}

function getFirebaseApp(): FirebaseApp {
  if (!hasFirebaseConfig()) {
    throw new Error('Firebase is not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables.');
  }
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

function getFirebaseSafe<T>(getter: () => T, fallback: T): T {
  try {
    return getter();
  } catch {
    return fallback;
  }
}

export function getFirebaseAppSafe(): FirebaseApp | null {
  if (_app) return _app;
  if (!hasFirebaseConfig()) return null;
  try {
    _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    return _app;
  } catch {
    return null;
  }
}

export function getAuthSafe(): Auth | null {
  if (_auth) return _auth;
  const app = getFirebaseAppSafe();
  if (!app) return null;
  try {
    _auth = getAuth(app);
    return _auth;
  } catch {
    return null;
  }
}

export function getFirestoreSafe(): Firestore | null {
  if (_db) return _db;
  const app = getFirebaseAppSafe();
  if (!app) return null;
  try {
    _db = getFirestore(app);
    return _db;
  } catch {
    return null;
  }
}

export function getStorageSafe(): FirebaseStorage | null {
  if (_storage) return _storage;
  const app = getFirebaseAppSafe();
  if (!app) return null;
  try {
    _storage = getStorage(app);
    return _storage;
  } catch {
    return null;
  }
}

export const app: FirebaseApp = getFirebaseSafe(getFirebaseApp, null as unknown as FirebaseApp);
export const auth: Auth = getFirebaseSafe(getAuth, null as unknown as Auth);
export const db: Firestore = getFirebaseSafe(getFirestore, null as unknown as Firestore);
export const storage: FirebaseStorage = getFirebaseSafe(getStorage, null as unknown as FirebaseStorage);
