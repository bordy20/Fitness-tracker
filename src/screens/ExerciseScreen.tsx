import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ExerciseLogItem } from '../components/ExerciseLogItem';
import { getTodayLog, addExerciseEntry, removeExerciseEntry } from '../services/storageService';
import { ExerciseEntry, ExerciseSet } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';

type Category = 'strength' | 'cardio' | 'flexibility' | 'sports';

const PRESETS: Record<Category, { name: string; icon: string; calPerMin: number }[]> = {
  strength: [
    { name: 'Bench Press', icon: 'barbell-outline', calPerMin: 6 },
    { name: 'Squat', icon: 'barbell-outline', calPerMin: 7 },
    { name: 'Deadlift', icon: 'barbell-outline', calPerMin: 7 },
    { name: 'Pull-ups', icon: 'body-outline', calPerMin: 8 },
    { name: 'Push-ups', icon: 'body-outline', calPerMin: 5 },
    { name: 'Shoulder Press', icon: 'barbell-outline', calPerMin: 6 },
  ],
  cardio: [
    { name: 'Running', icon: 'walk-outline', calPerMin: 11 },
    { name: 'Cycling', icon: 'bicycle-outline', calPerMin: 9 },
    { name: 'Jump Rope', icon: 'body-outline', calPerMin: 13 },
    { name: 'Swimming', icon: 'water-outline', calPerMin: 10 },
    { name: 'HIIT', icon: 'flash-outline', calPerMin: 12 },
    { name: 'Walking', icon: 'walk-outline', calPerMin: 4 },
  ],
  flexibility: [
    { name: 'Yoga', icon: 'body-outline', calPerMin: 3 },
    { name: 'Stretching', icon: 'body-outline', calPerMin: 2 },
    { name: 'Pilates', icon: 'body-outline', calPerMin: 5 },
  ],
  sports: [
    { name: 'Basketball', icon: 'basketball-outline', calPerMin: 9 },
    { name: 'Soccer', icon: 'football-outline', calPerMin: 10 },
    { name: 'Tennis', icon: 'tennisball-outline', calPerMin: 8 },
  ],
};

const categoryColors: Record<Category, string> = {
  strength: colors.primary,
  cardio: colors.secondary,
  flexibility: colors.accent,
  sports: colors.accentOrange,
};

