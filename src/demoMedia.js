// Mise à jour limitée au MP4 de démonstration livré dans les premières versions.
// Nom + taille + SHA-256 : aucune autre vidéo importée n’est transformée.
const OLD_DEMO_HASH = 'f2484ab05ba4187bc1258aeabdcd55174a6c34905cae4b029fa0a3bf0f4ed450';

export async function refreshDemoVideo(document) {
  if (!crypto.subtle) return document;
  const originals = [];
  for (const media of document.media) {
    if (media.name !== '01-02.mp4' || media.type !== 'video/mp4' || media.blob.size !== 52927) continue;
    const digest = await crypto.subtle.digest('SHA-256', await media.blob.arrayBuffer());
    const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
    if (hash === OLD_DEMO_HASH) originals.push(media.id);
  }
  if (!originals.length) return document;
  try {
    const response = await fetch('/transitions/01-02.mp4');
    if (!response.ok) return document;
    const blob = await response.blob();
    return { ...document, media: document.media.map(media => originals.includes(media.id) ? { ...media, blob, type: 'video/mp4' } : media) };
  } catch {
    return document; // Le document reste accessible même si le média démo manque.
  }
}
