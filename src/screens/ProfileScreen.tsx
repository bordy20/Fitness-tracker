import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  Platform,
  Animated,
} from 'react-native';
import { Toast } from '../components/Toast';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getUserProfile, saveUserProfile, getSettings, saveSettings } from '../services/storageService';
import { signOut, AuthUser } from '../services/authService';
import { UserProfile, AppSettings } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';

type FitnessGoal = 'lose_fat' | 'maintain' | 'gain_muscle' | 'endurance';

interface WizardState {
  weight: string;
  height: string;
  age: string;
  gender: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: FitnessGoal;
}

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  weight: 70,
  height: 170,
  age: 25,
  gender: 'male',
  activityLevel: 'moderate',
  goals: { calories: 2000, protein: 150, carbs: 250, fat: 65, steps: 10000, water: 2500 },
};

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
};

const GOAL_INFO: Record<FitnessGoal, { icon: string; label: string; desc: string; color: string }> = {
  lose_fat:    { icon: '🔥', label: 'Lose Fat',        desc: '500 kcal deficit · high protein',      color: '#FF6B35' },
  maintain:    { icon: '⚖️',  label: 'Maintain Weight', desc: 'Eat at maintenance · balanced macros', color: '#4CAF50' },
  gain_muscle: { icon: '💪', label: 'Build Muscle',    desc: '300 kcal surplus · high protein',      color: '#7C5CFC' },
  endurance:   { icon: '🏃', label: 'Endurance',       desc: '200 kcal surplus · carb-focused',      color: '#00B4D8' },
};

function calcBMR(weight: number, height: number, age: number, gender: string): number {
  if (gender === 'female') return 10 * weight + 6.25 * height - 5 * age - 161;
  return 10 * weight + 6.25 * height - 5 * age + 5;
}

function calcRecommendedGoals(wiz: WizardState) {
  const w = parseFloat(wiz.weight) || 70;
  const h = parseFloat(wiz.height) || 170;
  const a = parseInt(wiz.age) || 25;
  const tdee = Math.round(calcBMR(w, h, a, wiz.gender) * (ACTIVITY_MULTIPLIERS[wiz.activityLevel] || 1.55));

  const goalCalories: Record<FitnessGoal, number> = {
    lose_fat:    Math.max(1400, tdee - 500),
    maintain:    tdee,
    gain_muscle: tdee + 300,
    endurance:   tdee + 200,
  };
  const calories = goalCalories[wiz.goal];

  const splits: Record<FitnessGoal, [number, number, number]> = {
    lose_fat:    [0.35, 0.30, 0.35],
    maintain:    [0.25, 0.30, 0.45],
    gain_muscle: [0.30, 0.25, 0.45],
    endurance:   [0.20, 0.25, 0.55],
  };
  const [pP, pF, pC] = splits[wiz.goal];
  return {
    tdee,
    calories,
    protein: Math.round(calories * pP / 4),
    fat:     Math.round(calories * pF / 9),
    carbs:   Math.round(calories * pC / 4),
  };
}

interface Props {
  user?: AuthUser | null;
  onSignOut?: () => void;
}

