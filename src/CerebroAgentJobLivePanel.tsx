import {useCallback,useEffect,useState} from 'react';
import {readJobFleetLive,type JobLiveResult,type JobGroup} from './cerebroAgentJobLiveApi';
const INITIAL:JobLiveResult={kind:'unavailable',data:null,reason:'NOT_READ_YET'};
const date=(s:string|null)=>s&&Number.isFinite(Date.parse(s))?new Date(s).toLocaleString('es-ES',{
 day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid'}):'SIN_FECHA';
const labels:Record<JobGroup['source'],string>={
 JARVIS_WORK:'JARVIS · trabajos',BROWSER_V2:'Navegador · trabajos V2',CREATIVE_V1:'Productora · trabajos'
};
export default function CerebroAgentJobLivePanel(){
 const[read,setRead]=useState<JobLiveResult>(INITIAL),[loading,setLoading]=useState(false);
 const refresh=useCallback(async(signal?:AbortSignal)=>{
  setLoading(true);
  const result=await readJobFleetLive(signal);
  if(signal?.aborted)return;
  setRead(result);setLoading(false);
 },[]);
 useEffect(()=>{
  const c=new AbortController();void refresh(c.signal);
  return()=>c.abort();
 },[refresh]);
 const d=read.kind==='ready'?read.data:null;
 return <section className="op4-job-live" aria-label="Trabajos y costes registrados · fuentes LAB">
  <div className="op4-fleet-head">
   <div><h4>JARVIS, navegador y productora · trabajos observados</h4>
    <p>Lectura directa de metadatos agregados en Supabase LAB; sin identidades, cargas de trabajo ni comandos.</p>
   </div>
   <button type="button" disabled={loading} onClick={()=>{void refresh()}} aria-label="Actualizar trabajos ahora">
    {loading?'Consultando…':'Actualizar trabajos ahora'}
   </button>
  </div>
  {!d?<p role="status">LECTURA DE TRABAJOS NO DISPONIBLE: {read.reason}.
   No se puede afirmar cuántos trabajos fallan, esperan o siguen activos.</p>:<>
   <p role="status">FUENTE CONSULTADA AHORA: {date(d.observed_at)} · {d.source}.
    Los registros de las colas son históricos en Supabase LAB. No se ha acreditado un ejecutor autónomo activo.</p>
   <div className="op4-job-source-grid">
    {d.source_totals.map(src=><article key={src.source} className="op4-job-source">
     <strong>{labels[src.source]}</strong>
     <span>Registros: {src.total_rows}</span>
     <span>Última actualización registrada: {date(src.last_updated_at)}</span>
     <div className="op4-job-status">
      {d.groups.filter(x=>x.source===src.source).map(x=><div key={[x.environment,x.engine_id,x.status].join(':')}>
       <strong>{x.engine_id} · {x.status}: {x.records}</strong>
       <small>Etiqueta histórica: {x.environment}. Latidos en 5 min: {x.heartbeat_5m_count}; 24 h: {x.heartbeat_24h_count}; leases sin vencer: {x.unexpired_lease_count}.</small>
       {x.stale_queued_24h_count>0?<small>En cola con más de 24 h desde actualización: {x.stale_queued_24h_count}. Revisar; no reintentar automáticamente.</small>:null}
      </div>)}
     </div>
    </article>)}
   </div>
   <div className="op4-job-source-grid">
    <article className="op4-job-source">
     <strong>Revisión de pendientes históricos</strong>
     <span>Grupos DEAD_LETTER, HOLD o QUEUED: {d.attention_groups.length}.</span>
     {d.attention_groups.map(x=><small key={[x.source,x.engine_id,x.status].join(':')}>
      {x.priority_suggestion} · {labels[x.source]} · {x.engine_id} · {x.status}: {x.records} registros.
      Último cambio: {date(x.latest_updated_at)}
     </small>)}
     <small>La prioridad es una sugerencia de revisión, no una modificación real de colas ni una incidencia actual acreditada.</small>
    </article>
    <article className="op4-job-source">
     <strong>Métricas registradas del navegador</strong>
     <span>Muestras: {d.cost_metrics.total_samples}. Coste incremental registrado: {
      d.cost_metrics.recorded_incremental_cost_eur===null?'NO_MEDIDO':
       d.cost_metrics.recorded_incremental_cost_eur.toLocaleString('es-ES',{minimumFractionDigits:4,maximumFractionDigits:4})+' €'
     } en {d.cost_metrics.cost_samples} muestras.</span>
     <span>Duración de muestras: p50 {d.cost_metrics.p50_duration_seconds??'NO_MEDIDO'} s;
      p90 {d.cost_metrics.p90_duration_seconds??'NO_MEDIDO'} s ({d.cost_metrics.duration_samples} muestras).</span>
     <small>Última muestra: {date(d.cost_metrics.last_observation_at)}. No son estimaciones de nuevas tareas.</small>
     <small><strong>Coste total de infraestructura: NO_MEDIDO.</strong> El coste incremental registrado como 0 € no significa que los proveedores sean gratuitos.</small>
    </article>
   </div>
   <p className="op4-fleet-note">CEREBRO LAB: no hay prueba de agent_id, subagent_id o trabajo en ejecución actual. Los campos PREPROD son etiquetas en tablas históricas del proyecto LAB, NO una App PREPROD operativa. Sin comandos, reintentos, autorizaciones ni cambios de prioridades.</p>
  </>}
 </section>;
}
