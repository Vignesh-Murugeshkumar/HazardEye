import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { leaderboardAPI, reportsAPI } from '../../services/api';
import { Colors, POINTS_CONFIG } from '../../constants';

const BADGE_ICONS: Record<string, { icon: string; label: string; desc: string }> = {
  hazard_hunter: { icon: '🔍', label: 'Hazard Hunter', desc: '10+ reports submitted' },
  road_guardian: { icon: '🛡️', label: 'Road Guardian', desc: '5+ hazards resolved' },
  verification_hero: { icon: '✅', label: 'Verification Hero', desc: '20+ verifications cast' },
  top_reporter: { icon: '🏆', label: 'Top Reporter', desc: 'Top 10 on leaderboard' },
};

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [statsRes, reportsRes] = await Promise.all([
        leaderboardAPI.getMyStats(),
        reportsAPI.list({ page_size: 5 }),
      ]);
      setStats(statsRes.data);
      setRecentReports(reportsRes.data.reports || reportsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch profile data:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshUser();
    fetchData();
  }, []);

  function handleLogout() {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* User Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {user?.role === 'authority' ? '🏛️ Authority' : user?.role === 'admin' ? '⚙️ Admin' : '👤 Citizen'}
          </Text>
        </View>
        {user?.city && (
          <Text style={styles.userCity}>📍 {user.city}</Text>
        )}
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats?.total_points || user?.points || 0}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats?.reports_count || 0}</Text>
          <Text style={styles.statLabel}>Reports</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>#{stats?.rank || '-'}</Text>
          <Text style={styles.statLabel}>Rank</Text>
        </View>
      </View>

      {/* Badges Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏅 Badges</Text>
        {stats?.badges && stats.badges.length > 0 ? (
          <View style={styles.badgeGrid}>
            {stats.badges.map((badge: string) => {
              const info = BADGE_ICONS[badge];
              return (
                <View key={badge} style={styles.badgeCard}>
                  <Text style={styles.badgeIcon}>{info?.icon || '🏅'}</Text>
                  <Text style={styles.badgeLabel}>{info?.label || badge}</Text>
                  <Text style={styles.badgeDesc}>{info?.desc || ''}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyBadges}>
            <Text style={styles.emptyBadgeText}>
              Keep reporting hazards to earn badges! 💪
            </Text>
          </View>
        )}

        {/* All available badges */}
        <Text style={styles.allBadgesTitle}>Available Badges</Text>
        {Object.entries(BADGE_ICONS).map(([key, info]) => {
          const earned = stats?.badges?.includes(key);
          return (
            <View key={key} style={[styles.badgeRow, !earned && styles.badgeRowLocked]}>
              <Text style={styles.badgeRowIcon}>{earned ? info.icon : '🔒'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.badgeRowLabel, !earned && styles.badgeRowLocked]}>
                  {info.label}
                </Text>
                <Text style={styles.badgeRowDesc}>{info.desc}</Text>
              </View>
              {earned && <Ionicons name="checkmark-circle" size={20} color={Colors.success} />}
            </View>
          );
        })}
      </View>

      {/* Points Guide */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Points Guide</Text>
        <View style={styles.pointsGrid}>
          {Object.entries(POINTS_CONFIG).map(([key, pts]) => (
            <View key={key} style={styles.pointItem}>
              <Text style={styles.pointValue}>+{pts}</Text>
              <Text style={styles.pointAction}>
                {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/accountability')}>
          <Ionicons name="people" size={22} color={Colors.primary} />
          <Text style={styles.menuText}>MLA Accountability Dashboard</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
          <Ionicons name="log-out" size={22} color={Colors.error} />
          <Text style={[styles.menuText, { color: Colors.error }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.versionText}>HazardEye v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Header
  header: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  userEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  roleBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 14,
  },
  roleText: {
    color: Colors.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  userCity: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 6,
  },
  // Stats
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // Section
  section: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  // Badges
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  badgeCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: '47%',
  },
  badgeIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  badgeDesc: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  emptyBadges: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyBadgeText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  allBadgesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  badgeRowLocked: {
    opacity: 0.5,
  },
  badgeRowIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  badgeRowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  badgeRowDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  // Points Guide
  pointsGrid: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  pointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pointValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    width: 50,
  },
  pointAction: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  // Menu
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    marginLeft: 12,
  },
  logoutItem: {
    marginTop: 4,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textMuted,
    marginVertical: 20,
  },
});
