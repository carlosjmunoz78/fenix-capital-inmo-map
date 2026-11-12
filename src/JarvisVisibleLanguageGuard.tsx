import {useEffect} from 'react';

const REPLACEMENTS:[RegExp,string][]=[
 [/CEREBRO OS\s*·\s*CONSOLE V0/gi,'JARVIS'],
 [/CEREBRO OS/gi,'JARVIS'],
 [/CEREBRO Gateway/gi,'Gateway'],
 [/CEREBRO EN CONTROL/gi,'JARVIS EN CONTROL'],
 [/DEVOLVER A CEREBRO/gi,'DEVOLVER A JARVIS'],
 [/ORDEN A CEREBRO/gi,'ORDEN A JARVIS'],
 [/CEREBRO/gi,'JARVIS'],
];
const ATTRIBUTES=['placeholder','title','aria-label','alt'] as const;

function isJarvisSurface(){
 if(typeof window==='undefined'||window.location.pathname.replace(/\\/+$/,'')!=='/cerebro')return false;
 const section=new URLSearchParams(window.location.search).get('section');
 return !section||section==='jarvis'||section==='v0'||section==='legacy-v0';
}
function replace(value:string){let next=value;for(const[pattern,replacement]of REPLACEMENTS)next=next.replace(pattern,replacement);return next;}
function rewrite(root:ParentNode){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const nodes:Text[]=[];let current=walker.nextNode();
 while(current){nodes.push(current as Text);current=walker.nextNode()}
 for(const node of nodes){const parent=node.parentElement;if(!parent||parent.closest('script,style,code,pre,textarea'))continue;const value=node.nodeValue??'',next=replace(value);if(next!==value)node.nodeValue=next;}
 const scope=root instanceof Element?root:document.documentElement;
 for(const element of scope.querySelectorAll<HTMLElement>('[placeholder],[title],[aria-label],[alt]'))for(const attribute of ATTRIBUTES){const value=element.getAttribute(attribute);if(!value)continue;const next=replace(value);if(next!==value)element.setAttribute(attribute,next);}
}

export default function JarvisVisibleLanguageGuard(){
 useEffect(()=>{
  let frame=0;
  const apply=()=>{frame=0;if(!isJarvisSurface())return;rewrite(document.body);document.title=replace(document.title)};
  const schedule=()=>{if(!frame)frame=window.requestAnimationFrame(apply)};
  apply();
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:[...ATTRIBUTES]});
  return()=>{observer.disconnect();if(frame)window.cancelAnimationFrame(frame)};
 },[]);
 return null;
}
