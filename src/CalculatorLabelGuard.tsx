import {useEffect} from 'react';

function removeLauncherText(el:HTMLElement){
  for(const node of Array.from(el.childNodes)){
    if(node.nodeType===Node.TEXT_NODE)node.textContent='';
  }
  el.setAttribute('aria-label','Calculadora Hipotecaria');
  el.setAttribute('title','Calculadora');
}

function ensureChatLauncher(){
  const calc=document.querySelector<HTMLElement>('.calc-launcher');
  if(!calc||document.querySelector('.fenix-chat-launcher-restored'))return;
  const link=document.createElement('a');
  link.className='calc-launcher fenix-chat-launcher-restored';
  link.href=`${import.meta.env.BASE_URL}chat`;
  link.setAttribute('aria-label','Abrir chat');
  link.setAttribute('title','Chat');
  link.textContent='💬';
  link.style.bottom='84px';
  link.style.textDecoration='none';
  link.style.display='grid';
  link.style.placeItems='center';
  link.style.fontSize='20px';
  document.body.appendChild(link);
}

function normalize(root:ParentNode=document){
  root.querySelectorAll<HTMLElement>('[aria-label="Calculadora Hipotecaria PRO"]').forEach(el=>el.setAttribute('aria-label','Calculadora Hipotecaria'));
  root.querySelectorAll<HTMLElement>('.calc-panel>header>div:first-child>strong').forEach(el=>{
    for(const node of Array.from(el.childNodes))if(node.nodeType===Node.TEXT_NODE&&node.textContent?.includes('PRO'))node.textContent=node.textContent.replace(/\s*PRO\b/g,'');
  });
  root.querySelectorAll<HTMLElement>('.calc-launcher:not(.fenix-chat-launcher-restored)').forEach(removeLauncherText);
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
