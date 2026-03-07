import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  HAZARD_LABELS,
  HAZARD_ICONS,
  STATUS_LABELS,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
  API_BASE_URL,
} from '../../constants';

interface ReportCardProps {
  report: {
    id: string;
    hazard_type: string;
    severity_score: number;
    status: string;
    address?: string;
    created_at: string;
    image_url?: string;
  };
  compact?: boolean;
}

export default function ReportCard({ report, compact = false }: ReportCardProps) {
  const sevColor = SEVERITY_COLOR(report.severity_score);
  const imageUrl = report.image_url ? `${API_BASE_URL}${report.image_url}` : null;

  function handlePress() {
    router.push(`/report-detail/${report.id}`);
  }

  const timeAgo = getTimeAgo(report.created_at);

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={handlePress} activeOpacity={0.7}>
        <View style={[styles.compactSeverity, { backgroundColor: sevColor }]}>
          <Text style={styles.compactSeverityText}>
            {report.severity_score.toFixed(1)}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.compactTitle}>
            {HAZARD_ICONS[report.hazard_type]} {HAZARD_LABELS[report.hazard_type] || report.hazard_type}
          </Text>
          <Text style={styles.compactMeta}>{report.address || 'Unknown'} • {timeAgo}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
      {imageUrl && <Image source={{ uri: imageUrl }} style={styles.cardImage} />}
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>
              {HAZARD_ICONS[report.hazard_type]} {HAZARD_LABELS[report.hazard_type] || report.hazard_type}
            </Text>
            <Text style={styles.cardAddress}>{report.address || 'Unknown location'}</Text>
          </View>
          <View style={[styles.severityCircle, { backgroundColor: sevColor }]}>
            <Text style={styles.severityNum}>{report.severity_score.toFixed(1)}</Text>
            <Text style={styles.severityLbl}>{SEVERITY_LABEL(report.severity_score)}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={[styles.statusChip, { backgroundColor: (Colors as any)[report.status] || Colors.textMuted }]}>
            <Text style={styles.statusText}>{STATUS_LABELS[report.status] || report.status}</Text>
          </View>
          <Text style={styles.timeText}>{timeAgo}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  // Full card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  cardBody: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  cardAddress: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  severityCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  severityNum: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  severityLbl: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textLight,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  // Compact card
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  compactSeverity: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactSeverityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  compactMeta: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
});
