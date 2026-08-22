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
.${BUTTON_CLASS}{height:36px;border:1px solid #e4e4e8;border-radius:9px;background:#fff;color:#424248;padding:0 12px;font-size:10px;font-weight:750;cursor:pointer;white-space:nowrap}
.${BUTTON_CLASS}:hover{border-color:#f0cdbd;background:#fff8f4;color:#e95d27}
.ops-root[data-theme='dark'] .${BUTTON_CLASS}{background:#202023;color:#f2f2f4;border-color:#3a3a3f}
.ops-root[data-theme='dark'] .${BUTTON_CLASS}:hover{background:#2b2522;border-color:#70402c;color:#ff7a42}
@media(max-width:900px){.${BUTTON_CLASS}{display:none}}
`;
   document.head.appendChild(style);
  }
  const wire=()=>{
   document.querySelectorAll<HTMLElement>('.ops-top').forEach(top=>{
    const profile=top.querySelector<HTMLElement>('.ops-profile strong');
    const isDirection=/direcci[oó]n/i.test(profile?.textContent||'');
    const existing=top.querySelector<HTMLButtonElement>(`.${BUTTON_CLASS}`);
    if(!isDirection){existing?.remove();return;}
    if(existing)return;
    const search=top.querySelector<HTMLElement>('.ops-search');
    if(!search)return;
    const button=document.createElement('button');
    button.type='button';
    button.className=BUTTON_CLASS;
    button.textContent='Búsqueda avanzada';
    button.setAttribute('aria-label','Búsqueda avanzada');
    button.addEventListener('click',()=>navigate('/buscar'));
    top.insertBefore(button,search);
   });
  };
  wire();
  const observer=new MutationObserver(wire);
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  return()=>observer.disconnect();
 },[navigate]);
 return null;
}
