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
.${BUTTON_CLASS},.dir-advanced{height:42px!important;border:1px solid #e4e4e8!important;border-radius:10px!important;background:#fff!important;color:#424248!important;padding:0 12px!important;font-size:10.5px!important;font-weight:750!important;cursor:pointer;white-space:nowrap;display:inline-flex!important;align-items:center;justify-content:center;gap:7px;flex:0 0 auto}
.ops-top,.dir-topbar{height:74px!important;min-height:74px!important;padding:0 18px!important;gap:12px!important;min-width:0!important}
.ops-top{display:grid!important;grid-template-columns:auto minmax(180px,1fr) auto!important;align-items:center!important}
.dir-topbar{grid-template-columns:auto minmax(220px,1fr) auto!important}
.ops-search,.dir-search{height:42px!important;border-radius:10px!important;min-width:0!important;max-width:none!important;width:100%!important}
.ops-search input,.dir-search input{min-width:0!important}
.ops-search button,.dir-search button{height:100%!important;min-width:72px!important;width:auto!important;padding:0 14px!important;border:0!important;border-left:1px solid #e55218!important;background:#ff5f00!important;color:#fff!important;font-size:11px!important;font-weight:800!important;border-radius:0 9px 9px 0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 auto}
.ops-search button:hover,.dir-search button:hover{background:#e95500!important}.ops-search button svg,.dir-search button svg{display:none!important}
.ops-top-actions,.dir-top-right{margin-left:0!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:7px!important;min-width:0!important;max-width:100%!important}
.ops-top-actions>button,.ops-profile,.dir-theme-toggle,.dir-profile,.dir-logout,.dir-bell{min-height:38px!important;height:38px!important;border-radius:10px!important;flex:0 0 auto}
.ops-profile{display:flex!important;align-items:center!important;gap:7px!important;padding:3px 7px!important;min-width:0!important;max-width:176px!important;overflow:hidden!important}
.ops-profile-copy{display:grid;line-height:1.05;min-width:0;overflow:hidden}.ops-profile-copy strong{font-size:11px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:112px}.ops-profile-copy small{font-size:8.5px;color:#8a8a90;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:112px}
.ops-profile-avatar,.ops-profile img[data-auth-avatar='true']{width:30px;height:30px;border-radius:50%;object-fit:cover;display:grid;place-items:center;background:#870064;color:#fff;font-size:9.5px;font-weight:800;flex:0 0 auto}
.ops-top button[aria-label='Cerrar sesión'],.dir-logout{width:auto!important;min-width:52px!important;padding:0 9px!important;gap:5px!important}.ops-top button[aria-label='Cerrar sesión']::after,.dir-logout::after{content:'Salir';font-size:10px;font-weight:750}
.${BUTTON_CLASS}:hover,.dir-advanced:hover{border-color:#f0cdbd!important;background:#fff8f4!important;color:#e95d27!important}
.ops-root[data-theme='dark'] .${BUTTON_CLASS},.ops-root[data-theme='dark'] .ops-search,.ops-root[data-theme='dark'] .ops-profile,.ops-root[data-theme='dark'] .ops-top-actions>button,.dir-shell[data-dir-theme='dark'] .dir-advanced{background:#202023!important;color:#f2f2f4!important;border-color:#3a3a3f!important}
.ops-root[data-theme='dark'] .ops-search button,.dir-shell[data-dir-theme='dark'] .dir-search button{background:#ff5f00!important;color:#fff!important;border-left-color:#e55218!important}.ops-root[data-theme='dark'] .ops-profile-copy small{color:#aaaab2}
@media(max-width:1100px){.ops-top,.dir-topbar{grid-template-columns:auto minmax(150px,1fr) auto!important;padding:0 10px!important;gap:8px!important}.ops-profile{max-width:126px!important}.ops-profile-copy strong,.ops-profile-copy small{max-width:72px}.ops-top-actions,.dir-top-right{gap:5px!important}.ops-top-actions>button,.dir-theme-toggle{padding-left:7px!important;padding-right:7px!important}}
@media(max-width:900px){.${BUTTON_CLASS},.dir-advanced{height:38px!important;padding:0 8px!important;font-size:9.5px!important}.ops-profile-copy,.dir-user-copy{display:none!important}.ops-profile,.dir-profile{padding:3px 4px!important;max-width:40px!important}.ops-top button[aria-label='Cerrar sesión']::after,.dir-logout::after{display:none}.ops-top button[aria-label='Cerrar sesión'],.dir-logout{min-width:36px!important;width:36px!important;padding:0!important}.ops-search button,.dir-search button{min-width:58px!important;padding:0 9px!important}}
@media(max-width:650px){.${BUTTON_CLASS},.dir-advanced{display:none!important}.ops-top,.dir-topbar{height:auto!important;min-height:66px!important;padding:10px 12px!important;grid-template-columns:minmax(0,1fr) auto!important}.ops-search,.dir-search{height:40px!important}.ops-search button,.dir-search button{min-width:58px!important;padding:0 9px!important;font-size:10px!important}}
`;
   document.head.appendChild(style);
  }
  const normalizeSearch=(root:HTMLElement)=>{
   const search=root.querySelector<HTMLElement>('.ops-search,.dir-search');
   if(!search)return;
   let button=search.querySelector<HTMLButtonElement>('button');
   if(!button){
    button=document.createElement('button');button.type='button';
    button.addEventListener('click',()=>{
      const input=search.querySelector<HTMLInputElement>('input');
      const q=input?.value.trim()||'';
      navigate(q?`/buscar?q=${encodeURIComponent(q)}`:'/buscar');
    });
    search.appendChild(button);
   }
   if(button.textContent!=='Buscar')button.textContent='Buscar';
   button.setAttribute('aria-label','Buscar');
  };
  const wire=()=>{
   document.querySelectorAll<HTMLElement>('.ops-top').forEach(top=>{
    let existing=top.querySelector<HTMLButtonElement>(`.${BUTTON_CLASS}`);
    const search=top.querySelector<HTMLElement>('.ops-search');
    if(!search)return;
    if(!existing){existing=document.createElement('button');existing.type='button';existing.className=BUTTON_CLASS;existing.addEventListener('click',()=>navigate('/buscar'));top.insertBefore(existing,search);}
    if(existing.textContent!=='Buscador avanzado')existing.textContent='Buscador avanzado';
    existing.setAttribute('aria-label','Buscador avanzado');
    normalizeSearch(top);
   });
   document.querySelectorAll<HTMLElement>('.dir-topbar').forEach(top=>normalizeSearch(top));
  };
  wire();
  const observer=new MutationObserver(wire);observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer.disconnect();
 },[navigate]);
 return null;
}
