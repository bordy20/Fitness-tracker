export interface MacroNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
}

export interface FoodEntry {
  id: string;
  timestamp: number;
  name: string;
  description: string;
  imageUri?: string;
  macros: MacroNutrients;
  servingSize?: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface ExerciseEntry {
  id: string;
  timestamp: number;
  name: string;
  category: 'strength' | 'cardio' | 'flexibility' | 'sports';
  duration: number; // minutes
  caloriesBurned: number;
  sets?: ExerciseSet[];
  notes?: string;
}

export interface ExerciseSet {
  setNumber: number;
  reps?: number;
  weight?: number; // kg
  duration?: number; // seconds for timed sets
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  steps: number;
  stepGoal: number;
  foods: FoodEntry[];
  exercises: ExerciseEntry[];
  waterIntake: number; // ml
  waterGoal: number;
}

export interface UserProfile {
  name: string;
  weight: number; // kg
  height: number; // cm
  age: number;
  gender: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  photoURL?: string;
  goals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    steps: number;
    water: number;
  };
}

export interface AppSettings {
  claudeApiKey: string;
  openaiApiKey: string;
  geminiApiKey: string;
  groqApiKey: string;
  xaiApiKey: string;
  units: 'metric' | 'imperial';
  theme: 'dark' | 'light';
}
