import {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';

const BUTTON_CLASS='ops-advanced-search-guard';
const THEME_CLASS='ops-theme-guard';
const STYLE_ID='ops-advanced-search-guard-style';

export default function OperationalAdvancedSearchGuard(){
 const navigate=useNavigate();
 useEffect(()=>{
  if(!document.getElementById(STYLE_ID)){
   const style=document.createElement('style');
   style.id=STYLE_ID;
   style.textContent=`
.${BUTTON_CLASS},.dir-advanced{height:42px!important;border:1px solid #e4e4e8!important;border-radius:10px!important;background:#fff!important;color:#424248!important;padding:0 12px!important;font-size:10.5px!important;font-weight:750!important;cursor:pointer;white-space:nowrap;display:inline-flex!important;align-items:center;justify-content:center;gap:7px;flex:0 0 auto}
.ops-top,.dir-topbar{height:74px!important;min-height:74px!important;padding:0 18px!important;gap:12px!important;min-width:0!important;background:#fff!important;border-bottom:1px solid #ececef!important}
.ops-top{display:grid!important;grid-template-columns:auto minmax(180px,1fr) auto!important;align-items:center!important}
.dir-topbar{display:grid!important;grid-template-columns:auto minmax(180px,1fr) auto!important;align-items:center!important}
.ops-search,.dir-search{height:42px!important;border:1px solid #e4e4e8!important;border-radius:10px!important;min-width:0!important;max-width:none!important;width:100%!important;display:flex!important;align-items:center!important;overflow:hidden!important;background:#fff!important}
.ops-search input,.dir-search input{min-width:0!important;flex:1 1 auto!important;height:100%!important;border:0!important;background:transparent!important;padding:0 12px!important;outline:none!important}
.ops-search button,.dir-search button{height:100%!important;min-width:72px!important;width:auto!important;padding:0 14px!important;border:0!important;border-left:1px solid #e55218!important;background:#ff5f00!important;color:#fff!important;font-size:11px!important;font-weight:800!important;border-radius:0 9px 9px 0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 auto}
.ops-search button:hover,.dir-search button:hover{background:#e95500!important}.ops-search button svg,.dir-search button svg{display:none!important}
.ops-top-actions,.dir-top-right{margin-left:0!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:7px!important;min-width:0!important;max-width:100%!important}
.ops-top-actions>button,.ops-profile,.dir-theme-toggle,.dir-profile,.dir-logout,.dir-bell{min-height:38px!important;height:38px!important;border:1px solid #e7e7ea!important;background:#fff!important;color:#424248!important;border-radius:10px!important;flex:0 0 auto}
.${THEME_CLASS}{border:1px solid #e7e7ea;background:#fff;color:#424248;padding:0 10px;font-size:10px;font-weight:750;cursor:pointer}
.ops-profile,.dir-profile{display:flex!important;align-items:center!important;gap:7px!important;padding:3px 7px!important;min-width:0!important;max-width:176px!important;overflow:hidden!important}
.ops-profile-copy,.dir-user-copy{display:grid!important;line-height:1.05!important;min-width:0!important;overflow:hidden!important}.ops-profile-copy strong,.dir-user-copy strong{font-size:11px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;max-width:112px!important}.ops-profile-copy small,.dir-user-copy span{font-size:8.5px!important;color:#8a8a90!important;margin-top:3px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;max-width:112px!important}
.ops-profile-avatar,.ops-profile img[data-auth-avatar='true'],.dir-avatar{width:30px!important;height:30px!important;border-radius:50%!important;object-fit:cover!important;display:grid!important;place-items:center!important;background:#870064!important;color:#fff!important;font-size:9.5px!important;font-weight:800!important;flex:0 0 auto!important}
.ops-top button[aria-label='Cerrar sesión'],.dir-logout{width:auto!important;min-width:52px!important;padding:0 9px!important;gap:5px!important}.ops-top button[aria-label='Cerrar sesión']::after,.dir-logout::after{content:'Salir';font-size:10px;font-weight:750}
.${BUTTON_CLASS}:hover,.dir-advanced:hover{border-color:#f0cdbd!important;background:#fff8f4!important;color:#e95d27!important}
.ops-root[data-theme='dark'] .ops-top,.dir-shell[data-dir-theme='dark'] .dir-topbar,.ops-root[data-theme='dark'] .${BUTTON_CLASS},.ops-root[data-theme='dark'] .ops-search,.ops-root[data-theme='dark'] .ops-profile,.ops-root[data-theme='dark'] .ops-top-actions>button,.dir-shell[data-dir-theme='dark'] .dir-advanced,.dir-shell[data-dir-theme='dark'] .dir-profile,.dir-shell[data-dir-theme='dark'] .dir-theme-toggle,.dir-shell[data-dir-theme='dark'] .dir-bell,.dir-shell[data-dir-theme='dark'] .dir-logout{background:#202023!important;color:#f2f2f4!important;border-color:#3a3a3f!important}
.ops-root[data-theme='dark'] .ops-search button,.dir-shell[data-dir-theme='dark'] .dir-search button{background:#ff5f00!important;color:#fff!important;border-left-color:#e55218!important}.ops-root[data-theme='dark'] .ops-profile-copy small,.dir-shell[data-dir-theme='dark'] .dir-user-copy span{color:#aaaab2!important}
.informes-root{display:grid!important;grid-template-columns:238px minmax(0,1fr)!important}
.informes-root>.ops-side{display:flex!important;visibility:visible!important;opacity:1!important;position:relative!important;left:auto!important;transform:none!important;z-index:7450!important}
.informes-root>.ops-main{grid-column:2!important;min-width:0!important;width:auto!important}
.ops-runtime-footer{position:fixed!important;left:238px!important;right:0!important;bottom:0!important;z-index:7990!important;height:34px!important;display:flex!important;align-items:center!important;justify-content:center!important;border-top:1px solid var(--border,#e5e7eb)!important;background:var(--panel,#fff)!important;color:var(--muted,#667085)!important;font-size:11px!important;letter-spacing:.08em!important;text-align:center!important;visibility:visible!important;opacity:1!important;pointer-events:none!important}
.ops-root[data-theme='dark'] .ops-runtime-footer{background:#202023!important;border-color:#343438!important;color:#aaaab2!important}
@media(max-width:1100px){.ops-top,.dir-topbar{grid-template-columns:auto minmax(150px,1fr) auto!important;padding:0 10px!important;gap:8px!important}.ops-profile,.dir-profile{max-width:126px!important}.ops-profile-copy strong,.ops-profile-copy small,.dir-user-copy strong,.dir-user-copy span{max-width:72px!important}.ops-top-actions,.dir-top-right{gap:5px!important}.ops-top-actions>button,.dir-theme-toggle{padding-left:7px!important;padding-right:7px!important}}
@media(max-width:900px){.informes-root{grid-template-columns:96px minmax(0,1fr)!important}.informes-root>.ops-main{grid-column:2!important}.${BUTTON_CLASS},.dir-advanced{height:38px!important;padding:0 8px!important;font-size:9.5px!important}.ops-profile-copy,.dir-user-copy{display:none!important}.ops-profile,.dir-profile{padding:3px 4px!important;max-width:40px!important}.ops-top button[aria-label='Cerrar sesión']::after,.dir-logout::after{display:none}.ops-top button[aria-label='Cerrar sesión'],.dir-logout{min-width:36px!important;width:36px!important;padding:0!important}.ops-search button,.dir-search button{min-width:58px!important;padding:0 9px!important}.ops-runtime-footer{left:96px!important}}
@media(max-width:650px){.informes-root{display:block!important}.informes-root>.ops-main{width:100%!important}.${BUTTON_CLASS},.dir-advanced{display:none!important}.ops-top,.dir-topbar{height:auto!important;min-height:66px!important;padding:10px 12px!important;grid-template-columns:minmax(0,1fr) auto!important}.ops-search,.dir-search{height:40px!important}.ops-search button,.dir-search button{min-width:58px!important;padding:0 9px!important;font-size:10px!important}.ops-runtime-footer{left:0!important;bottom:58px!important;height:30px!important;font-size:10px!important}}
`;
   document.head.appendChild(style);
  }
  const ensureSearch=(top:HTMLElement)=>{
   let search=top.querySelector<HTMLElement>('.ops-search');
   if(!search){
    search=document.createElement('div');search.className='ops-search';
    const input=document.createElement('input');input.type='search';input.placeholder='Buscar expediente, cliente, banco, inmobiliaria...';input.setAttribute('aria-label','Búsqueda global');
    search.appendChild(input);
    const actions=top.querySelector('.ops-top-actions');
    top.insertBefore(search,actions||null);
   }
   return search;
  };
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
  const ensureTheme=(top:HTMLElement)=>{
   let actions=top.querySelector<HTMLElement>('.ops-top-actions');
   if(!actions){actions=document.createElement('div');actions.className='ops-top-actions';top.appendChild(actions);}
   let button=actions.querySelector<HTMLButtonElement>('button[aria-label="Cambiar tema"],button.theme-toggle');
   if(button){button.setAttribute('aria-label','Cambiar tema');return;}
   button=document.createElement('button');button.type='button';button.className=THEME_CLASS;button.setAttribute('aria-label','Cambiar tema');
   const syncLabel=()=>{const root=top.closest<HTMLElement>('.ops-root');const dark=root?.dataset.theme==='dark'||document.documentElement.dataset.theme==='dark';button!.textContent=dark?'Claro':'Oscuro';};
   button.addEventListener('click',()=>{
    const base=document.querySelector<HTMLButtonElement>('.topbar .theme-toggle');
    if(base&&!top.contains(base))base.click();
    else{
      const dark=(sessionStorage.getItem('fenix-theme')||document.documentElement.dataset.theme)==='dark';
      const next=dark?'light':'dark';sessionStorage.setItem('fenix-theme',next);document.documentElement.dataset.theme=next;
      document.querySelectorAll<HTMLElement>('.ops-root').forEach(root=>root.dataset.theme=next);
    }
    window.setTimeout(syncLabel,0);
   });
   actions.insertBefore(button,actions.firstChild);syncLabel();
  };
  const ensureFooter=(root:HTMLElement)=>{
   const main=root.querySelector<HTMLElement>(':scope > .ops-main');
   if(!main)return;
   const existing=main.querySelector<HTMLElement>('.ops-shared-footer,.ops-runtime-footer');
   if(existing){existing.classList.add('ops-runtime-footer');existing.textContent='FÉNIX CAPITAL · CEREBRO';return;}
   const footer=document.createElement('footer');
   footer.className='ops-runtime-footer';
   footer.textContent='FÉNIX CAPITAL · CEREBRO';
   footer.setAttribute('aria-label','Pie de Fénix Capital');
   main.appendChild(footer);
  };
  const wire=()=>{
   document.querySelectorAll<HTMLElement>('.ops-top:not(.dir-topbar)').forEach(top=>{
    const search=ensureSearch(top);
    let existing=top.querySelector<HTMLButtonElement>(`.${BUTTON_CLASS}`);
    if(!existing){existing=document.createElement('button');existing.type='button';existing.className=BUTTON_CLASS;existing.addEventListener('click',()=>navigate('/buscar'));top.insertBefore(existing,search);}
    if(existing.textContent!=='Buscador avanzado')existing.textContent='Buscador avanzado';
    existing.setAttribute('aria-label','Buscador avanzado');
    normalizeSearch(top);ensureTheme(top);
   });
   document.querySelectorAll<HTMLElement>('.dir-topbar').forEach(top=>normalizeSearch(top));
   document.querySelectorAll<HTMLElement>('.ops-root').forEach(root=>ensureFooter(root));
  };
  wire();
  const observer=new MutationObserver(wire);observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer.disconnect();
 },[navigate]);
 return null;
}
