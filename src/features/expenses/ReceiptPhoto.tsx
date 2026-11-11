import { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, radius, space, type } from '@/theme';

/** Photo de reçu : aperçu + plein écran au tap pour vérifier les détails. */
export function ReceiptPhoto({ uri, height = 240 }: { uri: string; height?: number }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { width, height: windowHeight } = useWindowDimensions();

  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={t('expenses.expandPhoto')}>
        <Image source={{ uri }} style={[styles.thumb, { height }]} />
        <Text style={styles.hint}>{t('expenses.expandPhotoHint')}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <Image
            source={{ uri }}
            style={{ width: width - space.lg * 2, height: windowHeight * 0.78 }}
            resizeMode="contain"
          />
          <Pressable style={styles.close} onPress={() => setOpen(false)}>
            <Text style={styles.closeLabel}>{t('common.close')}</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: '100%',
    borderRadius: radius.md,
    resizeMode: 'contain',
    backgroundColor: colors.surfaceMuted,
  },
  hint: {
    ...type.caption,
    color: colors.primary,
    marginTop: 4,
    marginBottom: space.xs,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
    gap: space.md,
  },
  close: {
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  closeLabel: {
    ...type.bodyMedium,
    color: colors.text,
  },
});
