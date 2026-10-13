// Une vidéo appartient à un passage précis, jamais à un numéro de page.
export function upgradeTimeline(document) {
  if (document.version >= 6) return document;
  return { ...document, transitions: document.pages.filter(page => page.transitionId).map(page => ({ id: crypto.randomUUID(), fromId: page.id, toId: document.pages[document.pages.indexOf(page) + 1]?.id || null, mediaId: page.transitionId, mode: 'video' })) };
}
export function passage(document, fromId, toId) {
  return document.transitions?.find(item => item.fromId === fromId && item.toId === toId);
}
export function associated(document, transition) {
  const index = document.pages.findIndex(page => page.id === transition.fromId);
  return index >= 0 && !!transition.toId && document.pages[index + 1]?.id === transition.toId;
}
export function transitionVideo(document, fromId, toId) {
  const item = passage(document, fromId, toId);
  return item?.mode === 'video' ? item.mediaId : null;
}
export function validateTimeline(document, ref) {
  const ids = new Set(), pairs = new Set();
  if (!Array.isArray(document.transitions) || document.transitions.length > 2000) throw new Error('Configuration de timeline invalide. Votre projet est conservé.');
  for (const item of document.transitions) {
    const pair = JSON.stringify([item?.fromId, item?.toId]);
    if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id) || ![item.fromId,item.toId].every(id => id === null || typeof id === 'string' && id.length > 0 && id.length <= 200) || item.fromId && item.fromId === item.toId || !(document.version >= 7 ? ['video','instant','visual'] : ['video','instant']).includes(item.mode) || item.mediaId !== null && !ref(item.mediaId, 'video') || item.fromId && item.toId && pairs.has(pair)) throw new Error('Configuration de timeline invalide. Votre projet est conservé.');
    ids.add(item.id); if (item.fromId && item.toId) pairs.add(pair);
  }
}
