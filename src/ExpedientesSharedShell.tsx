import {useEffect,useMemo,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {FolderOpen} from 'lucide-react';
import OperationalShellFrame from './OperationalShellFrame';
import {normalizeNavigation,type NavItem} from './masterNavigation';
import {fetchAppApi,supabase} from './supabase';
import {fetchNotionRuntime} from './notionRuntime';
import {anaVertical} from './assets/visualAssets';
import './operational.css';
import './expedientes-polish.css';
import './inmobiliarias-polish.css';
import './sortable-table.css';

type Theme='light'|'dark';
type SortDir='asc'|'desc';
type AnyRow=Record<string,unknown>;
type Ctx={actor_code?:string;role?:string};

const fallbackNav:NavItem[]=[{label:'Inicio',route:'/inicio'}];

function rowsFrom(data:unknown):AnyRow[]{
 if(!data||typeof data!=='object')return[];
 const d=data as Record<string,unknown>;
 for(const key of ['items','expedientes'])if(Array.isArray(d[key]))return d[key] as AnyRow[];
 return[];
}
function prettyKey(key:string){return key.replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase());}
function prettyValue(value:unknown){
 if(value===null||value===undefined||value==='')return'—';
 if(typeof value==='boolean')return value?'Sí':'No';
 if(Array.isArray(value))return value.length?value.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join(', '):'—';
 if(typeof value==='object')return JSON.stringify(value);
 return String(value);
}
function compareUnknown(a:unknown,b:unknown){
 if(typeof a==='number'&&typeof b==='number')return a-b;
 if(typeof a==='boolean'&&typeof b==='boolean')return Number(a)-Number(b);
 const sa=prettyValue(a),sb=prettyValue(b);
 if(/^\d{4}-\d{2}-\d{2}/.test(sa)&&/^\d{4}-\d{2}-\d{2}/.test(sb)){
  const da=Date.parse(sa),db=Date.parse(sb);
  if(Number.isFinite(da)&&Number.isFinite(db))return da-db;
 }
 return sa.localeCompare(sb,'es',{sensitivity:'base',numeric:true});
}
function firstString(row:AnyRow,keys:string[]){for(const key of keys){const value=row[key];if(typeof value==='string'&&value.trim())return value.trim();}return'';}
function bool(row:AnyRow,keys:string[]){for(const key of keys)if(row[key]===true)return true;return false;}

