export type ParsedReceipt = {
  merchant_name?: string;
  incurred_on?: string;
  incurred_time?: string;
  total?: number;
  currency?: string;
  confidence: number;
  raw_text: string;
};

const MONTHS: Record<string, string> = {
  jan: '01',
  janu: '01',
  janv: '01',
  january: '01',
  feb: '02',
  fevr: '02',
  févr: '02',
  february: '02',
  mar: '03',
  mars: '03',
  march: '03',
  apr: '04',
  avr: '04',
  april: '04',
  avril: '04',
  may: '05',
  mai: '05',
  jun: '06',
  juin: '06',
  june: '06',
  jul: '07',
  juil: '07',
  july: '07',
  aug: '08',
  aou: '08',
  aout: '08',
  août: '08',
  aogt: '08',
  ao0t: '08',
  a0u: '08',
  a0ut: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  déc: '12',
  december: '12',
  décembre: '12',
};

const SKIP_LINE =
  /^(achat|purchase|total|sous[- ]?total|subtotal|tps|tvq|tvp|gst|hst|pst|qst|litres?|prix|price|debit|credit|visa|mastercard|mcard|interac|merci|thank|welcome|bienvenue|copy|copie|reçu|receipt|cad|usd|taxe?s?|tel|tél|phone|fax|www|http|https|invoice|facture|terminal|auth|approuve|approuvé|signature|copie marchand|merchant copy|produit)$/i;

const ADDRESS_LINE =
  /\b(rue|street|st\.|blvd|boul|avenue|ave\.|chemin|ch\.|cher|route|rd\.|cp|c\.p\.|qc|on|ab|bc|canada|h[0-9][a-z][0-9]|j[0-9][a-z][0-9])\b/i;

const KNOWN_MERCHANTS: Array<{ match: RegExp; name: string }> = [
  { match: /baktar/i, name: 'Dépanneur Baktar' },
  { match: /depanne?ur\s+baktar/i, name: 'Dépanneur Baktar' },
  { match: /harnois/i, name: 'Harnois' },
  { match: /\besso\b/i, name: 'Esso' },
  { match: /petro[\s-]?canada/i, name: 'Petro-Canada' },
  { match: /\bshell\b/i, name: 'Shell' },
  { match: /\bultramar\b/i, name: 'Ultramar' },
  { match: /couche[\s-]?tard/i, name: 'Couche-Tard' },
  { match: /circle[\s-]?k\b/i, name: 'Circle K' },
  { match: /\birving\b/i, name: 'Irving' },
  { match: /\bhusky\b/i, name: 'Husky' },
  { match: /\bmobil\b/i, name: 'Mobil' },
  { match: /canadian\s+tire/i, name: 'Canadian Tire' },
  { match: /tim\s*hortons?/i, name: 'Tim Hortons' },
  { match: /\bstarbucks\b/i, name: 'Starbucks' },
  { match: /\bwalmart\b/i, name: 'Walmart' },
  { match: /\bcostco\b/i, name: 'Costco' },
  { match: /\bsuper\s*c\b/i, name: 'Super C' },
  { match: /\bmetro\b/i, name: 'Metro' },
  { match: /\biga\b/i, name: 'IGA' },
  { match: /\bmaxi\b/i, name: 'Maxi' },
  { match: /\bprovigo\b/i, name: 'Provigo' },
  { match: /\brona\b/i, name: 'Rona' },
  { match: /home\s+depot/i, name: 'Home Depot' },
  { match: /bureau\s+en\s+gros/i, name: 'Bureau en Gros' },
  { match: /\bstaples\b/i, name: 'Staples' },
  { match: /\bsaq\b/i, name: 'SAQ' },
  { match: /\buber\b/i, name: 'Uber' },
  { match: /\blyft\b/i, name: 'Lyft' },
];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function parseNumber(raw: string): number | undefined {
  const cleaned = raw.replace(/[^\d,.-]/g, '').trim();
  if (!cleaned || cleaned === '-' || cleaned === '.') return undefined;
  let normalized = cleaned;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    normalized =
      cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
        ? cleaned.replace(/\./g, '').replace(',', '.')
        : cleaned.replace(/,/g, '');
  } else if (cleaned.includes(',')) {
    const decimals = cleaned.split(',')[1] ?? '';
    normalized = decimals.length <= 3 ? cleaned.replace(',', '.') : cleaned.replace(/,/g, '');
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
}

