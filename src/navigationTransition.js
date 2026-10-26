import {defaultEffect,validateEffect} from './visualEffects.js';
export const NAVIGATION_EFFECTS={crossfade:'Fondu croisé',fade:'Fondu simple',slide:'Glissement','zoom-in':'Zoom avant','zoom-out':'Zoom arrière',wipe:'Balayage'};
export const defaultNavigationEffect=()=>({...defaultEffect(),type:'crossfade',duration:600});
export const navigationMode=action=>action.navigationTransition?.mode||(action.transitionId?'video':'none');
export function navigationParameters(action){const mode=navigationMode(action);return {transitionId:mode==='video'?action.transitionId:null,effect:mode==='effect'?{...action.navigationTransition.effect,fullPage:true}:null};}
export function setNavigationMode(action,mode){return {...action,navigationTransition:{...action.navigationTransition,mode,...(mode==='effect'&&!action.navigationTransition?.effect?{effect:defaultNavigationEffect()}:{})}};}
export function validateNavigationTransition(action){
 const t=action.navigationTransition;if(t===undefined)return;
 const fail=()=>{throw Error('La transition du bouton de navigation est invalide. Votre projet est conservé.');};
 if(!t||Array.isArray(t)||!['none','effect','video'].includes(t.mode))fail();
 if(t.mode==='effect'&&t.effect===undefined)fail();
 if(t.effect!==undefined){validateEffect(t.effect);if(!Object.hasOwn(NAVIGATION_EFFECTS,t.effect.type)||t.effect.duration<100||t.effect.duration>3000||(t.effect.fadeColor!==undefined&&t.effect.fadeColor!==null&&!/^#[a-f0-9]{6}$/i.test(t.effect.fadeColor)))fail();}
}
