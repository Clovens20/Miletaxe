import { PRODUCT } from '@/lib/constants';
import { formatDate, formatDistance, formatMoney, formatYearMonth } from '@/lib/format';
import { localize } from '@/lib/i18n/localize';
import {
  completeExpenseLines,
  expensesWithoutReceipt,
  groupByMonth,
  incompleteExpenseLines,
  incompleteMileageDays,
  isCompleteMileageDay,
  lineRef,
  mileageByVehicle,
  monthlyBuckets,
} from '@/features/reports/explain';
import type { AccountantPackageSummary, PackageExpenseLine, PackageIncomeLine } from '@/features/reports/package';
import type { CurrencyCode, DistanceUnit, SupportedLocale } from '@/types/domain';

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(amount: number, currency: string, locale: SupportedLocale, country?: string | null) {
  return esc(formatMoney(amount, currency as CurrencyCode, locale, country));
}

type Copy = {
  title: string;
  docType: string;
  period: string;
  fromTo: string;
  preparedOn: string;
  preparedFor: string;
  occupation: string;
  recipient: string;
  howTo: string;
  howTo1: string;
  howTo2: string;
  howTo3: string;
  howTo4: string;
  howTo5: string;
  first: string;
  firstNone: string;
  missingReceipts: string;
  incompleteExpenses: string;
  incompleteMileage: string;
  snapshot: string;
  totals: string;
  totalsHint: string;
  distance: string;
  expenses: string;
  income: string;
  byCategory: string;
  bySource: string;
  byMonth: string;
  month: string;
  vehicles: string;
  vehicleDays: string;
  expenseLines: string;
  incomeLines: string;
  mileage: string;
  issues: string;
  none: string;
  receipt: string;
  noReceipt: string;
  vendor: string;
  category: string;
  date: string;
  amount: string;
  tax: string;
  source: string;
  kind: string;
  start: string;
  end: string;
  ref: string;
  notes: string;
  observation: string;
  complete: string;
  missingEnd: string;
  missingStart: string;
  invalidReading: string;
  draft: string;
  notInTotals: string;
  subtotal: string;
  lines: string;
  kindPlatform: string;
  kindInvoice: string;
  kindCash: string;
  kindOther: string;
  uncategorized: string;
  disclaimer: string;
};

