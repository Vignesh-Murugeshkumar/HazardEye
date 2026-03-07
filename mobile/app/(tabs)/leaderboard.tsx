import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { leaderboardAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants';

type Period = 'weekly' | 'monthly' | 'alltime';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  points: number;
  reports_count: number;
  city?: string;
}

interface MyStats {
  rank: number;
  total_points: number;
  reports_count: number;
  badges: string[];
}

const BADGE_ICONS: Record<string, { icon: string; label: string }> = {
  hazard_hunter: { icon: '🔍', label: 'Hazard Hunter' },
  road_guardian: { icon: '🛡️', label: 'Road Guardian' },
  verification_hero: { icon: '✅', label: 'Verification Hero' },
  top_reporter: { icon: '🏆', label: 'Top Reporter' },
};

const PODIUM_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']; // Gold, Silver, Bronze

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('monthly');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myStats, setMyStats] = useState<MyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [period]);

  async function fetchAll() {
    try {
      const [lbResponse, statsResponse] = await Promise.all([
        leaderboardAPI.get({ period, limit: 50 }),
        leaderboardAPI.getMyStats(),
      ]);
      setEntries(lbResponse.data.entries || []);
      setMyStats(statsResponse.data);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll();
  }, [period]);

  function renderPodium() {
    const top3 = entries.slice(0, 3);
    if (top3.length === 0) return null;

    // Re-order for visual: 2nd, 1st, 3rd
    const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
    const heights = [90, 120, 70];
    const orderMap = top3.length >= 3 ? [1, 0, 2] : [0, 1, 2];

    return (
      <View style={styles.podiumContainer}>
        {podiumOrder.map((entry, idx) => {
          const originalIdx = orderMap[idx];
          if (!entry) return null;
          return (
            <View key={entry.user_id} style={styles.podiumItem}>
              <Text style={styles.podiumName} numberOfLines={1}>
                {entry.name}
              </Text>
              <Text style={styles.podiumPoints}>{entry.points} pts</Text>
              <View
                style={[
                  styles.podiumBar,
                  {
                    height: heights[originalIdx] || 70,
                    backgroundColor: PODIUM_COLORS[originalIdx] || Colors.textMuted,
                  },
                ]}
              >
                <Text style={styles.podiumRank}>#{entry.rank}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  function renderEntry({ item }: { item: LeaderboardEntry }) {
    const isMe = item.user_id === user?.id;
    return (
      <View style={[styles.entryRow, isMe && styles.entryRowMe]}>
        <Text style={[styles.entryRank, isMe && styles.entryTextMe]}>#{item.rank}</Text>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.entryName, isMe && styles.entryTextMe]}>
            {item.name} {isMe ? '(You)' : ''}
          </Text>
          <Text style={styles.entryMeta}>
            {item.reports_count} reports • {item.city || 'India'}
          </Text>
        </View>
        <Text style={[styles.entryPoints, isMe && styles.entryTextMe]}>
          {item.points}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Period Tabs */}
      <View style={styles.periodTabs}>
        {(['weekly', 'monthly', 'alltime'] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodTab, period === p && styles.periodTabActive]}
            onPress={() => setPeriod(p)}
          >
            <Text
              style={[styles.periodTabText, period === p && styles.periodTabTextActive]}
            >
              {p === 'alltime' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={entries.slice(3)} // Rest after podium
          keyExtractor={(item) => item.user_id}
          renderItem={renderEntry}
          ListHeaderComponent={
            <>
              {renderPodium()}

              {/* My Stats Card */}
              {myStats && (
                <View style={styles.myStatsCard}>
                  <View style={styles.myStatsHeader}>
                    <Ionicons name="person-circle" size={36} color={Colors.primary} />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.myStatsName}>{user?.name}</Text>
                      <Text style={styles.myStatsRank}>Rank #{myStats.rank}</Text>
                    </View>
                    <View style={styles.myStatsPoints}>
                      <Text style={styles.myStatsPointsNum}>{myStats.total_points}</Text>
                      <Text style={styles.myStatsPointsLabel}>points</Text>
                    </View>
                  </View>

                  {/* Badges */}
                  {myStats.badges.length > 0 && (
                    <View style={styles.badgesRow}>
                      {myStats.badges.map((badge) => {
                        const info = BADGE_ICONS[badge];
                        return (
                          <View key={badge} style={styles.badge}>
                            <Text style={styles.badgeIcon}>{info?.icon || '🏅'}</Text>
                            <Text style={styles.badgeLabel}>
                              {info?.label || badge}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {entries.length > 3 && (
                <Text style={styles.restTitle}>Rest of Leaderboard</Text>
              )}
            </>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No leaderboard data yet</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Period Tabs
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  periodTabActive: {
    backgroundColor: Colors.primary,
  },
  periodTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  periodTabTextActive: {
    color: Colors.textLight,
  },
  // Podium
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
  },
  podiumItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  podiumPoints: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  podiumBar: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRank: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  // My Stats
  myStatsCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  myStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  myStatsName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  myStatsRank: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  myStatsPoints: {
    alignItems: 'center',
  },
  myStatsPointsNum: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  myStatsPointsLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  badgesRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  badgeIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  // Rest of leaderboard
  restTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 10,
    padding: 12,
  },
  entryRowMe: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  entryRank: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    width: 36,
  },
  entryName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  entryTextMe: {
    color: Colors.primaryDark,
  },
  entryMeta: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  entryPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  // Loading & Empty
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 40,
  },
});
