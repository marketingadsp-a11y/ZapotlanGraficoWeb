/**
 * Transforma URLs de almacenamiento en la nube (Google Drive, Dropbox, etc.)
 * a URLs de streaming directo utilizables en elementos <audio src="...">
 */
export function formatAudioStreamUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  const url = rawUrl.trim();

  // 1. Google Drive:
  // Convertimos a nuestro endpoint proxy para evitar restricciones CORP de Google Drive
  const driveFileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    const fileId = driveFileMatch[1];
    return `/api/audio-proxy?id=${fileId}`;
  }

  const driveIdMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if ((url.includes('drive.google.com') || url.includes('docs.google.com') || url.includes('drive.usercontent.google.com')) && driveIdMatch && driveIdMatch[1]) {
    const fileId = driveIdMatch[1];
    return `/api/audio-proxy?id=${fileId}`;
  }

  // 2. Dropbox:
  // Reemplazar ?dl=0 con ?raw=1 para stream directo
  if (url.includes('dropbox.com')) {
    if (url.includes('?dl=0')) return url.replace('?dl=0', '?raw=1');
    if (url.includes('&dl=0')) return url.replace('&dl=0', '&raw=1');
    if (!url.includes('raw=1') && !url.includes('dl=1')) {
      return url.includes('?') ? `${url}&raw=1` : `${url}?raw=1`;
    }
  }

  return url;
}
