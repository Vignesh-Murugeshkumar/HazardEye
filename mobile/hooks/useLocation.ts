import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    checkPermission();
  }, []);

  async function checkPermission() {
    const { status } = await Location.getForegroundPermissionsAsync();
    setHasPermission(status === 'granted');
  }

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === 'granted';
    setHasPermission(granted);
    if (!granted) {
      Alert.alert(
        'Location Required',
        'HazardEye needs your location to tag reports accurately. Please enable location in settings.',
        [{ text: 'OK' }]
      );
    }
    return granted;
  }, []);

  const getCurrentLocation = useCallback(async (): Promise<LocationData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          setIsLoading(false);
          return null;
        }
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const data: LocationData = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        heading: loc.coords.heading,
      };

      setLocation(data);
      setIsLoading(false);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to get location');
      setIsLoading(false);
      return null;
    }
  }, [hasPermission, requestPermission]);

  const reverseGeocode = useCallback(
    async (lat?: number, lng?: number): Promise<string> => {
      const latitude = lat ?? location?.latitude;
      const longitude = lng ?? location?.longitude;
      if (!latitude || !longitude) return 'Unknown location';

      try {
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (results.length > 0) {
          const addr = results[0];
          const parts = [addr.street, addr.district, addr.city, addr.region].filter(Boolean);
          return parts.join(', ') || 'Unknown location';
        }
      } catch {
        // fall through
      }
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    },
    [location]
  );

  return {
    location,
    isLoading,
    error,
    hasPermission,
    requestPermission,
    getCurrentLocation,
    reverseGeocode,
  };
}
