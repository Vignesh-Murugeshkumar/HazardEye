// HazardEye Design Constants

export const Colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryLight: '#FF8F65',
  secondary: '#2D2D2D',
  secondaryLight: '#4A4A4A',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  error: '#DC3545',
  success: '#28A745',
  warning: '#FFC107',
  info: '#17A2B8',

  // Severity colors
  severityLow: '#28A745',     // 1-3: Green
  severityMedium: '#FFC107',  // 4-6: Yellow
  severityHigh: '#FF8C00',    // 7-8: Orange
  severityCritical: '#DC3545', // 9-10: Red

  // Text
  textPrimary: '#2D2D2D',
  textSecondary: '#6C757D',
  textLight: '#FFFFFF',
  textMuted: '#ADB5BD',

  // Hazard type colors
  pothole: '#DC3545',
  broken_edge: '#FF8C00',
  waterlogging: '#17A2B8',
  missing_manhole: '#6F42C1',

  // Status colors
  reported: '#FFC107',
  verified: '#17A2B8',
  in_progress: '#FF8C00',
  resolved: '#28A745',
  resolved_unverified: '#6C757D',
};

import { Platform } from 'react-native';

// Auto-detect API URL: web uses localhost, mobile uses LAN IP
const getApiBaseUrl = () => {
  if (!__DEV__) return 'https://api.hazardeye.app';
  // On web, localhost works. On mobile (Expo Go), use your machine's LAN IP.
  if (Platform.OS === 'web') return 'http://localhost:8000';
  return 'http://192.168.1.8:8000'; // Your LAN IP
};

export const API_BASE_URL = getApiBaseUrl();

export const GOOGLE_MAPS_API_KEY = 'AIzaSyBQCYbPHRMO8wdWjBucSZtwMj3XmfX1oVo';

export const HAZARD_LABELS: Record<string, string> = {
  pothole: 'Pothole',
  broken_edge: 'Broken Road Edge',
  waterlogging: 'Waterlogging',
  missing_manhole: 'Missing Manhole Cover',
};

export const ROAD_CLASS_LABELS: Record<string, string> = {
  national_highway: 'National Highway',
  state_highway: 'State Highway',
  urban_road: 'Urban Road',
  rural_road: 'Rural Road',
};

export const STATUS_LABELS: Record<string, string> = {
  reported: 'Reported',
  verified: 'Verified',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  resolved_unverified: 'Pending Verification',
};

export const SEVERITY_LABEL = (score: number): string => {
  if (score <= 3) return 'Low';
  if (score <= 6) return 'Medium';
  if (score <= 8) return 'High';
  return 'Critical';
};

export const SEVERITY_COLOR = (score: number): string => {
  if (score <= 3) return Colors.severityLow;
  if (score <= 6) return Colors.severityMedium;
  if (score <= 8) return Colors.severityHigh;
  return Colors.severityCritical;
};

export const HAZARD_ICONS: Record<string, string> = {
  pothole: '🕳️',
  broken_edge: '⚠️',
  waterlogging: '🌊',
  missing_manhole: '🔲',
};

export const POINTS_CONFIG = {
  report_submitted: 5,
  report_verified: 15,
  report_resolved: 25,
  verification_cast: 3,
};