/** Les 0 barrés des tickets thermos se lisent souvent 8. On teste 8↔0 sur un montant. */
function eightZeroVariants(value: number): number[] {
  const raw = value.toFixed(2);
  const out = new Set<number>([round2(value)]);
  const chars = raw.split('');
  const walk = (index: number) => {
    if (index >= chars.length) {
      const next = Number(chars.join(''));
      if (Number.isFinite(next) && next > 0) out.add(round2(next));
      return;
    }
    walk(index + 1);
    if (chars[index] === '8') {
      chars[index] = '0';
      walk(index + 1);
      chars[index] = '8';
    } else if (chars[index] === '0') {
      chars[index] = '8';
      walk(index + 1);
      chars[index] = '0';
    }
  };
  walk(0);
  return [...out];
}

function moneyOnLine(line: string): Array<{ value: number; decimals: number }> {
  const found: Array<{ value: number; decimals: number }> = [];
  const pattern = /(?:CAD|USD|CA\$|US\$|\$)?\s*(\d{1,5}(?:[.,]\d{3})*[.,](\d{2,3})|\d+[.,](\d{2,3}))/gi;
  for (const match of line.matchAll(pattern)) {
    const raw = match[1] ?? '';
    const decimals = (match[2] ?? match[3] ?? '').length;
    const value = parseNumber(raw);
    if (value != null && value > 0 && value < 100_000) found.push({ value: round2(value), decimals });
  }
  return found;
}

function isNoiseAmountLine(line: string): boolean {
  return /\b(tps|tvq|tvp|gst|hst|pst|qst|tvh|litres?|prix\s*\/\s*l|price\s*\/\s*l|\$\s*\/\s*l|auth|terminal|approuve)\b/i.test(
    line,
  );
}

function parseFuel(text: string): { litres?: number; price?: number } {
  let litres: number | undefined;
  let price: number | undefined;
  for (const line of fold(text).split('\n')) {
    const litreMatch =
      line.match(/(\d+[.,]\d{2,3})\s*l(?:itres?)?\b/i) ?? line.match(/litres?\s*[:=]?\s*(\d+[.,]\d{2,3})/i);
    if (litreMatch) {
      const value = parseNumber(litreMatch[1] ?? '');
      if (value != null && value > 0 && value < 400) litres = value;
    }
    const priceMatch =
      line.match(/(?:prix|price)\s*\/\s*l(?:itre)?s?[^\d]{0,8}(\d+[.,]\d{2,3})/i) ??
      line.match(/\$\s*\/\s*l(?:itre)?s?[^\d]{0,8}(\d+[.,]\d{2,3})/i);
    if (priceMatch) {
      const value = parseNumber(priceMatch[1] ?? '');
      if (value != null && value > 0.2 && value < 5) price = value;
    }
  }
  return { litres, price };
}

function nearestToExpected(candidates: number[], expected: number, maxDelta = 0.16): number | undefined {
  let best: number | undefined;
  let bestDelta = maxDelta;
  for (const value of candidates) {
    for (const variant of eightZeroVariants(value)) {
      const delta = Math.abs(variant - expected);
      if (delta <= bestDelta) {
        best = variant;
        bestDelta = delta;
      }
    }
  }
  return best;
}