export function ProfileScreen({ user, onSignOut }: Props = {}) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [settings, setSettings] = useState<AppSettings>({ claudeApiKey: '', openaiApiKey: '', geminiApiKey: '', groqApiKey: '', xaiApiKey: '', units: 'metric', theme: 'dark' });
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, message });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500);
  };
  const [wizardVisible, setWizardVisible] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizard, setWizard] = useState<WizardState>({
    weight: '70', height: '170', age: '25',
    gender: 'male', activityLevel: 'moderate', goal: 'maintain',
  });

  useFocusEffect(useCallback(() => {
    getUserProfile().then(p => {
      if (p) setProfile(p);
      else if (user?.displayName) setProfile(prev => ({ ...prev, name: user.displayName ?? '' }));
    });
    getSettings().then(setSettings);
  }, [user]));

  const handleSignOut = async () => { await signOut(); onSignOut?.(); };

  const handleSave = async () => {
    await saveUserProfile(profile);
    await saveSettings(settings);
    showToast('Profile saved successfully!');
  };

  const updateProfile = (key: keyof UserProfile, value: any) =>
    setProfile(prev => ({ ...prev, [key]: value }));

  const updateGoal = (key: keyof UserProfile['goals'], value: string) =>
    setProfile(prev => ({ ...prev, goals: { ...prev.goals, [key]: parseFloat(value) || 0 } }));

  const tdee = Math.round(
    calcBMR(profile.weight, profile.height, profile.age, profile.gender) *
    (ACTIVITY_MULTIPLIERS[profile.activityLevel] || 1.55)
  );

  const handlePhotoUpload = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      document.body.appendChild(input);
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = ev => {
            const dataUrl = ev.target?.result as string;
            setProfile(prev => ({ ...prev, photoURL: dataUrl }));
          };
          reader.readAsDataURL(file);
        }
        if (document.body.contains(input)) document.body.removeChild(input);
      };
      input.click();
      window.addEventListener('focus', () => {
        setTimeout(() => { if (document.body.contains(input)) document.body.removeChild(input); }, 500);
      }, { once: true });
    } else {
      try {
        const ImagePicker = await import('expo-image-picker');
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Please allow access to your photo library.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
        });
        if (!result.canceled && result.assets[0]) {
          setProfile(prev => ({ ...prev, photoURL: result.assets[0].uri }));
        }
      } catch {
        Alert.alert('Error', 'Could not open photo library');
      }
    }
  };

  const openWizard = () => {
    setWizard({
      weight: String(profile.weight),
      height: String(profile.height),
      age: String(profile.age),
      gender: profile.gender,
      activityLevel: profile.activityLevel,
      goal: 'maintain',
    });
    setWizardStep(0);
    setWizardVisible(true);
  };

  const applyWizardGoals = () => {
    const recs = calcRecommendedGoals(wizard);
    setProfile(prev => ({
      ...prev,
      weight: parseFloat(wizard.weight) || prev.weight,
      height: parseFloat(wizard.height) || prev.height,
      age:    parseInt(wizard.age) || prev.age,
      gender: wizard.gender,
      activityLevel: wizard.activityLevel,
      goals: { ...prev.goals, calories: recs.calories, protein: recs.protein, carbs: recs.carbs, fat: recs.fat },
    }));
    setWizardVisible(false);
    showToast(`Goals set: ${recs.calories} kcal/day`);
  };

  const displayPhoto = profile.photoURL || user?.photoURL;

  return (
    <View style={{ flex: 1 }}>
    <Toast visible={toast.visible} message={toast.message} />
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile & Settings</Text>

      {/* Avatar / Account */}
      <View style={styles.accountRow}>
        <TouchableOpacity onPress={handlePhotoUpload} style={styles.avatarWrap}>
          {displayPhoto ? (
            <Image source={{ uri: displayPhoto }} style={styles.avatarImg} />
          ) : (
            <LinearGradient colors={[colors.primary, colors.primaryLight]} style={styles.avatar}>
              <Text style={styles.avatarText}>{(user?.displayName || profile.name || '?')[0].toUpperCase()}</Text>
            </LinearGradient>
          )}
          <View style={styles.avatarBadge}>
            <Ionicons name="camera" size={11} color="#fff" />
          </View>
        </TouchableOpacity>
        <View style={styles.accountInfo}>
          <Text style={styles.accountName}>{user?.displayName || profile.name || 'Your Profile'}</Text>
          {user?.email && <Text style={styles.accountEmail}>{user.email}</Text>}
        </View>
        {user && (
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {/* TDEE Card */}
      <LinearGradient colors={['#2A2A4E', '#1A1A2E']} style={styles.tdeeCard}>
        <Text style={styles.tdeeLabel}>Your Estimated Daily Needs</Text>
        <Text style={styles.tdeeValue}>{tdee} kcal</Text>
        <Text style={styles.tdeeSubtext}>Based on your profile &amp; activity level</Text>
        <TouchableOpacity style={styles.wizardBtn} onPress={openWizard}>
          <Ionicons name="calculator-outline" size={15} color={colors.primary} />
          <Text style={styles.wizardBtnText}>Calculate My Goals</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Personal Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Info</Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={profile.name}
            onChangeText={v => updateProfile('name', v)}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Age</Text>
            <TextInput style={styles.input} value={String(profile.age)} onChangeText={v => updateProfile('age', parseInt(v) || 0)} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Weight (kg)</Text>
            <TextInput style={styles.input} value={String(profile.weight)} onChangeText={v => updateProfile('weight', parseFloat(v) || 0)} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Height (cm)</Text>
            <TextInput style={styles.input} value={String(profile.height)} onChangeText={v => updateProfile('height', parseFloat(v) || 0)} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Gender</Text>
          <View style={styles.segmented}>
            {(['male', 'female', 'other'] as const).map(g => (
              <TouchableOpacity key={g} style={[styles.segmentBtn, profile.gender === g && styles.segmentBtnActive]} onPress={() => updateProfile('gender', g)}>
                <Text style={[styles.segmentText, profile.gender === g && styles.segmentTextActive]}>{g.charAt(0).toUpperCase() + g.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Activity Level</Text>
          <View style={styles.activityGrid}>
            {(['sedentary', 'light', 'moderate', 'active', 'very_active'] as const).map(a => (
              <TouchableOpacity key={a} style={[styles.activityBtn, profile.activityLevel === a && styles.activityBtnActive]} onPress={() => updateProfile('activityLevel', a)}>
                <Text style={[styles.activityText, profile.activityLevel === a && styles.activityTextActive]}>
                  {a.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Daily Goals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Goals</Text>
        <View style={styles.goalsGrid}>
          {[
            { key: 'calories', label: 'Calories', unit: 'kcal', color: colors.calories },
            { key: 'protein',  label: 'Protein',  unit: 'g',    color: colors.protein },
            { key: 'carbs',    label: 'Carbs',    unit: 'g',    color: colors.carbs },
            { key: 'fat',      label: 'Fat',      unit: 'g',    color: colors.fat },
            { key: 'steps',    label: 'Steps',    unit: '',     color: colors.primary },
            { key: 'water',    label: 'Water',    unit: 'ml',   color: colors.accentBlue },
          ].map(({ key, label, unit, color }) => (
            <View key={key} style={styles.goalField}>
              <Text style={[styles.goalLabel, { color }]}>{label}</Text>
              <TextInput
                style={[styles.goalInput, { borderColor: color + '40' }]}
                value={String(profile.goals[key as keyof typeof profile.goals])}
                onChangeText={v => updateGoal(key as keyof UserProfile['goals'], v)}
                keyboardType="numeric"
                placeholderTextColor={colors.textMuted}
              />
              {unit ? <Text style={styles.goalUnit}>{unit}</Text> : null}
            </View>
          ))}
        </View>
      </View>

      {/* AI Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Settings</Text>
        <Text style={styles.aiSettingsSubtitle}>Add API keys for your preferred AI providers</Text>
        {([
          { key: 'claudeApiKey' as const,  label: 'Claude (Anthropic)', placeholder: 'sk-ant-...',    hint: 'console.anthropic.com',  icon: '🤖' },
          { key: 'openaiApiKey' as const,  label: 'OpenAI (GPT-4)',     placeholder: 'sk-...',         hint: 'platform.openai.com',    icon: '⚡' },
          { key: 'geminiApiKey' as const,  label: 'Google Gemini',      placeholder: 'AIza...',        hint: 'aistudio.google.com',    icon: '✨' },
          { key: 'groqApiKey'   as const,  label: 'Groq (Llama)',       placeholder: 'gsk_...',        hint: 'console.groq.com',       icon: '🚀' },
          { key: 'xaiApiKey'    as const,  label: 'xAI (Grok)',         placeholder: 'xai-...',        hint: 'console.x.ai',           icon: '🔮' },
        ] as { key: keyof AppSettings; label: string; placeholder: string; hint: string; icon: string }[]).map(({ key, label, placeholder, hint, icon }) => (
          <View key={key} style={styles.field}>
            <Text style={styles.fieldLabel}><Text style={styles.providerIcon}>{icon}</Text> {label}</Text>
            <View style={styles.apiKeyRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={settings[key] as string}
                onChangeText={v => setSettings(prev => ({ ...prev, [key]: v }))}
                placeholder={placeholder}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showApiKey[key]}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowApiKey(prev => ({ ...prev, [key]: !prev[key] }))} style={styles.eyeBtn}>
                <Ionicons name={showApiKey[key] ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.apiKeyHint}>{hint}</Text>
          </View>
        ))}
      </View>

      {/* Save */}
      <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
        <LinearGradient colors={[colors.primary, colors.primaryLight]} style={styles.saveBtnGradient}>
          <Ionicons name="save-outline" size={20} color={colors.text} />
          <Text style={styles.saveBtnText}>Save Profile</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Goal Wizard Modal */}
      <Modal visible={wizardVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setWizardVisible(false)}>
        <View style={styles.wizardContainer}>
          <View style={styles.wizardHeader}>
            <TouchableOpacity onPress={() => setWizardVisible(false)} style={styles.wizardCloseBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.wizardTitle}>Calculate My Goals</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Step progress */}
          <View style={styles.stepRow}>
            {['Body', 'Activity', 'Goal', 'Plan'].map((label, i) => (
              <React.Fragment key={label}>
                <View style={styles.stepDotWrap}>
                  <View style={[styles.stepDot, i <= wizardStep && styles.stepDotActive]}>
                    <Text style={[styles.stepDotNum, i <= wizardStep && styles.stepDotNumActive]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.stepLabel, i === wizardStep && styles.stepLabelActive]}>{label}</Text>
                </View>
                {i < 3 && <View style={[styles.stepLine, i < wizardStep && styles.stepLineActive]} />}
              </React.Fragment>
            ))}
          </View>

          <ScrollView style={styles.wizardScroll} contentContainerStyle={styles.wizardScrollContent}>
            {wizardStep === 0 && <WizardBodyStep wizard={wizard} setWizard={setWizard} />}
            {wizardStep === 1 && <WizardActivityStep wizard={wizard} setWizard={setWizard} />}
            {wizardStep === 2 && <WizardGoalStep wizard={wizard} setWizard={setWizard} />}
            {wizardStep === 3 && <WizardResultStep wizard={wizard} />}
          </ScrollView>

          <View style={styles.wizardNav}>
            {wizardStep > 0 ? (
              <TouchableOpacity style={styles.wizardBackBtn} onPress={() => setWizardStep(s => s - 1)}>
                <Ionicons name="arrow-back" size={18} color={colors.text} />
                <Text style={styles.wizardBackText}>Back</Text>
              </TouchableOpacity>
            ) : <View style={{ flex: 1 }} />}
            <TouchableOpacity style={styles.wizardNextBtn} onPress={wizardStep < 3 ? () => setWizardStep(s => s + 1) : applyWizardGoals}>
              <LinearGradient colors={[colors.primary, colors.primaryLight]} style={styles.wizardNextGrad}>
                {wizardStep < 3 ? (
                  <>
                    <Text style={styles.wizardNextText}>Next</Text>
                    <Ionicons name="arrow-forward" size={18} color={colors.text} />
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color={colors.text} />
                    <Text style={styles.wizardNextText}>Apply Goals</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </View>
  );
}

// ─── Wizard Steps ──────────────────────────────────────────────────────────────

function WizardBodyStep({ wizard, setWizard }: { wizard: WizardState; setWizard: React.Dispatch<React.SetStateAction<WizardState>> }) {
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Tell us about yourself</Text>
      <Text style={styles.stepSubtitle}>We use this to calculate your personalized calorie target</Text>
      <View style={styles.row}>
        {[
          { label: 'Weight (kg)', key: 'weight' as const },
          { label: 'Height (cm)', key: 'height' as const },
          { label: 'Age',         key: 'age'    as const },
        ].map(({ label, key }) => (
          <View key={key} style={[styles.field, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
              style={[styles.input, styles.centeredInput]}
              value={wizard[key]}
              onChangeText={v => setWizard(w => ({ ...w, [key]: v }))}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        ))}
      </View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Gender</Text>
        <View style={styles.segmented}>
          {(['male', 'female', 'other'] as const).map(g => (
            <TouchableOpacity key={g} style={[styles.segmentBtn, wizard.gender === g && styles.segmentBtnActive]} onPress={() => setWizard(w => ({ ...w, gender: g }))}>
              <Text style={[styles.segmentText, wizard.gender === g && styles.segmentTextActive]}>{g.charAt(0).toUpperCase() + g.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

function WizardActivityStep({ wizard, setWizard }: { wizard: WizardState; setWizard: React.Dispatch<React.SetStateAction<WizardState>> }) {
  const options: { value: WizardState['activityLevel']; label: string; desc: string }[] = [
    { value: 'sedentary',  label: 'Sedentary',       desc: 'Little or no exercise, desk job' },
    { value: 'light',      label: 'Lightly Active',   desc: '1-3 days/week exercise' },
    { value: 'moderate',   label: 'Moderately Active', desc: '3-5 days/week exercise' },
    { value: 'active',     label: 'Very Active',      desc: '6-7 days/week hard exercise' },
    { value: 'very_active',label: 'Super Active',     desc: 'Physical job + daily training' },
  ];
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>How active are you?</Text>
      <Text style={styles.stepSubtitle}>Your activity level affects how many calories you burn daily</Text>
      {options.map(({ value, label, desc }) => (
        <TouchableOpacity key={value} style={[styles.selCard, wizard.activityLevel === value && styles.selCardActive]} onPress={() => setWizard(w => ({ ...w, activityLevel: value }))}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.selCardLabel, wizard.activityLevel === value && styles.selCardLabelActive]}>{label}</Text>
            <Text style={styles.selCardDesc}>{desc}</Text>
          </View>
          {wizard.activityLevel === value && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function WizardGoalStep({ wizard, setWizard }: { wizard: WizardState; setWizard: React.Dispatch<React.SetStateAction<WizardState>> }) {
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What's your primary goal?</Text>
      <Text style={styles.stepSubtitle}>We'll adjust your calories and macros accordingly</Text>
      {(Object.entries(GOAL_INFO) as [FitnessGoal, typeof GOAL_INFO[FitnessGoal]][]).map(([value, { icon, label, desc, color }]) => (
        <TouchableOpacity
          key={value}
          style={[styles.selCard, wizard.goal === value && styles.selCardActive, wizard.goal === value && { borderColor: color }]}
          onPress={() => setWizard(w => ({ ...w, goal: value }))}
        >
          <Text style={styles.goalIcon}>{icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.selCardLabel, wizard.goal === value && { color }]}>{label}</Text>
            <Text style={styles.selCardDesc}>{desc}</Text>
          </View>
          {wizard.goal === value && <Ionicons name="checkmark-circle" size={22} color={color} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function WizardResultStep({ wizard }: { wizard: WizardState }) {
  const recs = calcRecommendedGoals(wizard);
  const info = GOAL_INFO[wizard.goal];
  const diff = recs.calories - recs.tdee;
  const tips: Record<FitnessGoal, string> = {
    lose_fat:    'High protein preserves muscle while losing fat. Stay consistent!',
    maintain:    'Balanced macros keep your energy steady throughout the day.',
    gain_muscle: 'Higher calories + protein support muscle growth. Train hard!',
    endurance:   'Carbs are your primary fuel for endurance training.',
  };
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Your Personalized Plan</Text>
      <Text style={styles.stepSubtitle}>Goal: {info.label}</Text>
      <LinearGradient colors={['#2A2A4E', '#1A1A2E']} style={styles.resultCard}>
        <Text style={styles.resultCalLabel}>Daily Calorie Target</Text>
        <Text style={styles.resultCalValue}>{recs.calories}</Text>
        <Text style={styles.resultCalUnit}>kcal / day</Text>
        <Text style={styles.resultTdeeRow}>
          TDEE {recs.tdee} kcal  ·  <Text style={{ color: info.color }}>{diff >= 0 ? '+' : ''}{diff} kcal</Text>
        </Text>
      </LinearGradient>
      <View style={styles.macroRow}>
        {[
          { label: 'Protein', value: recs.protein, color: colors.protein },
          { label: 'Carbs',   value: recs.carbs,   color: colors.carbs },
          { label: 'Fat',     value: recs.fat,      color: colors.fat },
        ].map(({ label, value, color }) => (
          <View key={label} style={[styles.macroCard, { borderTopColor: color }]}>
            <Text style={[styles.macroValue, { color }]}>{value}</Text>
            <Text style={styles.macroUnit}>g</Text>
            <Text style={styles.macroLabel}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.tipBox}>
        <Ionicons name="information-circle-outline" size={16} color={colors.accentBlue} />
        <Text style={styles.tipText}>{tips[wizard.goal]}</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 100, gap: spacing.lg },
  title: { ...typography.h1, color: colors.text, paddingTop: spacing.xl },

  // Account row
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 56, height: 56, borderRadius: 28 },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  avatarText: { ...typography.h2, color: colors.text },
  avatarBadge: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.surface },
  accountInfo: { flex: 1, gap: 2 },
  accountName: { ...typography.bodyBold, color: colors.text },
  accountEmail: { ...typography.caption, color: colors.textSecondary },
  signOutBtn: { padding: spacing.sm, backgroundColor: colors.error + '15', borderRadius: borderRadius.md },

  // TDEE card
  tdeeCard: { borderRadius: borderRadius.xl, padding: spacing.lg, alignItems: 'center', gap: spacing.xs },
  tdeeLabel: { ...typography.caption, color: colors.textSecondary },
  tdeeValue: { ...typography.hero, color: colors.primary },
  tdeeSubtext: { ...typography.caption, color: colors.textMuted },
  wizardBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm, backgroundColor: colors.primary + '25', paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: borderRadius.full },
  wizardBtnText: { ...typography.caption, color: colors.primary, fontWeight: '600' },

  // Sections
  section: { gap: spacing.md },
  sectionTitle: { ...typography.h3, color: colors.text },
  field: { gap: spacing.xs },
  fieldLabel: { ...typography.caption, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.md, padding: spacing.md, color: colors.text, ...typography.body, borderWidth: 1, borderColor: colors.border },
  centeredInput: { textAlign: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm },
  segmented: { flexDirection: 'row', backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.md, padding: 3 },
  segmentBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: borderRadius.sm - 2 },
  segmentBtnActive: { backgroundColor: colors.primary },
  segmentText: { ...typography.caption, color: colors.textSecondary },
  segmentTextActive: { color: colors.text, fontWeight: '600' },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  activityBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.full, borderWidth: 1, borderColor: 'transparent' },
  activityBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
  activityText: { ...typography.caption, color: colors.textSecondary },
  activityTextActive: { color: colors.primary },

  // Goals grid
  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  goalField: { flexBasis: '30%', flexGrow: 1, gap: 4 },
  goalLabel: { ...typography.captionBold },
  goalInput: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, color: colors.text, borderWidth: 1, textAlign: 'center' },
  goalUnit: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },

  // API key
  aiSettingsSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: -spacing.sm },
  apiKeyRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  eyeBtn: { padding: spacing.sm, backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  apiKeyHint: { ...typography.caption, color: colors.textMuted },
  providerIcon: { fontSize: 13 },

  // Save button
  saveBtn: { borderRadius: borderRadius.lg, overflow: 'hidden' },
  saveBtnGradient: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  saveBtnText: { ...typography.bodyBold, color: colors.text },

  // Wizard modal
  wizardContainer: { flex: 1, backgroundColor: colors.background },
  wizardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, paddingTop: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border },
  wizardCloseBtn: { padding: spacing.xs, width: 40 },
  wizardTitle: { ...typography.h3, color: colors.text },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  stepDotWrap: { alignItems: 'center', gap: 4 },
  stepDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceElevated, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.border },
  stepDotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepDotNum: { ...typography.captionBold, color: colors.textMuted, fontSize: 12 },
  stepDotNumActive: { color: '#fff' },
  stepLabel: { ...typography.caption, color: colors.textMuted, fontSize: 10 },
  stepLabelActive: { color: colors.primary },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.border, marginTop: 14, maxWidth: 40 },
  stepLineActive: { backgroundColor: colors.primary },
  wizardScroll: { flex: 1 },
  wizardScrollContent: { padding: spacing.lg, paddingBottom: 40 },
  stepContent: { gap: spacing.lg },
  stepTitle: { ...typography.h2, color: colors.text },
  stepSubtitle: { ...typography.body, color: colors.textSecondary, marginTop: -spacing.sm },
  wizardNav: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  wizardBackBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md },
  wizardBackText: { ...typography.body, color: colors.text },
  wizardNextBtn: { flex: 2, borderRadius: borderRadius.lg, overflow: 'hidden' },
  wizardNextGrad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  wizardNextText: { ...typography.bodyBold, color: colors.text },

  // Selection cards (activity + goal steps)
  selCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 2, borderColor: 'transparent' },
  selCardActive: { borderColor: colors.primary, backgroundColor: colors.primary + '12' },
  selCardLabel: { ...typography.bodyBold, color: colors.text },
  selCardLabelActive: { color: colors.primary },
  selCardDesc: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  goalIcon: { fontSize: 26 },

  // Result step
  resultCard: { borderRadius: borderRadius.xl, padding: spacing.xl, alignItems: 'center', gap: 4 },
  resultCalLabel: { ...typography.caption, color: colors.textSecondary },
  resultCalValue: { fontSize: 52, fontWeight: '700', color: colors.primary, lineHeight: 60 },
  resultCalUnit: { ...typography.body, color: colors.textSecondary },
  resultTdeeRow: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  macroRow: { flexDirection: 'row', gap: spacing.md },
  macroCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center', gap: 2, borderTopWidth: 3 },
  macroValue: { ...typography.h2 },
  macroUnit: { ...typography.caption, color: colors.textMuted },
  macroLabel: { ...typography.caption, color: colors.textSecondary },
  tipBox: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.accentBlue + '18', padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'flex-start' },
  tipText: { ...typography.caption, color: colors.accentBlue, flex: 1 },
});
