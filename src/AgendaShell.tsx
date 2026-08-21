import {useEffect,useMemo,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {CalendarDays,CheckSquare,LogOut,Moon,Search,Sun} from 'lucide-react';
import {fetchAppApi,supabase} from './supabase';
import {fetchNotionRuntime} from './notionRuntime';
import {anaAvatar,anaVertical,fenixLogo} from './assets/visualAssets';
import './operational.css';
import './agenda-polish.css';

type Theme='light'|'dark';
type Ctx={actor_code?:string;role?:string};
type NavItem={label:string;route:string};
type Row=Record<string,unknown>;
const fallbackNav:NavItem[]=[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'},{label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Tasaciones',route:'/tasaciones'},{label:'Firmas',route:'/firmas'},{label:'Documentación',route:'/documentacion'},{label:'Financieros',route:'/financieros'},{label:'Visitadores',route:'/visitadores'},{label:'Agenda',route:'/agenda'},{label:'Informes',route:'/informes'}];
function normalizeNav(data:unknown):NavItem[]{if(!data||typeof data!=='object')return[];const items=(data as{items?:unknown[]}).items;if(!Array.isArray(items))return[];return items.map(x=>{if(typeof x==='string')return{label:x.replace(/^\//,'')||'Inicio',route:x};if(x&&typeof x==='object'){const o=x as Record<string,unknown>;if(typeof o.route==='string')return{label:typeof o.label==='string'?o.label:o.route.replace(/^\//,''),route:o.route};}return null;}).filter((x):x is NavItem=>Boolean(x));}
function rowsFrom(data:unknown):Row[]{if(!data||typeof data!=='object')return[];const d=data as Record<string,unknown>;return Array.isArray(d.items)?d.items as Row[]:[];}
function text(r:Row,keys:string[]){for(const k of keys){const v=r[k];if(typeof v==='string'&&v.trim())return v.trim();}return'';}
function bool(r:Row,keys:string[]){for(const k of keys){const v=r[k];if(typeof v==='boolean')return v;if(typeof v==='string'&&/^(si|sí|true|1|completada)$/i.test(v.trim()))return true;}return false;}
function idOf(r:Row){return text(r,['id','tarea_id','tarea_code','code']);}
function titleOf(r:Row){return text(r,['tarea','titulo','título','nombre','title'])||'Tarea sin título visible';}
function stateOf(r:Row){return text(r,['estado','status'])||'Sin estado';}
function dueOf(r:Row){return text(r,['fecha_limite','fecha_límite','vencimiento','fecha','due_date'])||'No disponible';}
function priorityOf(r:Row){return text(r,['criticidad','prioridad','priority'])||'No disponible';}
function responsibleOf(r:Row){return text(r,['responsable','trabajador','asignado_a','id_trabajador_operativo'])||'No disponible';}
function completed(r:Row){return bool(r,['completada','completado','done'])||/complet|cerrad|hecha/i.test(stateOf(r));}
function pending(r:Row){return !completed(r);}
function overdue(r:Row){const due=dueOf(r);if(due==='No disponible'||completed(r))return false;const d=new Date(due);if(Number.isNaN(d.getTime()))return /vencid/i.test(stateOf(r));const today=new Date();today.setHours(0,0,0,0);return d.getTime()<today.getTime();}

export default function AgendaShell(){
 const location=useLocation(),navigate=useNavigate();const active=location.pathname==='/agenda';
 const[sessionReady,setSessionReady]=useState(false),[logged,setLogged]=useState(false),[ctx,setCtx]=useState<Ctx|null>(null),[nav,setNav]=useState<NavItem[]>([]),[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light');
 const[rows,setRows]=useState<Row[]>([]),[status,setStatus]=useState<number|null>(null),[loading,setLoading]=useState(false),[message,setMessage]=useState('');
 const[query,setQuery]=useState(''),[state,setState]=useState(''),[priority,setPriority]=useState(''),[selected,setSelected]=useState<string[]>([]);
 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setSessionReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setSessionReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[active]);
 useEffect(()=>{if(!active)return;document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme);},[active,theme]);
 useEffect(()=>{if(!active||!logged)return;Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<unknown>('/navigation')]).then(([c,n])=>{setCtx(c.status===200?c.data:null);setNav(n.status===200?normalizeNav(n.data):[]);});},[active,logged]);
 useEffect(()=>{if(!active||!logged)return;let alive=true;(async()=>{setLoading(true);setMessage('');const r=await fetchNotionRuntime<unknown>('/tareas');if(!alive)return;setStatus(r.status);setRows(r.status===200?rowsFrom(r.data):[]);if(r.status===403)setMessage('Tu perfil no tiene acceso a este módulo o registro.');else if(r.status!==200)setMessage('No se pudo leer la fuente canónica de Agenda/Tareas.');setLoading(false);})();return()=>{alive=false}},[active,logged]);
 const effectiveNav=nav.length?nav:fallbackNav;
 const states=useMemo(()=>Array.from(new Set(rows.map(stateOf).filter(Boolean))).sort(),[rows]);const priorities=useMemo(()=>Array.from(new Set(rows.map(priorityOf).filter(v=>v!=='No disponible'))).sort(),[rows]);
 const visible=useMemo(()=>{const q=query.trim().toLowerCase();return rows.filter(r=>{const hay=Object.values(r).filter(v=>typeof v==='string'||typeof v==='number').join(' ').toLowerCase();return(!q||hay.includes(q))&&(!state||stateOf(r)===state)&&(!priority||priorityOf(r)===priority)});},[rows,query,state,priority]);
 const pendingCount=useMemo(()=>rows.filter(pending).length,[rows]),completedCount=useMemo(()=>rows.filter(completed).length,[rows]),overdueCount=useMemo(()=>rows.filter(overdue).length,[rows]);
 if(!active||!sessionReady||!logged)return null;
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
 function toggle(id:string){setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);}
 function openAna(){if(!selected.length)return;const q=new URLSearchParams({mode:'do',resource:'tareas',ids:selected.join(',')});navigate(`/ana?${q.toString()}`);}
 return <div className="ops-root agenda-root" data-theme={theme}>
  <aside className="ops-side"><button className="ops-brand" onClick={()=>navigate('/inicio')}><img src={fenixLogo} alt=""/><strong>FÉNIX CAPITAL</strong></button><nav>{effectiveNav.map(item=><button key={item.route} className={item.route==='/agenda'?'active':''} onClick={()=>navigate(item.route)}>{item.label}</button>)}</nav><button className="ops-ana" onClick={()=>navigate('/ana')}><img src={anaAvatar} alt="Ana"/><span><strong>Ana está contigo</strong><small>Cuando quieras, avanzamos paso a paso.</small></span></button></aside>
  <main className="ops-main"><header className="ops-top"><div className="ops-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar tarea, expediente o responsable..."/><button>Buscar</button></div><div className="ops-top-actions"><button onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={17}/>:<Sun size={17}/>} {theme==='light'?'Oscuro':'Claro'}</button><div className="ops-profile"><strong>{ctx?.role||'Usuario'}</strong></div><button onClick={logout} aria-label="Cerrar sesión"><LogOut size={17}/></button></div></header>
   <section className="ops-content agenda-content">
    <section className="agenda-ana-hero"><div className="agenda-ana-photo"><img src={anaVertical} alt="Ana"/></div><div className="agenda-ana-body"><span>ANA · EN ESTA PANTALLA</span><h2>Organizamos lo siguiente, no todo a la vez</h2><p>Selecciona tareas reales y Ana preparará la ejecución para revisión. Nada se completa ni reasigna sin una acción permitida y confirmada.</p><div className="agenda-next"><button onClick={()=>setState(states.find(s=>/pendiente|abierta|hacer/i.test(s))||'')}><b>1</b><strong>Priorizar pendientes</strong><small>Filtrar →</small></button><button onClick={()=>setState('')}><b>2</b><strong>Ver toda mi agenda</strong><small>Restablecer →</small></button><button onClick={openAna} disabled={!selected.length}><b>3</b><strong>Lo hace Ana</strong><small>{selected.length?`${selected.length} seleccionadas`:'Selecciona tareas'}</small></button></div></div></section>
    <div className="agenda-title"><div><small>AGENDA Y TAREAS</small><h1>Agenda</h1><p>{status===200?`${rows.length} tareas visibles en tu ámbito autorizado.`:'Lectura canónica según permisos.'}</p></div><div className="agenda-actions"><button onClick={()=>navigate('/tareas/nueva')}>+ Nueva tarea</button><span className={status===200?'ops-live ok':'ops-live'}>{loading?'Cargando…':status===200?'Datos vivos':'PRE-PROD'}</span></div></div>
    {message&&<div className="ops-message">{message}</div>}
    {status===200&&<><section className="agenda-kpis"><article><CalendarDays size={18}/><small>EN FUENTE</small><strong>{rows.length}</strong><span>Registros visibles canónicos</span></article><article><small>PENDIENTES</small><strong>{pendingCount}</strong><span>No completadas según fuente</span></article><article><CheckSquare size={18}/><small>COMPLETADAS</small><strong>{completedCount}</strong><span>Derivado del estado/completada</span></article><article><small>VENCIDAS</small><strong>{overdueCount}</strong><span>Solo si la fecha permite derivarlo</span></article></section>
     <section className="agenda-filter"><div className="agenda-filter-head"><div><small>TRABAJO AUTORIZADO</small><h2>Tareas disponibles</h2></div><span>{visible.length} visibles</span></div><label>BUSCAR<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tarea o dato relacionado"/></label><div className="agenda-filter-grid"><label>ESTADO<select value={state} onChange={e=>setState(e.target.value)}><option value="">Todos</option>{states.map(v=><option key={v}>{v}</option>)}</select></label><label>PRIORIDAD<select value={priority} onChange={e=>setPriority(e.target.value)}><option value="">Todas</option>{priorities.map(v=><option key={v}>{v}</option>)}</select></label><button onClick={()=>{setQuery('');setState('');setPriority('');setSelected([])}}>Limpiar</button></div></section>
     {selected.length>0&&<section className="agenda-selection"><strong>{selected.length} tareas seleccionadas</strong><span>La selección no modifica datos.</span><button onClick={openAna}>Preparar con Ana</button></section>}
     {loading?<div className="ops-empty"><strong>Cargando…</strong></div>:visible.length===0?<div className="ops-empty"><strong>Sin tareas visibles</strong><span>No hay registros para estos filtros o para tu ámbito actual.</span></div>:<div className="ops-table-card agenda-table"><div className="ops-table-head"><strong>{visible.length} registros</strong><span>Fuente canónica Notion</span></div><div className="ops-table-wrap"><table><thead><tr><th></th><th>Tarea</th><th>Estado</th><th>Fecha límite</th><th>Prioridad</th><th>Responsable</th><th></th></tr></thead><tbody>{visible.map((r,i)=>{const id=idOf(r);const checked=id&&selected.includes(id);return <tr key={id||i} className={id?'ops-clickable-row':''}><td><input aria-label={`Seleccionar ${titleOf(r)}`} type="checkbox" checked={Boolean(checked)} disabled={!id} onChange={()=>id&&toggle(id)} onClick={e=>e.stopPropagation()}/></td><td onClick={()=>id&&navigate(`/tareas/${encodeURIComponent(id)}`)}><strong>{titleOf(r)}</strong></td><td>{stateOf(r)}</td><td>{dueOf(r)}</td><td>{priorityOf(r)}</td><td>{responsibleOf(r)}</td><td onClick={()=>id&&navigate(`/tareas/${encodeURIComponent(id)}`)}>{id?'→':''}</td></tr>})}</tbody></table></div></div>}</>}
   </section>
  </main>
 </div>;
}
