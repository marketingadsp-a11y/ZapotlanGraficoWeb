/**
 * Helper para procesar e insertar visores externos mediante iframe (Heyzine, Calaméo, Issuu, Flipsnack, etc.)
 */

export function extractIframeSrc(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();

  // 1. Si es un snippet HTML con <iframe ... src="..." ...>
  const srcMatch = trimmed.match(/src=["']?([^"'\s>]+)["']?/i);
  if (srcMatch && srcMatch[1]) {
    let url = srcMatch[1].trim();
    // Reemplazar entidades HTML si vienen codificadas
    url = url.replace(/&amp;/g, '&');
    return url;
  }

  // 2. Si es directamente una URL web
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // 3. Fallback: retornar string limpio
  return trimmed;
}

export function isValidIframeOrUrl(input: string): boolean {
  if (!input) return false;
  const src = extractIframeSrc(input);
  return src.startsWith('http://') || src.startsWith('https://');
}

export function buildStandardIframeCode(urlOrCode: string, title: string = 'Periódico Digital'): string {
  const src = extractIframeSrc(urlOrCode);
  if (!src) return urlOrCode;

  return `<iframe src="${src}" title="${title}" allowfullscreen="true" allow="autoplay; fullscreen; clipboard-write; web-share" scrolling="no" style="width: 100%; height: 600px; border: 0;"></iframe>`;
}
