/**
 * JARVIS LAB UI sidecar, no changes to the canonical Console, Gateway or voice.
 * Observes only the already-authorized CEREBRO response bubbles inside JARVIS.
 * React portals render equivalent text as safe Markdown; original text remains
 * present and is restored instantly by removing LAB build flag.
 * This DOM adapter is a temporary experiment, NOT a production integration.
 */
import {useEffect,useState,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import JarvisSafeMarkdownLab from './JarvisSafeMarkdownLab';

type Slot={target:HTMLElement;original:HTMLSpanElement;text:string};

export default function JarvisMarkdownLabSidecar({hostRef}:{hostRef:RefObject<HTMLDivElement|null>}){
 const[slots,setSlots]=useState<Slot[]>([]);
 useEffect(()=>{
  const root=hostRef.current;if(!root)return;
  let scheduled=0;
  function scan(){
   scheduled=0;
   const next:Slot[]=[];
   for(const line of root!.querySelectorAll<HTMLElement>('.cerebro-chat-line.cerebro-chat-cerebro')){
    const original=line.querySelector<HTMLSpanElement>(':scope > span');
    if(!original)continue;
    let slot=original.nextElementSibling;
    if(!(slot instanceof HTMLElement)||slot.dataset.jarvisMarkdownSlot!=='1'){
     slot=document.createElement('div');
     slot.setAttribute('data-jarvis-markdown-slot','1');
     slot.className='jarvis-markdown-slot';
     original.insertAdjacentElement('afterend',slot);
    }
    line.setAttribute('data-jarvis-markdown-lab-line','1');
    next.push({target:slot as HTMLElement,original,text:original.textContent??''});
   }
   setSlots(old=>
    old.length===next.length && old.every((entry,i)=>entry.target===next[i].target&&entry.original===next[i].original&&entry.text===next[i].text)
     ?old:next
   );
  }
  function schedule(){if(!scheduled)scheduled=window.requestAnimationFrame(scan)}
  const observer=new MutationObserver(schedule);
  observer.observe(root,{subtree:true,childList:true,characterData:true});
  schedule();
  return()=>{observer.disconnect();if(scheduled)window.cancelAnimationFrame(scheduled)};
 },[hostRef]);
 return <>{slots.map(slot=>createPortal(<JarvisSafeMarkdownLab content={slot.text}/>,slot.target))}</>;
}
