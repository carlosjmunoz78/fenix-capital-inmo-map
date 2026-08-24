import {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';

const BUTTON_CLASS='ops-advanced-search-guard';
const STYLE_ID='ops-advanced-search-guard-style';

export default function OperationalAdvancedSearchGuard(){
 const navigate=useNavigate();
 useEffect(()=>{
  if(!document.getElementById(STYLE_ID)){
   const style=document.createElement('style');
   style.id=STYLE_ID;
   style.textContent=`
.${BUTTON_CLASS}{height:42px;border:1px solid #e4e4e8;border-radius:10px;background:#fff;color:#424248;padding:0 14px;font-size:11px;font-weight:750;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center}
.${BUTTON_CLASS}:hover{border-color:#f0cdbd;background:#fff8f4;color:#e95d27}
.ops-root[data-theme='dark'] .${BUTTON_CLASS}{background:#202023;color:#f2f2f4;border-color:#3a3a3f}
.ops-root[data-theme='dark'] .${BUTTON_CLASS}:hover{background:#2b2522;border-color:#70402c;color:#ff7a42}
@media(max-width:900px){.${BUTTON_CLASS}{display:none}}
`;
   document.head.appendChild(style);
  }
  const wire=()=>{
   document.querySelectorAll<HTMLElement>('.ops-top').forEach(top=>{
    const existing=top.querySelector<HTMLButtonElement>(`.${BUTTON_CLASS}`);
    if(existing){
      if(existing.textContent!=='Buscador avanzado')existing.textContent='Buscador avanzado';
      existing.setAttribute('aria-label','Buscador avanzado');
      return;
    }
    const search=top.querySelector<HTMLElement>('.ops-search');
    if(!search)return;
    const button=document.createElement('button');
    button.type='button';
    button.className=BUTTON_CLASS;
    button.textContent='Buscador avanzado';
    button.setAttribute('aria-label','Buscador avanzado');
    button.addEventListener('click',()=>navigate('/buscar'));
    top.insertBefore(button,search);
   });
  };
  wire();
  const observer=new MutationObserver(wire);
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer.disconnect();
 },[navigate]);
 return null;
}
