const ALLOWED = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'DIV', 'SPAN']);

export function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function htmlToPlain(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function toEditorHtml(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (looksLikeHtml(trimmed)) return sanitizeLandingHtml(trimmed);
  return `<p>${escapeText(trimmed)}</p>`;
}

export function sanitizeLandingHtml(input: string) {
  if (typeof document === 'undefined') return htmlToPlain(input);
  const root = document.createElement('div');
  root.innerHTML = input.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  clean(root);
  return root.innerHTML;
}

function escapeText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

function clean(node: Node) {
  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === Node.COMMENT_NODE) {
      child.parentNode?.removeChild(child);
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const el = child as HTMLElement;
    if (el.tagName === 'FONT') {
      const span = document.createElement('span');
      const size = el.getAttribute('size');
      span.style.fontSize = size === '2' ? '14px' : size === '5' || size === '6' ? '28px' : size === '4' ? '22px' : '16px';
      span.innerHTML = el.innerHTML;
      el.replaceWith(span);
      clean(span);
      return;
    }
    if (!ALLOWED.has(el.tagName)) {
      const parent = el.parentNode;
      while (el.firstChild) parent?.insertBefore(el.firstChild, el);
      parent?.removeChild(el);
      return;
    }
    const align = el.style.textAlign;
    const fontSize = el.style.fontSize;
    for (const name of Array.from(el.getAttributeNames())) el.removeAttribute(name);
    if (align === 'center' || align === 'left' || align === 'right') el.style.textAlign = align;
    if (fontSize === '14px' || fontSize === '16px' || fontSize === '22px' || fontSize === '28px' || fontSize === '36px') {
      el.style.fontSize = fontSize;
    }
    clean(el);
  });
}