function copy(locale: SupportedLocale): Copy {
  if (locale === 'en') {
    return {
      title: `${PRODUCT.name} working papers`,
      docType: 'Preparation package — records and source documents, not a tax return',
      period: 'Period',
      fromTo: 'From {start} to {end}',
      preparedOn: 'Prepared on',
      preparedFor: 'Client',
      occupation: 'Occupation',
      recipient: 'Prepared for',
      howTo: 'How to read this package',
      howTo1: 'Totals are the sum of complete entries only. MileTax does not calculate tax or deductions.',
      howTo2: 'Each line has a reference (E-001, I-001, M-001). Use it when you write back to the client.',
      howTo3: '“No receipt” means no photo is attached in the app. A paper copy may still exist.',
      howTo4: 'Daily kilometres = closing odometer − opening odometer. Incomplete days are excluded from km totals.',
      howTo5: '“Items to mention” are holes in the file, not tax advice.',
      first: 'Review first',
      firstNone: 'No gaps flagged in this package.',
      missingReceipts: '{count} complete expense(s) with no photo attached',
      incompleteExpenses: '{count} incomplete expense(s) — not included in totals',
      incompleteMileage: '{count} incomplete mileage day(s) — kilometres not counted',
      snapshot: 'Snapshot',
      totals: 'Recorded totals',
      totalsHint: 'Sums of complete entries. Not taxable income or deductible amounts.',
      distance: 'Distance',
      expenses: 'Expenses',
      income: 'Income',
      byCategory: 'Expenses by category',
      bySource: 'Income by source',
      byMonth: 'Month-by-month',
      month: 'Month',
      vehicles: 'Vehicles',
      vehicleDays: 'days',
      expenseLines: 'Expense detail',
      incomeLines: 'Income detail',
      mileage: 'Daily mileage',
      issues: 'Items to mention',
      none: 'None',
      receipt: 'Photo attached',
      noReceipt: 'No photo',
      vendor: 'Vendor',
      category: 'Category',
      date: 'Date',
      amount: 'Amount',
      tax: 'Tax entered',
      source: 'Source',
      kind: 'Type',
      start: 'Start',
      end: 'End',
      ref: 'Ref.',
      notes: 'Notes',
      observation: 'Note',
      complete: 'Complete day',
      missingEnd: 'Closing odometer missing',
      missingStart: 'Opening odometer missing',
      invalidReading: 'Invalid reading',
      draft: 'Incomplete',
      notInTotals: 'Not in totals',
      subtotal: 'Subtotal',
      lines: 'lines',
      kindPlatform: 'Platform',
      kindInvoice: 'Invoice',
      kindCash: 'Cash',
      kindOther: 'Other',
      uncategorized: 'Uncategorized',
      disclaimer:
        'This package gathers records the client entered. It is not a tax return and does not replace an accountant. MileTax does not calculate tax.',
    };
  }
  return {
    title: `Dossier préparatoire ${PRODUCT.name}`,
    docType: 'Pièces et écritures pour le comptable — ce n’est pas une déclaration fiscale',
    period: 'Période',
    fromTo: 'Du {start} au {end}',
    preparedOn: 'Préparé le',
    preparedFor: 'Client',
    occupation: 'Occupation',
    recipient: 'Destinataire',
    howTo: 'Comment lire ce dossier',
    howTo1: 'Les totaux sont la somme des écritures complètes seulement. MileTax ne calcule ni impôt ni déduction.',
    howTo2: 'Chaque ligne a un numéro (D-001, R-001, K-001). Servez-vous-en pour écrire au client.',
    howTo3: '« Sans photo » signifie qu’aucune photo n’est jointe dans l’application. Un papier peut exister ailleurs.',
    howTo4: 'Km d’une journée = odomètre de fin − odomètre de début. Les jours incomplets sont exclus des totaux km.',
    howTo5: 'Les « points à mentionner » sont des trous de dossier, pas des avis fiscaux.',
    first: 'À traiter en premier',
    firstNone: 'Aucun écart signalé dans ce dossier.',
    missingReceipts: '{count} dépense(s) complète(s) sans photo jointe',
    incompleteExpenses: '{count} dépense(s) incomplète(s) — non incluses dans les totaux',
    incompleteMileage: '{count} jour(s) de km incomplet(s) — kilométrage non compté',
    snapshot: 'Synthèse',
    totals: 'Totaux enregistrés',
    totalsHint: 'Somme des écritures complètes. Ce ne sont pas des montants imposables ni déductibles.',
    distance: 'Distance',
    expenses: 'Dépenses',
    income: 'Revenus',
    byCategory: 'Dépenses par catégorie',
    bySource: 'Revenus par source',
    byMonth: 'Par mois',
    month: 'Mois',
    vehicles: 'Véhicules',
    vehicleDays: 'jours',
    expenseLines: 'Détail des dépenses',
    incomeLines: 'Détail des revenus',
    mileage: 'Kilométrage par jour',
    issues: 'Points à mentionner',
    none: 'Aucun',
    receipt: 'Photo jointe',
    noReceipt: 'Sans photo',
    vendor: 'Marchand',
    category: 'Catégorie',
    date: 'Date',
    amount: 'Montant',
    tax: 'Taxes saisies',
    source: 'Source',
    kind: 'Type',
    start: 'Début',
    end: 'Fin',
    ref: 'Réf.',
    notes: 'Notes',
    observation: 'Observation',
    complete: 'Journée complète',
    missingEnd: 'Odomètre de fin manquant',
    missingStart: 'Odomètre de début manquant',
    invalidReading: 'Relevé invalide',
    draft: 'Incomplet',
    notInTotals: 'Hors totaux',
    subtotal: 'Sous-total',
    lines: 'lignes',
    kindPlatform: 'Plateforme',
    kindInvoice: 'Facture',
    kindCash: 'Comptant',
    kindOther: 'Autre',
    uncategorized: 'Sans catégorie',
    disclaimer:
      'Ce dossier rassemble les écritures saisies par le client. Ce n’est pas une déclaration fiscale et il ne remplace pas un comptable. MileTax ne calcule pas d’impôt.',
  };
}

