import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Building2, CalendarDays, FileText, FolderOpen, UserRound } from 'lucide-react';

const css=`
html.exp-master-active .ops-root{grid-template-columns:236px minmax(0,1fr)!important;min-height:100vh!important;background:#f7f7f8!important;color:#1d1d1f!important;font:15px/1.5 Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}
html.exp-master-active .ops-side{display:flex!important;position:sticky!important;top:0!important;height:100vh!important;padding:20px 16px!important;background:#fff!important;border-right:1px solid #ededed!important;color:#222!important;z-index:20!important;overflow:hidden!important}
html.exp-master-active .ops-brand{height:72px!important;min-height:72px!important;padding:0 8px 15px!important;gap:12px!important;border-bottom:1px solid #f0f0f0!important;justify-content:flex-start!important}
html.exp-master-active .ops-brand img{width:44px!important;height:35px!important;object-fit:contain!important}
html.exp-master-active .ops-brand strong{font-size:14px!important;letter-spacing:.04em!important;color:#111!important;display:block!important}
html.exp-master-active .ops-side nav{display:grid!important;gap:5px!important;padding:14px 0!important;overflow-y:auto!important;overflow-x:hidden!important;min-height:0!important;scrollbar-width:thin!important;flex:1!important}
html.exp-master-active .ops-side nav button{height:43px!important;min-height:43px!important;border:0!important;border-radius:10px!important;padding:0 13px!important;font-size:13.5px!important;display:flex!important;align-items:center!important;gap:12px!important;color:#55565c!important;background:transparent!important;font-weight:650!important;text-align:left!important;white-space:nowrap!important}
html.exp-master-active .ops-side nav button svg{width:18px!important;height:18px!important;flex:0 0 auto!important;color:#8b8b92!important;stroke-width:1.8!important}
html.exp-master-active .ops-side nav button span{min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important}
html.exp-master-active .ops-side nav button:hover{background:#faf4f1!important;color:#e95d27!important}
html.exp-master-active .ops-side nav button:hover svg{color:#e95d27!important}
html.exp-master-active .ops-side nav button.active{background:#fff1ea!important;color:#f36c21!important;font-weight:700!important}
html.exp-master-active .ops-side nav button.active svg{color:#f36c21!important}
html.exp-master-active .ops-ana{margin-top:10px!important;border:1px solid #ececec!important;border-radius:14px!important;padding:13px 12px!important;background:#fff!important;color:#222!important;display:grid!important;grid-template-columns:1fr 46px!important;gap:10px!important;align-items:center!important;min-height:112px!important;text-align:left!important}
html.exp-master-active .ops-ana img{width:46px!important;height:46px!important;border-radius:50%!important;object-fit:cover!important;grid-column:2!important;grid-row:1!important;background:#fff!important}
html.exp-master-active .ops-ana span{display:grid!important;grid-column:1!important;grid-row:1!important;gap:4px!important}
html.exp-master-active .ops-ana strong{font-size:12.5px!important;color:#222!important}
html.exp-master-active .ops-ana small{font-size:10.5px!important;line-height:1.4!important;color:#777!important}
html.exp-master-active .ops-main{display:block!important;min-width:0!important;height:100vh!important;overflow-y:auto!important;overflow-x:hidden!important;background:#f7f7f8!important}
html.exp-master-active .ops-top{display:grid!important;position:sticky!important;top:0!important;height:74px!important;min-height:74px!important;padding:0 26px!important;background:#fff!important;border-bottom:1px solid #ededed!important;z-index:15!important;grid-template-columns:auto minmax(420px,680px) 1fr!important;gap:18px!important;align-items:center!important}
html.exp-master-active .ops-advanced-search-guard{height:42px!important;padding:0 16px!important;font-size:12px!important;border-radius:10px!important}
html.exp-master-active .ops-search{height:42px!important;border:1px solid #e4e4e8!important;border-radius:10px!important;background:#fff!important;max-width:none!important;width:100%!important}
html.exp-master-active .ops-search input{font-size:12.5px!important}
html.exp-master-active .ops-search button{height:100%!important;min-width:72px!important;background:#ff5f00!important;color:#fff!important;border-left:1px solid #e55218!important;font-size:11px!important;font-weight:800!important}
html.exp-master-active .ops-top-actions{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:8px!important;margin-left:0!important;min-width:0!important}
html.exp-master-active .ops-top-actions>button,html.exp-master-active .ops-profile{height:38px!important;min-height:38px!important;border-radius:10px!important;border:1px solid #e7e7e7!important;background:#fff!important;color:#333!important}
html.exp-master-active .ops-profile{padding:4px 7px!important;gap:10px!important}
html.exp-master-active .ops-profile-avatar,html.exp-master-active .ops-profile img[data-auth-avatar='true']{width:38px!important;height:38px!important;border-radius:50%!important}
html.exp-master-active .ops-profile-copy strong{font-size:12px!important}.ops-profile-copy small{font-size:9.5px!important}
html.exp-master-active .ops-master-bell{width:38px!important;min-width:38px!important;padding:0!important;display:grid!important;place-items:center!important}
html.exp-master-active .ops-master-bell svg{width:17px!important;height:17px!important}
html.exp-master-active .ops-content{max-width:none!important;width:100%!important;padding:30px 34px 42px!important;margin:0!important}
html.exp-master-active .exp-ana-hero{display:none!important}
html.exp-master-active .ops-title{margin:0 0 22px!important;padding:0!important;align-items:flex-end!important}
html.exp-master-active .ops-title .ops-icon,html.exp-master-active .ops-title .exp-eyebrow{display:none!important}
html.exp-master-active .ops-title h1{font-size:30px!important;line-height:1.1!important;margin:0!important}
html.exp-master-active .ops-title p{font-size:13px!important;color:#777!important;margin-top:7px!important}
html.exp-master-active .exp-filter-card{margin-top:0!important}
html.exp-master-active .exp-table .ops-table-wrap{max-height:430px!important;overflow:auto!important;scrollbar-width:thin!important}
html.exp-master-active .exp-table thead{position:sticky!important;top:0!important;z-index:2!important;background:#fff!important}
.exp-master-footer{margin-top:24px}.exp-master-footer h2{font-size:11px;margin:0 0 10px;letter-spacing:.08em}.exp-master-quick{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.exp-master-quick button{height:82px;border:1px solid #e8e8e8;background:#fff;border-radius:13px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:10.5px;color:#333;cursor:pointer}.exp-master-quick button svg{width:28px;height:28px;color:#f36c21}.exp-master-quick button:hover{border-color:#ffd3c0;background:#fffaf7}
html[data-theme='dark'].exp-master-active .ops-root,html[data-theme='dark'].exp-master-active .ops-main{background:#151516!important;color:#f4f4f5!important}html[data-theme='dark'].exp-master-active .ops-side,html[data-theme='dark'].exp-master-active .ops-top{background:#1b1b1d!important;color:#f4f4f5!important;border-color:#343438!important}html[data-theme='dark'].exp-master-active .ops-brand strong{color:#fff!important}html[data-theme='dark'].exp-master-active .ops-side nav button{color:#d7d7db!important}html[data-theme='dark'].exp-master-active .ops-side nav button svg{color:#aaaab2!important}html[data-theme='dark'].exp-master-active .ops-side nav button.active{background:#3a241d!important;color:#ff7a42!important}html[data-theme='dark'].exp-master-active .ops-side nav button.active svg{color:#ff7a42!important}html[data-theme='dark'].exp-master-active .ops-ana,html[data-theme='dark'].exp-master-active .exp-master-quick button,html[data-theme='dark'].exp-master-active .ops-search,html[data-theme='dark'].exp-master-active .ops-profile,html[data-theme='dark'].exp-master-active .ops-top-actions>button{background:#202023!important;color:#f4f4f5!important;border-color:#39393e!important}html[data-theme='dark'].exp-master-active .ops-ana strong{color:#f4f4f5!important}html[data-theme='dark'].exp-master-active .ops-ana small{color:#aaaab2!important}html[data-theme='dark'].exp-master-active .exp-table thead{background:#202023!important}
@media(max-width:1180px){html.exp-master-active .ops-root{grid-template-columns:88px minmax(0,1fr)!important}html.exp-master-active .ops-brand{justify-content:center!important;padding:0 0 12px!important}html.exp-master-active .ops-brand strong{display:none!important}html.exp-master-active .ops-side nav button{justify-content:center!important;padding:0!important}html.exp-master-active .ops-side nav button span{display:none!important}html.exp-master-active .ops-ana{display:none!important}html.exp-master-active .ops-top{grid-template-columns:auto minmax(280px,1fr) auto!important}.exp-master-quick{grid-template-columns:repeat(3,1fr)}}
@media(max-width:760px){html.exp-master-active .ops-root{display:block!important;padding-bottom:58px!important}html.exp-master-active .ops-side{display:block!important;position:fixed!important;left:0!important;right:0!important;top:auto!important;bottom:0!important;width:auto!important;height:58px!important;min-height:0!important;padding:6px 8px!important;border:0!important;border-top:1px solid #ececef!important;z-index:30!important;overflow:hidden!important}html.exp-master-active .ops-brand,html.exp-master-active .ops-ana{display:none!important}html.exp-master-active .ops-side nav{display:flex!important;gap:6px!important;padding:0!important;overflow-x:auto!important;overflow-y:hidden!important;min-height:0!important;scrollbar-width:none!important}html.exp-master-active .ops-side nav button{display:flex!important;flex:0 0 auto!important;height:44px!important;min-height:44px!important;min-width:max-content!important;padding:0 12px!important;font-size:11px!important;justify-content:center!important;text-align:center!important;white-space:nowrap!important}html.exp-master-active .ops-side nav button span{display:inline!important;overflow:visible!important;text-overflow:clip!important}html.exp-master-active .ops-side nav button svg{display:none!important}html.exp-master-active .ops-main{height:calc(100vh - 58px)!important;overflow-y:auto!important;overflow-x:hidden!important}html.exp-master-active .ops-top{position:sticky!important;top:0!important;grid-template-columns:minmax(0,1fr) auto!important;height:auto!important;min-height:66px!important;padding:10px 12px!important}html.exp-master-active .ops-content{padding:16px 16px 96px!important}.exp-master-quick{grid-template-columns:repeat(2,1fr)}html.exp-master-active .exp-table .ops-table-wrap{max-height:390px!important}}
`;

