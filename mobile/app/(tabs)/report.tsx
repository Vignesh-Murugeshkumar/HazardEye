import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCamera } from '../../hooks/useCamera';
import { useLocation } from '../../hooks/useLocation';
import { reportsAPI } from '../../services/api';
import {
  Colors,
  HAZARD_LABELS,
  ROAD_CLASS_LABELS,
  SEVERITY_LABEL,
  SEVERITY_COLOR,
  HAZARD_ICONS,
} from '../../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Step = 'capture' | 'details' | 'analyzing' | 'result';

interface AnalysisResult {
  id: string;
  hazard_type: string;
  severity_score: number;
  confidence: number;
  estimated_repair_cost: number;
  address: string;
  constituency_name?: string;
  weather?: { condition: string; temperature: number };
  points_earned: number;
}

export default function ReportScreen() {
  const { image, takePhoto, pickImage, clearImage } = useCamera();
  const { location, getCurrentLocation, reverseGeocode, isLoading: locLoading } = useLocation();
  const [step, setStep] = useState<Step>('capture');
  const [roadClass, setRoadClass] = useState('urban_road');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [address, setAddress] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Start analyzing animation
  function startPulse() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }

  async function handleCapture() {
    const photo = await takePhoto();
    if (photo) {
      const loc = await getCurrentLocation();
      if (loc) {
        const addr = await reverseGeocode(loc.latitude, loc.longitude);
        setAddress(addr);
      }
      setStep('details');
    }
  }

  async function handlePickGallery() {
    const photo = await pickImage();
    if (photo) {
      const loc = await getCurrentLocation();
      if (loc) {
        const addr = await reverseGeocode(loc.latitude, loc.longitude);
        setAddress(addr);
      }
      setStep('details');
    }
  }

  async function handleSubmit() {
    if (!image || !location) {
      Alert.alert('Error', 'Photo and location are required');
      return;
    }

    setStep('analyzing');
    setIsSubmitting(true);
    startPulse();

    try {
      const formData = new FormData();

      // On web, fetch the image URI and convert to a real File/Blob.
      // On native, use the React Native {uri, name, type} convention.
      if (Platform.OS === 'web') {
        const response = await fetch(image.uri);
        const blob = await response.blob();
        const fileName = image.fileName || 'hazard.jpg';
        const file = new File([blob], fileName, { type: image.type || 'image/jpeg' });
        formData.append('image', file);
      } else {
        formData.append('image', {
          uri: image.uri,
          name: image.fileName || 'hazard.jpg',
          type: image.type || 'image/jpeg',
        } as any);
      }
      formData.append('latitude', location.latitude.toString());
      formData.append('longitude', location.longitude.toString());
      formData.append('road_classification', roadClass);
      if (description.trim()) {
        formData.append('description', description.trim());
      }

      const response = await reportsAPI.create(formData);
      setResult({
        id: response.data.id,
        hazard_type: response.data.hazard_type,
        severity_score: response.data.severity_score,
        confidence: response.data.ai_confidence,
        estimated_repair_cost: response.data.estimated_repair_cost,
        address: response.data.address || address,
        constituency_name: response.data.constituency_name,
        weather: response.data.weather_at_report,
        points_earned: 5,
      });
      setStep('result');
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to submit report. Please try again.';
      Alert.alert('Submission Failed', msg);
      setStep('details');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    clearImage();
    setStep('capture');
    setRoadClass('urban_road');
    setDescription('');
    setResult(null);
    setAddress('');
  }

  // =========================================
  // STEP 1: Capture
  // =========================================
  if (step === 'capture') {
    return (
      <View style={styles.container}>
        <View style={styles.captureSection}>
          <View style={styles.cameraPlaceholder}>
            <Ionicons name="camera" size={80} color={Colors.textMuted} />
            <Text style={styles.captureTitle}>Report a Road Hazard</Text>
            <Text style={styles.captureSubtitle}>
              Take a clear photo of the hazard.{'\n'}Our AI will analyze it automatically.
            </Text>
          </View>

          <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
            <Ionicons name="camera" size={28} color={Colors.textLight} />
            <Text style={styles.captureButtonText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.galleryButton} onPress={handlePickGallery}>
            <Ionicons name="images" size={22} color={Colors.primary} />
            <Text style={styles.galleryButtonText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>📸 Photo Tips</Text>
          <Text style={styles.tipItem}>• Capture the full hazard area</Text>
          <Text style={styles.tipItem}>• Include surrounding road surface</Text>
          <Text style={styles.tipItem}>• Ensure good lighting</Text>
          <Text style={styles.tipItem}>• Take from standing height</Text>
        </View>
      </View>
    );
  }

  // =========================================
  // STEP 2: Details
  // =========================================
  if (step === 'details') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Image Preview */}
        {image && (
          <View style={styles.imagePreview}>
            <Image source={{ uri: image.uri }} style={styles.previewImage} />
            <TouchableOpacity style={styles.retakeButton} onPress={handleReset}>
              <Ionicons name="refresh" size={18} color={Colors.textLight} />
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Location */}
        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Ionicons name="location" size={20} color={Colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>
                {locLoading ? 'Getting location...' : address || 'Location captured'}
              </Text>
            </View>
          </View>
        </View>

        {/* Road Classification */}
        <View style={styles.detailCard}>
          <Text style={styles.sectionTitle}>Road Type</Text>
          <View style={styles.chipRow}>
            {Object.entries(ROAD_CLASS_LABELS).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.chip, roadClass === key && styles.chipActive]}
                onPress={() => setRoadClass(key)}
              >
                <Text style={[styles.chipText, roadClass === key && styles.chipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Ionicons name="cloud-upload" size={22} color={Colors.textLight} />
          <Text style={styles.submitButtonText}>Analyze & Submit</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // =========================================
  // STEP 3: Analyzing
  // =========================================
  if (step === 'analyzing') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Animated.View style={[styles.analyzeCircle, { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons name="eye" size={48} color={Colors.primary} />
        </Animated.View>
        <Text style={styles.analyzingTitle}>AI Analyzing...</Text>
        <Text style={styles.analyzingSubtitle}>
          Detecting hazard type & calculating severity
        </Text>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      </View>
    );
  }

  // =========================================
  // STEP 4: Result
  // =========================================
  if (step === 'result' && result) {
    const sevColor = SEVERITY_COLOR(result.severity_score);

    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Success Header */}
        <View style={[styles.resultHeader, { backgroundColor: sevColor }]}>
          <Ionicons name="checkmark-circle" size={48} color={Colors.textLight} />
          <Text style={styles.resultTitle}>Report Submitted!</Text>
          <Text style={styles.resultPoints}>+{result.points_earned} points earned 🎉</Text>
        </View>

        {/* Detection Result */}
        <View style={styles.resultCard}>
          <Text style={styles.sectionTitle}>AI Detection</Text>
          <View style={styles.resultRow}>
            <Text style={styles.resultEmoji}>
              {HAZARD_ICONS[result.hazard_type] || '⚠️'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultHazard}>
                {HAZARD_LABELS[result.hazard_type] || result.hazard_type}
              </Text>
              <Text style={styles.resultConfidence}>
                {(result.confidence * 100).toFixed(0)}% confidence
              </Text>
            </View>
          </View>
        </View>

        {/* Severity Gauge */}
        <View style={styles.resultCard}>
          <Text style={styles.sectionTitle}>Severity Score</Text>
          <View style={styles.severityRow}>
            <View style={[styles.severityBadge, { backgroundColor: sevColor }]}>
              <Text style={styles.severityNumber}>{result.severity_score.toFixed(1)}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={[styles.severityLabel, { color: sevColor }]}>
                {SEVERITY_LABEL(result.severity_score)}
              </Text>
              <View style={styles.severityBar}>
                <View
                  style={[
                    styles.severityFill,
                    { width: `${result.severity_score * 10}%`, backgroundColor: sevColor },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Cost Estimate */}
        <View style={styles.resultCard}>
          <Text style={styles.sectionTitle}>Estimated Repair Cost</Text>
          <Text style={styles.costText}>
            ₹{result.estimated_repair_cost?.toLocaleString('en-IN') || 'N/A'}
          </Text>
        </View>

        {/* Location Info */}
        <View style={styles.resultCard}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.resultDetail}>{result.address}</Text>
          {result.constituency_name && (
            <Text style={styles.resultSubDetail}>
              Constituency: {result.constituency_name}
            </Text>
          )}
          {result.weather && (
            <Text style={styles.resultSubDetail}>
              Weather: {result.weather.condition}, {result.weather.temperature}°C
            </Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.resultActions}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => router.push(`/report-detail/${result.id}`)}
          >
            <Text style={styles.viewButtonText}>View Report</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.newReportButton} onPress={handleReset}>
            <Ionicons name="camera" size={20} color={Colors.primary} />
            <Text style={styles.newReportText}>Report Another</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return null;
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
  // Capture Step
  captureSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  cameraPlaceholder: {
    alignItems: 'center',
    marginBottom: 30,
  },
  captureTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 16,
  },
  captureSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  captureButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12,
  },
  captureButtonText: {
    color: Colors.textLight,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  galleryButton: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  galleryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tipsCard: {
    margin: 24,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  tipItem: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  // Details Step
  imagePreview: {
    position: 'relative',
    width: '100%',
    height: 220,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  retakeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'center',
  },
  retakeText: {
    color: Colors.textLight,
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  detailCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.textLight,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: Colors.textLight,
    fontSize: 17,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Analyzing Step
  analyzeCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  analyzingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  analyzingSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  // Result Step
  resultHeader: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textLight,
    marginTop: 8,
  },
  resultPoints: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultEmoji: {
    fontSize: 36,
    marginRight: 14,
  },
  resultHazard: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  resultConfidence: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  severityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  severityLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  severityBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
  },
  severityFill: {
    height: '100%',
    borderRadius: 4,
  },
  costText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  resultDetail: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  resultSubDetail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  resultActions: {
    padding: 16,
    gap: 10,
  },
  viewButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  viewButtonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  newReportButton: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  newReportText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
