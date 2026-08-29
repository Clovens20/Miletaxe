import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RichTextField } from '@/components/ui/RichTextField';
import { TextField } from '@/components/ui/TextField';
import { defaultLandingContent } from '@/features/marketing/defaultContent';
import { useLandingContent, useSaveLanding } from '@/features/marketing/hooks';
import { newLandingId } from '@/features/marketing/ids';
import type { LandingContent, LandingLocale, LandingSection } from '@/features/marketing/types';
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

function emptySection(kind: 'cards' | 'screens' | 'cta', variant?: 'grid' | 'steps' | 'trust'): LandingSection {
  if (kind === 'screens') return { id: newLandingId(), kind: 'screens', title: '', visible: true };
  if (kind === 'cta') return { id: newLandingId(), kind: 'cta', title: '', body: '', playSoon: '', visible: true };
  return {
    id: newLandingId(),
    kind: 'cards',
    variant: variant ?? 'grid',
    title: '',
    body: '',
    visible: true,
    navId: '',
    navLabel: '',
    showIcons: variant === 'grid',
    cards: [],
  };
}

export function LandingEditor() {
  const { t } = useTranslation();
  const router = useRouter();
  const [locale, setLocale] = useState<LandingLocale>('fr');
  const query = useLandingContent(locale);
  const save = useSaveLanding();
  const [draft, setDraft] = useState<LandingContent | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (query.data) setDraft(query.data);
  }, [locale, query.data]);

  if (!draft) {
    return <Text style={styles.muted}>{t('common.loading')}</Text>;
  }

  const downloads = draft.downloads ?? defaultLandingContent(locale).downloads;
  const update = (patch: Partial<LandingContent>) => setDraft({ ...draft, downloads, ...patch });

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>{t('admin.landingHint')}</Text>
      <Text style={styles.hint}>{t('admin.landingFormatHint')}</Text>
      <View style={styles.row}>
        {(['fr', 'en'] as const).map((code) => (
          <Pressable
            key={code}
            onPress={() => setLocale(code)}
            style={[styles.chip, locale === code && styles.chipOn]}
          >
            <Text style={[styles.chipText, locale === code && styles.chipTextOn]}>{code.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
      {message ? <Text style={styles.ok}>{message}</Text> : null}
      <View style={styles.row}>
        <Button
          label={t('admin.landingSave')}
          loading={save.isPending}
          onPress={() => {
            setMessage(null);
            void save
              .mutateAsync({ locale, content: draft })
              .then(() => setMessage(t('admin.landingSaved')))
              .catch(() => setMessage(t('admin.landingSaveFailed')));
          }}
        />
        <Button label={t('admin.landingView')} variant="secondary" onPress={() => router.push('/' as Href)} />
        <Button
          label={t('admin.landingReset')}
          variant="ghost"
          onPress={() => {
            if (confirmAction(t('admin.landingResetConfirm'))) setDraft(defaultLandingContent(locale));
          }}
        />
      </View>

      <Card style={styles.block}>
        <Text style={styles.blockTitle}>{t('admin.landingSeo')}</Text>
        <TextField label={t('admin.landingMetaTitle')} value={draft.metaTitle} onChangeText={(metaTitle) => update({ metaTitle })} />
        <TextField
          label={t('admin.landingMetaDescription')}
          value={draft.metaDescription}
          onChangeText={(metaDescription) => update({ metaDescription })}
          multiline
        />
      </Card>

      <Card style={styles.block}>
        <Text style={styles.blockTitle}>{t('admin.landingNav')}</Text>
        <TextField label={t('admin.landingLogin')} value={draft.login} onChangeText={(login) => update({ login })} />
        <TextField label={t('admin.landingRegister')} value={draft.register} onChangeText={(register) => update({ register })} />
      </Card>

      <Card style={styles.block}>
        <Text style={styles.blockTitle}>{t('admin.landingDownloads')}</Text>
        <Text style={styles.hint}>{t('admin.landingDownloadsHint')}</Text>
        <TextField
          label={t('admin.landingPlayLabel')}
          value={downloads.playLabel}
          onChangeText={(playLabel) => update({ downloads: { ...downloads, playLabel } })}
        />
        <TextField
          label={t('admin.landingPlayUrl')}
          hint={t('admin.landingStoreUrlHint')}
          value={downloads.playUrl}
          onChangeText={(playUrl) => update({ downloads: { ...downloads, playUrl } })}
          autoCapitalize="none"
        />
        <TextField
          label={t('admin.landingIosLabel')}
          value={downloads.iosLabel}
          onChangeText={(iosLabel) => update({ downloads: { ...downloads, iosLabel } })}
        />
        <TextField
          label={t('admin.landingIosUrl')}
          hint={t('admin.landingStoreUrlHint')}
          value={downloads.iosUrl}
          onChangeText={(iosUrl) => update({ downloads: { ...downloads, iosUrl } })}
          autoCapitalize="none"
        />
      </Card>

      <Card style={styles.block}>
        <Text style={styles.blockTitle}>{t('admin.landingHero')}</Text>
        <RichTextField label={t('admin.landingEyebrow')} value={draft.hero.eyebrow} onChangeText={(eyebrow) => update({ hero: { ...draft.hero, eyebrow } })} minHeight={56} />
        <RichTextField label={t('admin.landingTitle')} value={draft.hero.title} onChangeText={(title) => update({ hero: { ...draft.hero, title } })} minHeight={88} />
        <RichTextField label={t('admin.landingBody')} value={draft.hero.body} onChangeText={(body) => update({ hero: { ...draft.hero, body } })} minHeight={140} />
        <RichTextField label={t('admin.landingNote')} value={draft.hero.note} onChangeText={(note) => update({ hero: { ...draft.hero, note } })} minHeight={56} />
      </Card>

      {draft.sections.map((section, index) => (
        <SectionEditor
          key={section.id}
          section={section}
          index={index}
          last={index === draft.sections.length - 1}
          onChange={(next) => {
            const sections = [...draft.sections];
            sections[index] = next;
            update({ sections });
          }}
          onMove={(direction) => update({ sections: moveItem(draft.sections, index, direction) })}
          onRemove={() => {
            if (confirmAction(t('admin.landingRemoveSectionConfirm'))) {
              update({ sections: draft.sections.filter((item) => item.id !== section.id) });
            }
          }}
        />
      ))}

      <Card style={styles.block}>
        <Text style={styles.blockTitle}>{t('admin.landingAddSection')}</Text>
        <View style={styles.row}>
          <Button label={t('admin.landingAddGrid')} variant="secondary" onPress={() => update({ sections: [...draft.sections, emptySection('cards', 'grid')] })} />
          <Button label={t('admin.landingAddSteps')} variant="secondary" onPress={() => update({ sections: [...draft.sections, emptySection('cards', 'steps')] })} />
          <Button label={t('admin.landingAddTrust')} variant="secondary" onPress={() => update({ sections: [...draft.sections, emptySection('cards', 'trust')] })} />
          <Button label={t('admin.landingAddScreens')} variant="secondary" onPress={() => update({ sections: [...draft.sections, emptySection('screens')] })} />
          <Button label={t('admin.landingAddCta')} variant="secondary" onPress={() => update({ sections: [...draft.sections, emptySection('cta')] })} />
        </View>
      </Card>

      <Card style={styles.block}>
        <Text style={styles.blockTitle}>{t('admin.landingFooter')}</Text>
        <RichTextField label={t('admin.landingFooterRights')} value={draft.footer.rights} onChangeText={(rights) => update({ footer: { ...draft.footer, rights } })} minHeight={56} />
        <TextField label={t('admin.landingFooterPrivacy')} value={draft.footer.privacy} onChangeText={(privacy) => update({ footer: { ...draft.footer, privacy } })} />
        <TextField label={t('admin.landingFooterTerms')} value={draft.footer.terms} onChangeText={(terms) => update({ footer: { ...draft.footer, terms } })} />
      </Card>
    </View>
  );
}

function SectionEditor({
  section,
  index,
  last,
  onChange,
  onMove,
  onRemove,
}: {
  section: LandingSection;
  index: number;
  last: boolean;
  onChange: (section: LandingSection) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Card style={styles.block}>
      <View style={styles.sectionHead}>
        <Text style={styles.blockTitle}>
          {t('admin.landingSection')} {index + 1} · {t(`admin.landingKind.${section.kind === 'cards' ? section.variant : section.kind}`)}
        </Text>
        <View style={styles.switchRow}>
          <Text style={styles.muted}>{t('admin.landingVisible')}</Text>
          <Switch value={section.visible} onValueChange={(visible) => onChange({ ...section, visible })} />
        </View>
      </View>
      <View style={styles.row}>
        <Button label={t('admin.landingUp')} variant="ghost" onPress={() => onMove(-1)} disabled={index === 0} />
        <Button label={t('admin.landingDown')} variant="ghost" onPress={() => onMove(1)} disabled={last} />
        <Button label={t('common.delete')} variant="danger" onPress={onRemove} />
      </View>
      <RichTextField label={t('admin.landingTitle')} value={section.title} onChangeText={(title) => onChange({ ...section, title })} minHeight={72} />
      {section.kind === 'cards' ? (
        <>
          <RichTextField label={t('admin.landingBody')} value={section.body} onChangeText={(body) => onChange({ ...section, body })} />
          <TextField
            label={t('admin.landingNavId')}
            hint={t('admin.landingNavIdHint')}
            value={section.navId ?? ''}
            onChangeText={(navId) => onChange({ ...section, navId })}
          />
          <TextField
            label={t('admin.landingNavLabel')}
            value={section.navLabel ?? ''}
            onChangeText={(navLabel) => onChange({ ...section, navLabel })}
          />
          <View style={styles.switchRow}>
            <Text style={styles.muted}>{t('admin.landingIcons')}</Text>
            <Switch value={Boolean(section.showIcons)} onValueChange={(showIcons) => onChange({ ...section, showIcons })} />
          </View>
          {section.cards.map((card, cardIndex) => (
            <View key={card.id} style={styles.cardEdit}>
              <Text style={styles.cardLabel}>
                {t('admin.landingCard')} {cardIndex + 1}
              </Text>
              <RichTextField
                label={t('admin.landingTitle')}
                value={card.title}
                onChangeText={(title) => {
                  const cards = [...section.cards];
                  cards[cardIndex] = { ...card, title };
                  onChange({ ...section, cards });
                }}
                minHeight={64}
              />
              <RichTextField
                label={t('admin.landingBody')}
                value={card.body}
                onChangeText={(body) => {
                  const cards = [...section.cards];
                  cards[cardIndex] = { ...card, body };
                  onChange({ ...section, cards });
                }}
              />
              <View style={styles.row}>
                <Button
                  label={t('admin.landingUp')}
                  variant="ghost"
                  onPress={() => onChange({ ...section, cards: moveItem(section.cards, cardIndex, -1) })}
                />
                <Button
                  label={t('admin.landingDown')}
                  variant="ghost"
                  onPress={() => onChange({ ...section, cards: moveItem(section.cards, cardIndex, 1) })}
                />
                <Button
                  label={t('common.delete')}
                  variant="danger"
                  onPress={() => onChange({ ...section, cards: section.cards.filter((item) => item.id !== card.id) })}
                />
              </View>
            </View>
          ))}
          <Button
            label={t('admin.landingAddCard')}
            variant="secondary"
            onPress={() => onChange({ ...section, cards: [...section.cards, { id: newLandingId(), title: '', body: '' }] })}
          />
        </>
      ) : null}
      {section.kind === 'cta' ? (
        <>
          <RichTextField label={t('admin.landingBody')} value={section.body} onChangeText={(body) => onChange({ ...section, body })} />
          <RichTextField label={t('admin.landingPlaySoon')} value={section.playSoon} onChangeText={(playSoon) => onChange({ ...section, playSoon })} minHeight={56} />
        </>
      ) : null}
    </Card>
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
  sectionHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  cardEdit: {
    gap: space.sm,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  cardLabel: {
    ...type.captionMedium,
    color: colors.textSecondary,
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
