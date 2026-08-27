import {useEffect,useMemo,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {FolderOpen} from 'lucide-react';
import OperationalShellFrame from './OperationalShellFrame';
import {normalizeNavigation,type NavItem} from './masterNavigation';
import {fetchAppApi,supabase} from './supabase';
import {fetchNotionRuntime} from './notionRuntime';
import './operational.css';
import './expedientes-polish.css';
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
 if(!active||!sessionReady||!logged)return null;
 function submitGlobalSearch(){const q=globalQuery.trim();navigate(q?`/buscar?q=${encodeURIComponent(q)}`:'/buscar');}
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
 function applySort(column:string){if(sortKey===column)setSortDir(v=>v==='asc'?'desc':'asc');else{setSortKey(column);setSortDir('asc');}}
 function ariaSort(column:string){return sortKey===column?(sortDir==='asc'?'ascending':'descending'):undefined;}
 const role=ctx?.role||'Usuario';
 const sourceOk=status===200&&!loading;
 return <OperationalShellFrame theme={theme} navigation={effectiveNav} activeRoute="/expedientes" query={globalQuery} onQueryChange={setGlobalQuery} searchPlaceholder="Buscar expediente, cliente, banco, inmobiliaria..." searchActionLabel="Buscar" onSearchAction={submitGlobalSearch} name={role} role={role} initials={role.slice(0,2).toUpperCase()} onToggleTheme={()=>setTheme(v=>v==='light'?'dark':'light')} onLogout={logout}>
  <div className="ops-title"><div><span className="ops-icon"><FolderOpen size={20}/></span><div><h1>Expedientes</h1><p>Cartera hipotecaria autorizada para tu perfil.</p></div></div><span className={sourceOk?'ops-live ok':'ops-live'}>{loading?'Cargando…':sourceOk?'Datos vivos':'PRE-PROD'}</span></div>
  {sourceOk&&<div className="ops-message">Fuente canónica Notion</div>}
  <div className="exp-filter-card"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filtrar expedientes..."/><input value={phase} onChange={e=>setPhase(e.target.value)} placeholder="Fase"/><input value={risk} onChange={e=>setRisk(e.target.value)} placeholder="Riesgo"/><button className="primary" onClick={()=>navigate('/expedientes/nuevo')}>Nuevo expediente</button></div>
  {loading&&<div className="ops-message" data-testid="ops-loading">Cargando expedientes…</div>}
  {!loading&&status===403&&<div className="ops-message" data-testid="ops-forbidden">{message}</div>}
  {!loading&&status!==null&&status!==200&&status!==403&&<div className="ops-message" data-testid="ops-error">{message}</div>}
  {!loading&&status===200&&visibleRows.length===0&&<div className="ops-message" data-testid="ops-empty">No hay expedientes en este ámbito.</div>}
  {!loading&&status===200&&visibleRows.length>0&&<div className="ops-table-card exp-table"><div className="ops-table-head"><strong>Cartera</strong><span>{visibleRows.length} registros</span></div><div className="ops-table-wrap" style={{maxHeight:'calc(100vh - 340px)'}}><table className="ops-sortable-table"><thead><tr>{columns.map(column=><th key={column} aria-sort={ariaSort(column)}><button onClick={()=>applySort(column)}>{prettyKey(column)} {sortKey===column?(sortDir==='asc'?'↑':'↓'):''}</button></th>)}</tr></thead><tbody>{visibleRows.map((row,index)=><tr key={firstString(row,['id','expediente_code','code','codigo'])||String(index)} onClick={()=>{const code=firstString(row,['expediente_code','code','codigo','id']);if(code)navigate(`/expedientes/${encodeURIComponent(code)}`)}}>{columns.map(column=><td key={column}>{prettyValue(row[column])}</td>)}</tr>)}</tbody></table></div></div>}
 </OperationalShellFrame>;
}