function iconMarkup(label:string){
  const common='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const key=label.toLowerCase();
  if(key.includes('inicio'))return `<svg ${common}><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h14v-9.5"/></svg>`;
  if(key.includes('expediente'))return `<svg ${common}><path d="M3 6h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>`;
  if(key.includes('banco'))return `<svg ${common}><path d="m3 10 9-6 9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/></svg>`;
  if(key.includes('contact')||key.includes('financier')||key.includes('visitador')||key.includes('perfil'))return `<svg ${common}><circle cx="12" cy="8" r="3"/><path d="M5 20c.8-4.2 3.1-6.3 7-6.3s6.2 2.1 7 6.3"/></svg>`;
  if(key.includes('inmobili'))return `<svg ${common}><path d="M4 21V5h10v16M14 9h6v12M8 9h2M8 13h2M8 17h2M17 13h1M17 17h1"/></svg>`;
  if(key.includes('agenda')||key.includes('firma'))return `<svg ${common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>`;
  if(key.includes('notar')||key.includes('registro'))return `<svg ${common}><path d="M4 21h16M6 18V9h12v9M4 9l8-5 8 5"/></svg>`;
  if(key.includes('document')||key.includes('informe')||key.includes('comunic'))return `<svg ${common}><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 12h6M9 16h6"/></svg>`;
  if(key.includes('notific'))return `<svg ${common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>`;
  return `<svg ${common}><circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/></svg>`;
}

