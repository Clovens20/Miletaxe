import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { EncodingType, readAsStringAsync } from 'expo-file-system/legacy';

export type PreparedReceiptImage = {
  uri: string;
  base64: string | null;
};

async function readBase64(uri: string): Promise<string | null> {
  try {
    return await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
  } catch {
    return null;
  }
}

/** JPEG plus léger pour un upload et un OCR rapides. */
export async function prepareReceiptImage(uri: string): Promise<PreparedReceiptImage> {
  try {
    const [ocr, upload] = await Promise.all([
      manipulateAsync(uri, [{ resize: { width: 1600 } }], {
        compress: 0.9,
        format: SaveFormat.JPEG,
        base64: true,
      }),
      manipulateAsync(uri, [{ resize: { width: 1400 } }], {
        compress: 0.82,
        format: SaveFormat.JPEG,
      }),
    ]);
    return {
      uri: upload.uri,
      base64: ocr.base64 ?? (await readBase64(ocr.uri)),
    };
  } catch {
    return { uri, base64: await readBase64(uri) };
  }
}
