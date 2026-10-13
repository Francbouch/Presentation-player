import { useCallback, useEffect, useRef, useState } from 'react';
import { createDemoDocument, migrateDocument, normalizeDocument, pruneDocument } from './document.js';
import { loadPreviousDocument, loadState, saveDocument, storageError, storageEstimate } from './storage.js';
import { refreshDemoVideo } from './demoMedia.js';

export function usePresentation() {
  const [document, setDocument] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [estimate, setEstimate] = useState(null);
  const [lastBackup, setLastBackup] = useState(null);
  const [hasPrevious, setHasPrevious] = useState(false);
  const current = useRef(null);
  const lastSaved = useRef(null);
  const storageRevision = useRef(0);
  const queue = useRef(Promise.resolve());
  const generation = useRef(0);

  useEffect(() => {
    if (status !== 'saving' && !(status === 'error' && document)) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [status, document]);

  const persist = useCallback(next => {
    const version = ++generation.current;
    setStatus('saving');
    queue.current = queue.current.catch(() => {}).then(async () => {
      storageRevision.current = await saveDocument(next, { expectedRevision: storageRevision.current });
      lastSaved.current = next;
      if (version === generation.current) { setStatus('saved'); setError(''); }
      setEstimate(await storageEstimate());
    }).catch(error => {
      if (version === generation.current) { setStatus('error'); setError(storageError(error)); }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      try {
        const saved = await loadState();
        const normalized = saved.exists ? migrateDocument(saved.document) : await createDemoDocument();
        const next = await refreshDemoVideo(normalized);
        if (cancelled) return;
        storageRevision.current = saved.revision;
        setLastBackup(saved.lastBackup);
        setHasPrevious(saved.hasPrevious);
        lastSaved.current = saved.document;
        current.current = next;
        setDocument(next);
        if (next !== saved.document) persist(next); else setStatus('saved');
        setEstimate(await storageEstimate());
      } catch (error) {
        if (!cancelled) { setStatus('error'); setError(`Impossible d’ouvrir la présentation sauvegardée. ${error.message}`); }
      }
    }
    initialize();
    return () => { cancelled = true; };
  }, [persist]);

  const update = useCallback(change => {
    const next = pruneDocument(normalizeDocument(typeof change === 'function' ? change(current.current) : change));
    current.current = next;
    setDocument(next);
    persist(next);
  }, [persist]);

  // Restaurer est une transaction : le projet en mémoire ne change qu’après
  // succès disque. L’ancien projet est conservé dans la même base avant-restore.
  const replace = useCallback(async imported => {
    await queue.current;
    if (current.current !== lastSaved.current) throw new Error('La présentation actuelle n’est pas sauvegardée. Exportez un ZIP et réessayez la sauvegarde avant de restaurer un autre projet.');
    const next = pruneDocument(normalizeDocument(imported));
    setStatus('saving');
    try {
      storageRevision.current = await saveDocument(next, { expectedRevision: storageRevision.current, checkpoint: true });
      current.current = next;
      lastSaved.current = next;
      setDocument(next);
      setHasPrevious(true);
      setStatus('saved'); setError('');
      setEstimate(await storageEstimate());
    } catch (error) {
      setStatus('error'); setError(storageError(error));
      throw new Error(`Restauration annulée : la présentation actuelle a été conservée. ${storageError(error)}`);
    }
  }, []);

  const recoverPrevious = useCallback(async () => {
    const previous = await loadPreviousDocument();
    if (!previous) throw new Error('Aucune copie locale précédente disponible. Importez une sauvegarde ZIP.');
    await replace(migrateDocument(previous));
  }, [replace]);

  const retry = useCallback(() => { if (current.current) persist(current.current); }, [persist]);
  return { document, update, replace, recoverPrevious, hasPrevious, status, error, estimate, retry, lastBackup, setLastBackup };
}

export function useMediaUrls(media) {
  const [urls, setUrls] = useState({});
  useEffect(() => {
    const next = Object.fromEntries(media.map(item => [item.id, URL.createObjectURL(item.blob)]));
    setUrls(next);
    return () => Object.values(next).forEach(url => URL.revokeObjectURL(url));
  }, [media]);
  return urls;
}