function parseTotal(text: string): number | undefined {
  const lines = text.split('\n');
  const labeled: number[] = [];
  for (const line of lines) {
    if (!/\b(grand\s*total|total\s*a\s*payer|total|montant|amount\s*due|à\s*payer|a\s*payer|balance)\b/i.test(line)) {
      continue;
    }
    if (/\bsous[- ]?total\b|\bsub[- ]?total\b/i.test(line)) continue;
    const amounts = moneyOnLine(line).filter((item) => item.decimals === 2);
    const last = amounts[amounts.length - 1];
    if (last) labeled.push(last.value);
  }
  for (const line of lines) {
    if (!/\bCAD\$|\bUSD\$|\bCA\$|\bUS\$/i.test(line) || isNoiseAmountLine(line)) continue;
    const amounts = moneyOnLine(line).filter((item) => item.decimals === 2 && item.value >= 1);
    const last = amounts[amounts.length - 1];
    if (last) labeled.push(last.value);
  }

  const { litres, price } = parseFuel(text);
  const product = litres != null && price != null ? litres * price : undefined;
  if (product != null) {
    const productCents = round2(product);
    const productDollar = round2(Math.round(product));
    const nearDollar = Math.abs(product - productDollar) <= 0.03;
    const targets = nearDollar ? [productDollar, productCents] : [productCents];
    const pool = labeled.length ? [...labeled] : [];
    if (!pool.length) {
      for (const line of lines) {
        if (isNoiseAmountLine(line)) continue;
        for (const item of moneyOnLine(line)) {
          if (item.decimals === 2 && item.value >= 1) pool.push(item.value);
        }
      }
    }
    const search = pool.length ? pool : targets;
    for (const target of targets) {
      if (nearestToExpected(search, target, 0.12) != null) return target;
    }
    if (pool.length) {
      const labeledLast = pool[pool.length - 1];
      if (labeledLast == null) return nearDollar ? productDollar : productCents;
      if (nearestToExpected([labeledLast], productCents, 0.12) != null) return productCents;
      if (Math.abs(labeledLast - productCents) > 2) return nearDollar ? productDollar : productCents;
      return labeledLast;
    }
    return nearDollar ? productDollar : productCents;
  }

  if (labeled.length) return labeled[labeled.length - 1];

  const candidates: number[] = [];
  for (const line of lines) {
    if (isNoiseAmountLine(line) || /\bsous[- ]?total\b/i.test(line)) continue;
    for (const item of moneyOnLine(line)) {
      if (item.decimals === 2 && item.value >= 1) candidates.push(item.value);
    }
  }
  if (!candidates.length) return undefined;
  return Math.max(...candidates);
}

function expandYear(year: number): number {
  if (year >= 100) return year;
  return year >= 70 ? 1900 + year : 2000 + year;
}

