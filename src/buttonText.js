import {DEFAULT_TEXT_STYLE,validateTextStyles} from './textModel.js';
export function buttonTextItem(button){return {...button,type:'text',content:button.labelText?.content??(button.imageId?'':button.name),color:button.labelText?.color??button.appearance?.text??button.color??'#f4ecff',textStyle:button.labelText?.textStyle??{...DEFAULT_TEXT_STYLE,fontSize:32,align:'center',verticalAlign:'center',padding:8,preset:'custom'}};}
export function validateButtonText(document){
 const layers=document.pages.flatMap(p=>p.buttons.filter(b=>b.labelText!==undefined).map(b=>{const t=b.labelText;if(!t||typeof t.content!=='string'||t.content.length>10000||!/^#[\da-f]{6}$/i.test(t.color)||!t.textStyle||t.textStyle.autoHeight!==false)throw new Error('Le texte d’un bouton est invalide. Votre projet est conservé.');return {...b,...t,type:'text'};}));
 validateTextStyles([{layers}]);
}
