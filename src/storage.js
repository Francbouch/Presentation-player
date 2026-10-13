import { snapshotBlob } from './mediaBlob.js';
let connection;
// Les copies ne sont réalisées qu’après l’erreur spécifique de Chrome.
// Les changements de texte ne relisent pas les médias déjà récupérés.
const recoveredBlobs = new WeakMap();
const invalidBlob = error => /InvalidBlob|Failed to write blobs/i.test(error?.message || '');
function cachedMedia(document) {
  if (!document?.media) return document;
  return { ...document, media: document.media.map(media => recoveredBlobs.has(media.blob) ? { ...media, blob: recoveredBlobs.get(media.blob) } : media) };
}
async function recoverMedia(document) {
  for (const media of document.media || []) {
    if (recoveredBlobs.has(media.blob)) continue;
    try {
      recoveredBlobs.set(media.blob, await snapshotBlob(media.blob));
    } catch {
      throw new Error(`Le média « ${media.name || 'sans nom'} » ne peut plus être relu. Le projet enregistré est conservé. Ouvrez « Réparer les médias provenant d’une clé USB » et rattachez son fichier original.`);
    }
  }
  return cachedMedia(document);
}

function openDatabase() {
  if (!connection) connection = new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('IndexedDB n’est pas disponible dans ce navigateur.')); return; }
    const request = indexedDB.open('presentation-studio', 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('documents')) request.result.createObjectStore('documents'); };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); connection = null; };
      resolve(db);
    };
    request.onerror = () => { connection = null; reject(request.error); };
    request.onblocked = () => { connection = null; reject(new Error('Fermez les autres onglets de l’application puis réessayez.')); };
  });
  return connection;
}

export async function loadState() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('documents', 'readonly');
    const store = transaction.objectStore('documents');
    const current = store.get('current');
    const exists = store.getKey('current');
    const previous = store.getKey('before-restore');
    const revision = store.get('revision');
    const backup = store.get('lastZipExport');
    transaction.oncomplete = () => resolve({ exists: exists.result !== undefined, document: current.result, hasPrevious: previous.result !== undefined, revision: revision.result ?? 0, lastBackup: backup.result ?? null });
    transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error('Lecture interrompue.'));
  });
}

export async function loadPreviousDocument() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('documents', 'readonly');
    const request = transaction.objectStore('documents').get('before-restore');
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = transaction.onabort = () => reject(transaction.error);
  });
}

async function writeDocument(document, { expectedRevision, checkpoint = false } = {}) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('documents', 'readwrite');
    const store = transaction.objectStore('documents');
    let failure;
    let nextRevision;
    store.get('revision').onsuccess = event => {
      const revision = event.target.result ?? 0;
      if (expectedRevision !== undefined && revision !== expectedRevision) {
        failure = new Error('Une autre fenêtre a modifié ce projet. Sauvegardez vos modifications en ZIP, puis actualisez cet onglet.');
        failure.name = 'ConflictError';
        transaction.abort();
        return;
      }
      nextRevision = revision + 1;
      try {
        if (checkpoint) store.get('current').onsuccess = event => {
          try { if (event.target.result !== undefined) store.put(event.target.result, 'before-restore'); }
          catch (error) { failure = error; transaction.abort(); }
        };
        store.put(document, 'current');
        store.put(nextRevision, 'revision');
      } catch (error) { failure = error; transaction.abort(); }
    };
    transaction.oncomplete = () => resolve(nextRevision);
    transaction.onerror = transaction.onabort = () => reject(failure || transaction.error || new Error('La sauvegarde a été interrompue.'));
  });
}

export async function saveDocument(document, options = {}) {
  try { return await writeDocument(cachedMedia(document), options); }
  catch (error) {
    if (!invalidBlob(error)) throw error;
    // La première transaction a été annulée. La nouvelle vérifie à nouveau
    // la révision et conserve le checkpoint dans la même transaction.
    const recovered = await recoverMedia(document);
    try { return await writeDocument(recovered, options); }
    catch (retryError) {
      if (invalidBlob(retryError)) throw new Error('Chrome refuse encore l’enregistrement des médias. Exportez votre projet en ZIP avant de fermer ou d’actualiser cette page. Vos données enregistrées n’ont pas été effacées.');
      throw retryError;
    }
  }
}

export async function markBackupExport() {
  const db = await openDatabase();
  const timestamp = Date.now();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction('documents', 'readwrite');
    transaction.objectStore('documents').put(timestamp, 'lastZipExport');
    transaction.oncomplete = resolve;
    transaction.onerror = transaction.onabort = () => reject(transaction.error);
  });
  return timestamp;
}

export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return false;
  return navigator.storage.persist();
}

export async function storageEstimate() {
  try { return await navigator.storage?.estimate?.() || null; } catch { return null; }
}

export function storageError(error) {
  if (error?.name === 'ConflictError') return error.message;
  if (error?.name === 'QuotaExceededError') return 'Espace de stockage insuffisant. Vos dernières modifications ne sont pas sauvegardées. Sauvegardez votre projet en ZIP, puis libérez de l’espace ou supprimez des médias.';
  return `La sauvegarde dans ce navigateur est indisponible. Sauvegardez votre projet en ZIP pour conserver vos modifications. ${error?.message || ''}`;
}
