import {YouTubeSessions} from './YouTubeSurface.jsx';
import Presenter,{openAudienceWindow} from './Presenter.jsx';
import MediaRepair from './MediaRepair.jsx';
import {preparePageFonts} from './fonts.js';
import { useEffect, useState } from 'react';
import Editor from './Editor.jsx';
import Player from './Player.jsx';
import { useMediaUrls, usePresentation } from './usePresentation.js';

const noMedia = [];
const noPages = [];

export default function App() {
  const presentation = usePresentation();
  const { document, status, error, estimate, retry } = presentation;
  const urls = useMediaUrls(document?.media || noMedia);
  const [audience,setAudience]=useState(null);
  const [mode, setMode] = useState('editor');
  const [selectedId, setSelectedId] = useState(null);
  const [autoFullscreen, setAutoFullscreen] = useState(false);
  const [transitionBusy, setTransitionBusy] = useState(false);
  const pages = document?.pages || noPages;
  const [fontError,setFontError]=useState(false);
  const [fontRetry,setFontRetry]=useState(0);
  useEffect(()=>{let live=true;setFontError(false);Promise.all(pages.map(preparePageFonts)).catch(()=>{if(live)setFontError(true);});return()=>{live=false;};},[pages,fontRetry]);
  const index = Math.max(0, pages.findIndex(page => page.id === selectedId));
  const selected = pages[index];
  const storageWarning = estimate?.quota && estimate.usage / estimate.quota > .85;
  function travelPages(direction) {
    const result = presentation[direction]();
    if (result && Object.hasOwn(result, 'selectedPageId')) setSelectedId(result.selectedPageId);
  }
  function launch(fullscreen = true) { if (pages.length) { setAutoFullscreen(fullscreen); setMode('player'); } }

  const chrome = {
    brand: <span className="brand"><span className="brand-icon">▰</span> studio<span className="brand-dot">.</span></span>,
    modes: <div className="mode-tabs app-mode-switch" aria-label="Mode de l’application"><button title="Mode Éditeur" aria-label="Éditeur" aria-pressed={mode === 'editor'} disabled={transitionBusy} onClick={() => setMode('editor')}>Éditeur</button><button title="Mode Présentation" aria-label="Présentation" aria-pressed={mode === 'player'} disabled={!pages.length || transitionBusy} onClick={() => launch(false)}>Présentation</button></div>,
    presenter: <button className="ui-button" disabled={!pages.length || transitionBusy} onClick={()=>{setAudience(openAudienceWindow());setMode('presenter');}}>Vue Présentateur</button>,
    status: <span className={`save-status ${status}`} role="status" title={status === 'saved' ? 'Sauvegardé dans ce navigateur' : status === 'saving' ? 'Sauvegarde en cours' : 'Projet non sauvegardé'}>{status === 'loading' ? 'Chargement…' : status === 'saving' ? 'Sauvegarde…' : status === 'saved' ? '✓ Sauvegardé dans ce navigateur' : '⚠ Non sauvegardé'}</span>,
    noticeCount: Number(fontError) + Number(!!error) + Number(!!storageWarning),
    urgent: fontError ? 'font' : error || (storageWarning ? 'quota' : ''),
    notices: <>
    {fontError && <div className="alert" role="alert">Une police est indisponible. Une police de remplacement est utilisée. Reconnectez-vous puis réessayez avant de présenter.<button className="ui-button" onClick={()=>setFontRetry(n=>n+1)}>Réessayer les polices</button></div>}
    {error && <div className="alert" role="alert">{error} {document ? <button className="ui-button" onClick={retry}>Réessayer la sauvegarde</button> : <button className="ui-button" onClick={() => window.location.reload()}>Réessayer</button>}</div>}
    {error && document && mode==='editor' && <MediaRepair document={document} update={presentation.update}/>}
    {storageWarning && <div className="alert" role="alert">Le stockage de ce navigateur est presque plein. Exportez votre présentation et libérez de l’espace avant d’ajouter de gros médias.</div>}
</>
  };
  return <YouTubeSessions key={mode}><main className={`app ${mode === 'editor' ? 'editor-app' : ''}`}>
    {(!document || mode !== 'editor') && <><header>{chrome.brand}{chrome.modes}{chrome.status}</header>{chrome.notices}</>}
    {!document ? <div className="loading-panel">{status === 'loading' ? 'Ouverture de votre présentation…' : 'Votre présentation existante n’a pas été modifiée. Vérifiez que ce navigateur autorise le stockage des sites.'}</div> : mode === 'editor' ?
      <Editor chrome={chrome} beginGesture={presentation.beginGesture} endGesture={presentation.endGesture} document={document} urls={urls} update={presentation.update} commitMedia={presentation.commitMedia} replace={presentation.replace} recoverPrevious={presentation.recoverPrevious} hasPrevious={presentation.hasPrevious} lastBackup={presentation.lastBackup} onBackup={presentation.setLastBackup} selected={selected} selectedIndex={index} onSelect={setSelectedId} onLaunch={id => { if (typeof id === 'string') setSelectedId(id); launch(true); }} estimate={estimate} undo={() => travelPages('undo')} redo={() => travelPages('redo')} canUndo={presentation.canUndo} canRedo={presentation.canRedo} onBusyChange={setTransitionBusy} /> : mode==='presenter' ? <Presenter presentation={document} pages={pages} urls={urls} startIndex={index} audience={audience} onExit={()=>{setMode('editor');setTransitionBusy(false);}} onBusyChange={setTransitionBusy}/> :
      <Player document={document} pages={pages} urls={urls} startIndex={index} onExit={() => setMode('editor')} autoFullscreen={autoFullscreen} onBusyChange={setTransitionBusy} />}
    <footer><span>Vos médias restent dans votre navigateur. Exportez un ZIP pour les partager ou les sauvegarder.</span><span>PNG · JPG · WebP · MP4 · WebM</span></footer>
  </main></YouTubeSessions>;
}
