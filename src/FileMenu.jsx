import { useEffect, useId, useRef, useState } from 'react';

export default function FileMenu({ busy, hasPrevious, onExport, onAutonomous, onImport, onProtect, onRecover, children }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const menu = useRef(null);
  const id = useId();
  const initialFocus = useRef(0);
  const items = () => [...menu.current.querySelectorAll('[role="menuitem"]:not(:disabled)')];
  useEffect(() => {
    if (!open) return;
    const available = items();
    available[initialFocus.current === -1 ? available.length - 1 : 0]?.focus();
    function outside(event) { if (!root.current.contains(event.target)) setOpen(false); }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  function close() { setOpen(false); trigger.current.focus(); }
  function command(callback) { close(); callback(); }
  function keydown(event) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const available = items(), index = available.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? available.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + available.length) % available.length;
      available[next]?.focus();
    } else if (event.key === 'Tab') close();
  }
  return <div className="file-menu" ref={root} onKeyDown={event => { if (open) keydown(event); }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button className="ui-button file-trigger" ref={trigger} aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => { initialFocus.current = 0; setOpen(!open); }} onKeyDown={event => {
      if (!open && ['ArrowDown','ArrowUp'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); initialFocus.current = event.key === 'ArrowUp' ? -1 : 0; setOpen(true); }
    }}>Fichier <span aria-hidden="true">⌄</span></button>
    {open && <div className="file-dropdown" id={id} ref={menu} role="menu" aria-label="Fichier">
      <div role="group" aria-label="Projet"><p className="file-group" aria-hidden="true">Projet</p>
        <button role="menuitem" tabIndex={-1} disabled={busy} onClick={() => command(onExport)}><span aria-hidden="true">↓</span>Sauvegarder mon projet</button>
        <button role="menuitem" tabIndex={-1} disabled={busy} onClick={() => command(onImport)}><span aria-hidden="true">↑</span>Importer un ZIP</button>
        {onAutonomous&&<button role="menuitem" tabIndex={-1} disabled={busy} onClick={() => command(onAutonomous)}><span aria-hidden="true">▷</span>Télécharger une présentation autonome</button>}
      </div>
      <div role="separator" className="file-separator" />
      <div role="group" aria-label="Stockage et récupération"><p className="file-group" aria-hidden="true">Stockage et récupération</p>
        <button role="menuitem" tabIndex={-1} disabled={busy} onClick={() => command(onProtect)}><span aria-hidden="true">◇</span>Protéger le stockage local</button>
        <button role="menuitem" tabIndex={-1} disabled={busy || !hasPrevious} title={!hasPrevious ? 'Aucun projet précédent à récupérer.' : undefined} onClick={() => command(onRecover)}><span aria-hidden="true">↶</span>Récupérer le projet précédent</button>
      </div>
      <div className="file-info" role="none">{children}</div>
    </div>}
  </div>;
}
