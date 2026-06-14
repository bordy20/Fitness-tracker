import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StepRing } from '../components/StepRing';
import { MacroRing } from '../components/MacroRing';
import { ProgressBar } from '../components/ProgressBar';
import { FoodLogItem } from '../components/FoodLogItem';
import { ExerciseLogItem } from '../components/ExerciseLogItem';
import { getTodayLog, removeFoodEntry, removeExerciseEntry, updateWater, updateFoodEntry, updateExerciseEntry, getUserProfile } from '../services/storageService';
import { DailyLog, FoodEntry, ExerciseEntry } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';
import { Toast } from '../components/Toast';

const FALLBACK_GOALS = { calories: 2000, protein: 150, carbs: 250, fat: 65 };

export function HomeScreen() {
  const [log, setLog] = useState<DailyLog | null>(null);
  const [goals, setGoals] = useState(FALLBACK_GOALS);
  const [refreshing, setRefreshing] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodEntry | null>(null);
  const [editName, setEditName] = useState('');
  const [editCalories, setEditCalories] = useState('');
  const [editProtein, setEditProtein] = useState('');
  const [editCarbs, setEditCarbs] = useState('');
  const [editFat, setEditFat] = useState('');
  const [editMealType, setEditMealType] = useState<FoodEntry['mealType']>('lunch');
  const [editingExercise, setEditingExercise] = useState<ExerciseEntry | null>(null);
  const [exDuration, setExDuration] = useState('');
  const [exSets, setExSets] = useState('');
  const [exReps, setExReps] = useState('');
  const [exWeight, setExWeight] = useState('');
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, message });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500);
  };

  const loadLog = useCallback(async () => {
    const [data, profile] = await Promise.all([getTodayLog(), getUserProfile()]);
    setLog(data);
    if (profile?.goals) {
      setGoals({
        calories: profile.goals.calories || FALLBACK_GOALS.calories,
        protein:  profile.goals.protein  || FALLBACK_GOALS.protein,
        carbs:    profile.goals.carbs    || FALLBACK_GOALS.carbs,
        fat:      profile.goals.fat      || FALLBACK_GOALS.fat,
      });
    }
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

  const handleEditFood = (entry: FoodEntry) => {
    setEditingFood(entry);
    setEditName(entry.name);
    setEditCalories(String(entry.macros.calories));
    setEditProtein(String(entry.macros.protein));
    setEditCarbs(String(entry.macros.carbs));
    setEditFat(String(entry.macros.fat));
    setEditMealType(entry.mealType);
  };

  const handleSaveFood = async () => {
    if (!editingFood) return;
    const updated = await updateFoodEntry(editingFood.id, {
      name: editName.trim() || editingFood.name,
      mealType: editMealType,
      macros: {
        ...editingFood.macros,
        calories: parseFloat(editCalories) || editingFood.macros.calories,
        protein: parseFloat(editProtein) || editingFood.macros.protein,
        carbs: parseFloat(editCarbs) || editingFood.macros.carbs,
        fat: parseFloat(editFat) || editingFood.macros.fat,
      },
    });
    setLog(updated);
    setEditingFood(null);
    showToast('Food entry updated');
  };

  const handleEditExercise = (entry: ExerciseEntry) => {
    setEditingExercise(entry);
    setExDuration(String(entry.duration));
    const first = entry.sets?.[0];
    setExSets(entry.sets ? String(entry.sets.length) : '');
    setExReps(first?.reps ? String(first.reps) : '');
    setExWeight(first?.weight ? String(first.weight) : '');
  };

  const handleSaveExercise = async () => {
    if (!editingExercise) return;
    const dur = parseInt(exDuration) || editingExercise.duration;
    const setsCount = parseInt(exSets) || (editingExercise.sets?.length ?? 0);
    const repsVal = parseInt(exReps) || editingExercise.sets?.[0]?.reps;
    const weightVal = exWeight ? parseFloat(exWeight) : editingExercise.sets?.[0]?.weight;
    const newSets = editingExercise.sets && setsCount > 0
      ? Array.from({ length: setsCount }, (_, i) => ({
          setNumber: i + 1,
          reps: repsVal,
          weight: weightVal,
        }))
      : editingExercise.sets;
    const calPerMin = editingExercise.caloriesBurned / editingExercise.duration;
    const updated = await updateExerciseEntry(editingExercise.id, {
      duration: dur,
      caloriesBurned: Math.round(calPerMin * dur),
      sets: newSets,
    });
    setLog(updated);
    setEditingExercise(null);
    showToast('Exercise updated');
  };

  const handleWaterCup = async (cupIndex: number) => {
    if (!log) return;
    const filled = Math.floor(log.waterIntake / 312);
    const newFilled = filled === cupIndex + 1 ? cupIndex : cupIndex + 1;
    const newAmount = newFilled * 312;
    await updateWater(newAmount);
    setLog({ ...log, waterIntake: newAmount });
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
    <View style={styles.root}>
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
              {goals.calories - netCalories}
            </Text>
            <Text style={styles.calorieStatLabel}>Remaining</Text>
          </View>
        </View>
        <ProgressBar
          label="Daily Calories"
          value={netCalories}
          goal={goals.calories}
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
            <MacroRing label="Protein" value={totalProtein} goal={goals.protein} color={colors.protein} unit="g" size={72} />
            <MacroRing label="Carbs" value={totalCarbs} goal={goals.carbs} color={colors.carbs} unit="g" size={72} />
            <MacroRing label="Fat" value={totalFat} goal={goals.fat} color={colors.fat} unit="g" size={72} />
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
        <Text style={styles.waterHint}>Tap a cup to log water (each = 312ml)</Text>
        <View style={styles.waterCups}>
          {Array.from({ length: 8 }).map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => handleWaterCup(i)}
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
              <FoodLogItem key={f.id} entry={f} onDelete={handleDeleteFood} onEdit={handleEditFood} />
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
              <ExerciseLogItem key={e.id} entry={e} onDelete={handleDeleteExercise} onEdit={handleEditExercise} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>

      {/* Food Edit Modal */}
      <Toast visible={toast.visible} message={toast.message} />

      <Modal visible={!!editingFood} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Food Entry</Text>
              <TouchableOpacity onPress={() => setEditingFood(null)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholderTextColor={colors.textMuted} />
            </View>

            <Text style={styles.fieldLabel}>Meal Type</Text>
            <View style={styles.mealTypeRow}>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as FoodEntry['mealType'][]).map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.mealTypeBtn, editMealType === m && styles.mealTypeBtnActive]}
                  onPress={() => setEditMealType(m)}
                >
                  <Text style={[styles.mealTypeBtnText, editMealType === m && { color: colors.primary }]}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Macros</Text>
            <View style={styles.macroRow}>
              {[
                { label: 'Calories', value: editCalories, set: setEditCalories },
                { label: 'Protein g', value: editProtein, set: setEditProtein },
                { label: 'Carbs g', value: editCarbs, set: setEditCarbs },
                { label: 'Fat g', value: editFat, set: setEditFat },
              ].map(({ label, value, set }) => (
                <View key={label} style={styles.macroField}>
                  <Text style={styles.macroLabel}>{label}</Text>
                  <TextInput
                    style={styles.macroInput}
                    value={value}
                    onChangeText={set}
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveFood}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Exercise Edit Modal */}
      <Modal visible={!!editingExercise} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Exercise</Text>
              <TouchableOpacity onPress={() => setEditingExercise(null)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {editingExercise && (
              <Text style={styles.exName}>{editingExercise.name}</Text>
            )}

            <View style={styles.macroRow}>
              <View style={styles.macroField}>
                <Text style={styles.macroLabel}>Duration (min)</Text>
                <TextInput style={styles.macroInput} value={exDuration} onChangeText={setExDuration} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
              </View>
              {editingExercise?.sets && editingExercise.sets.length > 0 && (
                <>
                  <View style={styles.macroField}>
                    <Text style={styles.macroLabel}>Sets</Text>
                    <TextInput style={styles.macroInput} value={exSets} onChangeText={setExSets} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                  </View>
                  <View style={styles.macroField}>
                    <Text style={styles.macroLabel}>Reps</Text>
                    <TextInput style={styles.macroInput} value={exReps} onChangeText={setExReps} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                  </View>
                  <View style={styles.macroField}>
                    <Text style={styles.macroLabel}>Weight (kg)</Text>
                    <TextInput style={styles.macroInput} value={exWeight} onChangeText={setExWeight} keyboardType="decimal-pad" placeholder="opt" placeholderTextColor={colors.textMuted} />
                  </View>
                </>
              )}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveExercise}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
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
  waterHint: { ...typography.caption, color: colors.textMuted },
  waterCups: { flexDirection: 'row', gap: 6 },
  waterCup: { flex: 1, height: 28, borderRadius: borderRadius.sm },
  section: { marginHorizontal: spacing.md, marginTop: spacing.md, gap: spacing.sm },
  list: { gap: spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { ...typography.body, color: colors.textSecondary },
  emptySubtext: { ...typography.caption, color: colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.lg, gap: spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { ...typography.h2, color: colors.text },
  field: { gap: 4 },
  fieldLabel: { ...typography.captionBold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.md, padding: spacing.md, color: colors.text, ...typography.body, borderWidth: 1, borderColor: colors.border },
  mealTypeRow: { flexDirection: 'row', gap: spacing.xs },
  mealTypeBtn: { flex: 1, paddingVertical: spacing.sm, backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  mealTypeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
  mealTypeBtnText: { ...typography.caption, color: colors.textSecondary },
  macroRow: { flexDirection: 'row', gap: spacing.sm },
  macroField: { flex: 1, gap: 4, alignItems: 'center' },
  macroLabel: { ...typography.caption, color: colors.textSecondary },
  macroInput: { width: '100%', backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.md, padding: spacing.sm, color: colors.text, textAlign: 'center', borderWidth: 1, borderColor: colors.border },
  exName: { ...typography.bodyBold, color: colors.textSecondary },
  saveBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center' },
  saveBtnText: { ...typography.bodyBold, color: colors.text },
});
