import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { dashboardAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Colors,
  HAZARD_LABELS,
  SEVERITY_COLOR,
  SEVERITY_LABEL,
  STATUS_LABELS,
} from '../../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DashboardData {
  overview: {
    total_reports: number;
    total_users: number;
    total_resolved: number;
    total_verified: number;
    total_in_progress: number;
    total_pending: number;
    total_verifications: number;
    avg_severity: number;
    total_estimated_cost: number;
    resolution_rate: number;
  };
  by_hazard_type: Record<string, number>;
  by_status: Record<string, number>;
  severity_distribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  recent_reports: Array<{
    id: string;
    hazard_type: string;
    severity_score: number;
    status: string;
    latitude: number;
    longitude: number;
    created_at: string;
  }>;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      setError(null);
      const response = await dashboardAPI.getStats();
      setData(response.data);
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Ionicons name="warning-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.errorText}>{error || 'No data available'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDashboard}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { overview, by_hazard_type, by_status, severity_distribution, recent_reports } = data;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* Welcome Banner */}
      <View style={styles.banner}>
        <View>
          <Text style={styles.bannerGreeting}>
            Welcome{user ? `, ${user.name.split(' ')[0]}` : ''}!
          </Text>
          <Text style={styles.bannerSubtitle}>HazardEye Dashboard</Text>
        </View>
        <View style={styles.bannerBadge}>
          <Text style={styles.bannerRate}>{overview.resolution_rate}%</Text>
          <Text style={styles.bannerRateLabel}>Resolved</Text>
        </View>
      </View>

      {/* Quick Stats Cards */}
      <View style={styles.statsRow}>
        <StatCard
          icon="document-text"
          label="Total Reports"
          value={overview.total_reports}
          color={Colors.primary}
        />
        <StatCard
          icon="people"
          label="Active Users"
          value={overview.total_users}
          color={Colors.info}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          icon="checkmark-circle"
          label="Resolved"
          value={overview.total_resolved}
          color={Colors.success}
        />
        <StatCard
          icon="time"
          label="Pending"
          value={overview.total_pending}
          color={Colors.warning}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          icon="shield-checkmark"
          label="Verified"
          value={overview.total_verified}
          color="#17A2B8"
        />
        <StatCard
          icon="construct"
          label="In Progress"
          value={overview.total_in_progress}
          color="#FF8C00"
        />
      </View>

      {/* Average Severity */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Average Severity</Text>
        <View style={styles.severityRow}>
          <View style={[styles.severityBadge, { backgroundColor: SEVERITY_COLOR(overview.avg_severity) }]}>
            <Text style={styles.severityValue}>{overview.avg_severity}</Text>
          </View>
          <View style={styles.severityInfo}>
            <Text style={[styles.severityLabel, { color: SEVERITY_COLOR(overview.avg_severity) }]}>
              {SEVERITY_LABEL(overview.avg_severity)}
            </Text>
            <Text style={styles.severitySubtitle}>across all reports</Text>
          </View>
          <View style={styles.costBox}>
            <Text style={styles.costLabel}>Est. Total Cost</Text>
            <Text style={styles.costValue}>
              ₹{overview.total_estimated_cost >= 100000
                ? `${(overview.total_estimated_cost / 100000).toFixed(1)}L`
                : overview.total_estimated_cost.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Hazard Type Breakdown */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>By Hazard Type</Text>
        {Object.entries(by_hazard_type).map(([type, count]) => {
          const total = overview.total_reports || 1;
          const pct = Math.round((count / total) * 100);
          const typeColors: Record<string, string> = {
            pothole: Colors.pothole,
            broken_edge: Colors.broken_edge,
            waterlogging: Colors.waterlogging,
            missing_manhole: Colors.missing_manhole,
          };
          return (
            <View key={type} style={styles.barRow}>
              <View style={styles.barLabelBox}>
                <Text style={styles.barEmoji}>
                  {type === 'pothole' ? '🕳️' : type === 'broken_edge' ? '⚠️' : type === 'waterlogging' ? '🌊' : '🔲'}
                </Text>
                <Text style={styles.barLabel} numberOfLines={1}>
                  {HAZARD_LABELS[type] || type}
                </Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.max(pct, 2)}%`,
                      backgroundColor: typeColors[type] || Colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barCount}>{count}</Text>
            </View>
          );
        })}
      </View>

      {/* Status Breakdown */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>By Status</Text>
        <View style={styles.statusGrid}>
          {Object.entries(by_status).map(([status, count]) => {
            const statusColors: Record<string, string> = {
              reported: Colors.reported,
              verified: Colors.verified,
              in_progress: Colors.in_progress,
              resolved: Colors.resolved,
            };
            return (
              <View key={status} style={[styles.statusChip, { borderColor: statusColors[status] || '#ccc' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColors[status] || '#ccc' }]} />
                <Text style={styles.statusChipLabel}>{STATUS_LABELS[status] || status}</Text>
                <Text style={[styles.statusChipCount, { color: statusColors[status] || '#333' }]}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Severity Distribution */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Severity Distribution</Text>
        <View style={styles.sevDistRow}>
          <SevBlock label="Low" count={severity_distribution.low} color={Colors.severityLow} />
          <SevBlock label="Medium" count={severity_distribution.medium} color={Colors.severityMedium} />
          <SevBlock label="High" count={severity_distribution.high} color={Colors.severityHigh} />
          <SevBlock label="Critical" count={severity_distribution.critical} color={Colors.severityCritical} />
        </View>
      </View>

      {/* Recent Reports */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Reports</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/map')}>
            <Text style={styles.viewAll}>View All →</Text>
          </TouchableOpacity>
        </View>
        {recent_reports.length === 0 ? (
          <Text style={styles.emptyText}>No reports yet. Be the first to report a hazard!</Text>
        ) : (
          recent_reports.map((report) => (
            <TouchableOpacity
              key={report.id}
              style={styles.recentItem}
              onPress={() => router.push(`/report-detail/${report.id}`)}
            >
              <View style={[styles.recentIcon, { backgroundColor: SEVERITY_COLOR(report.severity_score) + '20' }]}>
                <Text style={styles.recentEmoji}>
                  {report.hazard_type === 'pothole' ? '🕳️' : report.hazard_type === 'broken_edge' ? '⚠️' : report.hazard_type === 'waterlogging' ? '🌊' : '🔲'}
                </Text>
              </View>
              <View style={styles.recentInfo}>
                <Text style={styles.recentType}>{HAZARD_LABELS[report.hazard_type] || report.hazard_type}</Text>
                <Text style={styles.recentMeta}>
                  Severity: {report.severity_score.toFixed(1)} · {STATUS_LABELS[report.status] || report.status}
                </Text>
              </View>
              <View style={[styles.recentSeverity, { backgroundColor: SEVERITY_COLOR(report.severity_score) }]}>
                <Text style={styles.recentSevText}>{report.severity_score.toFixed(1)}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconBox, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SevBlock({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={styles.sevBlock}>
      <View style={[styles.sevDot, { backgroundColor: color }]} />
      <Text style={styles.sevBlockCount}>{count}</Text>
      <Text style={styles.sevBlockLabel}>{label}</Text>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  errorText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFF',
    fontWeight: '600',
  },

  // Banner
  banner: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bannerGreeting: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '700',
  },
  bannerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 2,
  },
  bannerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  bannerRate: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
  },
  bannerRateLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
      default: { elevation: 2 },
    }),
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Section Card
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
      default: { elevation: 2 },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  viewAll: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 12,
  },

  // Severity Row
  severityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  severityBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityValue: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 20,
  },
  severityInfo: {
    flex: 1,
  },
  severityLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  severitySubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  costBox: {
    alignItems: 'flex-end',
  },
  costLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  costValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  // Bar Chart
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  barLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 130,
    gap: 6,
  },
  barEmoji: {
    fontSize: 16,
  },
  barLabel: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  barCount: {
    width: 32,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  // Status Grid
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    minWidth: (SCREEN_WIDTH - 64) / 2 - 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusChipLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  statusChipCount: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Severity Distribution
  sevDistRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sevBlock: {
    alignItems: 'center',
    gap: 4,
  },
  sevDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  sevBlockCount: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  sevBlockLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },

  // Recent Reports
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  recentIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentEmoji: {
    fontSize: 20,
  },
  recentInfo: {
    flex: 1,
  },
  recentType: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  recentMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  recentSeverity: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentSevText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
