import {useEffect} from 'react';

const SIZE='46px';
const RIGHT='20px';
const ORANGE='#ff5a1f';

function styleLauncher(el:HTMLElement,bottom:string){
  el.style.position='fixed';
  el.style.right=RIGHT;
  el.style.bottom=bottom;
  el.style.width=SIZE;
  el.style.height=SIZE;
  el.style.minWidth=SIZE;
  el.style.minHeight=SIZE;
  el.style.border='0';
  el.style.borderRadius='50%';
  el.style.background=ORANGE;
  el.style.color='#fff';
  el.style.boxShadow='0 10px 28px rgba(20,27,38,.2)';
  el.style.padding='0';
  el.style.display='grid';
  el.style.placeItems='center';
  el.style.zIndex='2147482000';
}

function removeLauncherText(el:HTMLElement){
  for(const node of Array.from(el.childNodes)){
    if(node.nodeType===Node.TEXT_NODE)node.textContent='';
  }
  if(el.getAttribute('aria-label')!=='Calculadora Hipotecaria')el.setAttribute('aria-label','Calculadora Hipotecaria');
  if(el.getAttribute('title')!=='Calculadora')el.setAttribute('title','Calculadora');
  styleLauncher(el,'130px');
}

function ensureChatLauncher(){
  const calc=document.querySelector<HTMLElement>('.calc-launcher:not(.fenix-chat-launcher-restored)');
  if(!calc||document.querySelector('.fenix-chat-launcher-restored'))return;
  const link=document.createElement('a');
  link.className='calc-launcher fenix-chat-launcher-restored';
  link.href=`${import.meta.env.BASE_URL}chat`;
  link.setAttribute('aria-label','Abrir chat');
  link.setAttribute('title','Chat');
  link.textContent='💬';
  link.style.textDecoration='none';
  link.style.fontSize='20px';
  styleLauncher(link,'22px');
  document.body.appendChild(link);
}

function normalize(root:ParentNode=document){
  root.querySelectorAll<HTMLElement>('[aria-label="Calculadora Hipotecaria PRO"]').forEach(el=>{
    if(el.getAttribute('aria-label')!=='Calculadora Hipotecaria')el.setAttribute('aria-label','Calculadora Hipotecaria');
  });
  root.querySelectorAll<HTMLElement>('.calc-panel>header>div:first-child>strong').forEach(el=>{
    for(const node of Array.from(el.childNodes))if(node.nodeType===Node.TEXT_NODE&&node.textContent?.includes('PRO'))node.textContent=node.textContent.replace(/\s*PRO\b/g,'');
  });
  root.querySelectorAll<HTMLElement>('.calc-launcher:not(.fenix-chat-launcher-restored)').forEach(removeLauncherText);
  root.querySelectorAll<HTMLElement>('.fenix-chat-launcher-restored').forEach(el=>styleLauncher(el,'22px'));
  ensureChatLauncher();
}

export default function CalculatorLabelGuard(){
  useEffect(()=>{
    normalize();
    const observer=new MutationObserver(records=>{
      for(const record of records){
        for(const node of Array.from(record.addedNodes))if(node instanceof HTMLElement)normalize(node);
      }
      normalize();
    });
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-label']});
    return()=>{observer.disconnect();document.querySelector('.fenix-chat-launcher-restored')?.remove();};
  },[]);
  return null;
}
