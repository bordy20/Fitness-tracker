import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FoodEntry } from '../types';
import { colors, typography, borderRadius, spacing } from '../theme';

interface Props {
  entry: FoodEntry;
  onDelete: (id: string) => void;
}

export function FoodLogItem({ entry, onDelete }: Props) {
  const mealColors = {
    breakfast: colors.accentOrange,
    lunch: colors.accent,
    dinner: colors.primary,
    snack: colors.secondary,
  };

  return (
    <View style={styles.container}>
      {entry.imageUri && (
        <Image source={{ uri: entry.imageUri }} style={styles.image} />
      )}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{entry.name}</Text>
          <TouchableOpacity onPress={() => onDelete(entry.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        <View style={[
          styles.mealBadge,
          { backgroundColor: mealColors[entry.mealType] + '20', borderColor: mealColors[entry.mealType] + '40' }
        ]}>
          <Text style={[styles.mealText, { color: mealColors[entry.mealType] }]}>
            {entry.mealType.charAt(0).toUpperCase() + entry.mealType.slice(1)}
          </Text>
        </View>
        <View style={styles.macros}>
          <Text style={[styles.macroValue, { color: colors.calories }]}>
            {entry.macros.calories} kcal
          </Text>
          <Text style={styles.dot}>·</Text>
          <Text style={[styles.macroValue, { color: colors.protein }]}>
            P {entry.macros.protein}g
          </Text>
          <Text style={styles.dot}>·</Text>
          <Text style={[styles.macroValue, { color: colors.carbs }]}>
            C {entry.macros.carbs}g
          </Text>
          <Text style={styles.dot}>·</Text>
          <Text style={[styles.macroValue, { color: colors.fat }]}>
            F {entry.macros.fat}g
          </Text>
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
  image: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.sm,
  },
  content: { flex: 1, gap: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...typography.bodyBold, color: colors.text, flex: 1, marginRight: 8 },
  mealBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  mealText: { ...typography.captionBold },
  macros: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  macroValue: { ...typography.caption },
  dot: { color: colors.textMuted, ...typography.caption },
});
