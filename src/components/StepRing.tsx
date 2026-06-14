import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, typography } from '../theme';

interface Props {
  steps: number;
  goal: number;
  size?: number;
}

export function StepRing({ steps, goal, size = 160 }: Props) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(steps / goal, 1);
  const strokeDashoffset = circumference * (1 - progress);
  const percentage = Math.round(progress * 100);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="stepGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#6C63FF" />
            <Stop offset="1" stopColor="#43E97B" />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#stepGrad)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={[styles.center, { width: size, height: size }]}>
        <Text style={styles.steps}>{steps.toLocaleString()}</Text>
        <Text style={styles.label}>steps</Text>
        <Text style={styles.percentage}>{percentage}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  center: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  steps: { ...typography.h2, color: colors.text, fontWeight: '800' },
  label: { ...typography.caption, color: colors.textSecondary },
  percentage: { ...typography.captionBold, color: colors.primary, marginTop: 2 },
});
