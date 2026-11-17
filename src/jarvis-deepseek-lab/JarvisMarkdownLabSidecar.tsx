/**
 * Puente TEMPORAL exclusivo de LAB hacia la nueva API React declarativa.
 * El renderer de respuesta no usa DOM; el puente sí, por falta del callback
 * oficial del núcleo protegido. No fusionar ni promover este puente a PROD.
 *
 * FAIL OPEN: el texto canónico sigue visible si la nueva presentación no
 * se monta correctamente; se oculta después de montar y se restaura al desmontar.
 */
import {Component,useEffect,useLayoutEffect,useState,type ReactNode,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import JarvisResponseView from './JarvisResponseView';
import {fromLegacyConsoleText} from './JarvisResponseContract';

type Slot={target:HTMLElement;original:HTMLSpanElement;text:string};

class PresentationBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?null:this.props.children;}
}

function MountedPresentation({slot}:{slot:Slot}){
 const message=fromLegacyConsoleText(slot.text);
 useLayoutEffect(()=>{
  if(!message||!slot.target.querySelector('[data-jarvis-markdown-lab="true"]'))return;
  const previous=slot.original.style.display;
  slot.original.style.display='none';
  slot.target.dataset.jarvisLabRendered='1';
  return ()=>{
   slot.original.style.display=previous;
   delete slot.target.dataset.jarvisLabRendered;
  };
 },[slot.original,slot.target,slot.text,message?.source]);
 return message?<JarvisResponseView message={message}/>:null;
}

export default function JarvisMarkdownLabSidecar({hostRef}:{hostRef:RefObject<HTMLDivElement|null>}){
 const[slots,setSlots]=useState<Slot[]>([]);
 useEffect(()=>{
  const root=hostRef.current;if(!root)return;
  let scheduled=0;
  const scan=()=>{
   scheduled=0;
   const next:Slot[]=[];
   for(const line of root.querySelectorAll<HTMLElement>('.cerebro-chat-line.cerebro-chat-cerebro')){
    const original=line.querySelector<HTMLSpanElement>(':scope > span');
    if(!original)continue;
    let target=original.nextElementSibling as HTMLElement|null;
    if(!(target instanceof HTMLElement)||target.dataset.jarvisMarkdownSlot!=='1'){
     target=document.createElement('div');
     target.setAttribute('data-jarvis-markdown-slot','1');
     target.className='jarvis-markdown-slot';
     original.insertAdjacentElement('afterend',target);
    }
    next.push({target,original,text:original.textContent??''});
   }
   setSlots(old=>
    old.length===next.length && old.every((entry,i)=>
     entry.target===next[i].target&&entry.original===next[i].original&&entry.text===next[i].text
    )?old:next
   );
  };
  const schedule=()=>{if(!scheduled)scheduled=window.requestAnimationFrame(scan)};
  const observer=new MutationObserver(schedule);
  observer.observe(root,{subtree:true,childList:true,characterData:true});
  schedule();
  return()=>{observer.disconnect();if(scheduled)window.cancelAnimationFrame(scheduled)};
 },[hostRef]);
 return <>{slots.map(slot=>createPortal(
  <PresentationBoundary key={slot.text}>
   <MountedPresentation slot={slot}/>
  </PresentationBoundary>,
  slot.target
 ))}</>;
}
