export default function ButtonStateVisibility({ page, button, busy, change, apply }) {
  const future = typeof button.futureStateVisibility === 'boolean';
  const count = page.states.filter(state => state.visibility[button.id] ?? button.visible).length;
  const inherited = page.states.length && (count === 0 || count === page.states.length) ? count > 0 : button.visible;
  return <details className="property-section"><summary>Appliquer à tous les états</summary>
    <div className="button-row"><button className="ui-button" disabled={busy || !page.states.length && !future} onClick={() => apply(button.id, true)}>Afficher dans tous les états</button>
      <button className="ui-button" disabled={busy || !page.states.length && !future} onClick={() => apply(button.id, false)}>Masquer dans tous les états</button></div>
    <p className="help" role="status">{page.states.length ? `Visible dans ${count} état(s) sur ${page.states.length}.` : 'Aucun état interactif sur cette page.'} Les réglages individuels restent modifiables. Le bouton reste sélectionnable dans les calques.</p>
    <label className="checkbox-field"><input type="checkbox" disabled={busy} checked={future} onChange={event => change(button.id, { futureStateVisibility: event.target.checked ? inherited : undefined })} />Appliquer aussi aux nouveaux états</label>
    {future && <label className="field">Visibilité des nouveaux états<select aria-label="Visibilité des nouveaux états" disabled={busy} value={button.futureStateVisibility ? 'show' : 'hide'} onChange={event => change(button.id, { futureStateVisibility: event.target.value === 'show' })}><option value="show">Afficher</option><option value="hide">Masquer</option></select></label>}
    <p className="help">La configuration de la page sans état reste inchangée. Les états dupliqués conservent leurs réglages d’origine.</p>
  </details>;
}