function isoDate(year: number, month: number, day: number): string | undefined {
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const fullYear = expandYear(year);
  if (fullYear < 2000 || fullYear > 2100) return undefined;
  const stamp = Date.UTC(fullYear, month - 1, day);
  const date = new Date(stamp);
  if (date.getUTCFullYear() !== fullYear || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return undefined;
  }
  return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDate(text: string): string | undefined {
  const folded = fold(text);
  const labeled = folded.match(
    /\bdate\s*[:\-]?\s*(\d{1,2})[-\/. ]+([A-Za-z0-9]{2,9}|\d{1,2})[.]?[-\/. ]+(\d{2,4})/i,
  );
  const named = folded.match(/\b(\d{1,2})[-\/. ]+([A-Za-z0-9]{2,9})[.]?[-\/. ]+(\d{2,4})\b/);
  const source = labeled ?? named;
  if (source) {
    const day = Number(source[1]);
    const monthToken = (source[2] ?? '').toLowerCase();
    const month = /^\d+$/.test(monthToken)
      ? monthToken.padStart(2, '0')
      : (MONTHS[monthToken] ?? MONTHS[monthToken.slice(0, 4)] ?? MONTHS[monthToken.slice(0, 3)]);
    const year = Number(source[3]);
    if (month) {
      const iso = isoDate(year, Number(month), day);
      if (iso) return iso;
    }
  }
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return isoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const dmy = text.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
  if (dmy) {
    const first = Number(dmy[1]);
    const second = Number(dmy[2]);
    const year = Number(dmy[3]);
    if (first > 12) return isoDate(year, second, first);
    if (second > 12) return isoDate(year, first, second);
    return isoDate(year, second, first);
  }
  return undefined;
}

function toTime(hour: number, minute: number): string | undefined {
  if (hour > 23 || minute > 59) return undefined;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function parseTime(text: string): string | undefined {
  const withSeconds = [...text.matchAll(/\b([01]?\d|2[0-3])[:hH]([0-5]\d)[:.]([0-5]\d)\b/g)];
  const labeled = text.match(
    /(?:heure|time|hr)\s*[:\-]?\s*(\d{1,2})\s*[hH:]\s*(\d{2})(?:\s*[:.]\s*\d{2})?/i,
  );
  const hm = [...text.matchAll(/\b([01]?\d|2[0-3])[:hH]([0-5]\d)\b/g)];
  const match = withSeconds[withSeconds.length - 1] ?? labeled ?? hm[hm.length - 1];
  if (!match) return undefined;
  return toTime(Number(match[1]), Number(match[2]));
}

function looksLikeOcrNoise(line: string): boolean {
  const folded = fold(line);
  if (/(eee|iii|www|ae see|te eee|pre te)/i.test(folded)) return true;
  const words = folded.split(/\s+/).filter(Boolean);
  if (words.length >= 3 && words.every((word) => word.length <= 3)) return true;
  const letters = folded.replace(/[^a-z]/gi, '');
  const vowels = (letters.match(/[aeiouy]/gi) ?? []).length;
  if (letters.length >= 8 && vowels / letters.length < 0.2) return true;
  return false;
}

function isPlausibleMerchant(line: string): boolean {
  if (looksLikeOcrNoise(line)) return false;
  const words = line.split(/\s+/).filter((word) => /[A-Za-zÀ-ÿ]{3,}/.test(word));
  return words.some((word) => word.length >= 4);
}

function parseMerchant(text: string): string | undefined {
  const depanneur = text.match(/depanne?ur\s+([A-Za-zÀ-ÿ]{3,})/i);
  if (depanneur?.[1] && !looksLikeOcrNoise(depanneur[1])) {
    return `Dépanneur ${depanneur[1].charAt(0).toUpperCase()}${depanneur[1].slice(1).toLowerCase()}`;
  }
  for (const brand of KNOWN_MERCHANTS) {
    if (brand.match.test(text)) return brand.name;
  }
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (line.length < 4 || line.length > 48) continue;
    if (SKIP_LINE.test(line)) continue;
    if (/\b(litres?|produit|ordinaire|approuv)/i.test(line)) continue;
    if (ADDRESS_LINE.test(line)) continue;
    if (/^\d/.test(line) || moneyOnLine(line).length) continue;
    if (/^[\d\s:./$+\-()]+$/.test(line)) continue;
    if (/\d{3}[\s.-]\d{3}/.test(line)) continue;
    if (!isPlausibleMerchant(line)) continue;
    return line.slice(0, 80);
  }
  return undefined;
}

function parseCurrency(text: string): string | undefined {
  if (/\bUSD\b|US\$/i.test(text)) return 'USD';
  if (/\bCAD\b|CA\$/i.test(text)) return 'CAD';
  return undefined;
}

/** Commerce, date, heure, total — uniquement ce qui est lisible. */
export function parseReceiptFromText(text: string, engineConfidence = 0): ParsedReceipt {
  const raw_text = text.replace(/\r/g, '\n');
  const normalized = raw_text.replace(/TVP/gi, 'TVQ');
  const total = parseTotal(normalized);
  const merchant = parseMerchant(normalized);
  const date = parseDate(normalized);
  const time = parseTime(normalized);
  const currency = parseCurrency(normalized);

  let confidence = 0;
  if (total != null) confidence += 0.4;
  if (merchant) confidence += 0.25;
  if (date) confidence += 0.2;
  if (time) confidence += 0.1;
  if (engineConfidence > 0) confidence = Math.min(0.92, confidence * 0.75 + Math.min(engineConfidence, 0.55) * 0.25);
  else confidence = Math.min(0.92, confidence);

  const result: ParsedReceipt = { confidence, raw_text };
  if (merchant) result.merchant_name = merchant;
  if (date) result.incurred_on = date;
  if (time) result.incurred_time = time;
  if (total != null) result.total = total;
  if (currency) result.currency = currency;
  if (!hasReceiptValues(result)) result.confidence = 0;
  return result;
}

export function hasReceiptValues(
  parsed: Pick<ParsedReceipt, 'total' | 'merchant_name' | 'incurred_on' | 'incurred_time'>,
): boolean {
  return parsed.total != null || Boolean(parsed.merchant_name) || Boolean(parsed.incurred_on) || Boolean(parsed.incurred_time);
}
