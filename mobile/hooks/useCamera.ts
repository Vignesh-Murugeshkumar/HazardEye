import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

interface CapturedImage {
  uri: string;
  width: number;
  height: number;
  type?: string;
  fileName?: string;
}

export function useCamera() {
  const [image, setImage] = useState<CapturedImage | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const takePhoto = useCallback(async (): Promise<CapturedImage | null> => {
    setIsLoading(true);

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Required',
          'HazardEye needs camera access to photograph road hazards.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const captured: CapturedImage = {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          type: asset.mimeType || 'image/jpeg',
          fileName: asset.fileName || `hazard_${Date.now()}.jpg`,
        };
        setImage(captured);
        setIsLoading(false);
        return captured;
      }

      setIsLoading(false);
      return null;
    } catch (error) {
      setIsLoading(false);
      return null;
    }
  }, []);

  const pickImage = useCallback(async (): Promise<CapturedImage | null> => {
    setIsLoading(true);

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Gallery Access Required',
          'HazardEye needs gallery access to select photos.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const captured: CapturedImage = {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          type: asset.mimeType || 'image/jpeg',
          fileName: asset.fileName || `hazard_${Date.now()}.jpg`,
        };
        setImage(captured);
        setIsLoading(false);
        return captured;
      }

      setIsLoading(false);
      return null;
    } catch (error) {
      setIsLoading(false);
      return null;
    }
  }, []);

  const clearImage = useCallback(() => {
    setImage(null);
  }, []);

  return {
    image,
    isLoading,
    takePhoto,
    pickImage,
    clearImage,
  };
}
