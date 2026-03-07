import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Platform } from 'react-native';
import { authAPI } from '../services/api';
import { useAuth } from './AuthContext';
import Constants from 'expo-constants';

// Lazy-import notifications to avoid crash in Expo Go SDK 54+
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;

// Only load notification modules on native (they crash Expo Go on SDK 53+)
if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');
  } catch {
    console.warn('expo-notifications not available');
  }
}

// Set handler only if module loaded successfully
if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // Silently ignore — Expo Go SDK 53+ doesn't support this
  }
}

interface NotificationContextType {
  expoPushToken: string | null;
  notification: any | null;
}

const NotificationContext = createContext<NotificationContextType>({
  expoPushToken: null,
  notification: null,
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<any | null>(null);
  const notificationListener = useRef<any>(undefined);
  const responseListener = useRef<any>(undefined);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!Notifications) return;

    registerForPushNotifications().then((token) => {
      if (token) setExpoPushToken(token);
    });

    try {
      notificationListener.current = Notifications.addNotificationReceivedListener((notif) => {
        setNotification(notif);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.reportId) {
          // Navigation handled by expo-router deep links
        }
      });
    } catch {
      // Push listeners not supported in Expo Go SDK 53+
    }

    return () => {
      if (notificationListener.current) {
        try { notificationListener.current.remove(); } catch {}
      }
      if (responseListener.current) {
        try { responseListener.current.remove(); } catch {}
      }
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && expoPushToken) {
      authAPI.updatePushToken(expoPushToken).catch(() => {});
    }
  }, [isAuthenticated, expoPushToken]);

  return (
    <NotificationContext.Provider value={{ expoPushToken, notification }}>
      {children}
    </NotificationContext.Provider>
  );
}

async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web' || !Notifications || !Device) {
    return null;
  }

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    // Pass projectId explicitly to avoid manifest lookup errors
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined as any
    );
    return tokenData.data;
  } catch (e) {
    console.warn('Push notification registration failed (expected in Expo Go):', e);
    return null;
  }
}

export function useNotifications() {
  return useContext(NotificationContext);
}
