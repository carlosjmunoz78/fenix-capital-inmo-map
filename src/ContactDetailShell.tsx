import {useEffect,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {Building2,Mail,Phone,UserRound} from 'lucide-react';
import {fetchAppApi,supabase} from './supabase';
import {fetchNotionRuntime} from './notionRuntime';
import {normalizeNavigation,type NavItem} from './masterNavigation';
import OperationalShellFrame from './OperationalShellFrame';
import {anaVertical} from './assets/visualAssets';
import './operational.css';
import './contact-detail.css';
import './inmobiliarias-polish.css';

type Theme='light'|'dark';type Ctx={role?:string;display_name?:string};type Row=Record<string,unknown>;
const fallbackNav:NavItem[]=[{label:'Inicio',route:'/inicio'}];
function text(row:Row|null,keys:string[]){if(!row)return'';for(const k of keys){const v=row[k];if(typeof v==='string'&&v.trim())return v.trim()}return''}

export default function ContactDetailShell(){
 const location=useLocation(),navigate=useNavigate();
 const match=location.pathname.match(/^\/contactos\/([^/]+)$/);const id=match?.[1]?decodeURIComponent(match[1]):'';const active=Boolean(match&&id&&id!=='nuevo');
 const[ready,setReady]=useState(false),[logged,setLogged]=useState(false),[ctx,setCtx]=useState<Ctx|null>(null),[nav,setNav]=useState<NavItem[]>([]),[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light'),[query,setQuery]=useState('');
 const[status,setStatus]=useState<number|null>(null),[row,setRow]=useState<Row|null>(null),[loading,setLoading]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setReady(true)});return()=>{alive=false;subscription.unsubscribe()}},[active]);
 useEffect(()=>{if(!active||!logged)return;let alive=true;Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<unknown>('/navigation')]).then(([c,n])=>{if(!alive)return;setCtx(c.status===200?c.data:null);setNav(n.status===200?normalizeNavigation(n.data):[])});return()=>{alive=false}},[active,logged]);
 useEffect(()=>{if(!active||!logged)return;let alive=true;(async()=>{setLoading(true);setMessage('');const r=await fetchNotionRuntime<any>(`/clientes/${encodeURIComponent(id)}`);if(!alive)return;setStatus(r.status);setRow(r.status===200?(r.data?.item||null):null);if(r.status===403)setMessage('Tu perfil no puede abrir este contacto.');else if(r.status===404)setMessage('No se ha encontrado el contacto.');else if(r.status!==200)setMessage('No se pudo cargar la ficha del contacto.');setLoading(false)})();return()=>{alive=false}},[active,logged,id]);
 if(!active||!ready||!logged)return null;
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL}
 function search(){const q=query.trim();navigate(q?`/buscar?q=${encodeURIComponent(q)}`:'/buscar')}
 const name=text(row,['nombre','cliente','contacto','title'])||'Contacto';const type=text(row,['tipo','tipo_contacto','relacion'])||'Contacto';const phone=text(row,['telefono','teléfono','movil','móvil']);const email=text(row,['email','correo']);const state=text(row,['estado','estado_comercial'])||'Sin estado informado';const source=text(row,['fuente','origen'])||'Fuente canónica';
 const effectiveNav=nav.length?nav:fallbackNav;const displayName=ctx?.display_name||ctx?.role||'Usuario';
 return <OperationalShellFrame className="contact-detail-root" theme={theme} navigation={effectiveNav} activeRoute="/contactos" anaSubtitle="Te ayudo a mantener cada relación con un siguiente paso claro." query={query} onQueryChange={setQuery} searchPlaceholder="Buscar contacto, expediente o inmobiliaria..." searchActionLabel="Buscar" onSearchAction={search} name={displayName} role={ctx?.role||''} initials={displayName.slice(0,2).toUpperCase()} onToggleTheme={()=>setTheme(theme==='light'?'dark':'light')} onLogout={logout} contentClassName="inmo-content">
  <section className="inmo-ana-hero" data-testid="contact-detail-ana"><div className="inmo-ana-photo"><img src={anaVertical} alt="Ana"/></div><div className="inmo-ana-body"><span>ANA · FICHA DE CONTACTO</span><h2>Todo el contexto en una sola ficha</h2><p>Revisa identidad, relación y vías de contacto antes de registrar el siguiente paso.</p><div className="inmo-next"><button onClick={()=>navigate(`/agenda?contacto=${encodeURIComponent(id)}`)}><b>1</b><strong>Crear seguimiento</strong><small>Abrir Agenda →</small></button><button onClick={()=>navigate(`/comunicaciones/nueva?scope_type=contacto&scope_code=${encodeURIComponent(id)}`)}><b>2</b><strong>Preparar comunicación</strong><small>Email / WhatsApp →</small></button><button onClick={()=>navigate(`/ana?mode=help&resource=contacto&contacto_id=${encodeURIComponent(id)}`)}><b>3</b><strong>Revisar con Ana</strong><small>Analizar contexto →</small></button></div></div></section>
  <div className="ops-title"><div><span className="ops-icon"><UserRound size={20}/></span><div><h1>{name}</h1><p>{type} · {source}</p></div></div><span className={status===200?'ops-live ok':'ops-live'}>{loading?'Cargando…':status===200?'Datos actualizados':'Sin conexión'}</span></div>
  {loading&&<div className="ops-empty"><strong>Cargando ficha…</strong></div>}{message&&<div className="ops-message">{message}</div>}
  {status===200&&row&&<><section className="inmo-kpis"><article><UserRound/><small>TIPO</small><strong>{type}</strong><span>Clasificación actual</span></article><article><Phone/><small>TELÉFONO</small><strong>{phone||'No informado'}</strong><span>Vía de contacto</span></article><article><Mail/><small>EMAIL</small><strong>{email||'No informado'}</strong><span>Vía de contacto</span></article><article><Building2/><small>ESTADO</small><strong>{state}</strong><span>Situación comercial</span></article></section><section className="ops-table-card" style={{padding:20,display:'grid',gap:12}}><div className="ops-table-head"><strong>Ficha canónica</strong><span>Contacto autorizado</span></div>{Object.entries(row).filter(([k])=>!['id','destino','fuente'].includes(k)).map(([k,v])=><div key={k} style={{display:'grid',gridTemplateColumns:'minmax(150px,220px) 1fr',gap:12}}><small>{k.replaceAll('_',' ')}</small><strong>{v===null||v===undefined||v===''?'—':String(v)}</strong></div>)}</section></>}
 </OperationalShellFrame>
}
