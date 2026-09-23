/**
 * Transforma URLs de almacenamiento en la nube (Google Drive, Dropbox, etc.)
 * a URLs de streaming directo utilizables en elementos <audio src="...">
 */
export function formatAudioStreamUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  const url = rawUrl.trim();

  // 1. Google Drive:
  // Formato: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const driveFileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    const fileId = driveFileMatch[1];
    return `https://docs.google.com/uc?export=open&id=${fileId}`;
  }

  // Formato: https://drive.google.com/open?id=FILE_ID
  const driveIdMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if ((url.includes('drive.google.com') || url.includes('docs.google.com')) && driveIdMatch && driveIdMatch[1]) {
    const fileId = driveIdMatch[1];
    return `https://docs.google.com/uc?export=open&id=${fileId}`;
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
