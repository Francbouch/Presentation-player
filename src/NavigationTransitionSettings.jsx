import EffectSettings from './EffectSettings.jsx';
import ColorInput from './ProjectColors.jsx';
import {NAVIGATION_EFFECTS,navigationMode,setNavigationMode,defaultNavigationEffect} from './navigationTransition.js';
export default function NavigationTransitionSettings({action,change,changeAction,busy,children}){
 const mode=navigationMode(action),effect=action.navigationTransition?.effect||defaultNavigationEffect();
 const update=effect=>change({navigationTransition:{...action.navigationTransition,mode:'effect',effect}});
 return <><label className="field">Type de transition<select aria-label="Type de transition de navigation" value={mode} disabled={busy} onChange={e=>changeAction(setNavigationMode(action,e.target.value))}><option value="none">Aucune — instantanée</option><option value="effect">Effet animé</option><option value="video">Vidéo de transition</option></select></label>
 {mode==='effect'&&<><EffectSettings prefix="Transition de navigation" effects={NAVIGATION_EFFECTS} min={100} max={3000} value={effect} change={update} disabled={busy}/>
 {effect.type==='fade'&&<><label className="checkbox-field"><input type="checkbox" disabled={busy} checked={!!effect.fadeColor} onChange={e=>update({...effect,fadeColor:e.target.checked?'#161325':null})}/>Passer par une couleur</label>{effect.fadeColor&&<label className="field">Couleur de transition<ColorInput aria-label="Couleur du fondu simple" type="color" value={effect.fadeColor} onChange={e=>update({...effect,fadeColor:e.target.value})}/></label>}<p className="help">Sans couleur, le fondu laisse apparaître le fond du cadre. Le fondu croisé superpose directement les deux pages.</p></>}
 <p className="help">Utilisez « Tester l’action » pour prévisualiser le passage. Les interactions sont bloquées jusqu’à la fin ou l’annulation.</p></>}
 {mode==='video'&&children}
 </>;
}
