import { Directory, EncodingType, File, Paths } from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as MailComposer from 'expo-mail-composer';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { getBrandLogoDataUri } from '@/features/reports/brandLogo';
import { accountantPackageFilename, accountantPackageHtml } from '@/features/reports/documentHtml';
import type { AccountantPackageSummary } from '@/features/reports/package';
import type { SupportedLocale } from '@/types/domain';

type PreparedPdf = {
  uri: string;
  filename: string;
  html: string;
  base64?: string;
};

function copyPdfIntoAppCache(printed: { uri: string; base64?: string }, filename: string): string {
  const dest = new File(Paths.cache, filename);
  if (dest.exists) {
    dest.delete();
  }
  if (printed.base64) {
    dest.write(printed.base64, { encoding: EncodingType.Base64 });
    return dest.uri;
  }
  return printed.uri.startsWith('file://') ? printed.uri : `file://${printed.uri}`;
}

function isUserCancel(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /cancel/i.test(message);
}

async function prepareAccountantPdf(
  summary: AccountantPackageSummary,
  locale: SupportedLocale,
  countryCode?: string | null,
): Promise<PreparedPdf> {
  const html = accountantPackageHtml(summary, locale, countryCode, await getBrandLogoDataUri());
  const filename = accountantPackageFilename(summary);
  if (Platform.OS === 'web') {
    return { uri: '', filename, html };
  }
  const printed = await Print.printToFileAsync({ html, base64: true });
  return {
    uri: copyPdfIntoAppCache(printed, filename),
    filename,
    html,
    base64: printed.base64,
  };
}

export async function shareAccountantPackage(
  summary: AccountantPackageSummary,
  locale: SupportedLocale,
  countryCode?: string | null,
) {
  const prepared = await prepareAccountantPdf(summary, locale, countryCode);

  if (Platform.OS === 'web') {
    await Print.printAsync({ html: prepared.html });
    return;
  }

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    await Print.printAsync({ html: prepared.html });
    return;
  }

  try {
    await Sharing.shareAsync(prepared.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: prepared.filename,
    });
  } catch {
    await Print.printAsync({ html: prepared.html });
  }
}

export type DownloadPackageResult = 'saved' | 'cancelled';
export type EmailPackageResult = 'sent' | 'saved' | 'cancelled' | 'shared';

export async function emailAccountantPackage(
  summary: AccountantPackageSummary,
  locale: SupportedLocale,
  countryCode: string | null | undefined,
  input: { recipient: string; subject: string; body: string },
): Promise<EmailPackageResult> {
  const prepared = await prepareAccountantPdf(summary, locale, countryCode);
  const recipient = input.recipient.trim();

  if (Platform.OS !== 'web') {
    const available = await MailComposer.isAvailableAsync();
    if (available) {
      const result = await MailComposer.composeAsync({
        recipients: [recipient],
        subject: input.subject,
        body: input.body,
        attachments: [prepared.uri],
      });
      if (result.status === MailComposer.MailComposerStatus.CANCELLED) return 'cancelled';
      if (result.status === MailComposer.MailComposerStatus.SAVED) return 'saved';
      return 'sent';
    }
  }

  const mailto = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(input.subject)}&body=${encodeURIComponent(input.body)}`;
  const canOpenMail = await Linking.canOpenURL(mailto);
  if (canOpenMail) {
    await Linking.openURL(mailto);
    if (Platform.OS === 'web') {
      await Print.printAsync({ html: prepared.html });
    }
    return 'sent';
  }

  await shareAccountantPackage(summary, locale, countryCode);
  return 'shared';
}

export async function downloadAccountantPackage(
  summary: AccountantPackageSummary,
  locale: SupportedLocale,
  countryCode?: string | null,
): Promise<DownloadPackageResult> {
  const prepared = await prepareAccountantPdf(summary, locale, countryCode);

  if (Platform.OS === 'web') {
    await Print.printAsync({ html: prepared.html });
    return 'saved';
  }

  try {
    const folder = await Directory.pickDirectoryAsync();
    const source = new File(prepared.uri);
    try {
      const dest = folder.createFile(prepared.filename, 'application/pdf');
      if (prepared.base64) {
        dest.write(prepared.base64, { encoding: EncodingType.Base64 });
      } else {
        await source.copy(dest, { overwrite: true });
      }
    } catch {
      await source.copy(folder, { overwrite: true });
    }
    return 'saved';
  } catch (error) {
    if (isUserCancel(error)) return 'cancelled';
    throw error;
  }
}
