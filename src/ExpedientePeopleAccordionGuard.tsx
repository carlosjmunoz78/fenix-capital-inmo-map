import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';

function setExpanded(header:HTMLElement,body:HTMLElement,expanded:boolean){
  header.setAttribute('role','button');
  header.setAttribute('tabindex','0');
  header.setAttribute('aria-expanded',expanded?'true':'false');
  header.style.cursor='pointer';
  body.hidden=!expanded;
  let marker=header.querySelector<HTMLElement>(':scope > .exp-accordion-marker');
  if(!marker){
    marker=document.createElement('span');
    marker.className='exp-accordion-marker';
    marker.setAttribute('aria-hidden','true');
    marker.style.marginLeft='auto';
    marker.style.fontSize='14px';
    marker.style.lineHeight='1';
    marker.style.opacity='.72';
    header.appendChild(marker);
  }
  marker.textContent=expanded?'▴':'▾';
}

function wirePerson(article:HTMLElement){
  if(article.dataset.accordionWired==='1')return;
  const header=article.querySelector<HTMLElement>(':scope > .exp-person-toggle');
  const body=article.querySelector<HTMLElement>(':scope > .exp-person-body');
  if(!header||!body)return;
  article.dataset.accordionWired='1';
  setExpanded(header,body,false);
  const toggle=()=>setExpanded(header,body,header.getAttribute('aria-expanded')!=='true');
  header.addEventListener('click',event=>{
    if((event.target as HTMLElement).closest('button,a,input,select,textarea,label'))return;
    toggle();
  });
  header.addEventListener('keydown',event=>{
    if(event.key!=='Enter'&&event.key!==' ')return;
    event.preventDefault();
    toggle();
  });
}

function wireDocuments(section:HTMLElement){
  if(section.dataset.accordionWired==='1')return;
  const header=section.querySelector<HTMLElement>(':scope > .exp-person-documents-head');
  const list=section.querySelector<HTMLElement>(':scope > .exp-person-documents-list');
  if(!header||!list)return;
  section.dataset.accordionWired='1';
  header.setAttribute('role','button');
  header.setAttribute('tabindex','0');
  header.setAttribute('aria-expanded','false');
  header.style.cursor='pointer';
  list.hidden=true;
  const marker=document.createElement('span');
  marker.className='exp-doc-accordion-marker';
  marker.setAttribute('aria-hidden','true');
  marker.textContent='▾';
  marker.style.marginLeft='auto';
  marker.style.fontSize='14px';
  marker.style.lineHeight='1';
  marker.style.opacity='.72';
  header.appendChild(marker);
  const toggle=()=>{
    const expanded=header.getAttribute('aria-expanded')!=='true';
    header.setAttribute('aria-expanded',expanded?'true':'false');
    list.hidden=!expanded;
    marker.textContent=expanded?'▴':'▾';
  };
  header.addEventListener('click',toggle);
  header.addEventListener('keydown',event=>{
    if(event.key!=='Enter'&&event.key!==' ')return;
    event.preventDefault();
    toggle();
  });
}

function wire(root:ParentNode=document){
  root.querySelectorAll<HTMLElement>('.exp-person').forEach(wirePerson);
  root.querySelectorAll<HTMLElement>('.exp-person-documents').forEach(wireDocuments);
}

export default function ExpedientePeopleAccordionGuard(){
  const {pathname}=useLocation();
  const active=/^\/expedientes\/[^/]+$/.test(pathname)&&pathname!=='/expedientes/nuevo';
  useEffect(()=>{
    if(!active)return;
    wire();
    const observer=new MutationObserver(records=>{
      for(const record of records){
        for(const node of Array.from(record.addedNodes))if(node instanceof HTMLElement)wire(node);
      }
      wire();
    });
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[active,pathname]);
  return null;
}
