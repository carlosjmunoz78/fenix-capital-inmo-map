import {useEffect} from 'react';

function normalize(root:ParentNode=document){
  root.querySelectorAll<HTMLElement>('[aria-label="Calculadora Hipotecaria PRO"]').forEach(el=>el.setAttribute('aria-label','Calculadora Hipotecaria'));
  root.querySelectorAll<HTMLElement>('.calc-launcher,.calc-panel>header>div:first-child>strong').forEach(el=>{
    for(const node of Array.from(el.childNodes)){
      if(node.nodeType===Node.TEXT_NODE&&node.textContent?.includes('PRO'))node.textContent=node.textContent.replace(/\s*PRO\b/g,'');
    }
  });
}

export default function CalculatorLabelGuard(){
  useEffect(()=>{
    normalize();
    const observer=new MutationObserver(records=>{
      for(const record of records){
        for(const node of Array.from(record.addedNodes)){
          if(node instanceof HTMLElement)normalize(node);
        }
      }
      normalize();
    });
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-label']});
    return()=>observer.disconnect();
  },[]);
  return null;
}
