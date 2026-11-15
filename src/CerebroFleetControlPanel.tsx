import {useCallback,useEffect,useState} from 'react';
import {Activity,AlertTriangle,Clock,RefreshCcw,Shield,Users,Workflow} from 'lucide-react';
import {readFleetLab,type FleetRead} from './cerebroFleetObserveApi';
import {triageFleet} from './cerebroOperativaTriage';
import {readFailedJobDetail,type JobDetailRead} from './cerebroFleetJobDetailApi';
import CerebroLabWorkerControlPanel from './CerebroLabWorkerControlPanel';
import CerebroCloudflareFleetPanel from './CerebroCloudflareFleetPanel';
import CerebroCloudflareQueuesPanel from './CerebroCloudflareQueuesPanel';
import CerebroSocialProviderPanel from './CerebroSocialProviderPanel';
import {readUniversalOperativaLab,type UniversalJob001ControlLab} from './cerebroUniversalOperativaLabApi';
import './cerebro-fleet-control-panel.css';
const INITIAL:FleetRead={kind:'unavailable',snapshot:null,reason:'NOT_READ_YET'};
function date(s:string|null|undefined){
 if(!s||!Number.isFinite(Date.parse(s)))return 'sin fecha';
 return new Date(s).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
}
export default function CerebroFleetControlPanel(){
 const[result,setResult]=useState<FleetRead>(INITIAL);
 const[job,setJob]=useState<UniversalJob001ControlLab|null>(null);
 const[jobReason,setJobReason]=useState('NOT_READ_YET');
 const[loading,setLoading]=useState(false);
 const[lastError,setLastError]=useState('');
 const[controlTarget,setControlTarget]=useState('SEO-001');
 const[inspectTarget,setInspectTarget]=useState('FACT-001');
 const[inspectingJob,setInspectingJob]=useState<string|null>(null);
 const[jobDetails,setJobDetails]=useState<Record<string,JobDetailRead>>({});
 const[controlStatus,setControlStatus]=useState('');
 const refresh=useCallback(async(signal?:AbortSignal)=>{
  setLoading(true);
  setJobDetails({});
  const result=await readFleetLab(signal);
  if(signal?.aborted)return;
  setResult(result);setLastError(result.reason);
  const extra=await readUniversalOperativaLab(signal);
  if(signal?.aborted)return;
  setJob(extra.kind==='ready'?extra.job001||null:null);
  setJobReason(extra.kind==='ready'?(extra.job001?.reason||'SOURCE_UNAVAILABLE'):extra.reason||extra.kind);
  setLoading(false);
 },[]);
 useEffect(()=>{
  const abort=new AbortController();
  void refresh(abort.signal);
  const timer=window.setInterval(()=>{
   if(document.visibilityState==='visible')void refresh(abort.signal);
  },120000);
  const onVisibility=()=>{if(document.visibilityState==='visible')void refresh(abort.signal)};
  document.addEventListener('visibilitychange',onVisibility);
  return()=>{abort.abort();window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisibility)};
 },[refresh]);
 const snapshot=result.snapshot;
 const triage=triageFleet(result);
 const roles=snapshot?.roles.entries||[];
 const sources=snapshot?.sources||[];
 const connected=sources.filter(s=>s.state==='LIVE');
 const liveRuns=connected.flatMap(s=>s.recent||[]).sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||''))).slice(0,16);
 const inspectedEngine=inspectTarget.trim().toUpperCase();
 const inspectedIsValid=/^[A-Z][A-Z0-9]{1,11}-[0-9]{3}$/.test(inspectedEngine);
 const inspectedProfiles=inspectedIsValid?roles.filter(r=>r.engine_bindings.includes(inspectedEngine)):[];
 const inspectFailedJob=async(key:string,url:string)=>{
  if(inspectingJob)return;
  const target=url.match(/^https:\/\/github\.com\/carlosjmunoz78\/(fenix-capital-inmo-map|capital-mapa-pro)\/actions\/runs\/([1-9]\d{0,14})$/);
  if(!target){setJobDetails(prev=>({...prev,[key]:{kind:'denied',reason:'EVIDENCE_URL_NOT_ALLOWLISTED',data:null}}));return;}
  setInspectingJob(key);
  try{
   const read=await readFailedJobDetail(target[1],Number(target[2]));
   setJobDetails(prev=>({...prev,[key]:read}));
  }finally{setInspectingJob(null);}
 };
 const control=(action:string)=>{
  const id=controlTarget.trim().toUpperCase();
  const reason=/(?:STAGING|PROD)/.test(id)?'Entorno protegido: no se permite control desde el Preview.':
   !/^[A-Z][A-Z0-9]{1,11}-\d{3}$/.test(id)?'Identifica primero un motor exacto, por ejemplo SEO-001.':
   'El motor '+id+' no tiene un ejecutor de control verificado para '+action.toLowerCase()+
   '. Acción NO ejecutada. Necesita conexión al runtime propietario, permisos, auditoría y rollback.';
  setControlStatus(reason);
 };
 return <section className="op4-fleet" aria-label="Inventario operativo CEREBRO por plataforma">
  <div className="op4-fleet-head">
   <div><h3>Control de agentes, motores y trabajos</h3>
    <p>Inventario por fuente con lectura renovable. Sin confundir perfiles definidos con procesos activos.</p></div>
   <button type="button" disabled={loading} onClick={()=>{void refresh()}} aria-label="Actualizar inventario ahora">
    <RefreshCcw size={16}/>{loading?'Comprobando…':'Actualizar ahora'}
   </button>
  </div>
  <p className="op4-fleet-stamp" role="status">
   <Clock size={14}/> {snapshot?'Comprobado: '+date(snapshot.observed_at):'Inventario sin lectura confirmada'}
   {result.kind!=='ready'?' · '+lastError:''}
  </p>
  <div className="op4-fleet-metrics">
   <div><Users size={19}/><strong>{snapshot?.roles.declared_role_profiles??'—'}</strong><span>Perfiles definidos, no activos</span></div>
   <div><Users size={19}/><strong>—</strong><span>Agentes vivos · censo pendiente</span></div>
   <div><Workflow size={19}/><strong>—</strong><span>Subagentes vivos · censo pendiente</span></div>
   <div><Activity size={19}/><strong>{connected.length||'—'}</strong><span>Fuentes GitHub leídas ahora</span></div>
  </div>
  {snapshot?.media_studio?<div className="op4-fleet-studio" aria-label="Productora audiovisual · jerarquía declarada">
   <strong>Productora audiovisual · registro de funciones especializadas</strong>
   <span>{snapshot.media_studio.total_roles} funciones descritas · {snapshot.media_studio.departments} departamentos · {snapshot.media_studio.specialists} especialistas · {snapshot.media_studio.supervisors} supervisores · {snapshot.media_studio.judges} jueces · {snapshot.media_studio.guardians} guardianes.</span>
   <small>Fuente: jerarquía de Media Studio V2. Solo perfiles diseñados; no son agentes activos comprobados. No se suman al censo de otros sistemas por posibles solapamientos.</small>
  </div>:null}
  <section className="op4-fleet-inspector" aria-label="Inspector de motores no listados">
   <h4>Consultar cualquier motor por ID</h4>
   <p>Busca perfiles declarados aunque el motor no aparezca en las tarjetas. Esta consulta no ejecuta acciones.</p>
   <label htmlFor="op4-inspect-engine">Identificador del motor</label>
   <input id="op4-inspect-engine" aria-label="Identificador del motor a consultar"
    value={inspectTarget} maxLength={32} spellCheck={false} autoComplete="off"
    onChange={event=>setInspectTarget(event.target.value)} placeholder="FACT-001, SEO-001, C360-001"/>
   <p role="status" className="op4-fleet-inspect-answer">
    {result.kind!=='ready'||!snapshot?
      'SIN LECTURA VERIFICADA: '+(result.reason||'SOURCE_UNAVAILABLE')+'. No se infiere ausencia de perfiles.':
      !inspectedIsValid?'Escribe el identificador exacto del motor (por ejemplo, SEO-001 o C360-001).':
      inspectedProfiles.length?
       'ASIGNACIÓN DECLARADA en el registro para '+inspectedEngine+': '+
       inspectedProfiles.map(role=>role.name+' ('+role.id+')').join(', ')+
       '. Son perfiles definidos, NO agentes ejecutándose.':
       'SIN ASIGNACIÓN EN ESTE REGISTRO para '+inspectedEngine+
       '. No demuestra ausencia del motor ni de agentes en otros sistemas.'}
   </p>
   <p className="op4-fleet-note">Fuente: role-agent-registry.v1.json, sólo ámbito Fénix autorizado.
    Ejecución, salud, agentes y subagentes activos: NO VERIFICADOS por este registro.</p>
  </section>
  <section className="op4-fleet-triage" aria-label="Diagnóstico de fallos y prioridades sugeridas">
   <h4>Incidencias y próximos pasos · solo lectura</h4>
   <p>Datos procedentes de muestras recientes de GitHub y conexión a proveedores. Un fallo de workflow no acredita fallo de motor ni de agente.</p>
   {triage.status!=='READY_PARTIAL'?<p role="status">Diagnóstico NO DISPONIBLE: {triage.reason}. No significa que no existan incidencias.</p>:<>
    <p role="status">Último resultado fallido en muestras: {triage.verified_failure_count};
     acciones requeridas: {triage.needs_attention_count};
     proveedores sin diagnóstico: {triage.unavailable_source_count}.
     Priorización orientativa, sin ejecución.</p>
    <div className="op4-fleet-triage-items">
     {triage.items.length?triage.items.slice(0,8).map(item=><article className="op4-fleet-triage-item" key={item.key}>
      <strong>{item.priority} · {item.title}</strong>
      <span>{item.source} · {item.reason} · {date(item.observed_at)}</span>
      <small>{item.next_action}</small>
      <small>Tiempo: {item.eta} · Coste: {item.cost} · Ámbito: {item.scope}</small>
      {item.evidence_url?<a href={item.evidence_url} target="_blank" rel="noreferrer">Ver ejecución GitHub</a>:null}
      {item.kind==='WORKFLOW_FAILURE'&&item.evidence_url?<>
       <button type="button" disabled={inspectingJob!==null} onClick={()=>{void inspectFailedJob(item.key,item.evidence_url!)}}>
        {inspectingJob===item.key?'Analizando paso GitHub…':'Analizar paso fallido (solo lectura)'}
       </button>
       {jobDetails[item.key]&&<div className="op4-fleet-job-evidence" role="status">
        {jobDetails[item.key].kind==='ready'&&jobDetails[item.key].data?<>
         <strong>Job GitHub comprobado: {jobDetails[item.key].data.job_name}</strong>
         <span>{jobDetails[item.key].data.status==='FAILED_STEP_VERIFIED'?
          'Paso fallido: '+jobDetails[item.key].data.failed_step_number+' · '+jobDetails[item.key].data.failed_step_name:
          'Job fallido acreditado; paso concreto NO VERIFICADO.'}</span>
         <small>Origen: metadatos públicos de GitHub Actions. No acredita fallo del motor, del agente ni causa raíz.</small>
         <a href={jobDetails[item.key].data.evidence_url} target="_blank" rel="noreferrer">Ver job en GitHub</a>
        </>:<span>Detalle no disponible: {jobDetails[item.key].reason}. No se conoce el paso ni la causa raíz.</span>}
       </div>}
      </>:null}
     </article>):<p>No se han acreditado incidencias en esta muestra. No significa cero fallos globales.</p>}
    </div>
   </>}
   <p className="op4-fleet-note">P1/P2 son prioridades PROPUESTAS, no cambios de cola. Para intervenir hacen falta contrato del proveedor, política, recibo, comprobación física y rollback.</p>
  </section>
  <div className="op4-fleet-grid">
   <section aria-label="Estado de los conectores">
    <h4>Plataformas y fuentes de verdad</h4>
    {sources.length?sources.map((s,i)=><div className="op4-fleet-source" key={s.repo||s.platform+'-'+i}>
      <span className={s.state==='LIVE'?'op4-ok':'op4-missing'}>{s.state==='LIVE'?'LECTURA REAL':'SIN CONEXIÓN'}</span>
      <div><strong>{s.name||s.platform}</strong>
       <small>{s.repo||s.platform}</small>
       {s.state==='LIVE'?
        <small>{s.observed_sample} ejecuciones recientes examinadas · {s.active_in_sample} en curso · {s.queued_in_sample} en cola · {date(s.observed_at)} (muestra, no censo de agentes)</small>:
        <small>{s.reason||'No se pudo comprobar esta fuente'}. No se interpreta como cero agentes.</small>}
      </div>
     </div>):<p>Las fuentes no están acreditadas en esta sesión.</p>}
   </section>
   <section aria-label="Perfiles especializados registrados">
    <h4>Perfiles especializados del registro</h4>
    <p className="op4-fleet-note">Origen: <code>role-agent-registry.v1.json</code>. Jerarquía, presencia real y asignación a procesos todavía por verificar.</p>
    {roles.length?roles.map(r=><div key={r.id} className="op4-fleet-role">
     <strong>{r.name}</strong><span>{r.id} · {r.department} · {r.environment}</span>
     <small>{r.state} · Runtime: NO VERIFICADO · Superior: {r.reports_to||'sin vínculo acreditado'}</small>
    </div>):<p>Perfiles sin comprobación verificable.</p>}
   </section>
  </div>
  <section className="op4-fleet-job" aria-label="Motor y programación PREPROD desde JOB-001">
   <h4>Estado de motores · controles PREPROD</h4>
   {job?.state==='OK'?<>
    <p>Fuente SQL comprobada: {job.controlRows} controles configurados, {job.enabledControls} habilitados, {job.engineRecords} estados de motor declarados y {job.telemetryRecords} registros de telemetría. Ninguna cifra demuestra ejecución autónoma.</p>
    <p className="op4-fleet-note">Lectura: {date(job.observedAt)} · Preparación/ejecución de motores: NO VERIFICADA · staging suspendida.</p>
    {job.engineBindings.map(engine=>{
     const control=job.controlEngineBindings.find(x=>x.engine_id===engine.engine_id);
     return <div className="op4-fleet-role" key={engine.engine_id}>
      <strong>{engine.engine_id}: {engine.declared_state}</strong>
      <span>{engine.freshness==='STALE_CONFIG'?'Configuración antigua':'Configuración reciente'} · {date(engine.observed_config_at)}</span>
      <small>{control?control.configured_controls+' controles, '+control.enabled_controls+' habilitados':'Sin control asociado en esta lectura'} · Runtime no verificado</small>
     </div>
    })}
   </>:<p>Sin lectura completa de controles PREPROD en este momento ({jobReason}). El estado real no puede deducirse de definiciones históricas.</p>}
  </section>
  <section className="op4-fleet-runs" aria-label="Actividad GitHub actual">
   <h4>Trabajos con ejecución publicada</h4>
   <p className="op4-fleet-note">Estos registros son ejecuciones de GitHub Actions; no se contabilizan como agentes. Actualización automática cada 2 minutos mientras esta pestaña está visible.</p>
   {liveRuns.length?liveRuns.map(r=><div key={r.url} className="op4-fleet-run">
    <div><strong>{r.name}</strong><small>{r.status} · {r.conclusion||'sin resultado'} · {date(r.updated_at)}</small></div>
    <a href={r.url} target="_blank" rel="noreferrer">Evidencia GitHub</a>
   </div>):<p>Sin actividad comprobable en la lectura actual. No significa ausencia global de trabajos.</p>}
  </section>
  <CerebroSocialProviderPanel/>
  <CerebroCloudflareFleetPanel/>
  <CerebroCloudflareQueuesPanel/>
  <CerebroLabWorkerControlPanel/>
  <section className="op4-fleet-control" aria-label="Precomprobación de controles">
   <h4>Control operativo · verificación de capacidad</h4>
   <p><Shield size={14}/> Para pausar, reactivar o cambiar prioridades se necesita una conexión autenticada al ejecutor específico y un recibo del cambio. No basta con modificar una ficha.</p>
   <label htmlFor="op4-engine">Motor exacto</label>
   <input id="op4-engine" value={controlTarget} maxLength={30} onChange={e=>setControlTarget(e.target.value)} placeholder="Ejemplo: SEO-001"/>
   <div className="op4-fleet-actions">
    {['PAUSAR','REACTIVAR','PRIORIZAR'].map(a=><button key={a} type="button" onClick={()=>control(a)}>Comprobar {a.toLowerCase()}</button>)}
   </div>
   {controlStatus?<p role="status" className="op4-fleet-blocked"><AlertTriangle size={16}/>{controlStatus}</p>:null}
   <p className="op4-fleet-note">Control efectivo: PENDIENTE DE CONECTOR. Sin cambios a producción, staging, trabajos ni suscripciones.</p>
  </section>
 </section>;
}
