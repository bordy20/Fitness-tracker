import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyLog, UserProfile, AppSettings, FoodEntry, ExerciseEntry } from '../types';
import { uploadLog, uploadProfile, uploadSettings } from './cloudSyncService';

const KEYS = {
  DAILY_LOG_PREFIX: 'daily_log_',
  USER_PROFILE: 'user_profile',
  SETTINGS: 'app_settings',
};

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const dateKey = (date: string) => `${KEYS.DAILY_LOG_PREFIX}${date}`;

export async function getTodayLog(): Promise<DailyLog> {
  const date = todayKey();
  const raw = await AsyncStorage.getItem(dateKey(date));
  if (raw) return JSON.parse(raw);
  return createEmptyLog(date);
}

export async function getLogForDate(date: string): Promise<DailyLog> {
  const raw = await AsyncStorage.getItem(dateKey(date));
  if (raw) return JSON.parse(raw);
  return createEmptyLog(date);
}

export async function saveLog(log: DailyLog): Promise<void> {
  await AsyncStorage.setItem(dateKey(log.date), JSON.stringify(log));
  uploadLog(log).catch(() => {}); // fire-and-forget cloud sync
}

export async function addFoodEntry(entry: FoodEntry): Promise<DailyLog> {
  const log = await getTodayLog();
  log.foods.push(entry);
  await saveLog(log);
  return log;
}

export async function removeFoodEntry(id: string): Promise<DailyLog> {
  const log = await getTodayLog();
  log.foods = log.foods.filter(f => f.id !== id);
  await saveLog(log);
  return log;
}

export async function addExerciseEntry(entry: ExerciseEntry): Promise<DailyLog> {
  const log = await getTodayLog();
  log.exercises.push(entry);
  await saveLog(log);
  return log;
}

export async function removeExerciseEntry(id: string): Promise<DailyLog> {
  const log = await getTodayLog();
  log.exercises = log.exercises.filter(e => e.id !== id);
  await saveLog(log);
  return log;
}

export async function updateSteps(steps: number): Promise<void> {
  const log = await getTodayLog();
  log.steps = steps;
  await saveLog(log);
}

export async function updateWater(ml: number): Promise<void> {
  const log = await getTodayLog();
  log.waterIntake = ml;
  await saveLog(log);
}

export async function getRecentLogs(days: number = 7): Promise<DailyLog[]> {
  const logs: DailyLog[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const log = await getLogForDate(date);
    logs.push(log);
  }
  return logs;
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(KEYS.USER_PROFILE);
  return raw ? JSON.parse(raw) : null;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
  uploadProfile(profile).catch(() => {});
}

const SETTINGS_DEFAULTS: AppSettings = {
  claudeApiKey: '', openaiApiKey: '', geminiApiKey: '', groqApiKey: '',
  units: 'metric', theme: 'dark',
};

export async function getSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
  if (raw) return { ...SETTINGS_DEFAULTS, ...JSON.parse(raw) };
  return { ...SETTINGS_DEFAULTS };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  uploadSettings(settings).catch(() => {});
}

export async function updateFoodEntry(id: string, updates: Partial<FoodEntry>): Promise<DailyLog> {
  const log = await getTodayLog();
  log.foods = log.foods.map(f => f.id === id ? { ...f, ...updates } : f);
  await saveLog(log);
  return log;
}

export async function updateExerciseEntry(id: string, updates: Partial<ExerciseEntry>): Promise<DailyLog> {
  const log = await getTodayLog();
  log.exercises = log.exercises.map(e => e.id === id ? { ...e, ...updates } : e);
  await saveLog(log);
  return log;
}

export async function restoreFromCloud(logs: DailyLog[], profile: UserProfile | null, settings: AppSettings | null): Promise<void> {
  await Promise.all(logs.map(log =>
    AsyncStorage.setItem(dateKey(log.date), JSON.stringify(log))
  ));
  if (profile) await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
  if (settings) await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

function createEmptyLog(date: string): DailyLog {
  return {
    date,
    steps: 0,
    stepGoal: 10000,
    foods: [],
    exercises: [],
    waterIntake: 0,
    waterGoal: 2500,
  };
}
