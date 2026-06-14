import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  Firestore,
} from 'firebase/firestore';
import { app, isFirebaseConfigured } from '../config/firebase';
import { DailyLog, UserProfile, AppSettings } from '../types';

let db: Firestore | null = null;
if (isFirebaseConfigured && app) {
  db = getFirestore(app);
}

let uid: string | null = null;

export function setCloudUser(userId: string | null) {
  uid = userId;
}

function logRef(date: string) {
  if (!db || !uid) return null;
  return doc(db, 'users', uid, 'logs', date);
}

function profileRef() {
  if (!db || !uid) return null;
  return doc(db, 'users', uid, 'profile');
}

function settingsRef() {
  if (!db || !uid) return null;
  return doc(db, 'users', uid, 'settings');
}

export async function uploadLog(log: DailyLog): Promise<void> {
  const ref = logRef(log.date);
  if (!ref) return;
  await setDoc(ref, log);
}

export async function uploadProfile(profile: UserProfile): Promise<void> {
  const ref = profileRef();
  if (!ref) return;
  await setDoc(ref, profile);
}

export async function uploadSettings(settings: AppSettings): Promise<void> {
  const ref = settingsRef();
  if (!ref) return;
  await setDoc(ref, settings);
}

export async function downloadAllData(): Promise<{
  logs: DailyLog[];
  profile: UserProfile | null;
  settings: AppSettings | null;
}> {
  if (!db || !uid) return { logs: [], profile: null, settings: null };

  const [logsSnap, profileSnap, settingsSnap] = await Promise.all([
    getDocs(collection(db, 'users', uid, 'logs')),
    getDoc(doc(db, 'users', uid, 'profile')),
    getDoc(doc(db, 'users', uid, 'settings')),
  ]);

  return {
    logs: logsSnap.docs.map(d => d.data() as DailyLog),
    profile: profileSnap.exists() ? (profileSnap.data() as UserProfile) : null,
    settings: settingsSnap.exists() ? (settingsSnap.data() as AppSettings) : null,
  };
}

export const isCloudEnabled = () => isFirebaseConfigured && db !== null;