function fill(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template);
}

function incomeKindLabel(kind: string, t: Copy): string {
  if (kind === 'platform') return t.kindPlatform;
  if (kind === 'invoice') return t.kindInvoice;
  if (kind === 'cash') return t.kindCash;
  return t.kindOther;
}

function mileageNote(
  row: AccountantPackageSummary['daily_mileage'][number],
  t: Copy,
): string {
  const warnings = row.warnings ?? [];
  if (warnings.includes('invalid_reading')) return t.invalidReading;
  if (warnings.includes('missing_end')) return t.missingEnd;
  if (warnings.includes('missing_start')) return t.missingStart;
  if (!isCompleteMileageDay(row)) return t.missingEnd;
  return t.complete;
}

function notesCell(...parts: Array<string | null | undefined>): string {
  return esc(parts.filter((part) => part && String(part).trim()).join(' · ') || '—');
}

export function accountantPackageHtml(
  summary: AccountantPackageSummary,
  locale: SupportedLocale,
  countryCode?: string | null,
): string {
  const t = copy(locale);
  const currency = summary.totals.currency;
  const unit = summary.totals.unit as DistanceUnit;
  const country = countryCode ?? summary.profile.country_code;
  const periodLabel = localize(summary.period.label_i18n, locale);
  const name = summary.profile.full_name || '—';
  const accountant = [summary.profile.accountant_name, summary.profile.accountant_email].filter(Boolean).join(' · ');
  const prefixes = locale === 'en' ? { expense: 'E', income: 'I', mileage: 'M' } : { expense: 'D', income: 'R', mileage: 'K' };
  const completeExpenses = completeExpenseLines(summary);
  const incompleteExpenses = incompleteExpenseLines(summary);
  const noPhoto = expensesWithoutReceipt(summary);
  const incompleteDays = incompleteMileageDays(summary);
  const months = monthlyBuckets(summary);
  const showMonths = summary.period.kind !== 'monthly' && months.length > 1;
  const vehiclesKm = mileageByVehicle(summary);
  const preparedOn = summary.generated_on
    ? formatDate(summary.generated_on, locale, country)
    : '—';

  const flags: string[] = [];
  if (noPhoto.length) flags.push(fill(t.missingReceipts, { count: noPhoto.length }));
  if (incompleteExpenses.length) flags.push(fill(t.incompleteExpenses, { count: incompleteExpenses.length }));
  if (incompleteDays.length) flags.push(fill(t.incompleteMileage, { count: incompleteDays.length }));

  const findingItems = summary.findings.map(
    (row) =>
      `<li><strong>${esc(localize(row.title_i18n, locale))}</strong> — ${esc(localize(row.description_i18n, locale))}</li>`,
  );

  const expenseRow = (row: PackageExpenseLine, index: number, warn = false) => `<tr class="${warn ? 'warn' : ''}">
    <td>${esc(lineRef(prefixes.expense, index))}</td>
    <td>${esc(formatDate(row.incurred_on, locale, country))}</td>
    <td>${esc(row.vendor_name || '—')}</td>
    <td>${esc(localize(row.category_i18n, locale, t.uncategorized))}</td>
    <td class="num">${money(row.amount, row.currency || currency, locale, country)}</td>
    <td class="num">${row.tax_amount == null ? '—' : money(row.tax_amount, row.currency || currency, locale, country)}</td>
    <td>${esc(row.has_receipt ? t.receipt : t.noReceipt)}</td>
    <td>${notesCell(row.reference_number, row.notes, warn ? t.notInTotals : null)}</td>
  </tr>`;

  const expenseHead = `<thead><tr>
    <th>${esc(t.ref)}</th><th>${esc(t.date)}</th><th>${esc(t.vendor)}</th><th>${esc(t.category)}</th>
    <th class="num">${esc(t.amount)}</th><th class="num">${esc(t.tax)}</th><th></th><th>${esc(t.notes)}</th>
  </tr></thead>`;

  const groupedComplete = showMonths
    ? groupByMonth(completeExpenses, (row) => row.incurred_on)
    : [{ month: '', rows: completeExpenses }];

  let expenseIndex = 0;
  const expenseBlocks = groupedComplete
    .map(({ month, rows }) => {
      const body = rows
        .map((row) => expenseRow(row, expenseIndex++, false))
        .join('');
      const subtotal = rows.reduce((sum, row) => sum + row.amount, 0);
      const heading = month
        ? `<p class="group">${esc(formatYearMonth(month, locale, country))} · ${rows.length} ${esc(t.lines)}</p>`
        : '';
      const foot =
        showMonths && rows.length
          ? `<tr class="subtotal"><td colspan="4">${esc(t.subtotal)}</td><td class="num">${money(subtotal, currency, locale, country)}</td><td colspan="3"></td></tr>`
          : '';
      return `${heading}<table>${expenseHead}<tbody>${body}${foot}</tbody></table>`;
    })
    .join('');

  const incompleteExpenseTable = incompleteExpenses.length
    ? `<p class="group">${esc(t.draft)} · ${esc(t.notInTotals)}</p>
       <table>${expenseHead}<tbody>${incompleteExpenses.map((row, index) => expenseRow(row, completeExpenses.length + index, true)).join('')}</tbody></table>`
    : '';

  const incomeRow = (row: PackageIncomeLine, index: number) => `<tr>
    <td>${esc(lineRef(prefixes.income, index))}</td>
    <td>${esc(formatDate(row.received_on, locale, country))}</td>
    <td>${esc(row.source_name)}</td>
    <td>${esc(incomeKindLabel(row.source_kind, t))}</td>
    <td class="num">${money(row.amount, row.currency || currency, locale, country)}</td>
    <td>${notesCell(row.reference_number, row.notes)}</td>
  </tr>`;

  const incomeHead = `<thead><tr>
    <th>${esc(t.ref)}</th><th>${esc(t.date)}</th><th>${esc(t.source)}</th><th>${esc(t.kind)}</th>
    <th class="num">${esc(t.amount)}</th><th>${esc(t.notes)}</th>
  </tr></thead>`;

  const groupedIncome = showMonths
    ? groupByMonth(summary.income, (row) => row.received_on)
    : [{ month: '', rows: summary.income }];

  let incomeIndex = 0;
  const incomeBlocks = groupedIncome
    .map(({ month, rows }) => {
      if (!rows.length) return '';
      const body = rows.map((row) => incomeRow(row, incomeIndex++)).join('');
      const subtotal = rows.reduce((sum, row) => sum + row.amount, 0);
      const heading = month
        ? `<p class="group">${esc(formatYearMonth(month, locale, country))} · ${rows.length} ${esc(t.lines)}</p>`
        : '';
      const foot =
        showMonths && rows.length
          ? `<tr class="subtotal"><td colspan="4">${esc(t.subtotal)}</td><td class="num">${money(subtotal, currency, locale, country)}</td><td></td></tr>`
          : '';
      return `${heading}<table>${incomeHead}<tbody>${body}${foot}</tbody></table>`;
    })
    .join('');

  let mileageIndex = 0;
  const groupedMileage = showMonths
    ? groupByMonth(summary.daily_mileage, (row) => row.date)
    : [{ month: '', rows: summary.daily_mileage }];

  const mileageBlocks = groupedMileage
    .map(({ month, rows }) => {
      if (!rows.length) return '';
      const body = rows
        .map((row) => {
          const warn = !isCompleteMileageDay(row);
          const html = `<tr class="${warn ? 'warn' : ''}">
            <td>${esc(lineRef(prefixes.mileage, mileageIndex))}</td>
            <td>${esc(formatDate(row.date, locale, country))}</td>
            <td>${esc(row.vehicle)}</td>
            <td class="num">${row.start == null ? '—' : esc(String(row.start))}</td>
            <td class="num">${row.end == null ? '—' : esc(String(row.end))}</td>
            <td class="num">${row.distance == null ? '—' : esc(formatDistance(row.distance, row.unit, locale, country))}</td>
            <td>${esc(mileageNote(row, t))}</td>
          </tr>`;
          mileageIndex += 1;
          return html;
        })
        .join('');
      const heading = month ? `<p class="group">${esc(formatYearMonth(month, locale, country))}</p>` : '';
      return `${heading}<table>
        <thead><tr>
          <th>${esc(t.ref)}</th><th>${esc(t.date)}</th><th>${esc(t.vehicles)}</th>
          <th class="num">${esc(t.start)} (${esc(unit)})</th><th class="num">${esc(t.end)} (${esc(unit)})</th>
          <th class="num">${esc(t.distance)}</th><th>${esc(t.observation)}</th>
        </tr></thead>
        <tbody>${body}</tbody>
      </table>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { margin: 16mm; }
    body { font-family: Helvetica, Arial, sans-serif; color: #0C140E; font-size: 11px; line-height: 1.45; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    h2 { font-size: 14px; margin: 22px 0 8px; page-break-after: avoid; }
    h3 { font-size: 12px; margin: 16px 0 6px; }
    .muted { color: #3E5344; }
    .kicker { text-transform: uppercase; letter-spacing: 0.04em; font-size: 10px; color: #3E5344; margin: 0 0 4px; }
    .banner { background: #E6F9E9; border: 1px solid #C9E6CE; padding: 10px 12px; margin: 12px 0 16px; }
    .cover { display: table; width: 100%; margin: 8px 0 12px; }
    .cover p { margin: 3px 0; }
    ol.howto { padding-left: 18px; margin: 8px 0 0; }
    ol.howto li { margin: 0 0 4px; }
    table { width: 100%; border-collapse: collapse; margin: 0 0 12px; }
    th, td { text-align: left; padding: 5px 4px; border-bottom: 1px solid #C9E6CE; vertical-align: top; }
    th { font-size: 10px; color: #3E5344; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    .num { text-align: right; white-space: nowrap; }
    .totals td { font-weight: 700; }
    .subtotal td { font-weight: 700; border-top: 1px solid #0C140E; background: #F4F7F4; }
    .warn td { background: #FFF6E8; }
    .group { font-weight: 700; margin: 14px 0 4px; }
    .toc li { margin: 2px 0; }
  </style>
</head>
<body>
  <p class="kicker">${esc(t.docType)}</p>
  <h1>${esc(t.title)}</h1>
  <div class="cover">
    <p><strong>${esc(t.period)}</strong> : ${esc(periodLabel)}</p>
    <p class="muted">${esc(fill(t.fromTo, { start: formatDate(summary.period.start, locale, country), end: formatDate(summary.period.end, locale, country) }))}</p>
    <p><strong>${esc(t.preparedFor)}</strong> : ${esc(name)}${summary.profile.occupancy ? ` · ${esc(t.occupation)} : ${esc(summary.profile.occupancy)}` : ''}</p>
    ${accountant ? `<p><strong>${esc(t.recipient)}</strong> : ${esc(accountant)}</p>` : ''}
    <p class="muted">${esc(t.preparedOn)} ${esc(preparedOn)}</p>
  </div>
  <div class="banner">${esc(t.disclaimer)}</div>

  <h2>1. ${esc(t.howTo)}</h2>
  <ol class="howto">
    <li>${esc(t.howTo1)}</li>
    <li>${esc(t.howTo2)}</li>
    <li>${esc(t.howTo3)}</li>
    <li>${esc(t.howTo4)}</li>
    <li>${esc(t.howTo5)}</li>
  </ol>

  <h2>2. ${esc(t.first)}</h2>
  ${
    flags.length || findingItems.length
      ? `<ul>${flags.map((item) => `<li>${esc(item)}</li>`).join('')}${findingItems.join('')}</ul>`
      : `<p>${esc(t.firstNone)}</p>`
  }

  <h2>3. ${esc(t.snapshot)}</h2>
  <p class="muted">${esc(t.totalsHint)}</p>
  <table class="totals">
    <tr><td>${esc(t.distance)}</td><td class="num">${esc(formatDistance(summary.totals.recorded_distance, unit, locale, country))}</td></tr>
    <tr><td>${esc(t.expenses)} (${esc(summary.totals.expense_count)})</td><td class="num">${money(summary.totals.recorded_expenses, currency, locale, country)}</td></tr>
    <tr><td>${esc(t.income)} (${esc(summary.totals.income_count)})</td><td class="num">${money(summary.totals.recorded_income, currency, locale, country)}</td></tr>
  </table>

  <h3>${esc(t.byCategory)}</h3>
  ${
    summary.expenses_by_category.length
      ? `<table><thead><tr><th>${esc(t.category)}</th><th class="num">${esc(t.lines)}</th><th class="num">${esc(t.amount)}</th></tr></thead><tbody>
        ${summary.expenses_by_category
          .map(
            (row) => `<tr>
              <td>${esc(localize(row.category_i18n, locale, t.uncategorized))}</td>
              <td class="num">${esc(row.count)}</td>
              <td class="num">${money(row.total, currency, locale, country)}</td>
            </tr>`,
          )
          .join('')}
      </tbody></table>`
      : `<p>${esc(t.none)}</p>`
  }

  <h3>${esc(t.bySource)}</h3>
  ${
    summary.income_by_source.length
      ? `<table><thead><tr><th>${esc(t.source)}</th><th class="num">${esc(t.lines)}</th><th class="num">${esc(t.amount)}</th></tr></thead><tbody>
        ${summary.income_by_source
          .map(
            (row) => `<tr>
              <td>${esc(row.source_name)}</td>
              <td class="num">${esc(row.count)}</td>
              <td class="num">${money(row.total, currency, locale, country)}</td>
            </tr>`,
          )
          .join('')}
      </tbody></table>`
      : `<p>${esc(t.none)}</p>`
  }

  ${
    showMonths
      ? `<h3>${esc(t.byMonth)}</h3>
        <table><thead><tr>
          <th>${esc(t.month)}</th>
          <th class="num">${esc(t.expenses)}</th>
          <th class="num">${esc(t.income)}</th>
          <th class="num">${esc(t.distance)}</th>
        </tr></thead><tbody>
        ${months
          .map(
            (row) => `<tr>
              <td>${esc(formatYearMonth(row.month, locale, country))}</td>
              <td class="num">${money(row.expenses, currency, locale, country)} (${esc(row.expenseCount)})</td>
              <td class="num">${money(row.income, currency, locale, country)} (${esc(row.incomeCount)})</td>
              <td class="num">${esc(formatDistance(row.distance, unit, locale, country))}</td>
            </tr>`,
          )
          .join('')}
        </tbody></table>`
      : ''
  }

  <h3>${esc(t.vehicles)}</h3>
  ${
    summary.vehicles.length
      ? `<ul>${summary.vehicles
          .map((row) => {
            const km = vehiclesKm.find((item) => item.vehicle === row.nickname);
            const identity = [row.nickname, row.make, row.model, row.plate].filter(Boolean).join(' · ');
            const stats = km
              ? ` — ${formatDistance(km.distance, km.unit, locale, country)}, ${km.days} ${t.vehicleDays}${km.incomplete ? `, ${km.incomplete} ${t.draft}` : ''}`
              : '';
            return `<li>${esc(identity)}${esc(stats)}</li>`;
          })
          .join('')}</ul>`
      : `<p>${esc(t.none)}</p>`
  }

  <h2>4. ${esc(t.expenseLines)}</h2>
  ${completeExpenses.length || incompleteExpenses.length ? `${expenseBlocks}${incompleteExpenseTable}` : `<p>${esc(t.none)}</p>`}

  <h2>5. ${esc(t.incomeLines)}</h2>
  ${summary.income.length ? incomeBlocks : `<p>${esc(t.none)}</p>`}

  <h2>6. ${esc(t.mileage)}</h2>
  ${summary.daily_mileage.length ? mileageBlocks : `<p>${esc(t.none)}</p>`}

  <p class="muted">${esc(t.disclaimer)}</p>
</body>
</html>`;
}

export function accountantPackageFilename(summary: AccountantPackageSummary): string {
  const year = summary.period.tax_year;
  if (summary.period.kind === 'monthly' && summary.period.month) {
    return `MileTax-${summary.period.month}.pdf`;
  }
  if (summary.period.kind === 'semiannual') {
    return `MileTax-${year}-S${summary.period.half ?? 1}.pdf`;
  }
  return `MileTax-${year}.pdf`;
}
