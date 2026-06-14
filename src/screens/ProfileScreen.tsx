import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getUserProfile, saveUserProfile, getSettings, saveSettings } from '../services/storageService';
import { signOut } from '../services/authService';
import { AuthUser } from '../services/authService';
import { UserProfile, AppSettings } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  weight: 70,
  height: 170,
  age: 25,
  gender: 'male',
  activityLevel: 'moderate',
  goals: { calories: 2000, protein: 150, carbs: 250, fat: 65, steps: 10000, water: 2500 },
};

interface Props {
  user?: AuthUser | null;
  onSignOut?: () => void;
}

export function ProfileScreen({ user, onSignOut }: Props = {}) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [settings, setSettings] = useState<AppSettings>({ claudeApiKey: '', units: 'metric', theme: 'dark' });
  const [showApiKey, setShowApiKey] = useState(false);

  useFocusEffect(useCallback(() => {
    getUserProfile().then(p => {
      if (p) setProfile(p);
      else if (user?.displayName) setProfile(prev => ({ ...prev, name: user.displayName ?? '' }));
    });
    getSettings().then(setSettings);
  }, [user]));

  const handleSignOut = async () => {
    await signOut();
    onSignOut?.();
  };

  const handleSave = async () => {
    await saveUserProfile(profile);
    await saveSettings(settings);
    Alert.alert('Saved', 'Profile and settings saved successfully');
  };

  const updateProfile = (key: keyof UserProfile, value: any) =>
    setProfile(prev => ({ ...prev, [key]: value }));

  const updateGoal = (key: keyof UserProfile['goals'], value: string) =>
    setProfile(prev => ({ ...prev, goals: { ...prev.goals, [key]: parseFloat(value) || 0 } }));

  const tdee = Math.round(
    (profile.gender === 'female'
      ? 655 + 9.6 * profile.weight + 1.8 * profile.height - 4.7 * profile.age
      : 88.4 + 13.4 * profile.weight + 4.8 * profile.height - 5.7 * profile.age) *
    ({ sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }[profile.activityLevel])
  );

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile & Settings</Text>

      {/* Avatar / Account */}
      <View style={styles.accountRow}>
        {user?.photoURL ? (
          <Image source={{ uri: user.photoURL }} style={styles.avatarImg} />
        ) : (
          <LinearGradient colors={[colors.primary, colors.primaryLight]} style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.displayName || profile.name || '?')[0].toUpperCase()}</Text>
          </LinearGradient>
        )}
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
              <TouchableOpacity
                key={g}
                style={[styles.segmentBtn, profile.gender === g && styles.segmentBtnActive]}
                onPress={() => updateProfile('gender', g)}
              >
                <Text style={[styles.segmentText, profile.gender === g && styles.segmentTextActive]}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Activity Level</Text>
          <View style={styles.activityGrid}>
            {(['sedentary', 'light', 'moderate', 'active', 'very_active'] as const).map(a => (
              <TouchableOpacity
                key={a}
                style={[styles.activityBtn, profile.activityLevel === a && styles.activityBtnActive]}
                onPress={() => updateProfile('activityLevel', a)}
              >
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
            { key: 'protein', label: 'Protein', unit: 'g', color: colors.protein },
            { key: 'carbs', label: 'Carbs', unit: 'g', color: colors.carbs },
            { key: 'fat', label: 'Fat', unit: 'g', color: colors.fat },
            { key: 'steps', label: 'Steps', unit: '', color: colors.primary },
            { key: 'water', label: 'Water', unit: 'ml', color: colors.accentBlue },
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

      {/* API Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Settings</Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Claude API Key</Text>
          <View style={styles.apiKeyRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={settings.claudeApiKey}
              onChangeText={v => setSettings(prev => ({ ...prev, claudeApiKey: v }))}
              placeholder="sk-ant-..."
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showApiKey}
            />
            <TouchableOpacity onPress={() => setShowApiKey(!showApiKey)} style={styles.eyeBtn}>
              <Ionicons name={showApiKey ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.apiKeyHint}>
            Get your API key from console.anthropic.com
          </Text>
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
        <LinearGradient colors={[colors.primary, colors.primaryLight]} style={styles.saveBtnGradient}>
          <Ionicons name="save-outline" size={20} color={colors.text} />
          <Text style={styles.saveBtnText}>Save Profile</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 100, gap: spacing.lg },
  title: { ...typography.h1, color: colors.text, paddingTop: spacing.xl },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md },
  avatarImg: { width: 56, height: 56, borderRadius: 28 },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  avatarText: { ...typography.h2, color: colors.text },
  accountInfo: { flex: 1, gap: 2 },
  accountName: { ...typography.bodyBold, color: colors.text },
  accountEmail: { ...typography.caption, color: colors.textSecondary },
  signOutBtn: { padding: spacing.sm, backgroundColor: colors.error + '15', borderRadius: borderRadius.md },
  tdeeCard: { borderRadius: borderRadius.xl, padding: spacing.lg, alignItems: 'center', gap: spacing.xs },
  tdeeLabel: { ...typography.caption, color: colors.textSecondary },
  tdeeValue: { ...typography.hero, color: colors.primary },
  tdeeSubtext: { ...typography.caption, color: colors.textMuted },
  section: { gap: spacing.md },
  sectionTitle: { ...typography.h3, color: colors.text },
  field: { gap: spacing.xs },
  fieldLabel: { ...typography.caption, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.md, padding: spacing.md, color: colors.text, ...typography.body, borderWidth: 1, borderColor: colors.border },
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
  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  goalField: { flexBasis: '30%', flexGrow: 1, gap: 4 },
  goalLabel: { ...typography.captionBold },
  goalInput: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, color: colors.text, borderWidth: 1, textAlign: 'center' },
  goalUnit: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  apiKeyRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  eyeBtn: { padding: spacing.sm, backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  apiKeyHint: { ...typography.caption, color: colors.textMuted },
  saveBtn: { borderRadius: borderRadius.lg, overflow: 'hidden' },
  saveBtnGradient: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  saveBtnText: { ...typography.bodyBold, color: colors.text },
});
