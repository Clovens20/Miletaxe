import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RichTextField } from '@/components/ui/RichTextField';
import { TextField } from '@/components/ui/TextField';
import { defaultLegalContent } from '@/features/account/defaultLegal';
import { useLegalPage, useSaveLegalPage } from '@/features/account/legalHooks';
import type { LegalKind, LegalLocale, LegalPageContent } from '@/features/account/legalTypes';
import { newLandingId } from '@/features/marketing/ids';
import { colors, radius, space, type } from '@/theme';

function confirmAction(message: string) {
  if (Platform.OS !== 'web') return false;
  return window.confirm(message);
}

function moveItem<T>(list: T[], index: number, direction: -1 | 1) {
  const next = index + direction;
  if (next < 0 || next >= list.length) return list;
  const copy = [...list];
  const row = copy[index];
  if (row === undefined) return list;
  copy.splice(index, 1);
  copy.splice(next, 0, row);
  return copy;
}

export function LegalEditor() {
  const { t } = useTranslation();
  const router = useRouter();
  const [locale, setLocale] = useState<LegalLocale>('fr');
  const [kind, setKind] = useState<LegalKind>('privacy');
  const query = useLegalPage(kind, locale);
  const save = useSaveLegalPage();
  const [draft, setDraft] = useState<LegalPageContent | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (query.data) setDraft(query.data);
  }, [kind, locale, query.data]);

  if (!draft) {
    return <Text style={styles.muted}>{t('common.loading')}</Text>;
  }

  const viewHref = (kind === 'privacy' ? '/legal/privacy' : '/legal/terms') as Href;

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>{t('admin.legalHint')}</Text>
      <View style={styles.row}>
        {(['privacy', 'terms'] as const).map((code) => (
          <Pressable key={code} onPress={() => setKind(code)} style={[styles.chip, kind === code && styles.chipOn]}>
            <Text style={[styles.chipText, kind === code && styles.chipTextOn]}>
              {code === 'privacy' ? t('admin.legalPrivacy') : t('admin.legalTerms')}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        {(['fr', 'en'] as const).map((code) => (
          <Pressable key={code} onPress={() => setLocale(code)} style={[styles.chip, locale === code && styles.chipOn]}>
            <Text style={[styles.chipText, locale === code && styles.chipTextOn]}>{code.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
      {message ? <Text style={styles.ok}>{message}</Text> : null}
      <View style={styles.row}>
        <Button
          label={t('admin.legalSave')}
          loading={save.isPending}
          onPress={() => {
            setMessage(null);
            void save
              .mutateAsync({ locale, kind, content: draft })
              .then(() => setMessage(t('admin.legalSaved')))
              .catch(() => setMessage(t('admin.legalSaveFailed')));
          }}
        />
        <Button label={t('admin.legalView')} variant="secondary" onPress={() => router.push(viewHref)} />
        <Button
          label={t('admin.landingReset')}
          variant="ghost"
          onPress={() => {
            if (confirmAction(t('admin.legalResetConfirm'))) setDraft(defaultLegalContent(kind, locale));
          }}
        />
      </View>

      <Card style={styles.block}>
        <RichTextField label={t('admin.legalTitle')} value={draft.title} onChangeText={(title) => setDraft({ ...draft, title })} minHeight={64} />
        <TextField
          label={t('admin.legalUpdatedOn')}
          hint={t('admin.legalUpdatedOnHint')}
          value={draft.updatedOn}
          onChangeText={(updatedOn) => setDraft({ ...draft, updatedOn })}
        />
      </Card>

      {draft.sections.map((section, index) => (
        <Card key={section.id} style={styles.block}>
          <Text style={styles.blockTitle}>
            {t('admin.legalSection')} {index + 1}
          </Text>
          <View style={styles.row}>
            <Button label={t('admin.landingUp')} variant="ghost" onPress={() => setDraft({ ...draft, sections: moveItem(draft.sections, index, -1) })} />
            <Button label={t('admin.landingDown')} variant="ghost" onPress={() => setDraft({ ...draft, sections: moveItem(draft.sections, index, 1) })} />
            <Button
              label={t('common.delete')}
              variant="danger"
              onPress={() => {
                if (confirmAction(t('admin.legalRemoveSectionConfirm'))) {
                  setDraft({ ...draft, sections: draft.sections.filter((item) => item.id !== section.id) });
                }
              }}
            />
          </View>
          <RichTextField
            label={t('admin.legalHeading')}
            value={section.heading}
            onChangeText={(heading) => {
              const sections = [...draft.sections];
              sections[index] = { ...section, heading };
              setDraft({ ...draft, sections });
            }}
            minHeight={64}
          />
          <RichTextField
            label={t('admin.legalBody')}
            value={section.body}
            onChangeText={(body) => {
              const sections = [...draft.sections];
              sections[index] = { ...section, body };
              setDraft({ ...draft, sections });
            }}
            minHeight={160}
          />
        </Card>
      ))}

      <Button
        label={t('admin.legalAddSection')}
        variant="secondary"
        onPress={() =>
          setDraft({
            ...draft,
            sections: [...draft.sections, { id: newLandingId(), heading: '', body: '' }],
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.lg,
  },
  hint: {
    ...type.body,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {
    ...type.callout,
    color: colors.textSecondary,
  },
  chipTextOn: {
    color: colors.primary,
  },
  block: {
    gap: space.sm,
  },
  blockTitle: {
    ...type.section,
    color: colors.text,
  },
  muted: {
    ...type.callout,
    color: colors.textSecondary,
  },
  ok: {
    ...type.caption,
    color: colors.success,
  },
});
