import {useEffect,useMemo,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {fetchAppApi,supabase} from './supabase';
import {fetchNotionRuntime} from './notionRuntime';
import {anaVertical} from './assets/visualAssets';
import OperationalShellFrame from './OperationalShellFrame';
import {normalizeNavigation,type NavItem} from './masterNavigation';
import './operational.css';
import './tasaciones-polish.css';
import './sortable-table.css';

type Theme='light'|'dark';
type SortKey='direccion'|'estado'|'tasador'|'fecha'|'valor';
type SortDir='asc'|'desc';
type Ctx={actor_code?:string;role?:string};
type Row=Record<string,unknown>;
const fallbackNav:NavItem[]=[{label:'Inicio',route:'/inicio'}];
function rowsFrom(data:unknown):Row[]{if(!data||typeof data!=='object')return[];const d=data as Record<string,unknown>;return Array.isArray(d.items)?d.items as Row[]:[];}
function text(row:Row,keys:string[]){for(const k of keys){const v=row[k];if(typeof v==='string'&&v.trim())return v.trim();}return'';}
function idOf(r:Row){return text(r,['id','tasacion_id','appraisal_code','code']);}
function addressOf(r:Row){return text(r,['direccion','dirección','inmueble','domicilio','direccion_inmueble'])||'Inmueble sin dirección visible';}
function stateOf(r:Row){return text(r,['estado','estado_tasacion','estado_tasación'])||'Sin estado';}
function appraiserOf(r:Row){return text(r,['tasador','tasadora','empresa_tasadora','proveedor'])||'No disponible';}
function dateOf(r:Row){return text(r,['fecha_informe','fecha_visita','fecha','fecha_tasacion','fecha_tasación'])||'No disponible';}
function amountRaw(r:Row){for(const k of ['importe','valor_tasacion','valor_tasación','valor','importe_tasacion']){const v=r[k];if(typeof v==='number')return v;if(typeof v==='string'&&v.trim())return v.trim();}return null;}
function amountOf(r:Row){const v=amountRaw(r);if(typeof v==='number')return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v);return typeof v==='string'?v:'No disponible';}
function hasReport(r:Row){return Boolean(text(r,['pdf','url_pdf','informe','documento','archivo']))||/informe|emitid|finaliz|complet/i.test(stateOf(r));}
function pending(r:Row){return /pendiente|solicit|visita|curso|proceso/i.test(stateOf(r));}
function compareText(a:string,b:string){return a.localeCompare(b,'es',{sensitivity:'base',numeric:true});}
function sortValue(r:Row,key:SortKey){if(key==='estado')return stateOf(r);if(key==='tasador')return appraiserOf(r);if(key==='fecha')return dateOf(r)==='No disponible'?null:dateOf(r);if(key==='valor')return amountRaw(r);return addressOf(r);}
function isMissing(v:unknown){return v===null||v===undefined||v==='';}
function compareValue(a:unknown,b:unknown){if(typeof a==='number'&&typeof b==='number')return a-b;const sa=String(a),sb=String(b);if(/^\d{4}-\d{2}-\d{2}/.test(sa)&&/^\d{4}-\d{2}-\d{2}/.test(sb)){const da=Date.parse(sa),db=Date.parse(sb);if(Number.isFinite(da)&&Number.isFinite(db))return da-db;}return compareText(sa,sb);}

