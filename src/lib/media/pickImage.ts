import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

async function ensureLibrary(): Promise<boolean> {
  const library = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return library.granted;
}

async function ensureCamera(): Promise<boolean> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  return permission.granted;
}

export async function pickImageFromLibrary(): Promise<string | null> {
  if (!(await ensureLibrary()) && !(await ensureCamera())) {
    Alert.alert('', 'Camera and photos permission required');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: false,
  });
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}

export async function captureImageWithCamera(): Promise<string | null> {
  if (!(await ensureCamera())) {
    return pickImageFromLibrary();
  }
  const result = await ImagePicker.launchCameraAsync({
    quality: 1,
    allowsEditing: false,
  });
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}

export const pickReceiptImage = pickImageFromLibrary;
export const captureReceiptImage = captureImageWithCamera;

const odometerPickerOptions = {
  mediaTypes: ['images'] as ['images'],
  quality: 0.75,
  allowsEditing: true,
  aspect: [16, 6] as [number, number],
};

export async function pickOdometerImage(): Promise<string | null> {
  if (!(await ensureLibrary()) && !(await ensureCamera())) {
    Alert.alert('', 'Camera and photos permission required');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync(odometerPickerOptions);
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}

export async function captureOdometerImage(): Promise<string | null> {
  if (!(await ensureCamera())) {
    return pickOdometerImage();
  }
  const result = await ImagePicker.launchCameraAsync({
    quality: odometerPickerOptions.quality,
    allowsEditing: odometerPickerOptions.allowsEditing,
    aspect: odometerPickerOptions.aspect,
  });
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}
