import type { ReceiptDraft } from './ocr/provider';

let draft: ReceiptDraft | null = null;
const listeners = new Set<(next: ReceiptDraft | null) => void>();

function emit() {
  for (const listener of listeners) listener(draft);
}

export function setReceiptDraft(next: ReceiptDraft) {
  draft = next;
  emit();
}

export function getReceiptDraft(): ReceiptDraft | null {
  return draft;
}

export function clearReceiptDraft() {
  draft = null;
  emit();
}

export function subscribeReceiptDraft(listener: (next: ReceiptDraft | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
