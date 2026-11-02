import {useEffect,useRef} from 'react';
import CerebroConsoleShell from './CerebroConsoleShell';
import JarvisWorkbenchPortal from './JarvisWorkbenchPortal';

const VISIBLE_REPLACEMENTS:[RegExp,string][]=[
  [/CEREBRO OS\s*·\s*CONSOLE V0/gi,'JARVIS'],
  [/CEREBRO Gateway/gi,'Gateway'],
  [/CEREBRO OS/gi,'JARVIS'],
  [/CEREBRO/gi,'JARVIS'],
];

function rewriteVisibleText(root:HTMLElement){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes:Text[]=[];
  let current=walker.nextNode();
  while(current){nodes.push(current as Text);current=walker.nextNode()}
  for(const node of nodes){
    const parent=node.parentElement;
    if(!parent||parent.closest('script,style,code,pre'))continue;
    let next=node.nodeValue??'';
    for(const [pattern,replacement] of VISIBLE_REPLACEMENTS)next=next.replace(pattern,replacement);
    if(next!==node.nodeValue)node.nodeValue=next;
  }
  for(const el of root.querySelectorAll<HTMLElement>('[placeholder],[title],[aria-label]')){
    for(const attribute of ['placeholder','title','aria-label']){
      const value=el.getAttribute(attribute);
      if(!value)continue;
      let next=value;
      for(const [pattern,replacement] of VISIBLE_REPLACEMENTS)next=next.replace(pattern,replacement);
      if(next!==value)el.setAttribute(attribute,next);
    }
  }
}

export default function JarvisEmbeddedConsole(){
  const rootRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const root=rootRef.current;
    if(!root)return;
    let scheduled=0;
    const apply=()=>{scheduled=0;rewriteVisibleText(root)};
    const schedule=()=>{if(!scheduled)scheduled=window.requestAnimationFrame(apply)};
    rewriteVisibleText(root);
    const observer=new MutationObserver(schedule);
    observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});
    return()=>{observer.disconnect();if(scheduled)window.cancelAnimationFrame(scheduled)};
  },[]);
  return <><div ref={rootRef} className="jarvis-console-presentation"><CerebroConsoleShell/></div><JarvisWorkbenchPortal/></>;
}
