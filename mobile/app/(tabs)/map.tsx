import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useLocation } from '../../hooks/useLocation';
import { reportsAPI, hotspotsAPI, weatherAPI } from '../../services/api';
import {
  Colors,
  HAZARD_LABELS,
  HAZARD_ICONS,
  SEVERITY_COLOR,
  STATUS_LABELS,
} from '../../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HAZARD_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pothole', label: '🕳️ Pothole' },
  { key: 'broken_edge', label: '⚠️ Broken Edge' },
  { key: 'waterlogging', label: '🌊 Waterlogging' },
  { key: 'missing_manhole', label: '🔲 Manhole' },
];

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'reported', label: 'Reported' },
  { key: 'verified', label: 'Verified' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
];

interface ReportMarker {
  id: string;
  latitude: number;
  longitude: number;
  hazard_type: string;
  severity_score: number;
  status: string;
  address?: string;
  created_at: string;
}

interface HotspotMarker {
  id: string;
  latitude: number;
  longitude: number;
  risk_score: number;
  predicted_count: number;
}

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const { location, getCurrentLocation } = useLocation();
  const [reports, setReports] = useState<ReportMarker[]>([]);
  const [hotspots, setHotspots] = useState<HotspotMarker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hazardFilter, setHazardFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showHotspots, setShowHotspots] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportMarker | null>(null);

  const defaultRegion = {
    latitude: 19.076,
    longitude: 72.8777,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  useEffect(() => {
    initMap();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [hazardFilter, statusFilter]);

  async function initMap() {
    const loc = await getCurrentLocation();
    if (loc && mapRef.current?.animateToRegion) {
      mapRef.current.animateToRegion({
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
    await fetchReports();
    setIsLoading(false);
  }

  async function fetchReports() {
    try {
      const params: any = { page_size: 200 };
      if (hazardFilter !== 'all') params.hazard_type = hazardFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await reportsAPI.list(params);
      const items = response.data.reports || response.data || [];
      setReports(
        items.map((r: any) => ({
          id: r.id,
          latitude: r.latitude,
          longitude: r.longitude,
          hazard_type: r.hazard_type,
          severity_score: r.severity_score,
          status: r.status,
          address: r.address,
          created_at: r.created_at,
        }))
      );
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
  }

  async function fetchHotspots() {
    try {
      const response = await hotspotsAPI.get({});
      const features = response.data.features || [];
      setHotspots(
        features.map((f: any) => ({
          id: f.properties?.id || Math.random().toString(),
          latitude: f.geometry.coordinates[1],
          longitude: f.geometry.coordinates[0],
          risk_score: f.properties?.risk_score || 0.5,
          predicted_count: f.properties?.predicted_count || 0,
        }))
      );
    } catch (err) {
      console.error('Failed to fetch hotspots:', err);
    }
  }

  function toggleHotspots() {
    const newVal = !showHotspots;
    setShowHotspots(newVal);
    if (newVal && hotspots.length === 0) {
      fetchHotspots();
    }
  }

  function getMarkerColor(report: ReportMarker): string {
    return SEVERITY_COLOR(report.severity_score);
  }

  function centerOnUser() {
    if (location && mapRef.current?.animateToRegion) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      });
    }
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={defaultRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass
      >
        {/* Report Markers */}
        {reports.map((report) => (
          <Marker
            key={report.id}
            coordinate={{
              latitude: report.latitude,
              longitude: report.longitude,
            }}
            pinColor={getMarkerColor(report)}
            onPress={() => setSelectedReport(report)}
          >
            <View style={[styles.markerContainer, { borderColor: getMarkerColor(report) }]}>
              <Text style={styles.markerEmoji}>
                {HAZARD_ICONS[report.hazard_type] || '⚠️'}
              </Text>
            </View>
          </Marker>
        ))}

        {/* Hotspot Circles */}
        {showHotspots &&
          hotspots.map((hs) => (
            <Circle
              key={hs.id}
              center={{ latitude: hs.latitude, longitude: hs.longitude }}
              radius={300}
              strokeColor={`rgba(220, 53, 69, ${hs.risk_score})`}
              fillColor={`rgba(220, 53, 69, ${hs.risk_score * 0.25})`}
              strokeWidth={2}
            />
          ))}
      </MapView>

      {/* Top Overlay Controls */}
      <View style={styles.topOverlay}>
        {/* Filter Toggle */}
        <TouchableOpacity
          style={styles.overlayButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="filter" size={20} color={Colors.primary} />
          <Text style={styles.overlayButtonText}>Filter</Text>
        </TouchableOpacity>

        {/* Hotspot Toggle */}
        <TouchableOpacity
          style={[styles.overlayButton, showHotspots && styles.overlayButtonActive]}
          onPress={toggleHotspots}
        >
          <Ionicons
            name="flame"
            size={20}
            color={showHotspots ? Colors.textLight : Colors.error}
          />
          <Text
            style={[
              styles.overlayButtonText,
              showHotspots && styles.overlayButtonTextActive,
            ]}
          >
            Hotspots
          </Text>
        </TouchableOpacity>

        {/* Refresh */}
        <TouchableOpacity style={styles.overlayButton} onPress={fetchReports}>
          <Ionicons name="refresh" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterTitle}>Hazard Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {HAZARD_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, hazardFilter === f.key && styles.filterChipActive]}
                onPress={() => setHazardFilter(f.key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    hazardFilter === f.key && styles.filterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.filterTitle, { marginTop: 10 }]}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {STATUS_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
                onPress={() => setStatusFilter(f.key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === f.key && styles.filterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterCount}>
            Showing {reports.length} reports
          </Text>
        </View>
      )}

      {/* My Location FAB */}
      <TouchableOpacity style={styles.locationFab} onPress={centerOnUser}>
        <Ionicons name="navigate" size={22} color={Colors.primary} />
      </TouchableOpacity>

      {/* Accountability FAB */}
      <TouchableOpacity
        style={styles.accountabilityFab}
        onPress={() => router.push('/accountability')}
      >
        <Ionicons name="people" size={20} color={Colors.textLight} />
        <Text style={styles.fabText}>MLA</Text>
      </TouchableOpacity>

      {/* Selected Report Card */}
      {selectedReport && (
        <View style={styles.reportCard}>
          <TouchableOpacity
            style={styles.cardClose}
            onPress={() => setSelectedReport(null)}
          >
            <Ionicons name="close" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.cardHeader}>
            <Text style={styles.cardEmoji}>
              {HAZARD_ICONS[selectedReport.hazard_type] || '⚠️'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                {HAZARD_LABELS[selectedReport.hazard_type] || selectedReport.hazard_type}
              </Text>
              <Text style={styles.cardAddress}>
                {selectedReport.address || 'No address'}
              </Text>
            </View>
            <View
              style={[
                styles.cardSeverity,
                { backgroundColor: getMarkerColor(selectedReport) },
              ]}
            >
              <Text style={styles.cardSeverityText}>
                {selectedReport.severity_score.toFixed(1)}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    (Colors as any)[selectedReport.status] || Colors.textMuted,
                },
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {STATUS_LABELS[selectedReport.status] || selectedReport.status}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.cardViewButton}
              onPress={() => {
                setSelectedReport(null);
                router.push(`/report-detail/${selectedReport.id}`);
              }}
            >
              <Text style={styles.cardViewText}>View Details →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  // Markers
  markerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  markerEmoji: {
    fontSize: 18,
  },
  // Top Overlay
  topOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    gap: 8,
  },
  overlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  overlayButtonActive: {
    backgroundColor: Colors.error,
  },
  overlayButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  overlayButtonTextActive: {
    color: Colors.textLight,
  },
  // Filter Panel
  filterPanel: {
    position: 'absolute',
    top: 55,
    left: 10,
    right: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  filterTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.textLight,
    fontWeight: '600',
  },
  filterCount: {
    marginTop: 10,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  // FABs
  locationFab: {
    position: 'absolute',
    bottom: 180,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  accountabilityFab: {
    position: 'absolute',
    bottom: 120,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fabText: {
    color: Colors.textLight,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Report Card
  reportCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  cardClose: {
    position: 'absolute',
    top: 8,
    right: 10,
    zIndex: 1,
    padding: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  cardAddress: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardSeverity: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSeverityText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textLight,
  },
  cardViewButton: {
    paddingVertical: 4,
  },
  cardViewText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
