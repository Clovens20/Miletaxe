import type { ReceiptDraft } from './ocr/provider';

let draft: ReceiptDraft | null = null;

export function setReceiptDraft(next: ReceiptDraft) {
  draft = next;
}

export function getReceiptDraft(): ReceiptDraft | null {
  return draft;
}

export function clearReceiptDraft() {
  draft = null;
}
