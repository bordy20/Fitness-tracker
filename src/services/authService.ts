import {
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';

export type AuthUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
};

export function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };
}

export async function signInWithGoogle(): Promise<AuthUser> {
  if (!auth) throw new Error('Firebase not configured');
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  const result = await signInWithPopup(auth, provider);
  return toAuthUser(result.user);
}

export async function signInWithGithub(): Promise<AuthUser> {
  if (!auth) throw new Error('Firebase not configured');
  const provider = new GithubAuthProvider();
  provider.addScope('user:email');
  const result = await signInWithPopup(auth, provider);
  return toAuthUser(result.user);
}

export async function signOut(): Promise<void> {
  if (!auth) return;
  await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: AuthUser | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, user => callback(user ? toAuthUser(user) : null));
}

export { isFirebaseConfigured };
