import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExerciseEntry } from '../types';
import { colors, typography, borderRadius, spacing } from '../theme';

interface Props {
  entry: ExerciseEntry;
  onDelete: (id: string) => void;
  onEdit?: (entry: ExerciseEntry) => void;
}

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  strength: 'barbell-outline',
  cardio: 'heart-outline',
  flexibility: 'body-outline',
  sports: 'football-outline',
};

const categoryColors: Record<string, string> = {
  strength: colors.primary,
  cardio: colors.secondary,
  flexibility: colors.accent,
  sports: colors.accentOrange,
};

export function ExerciseLogItem({ entry, onDelete, onEdit }: Props) {
  const iconColor = categoryColors[entry.category];

  const setsLabel = (() => {
    if (!entry.sets || entry.sets.length === 0) return null;
    const first = entry.sets[0];
    const reps = first.reps;
    const weight = first.weight;
    const count = entry.sets.length;
    if (reps && weight) return `${count}×${reps} @ ${weight}kg`;
    if (reps) return `${count}×${reps} reps`;
    return `${count} sets`;
  })();

  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={categoryIcons[entry.category]} size={22} color={iconColor} />
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{entry.name}</Text>
          <View style={styles.actions}>
            {onEdit && (
              <TouchableOpacity onPress={() => onEdit(entry)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => onDelete(entry.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.details}>
          <View style={styles.detail}>
            <Ionicons name="time-outline" size={12} color={colors.textMuted} />
            <Text style={styles.detailText}>{entry.duration} min</Text>
          </View>
          <View style={styles.detail}>
            <Ionicons name="flame-outline" size={12} color={colors.accentOrange} />
            <Text style={[styles.detailText, { color: colors.accentOrange }]}>
              {entry.caloriesBurned} kcal
            </Text>
          </View>
          {setsLabel && (
            <View style={styles.detail}>
              <Ionicons name="repeat-outline" size={12} color={iconColor} />
              <Text style={[styles.detailText, { color: iconColor }]}>{setsLabel}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  iconBox: { width: 44, height: 44, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, gap: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...typography.bodyBold, color: colors.text, flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  details: { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  detail: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  detailText: { ...typography.caption, color: colors.textSecondary },
});
