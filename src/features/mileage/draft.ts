import type { OdometerDraft } from './ocr/provider';

let draft: OdometerDraft | null = null;

export function setOdometerDraft(next: OdometerDraft) {
  draft = next;
}

export function getOdometerDraft(): OdometerDraft | null {
  return draft;
}

export function clearOdometerDraft() {
  draft = null;
}
