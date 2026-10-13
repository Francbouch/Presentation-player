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
  const history = useRef({ past: [], future: [] });
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  function refreshHistory() { setHistoryState({ canUndo: history.current.past.length > 0, canRedo: history.current.future.length > 0 }); }

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
    history.current.past = [...history.current.past.slice(-19), current.current];
    history.current.future = [];
    refreshHistory();
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
      history.current = { past: [], future: [] };
      refreshHistory();
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
  function travel(direction) {
    const from = direction === 'undo' ? 'past' : 'future';
    const to = direction === 'undo' ? 'future' : 'past';
    const next = history.current[from].pop();
    if (!next) return;
    history.current[to].push(current.current);
    current.current = next;
    setDocument(next);
    refreshHistory();
    persist(next);
  }
  return { document, update, replace, recoverPrevious, hasPrevious, status, error, estimate, retry, lastBackup, setLastBackup, ...historyState, undo: () => travel('undo'), redo: () => travel('redo') };
}

export function useMediaUrls(media) {
  const [urls, setUrls] = useState({});
  const cache = useRef(new Map());
  useEffect(() => {
    const ids = new Set(media.map(item => item.id));
    for (const [id, entry] of cache.current) {
      if (!ids.has(id) || media.find(item => item.id === id)?.blob !== entry.blob) { URL.revokeObjectURL(entry.url); cache.current.delete(id); }
    }
    for (const item of media) if (!cache.current.has(item.id)) cache.current.set(item.id, { blob: item.blob, url: URL.createObjectURL(item.blob) });
    setUrls(Object.fromEntries([...cache.current].map(([id, entry]) => [id, entry.url])));
  }, [media]);
  useEffect(() => () => { for (const entry of cache.current.values()) URL.revokeObjectURL(entry.url); cache.current.clear(); }, []);
  return urls;
}
