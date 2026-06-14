import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StepRing } from '../components/StepRing';
import { ProgressBar } from '../components/ProgressBar';
import { getTodayLog, updateSteps, getRecentLogs } from '../services/storageService';
import { DailyLog } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';

const STEP_GOAL = 10000;
const STRIDE_LENGTH_M = 0.762;
const CALORIES_PER_STEP = 0.04;

export function StepsScreen() {
  const [steps, setSteps] = useState(0);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState(false);
  const [recentLogs, setRecentLogs] = useState<DailyLog[]>([]);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;

    if (Platform.OS === 'web') {
      getTodayLog().then(log => setSteps(log.steps));
      return;
    }

    (async () => {
      const { status } = await Pedometer.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Motion permission is required to track steps');
        return;
      }
      const { isAvailable } = await Pedometer.isAvailableAsync();
      setIsPedometerAvailable(isAvailable);

      if (isAvailable) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        try {
          const { steps: todaySteps } = await Pedometer.getStepCountAsync(start, new Date());
          setSteps(todaySteps);
          await updateSteps(todaySteps);
        } catch (_) {}

        subscription = Pedometer.watchStepCount(result => {
          setSteps(result.steps);
          updateSteps(result.steps);
        });
      }
    })();

    return () => { subscription?.remove(); };
  }, []);

  useFocusEffect(useCallback(() => {
    getRecentLogs(7).then(setRecentLogs);
  }, []));

  const distance = (steps * STRIDE_LENGTH_M / 1000).toFixed(2);
  const calories = Math.round(steps * CALORIES_PER_STEP);
  const activeTime = Math.round(steps / 100);

  const maxSteps = Math.max(...recentLogs.map(l => l.steps), 1);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Steps</Text>
        {!isPedometerAvailable && Platform.OS !== 'web' && (
          <View style={styles.unavailableBadge}>
            <Text style={styles.unavailableText}>Pedometer unavailable</Text>
          </View>
        )}
      </View>

      {/* Main Ring */}
      <LinearGradient
        colors={['#2A2A4E', '#1A1A2E']}
        style={styles.ringCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <StepRing steps={steps} goal={STEP_GOAL} size={180} />
        <Text style={styles.goalText}>Daily goal: {STEP_GOAL.toLocaleString()} steps</Text>
      </LinearGradient>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <LinearGradient colors={[colors.primary + '30', colors.primary + '10']} style={styles.statIcon}>
            <Ionicons name="walk-outline" size={22} color={colors.primary} />
          </LinearGradient>
          <Text style={styles.statValue}>{distance}</Text>
          <Text style={styles.statLabel}>km walked</Text>
        </View>
        <View style={styles.statCard}>
          <LinearGradient colors={[colors.accentOrange + '30', colors.accentOrange + '10']} style={styles.statIcon}>
            <Ionicons name="flame-outline" size={22} color={colors.accentOrange} />
          </LinearGradient>
          <Text style={[styles.statValue, { color: colors.accentOrange }]}>{calories}</Text>
          <Text style={styles.statLabel}>cal burned</Text>
        </View>
        <View style={styles.statCard}>
          <LinearGradient colors={[colors.accent + '30', colors.accent + '10']} style={styles.statIcon}>
            <Ionicons name="time-outline" size={22} color={colors.accent} />
          </LinearGradient>
          <Text style={[styles.statValue, { color: colors.accent }]}>{activeTime}</Text>
          <Text style={styles.statLabel}>min active</Text>
        </View>
      </View>

      {/* Progress Breakdown */}
      <View style={styles.progressCard}>
        <Text style={styles.sectionTitle}>Today's Progress</Text>
        <ProgressBar label="Steps" value={steps} goal={STEP_GOAL} color={colors.primary} unit=" steps" />
        <ProgressBar label="Distance" value={parseFloat(distance)} goal={8} color={colors.accent} unit=" km" />
        <ProgressBar label="Calories" value={calories} goal={400} color={colors.accentOrange} unit=" kcal" />
      </View>

      {/* 7-Day Chart */}
      <View style={styles.historyCard}>
        <Text style={styles.sectionTitle}>Last 7 Days</Text>
        <View style={styles.barChart}>
          {[...recentLogs].reverse().map((log, i) => {
            const barHeight = maxSteps > 0 ? (log.steps / maxSteps) * 80 : 0;
            const dayLabel = new Date(log.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
            const isToday = i === recentLogs.length - 1;
            return (
              <View key={log.date} style={styles.barWrapper}>
                <Text style={styles.barValue}>{log.steps >= 1000 ? `${(log.steps/1000).toFixed(1)}k` : log.steps}</Text>
                <View style={styles.barTrack}>
                  <LinearGradient
                    colors={isToday ? [colors.primary, colors.primaryLight] : [colors.textMuted, colors.textMuted]}
                    style={[styles.bar, { height: Math.max(barHeight, 4) }]}
                  />
                </View>
                <Text style={[styles.barLabel, isToday && { color: colors.primary }]}>{dayLabel}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Tips */}
      <View style={styles.tipsCard}>
        <Text style={styles.sectionTitle}>Tips to Hit Your Goal</Text>
        {[
          { icon: 'walk-outline', tip: 'Take the stairs instead of the elevator' },
          { icon: 'bicycle-outline', tip: 'Park further away to add extra steps' },
          { icon: 'timer-outline', tip: 'Take a 10-min walk after each meal' },
        ].map(({ icon, tip }, i) => (
          <View key={i} style={styles.tip}>
            <View style={styles.tipIcon}>
              <Ionicons name={icon as any} size={16} color={colors.primary} />
            </View>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 100, padding: spacing.md, gap: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.xl },
  title: { ...typography.h1, color: colors.text },
  unavailableBadge: { backgroundColor: colors.warning + '20', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  unavailableText: { ...typography.caption, color: colors.warning },
  ringCard: { borderRadius: borderRadius.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.md },
  goalText: { ...typography.caption, color: colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center', gap: spacing.xs },
  statIcon: { width: 40, height: 40, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  statValue: { ...typography.h3, color: colors.text },
  statLabel: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  progressCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, gap: spacing.md },
  sectionTitle: { ...typography.h3, color: colors.text },
  historyCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, gap: spacing.md },
  barChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120 },
  barWrapper: { flex: 1, alignItems: 'center', gap: 4 },
  barValue: { ...typography.caption, color: colors.textMuted, fontSize: 9 },
  barTrack: { width: '60%', height: 80, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: borderRadius.sm },
  barLabel: { ...typography.caption, color: colors.textSecondary, fontSize: 10 },
  tipsCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, gap: spacing.md },
  tip: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  tipIcon: { width: 32, height: 32, backgroundColor: colors.primary + '20', borderRadius: borderRadius.sm, justifyContent: 'center', alignItems: 'center' },
  tipText: { ...typography.body, color: colors.textSecondary, flex: 1 },
});