export default function TasacionesShell(){
 const location=useLocation(),navigate=useNavigate();const active=location.pathname==='/tasaciones';
 const[sessionReady,setSessionReady]=useState(false),[logged,setLogged]=useState(false),[ctx,setCtx]=useState<Ctx|null>(null),[nav,setNav]=useState<NavItem[]>([]),[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light');
 const[rows,setRows]=useState<Row[]>([]),[status,setStatus]=useState<number|null>(null),[loading,setLoading]=useState(false),[message,setMessage]=useState('');
 const[query,setQuery]=useState(''),[state,setState]=useState(''),[sortKey,setSortKey]=useState<SortKey>('fecha'),[sortDir,setSortDir]=useState<SortDir>('desc');
 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setSessionReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setSessionReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[active]);
 useEffect(()=>{if(!active)return;document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme);},[active,theme]);
 useEffect(()=>{if(!active||!logged)return;Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<unknown>('/navigation')]).then(([c,n])=>{setCtx(c.status===200?c.data:null);setNav(n.status===200?normalizeNavigation(n.data):[]);});},[active,logged]);
 useEffect(()=>{if(!active||!logged)return;let alive=true;(async()=>{setLoading(true);setMessage('');setStatus(null);setRows([]);try{const r=await fetchNotionRuntime<unknown>('/tasaciones');if(!alive)return;setStatus(r.status);setRows(r.status===200?rowsFrom(r.data):[]);if(r.status===403)setMessage('Tu perfil no tiene acceso a este módulo o registro.');else if(r.status!==200)setMessage('No se pudo leer la fuente canónica de Tasaciones.');}catch{if(!alive)return;setStatus(0);setRows([]);setMessage('No se pudo conectar con la fuente canónica de Tasaciones.');}finally{if(alive)setLoading(false);}})();return()=>{alive=false}},[active,logged]);
 const effectiveNav=nav.length?nav:fallbackNav;
 const states=useMemo(()=>Array.from(new Set(rows.map(stateOf).filter(Boolean))).sort(compareText),[rows]);
 const visible=useMemo(()=>{const q=query.trim().toLowerCase();const out=rows.filter(r=>{const hay=Object.values(r).filter(v=>typeof v==='string'||typeof v==='number').join(' ').toLowerCase();return(!q||hay.includes(q))&&(!state||stateOf(r)===state)});const direction=sortDir==='asc'?1:-1;return[...out].sort((a,b)=>{const av=sortValue(a,sortKey),bv=sortValue(b,sortKey);if(isMissing(av)!==isMissing(bv))return isMissing(av)?1:-1;const primary=compareValue(av,bv);if(primary!==0)return primary*direction;return compareText(addressOf(a),addressOf(b))*direction;});},[rows,query,state,sortKey,sortDir]);
 const withReport=useMemo(()=>rows.filter(hasReport).length,[rows]);const pendingCount=useMemo(()=>rows.filter(pending).length,[rows]);
 if(!active||!sessionReady||!logged)return null;
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
 function applySort(key:SortKey){if(sortKey===key)setSortDir(v=>v==='asc'?'desc':'asc');else{setSortKey(key);setSortDir(key==='fecha'?'desc':'asc');}}
 function sortArrow(key:SortKey){return sortKey===key?(sortDir==='asc'?'↑':'↓'):'';}
 function ariaSort(key:SortKey){return sortKey===key?(sortDir==='asc'?'ascending':'descending'):undefined;}
 const role=ctx?.role||'Usuario';
 return <OperationalShellFrame className="tas-root" theme={theme} navigation={effectiveNav} activeRoute="/tasaciones" anaSubtitle="Cuando quieras, avanzamos paso a paso." anaRoute="/ana" query={query} onQueryChange={setQuery} searchPlaceholder="Buscar dirección, tasador o estado..." searchActionLabel="Buscar" name={role} role="" initials={role.slice(0,2).toUpperCase()} onToggleTheme={()=>setTheme(theme==='light'?'dark':'light')} onLogout={logout} contentClassName="tas-content">
    <section className="tas-ana-hero"><div className="tas-ana-photo"><img src={anaVertical} alt="Ana"/></div><div className="tas-ana-body"><span>ANA · EN ESTA PANTALLA</span><h2>¿Qué hacemos ahora?</h2><p>Una tasación clara evita dudas: revisamos estado, documento y siguiente paso sin inventar valores.</p><div className="tas-next"><button onClick={()=>setState(states.find(s=>/pendiente|solicit|curso|visita/i.test(s))||'')}><b>1</b><strong>Revisar pendientes</strong><small>Ver y preparar →</small></button><button onClick={()=>{setSortKey('fecha');setSortDir('desc')}}><b>2</b><strong>Ordenar por fecha</strong><small>Ver y preparar →</small></button><button onClick={()=>navigate('/documentacion')}><b>3</b><strong>Comprobar informes</strong><small>Ver documentación →</small></button></div><button className="tas-upload" onClick={()=>navigate('/documentacion')}>↑ Subir tasación</button></div></section>
    <div className="tas-title"><div><small>TASACIÓN Y VALORACIÓN</small><h1>Tasaciones</h1><p>{loading?'Cargando datos autorizados…':status===200?`${rows.length} tasaciones visibles en tu ámbito autorizado.`:'Lectura canónica según permisos.'}</p></div><span className={status===200&&!loading?'ops-live ok':'ops-live'}>{loading?'Cargando…':status===200?'Datos vivos':'PRE-PROD'}</span></div>
    {loading&&<div className="ops-empty" data-testid="tas-loading"><strong>Cargando…</strong><span>Consultando la fuente canónica de Tasaciones.</span></div>}
    {!loading&&message&&<div className="ops-message" data-testid={status===403?'tas-forbidden':'tas-error'}>{message}</div>}
    {!loading&&status===200&&<><section className="tas-kpis"><article><small>EN FUENTE</small><strong>{rows.length}</strong><span>Registros visibles canónicos</span></article><article><small>CON INFORME</small><strong>{withReport}</strong><span>Derivado de señal documental/estado</span></article><article><small>PENDIENTES</small><strong>{pendingCount}</strong><span>Derivado del estado visible</span></article></section>
     <section className="tas-filter"><div className="tas-filter-head"><div><small>CONTROL DOCUMENTAL</small><h2>Tasaciones disponibles</h2></div><span>{visible.length} visibles</span></div><label>BUSCAR<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Dirección, tasador o referencia"/></label><div className="tas-filter-grid"><label>ESTADO<select value={state} onChange={e=>setState(e.target.value)}><option value="">Todos</option>{states.map(v=><option key={v}>{v}</option>)}</select></label><label>ORDENAR POR<select value={sortKey} onChange={e=>{const next=e.target.value as SortKey;setSortKey(next);setSortDir(next==='fecha'?'desc':'asc')}}><option value="fecha">Fecha</option><option value="direccion">Dirección</option><option value="estado">Estado</option><option value="tasador">Tasador / Tasadora</option><option value="valor">Valor visible</option></select></label><button onClick={()=>{setQuery('');setState('');setSortKey('fecha');setSortDir('desc')}}>Limpiar</button></div></section>
     {visible.length===0?<div className="ops-empty" data-testid="tas-empty"><strong>Sin tasaciones visibles</strong><span>No hay registros para estos filtros o para tu ámbito actual.</span></div>:<div className="ops-table-card tas-table"><div className="ops-table-head"><strong>{visible.length} registros</strong><span>Fuente canónica Notion</span></div><div className="ops-table-wrap ops-sortable-wrap"><table className="ops-sortable-table"><thead><tr><th aria-sort={ariaSort('direccion')}><button type="button" onClick={()=>applySort('direccion')}>Inmueble <span>{sortArrow('direccion')}</span></button></th><th aria-sort={ariaSort('estado')}><button type="button" onClick={()=>applySort('estado')}>Estado <span>{sortArrow('estado')}</span></button></th><th aria-sort={ariaSort('tasador')}><button type="button" onClick={()=>applySort('tasador')}>Tasador / Tasadora <span>{sortArrow('tasador')}</span></button></th><th aria-sort={ariaSort('fecha')}><button type="button" onClick={()=>applySort('fecha')}>Fecha <span>{sortArrow('fecha')}</span></button></th><th aria-sort={ariaSort('valor')}><button type="button" onClick={()=>applySort('valor')}>Valor visible <span>{sortArrow('valor')}</span></button></th><th></th></tr></thead><tbody>{visible.map((r,i)=>{const id=idOf(r);return <tr key={id||i} className={id?'ops-clickable-row':''} tabIndex={id?0:undefined} onClick={()=>id&&navigate(`/tasaciones/${encodeURIComponent(id)}`)} onKeyDown={e=>{if(id&&(e.key==='Enter'||e.key===' ')){e.preventDefault();navigate(`/tasaciones/${encodeURIComponent(id)}`)}}}><td><strong>{addressOf(r)}</strong></td><td>{stateOf(r)}</td><td>{appraiserOf(r)}</td><td>{dateOf(r)}</td><td>{amountOf(r)}</td><td>{id?'→':''}</td></tr>})}</tbody></table></div></div>}</>}
 </OperationalShellFrame>;
}
