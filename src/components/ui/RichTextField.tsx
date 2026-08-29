import { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { createElement } from 'react';
import { useTranslation } from 'react-i18next';

import { TextField } from '@/components/ui/TextField';
import { sanitizeLandingHtml, toEditorHtml } from '@/lib/html/sanitize';
import { colors, radius, type } from '@/theme';

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  hint?: string;
  minHeight?: number;
};

function run(command: string, extra?: string) {
  if (typeof document === 'undefined') return;
  document.execCommand(command, false, extra);
}

export function RichTextField({ label, value, onChangeText, hint, minHeight = 120 }: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement | null>(null);
  const last = useRef(value);
  const ready = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || !ref.current) return;
    if (document.activeElement === ref.current) return;
    if (value === last.current) return;
    ref.current.innerHTML = toEditorHtml(value);
    last.current = value;
  }, [value]);

  const emit = () => {
    if (!ref.current) return;
    const html = sanitizeLandingHtml(ref.current.innerHTML);
    last.current = html;
    onChangeText(html);
  };

  if (Platform.OS !== 'web') {
    return <TextField label={label} value={value} onChangeText={onChangeText} multiline hint={hint} />;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.box}>
        <View style={styles.toolbar}>
          <Tool label={t('editor.bold')} onPress={() => { run('bold'); emit(); }} />
          <Tool label={t('editor.italic')} onPress={() => { run('italic'); emit(); }} />
          <Tool label={t('editor.underline')} onPress={() => { run('underline'); emit(); }} />
          <Sep />
          <Tool label={t('editor.h1')} onPress={() => { run('formatBlock', 'H1'); emit(); }} />
          <Tool label={t('editor.h2')} onPress={() => { run('formatBlock', 'H2'); emit(); }} />
          <Tool label={t('editor.h3')} onPress={() => { run('formatBlock', 'H3'); emit(); }} />
          <Sep />
          <Tool label={t('editor.small')} onPress={() => { run('fontSize', '2'); emit(); }} />
          <Tool label={t('editor.normal')} onPress={() => { run('fontSize', '3'); emit(); }} />
          <Tool label={t('editor.large')} onPress={() => { run('fontSize', '5'); emit(); }} />
          <Sep />
          <Tool label={t('editor.left')} onPress={() => { run('justifyLeft'); emit(); }} />
          <Tool label={t('editor.center')} onPress={() => { run('justifyCenter'); emit(); }} />
          <Tool label={t('editor.right')} onPress={() => { run('justifyRight'); emit(); }} />
          <Sep />
          <Tool label={t('editor.list')} onPress={() => { run('insertUnorderedList'); emit(); }} />
        </View>
        {createElement('div', {
          ref: (node: HTMLDivElement | null) => {
            ref.current = node;
            if (node && !ready.current) {
              node.innerHTML = toEditorHtml(value);
              last.current = value;
              ready.current = true;
            }
          },
          contentEditable: true,
          suppressContentEditableWarning: true,
          className: 'mt-editor',
          style: {
            minHeight,
            padding: 14,
            outline: 'none',
            fontFamily: type.body.fontFamily,
            fontSize: 16,
            lineHeight: '24px',
            color: colors.text,
          },
          onInput: emit,
        })}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function Tool({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      onPressIn={(event) => event.preventDefault()}
      style={({ pressed }) => [styles.tool, pressed && styles.pressed]}
    >
      <Text style={styles.toolLabel}>{label}</Text>
    </Pressable>
  );
}

function Sep() {
  return <View style={styles.sep} />;
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    width: '100%',
  },
  label: {
    ...type.label,
    color: colors.text,
  },
  box: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  tool: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolLabel: {
    ...type.captionMedium,
    color: colors.text,
  },
  sep: {
    width: 1,
    height: 18,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  pressed: {
    opacity: 0.7,
  },
  hint: {
    ...type.caption,
    color: colors.textSecondary,
  },
});
