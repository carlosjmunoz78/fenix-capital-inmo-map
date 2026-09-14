import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import {fetchNotionRuntime} from './notionRuntime';
import {fetchEconomiaRuntime} from './economiaRuntime';
import './direction-kpi-drilldown.css';

type Row=Record<string,unknown>;
type Payload={count:number;items:Row[];complete?:boolean;total?:number|null;unresolved?:number};
type Spec={key:string;title:string;route:string;summary:string;columns:Array<[string,string]>};

const SPECS:Record<string,Spec>={
 'expedientes-en-curso':{key:'expedientes-en-curso',title:'Expedientes en curso',route:'/expedientes?estado=en-curso&kpi=expedientes-en-curso',summary:'Expedientes que siguen realmente en curso; firmados, cerrados, cancelados o perdidos quedan fuera.',columns:[['expediente','Expediente'],['cliente','Alias'],['fase','Fase'],['proxima_accion','Próxima acción'],['importe_solicitado','Importe solicitado']]},
 'firmas-previstas':{key:'firmas-previstas',title:'Firmas previstas este mes',route:'/firmas?firma=mes-actual&estado=prevista&kpi=firmas-previstas',summary:'Firmas previstas dentro del mes actual que todavía no constan como firmadas/cerradas.',columns:[['expediente_code','Expediente'],['fecha_firma','Fecha firma'],['estado','Estado'],['notaria','Notaría']]},
 'firmadas':{key:'firmadas',title:'Firmados este mes',route:'/firmas?firma=mes-actual&estado=firmada&kpi=firmadas',summary:'Firmas del mes actual cuyo estado indica que ya están firmadas o cerradas.',columns:[['expediente_code','Expediente'],['fecha_firma','Fecha firma'],['estado','Estado'],['notaria','Notaría']]},
 'expedientes-en-riesgo':{key:'expedientes-en-riesgo',title:'Expedientes en riesgo',route:'/expedientes?riesgo=si&kpi=expedientes-en-riesgo',summary:'Expedientes abiertos con riesgo, semáforo, bloqueo o atención explícita.',columns:[['expediente','Expediente'],['cliente','Alias'],['fase','Fase'],['riesgo','Riesgo'],['proxima_accion','Próxima acción']]},
 'honorarios-pendientes':{key:'honorarios-pendientes',title:'Honorarios pendientes este mes',route:'/economia?honorarios=pendientes&mes=actual&kpi=honorarios-pendientes',summary:'Operaciones del mes que todavía requieren liquidar honorarios. Si el origen no expone el cálculo completo, no se inventa total.',columns:[['expediente','Expediente'],['fecha_firma','Firma prevista'],['honorarios_fenix_base','Honorarios Fénix'],['comision_inmobiliaria','Comisión inmobiliaria'],['neto_pendiente_base','Neto pendiente']]}
};

function rowsFrom(data:unknown):Row[]{if(!data||typeof data!=='object')return[];const d=data as Record<string,unknown>;for(const k of ['items','expedientes','firmas'])if(Array.isArray(d[k]))return d[k] as Row[];return[]}
function txt(r:Row,keys:string[]){for(const k of keys){const v=r[k];if(typeof v==='string'&&v.trim())return v.trim()}return''}
function state(r:Row){return txt(r,['estado','fase','phase','stage','status'])}
function openExp(r:Row){return !/firmad|cerrad|posventa|perdid|cancelad|anulad|desistid/i.test(state(r))}
function riskExp(r:Row){const v=txt(r,['riesgo','risk','nivel_riesgo','semaforo','semáforo']);return openExp(r)&&/alto|cr[ií]tic|riesgo|bloquead|atenci[oó]n|urgente/i.test(v)}
function signed(r:Row){return /firmad|complet|cerrad/i.test(state(r))}
function dateOf(r:Row){return txt(r,['fecha_hora_firma','fecha_firma'])}
function thisMonth(v:string){if(!v)return false;const d=new Date(v.replace(' ','T'));if(Number.isNaN(d.getTime()))return false;const n=new Date();return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()}
function euro(v:unknown){if(typeof v!=='number'||!Number.isFinite(v))return'—';return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(v)}
function pretty(v:unknown,key:string){if(v===null||v===undefined||v==='')return'—';if(/honorarios|comision|neto|importe/.test(key))return euro(v);if(Array.isArray(v))return v.length?v.join(', '):'—';return String(v)}
function canonicalExp(r:Row){return {...r,expediente:r.expediente??r.expediente_code??r.code??r.id,cliente:r.cliente??r.cliente_alias,fase:r.fase??r.stage,proxima_accion:r.proxima_accion??r['próxima_accion'],riesgo:r.riesgo??r.semaforo??r['semáforo']}}
function canonicalFirma(r:Row){return {...r,expediente_code:r.expediente_code??r.expediente,fecha_firma:r.fecha_firma??r.fecha_hora_firma}}
function rowRoute(key:string,r:Row){
 if(key==='firmas-previstas'||key==='firmadas'){
  const id=txt(r,['id','firma_id','firma_code','code']);
  if(id)return`/firmas/${encodeURIComponent(id)}`;
  const exp=txt(r,['expediente_code','expediente']);
  return exp?`/expedientes/${encodeURIComponent(exp)}`:'';
 }
 const exp=txt(r,['expediente','expediente_code','code','codigo','id']);
 return exp?`/expedientes/${encodeURIComponent(exp)}`:'';
}

