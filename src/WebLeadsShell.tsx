import {useEffect,useMemo,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {fetchAppApi,supabase} from './supabase';
import {normalizeNavigation,type NavItem} from './masterNavigation';
import OperationalShellFrame from './OperationalShellFrame';
import {anaVertical} from './assets/visualAssets';
import './operational.css';
import './contactos-polish.css';

type Theme='light'|'dark';
type Ctx={actor_code?:string;role?:string};
type Lead={id?:string;cliente_code?:string;nombre?:string;email?:string;telefono?:string;estado?:string;consentimiento_comercial?:boolean;received_at?:string;updated_at?:string;source?:string;landing_url?:string;city?:string;funnel?:string;asset_url?:string;asset_label?:string;tarea_code?:string;task_state?:string;planned_action?:string;happened?:string;fecha_limite?:string;last_action_at?:string;};
const fallbackNav:NavItem[]=[{label:'Inicio',route:'/inicio'}];
function fmt(v?:string){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleString('es-ES');}
function rows(data:unknown):Lead[]{if(!data||typeof data!=='object')return[];const x=data as {items?:unknown[]};return Array.isArray(x.items)?x.items as Lead[]:[];}

export default function WebLeadsShell(){
 const location=useLocation(),navigate=useNavigate();const active=location.pathname==='/web-leads';
 const[ready,setReady]=useState(false),[logged,setLogged]=useState(false),[ctx,setCtx]=useState<Ctx|null>(null),[nav,setNav]=useState<NavItem[]>([]);
 const[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light');
 const[items,setItems]=useState<Lead[]>([]),[status,setStatus]=useState<number|null>(null),[loading,setLoading]=useState(false),[query,setQuery]=useState('');
 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[active]);
 useEffect(()=>{if(!active)return;document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme);},[active,theme]);
 useEffect(()=>{if(!active||!logged)return;Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<unknown>('/navigation')]).then(([c,n])=>{setCtx(c.status===200?c.data:null);setNav(n.status===200?normalizeNavigation(n.data):[]);});},[active,logged]);
 async function load(){setLoading(true);const r=await fetchAppApi<unknown>('/web-leads');setStatus(r.status);setItems(r.status===200?rows(r.data):[]);setLoading(false);}
 useEffect(()=>{if(active&&logged&&ctx)void load();},[active,logged,ctx]);
 const visible=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return items;return items.filter(x=>[x.nombre,x.email,x.telefono,x.city,x.funnel,x.source,x.asset_label].some(v=>String(v||'').toLowerCase().includes(q)));},[items,query]);
 const pending=items.filter(x=>!x.happened||/pendiente|nuevo|activa/i.test(String(x.task_state||x.estado||''))).length;
 if(!active||!ready||!logged)return null;
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
 const role=ctx?.role||'Usuario';
 return <OperationalShellFrame className="contactos-root" theme={theme} navigation={nav.length?nav:fallbackNav} activeRoute="/contactos" anaSubtitle="Captación web trazada de principio a fin." query={query} onQueryChange={setQuery} searchPlaceholder="Buscar lead, ciudad, email o intención..." searchActionLabel="Buscar" onSearchAction={()=>{}} name={role} role="" initials={role.slice(0,2).toUpperCase()} onToggleTheme={()=>setTheme(theme==='light'?'dark':'light')} onLogout={logout} contentClassName="contactos-content">
   <section className="inmo-ana-hero contactos-ana-hero"><div className="inmo-ana-photo contactos-ana-photo"><img src={anaVertical} alt="Ana"/></div><div className="inmo-ana-body"><span>ANA · LEADS WEB</span><h2>Captación que entra directamente en la App</h2><p>{status===200?'Hay '+items.length+' leads web y '+pending+' requieren atención o siguiente acción.':'Estoy verificando el circuito de captación.'}</p><div className="inmo-next contactos-next"><button onClick={()=>navigate('/contactos')}><b>1</b><strong>Volver a Contactos</strong><small>CRM general →</small></button><button onClick={()=>navigate('/agenda')}><b>2</b><strong>Ver tareas</strong><small>Seguimiento →</small></button><button onClick={()=>navigate('/comunicaciones')}><b>3</b><strong>Comunicaciones</strong><small>Email / Brevo →</small></button></div></div></section>
   <div className="contactos-title inmo-title"><div><small>CAPTACIÓN WEB · CEREBRO</small><h1>Leads web</h1><p>Origen, hora de entrada, acción realizada y siguiente paso dentro del CRM.</p></div><button className="primary" onClick={()=>void load()}>{loading?'Actualizando…':'Actualizar'}</button></div>
   {status===403?<div className="ops-message">Tu perfil no tiene permiso para ver la bandeja de leads web.</div>:status!==null&&status!==200?<div className="ops-message">No se pudo cargar la bandeja de leads.</div>:null}
   {status===200&&<><section className="inmo-kpis contactos-kpis"><article><small>LEADS WEB</small><strong>{items.length}</strong><span>Capturados</span></article><article><small>PENDIENTES</small><strong>{pending}</strong><span>Requieren atención</span></article><article><small>CON ACCIÓN</small><strong>{items.length-pending}</strong><span>Ya trabajados</span></article><article><small>TRAZABILIDAD</small><strong>100%</strong><span>Fecha/hora y origen</span></article></section>
   <div className="ops-table-card contactos-table"><div className="ops-table-head"><strong>{visible.length} registros</strong><span>Web → CEREBRO → App</span></div><div className="ops-table-wrap"><table className="ops-sortable-table"><thead><tr><th>Lead</th><th>Origen</th><th>Entrada</th><th>Última acción</th><th>Siguiente acción</th><th></th></tr></thead><tbody>{visible.map((x,i)=><tr key={x.cliente_code||x.id||i} className="ops-clickable-row" tabIndex={0} onClick={()=>x.cliente_code&&navigate('/web-leads/'+encodeURIComponent(x.cliente_code))} onKeyDown={e=>{if((e.key==='Enter'||e.key===' ')&&x.cliente_code){e.preventDefault();navigate('/web-leads/'+encodeURIComponent(x.cliente_code))}}}><td><strong>{x.nombre||'Lead web'}</strong><br/><small>{x.email||x.telefono||'Sin identificador visible'}</small></td><td>{[x.city,x.funnel,x.source].filter(Boolean).join(' · ')||'Web'}</td><td>{fmt(x.received_at)}</td><td>{x.happened||'—'}<br/><small>{fmt(x.last_action_at)}</small></td><td>{x.planned_action||'Contactar y completar datos'}<br/><small>{fmt(x.fecha_limite)}</small></td><td>→</td></tr>)}</tbody></table></div></div></>}
 </OperationalShellFrame>;
}
