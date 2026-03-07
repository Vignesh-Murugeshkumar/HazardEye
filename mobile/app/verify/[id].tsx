import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCamera } from '../../hooks/useCamera';
import { reportsAPI } from '../../services/api';
import {
  Colors,
  HAZARD_LABELS,
  HAZARD_ICONS,
  SEVERITY_COLOR,
  API_BASE_URL,
} from '../../constants';

export default function VerifyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { image, takePhoto, clearImage } = useCamera();
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) fetchReport();
  }, [id]);

  async function fetchReport() {
    try {
      const res = await reportsAPI.get(id!);
      setReport(res.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load report');
      router.back();
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerify(type: 'repair_confirm' | 'repair_deny') {
    setIsSubmitting(true);
    try {
      await reportsAPI.verify(id!, type);
      Alert.alert(
        'Success',
        type === 'repair_confirm'
          ? 'Repair confirmed! +3 points 🎉'
          : 'Repair denial recorded. Thank you for verifying!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Verification failed';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
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

  const imageUrl = report.image_url ? `${API_BASE_URL}${report.image_url}` : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={40} color={Colors.primary} />
        <Text style={styles.headerTitle}>Verify Repair</Text>
        <Text style={styles.headerSubtitle}>
          Has this road hazard been properly repaired?
        </Text>
      </View>

      {/* Original Report */}
      <View style={styles.reportCard}>
        <Text style={styles.cardTitle}>Original Report</Text>
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.reportImage} />
        )}
        <View style={styles.reportInfo}>
          <Text style={styles.reportEmoji}>
            {HAZARD_ICONS[report.hazard_type] || '⚠️'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.reportHazard}>
              {HAZARD_LABELS[report.hazard_type] || report.hazard_type}
            </Text>
            <Text style={styles.reportAddress}>
              {report.address || 'Unknown location'}
            </Text>
          </View>
          <View
            style={[
              styles.severityBadge,
              { backgroundColor: SEVERITY_COLOR(report.severity_score) },
            ]}
          >
            <Text style={styles.severityText}>
              {report.severity_score.toFixed(1)}
            </Text>
          </View>
        </View>
      </View>

      {/* Photo Evidence */}
      <View style={styles.photoCard}>
        <Text style={styles.cardTitle}>📸 Take a Photo (Optional)</Text>
        <Text style={styles.photoHint}>
          Photo of the current road condition helps validate repairs
        </Text>

        {image ? (
          <View style={styles.photoPreview}>
            <Image source={{ uri: image.uri }} style={styles.previewImage} />
            <TouchableOpacity style={styles.clearPhoto} onPress={clearImage}>
              <Ionicons name="close-circle" size={28} color={Colors.error} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.takePhotoButton} onPress={takePhoto}>
            <Ionicons name="camera" size={24} color={Colors.primary} />
            <Text style={styles.takePhotoText}>Take Photo of Current State</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Verify Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={[styles.verifyButton, styles.confirmButton]}
          onPress={() => handleVerify('repair_confirm')}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={Colors.textLight} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color={Colors.textLight} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.verifyButtonTitle}>Yes, Properly Repaired</Text>
                <Text style={styles.verifyButtonDesc}>The hazard has been fixed</Text>
              </View>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.verifyButton, styles.denyButton]}
          onPress={() => handleVerify('repair_deny')}
          disabled={isSubmitting}
        >
          <Ionicons name="close-circle" size={24} color={Colors.textLight} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.verifyButtonTitle}>No, Not Repaired</Text>
            <Text style={styles.verifyButtonDesc}>The hazard still exists</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={18} color={Colors.info} />
        <Text style={styles.infoText}>
          Verification helps ensure repairs are genuine. You'll earn +3 points for verifying.
          3 confirmations mark a report as resolved. 3 denials revert it.
        </Text>
      </View>
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
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  // Report Card
  reportCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  reportImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginBottom: 12,
    resizeMode: 'cover',
  },
  reportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  reportHazard: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  reportAddress: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  severityBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  // Photo
  photoCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  photoHint: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  photoPreview: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
  clearPhoto: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  takePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 20,
  },
  takePhotoText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  // Actions
  actionsSection: {
    paddingHorizontal: 16,
    gap: 12,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 18,
  },
  confirmButton: {
    backgroundColor: Colors.success,
  },
  denyButton: {
    backgroundColor: Colors.error,
  },
  verifyButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  verifyButtonDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  // Info
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