export default function ExpedientesMasterChrome(){
  const location=useLocation(),navigate=useNavigate();
  const active=location.pathname==='/expedientes';
  const [mount,setMount]=useState<HTMLElement|null>(null);
  useEffect(()=>{if(!active)return;document.documentElement.classList.add('exp-master-active');return()=>document.documentElement.classList.remove('exp-master-active')},[active]);
  useEffect(()=>{
    if(!active)return;
    const enhance=()=>{
      document.querySelectorAll<HTMLButtonElement>('.ops-side nav button').forEach(button=>{
        if(button.dataset.masterIcon==='1')return;
        const label=button.textContent?.trim()||'';
        if(!label)return;
        button.dataset.masterIcon='1';
        button.innerHTML=`${iconMarkup(label)}<span>${label}</span>`;
      });
      const ana=document.querySelector<HTMLButtonElement>('.ops-ana');
      if(ana&&ana.dataset.masterCopy!=='1'){
        const strong=ana.querySelector('strong'),small=ana.querySelector('small');
        if(strong)strong.textContent='¿Necesitas ayuda?';
        if(small)small.textContent='Habla con Ana, tu asistente inteligente. · Hablar con Ana →';
        ana.dataset.masterCopy='1';
      }
      const actions=document.querySelector<HTMLElement>('.ops-top .ops-top-actions');
      if(actions&&!actions.querySelector('.ops-master-bell')){
        const bell=document.createElement('button');bell.type='button';bell.className='ops-master-bell';bell.setAttribute('aria-label','Notificaciones');bell.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>';bell.addEventListener('click',()=>navigate('/notificaciones'));const profile=actions.querySelector('.ops-profile');actions.insertBefore(bell,profile||actions.firstChild);
      }
    };
    enhance();
    const observer=new MutationObserver(enhance);observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[active,navigate]);
  useEffect(()=>{if(!active){setMount(null);return}const place=()=>{const content=document.querySelector('.ops-content');if(!content)return;let node=document.querySelector('.exp-master-footer-mount') as HTMLElement|null;if(!node){node=document.createElement('div');node.className='exp-master-footer-mount';content.appendChild(node)}setMount(node)};place();const observer=new MutationObserver(place);observer.observe(document.body,{childList:true,subtree:true});return()=>{observer.disconnect();document.querySelector('.exp-master-footer-mount')?.remove()}},[active]);
  if(!active)return null;
  return <><style>{css}</style>{mount&&createPortal(<section className="exp-master-footer dir-quick"><h2>ACCESOS RÁPIDOS</h2><div className="exp-master-quick dir-quick-grid"><button onClick={()=>navigate('/expedientes/nuevo')}><FolderOpen/>+ Nuevo expediente</button><button onClick={()=>navigate('/contactos/nuevo')}><UserRound/>+ Nuevo contacto</button><button onClick={()=>navigate('/inmobiliarias')}><Building2/>Inmobiliarias</button><button onClick={()=>navigate('/agenda')}><CalendarDays/>Agenda</button><button onClick={()=>navigate('/documentacion')}><FileText/>Documentación</button><button onClick={()=>navigate('/informes')}><BarChart3/>Informes</button></div></section>,mount)}</>;
}
