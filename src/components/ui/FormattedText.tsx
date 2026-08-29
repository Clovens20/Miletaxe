import { useEffect } from 'react';
import { Platform, StyleSheet, Text, type TextStyle } from 'react-native';
import { createElement } from 'react';

import { htmlToPlain, looksLikeHtml, sanitizeLandingHtml } from '@/lib/html/sanitize';
import { colors, fonts } from '@/theme';

const SHEET = `
.mt-html, .mt-html * { font-family: ${fonts.regular}, system-ui, sans-serif; }
.mt-html p { margin: 0 0 8px; }
.mt-html h1 { margin: 0 0 10px; font-size: 36px; line-height: 1.15; font-weight: 700; }
.mt-html h2 { margin: 0 0 8px; font-size: 28px; line-height: 1.2; font-weight: 700; }
.mt-html h3 { margin: 0 0 8px; font-size: 20px; line-height: 1.3; font-weight: 600; }
.mt-html ul { margin: 0 0 8px; padding-left: 20px; }
.mt-html strong, .mt-html b { font-weight: 700; }
.mt-html em, .mt-html i { font-style: italic; }
.mt-html-dark, .mt-html-dark * { color: inherit; }
.mt-editor h1 { font-size: 36px; font-weight: 700; margin: 0 0 8px; }
.mt-editor h2 { font-size: 28px; font-weight: 700; margin: 0 0 8px; }
.mt-editor h3 { font-size: 20px; font-weight: 600; margin: 0 0 8px; }
.mt-editor p { margin: 0 0 8px; }
.mt-editor ul { margin: 0 0 8px; padding-left: 20px; }
`;

let sheetReady = false;

function ensureSheet() {
  if (sheetReady || typeof document === 'undefined') return;
  if (document.getElementById('mt-html-sheet')) {
    sheetReady = true;
    return;
  }
  const style = document.createElement('style');
  style.id = 'mt-html-sheet';
  style.textContent = SHEET;
  document.head.appendChild(style);
  sheetReady = true;
}

export function FormattedText({
  value,
  style,
  tone = 'light',
  align,
}: {
  value: string;
  style?: TextStyle;
  tone?: 'light' | 'dark';
  align?: 'left' | 'center' | 'right';
}) {
  useEffect(() => {
    if (Platform.OS === 'web') ensureSheet();
  }, []);

  if (!value) return null;

  if (Platform.OS !== 'web' || !looksLikeHtml(value)) {
    return <Text style={[styles.plain, style, align ? { textAlign: align } : null]}>{htmlToPlain(value)}</Text>;
  }

  return createElement('div', {
    className: `mt-html${tone === 'dark' ? ' mt-html-dark' : ''}`,
    style: {
      color: style?.color ?? (tone === 'dark' ? colors.textInverse : colors.text),
      textAlign: align ?? style?.textAlign,
      fontSize: style?.fontSize,
      lineHeight: style?.lineHeight ? `${style.lineHeight}px` : undefined,
      fontFamily: style?.fontFamily,
      maxWidth: style?.maxWidth,
    },
    dangerouslySetInnerHTML: { __html: sanitizeLandingHtml(value) },
  });
}

const styles = StyleSheet.create({
  plain: {
    color: colors.text,
  },
});
