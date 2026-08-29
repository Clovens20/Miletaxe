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

/** PNG plus large : les 0 des tickets thermos se distinguent mieux des 8. */
export async function prepareReceiptImage(uri: string): Promise<PreparedReceiptImage> {
  try {
    const saved = await manipulateAsync(uri, [{ resize: { width: 2000 } }], {
      compress: 1,
      format: SaveFormat.PNG,
      base64: true,
    });
    return {
      uri: saved.uri,
      base64: saved.base64 ?? (await readBase64(saved.uri)),
    };
  } catch {
    return { uri, base64: await readBase64(uri) };
  }
}
