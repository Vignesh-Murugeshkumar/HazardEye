import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { constituenciesAPI } from '../services/api';
import { Colors, SEVERITY_COLOR } from '../constants';

interface Constituency {
  id: string;
  name: string;
  type: string;
  city: string;
  representative_name?: string;
  total_reports: number;
  unresolved_reports: number;
  avg_resolution_days?: number;
  avg_severity?: number;
}

const SORT_OPTIONS = [
  { key: 'unresolved', label: 'Most Unresolved' },
  { key: 'resolution_time', label: 'Slowest Response' },
  { key: 'name', label: 'Name' },
];

const CITY_FILTERS = ['All', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad'];

export default function AccountabilityScreen() {
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [sortBy, setSortBy] = useState('unresolved');
  const [cityFilter, setCityFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchConstituencies();
  }, [sortBy, cityFilter]);

  async function fetchConstituencies() {
    try {
      const params: any = { sort_by: sortBy };
      if (cityFilter !== 'All') params.city = cityFilter;

      const response = await constituenciesAPI.list(params);
      setConstituencies(response.data || []);
    } catch (err) {
      console.error('Failed to fetch constituencies:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }

  function getGradeColor(unresolved: number, total: number): string {
    if (total === 0) return Colors.textMuted;
    const ratio = unresolved / total;
    if (ratio <= 0.2) return Colors.success;
    if (ratio <= 0.5) return Colors.warning;
    return Colors.error;
  }

  function getGrade(unresolved: number, total: number): string {
    if (total === 0) return 'N/A';
    const ratio = unresolved / total;
    if (ratio <= 0.1) return 'A+';
    if (ratio <= 0.2) return 'A';
    if (ratio <= 0.35) return 'B';
    if (ratio <= 0.5) return 'C';
    if (ratio <= 0.7) return 'D';
    return 'F';
  }

  function renderConstituency({ item }: { item: Constituency }) {
    const grade = getGrade(item.unresolved_reports, item.total_reports);
    const gradeColor = getGradeColor(item.unresolved_reports, item.total_reports);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/report-detail/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardCity}>
              {item.city} • {item.type === 'mla' ? 'MLA' : 'Ward'}
            </Text>
            {item.representative_name && (
              <Text style={styles.cardRep}>
                Rep: {item.representative_name}
              </Text>
            )}
          </View>

          {/* Grade Badge */}
          <View style={[styles.gradeBadge, { backgroundColor: gradeColor }]}>
            <Text style={styles.gradeText}>{grade}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{item.total_reports}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statItem, styles.statDivider]}>
            <Text style={[styles.statNumber, { color: Colors.error }]}>
              {item.unresolved_reports}
            </Text>
            <Text style={styles.statLabel}>Unresolved</Text>
          </View>
          <View style={[styles.statItem, styles.statDivider]}>
            <Text style={styles.statNumber}>
              {item.avg_resolution_days
                ? `${item.avg_resolution_days.toFixed(0)}d`
                : 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Avg Response</Text>
          </View>
          <View style={[styles.statItem, styles.statDivider]}>
            <Text
              style={[
                styles.statNumber,
                {
                  color: item.avg_severity
                    ? SEVERITY_COLOR(item.avg_severity)
                    : Colors.textMuted,
                },
              ]}
            >
              {item.avg_severity ? item.avg_severity.toFixed(1) : 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Avg Severity</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: item.total_reports
                    ? `${((item.total_reports - item.unresolved_reports) / item.total_reports) * 100}%`
                    : '0%',
                  backgroundColor: Colors.success,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {item.total_reports
              ? (
                  ((item.total_reports - item.unresolved_reports) / item.total_reports) *
                  100
                ).toFixed(0)
              : 0}
            % resolved
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* City Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.cityFilterRow}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {CITY_FILTERS.map((city) => (
          <TouchableOpacity
            key={city}
            style={[styles.cityChip, cityFilter === city && styles.cityChipActive]}
            onPress={() => setCityFilter(city)}
          >
            <Text
              style={[
                styles.cityChipText,
                cityFilter === city && styles.cityChipTextActive,
              ]}
            >
              {city}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sort Options */}
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        {SORT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.sortChip, sortBy === opt.key && styles.sortChipActive]}
            onPress={() => setSortBy(opt.key)}
          >
            <Text
              style={[
                styles.sortChipText,
                sortBy === opt.key && styles.sortChipTextActive,
              ]}
            >
              {opt.label}
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
          data={constituencies}
          keyExtractor={(item) => item.id}
          renderItem={renderConstituency}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchConstituencies();
              }}
            />
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No constituency data available</Text>
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
  // City Filter
  cityFilterRow: {
    backgroundColor: Colors.surface,
    paddingVertical: 10,
  },
  cityChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: Colors.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cityChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  cityChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  cityChipTextActive: {
    color: Colors.textLight,
    fontWeight: '600',
  },
  // Sort
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  sortLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginRight: 4,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sortChipActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  sortChipText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  sortChipTextActive: {
    color: Colors.textLight,
    fontWeight: '600',
  },
  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  cardCity: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardRep: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  gradeBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    borderLeftWidth: 1,
    borderLeftColor: '#E8E8E8',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E8E8E8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    minWidth: 70,
    textAlign: 'right',
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
