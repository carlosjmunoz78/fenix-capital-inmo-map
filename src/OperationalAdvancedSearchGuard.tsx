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
.${BUTTON_CLASS},.dir-advanced{height:42px!important;border:1px solid #e4e4e8!important;border-radius:10px!important;background:#fff!important;color:#424248!important;padding:0 14px!important;font-size:11px!important;font-weight:750!important;cursor:pointer;white-space:nowrap;display:inline-flex!important;align-items:center;justify-content:center;gap:7px}
.ops-top,.dir-topbar{height:74px!important;min-height:74px!important;padding:0 26px!important;gap:18px!important}
.ops-top{display:grid!important;grid-template-columns:auto minmax(360px,780px) 1fr!important;align-items:center!important}
.dir-topbar{grid-template-columns:auto minmax(420px,780px) 1fr!important}
.ops-search,.dir-search{height:42px!important;border-radius:10px!important;min-width:0!important;max-width:none!important}
.ops-search button,.dir-search button{height:100%!important;min-width:76px!important;width:auto!important;padding:0 16px!important;border:0!important;border-left:1px solid #e55218!important;background:#ff5f00!important;color:#fff!important;font-size:11.5px!important;font-weight:800!important;border-radius:0 9px 9px 0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}
.ops-search button:hover,.dir-search button:hover{background:#e95500!important}
.ops-search button svg,.dir-search button svg{display:none!important}
.ops-top-actions,.dir-top-right{margin-left:auto!important;display:flex!important;align-items:center!important;gap:10px!important;min-width:0}
.ops-top-actions>button,.ops-profile,.dir-theme-toggle,.dir-profile,.dir-logout,.dir-bell{min-height:38px!important;height:38px!important;border-radius:10px!important}
.ops-profile{display:flex!important;align-items:center!important;gap:9px!important;padding:3px 9px!important;min-width:0}
.ops-profile-copy{display:grid;line-height:1.05;min-width:0}.ops-profile-copy strong{font-size:11.5px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px}.ops-profile-copy small{font-size:9px;color:#8a8a90;margin-top:3px;white-space:nowrap}
.ops-profile-avatar,.ops-profile img[data-auth-avatar='true']{width:32px;height:32px;border-radius:50%;object-fit:cover;display:grid;place-items:center;background:#870064;color:#fff;font-size:10px;font-weight:800;flex:0 0 auto}
.ops-top button[aria-label='Cerrar sesión'],.dir-logout{width:auto!important;min-width:58px!important;padding:0 11px!important;gap:6px!important}
.ops-top button[aria-label='Cerrar sesión']::after,.dir-logout::after{content:'Salir';font-size:10.5px;font-weight:750}
.${BUTTON_CLASS}:hover,.dir-advanced:hover{border-color:#f0cdbd!important;background:#fff8f4!important;color:#e95d27!important}
.ops-root[data-theme='dark'] .${BUTTON_CLASS},.ops-root[data-theme='dark'] .ops-search,.ops-root[data-theme='dark'] .ops-profile,.ops-root[data-theme='dark'] .ops-top-actions>button,.dir-shell[data-dir-theme='dark'] .dir-advanced{background:#202023!important;color:#f2f2f4!important;border-color:#3a3a3f!important}
.ops-root[data-theme='dark'] .ops-search button,.dir-shell[data-dir-theme='dark'] .dir-search button{background:#ff5f00!important;color:#fff!important;border-left-color:#e55218!important}
.ops-root[data-theme='dark'] .ops-profile-copy small{color:#aaaab2}
@media(max-width:1100px){.ops-top,.dir-topbar{grid-template-columns:auto minmax(260px,1fr) auto!important;padding:0 14px!important}.ops-profile-copy strong{max-width:95px}}
@media(max-width:900px){.${BUTTON_CLASS},.dir-advanced{display:none!important}.ops-top,.dir-topbar{grid-template-columns:minmax(0,1fr) auto!important}.ops-profile-copy{display:none}.ops-profile{padding:3px 5px!important}.ops-top button[aria-label='Cerrar sesión']::after,.dir-logout::after{display:none}.ops-top button[aria-label='Cerrar sesión'],.dir-logout{min-width:38px!important;width:38px!important;padding:0!important}}
@media(max-width:650px){.ops-top,.dir-topbar{height:auto!important;min-height:66px!important;padding:10px 12px!important}.ops-search,.dir-search{height:40px!important}.ops-search button,.dir-search button{min-width:62px!important;padding:0 11px!important;font-size:10.5px!important}}
`;
   document.head.appendChild(style);
  }
  const patchSearchButton=(root:HTMLElement)=>{
   const button=root.querySelector<HTMLButtonElement>('.ops-search button,.dir-search button');
   if(button&&button.textContent!=='Buscar')button.textContent='Buscar';
   button?.setAttribute('aria-label','Buscar');
  };
  const wire=()=>{
   document.querySelectorAll<HTMLElement>('.ops-top').forEach(top=>{
    let existing=top.querySelector<HTMLButtonElement>(`.${BUTTON_CLASS}`);
    const search=top.querySelector<HTMLElement>('.ops-search');
    if(!search)return;
    if(!existing){
      existing=document.createElement('button');existing.type='button';existing.className=BUTTON_CLASS;
      existing.addEventListener('click',()=>navigate('/buscar'));
      top.insertBefore(existing,search);
    }
    if(existing.textContent!=='Buscador avanzado')existing.textContent='Buscador avanzado';
    existing.setAttribute('aria-label','Buscador avanzado');
    patchSearchButton(top);
   });
   document.querySelectorAll<HTMLElement>('.dir-topbar').forEach(top=>patchSearchButton(top));
  };
  wire();
  const observer=new MutationObserver(wire);
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer.disconnect();
 },[navigate]);
 return null;
}
