import {useEffect,useMemo,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {ArrowLeft,LogOut,Moon,Search,Sun} from 'lucide-react';
import {fetchAppApi,supabase} from './supabase';
import {fetchNotionRuntime} from './notionRuntime';
import {anaVertical} from './assets/visualAssets';
import {normalizeNavigation,type NavItem} from './masterNavigation';
import OperationalShellFrame from './OperationalShellFrame';
import './operational.css';
import './contact-detail.css';

type Theme='light'|'dark';
type Ctx={actor_code?:string;role?:string};
type Row=Record<string,unknown>;
function isNotionId(v:string){return /^[0-9a-f]{32}$/i.test(v.replaceAll('-',''));}
function text(row:Row|undefined,keys:string[]){if(!row)return'';for(const k of keys){const v=row[k];if(typeof v==='string'&&v.trim())return v.trim();}return'';}
function value(row:Row|undefined,keys:string[]){if(!row)return null;for(const k of keys){const v=row[k];if(v!==undefined&&v!==null&&v!=='')return v;}return null;}
const fallbackNav:NavItem[]=[{label:'Inicio',route:'/inicio'}];

export default function ContactDetailShell(){
 const location=useLocation(),navigate=useNavigate();
 const match=location.pathname.match(/^\/contactos\/([^/]+)$/);const id=match?.[1]?decodeURIComponent(match[1]):'';const active=Boolean(match&&isNotionId(id));
 const[sessionReady,setSessionReady]=useState(false),[logged,setLogged]=useState(false),[ctx,setCtx]=useState<Ctx|null>(null),[nav,setNav]=useState<NavItem[]>([]),[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light');
 const[status,setStatus]=useState<number|null>(null),[row,setRow]=useState<Row|null>(null),[message,setMessage]=useState(''),[loading,setLoading]=useState(false),[correction,setCorrection]=useState(''),[reason,setReason]=useState('');
 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setSessionReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setSessionReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[active]);
 useEffect(()=>{if(!active)return;document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme);},[active,theme]);
 useEffect(()=>{if(!active||!logged)return;Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<unknown>('/navigation')]).then(([c,n])=>{setCtx(c.status===200?c.data:null);setNav(n.status===200?normalizeNavigation(n.data):[]);});},[active,logged]);
 useEffect(()=>{if(!active||!logged)return;let alive=true;(async()=>{setLoading(true);setMessage('');const r=await fetchNotionRuntime<any>(`/clientes/${encodeURIComponent(id)}`);if(!alive)return;setStatus(r.status);setRow(r.status===200?(r.data?.item||null):null);if(r.status===403)setMessage('Tu perfil no puede abrir este contacto.');else if(r.status===404)setMessage('No se ha encontrado el contacto.');else if(r.status!==200)setMessage('No se pudo cargar el contacto canónico.');setLoading(false);})();return()=>{alive=false}},[active,logged,id]);
 const effectiveNav=nav.length?nav:fallbackNav;
 const name=text(row||undefined,['cliente','nombre','nombre_alias','contacto','title'])||'Contacto';
 const state=text(row||undefined,['estado','estado_comercial','estado_relacion'])||'No disponible';
 const type=text(row||undefined,['tipo','titular','perfil'])||'No disponible';
 const relation=text(row||undefined,['relacion','relación','tipo_relacion','tipo_relación'])||'No disponible';
 const responsible=text(row||undefined,['responsable','financiero','financiero_nombre','id_financiero_operativo'])||'Sin asignación visible';
 const phone=text(row||undefined,['telefono','teléfono','movil','móvil'])||'No disponible';
 const email=text(row||undefined,['email','correo'])||'No disponible';
 const last=text(row||undefined,['ultimo_contacto','último_contacto'])||'No disponible';
 const next=text(row||undefined,['proxima_accion','próxima_acción','seguimiento'])||'';
 const expRaw=value(row||undefined,['expedientes','expediente']);
 const linkedCount=Array.isArray(expRaw)?String(expRaw.length):'No disponible';
 const statusBadge=state;
 const tabs=useMemo(()=>['Resumen','Expediente','Comunicaciones','Tareas','Actividad'],[]);
 if(!active||!sessionReady||!logged)return null;
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
 function prepareCorrection(){if(!correction.trim()||!reason.trim())return;const q=new URLSearchParams({mode:'help',resource:'contacto',contact_id:id,correction:correction.trim(),reason:reason.trim()});navigate(`/ana?${q.toString()}`);}
 const topbar=<header className="ops-top"><button className="contact-filter" onClick={()=>navigate('/contactos')}>Filtros avanzados</button><div className="ops-search"><Search size={17}/><input placeholder="Buscar expediente, cliente o tarea..."/><button onClick={()=>navigate('/contactos')}>Buscar</button></div><div className="ops-top-actions"><button onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={17}/>:<Sun size={17}/>} {theme==='light'?'Oscuro':'Claro'}</button><div className="ops-profile"><strong>{ctx?.role||'Usuario'}</strong></div><button onClick={logout} aria-label="Cerrar sesión"><LogOut size={17}/></button></div></header>;
 return <OperationalShellFrame className="contact-detail-root" theme={theme} navigation={effectiveNav} activeRoute="/contactos" anaSubtitle="Cuando quieras, avanzamos paso a paso." anaRoute="/ana" query="" onQueryChange={()=>{}} searchPlaceholder="" name={ctx?.role||'Usuario'} role="" initials={(ctx?.role||'U').slice(0,2).toUpperCase()} onToggleTheme={()=>setTheme(theme==='light'?'dark':'light')} onLogout={logout} topbar={topbar} contentClassName="contact-detail-content">
    <section className="contact-detail-ana"><div className="contact-detail-ana-photo"><img src={anaVertical} alt="Ana"/></div><div className="contact-detail-ana-body"><span>ANA · EN ESTA PANTALLA</span><h2>¿Qué hacemos ahora?</h2><p>Cada conversación cuenta: te ayudo a escuchar, responder y dar el siguiente paso con cercanía.</p><div className="contact-detail-next"><button onClick={()=>document.getElementById('contact-next-step')?.scrollIntoView({behavior:'smooth'})}><b>1</b><strong>Atender seguimientos</strong><small>Ver y preparar →</small></button><button onClick={()=>navigate(`/ana?mode=do&resource=contacto&contact_id=${encodeURIComponent(id)}`)}><b>2</b><strong>Preparar un mensaje</strong><small>Ver y preparar →</small></button><button onClick={()=>document.getElementById('contact-identity')?.scrollIntoView({behavior:'smooth'})}><b>3</b><strong>Completar datos pendientes</strong><small>Ver y preparar →</small></button></div><button className="primary" onClick={()=>navigate(`/documentacion?contacto=${encodeURIComponent(id)}`)}>↑ Subir documentación</button></div>
     <article className="contact-correct"><span>CORREGIR A ANA</span><h3>¿En qué me equivoco?</h3><p>Tu criterio se prepara con el contexto para que pueda revisarse antes de aplicar cambios.</p><textarea value={correction} onChange={e=>setCorrection(e.target.value)} placeholder="Qué cambiarías..." rows={4}/><input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Motivo de la corrección"/><button disabled={!correction.trim()||!reason.trim()} onClick={prepareCorrection}>Preparar para revisión</button><small>Preparar una corrección no modifica reglas ni datos por sí solo.</small></article>
    </section>
    <button className="contact-back" onClick={()=>navigate('/contactos')}><ArrowLeft size={15}/> Volver a contactos</button>
    <section className="contact-detail-title"><div><span>FICHA DE CONTACTO</span><h1>{name}</h1><p>{type} · {relation}</p></div><strong className="contact-status-badge">{statusBadge}</strong></section>
    {message&&<div className="ops-message">{message}</div>}
    {loading&&<div className="ops-empty"><strong>Cargando…</strong></div>}
    {status===200&&row&&<>
     <section className="contact-detail-kpis"><article><small>SITUACIÓN</small><strong>{state}</strong></article><article><small>EXPEDIENTE VINCULADO</small><strong>{linkedCount}</strong><span>{Array.isArray(expRaw)?'Relaciones visibles en la fuente canónica':'Sin conteo fiable disponible'}</span></article><article><small>ÚLTIMO CONTACTO</small><strong>{last}</strong><span>{last==='No disponible'?'Sin actividad conectada visible':'Dato canónico disponible'}</span></article></section>
     <nav className="contact-detail-tabs">{tabs.map((t,i)=><button key={t} className={i===0?'active':''} onClick={()=>i===0?undefined:navigate(i===1?'/expedientes':i===2?`/ana?mode=do&resource=contacto&contact_id=${encodeURIComponent(id)}`:i===3?`/agenda?contacto=${encodeURIComponent(id)}`:'/contactos')}>{t}</button>)}</nav>
     <section className="contact-detail-grid"><article className="contact-detail-card" id="contact-identity"><span>IDENTIDAD Y RELACIÓN</span><h2>{name}</h2><div className="contact-detail-fields"><div><small>Tipo</small><strong>{type}</strong></div><div><small>Relación</small><strong>{relation}</strong></div><div><small>Estado</small><strong>{state}</strong></div><div><small>Responsable</small><strong>{responsible}</strong></div><div><small>Teléfono</small><strong>{phone}</strong></div><div><small>Correo</small><strong>{email}</strong></div></div></article>
      <article className="contact-detail-card contact-next-card" id="contact-next-step"><span>SIGUIENTE PASO</span><h2>{next||'Seguimiento claro y cercano'}</h2><p>{next?'La siguiente acción procede del contacto canónico.':'No existe una próxima acción registrada. Ana no completará el dato por suposición.'}</p><div className="contact-detail-actions"><button className="primary" onClick={()=>navigate(`/ana?mode=do&resource=contacto&contact_id=${encodeURIComponent(id)}&channel=whatsapp`)}>Preparar WhatsApp</button><button onClick={()=>navigate(`/ana?mode=do&resource=contacto&contact_id=${encodeURIComponent(id)}&channel=email`)}>Preparar correo</button><button onClick={()=>navigate(`/agenda?contacto=${encodeURIComponent(id)}`)}>Crear tarea</button></div></article>
     </section>
    </>}
 </OperationalShellFrame>;
}
