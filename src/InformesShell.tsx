import {useEffect,useMemo,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {FileText} from 'lucide-react';
import {fetchAppApi,supabase,SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,IS_PRODUCTION} from './supabase';
import {anaAvatar,anaVertical} from './assets/visualAssets';
import {directionSidebarNavigation,normalizeNavigation,type NavItem} from './masterNavigation';
import OperationalShellFrame from './OperationalShellFrame';
import DirectionOperationalFrame from './DirectionOperationalFrame';
import './operational.css';
import './informes-shell.css';

type Theme='light'|'dark';
type Row=Record<string,unknown>;
type Ctx={role?:string;actor_code?:string;display_name?:string};
const fallbackNav:NavItem[]=[{label:'Inicio',route:'/inicio'}];
function rowsFrom(data:unknown):Row[]{if(!data||typeof data!=='object')return[];const d=data as Record<string,unknown>;for(const k of ['items','reports','informes','results'])if(Array.isArray(d[k]))return d[k] as Row[];return[];}
function first(row:Row,keys:string[]){for(const k of keys){const v=row[k];if(typeof v==='string'&&v.trim())return v.trim();if(typeof v==='number')return String(v);}return'';}
function isDirectionContext(ctx:Ctx|null){const role=(ctx?.role||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return ctx?.actor_code==='DIR-TEST'||role.includes('direccion');}
function initials(name:string){return name.split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()).join('')||'FC';}
async function fetchReports(){const{data:{session}}=await supabase.auth.getSession();if(!session?.access_token)return{status:401,data:null};try{const fn=IS_PRODUCTION?'fenix-reports-api':'fenix-reports-api-test';const path=IS_PRODUCTION?'':'/reports';const r=await fetch(`${SUPABASE_URL}/functions/v1/${fn}${path}`,{headers:{Authorization:`Bearer ${session.access_token}`,apikey:SUPABASE_PUBLISHABLE_KEY}});let data:unknown=null;try{data=await r.json()}catch{data=null}return{status:r.status,data};}catch{return{status:0,data:null};}}
export default function InformesShell(){
 const location=useLocation(),navigate=useNavigate();const active=location.pathname.replace(/\/+$/,'')==='/informes';
 const[ready,setReady]=useState(false),[logged,setLogged]=useState(false),[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light'),[ctx,setCtx]=useState<Ctx|null>(null),[nav,setNav]=useState<NavItem[]>([]),[rows,setRows]=useState<Row[]>([]),[status,setStatus]=useState<number|null>(null),[loading,setLoading]=useState(false),[message,setMessage]=useState(''),[query,setQuery]=useState(''),[correction,setCorrection]=useState('');
 useEffect(()=>{let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[]);
 useEffect(()=>{if(!active)return;document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme);localStorage.setItem('fenix-theme',theme)},[active,theme]);
 useEffect(()=>{if(!active||!logged)return;let alive=true;(async()=>{setLoading(true);setMessage('');setStatus(null);setRows([]);try{const[c,n,r]=await Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<unknown>('/navigation'),fetchReports()]);if(!alive)return;setCtx(c.status===200?c.data:null);setNav(n.status===200?normalizeNavigation(n.data):[]);setStatus(r.status);setRows(r.status===200?rowsFrom(r.data):[]);if(r.status===403)setMessage('Tu perfil no tiene acceso a Informes.');else if(r.status===0)setMessage('No se pudo conectar con la fuente autorizada de Informes.');else if(r.status!==200)setMessage('No se pudieron cargar los informes autorizados.');}catch{if(!alive)return;setStatus(0);setRows([]);setMessage('No se pudo conectar con la fuente autorizada de Informes.');}finally{if(alive)setLoading(false);}})();return()=>{alive=false};},[active,logged]);
 const direction=isDirectionContext(ctx);
 const effectiveNav=nav.length?(direction?directionSidebarNavigation(nav):nav):fallbackNav;
 const visible=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return rows;return rows.filter(r=>Object.values(r).filter(v=>typeof v==='string'||typeof v==='number').join(' ').toLowerCase().includes(q));},[rows,query]);
 const grouped=useMemo(()=>{const m=new Map<string,Row[]>();for(const r of visible){const category=first(r,['categoria','categoría','category','tipo'])||'Sin categoría';m.set(category,[...(m.get(category)||[]),r]);}return [...m.entries()];},[visible]);
 const latest=useMemo(()=>visible.map(r=>first(r,['generado_en','fecha','created_at','fecha_generacion','fecha_generación'])).filter(Boolean).sort().reverse()[0]||'No disponible',[visible]);
 if(!active||!ready||!logged)return null;
 function openReport(r:Row){const url=first(r,['pdf_url','url','archivo_url','download_url']);if(/^https?:\/\//i.test(url))window.open(url,'_blank','noopener,noreferrer');}
 function sendCorrection(){const text=correction.trim();if(!text)return;const q=new URLSearchParams({mode:'help',resource:'informe',correction:text});navigate(`/ana?${q.toString()}`);}
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
 const body=<>
  <section className="informes-ana-hero"><div className="informes-ana-photo"><img src={anaVertical} alt="Ana"/></div><div className="informes-ana-body"><span>ANA · EN ESTA PANTALLA</span><h2>Te ayudo a interpretar los informes</h2><p>Revisa únicamente los documentos disponibles en tu ámbito autorizado. Si algo no encaja, indícamelo antes de tomarlo como válido.</p></div><div className="informes-correct"><span>CORREGIR A ANA</span><h3>¿En qué me equivoco?</h3><textarea rows={4} value={correction} onChange={e=>setCorrection(e.target.value)} placeholder="Escribe aquí qué debería corregir, matizar o revisar..."/><button type="button" disabled={!correction.trim()} onClick={sendCorrection}>Preparar corrección</button></div></section>
  <div className="informes-title"><div><small>INFORMACIÓN Y SEGUIMIENTO</small><h1>Informes</h1><p>{loading?'Cargando informes autorizados…':status===200?'Selecciona un informe disponible. Solo se muestran documentos recibidos desde la fuente autorizada.':'Lectura según permisos.'}</p></div><span className={status===200&&!loading?'ops-live ok':'ops-live'}>{loading?'Cargando…':status===200?'Datos autorizados':'PRE-PROD'}</span></div>
  <section className="informes-kpis"><article><FileText/><small>TOTAL INFORMES</small><strong>{status===200&&!loading?visible.length:'—'}</strong><span>Disponibles en tu ámbito</span></article><article><FileText/><small>CATEGORÍAS</small><strong>{status===200&&!loading?grouped.length:'—'}</strong><span>Derivadas de los registros visibles</span></article><article><FileText/><small>ÚLTIMA FECHA INFORMADA</small><strong className="informes-date">{status===200&&!loading?latest:'—'}</strong><span>Sin completar fechas ausentes</span></article></section>
  {loading&&<div className="ops-empty" data-testid="informes-loading"><strong>Cargando…</strong><span>Consultando la fuente autorizada de Informes.</span></div>}
  {!loading&&message&&<div className="ops-message" data-testid={status===403?'informes-forbidden':'informes-error'}>{message}</div>}
  {!loading&&status===200&&visible.length===0&&<div className="ops-empty" data-testid="informes-empty"><strong>Sin informes visibles</strong><span>No hay documentos que coincidan con la búsqueda.</span></div>}
  {!loading&&status===200&&visible.length>0&&<section className="informes-groups">{grouped.map(([category,items])=><article className="informes-group" key={category}><div className="informes-group-head"><FileText/><div><small>CATEGORÍA</small><h2>{category}</h2></div><span>{items.length}</span></div><div className="informes-list">{items.slice(0,6).map((r,i)=>{const title=first(r,['titulo','title','nombre','informe'])||'Informe sin título';const date=first(r,['generado_en','fecha','created_at','fecha_generacion','fecha_generación'])||'Fecha no disponible';const url=first(r,['pdf_url','url','archivo_url','download_url']);const hasUrl=/^https?:\/\//i.test(url);return <button key={first(r,['id','report_id'])||`${title}-${i}`} onClick={()=>hasUrl&&openReport(r)} disabled={!hasUrl}><span><strong>{title}</strong><small>{date}</small></span><b>{hasUrl?'Abrir PDF →':'PDF no disponible'}</b></button>})}</div></article>)}</section>}
  <section className="informes-note"><img src={anaAvatar} alt="Ana"/><div><strong>Información importante</strong><p>Los informes se abren únicamente cuando la fuente entrega una URL válida. Un registro sin archivo permanece visible, pero no se simula un PDF.</p></div></section>
 </>;
 if(direction){
  const profileName=ctx?.display_name||ctx?.role||'Usuario';
  return <DirectionOperationalFrame className="dir-shell informes-root informes-direction" theme={theme} navigation={effectiveNav} search={query} profileName={profileName} initials={initials(profileName)} onSearchChange={setQuery} onSearch={()=>{}} onNavigate={route=>navigate(route)} onToggleTheme={()=>setTheme(theme==='light'?'dark':'light')} onLogout={logout} activeRoute="/informes" contentClassName="dir-content informes-content">{body}</DirectionOperationalFrame>;
 }
 return <OperationalShellFrame className="informes-root" theme={theme} navigation={effectiveNav} activeRoute="/informes" anaSubtitle="Cuando quieras, avanzamos paso a paso." sidebarVariant="default" query={query} onQueryChange={setQuery} searchPlaceholder="Buscar informe, categoría o periodo..." searchActionLabel="Buscar" onSearchAction={()=>{}} name={ctx?.role||'Usuario'} role={ctx?.role||''} initials={(ctx?.role||'U').slice(0,2).toUpperCase()} onToggleTheme={()=>setTheme(theme==='light'?'dark':'light')} onLogout={logout} contentClassName="informes-content">{body}</OperationalShellFrame>;
}
