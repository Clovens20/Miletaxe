import { useCallback, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { ON_DEVICE_ODOMETER_OCR_HTML } from './onDeviceHtml';

type HostMessage =
  | { ok: true; ready: true }
  | { ok: true; text: string; confidence: number }
  | { ok: false; error: string };

export type OnDeviceOcrText = {
  text: string;
  confidence: number;
};

const RECOGNIZE_TIMEOUT_MS = 70_000;

export function useOnDeviceOcr(html: string = ON_DEVICE_ODOMETER_OCR_HTML) {
  const webviewRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const readyWaiters = useRef<Array<{ resolve: () => void; reject: (error: Error) => void }>>([]);
  const pendingRef = useRef<{
    resolve: (value: OnDeviceOcrText) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  } | null>(null);

  const settleReady = useCallback(() => {
    readyRef.current = true;
    const waiters = readyWaiters.current;
    readyWaiters.current = [];
    waiters.forEach((waiter) => waiter.resolve());
  }, []);

  const failReady = useCallback((error: Error) => {
    const waiters = readyWaiters.current;
    readyWaiters.current = [];
    waiters.forEach((waiter) => waiter.reject(error));
  }, []);

  const waitUntilReady = useCallback(() => {
    if (readyRef.current) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('ocr_engine_unavailable')), 30_000);
      readyWaiters.current.push({
        resolve: () => {
          clearTimeout(timeout);
          resolve();
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
    });
  }, []);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let payload: HostMessage;
      try {
        payload = JSON.parse(event.nativeEvent.data) as HostMessage;
      } catch {
        return;
      }

      if ('ready' in payload && payload.ok) {
        settleReady();
        return;
      }

      if (!payload.ok && !pendingRef.current) {
        failReady(new Error(payload.error || 'on_device_ocr_failed'));
        return;
      }

      const pending = pendingRef.current;
      if (!pending) return;
      pendingRef.current = null;
      clearTimeout(pending.timeout);

      if (!payload.ok) {
        pending.reject(new Error(payload.error || 'on_device_ocr_failed'));
        return;
      }
      if (!('text' in payload)) {
        pending.reject(new Error('empty_ocr_result'));
        return;
      }
      pending.resolve({
        text: payload.text ?? '',
        confidence: Number.isFinite(payload.confidence) ? payload.confidence : 0,
      });
    },
    [settleReady, failReady],
  );

  const recognize = useCallback(async (base64: string): Promise<OnDeviceOcrText> => {
    if (Platform.OS === 'web') {
      throw new Error('web_ocr_unsupported');
    }
    await waitUntilReady();
    if (pendingRef.current) {
      clearTimeout(pendingRef.current.timeout);
      pendingRef.current.reject(new Error('superseded'));
      pendingRef.current = null;
    }

    return new Promise<OnDeviceOcrText>((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRef.current = null;
        reject(new Error('timeout'));
      }, RECOGNIZE_TIMEOUT_MS);
      pendingRef.current = { resolve, reject, timeout };
      const payload = JSON.stringify({ imageBase64: base64 });
      webviewRef.current?.injectJavaScript(
        `window.__miletaxRecognize(${payload}); true;`,
      );
    });
  }, [waitUntilReady]);

  const host =
    Platform.OS === 'web' ? null : (
    <View style={styles.host} pointerEvents="none" collapsable={false}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://cdn.jsdelivr.net' }}
        onMessage={onMessage}
        javaScriptEnabled
        automaticallyAdjustContentInsets={false}
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
      />
    </View>
    );

  return { recognize, host };
}

export function useOnDeviceOdometerOcr() {
  return useOnDeviceOcr(ON_DEVICE_ODOMETER_OCR_HTML);
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    width: 12,
    height: 12,
    opacity: 0.01,
    overflow: 'hidden',
  },
});
