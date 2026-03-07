import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';
import { Colors } from '../constants';

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Colors.primary },
            headerTintColor: Colors.textLight,
            headerTitleStyle: { fontWeight: 'bold' },
            contentStyle: { backgroundColor: Colors.background },
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="report-detail/[id]"
            options={{ title: 'Report Details' }}
          />
          <Stack.Screen
            name="verify/[id]"
            options={{ title: 'Verify Repair' }}
          />
          <Stack.Screen
            name="accountability"
            options={{ title: 'MLA Accountability' }}
          />
        </Stack>
      </NotificationProvider>
    </AuthProvider>
  );
}
