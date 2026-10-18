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
  const deferred = useRef(null);
  const saveTimer = useRef(null);
  const typingGroup = useRef(null);
  const gestureGroup = useRef(null);
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
  const flushTextSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    const next = deferred.current;
    deferred.current = null;
    if (next) persist(next);
  }, [persist]);

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

  const update = useCallback((change, options = {}) => {
    const next = pruneDocument(normalizeDocument(typeof change === 'function' ? change(current.current) : change));
    if (!options.autoMeasure) {
      const grouped = gestureGroup.current?.recorded || options.typingId && typingGroup.current?.id === options.typingId && Date.now() - typingGroup.current.time < 1500;
      if (!grouped) history.current.past = [...history.current.past.slice(-99), current.current];
      if(gestureGroup.current)gestureGroup.current.recorded=true;
      history.current.future = [];
      typingGroup.current = options.typingId ? { id: options.typingId, time: Date.now() } : null;
    }
    refreshHistory();
    current.current = next;
    setDocument(next);
    clearTimeout(saveTimer.current);
    deferred.current = null;
    if (options.debounce || gestureGroup.current) {
      ++generation.current; // Une sauvegarde précédente ne doit pas afficher « terminé ».
      setStatus('saving');
      deferred.current = next;
      saveTimer.current = setTimeout(flushTextSave, 250);
    } else persist(next);
  }, [persist, flushTextSave]);

  // Restaurer est une transaction : le projet en mémoire ne change qu’après
  // succès disque. L’ancien projet est conservé dans la même base avant-restore.
  const replace = useCallback(async imported => {
    flushTextSave();
    await queue.current;
    if (current.current !== lastSaved.current) throw new Error('La présentation actuelle n’est pas sauvegardée. Exportez un ZIP et réessayez la sauvegarde avant de restaurer un autre projet.');
    const next = pruneDocument(normalizeDocument(imported));
    setStatus('saving');
    try {
      storageRevision.current = await saveDocument(next, { expectedRevision: storageRevision.current, checkpoint: true });
      current.current = next;
      lastSaved.current = next;
      history.current = { past: [], future: [] };
      typingGroup.current = null;
      refreshHistory();
      setDocument(next);
      setHasPrevious(true);
      setStatus('saved'); setError('');
      setEstimate(await storageEstimate());
    } catch (error) {
      setStatus('error'); setError(storageError(error));
      throw new Error(`Restauration annulée : la présentation actuelle a été conservée. ${storageError(error)}`);
    }
  }, [flushTextSave]);

  // Les fichiers remplacés restent dans les instantanés de l’historique.
  // La mémoire ne change qu’après une écriture transactionnelle réussie.
  const commitMedia = useCallback(async change => {
    flushTextSave();
    await queue.current;
    if (current.current !== lastSaved.current) throw new Error('Sauvegardez le projet actuel avant de remplacer les médias. Vous pouvez toujours exporter un ZIP.');
    const before = current.current;
    const next = pruneDocument(normalizeDocument(change(before)));
    setStatus('saving');
    try {
      storageRevision.current = await saveDocument(next, {expectedRevision:storageRevision.current});
      ++generation.current;
      history.current.past = [...history.current.past.slice(-99), before];
      history.current.future = [];
      typingGroup.current = null;
      refreshHistory();
      current.current = lastSaved.current = next;
      setDocument(next); setStatus('saved'); setError('');
      setEstimate(await storageEstimate());
    } catch (error) { setStatus('error'); setError(storageError(error)); throw new Error(storageError(error)); }
  }, [flushTextSave]);

  const recoverPrevious = useCallback(async () => {
    const previous = await loadPreviousDocument();
    if (!previous) throw new Error('Aucune copie locale précédente disponible. Importez une sauvegarde ZIP.');
    await replace(migrateDocument(previous));
  }, [replace]);

  const retry = useCallback(() => { clearTimeout(saveTimer.current); deferred.current = null; if (current.current) persist(current.current); }, [persist]);
  function beginGesture(){if(!gestureGroup.current){typingGroup.current=null;gestureGroup.current={recorded:false};}}
  function endGesture(){if(gestureGroup.current){gestureGroup.current=null;flushTextSave();}}
  function travel(direction) {
    gestureGroup.current=null;
    const from = direction === 'undo' ? 'past' : 'future';
    const to = direction === 'undo' ? 'future' : 'past';
    const next = history.current[from].pop();
    if (!next) return;
    clearTimeout(saveTimer.current); deferred.current = null; typingGroup.current = null;
    history.current[to].push(current.current);
    current.current = next;
    setDocument(next);
    refreshHistory();
    persist(next);
  }
  return { beginGesture, endGesture, document, update, commitMedia, replace, recoverPrevious, hasPrevious, status, error, estimate, retry, lastBackup, setLastBackup, ...historyState, undo: () => travel('undo'), redo: () => travel('redo') };
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
