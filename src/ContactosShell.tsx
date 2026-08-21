import {useEffect,useMemo,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {LogOut,Moon,Search,Sun} from 'lucide-react';
import {fetchAppApi,supabase} from './supabase';
import {fetchNotionRuntime} from './notionRuntime';
import {anaAvatar,anaVertical,fenixLogo} from './assets/visualAssets';
import './operational.css';
import './contactos-polish.css';

type Theme='light'|'dark';
type Ctx={actor_code?:string;role?:string};
type NavItem={label:string;route:string};
type Row=Record<string,unknown>;
const fallbackNav:NavItem[]=[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'},{label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Tasaciones',route:'/tasaciones'},{label:'Firmas',route:'/firmas'},{label:'Documentación',route:'/documentacion'},{label:'Financieros',route:'/financieros'},{label:'Visitadores',route:'/visitadores'},{label:'Agenda',route:'/agenda'},{label:'Informes',route:'/informes'}];
function normalizeNav(data:unknown):NavItem[]{if(!data||typeof data!=='object')return[];const items=(data as{items?:unknown[]}).items;if(!Array.isArray(items))return[];return items.map(x=>{if(typeof x==='string')return{label:x.replace(/^\//,'')||'Inicio',route:x};if(x&&typeof x==='object'){const o=x as Record<string,unknown>;if(typeof o.route==='string')return{label:typeof o.label==='string'?o.label:o.route.replace(/^\//,''),route:o.route};}return null;}).filter((x):x is NavItem=>Boolean(x));}
function rowsFrom(data:unknown):Row[]{if(!data||typeof data!=='object')return[];const d=data as Record<string,unknown>;return Array.isArray(d.items)?d.items as Row[]:[];}
function text(row:Row,keys:string[]){for(const k of keys){const v=row[k];if(typeof v==='string'&&v.trim())return v.trim();}return'';}
function bool(row:Row,keys:string[]){for(const k of keys){const v=row[k];if(typeof v==='boolean')return v;if(typeof v==='string'){const s=v.toLowerCase();if(['sí','si','true','yes'].includes(s))return true;if(['no','false'].includes(s))return false;}}return null;}
function idOf(row:Row){return text(row,['id','contact_id','contacto_id','contact_key']);}
function stateOf(row:Row){return text(row,['estado','estado_comercial','estado_relacion','relacion','relación']);}
function phaseOf(row:Row){return text(row,['fase','fase_vinculada','expediente_fase']);}
function followOf(row:Row){return text(row,['proxima_accion','próxima_acción','seguimiento','ultimo_contacto','último_contacto']);}
function nameOf(row:Row){return text(row,['cliente','nombre','nombre_alias','contacto','title'])||'Contacto sin nombre';}
function relationOf(row:Row){return text(row,['relacion','relación','tipo','perfil','estado_comercial'])||'—';}
function expedienteOf(row:Row){return text(row,['expediente','expediente_code','codigo_expediente','código_expediente'])||'—';}

export default function ContactosShell(){
 const location=useLocation(),navigate=useNavigate();const active=location.pathname==='/contactos';
 const[sessionReady,setSessionReady]=useState(false),[logged,setLogged]=useState(false),[ctx,setCtx]=useState<Ctx|null>(null),[nav,setNav]=useState<NavItem[]>([]),[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light');
 const[rows,setRows]=useState<Row[]>([]),[status,setStatus]=useState<number|null>(null),[loading,setLoading]=useState(false),[message,setMessage]=useState('');
 const[query,setQuery]=useState(''),[state,setState]=useState(''),[phase,setPhase]=useState(''),[order,setOrder]=useState('nombre');
 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setSessionReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setSessionReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[active]);
 useEffect(()=>{if(!active)return;document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme);},[active,theme]);
 useEffect(()=>{if(!active||!logged)return;Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<unknown>('/navigation')]).then(([c,n])=>{setCtx(c.status===200?c.data:null);setNav(n.status===200?normalizeNav(n.data):[]);});},[active,logged]);
 useEffect(()=>{if(!active||!logged)return;let alive=true;(async()=>{setLoading(true);setMessage('');const r=await fetchNotionRuntime<unknown>('/clientes');if(!alive)return;setStatus(r.status);setRows(r.status===200?rowsFrom(r.data):[]);if(r.status===403)setMessage('Tu perfil no tiene acceso a los contactos de este ámbito.');else if(r.status!==200)setMessage('No se pudo leer la fuente canónica de Contactos.');setLoading(false);})();return()=>{alive=false}},[active,logged]);
 const effectiveNav=nav.length?nav:fallbackNav;
 const states=useMemo(()=>Array.from(new Set(rows.map(stateOf).filter(Boolean))).sort(),[rows]);
 const phases=useMemo(()=>Array.from(new Set(rows.map(phaseOf).filter(Boolean))).sort(),[rows]);
 const visible=useMemo(()=>{const q=query.trim().toLowerCase();const out=rows.filter(r=>{const hay=Object.values(r).filter(v=>typeof v==='string'||typeof v==='number').join(' ').toLowerCase();return(!q||hay.includes(q))&&(!state||stateOf(r)===state)&&(!phase||phaseOf(r)===phase)});return [...out].sort((a,b)=>order==='seguimiento'?followOf(a).localeCompare(followOf(b)):nameOf(a).localeCompare(nameOf(b),'es'));},[rows,query,state,phase,order]);
 const seguimiento=useMemo(()=>rows.filter(r=>bool(r,['requiere_seguimiento'])===true||/seguimiento|contactar|pendiente/i.test(`${stateOf(r)} ${followOf(r)}`)).length,[rows]);
 const formalizados=useMemo(()=>rows.filter(r=>/formaliz|firmad|cerrad/i.test(stateOf(r))).length,[rows]);
 const sinProxima=useMemo(()=>rows.filter(r=>!followOf(r)).length,[rows]);
 if(!active||!sessionReady||!logged)return null;
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
 return <div className="ops-root contactos-root" data-theme={theme}>
  <aside className="ops-side"><button className="ops-brand" onClick={()=>navigate('/inicio')}><img src={fenixLogo} alt=""/><strong>FÉNIX CAPITAL</strong></button><nav>{effectiveNav.map(item=><button key={item.route} className={item.route==='/contactos'?'active':''} onClick={()=>navigate(item.route)}>{item.label}</button>)}</nav><button className="ops-ana" onClick={()=>navigate('/ana')}><img src={anaAvatar} alt="Ana"/><span><strong>Ana está contigo</strong><small>Cuando quieras, avanzamos paso a paso.</small></span></button></aside>
  <main className="ops-main"><header className="ops-top"><div className="ops-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar contacto, expediente o seguimiento..."/><button>Buscar</button></div><div className="ops-top-actions"><button onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={17}/>:<Sun size={17}/>} {theme==='light'?'Oscuro':'Claro'}</button><div className="ops-profile"><strong>{ctx?.role||'Usuario'}</strong></div><button onClick={logout} aria-label="Cerrar sesión"><LogOut size={17}/></button></div></header>
   <section className="ops-content contactos-content">
    <section className="contactos-ana-hero"><div className="contactos-ana-photo"><img src={anaVertical} alt="Ana"/></div><div><span>ANA · EN ESTA PANTALLA</span><h2>¿Qué hacemos ahora?</h2><p>Cada conversación cuenta: te ayudo a escuchar, responder y dar el siguiente paso con cercanía.</p><div className="contactos-next"><button onClick={()=>setState(states.find(s=>/seguimiento|pendiente/i.test(s))||'')}><b>1</b><strong>Atender seguimientos</strong><small>Ver y preparar →</small></button><button onClick={()=>navigate('/comunicaciones')}><b>2</b><strong>Preparar un mensaje</strong><small>Ver y preparar →</small></button><button onClick={()=>setOrder('seguimiento')}><b>3</b><strong>Completar datos pendientes</strong><small>Ver y preparar →</small></button></div></div></section>
    <div className="contactos-title"><div><small>RELACIONES Y SEGUIMIENTO</small><h1>Contactos</h1><p>{status===200?`${rows.length} contactos visibles en tu ámbito autorizado.`:'Lectura canónica según permisos.'}</p></div><button className="primary" onClick={()=>navigate('/ana?mode=do&resource=contacto')}>+ Crear con Ana</button></div>
    {message&&<div className="ops-message">{message}</div>}
    {status===200&&<><section className="contactos-kpis"><article><small>CON SEGUIMIENTO</small><strong>{seguimiento}</strong><span>Derivado de los campos visibles</span></article><article><small>FORMALIZADOS</small><strong>{formalizados}</strong><span>Según estado canónico disponible</span></article><article><small>SIN PRÓXIMA ACCIÓN</small><strong>{sinProxima}</strong><span>Sin seguimiento registrado visible</span></article></section>
    <section className="contactos-filter"><div className="contactos-filter-head"><div><small>RELACIONES ACTIVAS</small><h2>Contactos disponibles</h2></div><span>{visible.length} visibles</span></div><label>BUSCAR<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nombre, expediente o dato relacionado"/></label><div className="contactos-filter-grid"><label>ESTADO<select value={state} onChange={e=>setState(e.target.value)}><option value="">Todos</option>{states.map(v=><option key={v}>{v}</option>)}</select></label><label>FASE VINCULADA<select value={phase} onChange={e=>setPhase(e.target.value)}><option value="">Todas</option>{phases.map(v=><option key={v}>{v}</option>)}</select></label><label>ORDENAR POR<select value={order} onChange={e=>setOrder(e.target.value)}><option value="nombre">Nombre</option><option value="seguimiento">Seguimiento</option></select></label><button onClick={()=>{setQuery('');setState('');setPhase('');setOrder('nombre')}}>Limpiar</button></div></section>
    {loading?<div className="ops-empty"><strong>Cargando…</strong></div>:visible.length===0?<div className="ops-empty"><strong>Sin contactos visibles</strong><span>No hay registros para estos filtros o para tu ámbito actual.</span></div>:<div className="ops-table-card contactos-table"><div className="ops-table-head"><strong>{visible.length} registros</strong><span>Fuente canónica Notion</span></div><div className="ops-table-wrap"><table><thead><tr><th>Contacto</th><th>Relación</th><th>Expediente</th><th>Seguimiento</th><th></th></tr></thead><tbody>{visible.map((r,i)=>{const id=idOf(r);return <tr key={id||i} className={id?'ops-clickable-row':''} tabIndex={id?0:undefined} onClick={()=>id&&navigate(`/contactos/${encodeURIComponent(id)}`)} onKeyDown={e=>{if(id&&(e.key==='Enter'||e.key===' ')){e.preventDefault();navigate(`/contactos/${encodeURIComponent(id)}`)}}}><td><strong>{nameOf(r)}</strong></td><td>{relationOf(r)}</td><td>{expedienteOf(r)}</td><td>{followOf(r)||'—'}</td><td>{id?'→':''}</td></tr>})}</tbody></table></div></div>}</>}
   </section>
  </main>
 </div>;
}
