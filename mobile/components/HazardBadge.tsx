import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, HAZARD_LABELS, HAZARD_ICONS } from '../../constants';

interface HazardBadgeProps {
  type: string;
  compact?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  pothole: Colors.pothole,
  broken_edge: Colors.broken_edge,
  waterlogging: Colors.waterlogging,
  missing_manhole: Colors.missing_manhole,
};

export default function HazardBadge({ type, compact = false }: HazardBadgeProps) {
  const color = TYPE_COLORS[type] || Colors.textMuted;
  const icon = HAZARD_ICONS[type] || '⚠️';
  const label = HAZARD_LABELS[type] || type;

  if (compact) {
    return (
      <View style={[styles.compactBadge, { backgroundColor: `${color}20`, borderColor: color }]}>
        <Text style={styles.compactIcon}>{icon}</Text>
        <Text style={[styles.compactLabel, { color }]}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={styles.badge}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    marginRight: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  compactIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  compactLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
