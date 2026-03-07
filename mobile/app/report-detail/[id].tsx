import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { reportsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Colors,
  HAZARD_LABELS,
  HAZARD_ICONS,
  STATUS_LABELS,
  ROAD_CLASS_LABELS,
  SEVERITY_LABEL,
  SEVERITY_COLOR,
  API_BASE_URL,
} from '../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [report, setReport] = useState<any>(null);
  const [verifications, setVerifications] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) fetchReport();
  }, [id]);

  async function fetchReport() {
    try {
      const [reportRes, verRes] = await Promise.all([
        reportsAPI.get(id!),
        reportsAPI.getVerifications(id!),
      ]);
      setReport(reportRes.data);
      setVerifications(verRes.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load report');
      router.back();
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerify(type: string) {
    try {
      await reportsAPI.verify(id!, type);
      Alert.alert('Success', 'Verification submitted! +3 points');
      fetchReport();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Verification failed';
      Alert.alert('Error', msg);
    }
  }

  async function handleStatusUpdate(status: string) {
    try {
      await reportsAPI.updateStatus(id!, status);
      Alert.alert('Success', `Status updated to ${status}`);
      fetchReport();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Status update failed';
      Alert.alert('Error', msg);
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!report) return null;

  const sevColor = SEVERITY_COLOR(report.severity_score);
  const imageUrl = report.image_url
    ? `${API_BASE_URL}${report.image_url}`
    : null;

  return (
    <ScrollView style={styles.container}>
      {/* Image */}
      {imageUrl && (
        <Image source={{ uri: imageUrl }} style={styles.image} />
      )}

      {/* Severity Header */}
      <View style={[styles.severityHeader, { backgroundColor: sevColor }]}>
        <View style={styles.severityLeft}>
          <Text style={styles.severityScore}>{report.severity_score.toFixed(1)}</Text>
          <Text style={styles.severityLabel}>{SEVERITY_LABEL(report.severity_score)}</Text>
        </View>
        <View style={styles.severityRight}>
          <Text style={styles.hazardEmoji}>{HAZARD_ICONS[report.hazard_type] || '⚠️'}</Text>
          <Text style={styles.hazardLabel}>
            {HAZARD_LABELS[report.hazard_type] || report.hazard_type}
          </Text>
        </View>
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, { backgroundColor: (Colors as any)[report.status] || Colors.textMuted }]} />
        <Text style={styles.statusText}>
          {STATUS_LABELS[report.status] || report.status}
        </Text>
        <Text style={styles.dateText}>
          {new Date(report.created_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      {/* Details */}
      <View style={styles.detailsCard}>
        <DetailRow icon="location" label="Location" value={report.address || `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`} />
        <DetailRow icon="car" label="Road Type" value={ROAD_CLASS_LABELS[report.road_classification] || report.road_classification} />
        <DetailRow icon="analytics" label="AI Confidence" value={`${(report.ai_confidence * 100).toFixed(0)}%`} />
        <DetailRow icon="cash" label="Est. Repair Cost" value={`₹${report.estimated_repair_cost?.toLocaleString('en-IN') || 'N/A'}`} />
        {report.constituency_name && (
          <DetailRow icon="business" label="Constituency" value={report.constituency_name} />
        )}
        {report.weather_at_report && (
          <DetailRow icon="cloudy" label="Weather" value={`${report.weather_at_report.condition}, ${report.weather_at_report.temperature}°C`} />
        )}
        {report.description && (
          <DetailRow icon="chatbox" label="Description" value={report.description} />
        )}
      </View>

      {/* Mini Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.miniMap}
          initialRegion={{
            latitude: report.latitude,
            longitude: report.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          <Marker coordinate={{ latitude: report.latitude, longitude: report.longitude }}>
            <View style={[styles.mapMarker, { borderColor: sevColor }]}>
              <Text>{HAZARD_ICONS[report.hazard_type] || '⚠️'}</Text>
            </View>
          </Marker>
        </MapView>
      </View>

      {/* Verification Summary */}
      {verifications && (
        <View style={styles.verificationCard}>
          <Text style={styles.cardTitle}>Community Verification</Text>
          <View style={styles.verifyStatsRow}>
            <View style={styles.verifyStat}>
              <Text style={styles.verifyStatNum}>{verifications.upvote_count || 0}</Text>
              <Text style={styles.verifyStatLabel}>Upvotes</Text>
            </View>
            <View style={styles.verifyStat}>
              <Text style={[styles.verifyStatNum, { color: Colors.success }]}>
                {verifications.repair_confirm_count || 0}
              </Text>
              <Text style={styles.verifyStatLabel}>Repair Confirmed</Text>
            </View>
            <View style={styles.verifyStat}>
              <Text style={[styles.verifyStatNum, { color: Colors.error }]}>
                {verifications.repair_deny_count || 0}
              </Text>
              <Text style={styles.verifyStatLabel}>Denied</Text>
            </View>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsCard}>
        {/* Citizen actions: upvote */}
        {user?.role === 'citizen' && report.reporter_id !== user.id && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleVerify('upvote')}
            >
              <Ionicons name="thumbs-up" size={20} color={Colors.textLight} />
              <Text style={styles.actionButtonText}>Confirm Hazard</Text>
            </TouchableOpacity>

            {report.status === 'resolved_unverified' && (
              <View style={styles.repairActions}>
                <TouchableOpacity
                  style={[styles.repairButton, { backgroundColor: Colors.success }]}
                  onPress={() => handleVerify('repair_confirm')}
                >
                  <Text style={styles.repairButtonText}>✓ Repair Done</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.repairButton, { backgroundColor: Colors.error }]}
                  onPress={() => handleVerify('repair_deny')}
                >
                  <Text style={styles.repairButtonText}>✗ Not Repaired</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Authority actions */}
        {user?.role === 'authority' && report.status !== 'resolved' && (
          <View style={styles.authorityActions}>
            {report.status === 'reported' || report.status === 'verified' ? (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: Colors.info }]}
                onPress={() => handleStatusUpdate('in_progress')}
              >
                <Ionicons name="construct" size={20} color={Colors.textLight} />
                <Text style={styles.actionButtonText}>Mark In Progress</Text>
              </TouchableOpacity>
            ) : null}
            {report.status === 'in_progress' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: Colors.success }]}
                onPress={() => handleStatusUpdate('resolved')}
              >
                <Ionicons name="checkmark-circle" size={20} color={Colors.textLight} />
                <Text style={styles.actionButtonText}>Mark Resolved</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon as any} size={18} color={Colors.primary} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
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
  image: {
    width: '100%',
    height: 240,
    resizeMode: 'cover',
  },
  // Severity Header
  severityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  severityLeft: {
    alignItems: 'center',
  },
  severityScore: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  severityLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  severityRight: {
    alignItems: 'center',
  },
  hazardEmoji: {
    fontSize: 36,
  },
  hazardLabel: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '600',
    marginTop: 4,
  },
  // Status
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  // Details
  detailsCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 10,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    maxWidth: '50%',
    textAlign: 'right',
  },
  // Map
  mapContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    height: 150,
  },
  miniMap: {
    width: '100%',
    height: '100%',
  },
  mapMarker: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 4,
    borderWidth: 2,
  },
  // Verifications
  verificationCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  verifyStatsRow: {
    flexDirection: 'row',
  },
  verifyStat: {
    flex: 1,
    alignItems: 'center',
  },
  verifyStatNum: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  verifyStatLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  // Actions
  actionsCard: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  repairActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  repairButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  repairButtonText: {
    color: Colors.textLight,
    fontSize: 14,
    fontWeight: 'bold',
  },
  authorityActions: {
    gap: 8,
  },
});
