const MAX_READING = 9_999_999;
const MAX_PLAUSIBLE_JUMP = 2_500;
/** Seuil en dessous duquel on ne propose pas le chiffre. */
export const MIN_ACCEPT_CONFIDENCE = 0.55;

export type OdometerParseResult = {
  reading?: number;
  confidence: number;
  candidates: number[];
  rawText: string;
};

function pushUnique(found: number[], value: number) {
  if (!found.includes(value)) found.push(value);
}

function asOdometer(value: number): number | undefined {
  if (!Number.isInteger(value) || value < 0 || value > MAX_READING) return undefined;
  return value;
}

/**
 * Groupes de chiffres tels quels (espaces = milliers, ex. 147 727).
 * Aussi : chiffres OCR fragmentés ligne par ligne (ex. "2\\n3\\n9\\n7\\n1\\n8").
 */
export function collectCandidates(text: string, hint?: number): number[] {
  const found: number[] = [];
  const normalized = text.replace(/\r/g, '\n');
  const lines = normalized.split('\n');

  for (const line of lines) {
    const grouped = [...line.matchAll(/\b\d{1,3}(?:[\s,]\d{3}){1,2}\b/g)];
    for (const match of grouped) {
      const digits = (match[0] ?? '').replace(/[\s,]/g, '');
      if (digits.length < 4 || digits.length > 7) continue;
      const value = asOdometer(Number(digits));
      if (value != null) pushUnique(found, value);
    }

    const consecutive = [...line.matchAll(/\d+/g)];
    for (const match of consecutive) {
      const digits = match[0] ?? '';
      if (digits.length >= 4 && digits.length <= 7) {
        const value = asOdometer(Number(digits));
        if (value != null) pushUnique(found, value);
        continue;
      }
      // Compteur collé à la plage, ex. 435147727.
      if (digits.length === 8 || digits.length === 9) {
        const head = asOdometer(Number(digits.slice(0, 3)));
        const tail = asOdometer(Number(digits.slice(3)));
        if (head != null && String(head).length === 3) pushUnique(found, head);
        if (tail != null && String(tail).length >= 5 && String(tail).length <= 6) pushUnique(found, tail);
      }
    }
  }

  // OCR souvent casse chaque chiffre : rejoindre tous les digits et glisser des fenêtres 5–6.
  const digitStream = (normalized.match(/\d/g) ?? []).join('');
  if (digitStream.length >= 5) {
    for (let len = 6; len >= 5; len -= 1) {
      for (let i = 0; i <= digitStream.length - len; i += 1) {
        const slice = digitStream.slice(i, i + len);
        if (slice.startsWith('0')) continue;
        const value = asOdometer(Number(slice));
        if (value == null) continue;
        if (hint != null && Number.isFinite(hint)) {
          const delta = value - hint;
          if (delta < -50 || delta > MAX_PLAUSIBLE_JUMP * 2) continue;
        }
        pushUnique(found, value);
      }
    }
  }

  return found;
}

function scoreCandidate(value: number, hint?: number, hasLongerPeer?: boolean): number {
  const digits = String(value).length;
  let score = 0;
  if (digits >= 5 && digits <= 6) score += 5;
  else if (digits === 7) score += 3;
  else if (digits === 4) score += 1.5;
  else if (digits === 3) score += hasLongerPeer ? -4 : 0.5;
  else score -= 2;

  if (hint == null || !Number.isFinite(hint)) return score;
  const delta = value - hint;
  if (delta >= 0 && delta <= MAX_PLAUSIBLE_JUMP) score += 6;
  else if (delta >= 0 && delta <= 10_000) score += 2;
  else if (Math.abs(delta) / Math.max(hint, 1) <= 0.02) score += 3;
  else if (value < hint) score -= 4;
  return score;
}

/** Propose un relevé à partir du texte OCR, ou rien si c’est illisible. */
export function parseOdometerFromText(text: string, options?: { hint?: number }): OdometerParseResult {
  const rawText = text.trim();
  const hint = options?.hint;
  const candidates = collectCandidates(rawText, hint);
  if (!candidates.length) {
    return { confidence: 0, candidates, rawText };
  }

  const hasLong = candidates.some((value) => String(value).length >= 5);
  const ranked = [...candidates].sort(
    (a, b) => scoreCandidate(b, hint, hasLong) - scoreCandidate(a, hint, hasLong),
  );
  const reading = ranked[0];
  if (reading == null) {
    return { confidence: 0, candidates, rawText };
  }

  const bestScore = scoreCandidate(reading, hint, hasLong);
  const runnerUp = ranked[1];
  const closeSecond =
    runnerUp != null && Math.abs(scoreCandidate(runnerUp, hint, hasLong) - bestScore) < 1.5;

  let confidence = 0;
  if (bestScore >= 9 && !closeSecond) confidence = 0.88;
  else if (bestScore >= 6 && !closeSecond) confidence = 0.74;
  else if (bestScore >= 4 && !closeSecond) confidence = 0.62;
  else confidence = 0.42;

  if (candidates.length === 1 && String(reading).length >= 5) {
    confidence = Math.max(confidence, 0.72);
  }
  if (String(reading).length >= 5 && runnerUp != null && String(runnerUp).length <= 3) {
    confidence = Math.max(confidence, 0.76);
  }
  if (hint != null && reading >= hint && reading - hint <= MAX_PLAUSIBLE_JUMP && String(reading).length >= 5) {
    confidence = Math.max(confidence, 0.7);
  }

  if (String(reading).length <= 3 && hasLong) {
    return { confidence: 0, candidates, rawText };
  }

  if (confidence < MIN_ACCEPT_CONFIDENCE) {
    return { confidence, candidates, rawText };
  }

  return { reading, confidence, candidates, rawText };
}

export function readingFromUnknown(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const whole = Math.trunc(value);
    if (whole >= 0 && whole <= MAX_READING) return whole;
    return undefined;
  }
  if (typeof value === 'string') {
    return parseOdometerFromText(value).reading;
  }
  return undefined;
}
