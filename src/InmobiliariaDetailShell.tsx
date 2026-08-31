import {useEffect,useMemo,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {ArrowLeft,Save} from 'lucide-react';
import {fetchAppApi,fetchB2BActionsApi,supabase} from './supabase';
import {fetchNotionRuntime} from './notionRuntime';
import {anaVertical} from './assets/visualAssets';
import {normalizeNavigation,type NavItem} from './masterNavigation';
import OperationalShellFrame from './OperationalShellFrame';
import './operational.css';
import './inmobiliaria-detail.css';

type Theme='light'|'dark';
type Ctx={actor_code?:string;role?:string};
type Row=Record<string,unknown>;
function text(row:Row|undefined,keys:string[]){if(!row)return'';for(const k of keys){const v=row[k];if(typeof v==='string'&&v.trim())return v.trim();}return'';}
function value(row:Row|undefined,keys:string[]){if(!row)return null;for(const k of keys){const v=row[k];if(v!==undefined&&v!==null&&v!=='')return v;}return null;}
const fallbackNav:NavItem[]=[{label:'Inicio',route:'/inicio'}];
async function actionApi(id:string,changes:Record<string,unknown>){return fetchB2BActionsApi<any>(`/inmobiliarias/${encodeURIComponent(id)}/update`,{method:'POST',body:JSON.stringify(changes)});}

export default function InmobiliariaDetailShell(){
 const location=useLocation(),navigate=useNavigate();const match=location.pathname.match(/^\/inmobiliarias\/([^/]+)$/);const id=match?.[1]?decodeURIComponent(match[1]):'';const active=Boolean(match&&id&&id!=='nueva');
 const[sessionReady,setSessionReady]=useState(false),[logged,setLogged]=useState(false),[ctx,setCtx]=useState<Ctx|null>(null),[nav,setNav]=useState<NavItem[]>([]),[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light'),[query,setQuery]=useState('');
 const[status,setStatus]=useState<number|null>(null),[row,setRow]=useState<Row|null>(null),[message,setMessage]=useState(''),[loading,setLoading]=useState(false),[correction,setCorrection]=useState(''),[reason,setReason]=useState('');
 const[notes,setNotes]=useState(''),[nextContact,setNextContact]=useState(''),[preview,setPreview]=useState(false),[saving,setSaving]=useState(false),[saveMsg,setSaveMsg]=useState('');
 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setSessionReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setSessionReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[active]);
 useEffect(()=>{if(!active)return;document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme);},[active,theme]);
 useEffect(()=>{if(!active||!logged)return;Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<unknown>('/navigation')]).then(([c,n])=>{setCtx(c.status===200?c.data:null);setNav(n.status===200?normalizeNavigation(n.data):[]);});},[active,logged]);
 async function load(){setLoading(true);setMessage('');const r=await fetchNotionRuntime<any>(`/inmobiliarias/${encodeURIComponent(id)}`);setStatus(r.status);setRow(r.status===200?(r.data?.item||null):null);if(r.status===403)setMessage('Tu perfil no puede abrir esta inmobiliaria.');else if(r.status===404)setMessage('No se ha encontrado la inmobiliaria.');else if(r.status!==200)setMessage('No se pudo cargar la inmobiliaria canónica.');setLoading(false);}
 useEffect(()=>{if(!active||!logged)return;void load();},[active,logged,id]);
 const effectiveNav=nav.length?nav:fallbackNav;
 const name=text(row||undefined,['inmobiliaria','nombre','nombre_alias','nombre_comercial','title'])||'Inmobiliaria';
 const state=text(row||undefined,['estado','estado_colaboracion','estado_colaboración','estado_comercial'])||'No disponible';
 const locality=text(row||undefined,['localidad','municipio','ciudad','poblacion','población','provincia'])||'No disponible';
 const zone=text(row||undefined,['zona','zone_code','zona_operativa','zona_actuacion','zona_actuación'])||'No disponible';
 const responsible=text(row||undefined,['responsable','visitador','visitador_nombre','id_visitador_operativo','owner_actor_code'])||'Sin asignación visible';
 const phone=text(row||undefined,['telefono','teléfono','movil','móvil'])||'No disponible';
 const email=text(row||undefined,['email','correo'])||'No disponible';
 const last=text(row||undefined,['ultimo_contacto','último_contacto','ultimo_resultado_contacto_b2b'])||'No disponible';
 const next=text(row||undefined,['proximo_contacto_b2b','próximo_contacto_b2b','proxima_accion','próxima_acción'])||'';
 const expRaw=value(row||undefined,['expedientes','expedientes_vinculados']);const linkedCount=Array.isArray(expRaw)?String(expRaw.length):'No disponible';
 const firmsRaw=value(row||undefined,['firmas','firmas_vinculadas']);const firmsCount=Array.isArray(firmsRaw)?String(firmsRaw.length):'No disponible';
 const tabs=useMemo(()=>['Resumen','Expedientes','Contactos','Seguimiento','Actividad'],[]);
 if(!active||!sessionReady||!logged)return null;
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
 function prepareCorrection(){if(!correction.trim()||!reason.trim())return;const q=new URLSearchParams({mode:'help',resource:'inmobiliaria',inmobiliaria_id:id,correction:correction.trim(),reason:reason.trim()});navigate(`/ana?${q.toString()}`);}
 async function save(){if(!preview){setPreview(true);return;}if(!notes.trim()&&!nextContact)return;setSaving(true);setSaveMsg('');const changes:Record<string,unknown>={};if(notes.trim())changes.notas=notes.trim();if(nextContact)changes.proximo_contacto_b2b=nextContact;const r=await actionApi(id,changes);setSaving(false);if(r.status===200){setSaveMsg('Seguimiento B2B guardado dentro de tu ámbito autorizado.');setNotes('');setNextContact('');setPreview(false);await load();}else if(r.status===403)setSaveMsg('Tu perfil no puede modificar esta inmobiliaria o queda fuera de tu zona/cartera.');else setSaveMsg(`No se pudo guardar el seguimiento (${r.data?.error||r.status}).`);}
 return <OperationalShellFrame className="inmo-detail-root" theme={theme} navigation={effectiveNav} activeRoute="/inmobiliarias" anaSubtitle="Cuando quieras, avanzamos paso a paso." query={query} onQueryChange={setQuery} searchPlaceholder="Buscar inmobiliaria, contacto o expediente..." searchActionLabel="Filtros avanzados" onSearchAction={()=>navigate('/inmobiliarias')} name={ctx?.role||'Usuario'} role="" initials={(ctx?.role||'US').slice(0,2).toUpperCase()} onToggleTheme={()=>setTheme(theme==='light'?'dark':'light')} onLogout={logout} contentClassName="inmo-detail-content">
    <section className="inmo-detail-ana"><div className="inmo-detail-ana-photo"><img src={anaVertical} alt="Ana"/></div><div className="inmo-detail-ana-body"><span>ANA · EN ESTA PANTALLA</span><h2>¿Qué hacemos ahora?</h2><p>Una colaboración sólida se cuida con seguimiento, contexto y una próxima acción clara.</p><div className="inmo-detail-next"><button onClick={()=>document.getElementById('inmo-followup')?.scrollIntoView({behavior:'smooth'})}><b>1</b><strong>Revisar próximo contacto</strong><small>Ver y preparar →</small></button><button onClick={()=>navigate(`/ana?mode=do&resource=inmobiliaria&inmobiliaria_id=${encodeURIComponent(id)}`)}><b>2</b><strong>Preparar conversación B2B</strong><small>Ver y preparar →</small></button><button onClick={()=>document.getElementById('inmo-relationship')?.scrollIntoView({behavior:'smooth'})}><b>3</b><strong>Comprobar relación y zona</strong><small>Ver y preparar →</small></button></div></div>
     <article className="inmo-detail-correct"><span>CORREGIR A ANA</span><h3>¿En qué me equivoco?</h3><p>La corrección se prepara para revisión con el contexto de esta inmobiliaria; no cambia reglas automáticamente.</p><textarea value={correction} onChange={e=>setCorrection(e.target.value)} placeholder="Qué cambiarías..." rows={4}/><input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Motivo de la corrección"/><button disabled={!correction.trim()||!reason.trim()} onClick={prepareCorrection}>Preparar para revisión</button></article>
    </section>
    <button className="inmo-detail-back" onClick={()=>navigate('/inmobiliarias')}><ArrowLeft size={15}/> Volver a inmobiliarias</button>
    <section className="inmo-detail-title"><div><span>FICHA DE INMOBILIARIA</span><h1>{name}</h1><p>{locality} · {zone}</p></div><strong className="inmo-detail-status">{state}</strong></section>
    {message&&<div className="ops-message">{message}</div>}{loading&&<div className="ops-empty"><strong>Cargando…</strong></div>}
    {status===200&&row&&<><section className="inmo-detail-kpis"><article><small>ESTADO</small><strong>{state}</strong></article><article><small>EXPEDIENTES VINCULADOS</small><strong>{linkedCount}</strong><span>{Array.isArray(expRaw)?'Relaciones visibles canónicas':'Sin conteo fiable disponible'}</span></article><article><small>FIRMAS VINCULADAS</small><strong>{firmsCount}</strong><span>{Array.isArray(firmsRaw)?'Relaciones visibles canónicas':'Sin conteo fiable disponible'}</span></article><article><small>ÚLTIMO CONTACTO</small><strong>{last}</strong></article></section>
     <nav className="inmo-detail-tabs">{tabs.map((t,i)=><button key={t} className={i===0?'active':''} onClick={()=>i===0?undefined:navigate(i===1?`/expedientes?inmobiliaria=${encodeURIComponent(id)}`:i===2?`/contactos?inmobiliaria=${encodeURIComponent(id)}`:i===3?'#inmo-followup':'/visitas')}>{t}</button>)}</nav>
     <section className="inmo-detail-grid"><article className="inmo-detail-card" id="inmo-relationship"><span>RELACIÓN B2B</span><h2>{name}</h2><div className="inmo-detail-fields"><div><small>Localidad</small><strong>{locality}</strong></div><div><small>Zona</small><strong>{zone}</strong></div><div><small>Estado</small><strong>{state}</strong></div><div><small>Responsable</small><strong>{responsible}</strong></div><div><small>Teléfono</small><strong>{phone}</strong></div><div><small>Correo</small><strong>{email}</strong></div></div></article>
      <article className="inmo-detail-card"><span>SIGUIENTE PASO</span><h2>{next||'Definir próximo contacto B2B'}</h2><p>{next?'La siguiente acción procede de la fuente canónica.':'No existe un próximo contacto registrado. Ana no completará el dato por suposición.'}</p><div className="inmo-detail-actions"><button className="primary" onClick={()=>navigate(`/ana?mode=do&resource=inmobiliaria&inmobiliaria_id=${encodeURIComponent(id)}&channel=whatsapp`)}>Preparar WhatsApp</button><button onClick={()=>navigate(`/ana?mode=do&resource=inmobiliaria&inmobiliaria_id=${encodeURIComponent(id)}&channel=email`)}>Preparar correo</button><button onClick={()=>navigate(`/agenda?inmobiliaria=${encodeURIComponent(id)}`)}>Crear tarea</button></div></article></section>
     <section className="inmo-followup-card" id="inmo-followup"><div className="inmo-followup-head"><div><span>SEGUIMIENTO CONTEXTUAL</span><h2>Actualizar relación B2B</h2></div><small>Escritura con gate de cartera/zona</small></div><label>Notas<textarea rows={3} value={notes} onChange={e=>{setNotes(e.target.value);setPreview(false)}} placeholder="Contexto operativo sin duplicar datos..."/></label><label>Próximo contacto B2B<input type="date" value={nextContact} onChange={e=>{setNextContact(e.target.value);setPreview(false)}}/></label>{preview&&<div className="inmo-preview"><strong>Vista previa antes de guardar</strong><span>Notas: {notes.trim()||'Sin cambios'}</span><span>Próximo contacto: {nextContact||'Sin cambios'}</span></div>}<div className="inmo-followup-actions"><button className="primary" disabled={saving||(!notes.trim()&&!nextContact)} onClick={save}><Save size={16}/>{saving?'Guardando…':preview?'Confirmar y guardar':'Revisar cambios'}</button>{saveMsg&&<span>{saveMsg}</span>}</div></section>
    </>}
 </OperationalShellFrame>;
}
