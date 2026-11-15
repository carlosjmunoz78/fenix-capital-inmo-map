import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Cloud,RefreshCw,Search,ShieldAlert,Clock} from 'lucide-react';
import {readCloudflareFleet,type CloudflareFleetRead} from './cerebroCloudflareFleetApi';
import audited from '../cerebro/universal/v0/provider-cloudflare/observations/cloudflare-workers-2026-11-15.json';
import cronGate from '../cerebro/universal/v0/provider-cloudflare/observations/cloudflare-free-cron-capacity-2026-11-15.json';
import './cerebro-cloudflare-fleet.css';
const INITIAL:CloudflareFleetRead={kind:'unavailable',snapshot:null,reason:'NOT_READ_YET'};
const format=(v:string|null)=>v&&Number.isFinite(Date.parse(v))?new Date(v).toLocaleString('es-ES'):'sin fecha';
export default function CerebroCloudflareFleetPanel(){
 const[read,setRead]=useState<CloudflareFleetRead>(INITIAL);
 const liveConnected=useRef(false);
 const[busy,setBusy]=useState(false);
 const[filter,setFilter]=useState('');
 const[all,setAll]=useState(false);
 const[selected,setSelected]=useState<string|null>(null);
 const refresh=useCallback(async(force=false,signal?:AbortSignal)=>{
  setBusy(true);
  const next=await readCloudflareFleet({refresh:force,signal});
  if(signal?.aborted)return;
  liveConnected.current=next.kind==='ready';setRead(next);setBusy(false);
 },[]);
 useEffect(()=>{
  const c=new AbortController();
  void refresh(false,c.signal);
  const timer=window.setInterval(()=>{if(liveConnected.current&&document.visibilityState==='visible')void refresh(false,c.signal)},180000);
  const onShow=()=>{if(liveConnected.current&&document.visibilityState==='visible')void refresh(false,c.signal)};
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
    boolean_flags:{} as Record<string,boolean>,observability_events_24h:null as number|null,
    evidence_time:x.observed_at
  })):(archived?.workers.map(w=>({
    id:w.worker_id,modified_on:w.modified_on,cron:w.cron_schedules,
    engine_id:w.engine_id,company_id:w.company_id,environment:w.environment,
    workers_dev_enabled:w.workers_dev_enabled,
    boolean_flags:w.boolean_flags as Record<string,boolean>,observability_events_24h:w.observability_events_24h as number|null,
    evidence_time:w.settings_observed_at||archived.observed_at
  }))||[]);
  if(archived&&!mapped.some(w=>w.id===cronGate.resource_name))mapped.push({
   id:cronGate.resource_name,modified_on:cronGate.observed_at,cron:[] as string[],
   engine_id:cronGate.engine_id,company_id:cronGate.company_id,environment:cronGate.environment,
   workers_dev_enabled:false,boolean_flags:{} as Record<string,boolean>,
   observability_events_24h:null as number|null,evidence_time:cronGate.observed_at
  });
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
    archived?'ARCHIVO COMPUESTO, NO EN VIVO · auditoría base '+format(archived.observed_at)+'; canario '+format(cronGate.observed_at)+' · conexión actual: '+read.reason:
    'SIN AUTORIZACIÓN: '+read.reason}</p>
  <div className="op4-cf-stats" aria-label="Resumen Cloudflare">
   <div><strong>{x?.worker_count??(archived?cronGate.worker_count_now:null)??'—'}</strong><small>Workers registrados</small></div>
   <div><strong>{x?.with_cron??archived?.scheduled_workers??'—'}</strong><small>Con cron verificado</small></div>
   <div><strong>{x?.without_cron??(archived?archived.without_cron_workers+1:null)??'—'}</strong><small>Sin cron verificado</small></div>
   <div><strong>{x?.cron_unknown_count??(archived?archived.worker_count-archived.cron_verified_workers:null)??'—'}</strong><small>Crons no comprobados</small></div>
  </div>
  <div className="op4-cf-capacity" role="region" aria-label="Gate de capacidad cron Cloudflare Free">
   <strong>Cuota cron Workers Free · {cronGate.quota.existing_cron_triggers}/{cronGate.quota.limit_cron_triggers_per_account}</strong>
   <p>Sin plazas disponibles en la comprobación del {format(cronGate.observed_at)}. Cloudflare rechazó una programación nueva (error {cronGate.quota.api_error_code}). No se contratará un plan, alterará un cron existente ni se reintentará automáticamente. La capacidad actual requiere nueva consulta.</p>
   <small>Canario aislado {cronGate.resource_name}: sin cron, workers.dev y preview desactivados; otros cinco cron conservados.</small>
  </div>
  {archived?.observability?<p className="op4-cf-note">AUDITORÍA DE EVENTOS (no en vivo): {archived.observability.total_events} eventos de observabilidad en 24 horas, en {archived.observability.services.length} servicios identificados. Ventana hasta {format(archived.observability.to)}. No son trabajos completados ni publicaciones.</p>:null}
  {(x||archived)?<><label className="op4-cf-filter"><Search size={14}/> Filtrar Workers
   <input aria-label="Buscar Worker Cloudflare" value={filter} onChange={e=>{setFilter(e.target.value);setAll(false)}} placeholder="facebook, instagram, jarvis, fact001…"/>
  </label>
  <div className="op4-cf-list" role="list">
   {visible.map(w=><div className="op4-cf-worker" key={w.id} role="listitem">
    <div><strong>{w.id}</strong>
     <small>{x?'EN VIVO':'ARCHIVO '+format(w.evidence_time)} · Último cambio de script: {format(w.modified_on)}</small>
     {w.engine_id?<small>Motor declarado: {w.engine_id} · {w.environment||'entorno sin verificar'}</small>:null}
     {w.observability_events_24h!==null?<small>Observabilidad en la última auditoría: {w.observability_events_24h} eventos/24 h (no trabajos)</small>:null}
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
   {target.observability_events_24h!==null?<p>Eventos registrados en la auditoría de 24 horas: {target.observability_events_24h}. No confirma ejecución completa ni éxito de jobs.</p>:null}
   {target.workers_dev_enabled!==null?<p>URL workers.dev configurada: {target.workers_dev_enabled?'SÍ':'NO'}. No equivale a acceso anónimo confirmado.</p>:null}
   {Object.keys(target.boolean_flags).length?<p>Indicadores de configuración auditados: {Object.entries(target.boolean_flags).map(([key,value])=>key+'='+value).join(' · ')}. No acreditan actividad.</p>:null}
   <p>{target.cron===null?'No hay evidencia de sus crons en esta lectura.':target.cron.length?'Cron verificado: '+target.cron.join(', '):'Sin cron verificado.'} No se han comprobado latidos ni últimas ejecuciones del motor.</p>
   <p><ShieldAlert size={14}/> Pausar, reanudar y priorizar este recurso: <b>NO CONECTADO</b>. No se ha ejecutado ningún cambio en Cloudflare.</p>
  </div>:null}
  </>:<p>Acceso Cloudflare no autorizado. No se muestra ni la fotografía anterior.</p>}
 </section>;
}
