let connection;

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

export async function saveDocument(document, { expectedRevision, checkpoint = false } = {}) {
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