export function ExerciseScreen() {
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [modal, setModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category>('strength');
  const [customName, setCustomName] = useState('');
  const [duration, setDuration] = useState('30');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('');

  useFocusEffect(useCallback(() => {
    getTodayLog().then(log => setExercises(log.exercises));
  }, []));

  const totalMinutes = exercises.reduce((s, e) => s + e.duration, 0);
  const totalCalories = exercises.reduce((s, e) => s + e.caloriesBurned, 0);

  const handleAddPreset = async (preset: typeof PRESETS.strength[0]) => {
    const dur = parseInt(duration) || 30;
    const calPerMin = preset.calPerMin;
    const entry: ExerciseEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      name: preset.name,
      category: selectedCategory,
      duration: dur,
      caloriesBurned: Math.round(calPerMin * dur),
      sets: selectedCategory === 'strength' ? Array.from({ length: parseInt(sets) || 3 }, (_, i) => ({
        setNumber: i + 1,
        reps: parseInt(reps) || 10,
        weight: weight ? parseFloat(weight) : undefined,
      } as ExerciseSet)) : undefined,
    };
    const log = await addExerciseEntry(entry);
    setExercises(log.exercises);
    setModal(false);
  };

  const handleAddCustom = async () => {
    if (!customName.trim()) { Alert.alert('Enter exercise name'); return; }
    const dur = parseInt(duration) || 30;
    const entry: ExerciseEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      name: customName.trim(),
      category: selectedCategory,
      duration: dur,
      caloriesBurned: Math.round(7 * dur),
      sets: selectedCategory === 'strength' ? Array.from({ length: parseInt(sets) || 3 }, (_, i) => ({
        setNumber: i + 1,
        reps: parseInt(reps) || 10,
        weight: weight ? parseFloat(weight) : undefined,
      } as ExerciseSet)) : undefined,
    };
    const log = await addExerciseEntry(entry);
    setExercises(log.exercises);
    setModal(false);
    setCustomName('');
  };

  const handleDelete = async (id: string) => {
    const log = await removeExerciseEntry(id);
    setExercises(log.exercises);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Exercise</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
            <LinearGradient colors={[colors.primary, colors.primaryLight]} style={styles.addBtnGradient}>
              <Ionicons name="add" size={22} color={colors.text} />
              <Text style={styles.addBtnText}>Log Exercise</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Today Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={20} color={colors.accentBlue} />
            <Text style={[styles.statValue, { color: colors.accentBlue }]}>{totalMinutes}</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="flame-outline" size={20} color={colors.accentOrange} />
            <Text style={[styles.statValue, { color: colors.accentOrange }]}>{totalCalories}</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="barbell-outline" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.primary }]}>{exercises.length}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
        </View>

        {/* Exercise List */}
        {exercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No exercises yet</Text>
            <Text style={styles.emptySubtext}>Tap "Log Exercise" to track your workout</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {exercises.map(e => (
              <ExerciseLogItem key={e.id} entry={e} onDelete={handleDelete} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Exercise Modal */}
      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Exercise</Text>
              <TouchableOpacity onPress={() => setModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Category */}
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.categoryRow}>
                {(['strength', 'cardio', 'flexibility', 'sports'] as Category[]).map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.categoryBtn,
                      selectedCategory === c && { backgroundColor: categoryColors[c] + '30', borderColor: categoryColors[c] },
                    ]}
                    onPress={() => setSelectedCategory(c)}
                  >
                    <Text style={[
                      styles.categoryBtnText,
                      selectedCategory === c && { color: categoryColors[c] },
                    ]}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Duration */}
              <Text style={styles.fieldLabel}>Duration (minutes)</Text>
              <TextInput
                style={styles.input}
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
                placeholderTextColor={colors.textMuted}
              />

              {/* Strength-specific */}
              {selectedCategory === 'strength' && (
                <View style={styles.strengthRow}>
                  <View style={styles.strengthField}>
                    <Text style={styles.fieldLabel}>Sets</Text>
                    <TextInput style={styles.input} value={sets} onChangeText={setSets} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                  </View>
                  <View style={styles.strengthField}>
                    <Text style={styles.fieldLabel}>Reps</Text>
                    <TextInput style={styles.input} value={reps} onChangeText={setReps} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                  </View>
                  <View style={styles.strengthField}>
                    <Text style={styles.fieldLabel}>Weight (kg)</Text>
                    <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="opt" placeholderTextColor={colors.textMuted} />
                  </View>
                </View>
              )}

              {/* Presets */}
              <Text style={styles.fieldLabel}>Quick Select</Text>
              <View style={styles.presetGrid}>
                {PRESETS[selectedCategory].map(p => (
                  <TouchableOpacity key={p.name} style={styles.presetBtn} onPress={() => handleAddPreset(p)}>
                    <Ionicons name={p.icon as any} size={18} color={categoryColors[selectedCategory]} />
                    <Text style={styles.presetName}>{p.name}</Text>
                    <Text style={styles.presetCal}>{p.calPerMin * (parseInt(duration) || 30)} kcal</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom */}
              <Text style={styles.fieldLabel}>Custom Exercise</Text>
              <View style={styles.customRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={customName}
                  onChangeText={setCustomName}
                  placeholder="Exercise name"
                  placeholderTextColor={colors.textMuted}
                />
                <TouchableOpacity style={styles.customAddBtn} onPress={handleAddCustom}>
                  <Ionicons name="add" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingBottom: 100, padding: spacing.md, gap: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.xl },
  title: { ...typography.h1, color: colors.text },
  addBtn: { borderRadius: borderRadius.lg, overflow: 'hidden' },
  addBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  addBtnText: { ...typography.bodyBold, color: colors.text },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center', gap: spacing.xs },
  statValue: { ...typography.h2 },
  statLabel: { ...typography.caption, color: colors.textSecondary },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: spacing.md },
  emptyTitle: { ...typography.h3, color: colors.textSecondary },
  emptySubtext: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  list: { gap: spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.lg, maxHeight: '90%', gap: spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { ...typography.h2, color: colors.text },
  fieldLabel: { ...typography.captionBold, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  categoryRow: { flexDirection: 'row', gap: spacing.xs },
  categoryBtn: { flex: 1, paddingVertical: spacing.sm, backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  categoryBtnText: { ...typography.caption, color: colors.textSecondary },
  input: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.md, padding: spacing.md, color: colors.text, ...typography.body, borderWidth: 1, borderColor: colors.border },
  strengthRow: { flexDirection: 'row', gap: spacing.sm },
  strengthField: { flex: 1 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  presetBtn: { flexBasis: '47%', backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.md, padding: spacing.sm, gap: 2 },
  presetName: { ...typography.captionBold, color: colors.text },
  presetCal: { ...typography.caption, color: colors.textMuted },
  customRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  customAddBtn: { width: 48, height: 48, backgroundColor: colors.primary, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
});
