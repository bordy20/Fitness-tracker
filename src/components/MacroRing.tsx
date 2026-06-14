import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, typography } from '../theme';

interface Props {
  label: string;
  value: number;
  goal: number;
  color: string;
  unit: string;
  size?: number;
}

export function MacroRing({ label, value, goal, color, unit, size = 80 }: Props) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / goal, 1);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color + '30'}
          strokeWidth={6}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={6}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[styles.center, { width: size, height: size }]}>
        <Text style={[styles.value, { color }]}>{Math.round(value)}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 4 },
  center: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  value: { ...typography.bodyBold, fontWeight: '700' },
  unit: { ...typography.caption, color: colors.textMuted },
  label: { ...typography.caption, color: colors.textSecondary },
});