export default function ExpedientesSharedShell(){
 const location=useLocation(),navigate=useNavigate();
 const active=location.pathname==='/expedientes';
 const[sessionReady,setSessionReady]=useState(false),[logged,setLogged]=useState(false),[ctx,setCtx]=useState<Ctx|null>(null);
 const[nav,setNav]=useState<NavItem[]>([]),[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light');
 const[loading,setLoading]=useState(false),[status,setStatus]=useState<number|null>(null),[rows,setRows]=useState<AnyRow[]>([]),[message,setMessage]=useState('');
 const[query,setQuery]=useState(''),[phase,setPhase]=useState(''),[risk,setRisk]=useState(''),[sortKey,setSortKey]=useState(''),[sortDir,setSortDir]=useState<SortDir>('asc');
 const[globalQuery,setGlobalQuery]=useState('');
 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setSessionReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{setLogged(Boolean(session));setSessionReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[active]);
 useEffect(()=>{if(!active)return;document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme);},[active,theme]);
 useEffect(()=>{if(!active||!logged)return;Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<unknown>('/navigation')]).then(([c,n])=>{setCtx(c.status===200?c.data:null);setNav(n.status===200?normalizeNavigation(n.data):[]);});},[active,logged]);
 useEffect(()=>{if(!active||!logged)return;let alive=true;(async()=>{setLoading(true);setRows([]);setMessage('');setStatus(null);try{const r=await fetchNotionRuntime<unknown>('/expedientes');if(!alive)return;setStatus(r.status);setRows(r.status===200?rowsFrom(r.data):[]);if(r.status===403)setMessage('Tu perfil no tiene acceso a este módulo o registro.');else if(r.status!==200)setMessage('No se pudo leer la fuente canónica de Notion.');}catch{if(!alive)return;setRows([]);setStatus(503);setMessage('No se pudo leer la fuente canónica de Notion.');}finally{if(alive)setLoading(false);}})();return()=>{alive=false};},[active,logged]);
 const effectiveNav=useMemo(()=>nav.length?nav:fallbackNav,[nav]);
 const visibleRows=useMemo(()=>{const q=query.trim().toLowerCase();const filtered=rows.filter(row=>{const text=Object.values(row).filter(v=>typeof v==='string'||typeof v==='number').join(' ').toLowerCase();const rowPhase=firstString(row,['fase','phase']);const rowRisk=firstString(row,['riesgo','risk']);return(!q||text.includes(q))&&(!phase||rowPhase===phase)&&(!risk||rowRisk===risk);});if(!sortKey)return filtered;const direction=sortDir==='asc'?1:-1;return[...filtered].sort((a,b)=>{const primary=compareUnknown(a[sortKey],b[sortKey]);if(primary!==0)return primary*direction;return compareUnknown(firstString(a,['expediente','expediente_code','cliente','id']),firstString(b,['expediente','expediente_code','cliente','id']))*direction;});},[rows,query,phase,risk,sortKey,sortDir]);
 const columns=useMemo(()=>{const first=visibleRows[0]||rows[0];if(!first)return[];return Object.keys(first).filter(k=>!['id','synthetic','updated_at','created_at','actualizado','owner_actor_code','fuente','destino'].includes(k)).slice(0,6);},[visibleRows,rows]);
 const phaseRank=useMemo(()=>{const m=new Map<string,number>();rows.forEach(r=>{const x=firstString(r,['fase','phase'])||'Sin fase';m.set(x,(m.get(x)||0)+1)});return[...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6)},[rows]);
 const maxPhase=useMemo(()=>Math.max(1,...phaseRank.map(([,n])=>n)),[phaseRank]);
 const activeCount=useMemo(()=>rows.filter(r=>/activ|curso|estudio|banco|tasaci|fein|firma/i.test(firstString(r,['estado','status','fase','phase']))).length,[rows]);
 const reviewCount=useMemo(()=>rows.filter(r=>bool(r,['requiere_validacion','requiere_revision'])||/alto|bloque|incidencia|revis/i.test(`${firstString(r,['riesgo','risk'])} ${firstString(r,['estado','status'])}`)).length,[rows]);
 const signingCount=useMemo(()=>rows.filter(r=>/firma/i.test(firstString(r,['fase','phase','estado','status']))).length,[rows]);
 const anaSummary=useMemo(()=>{
  if(loading)return'Estoy leyendo los expedientes autorizados para darte una prioridad con datos completos.';
  if(status!==200)return'No tengo información suficiente para recomendar una prioridad fiable.';
  if(rows.length===0)return'No hay expedientes visibles en este ámbito. En cuanto entren, te indicaré qué revisar primero.';
  if(reviewCount>0)return`Hay ${reviewCount} expedientes con señal de revisión, bloqueo o riesgo. Empezaría por esos antes de continuar con el resto de la cartera.`;
  const top=phaseRank[0];
  return`Veo ${rows.length} expedientes${top?` y la fase con más carga es ${top[0]} con ${top[1]}`:''}. Priorizaría por siguiente acción, fase y fecha comprometida.`;
 },[loading,status,rows.length,reviewCount,phaseRank]);
 if(!active||!sessionReady||!logged)return null;
 function submitGlobalSearch(){const q=globalQuery.trim();navigate(q?`/buscar?q=${encodeURIComponent(q)}`:'/buscar');}
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
 function applySort(column:string){if(sortKey===column)setSortDir(v=>v==='asc'?'desc':'asc');else{setSortKey(column);setSortDir('asc');}}
 function ariaSort(column:string){return sortKey===column?(sortDir==='asc'?'ascending':'descending'):undefined;}
 const role=ctx?.role||'Usuario';
 const sourceOk=status===200&&!loading;
 return <OperationalShellFrame className="inmo-root" theme={theme} navigation={effectiveNav} activeRoute="/expedientes" query={globalQuery} onQueryChange={setGlobalQuery} searchPlaceholder="Buscar expediente, cliente, banco, inmobiliaria..." searchActionLabel="Buscar" onSearchAction={submitGlobalSearch} name={role} role={role} initials={role.slice(0,2).toUpperCase()} onToggleTheme={()=>setTheme(v=>v==='light'?'dark':'light')} onLogout={logout} contentClassName="inmo-content">
  <section className="inmo-ana-hero" data-testid="expedientes-ana-hero"><div className="inmo-ana-photo"><img src={anaVertical} alt="Ana"/></div><div className="inmo-ana-body"><span>ANA · EXPEDIENTES</span><h2>Esto es lo que toca ahora</h2><p>{anaSummary}</p><div className="inmo-next"><button onClick={()=>navigate('/ana?mode=do&resource=expedientes')}><b>1</b><strong>Que lo haga Ana</strong><small>Preparar siguiente acción →</small></button><button onClick={()=>navigate('/ana?mode=help&resource=expedientes')}><b>2</b><strong>Ayúdame</strong><small>Revisar prioridades →</small></button><button onClick={()=>navigate('/ana?mode=manual&resource=expedientes')}><b>3</b><strong>Lo hago yo</strong><small>Ver instrucciones →</small></button></div></div><article className="inmo-correct"><span>CONTROL DEL EXPEDIENTE</span><h3>Qué necesita atención</h3><p>Ana prioriza únicamente con fase, riesgo, bloqueos y siguiente acción disponibles en la cartera.</p><textarea readOnly rows={3} value={reviewCount?`${reviewCount} expedientes requieren revisión prioritaria.`:'No hay señales explícitas de revisión prioritaria.'}/><input readOnly value={`${signingCount} expedientes en fase o estado de firma`}/><button onClick={()=>navigate('/ana?mode=help&resource=expedientes')}>Revisar con Ana</button></article></section>
  <div className="ops-title"><div><span className="ops-icon"><FolderOpen size={20}/></span><div><h1>Expedientes</h1><p>Cartera hipotecaria autorizada para tu perfil.</p></div></div><span className={sourceOk?'ops-live ok':'ops-live'}>{loading?'Cargando…':sourceOk?'Datos vivos':'PRE-PROD'}</span></div>
  {sourceOk&&<div className="ops-message">Fuente canónica Notion</div>}
  {!loading&&status===200&&<><section className="inmo-kpis" data-testid="expedientes-live"><article><small>EXPEDIENTES</small><strong>{rows.length}</strong><span>Visibles</span></article><article><small>EN CURSO</small><strong>{activeCount}</strong><span>Con actividad o fase abierta</span></article><article><small>REVISAR</small><strong>{reviewCount}</strong><span>Riesgo, bloqueo o validación</span></article><article><small>FIRMA</small><strong>{signingCount}</strong><span>En fase o estado de firma</span></article></section><section className="inmo-insights inmo-live-charts"><article><span>DISTRIBUCIÓN POR FASE</span><h2>Situación de la cartera</h2><div className="inmo-bars">{phaseRank.map(([x,n])=><button key={x} className="inmo-bar-row inmo-bar-button" onClick={()=>setPhase(x==='Sin fase'?'':x)}><div className="inmo-bar-label"><strong>{x}</strong><span>{n}</span></div><div className="inmo-bar-track"><i style={{width:`${Math.max(8,n/maxPhase*100)}%`}}/></div></button>)}</div></article><article><span>LECTURA OPERATIVA</span><h2>Prioridad inmediata</h2><strong className="inmo-priority">{reviewCount}</strong><p>Expedientes con señal explícita de riesgo, bloqueo o necesidad de revisión. La gráfica de fases permite filtrar la cartera con un toque.</p></article></section></>}
  <div className="exp-filter-card"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filtrar expedientes..."/><input value={phase} onChange={e=>setPhase(e.target.value)} placeholder="Fase"/><input value={risk} onChange={e=>setRisk(e.target.value)} placeholder="Riesgo"/><button className="primary" onClick={()=>navigate('/expedientes/nuevo')}>Nuevo expediente</button></div>
  {loading&&<div className="ops-message" data-testid="ops-loading">Cargando expedientes…</div>}
  {!loading&&status===403&&<div className="ops-message" data-testid="ops-forbidden">{message}</div>}
  {!loading&&status!==null&&status!==200&&status!==403&&<div className="ops-message" data-testid="ops-error">{message}</div>}
  {!loading&&status===200&&visibleRows.length===0&&<div className="ops-message" data-testid="ops-empty">No hay expedientes en este ámbito.</div>}
  {!loading&&status===200&&visibleRows.length>0&&<div className="ops-table-card exp-table"><div className="ops-table-head"><strong>Cartera</strong><span>{visibleRows.length} registros</span></div><div className="ops-table-wrap" style={{maxHeight:'calc(100vh - 340px)'}}><table className="ops-sortable-table"><thead><tr>{columns.map(column=><th key={column} aria-sort={ariaSort(column)}><button onClick={()=>applySort(column)}>{prettyKey(column)} {sortKey===column?(sortDir==='asc'?'↑':'↓'):''}</button></th>)}</tr></thead><tbody>{visibleRows.map((row,index)=><tr key={firstString(row,['id','expediente_code','code','codigo'])||String(index)} onClick={()=>{const code=firstString(row,['expediente_code','code','codigo','id']);if(code)navigate(`/expedientes/${encodeURIComponent(code)}`)}}>{columns.map(column=><td key={column}>{prettyValue(row[column])}</td>)}</tr>)}</tbody></table></div></div>}
 </OperationalShellFrame>;
}
