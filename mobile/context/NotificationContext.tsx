import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { authAPI } from '../services/api';
import { useAuth } from './AuthContext';
import Constants from 'expo-constants';

interface NotificationContextType {
  expoPushToken: string | null;
  notification: any | null;
}

const NotificationContext = createContext<NotificationContextType>({
  expoPushToken: null,
  notification: null,
});

// Detect Expo Go — push notifications were removed from Expo Go in SDK 53+
const canUseNotifications =
  Platform.OS !== 'web' &&
  Constants.executionEnvironment !== 'storeClient' &&
  !isRunningInExpoGo();

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<any | null>(null);
  const notificationListener = useRef<any>(undefined);
  const responseListener = useRef<any>(undefined);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!canUseNotifications) return;

    // Dynamically import notification helpers only in dev builds
    let cancelled = false;
    import('./notifications.native').then((mod) => {
      if (cancelled) return;

      mod.setupNotificationHandler();

      mod.registerForPushNotifications()
        .then((token) => { if (token && !cancelled) setExpoPushToken(token); })
        .catch(() => {});

      try {
        notificationListener.current =
          mod.Notifications.addNotificationReceivedListener((notif) => {
            setNotification(notif);
          });

        responseListener.current =
          mod.Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data;
            if (data?.reportId) {
              // Navigation handled by expo-router deep links
            }
          });
      } catch {
        // Notification listeners not available
      }
    }).catch(() => {
      // expo-notifications not available (expected in Expo Go)
    });

    return () => {
      cancelled = true;
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

export function useNotifications() {
  return useContext(NotificationContext);
}
