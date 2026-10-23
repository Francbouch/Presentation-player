import {hasBullet} from './textLists.js';
export default function ParagraphText({item}){
 const lines=item.content.split('\n'),result=[];let list=[];
 const flush=()=>{if(list.length){result.push(<ul key={`list-${result.length}`} style={{paddingInlineStart:`${item.textList.indent}em`}}>{list}</ul>);list=[];}};
 lines.forEach((line,index)=>{if(hasBullet(item,index))list.push(<li key={index}>{line||<br/>}</li>);else{flush();result.push(<div key={`p-${index}`}>{line||<br/>}</div>);}});flush();return result;
}
export function setEditableParagraphs(root,item){root.replaceChildren(...item.content.split('\n').map(line=>{const div=document.createElement('div');div.textContent=line;if(!line)div.appendChild(document.createElement('br'));return div;}));styleEditableParagraphs(root,item);}
export function styleEditableParagraphs(root,item){[...root.children].forEach((node,i)=>{node.dataset.bullet=hasBullet(item,i)?'true':'false';node.style.paddingInlineStart=hasBullet(item,i)?`${item.textList?.indent??1.25}em`:'';});}
