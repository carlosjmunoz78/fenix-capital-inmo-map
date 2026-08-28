import {useEffect,useMemo,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {Building2} from 'lucide-react';
import {fetchAppApi,supabase} from './supabase';
import {fetchRegistrosRuntime} from './registrosRuntime';
import {directionSidebarNavigation,isDirectionNavigation,normalizeNavigation,orderAuthorizedNavigation,type NavItem} from './masterNavigation';
import OperationalShellFrame from './OperationalShellFrame';
import './operational.css';
import './notarias-polish.css';

type Theme='light'|'dark';
type Ctx={role?:string};
type Row=Record<string,unknown>;
type RuntimeResponse={items?:Row[]};
const ROUTE='/registros-propiedad';
const fallbackNav:NavItem[]=[{label:'Inicio',route:'/inicio'}];
function text(row:Row,key:string){const v=row[key];return typeof v==='string'?v.trim():'';}
function bool(row:Row,key:string){return row[key]===true;}

export default function RegistrosPropiedadShell(){
 const location=useLocation(),navigate=useNavigate(),active=location.pathname===ROUTE;
 const[ready,setReady]=useState(false),[logged,setLogged]=useState(false),[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light'),[ctx,setCtx]=useState<Ctx|null>(null),[nav,setNav]=useState<NavItem[]>([]),[authorized,setAuthorized]=useState<boolean|null>(null),[q,setQ]=useState('');
 const[rows,setRows]=useState<Row[]>([]),[status,setStatus]=useState<number|null>(null),[loading,setLoading]=useState(false),[message,setMessage]=useState(''),[provincia,setProvincia]=useState('');

 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[active]);
 useEffect(()=>{if(active){document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme)}},[active,theme]);
 useEffect(()=>{if(!active||!logged)return;let alive=true;(async()=>{setLoading(true);setMessage('');setStatus(null);setRows([]);try{const[c,n,r]=await Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<unknown>('/navigation'),fetchRegistrosRuntime<RuntimeResponse>('/registros-propiedad')]);if(!alive)return;setCtx(c.status===200?c.data:null);const normalized=n.status===200?normalizeNavigation(n.data):[];const parsed=isDirectionNavigation(normalized)?directionSidebarNavigation(normalized):orderAuthorizedNavigation(normalized);setNav(parsed);const canUse=normalized.some(i=>i.route===ROUTE);setAuthorized(canUse);if(!canUse){navigate('/inicio',{replace:true});return;}setStatus(r.status);setRows(r.status===200&&Array.isArray(r.data?.items)?r.data!.items!:[]);if(r.status===403)setMessage('Tu perfil no tiene acceso al directorio de Registros de la Propiedad.');else if(r.status!==200)setMessage('No se pudo cargar el directorio de Registros de la Propiedad.');}catch{if(!alive)return;setStatus(0);setRows([]);setMessage('No se pudo conectar con el directorio de Registros de la Propiedad.');}finally{if(alive)setLoading(false);}})();return()=>{alive=false};},[active,logged,navigate]);

 const effectiveNav=nav.length?nav:fallbackNav;
 const provincias=useMemo(()=>Array.from(new Set(rows.map(r=>text(r,'provincia')).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'})),[rows]);
 const visible=useMemo(()=>{const s=q.trim().toLowerCase();return rows.filter(r=>(!provincia||text(r,'provincia')===provincia)&&(!s||Object.values(r).filter(v=>typeof v==='string'||typeof v==='number').join(' ').toLowerCase().includes(s)));},[rows,q,provincia]);
 if(!active||!ready||!logged||authorized!==true)return null;
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
 const role=ctx?.role||'Usuario';

 return <OperationalShellFrame className="notarias-root" theme={theme} navigation={effectiveNav} activeRoute={ROUTE} anaSubtitle="Te ayudo a localizar el registro adecuado y preparar la gestión." query={q} onQueryChange={setQ} searchPlaceholder="Buscar registro, municipio, registrador..." name={role} role="" initials={role.slice(0,2).toUpperCase()} onToggleTheme={()=>setTheme(theme==='light'?'dark':'light')} onLogout={logout} contentClassName="notarias-content">
  <div className="ops-title"><div><span className="ops-icon"><Building2 size={20}/></span><div><small>DIRECTORIO DE REGISTROS</small><h1>Registros de la Propiedad</h1><p>{loading?'Cargando información…':status===200?'Consulta los registros disponibles, su cobertura y sus datos de contacto.':'Lectura según permisos.'}</p></div></div><span className={status===200&&!loading?'ops-live ok':'ops-live'}>{loading?'Cargando…':status===200?'Datos actualizados':status===403?'Sin acceso':'Sin conexión'}</span></div>
  {loading&&<div className="ops-empty" data-testid="property-registry-loading"><strong>Cargando…</strong><span>Consultando el directorio de Registros de la Propiedad.</span></div>}
  {!loading&&message&&<div className="ops-message" data-testid={status===403?'property-registry-forbidden':'property-registry-error'}>{message}</div>}
  {!loading&&status===200&&<>
   <section className="notarias-kpis" data-testid="property-registry-live"><article><small>REGISTROS VISIBLES</small><strong>{rows.length}</strong><span>Según tus permisos</span></article><article><small>ACTIVOS</small><strong>{rows.filter(r=>bool(r,'activo')).length}</strong><span>Marcados como activos</span></article><article><small>PROVINCIAS</small><strong>{provincias.length}</strong><span>En el directorio visible</span></article></section>
   <section className="notarias-filter"><label>PROVINCIA<select value={provincia} onChange={e=>setProvincia(e.target.value)}><option value="">Todas</option>{provincias.map(x=><option key={x}>{x}</option>)}</select></label><button onClick={()=>{setQ('');setProvincia('')}}>Limpiar</button></section>
   {visible.length===0?<div className="ops-empty" data-testid="property-registry-empty"><strong>Sin registros visibles</strong><span>No hay resultados para los filtros actuales.</span></div>:<div className="notarias-grid">{visible.map((r,i)=><article key={text(r,'id')||i}><div><small>{text(r,'provincia')||'Provincia no disponible'} · {text(r,'municipio_sede')||'Sede no disponible'}</small><h2>{text(r,'registro')||'Registro sin nombre'}</h2></div><dl><div><dt>Dirección</dt><dd>{text(r,'direccion')||'No disponible'}</dd></div><div><dt>Registrador/a</dt><dd>{text(r,'registrador')||'No disponible'}</dd></div><div><dt>Teléfono</dt><dd>{text(r,'telefono')||'No disponible'}</dd></div><div><dt>Email</dt><dd>{text(r,'email')||'No disponible'}</dd></div><div><dt>Municipios cubiertos</dt><dd>{text(r,'municipios_cubiertos')||'No disponible'}</dd></div><div><dt>Horario</dt><dd>{text(r,'horario')||'No disponible'}</dd></div></dl></article>)}</div>}
  </>}
 </OperationalShellFrame>;
}
