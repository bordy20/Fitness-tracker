import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StepRing } from '../components/StepRing';
import { MacroRing } from '../components/MacroRing';
import { ProgressBar } from '../components/ProgressBar';
import { FoodLogItem } from '../components/FoodLogItem';
import { ExerciseLogItem } from '../components/ExerciseLogItem';
import { getTodayLog, removeFoodEntry, removeExerciseEntry } from '../services/storageService';
import { DailyLog } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';

const DEFAULT_GOALS = { calories: 2000, protein: 150, carbs: 250, fat: 65 };

export function HomeScreen() {
  const [log, setLog] = useState<DailyLog | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadLog = useCallback(async () => {
    const data = await getTodayLog();
    setLog(data);
  }, []);

  useFocusEffect(useCallback(() => { loadLog(); }, [loadLog]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLog();
    setRefreshing(false);
  };

  const handleDeleteFood = async (id: string) => {
    const updated = await removeFoodEntry(id);
    setLog(updated);
  };

  const handleDeleteExercise = async (id: string) => {
    const updated = await removeExerciseEntry(id);
    setLog(updated);
  };

  if (!log) return (
    <View style={styles.loading}>
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );

  const totalCalories = log.foods.reduce((s, f) => s + f.macros.calories, 0);
  const totalProtein = log.foods.reduce((s, f) => s + f.macros.protein, 0);
  const totalCarbs = log.foods.reduce((s, f) => s + f.macros.carbs, 0);
  const totalFat = log.foods.reduce((s, f) => s + f.macros.fat, 0);
  const caloriesBurned = log.exercises.reduce((s, e) => s + e.caloriesBurned, 0);
  const netCalories = totalCalories - caloriesBurned;

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <LinearGradient colors={['#1A1A2E', '#0F0F1A']} style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting} 👋</Text>
          <Text style={styles.date}>{dateStr}</Text>
        </View>
        <View style={styles.streakBadge}>
          <Ionicons name="flame" size={16} color={colors.accentOrange} />
          <Text style={styles.streakText}>7 day streak</Text>
        </View>
      </LinearGradient>

      {/* Calorie Summary */}
      <LinearGradient
        colors={['#2A2A4E', '#1A1A3E']}
        style={styles.calorieCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.calorieHeader}>
          <Text style={styles.calorieTitle}>Calorie Balance</Text>
          <Text style={styles.calorieNet}>
            {netCalories > 0 ? '+' : ''}{netCalories} kcal net
          </Text>
        </View>
        <View style={styles.calorieRow}>
          <View style={styles.calorieStat}>
            <Text style={styles.calorieStatValue}>{totalCalories}</Text>
            <Text style={styles.calorieStatLabel}>Eaten</Text>
          </View>
          <View style={styles.calorieDivider} />
          <View style={styles.calorieStat}>
            <Text style={[styles.calorieStatValue, { color: colors.accentOrange }]}>{caloriesBurned}</Text>
            <Text style={styles.calorieStatLabel}>Burned</Text>
          </View>
          <View style={styles.calorieDivider} />
          <View style={styles.calorieStat}>
            <Text style={[styles.calorieStatValue, { color: colors.primary }]}>
              {DEFAULT_GOALS.calories - netCalories}
            </Text>
            <Text style={styles.calorieStatLabel}>Remaining</Text>
          </View>
        </View>
        <ProgressBar
          label="Daily Calories"
          value={netCalories}
          goal={DEFAULT_GOALS.calories}
          color={colors.primary}
          unit=" kcal"
        />
      </LinearGradient>

      {/* Steps + Macros Row */}
      <View style={styles.statsRow}>
        <View style={styles.stepsCard}>
          <Text style={styles.sectionTitle}>Steps</Text>
          <StepRing steps={log.steps} goal={log.stepGoal} size={130} />
          <Text style={styles.stepsGoal}>Goal: {log.stepGoal.toLocaleString()}</Text>
        </View>
        <View style={styles.macrosCard}>
          <Text style={styles.sectionTitle}>Macros</Text>
          <View style={styles.macrosGrid}>
            <MacroRing label="Protein" value={totalProtein} goal={DEFAULT_GOALS.protein} color={colors.protein} unit="g" size={72} />
            <MacroRing label="Carbs" value={totalCarbs} goal={DEFAULT_GOALS.carbs} color={colors.carbs} unit="g" size={72} />
            <MacroRing label="Fat" value={totalFat} goal={DEFAULT_GOALS.fat} color={colors.fat} unit="g" size={72} />
          </View>
        </View>
      </View>

      {/* Water Tracker */}
      <View style={styles.waterCard}>
        <View style={styles.waterHeader}>
          <View style={styles.waterTitleRow}>
            <Ionicons name="water" size={18} color={colors.accentBlue} />
            <Text style={styles.sectionTitle}>Water Intake</Text>
          </View>
          <Text style={styles.waterValue}>
            {(log.waterIntake / 1000).toFixed(1)}L / {(log.waterGoal / 1000).toFixed(1)}L
          </Text>
        </View>
        <View style={styles.waterCups}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.waterCup,
                { backgroundColor: i < Math.floor(log.waterIntake / 312) ? colors.accentBlue : colors.border }
              ]}
            />
          ))}
        </View>
      </View>

      {/* Food Log */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Food</Text>
        {log.foods.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>No food logged yet</Text>
            <Text style={styles.emptySubtext}>Tap the Scan tab to analyze food</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {log.foods.map(f => (
              <FoodLogItem key={f.id} entry={f} onDelete={handleDeleteFood} />
            ))}
          </View>
        )}
      </View>

      {/* Exercise Log */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Exercise</Text>
        {log.exercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>No exercise logged yet</Text>
            <Text style={styles.emptySubtext}>Tap the Exercise tab to log a workout</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {log.exercises.map(e => (
              <ExerciseLogItem key={e.id} entry={e} onDelete={handleDeleteExercise} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 100 },
  loading: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary },
  header: { padding: spacing.lg, paddingTop: spacing.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { ...typography.h2, color: colors.text },
  date: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accentOrange + '20', paddingHorizontal: 10, paddingVertical: 6, borderRadius: borderRadius.full },
  streakText: { ...typography.captionBold, color: colors.accentOrange },
  calorieCard: { margin: spacing.md, borderRadius: borderRadius.lg, padding: spacing.md, gap: spacing.md },
  calorieHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calorieTitle: { ...typography.h3, color: colors.text },
  calorieNet: { ...typography.captionBold, color: colors.textSecondary },
  calorieRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  calorieStat: { alignItems: 'center', gap: 2 },
  calorieStatValue: { ...typography.h3, color: colors.text },
  calorieStatLabel: { ...typography.caption, color: colors.textSecondary },
  calorieDivider: { width: 1, height: 32, backgroundColor: colors.border },
  statsRow: { flexDirection: 'row', marginHorizontal: spacing.md, gap: spacing.md },
  stepsCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center', gap: spacing.sm },
  macrosCard: { flex: 1.2, backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, gap: spacing.sm },
  macrosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  stepsGoal: { ...typography.caption, color: colors.textMuted },
  sectionTitle: { ...typography.h3, color: colors.text },
  waterCard: { margin: spacing.md, marginTop: spacing.md, backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, gap: spacing.md },
  waterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  waterTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  waterValue: { ...typography.captionBold, color: colors.accentBlue },
  waterCups: { flexDirection: 'row', gap: 6 },
  waterCup: { flex: 1, height: 28, borderRadius: borderRadius.sm },
  section: { marginHorizontal: spacing.md, marginTop: spacing.md, gap: spacing.sm },
  list: { gap: spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { ...typography.body, color: colors.textSecondary },
  emptySubtext: { ...typography.caption, color: colors.textMuted },
});
