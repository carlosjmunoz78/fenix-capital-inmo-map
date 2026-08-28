import {useEffect,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {ArrowLeft,Building2,Mail,MapPin,Phone,Users} from 'lucide-react';
import {fetchAppApi,supabase} from './supabase';
import {fetchRegistrosRuntime} from './registrosRuntime';
import {normalizeNavigation,type NavItem} from './masterNavigation';
import OperationalShellFrame from './OperationalShellFrame';
import './operational.css';
import './notarias-polish.css';

type Theme='light'|'dark';
type Row=Record<string,unknown>;
type Ctx={role?:string};
type DetailResponse={item?:Row;personal?:Row[]};
const ROUTE='/registros-propiedad';
const fallbackNav:NavItem[]=[{label:'Inicio',route:'/inicio'}];
function txt(r:Row|null,k:string){const v=r?.[k];return typeof v==='string'&&v.trim()?v.trim():'No disponible';}
function yes(v:unknown){return v===true?'Sí':v===false?'No':'No disponible';}

export default function RegistroPropiedadDetailShell(){
 const location=useLocation(),navigate=useNavigate();const m=location.pathname.match(/^\/registros-propiedad\/([^/]+)$/),active=Boolean(m),id=m?.[1]?decodeURIComponent(m[1]):'';
 const[ready,setReady]=useState(false),[logged,setLogged]=useState(false),[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light'),[ctx,setCtx]=useState<Ctx|null>(null),[nav,setNav]=useState<NavItem[]>([]),[row,setRow]=useState<Row|null>(null),[people,setPeople]=useState<Row[]>([]),[status,setStatus]=useState<number|null>(null),[loading,setLoading]=useState(false);
 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[active]);
 useEffect(()=>{if(active){document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme)}},[active,theme]);
 useEffect(()=>{if(!active||!logged||!id)return;let alive=true;(async()=>{setLoading(true);try{const[c,n,r]=await Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<unknown>('/navigation'),fetchRegistrosRuntime<DetailResponse>(`/registros-propiedad/${encodeURIComponent(id)}`)]);if(!alive)return;setCtx(c.status===200?c.data:null);setNav(n.status===200?normalizeNavigation(n.data):[]);setStatus(r.status);setRow(r.status===200?r.data?.item??null:null);setPeople(r.status===200&&Array.isArray(r.data?.personal)?r.data!.personal!:[]);}finally{if(alive)setLoading(false);}})();return()=>{alive=false};},[active,logged,id]);
 if(!active||!ready||!logged)return null;
 const effectiveNav=nav.length?nav:fallbackNav;const role=ctx?.role||'Usuario';
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
 return <OperationalShellFrame className="notarias-root" theme={theme} navigation={effectiveNav} activeRoute={ROUTE} anaSubtitle="Te ayudo con este registro, su cobertura y sus contactos." query="" onQueryChange={()=>{}} searchPlaceholder="" name={role} role="" initials={role.slice(0,2).toUpperCase()} onToggleTheme={()=>setTheme(theme==='light'?'dark':'light')} onLogout={logout} contentClassName="notarias-content">
  <button className="inmo-detail-back" onClick={()=>navigate(ROUTE)}><ArrowLeft size={15}/> Volver a Registros</button>
  <div className="ops-title"><div><span className="ops-icon"><Building2 size={20}/></span><div><small>FICHA MAESTRA</small><h1>{row?txt(row,'registro'):'Registro de la Propiedad'}</h1><p>Fuente canónica Notion · directorio y personal relacionado.</p></div></div><span className={status===200&&!loading?'ops-live ok':'ops-live'}>{loading?'Cargando…':status===200?'Datos vivos':'PRE-PROD'}</span></div>
  {status===403&&<div className="ops-message">Tu perfil no tiene acceso a este registro.</div>}{status===404&&<div className="ops-message">No se ha encontrado el registro.</div>}{status!==null&&status!==200&&status!==403&&status!==404&&<div className="ops-message">No se pudo cargar el registro.</div>}
  {row&&<><section className="profile-card"><div className="profile-main-copy"><h2>{txt(row,'registro')}</h2><span>{txt(row,'municipio_sede')} · {txt(row,'provincia')}</span></div><div className="profile-data"><article><MapPin/><div><small>DIRECCIÓN</small><strong>{txt(row,'direccion')}</strong></div></article><article><Phone/><div><small>TELÉFONO</small><strong>{txt(row,'telefono')}</strong></div></article><article><Mail/><div><small>EMAIL</small><strong>{txt(row,'email')}</strong></div></article></div></section>
   <section className="ops-table-card"><div className="ops-table-head"><strong>Datos operativos</strong><span>Sin completar campos ausentes</span></div><div className="ops-message"><p><b>Número:</b> {txt(row,'numero')}</p><p><b>Registrador/a:</b> {txt(row,'registrador')}</p><p><b>Municipios cubiertos:</b> {txt(row,'municipios_cubiertos')}</p><p><b>Horario:</b> {txt(row,'horario')}</p><p><b>Servicios telemáticos:</b> {txt(row,'servicios_telematicos')}</p><p><b>Cita online:</b> {yes(row.cita_online)}</p><p><b>Nivel de verificación:</b> {txt(row,'nivel_verificacion')}</p><p><b>Última revisión:</b> {txt(row,'ultima_revision')}</p><p><b>Notas:</b> {txt(row,'notas')}</p></div></section>
   <section className="ops-table-card" data-testid="property-registry-staff"><div className="ops-table-head"><strong><Users size={16}/> Personal relacionado</strong><span>{people.length} contacto{people.length===1?'':'s'} visible{people.length===1?'':'s'}</span></div>{people.length===0?<div className="ops-empty"><strong>Sin personal relacionado</strong><span>No hay personas vinculadas a este registro en la fuente canónica.</span></div>:<div className="notarias-grid">{people.map((p,i)=><article key={txt(p,'id')==='No disponible'?i:txt(p,'id')}><div><small>{txt(p,'cargo')}</small><h2>{txt(p,'persona')}</h2></div><dl><div><dt>Teléfono directo</dt><dd>{txt(p,'telefono_directo')}</dd></div><div><dt>Extensión</dt><dd>{txt(p,'extension')}</dd></div><div><dt>Email directo</dt><dd>{txt(p,'email_directo')}</dd></div><div><dt>Activo</dt><dd>{yes(p.activo)}</dd></div><div><dt>Verificación</dt><dd>{txt(p,'nivel_verificacion')}</dd></div><div><dt>Observaciones</dt><dd>{txt(p,'observaciones')}</dd></div></dl></article>)}</div>}</section>
  </>}
 </OperationalShellFrame>;
}