async function load(key:string):Promise<{status:number;data:Payload|null}>{
 try{
  if(key==='expedientes-en-curso'||key==='expedientes-en-riesgo'){
   const r=await fetchNotionRuntime<unknown>('/expedientes');if(r.status!==200)return{status:r.status,data:null};const rows=rowsFrom(r.data).map(canonicalExp);const items=key==='expedientes-en-riesgo'?rows.filter(riskExp):rows.filter(openExp);return{status:200,data:{count:items.length,items}};
  }
  if(key==='firmas-previstas'||key==='firmadas'){
   const r=await fetchNotionRuntime<unknown>('/firmas');if(r.status!==200)return{status:r.status,data:null};const rows=rowsFrom(r.data).map(canonicalFirma);const items=key==='firmadas'?rows.filter(x=>signed(x)&&thisMonth(dateOf(x))):rows.filter(x=>!signed(x)&&thisMonth(dateOf(x)));return{status:200,data:{count:items.length,items}};
  }
  if(key==='honorarios-pendientes'){
   const r=await fetchEconomiaRuntime<unknown>();if(r.status!==200)return{status:r.status,data:null};const items=rowsFrom(r.data);const totals=items.map(x=>Number(x.neto_pendiente_base)).filter(Number.isFinite);return{status:200,data:{count:items.length,items,complete:items.length>0&&totals.length===items.length,total:totals.length===items.length?totals.reduce((a,b)=>a+b,0):null,unresolved:items.length-totals.length}};
  }
  return{status:404,data:null};
 }catch{return{status:0,data:null}}
}
function kpiFromButton(button:HTMLElement){const t=(button.textContent||'').toUpperCase();if(t.includes('HONORARIOS'))return'honorarios-pendientes';if(t.includes('EN RIESGO'))return'expedientes-en-riesgo';if(t.includes('FIRMADOS'))return'firmadas';if(t.includes('FIRMAS'))return'firmas-previstas';if(t.includes('EXPEDIENTES'))return'expedientes-en-curso';return''}

export default function DirectionKpiDrilldownGuard(){
 const location=useLocation(),navigate=useNavigate();const params=useMemo(()=>new URLSearchParams(location.search),[location.search]);const activeKey=params.get('kpi')||'';const spec=SPECS[activeKey];const[portal,setPortal]=useState<HTMLElement|null>(null);const[status,setStatus]=useState<number|null>(null);const[data,setData]=useState<Payload|null>(null);
 useEffect(()=>{const handler=(ev:MouseEvent)=>{if(location.pathname!=='/inicio')return;const button=(ev.target as Element|null)?.closest('.dir-kpi') as HTMLElement|null;if(!button)return;const s=SPECS[kpiFromButton(button)];if(!s)return;ev.preventDefault();ev.stopPropagation();navigate(s.route)};document.addEventListener('click',handler,true);return()=>document.removeEventListener('click',handler,true)},[location.pathname,navigate]);
 useEffect(()=>{if(!spec){setPortal(null);return}let cancelled=false,obs:MutationObserver|null=null;const attach=()=>{if(cancelled)return;const root=document.querySelector('.ops-root') as HTMLElement|null;const target=document.querySelector('.ops-content,.eco-content') as HTMLElement|null;if(root)root.setAttribute('data-kpi-drilldown','true');if(target){setPortal(target);return}obs=new MutationObserver(attach);obs.observe(document.body,{childList:true,subtree:true})};attach();return()=>{cancelled=true;obs?.disconnect();document.querySelectorAll('.ops-root[data-kpi-drilldown="true"]').forEach(x=>x.removeAttribute('data-kpi-drilldown'));setPortal(null)}},[spec?.key,location.pathname]);
 useEffect(()=>{if(!spec)return;let alive=true;setStatus(null);setData(null);load(spec.key).then(r=>{if(alive){setStatus(r.status);setData(r.data)}});return()=>{alive=false}},[spec?.key]);
 if(!spec||!portal)return null;const rows=data?.items??[];const metric=spec.key==='honorarios-pendientes'?(data?.complete&&typeof data.total==='number'?euro(data.total):'—'):String(data?.count??rows.length);
 return createPortal(<section className="fenix-kpi-drilldown" data-testid="direction-kpi-drilldown"><div className="fenix-kpi-head"><div><small>INICIO · DESGLOSE CANÓNICO</small><h1>{spec.title}</h1><p>{spec.summary}</p></div><button onClick={()=>navigate('/inicio')}>← Volver a Inicio</button></div><div className="fenix-kpi-metric"><span>{spec.key==='honorarios-pendientes'?'TOTAL NETO PENDIENTE':'REGISTROS QUE EXPLICAN EL KPI'}</span><strong>{status===200?metric:'—'}</strong><small>{spec.key==='honorarios-pendientes'&&!data?.complete&&status===200?`${data?.unresolved??0} operación(es) sin cálculo completo; no se inventa total.`:'Fuente canónica PROD'}</small></div>{status===null?<div className="fenix-kpi-state">Cargando desglose canónico…</div>:status!==200?<div className="fenix-kpi-state error">No se pudo cargar el desglose exacto del KPI.</div>:rows.length===0?<div className="fenix-kpi-state">No hay registros que cumplan este KPI.</div>:<div className="fenix-kpi-table-wrap"><table><thead><tr>{spec.columns.map(([,label])=><th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((row,i)=>{const route=rowRoute(spec.key,row);const open=()=>route&&navigate(route);return <tr key={String(row.id??row.expediente_code??row.expediente??i)} className={route?'clickable-record':undefined} role={route?'link':undefined} tabIndex={route?0:undefined} onClick={open} onKeyDown={e=>{if(route&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open()}}}>{spec.columns.map(([key])=><td key={key}>{pretty(row[key],key)}</td>)}</tr>})}</tbody></table></div>}</section>,portal)
}
