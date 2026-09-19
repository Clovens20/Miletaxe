import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { File } from 'expo-file-system';

const logoModule = require('../../../assets/logo.png');

let cached: Promise<string> | null = null;

export function getBrandLogoDataUri(): Promise<string> {
  cached ??= loadBrandLogoDataUri();
  return cached;
}

export function useBrandLogoSrc(): string {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let active = true;
    void getBrandLogoDataUri().then((value) => {
      if (active) setSrc(value);
    });
    return () => {
      active = false;
    };
  }, []);
  return src;
}

async function loadBrandLogoDataUri(): Promise<string> {
  const uri = Image.resolveAssetSource(logoModule)?.uri;
  if (!uri) return '';
  if (uri.startsWith('data:')) return uri;
  if (uri.startsWith('file:')) {
    try {
      return `data:image/png;base64,${await new File(uri).base64()}`;
    } catch {
      return uri;
    }
  }
  try {
    const response = await fetch(uri);
    const bytes = new Uint8Array(await response.arrayBuffer());
    return `data:image/png;base64,${bytesToBase64(bytes)}`;
  } catch {
    return uri;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return globalThis.btoa(binary);
}
