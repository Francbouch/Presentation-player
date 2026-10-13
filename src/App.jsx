import { useState } from 'react';
import Editor from './Editor.jsx';
import Player from './Player.jsx';
import { useMediaUrls, usePresentation } from './usePresentation.js';

const noMedia = [];

export default function App() {
  const presentation = usePresentation();
  const { document, status, error, estimate, retry } = presentation;
  const urls = useMediaUrls(document?.media || noMedia);
  const [mode, setMode] = useState('editor');
  const [selectedId, setSelectedId] = useState(null);
  const [autoFullscreen, setAutoFullscreen] = useState(false);
  const [transitionBusy, setTransitionBusy] = useState(false);
  const pages = document?.pages || [];
  const index = Math.max(0, pages.findIndex(page => page.id === selectedId));
  const selected = pages[index];
  const storageWarning = estimate?.quota && estimate.usage / estimate.quota > .85;
  function launch(fullscreen = true) { if (pages.length) { setAutoFullscreen(fullscreen); setMode('player'); } }

  return <main className={`app ${mode === 'editor' ? 'editor-app' : ''}`}>
    <header><span className="brand"><span className="brand-icon">▰</span> studio<span className="brand-dot">.</span></span>
      <div className="mode-tabs" aria-label="Mode de l’application"><button aria-pressed={mode === 'editor'} disabled={transitionBusy} onClick={() => setMode('editor')}>Éditeur</button><button aria-pressed={mode === 'player'} disabled={!pages.length || transitionBusy} onClick={() => launch(false)}>Présentation</button></div>
      <span className={`save-status ${status}`} role="status">{status === 'loading' ? 'Chargement…' : status === 'saving' ? 'Sauvegarde…' : status === 'saved' ? '✓ Sauvegardé dans ce navigateur' : '⚠ Non sauvegardé'}</span>
    </header>
    {error && <div className="alert" role="alert">{error} {document ? <button className="ui-button" onClick={retry}>Réessayer la sauvegarde</button> : <button className="ui-button" onClick={() => window.location.reload()}>Réessayer</button>}</div>}
    {storageWarning && <div className="alert" role="alert">Le stockage de ce navigateur est presque plein. Exportez votre présentation et libérez de l’espace avant d’ajouter de gros médias.</div>}
    {!document ? <div className="loading-panel">{status === 'loading' ? 'Ouverture de votre présentation…' : 'Votre présentation existante n’a pas été modifiée. Vérifiez que ce navigateur autorise le stockage des sites.'}</div> : mode === 'editor' ?
      <Editor document={document} urls={urls} update={presentation.update} replace={presentation.replace} recoverPrevious={presentation.recoverPrevious} hasPrevious={presentation.hasPrevious} lastBackup={presentation.lastBackup} onBackup={presentation.setLastBackup} selected={selected} selectedIndex={index} onSelect={setSelectedId} onLaunch={() => launch(true)} estimate={estimate} undo={presentation.undo} redo={presentation.redo} canUndo={presentation.canUndo} canRedo={presentation.canRedo} /> :
      <Player pages={pages} urls={urls} startIndex={index} onExit={() => setMode('editor')} autoFullscreen={autoFullscreen} onBusyChange={setTransitionBusy} />}
    <footer><span>Vos médias restent dans votre navigateur. Exportez un ZIP pour les partager ou les sauvegarder.</span><span>PNG · JPG · WebP · MP4 · WebM</span></footer>
  </main>;
}
