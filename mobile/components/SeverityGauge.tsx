import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, SEVERITY_LABEL, SEVERITY_COLOR } from '../../constants';

interface SeverityGaugeProps {
  score: number;
  size?: 'small' | 'medium' | 'large';
}

export default function SeverityGauge({ score, size = 'medium' }: SeverityGaugeProps) {
  const color = SEVERITY_COLOR(score);
  const label = SEVERITY_LABEL(score);

  const dimensions = {
    small: { circle: 36, font: 14, labelFont: 9 },
    medium: { circle: 52, font: 18, labelFont: 11 },
    large: { circle: 72, font: 26, labelFont: 13 },
  }[size];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.circle,
          {
            width: dimensions.circle,
            height: dimensions.circle,
            borderRadius: dimensions.circle / 2,
            backgroundColor: color,
          },
        ]}
      >
        <Text style={[styles.score, { fontSize: dimensions.font }]}>
          {score.toFixed(1)}
        </Text>
      </View>
      <Text style={[styles.label, { fontSize: dimensions.labelFont, color }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  score: {
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  label: {
    fontWeight: '600',
    marginTop: 4,
  },
});
