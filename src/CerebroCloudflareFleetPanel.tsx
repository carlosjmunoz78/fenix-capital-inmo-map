import {useCallback,useEffect,useMemo,useState} from 'react';
import {Cloud,RefreshCw,Search,ShieldAlert,Clock} from 'lucide-react';
import {readCloudflareFleet,type CloudflareFleetRead} from './cerebroCloudflareFleetApi';
import audited from '../cerebro/universal/v0/provider-cloudflare/observations/cloudflare-workers-2026-11-15.json';
import './cerebro-cloudflare-fleet.css';
const INITIAL:CloudflareFleetRead={kind:'unavailable',snapshot:null,reason:'NOT_READ_YET'};
const format=(v:string|null)=>v&&Number.isFinite(Date.parse(v))?new Date(v).toLocaleString('es-ES'):'sin fecha';
export default function CerebroCloudflareFleetPanel(){
 const[read,setRead]=useState<CloudflareFleetRead>(INITIAL);
 const[busy,setBusy]=useState(false);
 const[filter,setFilter]=useState('');
 const[all,setAll]=useState(false);
 const[selected,setSelected]=useState<string|null>(null);
 const refresh=useCallback(async(force=false,signal?:AbortSignal)=>{
  setBusy(true);
  const next=await readCloudflareFleet({refresh:force,signal});
  if(signal?.aborted)return;
  setRead(next);setBusy(false);
 },[]);
 useEffect(()=>{
  const c=new AbortController();
  void refresh(false,c.signal);
  const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void refresh(false,c.signal)},180000);
  const onShow=()=>{if(document.visibilityState==='visible')void refresh(false,c.signal)};
  document.addEventListener('visibilitychange',onShow);
  return()=>{c.abort();window.clearInterval(timer);document.removeEventListener('visibilitychange',onShow)};
 },[refresh]);
 const x=read.snapshot;
 const archived=read.kind==='unavailable'?audited:null;
 const list=useMemo(()=>{
  const mapped=x?x.workers.map(w=>({
    id:w.id,modified_on:w.modified_on,cron:w.cron,
    engine_id:null as string|null,company_id:null as string|null,
    environment:null as string|null,workers_dev_enabled:null as boolean|null,
    boolean_flags:{} as Record<string,boolean>
  })):(archived?.workers.map(w=>({
    id:w.worker_id,modified_on:w.modified_on,cron:w.cron_schedules,
    engine_id:w.engine_id,company_id:w.company_id,environment:w.environment,
    workers_dev_enabled:w.workers_dev_enabled,
    boolean_flags:w.boolean_flags as Record<string,boolean>
  }))||[]);
  return mapped.filter(w=>w.id.toLowerCase().includes(filter.trim().toLowerCase()));
 },[x,archived,filter]);
 const visible=all?list:list.slice(0,9);
 const target=selected?list.find(w=>w.id===selected):null;
 return <section className="op4-cf" aria-label="Cloudflare · inventario vivo de Workers">
  <div className="op4-cf-head">
   <div><h4><Cloud size={18}/> Cloudflare · Workers reales</h4>
    <p>Consulta directa del inventario Cloudflare. Programación no equivale a ejecución efectiva ni a agente activo.</p></div>
   <button type="button" onClick={()=>{void refresh(true)}} disabled={busy} aria-label="Actualizar Cloudflare desde origen">
    <RefreshCw size={15}/>{busy?'Consultando…':'Consultar Cloudflare ahora'}</button>
  </div>
  <p role="status" className="op4-cf-status"><Clock size={14}/>
   {x?'EN VIVO · Cloudflare API · '+format(x.observed_at)+(x.cache_status==='HOT_60S'?' · caché ≤60 s':' · lectura nueva'):
    archived?'ARCHIVO, NO EN VIVO · comprobado '+format(archived.observed_at)+' · conexión actual: '+read.reason:
    'SIN AUTORIZACIÓN: '+read.reason}</p>
  <div className="op4-cf-stats" aria-label="Resumen Cloudflare">
   <div><strong>{x?.worker_count??archived?.worker_count??'—'}</strong><small>Workers registrados</small></div>
   <div><strong>{x?.with_cron??archived?.scheduled_workers??'—'}</strong><small>Con cron verificado</small></div>
   <div><strong>{x?.without_cron??archived?.without_cron_workers??'—'}</strong><small>Sin cron verificado</small></div>
   <div><strong>{x?.cron_unknown_count??(archived?archived.worker_count-archived.cron_verified_workers:null)??'—'}</strong><small>Crons no comprobados</small></div>
  </div>
  {(x||archived)?<><label className="op4-cf-filter"><Search size={14}/> Filtrar Workers
   <input aria-label="Buscar Worker Cloudflare" value={filter} onChange={e=>{setFilter(e.target.value);setAll(false)}} placeholder="facebook, instagram, jarvis, fact001…"/>
  </label>
  <div className="op4-cf-list" role="list">
   {visible.map(w=><div className="op4-cf-worker" key={w.id} role="listitem">
    <div><strong>{w.id}</strong>
     <small>{x?'EN VIVO':'ARCHIVO '+format(archived?.observed_at||null)} · Último cambio de script: {format(w.modified_on)}</small>
     {w.engine_id?<small>Motor declarado: {w.engine_id} · {w.environment||'entorno sin verificar'}</small>:null}
     <small>{w.cron===null?'Cron NO VERIFICADO':w.cron.length===0?'Sin cron configurado':'Cron '+w.cron.join(', ')} · Ejecución no verificada</small></div>
    <button type="button" onClick={()=>setSelected(previous=>previous===w.id?null:w.id)} aria-label={'Examinar '+w.id}>Examinar</button>
   </div>)}
   {!list.length?<p>No hay Workers con ese filtro en la muestra. No crear ni modificar por esa ausencia.</p>:null}
  </div>
  {!all&&list.length>9?<button type="button" onClick={()=>setAll(true)}>Ver los {list.length} Workers filtrados</button>:null}
  {all&&list.length>9?<button type="button" onClick={()=>setAll(false)}>Mostrar menos</button>:null}
  {target?<div className="op4-cf-detail" role="status">
   <strong>{target.id}</strong>
   {target.engine_id?<p>Motor declarado: {target.engine_id} · Empresa declarada: {target.company_id||'no verificada'} · Entorno: {target.environment||'no verificado'}.</p>:null}
   {target.workers_dev_enabled!==null?<p>URL workers.dev configurada: {target.workers_dev_enabled?'SÍ':'NO'}. No equivale a acceso anónimo confirmado.</p>:null}
   {Object.keys(target.boolean_flags).length?<p>Indicadores de configuración auditados: {Object.entries(target.boolean_flags).map(([key,value])=>key+'='+value).join(' · ')}. No acreditan actividad.</p>:null}
   <p>{target.cron===null?'No hay evidencia de sus crons en esta lectura.':target.cron.length?'Cron verificado: '+target.cron.join(', '):'Sin cron verificado.'} No se han comprobado latidos ni últimas ejecuciones del motor.</p>
   <p><ShieldAlert size={14}/> Pausar, reanudar y priorizar este recurso: <b>NO CONECTADO</b>. No se ha ejecutado ningún cambio en Cloudflare.</p>
  </div>:null}
  </>:<p>Acceso Cloudflare no autorizado. No se muestra ni la fotografía anterior.</p>}
 </section>;
}
