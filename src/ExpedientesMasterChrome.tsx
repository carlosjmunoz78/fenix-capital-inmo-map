import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Building2, CalendarDays, FileText, FolderOpen, UserRound } from 'lucide-react';

const css=`
html.exp-master-active .ops-root{grid-template-columns:236px minmax(0,1fr)!important;min-height:100vh!important;background:#f7f7f8!important;color:#1d1d1f!important}
html.exp-master-active .ops-side{display:flex!important;position:sticky!important;top:0!important;height:100vh!important;padding:20px 16px!important;background:#fff!important;border-right:1px solid #ededed!important;color:#222!important;z-index:20!important}
html.exp-master-active .ops-brand{height:72px!important;padding:0 8px 15px!important;gap:12px!important;border-bottom:1px solid #f0f0f0!important}
html.exp-master-active .ops-brand img{width:44px!important;height:35px!important;object-fit:contain!important}
html.exp-master-active .ops-brand strong{font-size:14px!important;letter-spacing:.04em!important;color:#111!important}
html.exp-master-active .ops-side nav{gap:5px!important;padding-top:14px!important;overflow-y:auto!important;min-height:0!important;scrollbar-width:thin!important}
html.exp-master-active .ops-side nav button{height:43px!important;min-height:43px!important;border-radius:10px!important;padding:0 13px!important;font-size:13.5px!important}
html.exp-master-active .ops-side nav button.active{background:#fff1ea!important;color:#f36c21!important;font-weight:700!important}
html.exp-master-active .ops-ana{margin-top:12px!important;border:1px solid #e8e8e8!important;border-radius:13px!important;padding:15px 13px!important;background:#fff!important;color:#222!important}
html.exp-master-active .ops-main{display:block!important;min-width:0!important;height:100vh!important;overflow-y:auto!important;background:#f7f7f8!important}
html.exp-master-active .ops-top{display:flex!important;position:sticky!important;top:0!important;height:74px!important;min-height:74px!important;padding:0 26px!important;background:#fff!important;border-bottom:1px solid #ededed!important;z-index:15!important}
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
html[data-theme='dark'].exp-master-active .ops-root,html[data-theme='dark'].exp-master-active .ops-main{background:#151516!important;color:#f4f4f5!important}html[data-theme='dark'].exp-master-active .ops-side,html[data-theme='dark'].exp-master-active .ops-top{background:#1b1b1d!important;color:#f4f4f5!important;border-color:#343438!important}html[data-theme='dark'].exp-master-active .ops-brand strong{color:#fff!important}html[data-theme='dark'].exp-master-active .ops-ana,html[data-theme='dark'].exp-master-active .exp-master-quick button{background:#202023!important;color:#f4f4f5!important;border-color:#39393e!important}html[data-theme='dark'].exp-master-active .exp-table thead{background:#202023!important}
@media(max-width:1180px){html.exp-master-active .ops-root{grid-template-columns:88px minmax(0,1fr)!important}.exp-master-quick{grid-template-columns:repeat(3,1fr)}}
@media(max-width:760px){html.exp-master-active .ops-root{display:block!important}html.exp-master-active .ops-side{display:flex!important;position:relative!important;width:100%!important;height:auto!important}html.exp-master-active .ops-main{height:auto!important;overflow:visible!important}html.exp-master-active .ops-top{position:sticky!important;top:0!important}html.exp-master-active .ops-content{padding:16px!important}.exp-master-quick{grid-template-columns:repeat(2,1fr)}html.exp-master-active .exp-table .ops-table-wrap{max-height:390px!important}}
`;

export default function ExpedientesMasterChrome(){
  const location=useLocation(),navigate=useNavigate();
  const active=location.pathname==='/expedientes';
  const [mount,setMount]=useState<HTMLElement|null>(null);
  useEffect(()=>{if(!active)return;document.documentElement.classList.add('exp-master-active');return()=>document.documentElement.classList.remove('exp-master-active')},[active]);
  useEffect(()=>{if(!active){setMount(null);return}const place=()=>{const content=document.querySelector('.ops-content');if(!content)return;let node=document.querySelector('.exp-master-footer-mount') as HTMLElement|null;if(!node){node=document.createElement('div');node.className='exp-master-footer-mount';content.appendChild(node)}setMount(node)};place();const observer=new MutationObserver(place);observer.observe(document.body,{childList:true,subtree:true});return()=>{observer.disconnect();document.querySelector('.exp-master-footer-mount')?.remove()}},[active]);
  if(!active)return null;
  return <><style>{css}</style>{mount&&createPortal(<section className="exp-master-footer dir-quick"><h2>ACCESOS RÁPIDOS</h2><div className="exp-master-quick dir-quick-grid"><button onClick={()=>navigate('/expedientes/nuevo')}><FolderOpen/>+ Nuevo expediente</button><button onClick={()=>navigate('/contactos/nuevo')}><UserRound/>+ Nuevo contacto</button><button onClick={()=>navigate('/inmobiliarias')}><Building2/>Inmobiliarias</button><button onClick={()=>navigate('/agenda')}><CalendarDays/>Agenda</button><button onClick={()=>navigate('/documentacion')}><FileText/>Documentación</button><button onClick={()=>navigate('/informes')}><BarChart3/>Informes</button></div></section>,mount)}</>;
}
