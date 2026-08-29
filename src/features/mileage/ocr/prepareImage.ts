import { Image } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { EncodingType, readAsStringAsync } from 'expo-file-system/legacy';

export type PreparedOdometerImage = {
  uri: string;
  base64: string | null;
  clusterBase64: string | null;
};

async function readBase64(uri: string): Promise<string | null> {
  try {
    return await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
  } catch {
    return null;
  }
}

function imageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

/** Photo entière + coin bas-droit (total du compteur). */
export async function prepareOdometerImage(uri: string): Promise<PreparedOdometerImage> {
  try {
    const saved = await manipulateAsync(uri, [{ resize: { width: 1280 } }], {
      compress: 0.8,
      format: SaveFormat.JPEG,
      base64: true,
    });
    let clusterBase64: string | null = null;
    try {
      const { width, height } = await imageSize(saved.uri);
      const cropWidth = Math.round(width * 0.55);
      const cropHeight = Math.round(height * 0.42);
      const cluster = await manipulateAsync(
        saved.uri,
        [
          {
            crop: {
              originX: Math.max(0, width - cropWidth),
              originY: Math.max(0, height - cropHeight),
              width: cropWidth,
              height: cropHeight,
            },
          },
        ],
        { compress: 0.85, format: SaveFormat.JPEG, base64: true },
      );
      clusterBase64 = cluster.base64 ?? (await readBase64(cluster.uri));
    } catch {
      clusterBase64 = null;
    }
    return {
      uri: saved.uri,
      base64: saved.base64 ?? (await readBase64(saved.uri)),
      clusterBase64,
    };
  } catch {
    return { uri, base64: await readBase64(uri), clusterBase64: null };
  }
}
