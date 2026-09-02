import {useEffect,useMemo,useState} from 'react';
import {ArrowLeft,CheckCircle2} from 'lucide-react';
import {useLocation,useNavigate} from 'react-router-dom';
import {fetchAppApi,supabase} from './supabase';
import {fetchNotionRuntime} from './notionRuntime';
import {normalizeNavigation,type NavItem} from './masterNavigation';
import OperationalShellFrame from './OperationalShellFrame';
import {anaVertical} from './assets/visualAssets';
import './operational.css';
import './task-detail-polish.css';

type Theme='light'|'dark';type Ctx={role?:string};type Row=Record<string,unknown>;
const fallbackNav:NavItem[]=[{label:'Inicio',route:'/inicio'}];
function rowsFrom(data:unknown):Row[]{if(!data||typeof data!=='object')return[];const items=(data as{items?:unknown[]}).items;return Array.isArray(items)?items.filter((x):x is Row=>Boolean(x&&typeof x==='object'&&!Array.isArray(x))):[];}
function text(row:Row,keys:string[]){for(const key of keys){const value=row[key];if(typeof value==='string'&&value.trim())return value.trim();if(typeof value==='number'&&Number.isFinite(value))return String(value);}return'';}
function idOf(row:Row){return text(row,['id','tarea_id','tarea_code','code']);}
function pretty(key:string){return key.replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase());}
function value(v:unknown){if(v===null||v===undefined||v==='')return'—';if(typeof v==='boolean')return v?'Sí':'No';if(Array.isArray(v))return v.length?v.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join(', '):'—';if(typeof v==='object')return JSON.stringify(v);return String(v);}

export default function TaskDetailShell(){
 const location=useLocation(),navigate=useNavigate();const match=location.pathname.match(/^\/agenda\/tarea\/([^/]+)$/);const id=match?.[1]?decodeURIComponent(match[1]):'';const active=Boolean(match&&id);
 const[ready,setReady]=useState(false),[logged,setLogged]=useState(false),[ctx,setCtx]=useState<Ctx|null>(null),[nav,setNav]=useState<NavItem[]>([]),[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light');
 const[status,setStatus]=useState<number|null>(null),[row,setRow]=useState<Row|null>(null),[loading,setLoading]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[active]);
 useEffect(()=>{if(!active)return;document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme);},[active,theme]);
 useEffect(()=>{if(!active||!logged)return;Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<unknown>('/navigation')]).then(([c,n])=>{setCtx(c.status===200?c.data:null);setNav(n.status===200?normalizeNavigation(n.data):[]);});},[active,logged]);
 useEffect(()=>{if(!active||!logged)return;let alive=true;(async()=>{setLoading(true);setMessage('');setStatus(null);setRow(null);try{const r=await fetchNotionRuntime<unknown>('/tareas');if(!alive)return;if(r.status!==200){setStatus(r.status);setMessage(r.status===403?'Tu perfil no puede abrir esta tarea.':'No se pudo leer la fuente canónica de tareas.');return;}const found=rowsFrom(r.data).find(item=>idOf(item)===id)||null;setStatus(found?200:404);setRow(found);if(!found)setMessage('No se ha encontrado esta tarea dentro de tu ámbito autorizado.');}catch{if(alive){setStatus(0);setMessage('No se pudo conectar con la fuente canónica de tareas.');}}finally{if(alive)setLoading(false);}})();return()=>{alive=false};},[active,logged,id]);
 const fields=useMemo(()=>row?Object.keys(row).filter(k=>!['id','synthetic','fuente','destino'].includes(k)):[],[row]);
 if(!active||!ready||!logged)return null;
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
 const title=row?text(row,['tarea','titulo','título','nombre','title'])||'Tarea':'Tarea';const effectiveNav=nav.length?nav:fallbackNav;
 return <OperationalShellFrame className="task-detail-root" theme={theme} navigation={effectiveNav} activeRoute="/agenda" query="" onQueryChange={()=>{}} searchPlaceholder="" name={ctx?.role||'Usuario'} role="" initials={(ctx?.role||'U').slice(0,2).toUpperCase()} onToggleTheme={()=>setTheme(theme==='light'?'dark':'light')} onLogout={logout} contentClassName="task-detail-content">
  <section className="inmo-ana-hero task-detail-ana"><div className="inmo-ana-photo"><img src={anaVertical} alt="Ana"/></div><div className="inmo-ana-body"><span>ANA · TAREA</span><h2>Vamos a resolver esta tarea sin perder contexto</h2><p>Esta ficha lee la tarea desde tu listado canónico autorizado. No inventa datos ni envía cambios a endpoints de prueba.</p><div className="inmo-next"><button onClick={()=>navigate('/agenda')}><b>1</b><strong>Volver a Agenda</strong><small>Ver todas →</small></button><button onClick={()=>navigate(`/ana?mode=help&scope_type=tarea&scope_code=${encodeURIComponent(id)}`)}><b>2</b><strong>Ayúdame con Ana</strong><small>Revisar siguiente paso →</small></button></div></div></section>
  <button className="inmo-detail-back" onClick={()=>navigate('/agenda')}><ArrowLeft size={15}/> Volver a Agenda</button>
  <div className="ops-title"><div><span className="ops-icon"><CheckCircle2 size={20}/></span><div><h1>{title}</h1><p>Fuente canónica · ámbito autorizado del usuario.</p></div></div><span className={status===200&&!loading?'ops-live ok':'ops-live'}>{loading?'Cargando…':status===200?'Datos vivos':'Sin ficha'}</span></div>
  {loading&&<div className="ops-empty"><strong>Cargando tarea…</strong></div>}{message&&<div className="ops-message">{message}</div>}
  {status===200&&row&&<div className="ops-table-card"><div className="ops-table-head"><strong>Ficha de tarea</strong><span>Lectura segura</span></div><div className="ops-message" style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>{fields.map(key=><div key={key}><small>{pretty(key)}</small><div><strong>{value(row[key])}</strong></div></div>)}</div></div>}
 </OperationalShellFrame>;
}
