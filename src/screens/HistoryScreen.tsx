import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getRecentLogs } from '../services/storageService';
import { DailyLog } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';

export function HistoryScreen() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [selected, setSelected] = useState<DailyLog | null>(null);

  useFocusEffect(useCallback(() => {
    getRecentLogs(14).then(setLogs);
  }, []));

  const weeklySteps = logs.slice(0, 7).reduce((s, l) => s + l.steps, 0);
  const weeklyCalories = logs.slice(0, 7).reduce((s, l) => s + l.foods.reduce((fc, f) => fc + f.macros.calories, 0), 0);
  const weeklyExercises = logs.slice(0, 7).reduce((s, l) => s + l.exercises.length, 0);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>History</Text>

      {/* Weekly Summary */}
      <LinearGradient colors={['#2A2A4E', '#1A1A2E']} style={styles.weeklyCard}>
        <Text style={styles.weeklyTitle}>This Week</Text>
        <View style={styles.weeklyStats}>
          <View style={styles.weeklyStat}>
            <Text style={[styles.weeklyStatValue, { color: colors.primary }]}>{(weeklySteps/1000).toFixed(0)}k</Text>
            <Text style={styles.weeklyStatLabel}>Steps</Text>
          </View>
          <View style={styles.weeklyDivider} />
          <View style={styles.weeklyStat}>
            <Text style={[styles.weeklyStatValue, { color: colors.accentOrange }]}>{weeklyCalories.toLocaleString()}</Text>
            <Text style={styles.weeklyStatLabel}>Calories</Text>
          </View>
          <View style={styles.weeklyDivider} />
          <View style={styles.weeklyStat}>
            <Text style={[styles.weeklyStatValue, { color: colors.accent }]}>{weeklyExercises}</Text>
            <Text style={styles.weeklyStatLabel}>Workouts</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Daily Cards */}
      <Text style={styles.sectionTitle}>Daily Logs</Text>
      {logs.map(log => {
        const totalCal = log.foods.reduce((s, f) => s + f.macros.calories, 0);
        const isSelected = selected?.date === log.date;
        const dayName = new Date(log.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const isToday = log.date === new Date().toISOString().split('T')[0];

        return (
          <View key={log.date}>
            <TouchableOpacity
              style={[styles.dayCard, isSelected && styles.dayCardActive]}
              onPress={() => setSelected(isSelected ? null : log)}
            >
              <View style={styles.dayCardHeader}>
                <View>
                  <View style={styles.dayNameRow}>
                    <Text style={styles.dayName}>{dayName}</Text>
                    {isToday && (
                      <View style={styles.todayBadge}>
                        <Text style={styles.todayText}>Today</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons
                  name={isSelected ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textMuted}
                />
              </View>
              <View style={styles.dayStats}>
                <View style={styles.dayStat}>
                  <Ionicons name="walk-outline" size={14} color={colors.primary} />
                  <Text style={styles.dayStatText}>{log.steps.toLocaleString()} steps</Text>
                </View>
                <View style={styles.dayStat}>
                  <Ionicons name="nutrition-outline" size={14} color={colors.accentOrange} />
                  <Text style={styles.dayStatText}>{totalCal} kcal</Text>
                </View>
                <View style={styles.dayStat}>
                  <Ionicons name="barbell-outline" size={14} color={colors.accent} />
                  <Text style={styles.dayStatText}>{log.exercises.length} workout{log.exercises.length !== 1 ? 's' : ''}</Text>
                </View>
              </View>
            </TouchableOpacity>

            {isSelected && (
              <View style={styles.expanded}>
                {log.foods.length > 0 && (
                  <View style={styles.expandedSection}>
                    <Text style={styles.expandedTitle}>Food Log</Text>
                    {log.foods.map(f => (
                      <View key={f.id} style={styles.expandedItem}>
                        <Text style={styles.expandedItemName}>{f.name}</Text>
                        <Text style={styles.expandedItemMacros}>
                          {f.macros.calories}kcal · P{f.macros.protein}g · C{f.macros.carbs}g · F{f.macros.fat}g
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                {log.exercises.length > 0 && (
                  <View style={styles.expandedSection}>
                    <Text style={styles.expandedTitle}>Workouts</Text>
                    {log.exercises.map(e => (
                      <View key={e.id} style={styles.expandedItem}>
                        <Text style={styles.expandedItemName}>{e.name}</Text>
                        <Text style={styles.expandedItemMacros}>
                          {e.duration} min · {e.caloriesBurned} kcal burned
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                {log.foods.length === 0 && log.exercises.length === 0 && (
                  <Text style={styles.noData}>No data for this day</Text>
                )}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 100, gap: spacing.md },
  title: { ...typography.h1, color: colors.text, paddingTop: spacing.xl },
  weeklyCard: { borderRadius: borderRadius.xl, padding: spacing.lg, gap: spacing.md },
  weeklyTitle: { ...typography.h3, color: colors.text },
  weeklyStats: { flexDirection: 'row', justifyContent: 'space-around' },
  weeklyStat: { alignItems: 'center', gap: 4 },
  weeklyStatValue: { ...typography.h2 },
  weeklyStatLabel: { ...typography.caption, color: colors.textSecondary },
  weeklyDivider: { width: 1, backgroundColor: colors.border },
  sectionTitle: { ...typography.h3, color: colors.text },
  dayCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: 'transparent' },
  dayCardActive: { borderColor: colors.primary + '40' },
  dayCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dayNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dayName: { ...typography.bodyBold, color: colors.text },
  todayBadge: { backgroundColor: colors.primary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full },
  todayText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  dayStats: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  dayStat: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  dayStatText: { ...typography.caption, color: colors.textSecondary },
  expanded: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.md, padding: spacing.md, marginTop: -spacing.xs, gap: spacing.md },
  expandedSection: { gap: spacing.xs },
  expandedTitle: { ...typography.captionBold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  expandedItem: { gap: 2 },
  expandedItemName: { ...typography.body, color: colors.text },
  expandedItemMacros: { ...typography.caption, color: colors.textMuted },
  noData: { ...typography.body, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },
});
