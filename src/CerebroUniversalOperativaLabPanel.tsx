import {useCallback,useEffect,useRef,useState} from 'react';
import {canPreviewUniversalOperativa,readUniversalOperativaLab,simulateFactRegistryDryRunLab,type UniversalLabDryRun,type UniversalLabProof} from './cerebroUniversalOperativaLabApi';
import './cerebro-universal-operativa-lab.css';
export default function CerebroUniversalOperativaLabPanel({company}:{company:'fenix'|'all'|'aion'|'captacasa'}){
 const [result,setResult]=useState<UniversalLabProof|null>(null);
 const [loading,setLoading]=useState(false);
 const [dryRun,setDryRun]=useState<UniversalLabDryRun|null>(null);
 const [dryRunning,setDryRunning]=useState(false);
 const qaAuditOnce=useRef(false);
 const enabled=company==='fenix'&&typeof window!=='undefined'&&canPreviewUniversalOperativa(window.location);
 const refresh=useCallback(async(signal?:AbortSignal)=>{
  if(!enabled)return;
  setLoading(true);
  const value=await readUniversalOperativaLab(signal);
  if(!signal?.aborted){setResult(value);setLoading(false);}
 },[enabled]);
 useEffect(()=>{
  if(!enabled)return;
  const controller=new AbortController();
  void refresh(controller.signal);
  return()=>controller.abort();
 },[enabled,refresh]);
 useEffect(()=>{
  if(!enabled||result?.kind!=='ready'||qaAuditOnce.current)return;
  // One owner-requested acceptance check, explicitly isolated LAB preview URL.
  const url=new URL(window.location.href);
  if(url.searchParams.get('op3_audit_once')!=='approved-20261113')return;
  qaAuditOnce.current=true;
  setDryRunning(true);
  void simulateFactRegistryDryRunLab().then(value=>{
   setDryRun(value);
   // Remove the one-time LAB QA marker without a reload, while preserving
   // the persisted audit result visible to its owner in the current tab.
   const clean=new URL(window.location.href);
   if(clean.searchParams.get('op3_audit_once')==='approved-20261113'){
    clean.searchParams.delete('op3_audit_once');
    window.history.replaceState(window.history.state,'',clean.pathname+clean.search+clean.hash);
   }
  }).finally(()=>setDryRunning(false));
 },[enabled,result?.kind]);
 if(!enabled)return null;
 return <section className="op-uni-lab" aria-label="Gateway Universal en ensayo">
  <div className="op-uni-lab-head">
   <div><strong>Gateway Universal · LAB</strong><span>Operativa, sin JARVIS · Solo lectura</span></div>
   <button type="button" onClick={()=>{void refresh()}} disabled={loading} aria-label="Verificar conexión del Gateway Universal">
    {loading?'Comprobando…':'Verificar conexión'}
   </button>
  </div>
  <p className={`op-uni-lab-status ${result?.kind==='denied'?'is-denied':''}`} role="status" aria-live="polite">
   {loading?'Comprobando autorización y contrato FACT-001…':
    result?.kind==='ready'?
     'Conexión de lectura acreditada en LAB. El funcionamiento de los motores en producción sigue sin verificarse.':
    result?.kind==='denied'?`Acceso no autorizado a este contexto de laboratorio (${result.reason||'SIN_CODIGO'}).`:
    result?.kind==='unavailable'?'No hay verificación disponible. La Operativa actual continúa sin cambios.':
    'Preparando verificación de LAB…'}
  </p>
  {result?.kind==='ready'?<div className="op-uni-lab-dryrun">
   <button type="button" disabled={dryRunning} onClick={()=>{setDryRunning(true);void simulateFactRegistryDryRunLab().then(setDryRun).finally(()=>setDryRunning(false))}}>
    {dryRunning?'Validando…':'Simular orden FACT-001 (no ejecutar)'}
   </button>
   <small>Validación LAB sin ejecución. Si se aprueba, se guarda auditoría persistente en PREPROD; producción sigue bloqueada.</small>
   {dryRun?<span role="status">{dryRun.message}</span>:null}
  </div>:null}
  {result?.kind==='ready'?<div className="op-uni-lab-proof">
   <span>Capacidades consultables: <b>{result.capabilities.length}</b></span>
   <span>Definiciones registradas: <b>{result.registeredDefinitions}</b></span>
   <span>Motores operativos: <b>No verificados</b></span>
   <small>Fuente: {result.source}. Esta capacidad solo consulta el registro; NO ejecuta motores.</small>
   <div className="op-uni-lab-work" aria-label="JOB-001 fuente real de configuración PREPROD, solo lectura">
    <strong>JOB-001 · controles existentes (PREPROD)</strong>
    <span>Lectura: {result.job001?.state||'UNAVAILABLE'} · Ejecución: NO VERIFICADA</span>
    {result.job001?.state==='OK'?<>
     <small>Controles: {result.job001.controlRows} configurados, {result.job001.enabledControls} habilitados (no implica que estén corriendo).</small>
     <small>Controles externos: {result.job001.externalControls} · Estados de motores declarados: {result.job001.engineRecords}.</small>
     <small>Telemetría: {result.job001.telemetryRecords} registros · Configuraciones antiguas: {result.job001.staleControls}.</small>
     <small>Fuente: SQL existente PREPROD; no conecta la cola de ejecución ni cambia permisos.</small>
     <div className="op-uni-lab-evidence" aria-label="Invocaciones registradas en el despacho JOB-001">
      <strong>JOB-001 · invocaciones SQL observadas</strong>
      {result.job001.rpc.state==='OK'?<>
       <small>{result.job001.rpc.calls?.toLocaleString('es-ES')} llamadas acumuladas al despacho desde el reinicio de estadísticas ({result.job001.rpc.statsResetAt?.slice(0,10)}).</small>
       <small>Última lectura {result.job001.rpc.observedAt?.slice(0,16).replace('T',' ')} UTC. No mide trabajos completados ni identifica por sí sola el origen Hostinger.</small>
      </>:<small>Estadísticas de invocación no verificables; no se muestran ceros inventados.</small>}
     </div>
     <div className="op-uni-lab-evidence" aria-label="Actividad observada del programador de Supabase">
      <strong>Planificador Supabase PREPROD · actividad registrada</strong>
      {result.job001.cron.state==='OK'?<>
       <small>Programaciones activas verificadas: {result.job001.cron.active}. Comandos pg_cron completados recientemente: {result.job001.cron.recentSuccessful}. No demuestra el funcionamiento de Hostinger ni resultados externos.</small>
       {result.job001.cron.jobs.map(item=><small key={item.job_id}>
        #{item.job_id} · {item.active?'activo':'inactivo'} · {item.last_status} · {item.last_run_at?item.last_run_at.slice(0,16).replace('T',' ')+' UTC':'sin ejecución registrada'} · efecto externo no comprobado
       </small>)}
      </>:<small>Actividad del planificador no comprobable. No se sustituyen resultados ausentes por ceros.</small>}
      <small>Estas cuatro programaciones SQL no equivalen a los veinte controles JOB-001 ni a la ejecución del planificador maestro.</small>
     </div>
     {result.job001.controlEngineBindings.length>0?<div className="op-uni-lab-evidence">
      <strong>Vínculos de control por motor</strong>
      {result.job001.controlEngineBindings.map(record=><small key={record.engine_id}>
       {record.engine_id}: {record.configured_controls} controles configurados, {record.enabled_controls} habilitados, {record.stale_controls} antiguos. Ejecución no verificada.
      </small>)}
     </div>:null}
     {result.job001.engineBindings.length>0?<div className="op-uni-lab-evidence">
      <strong>Estados declarados en PREPROD (históricos)</strong>
      {result.job001.engineBindings.slice(0,6).map(record=><small key={record.engine_id}>
       {record.engine_id}: {record.declared_state} · {record.freshness==='STALE_CONFIG'?'información antigua':'configuración reciente'} · {record.observed_config_at.slice(0,10)}. No acredita ejecución.
      </small>)}
      {result.job001.engineBindings.length>6?<small>Y {result.job001.engineBindings.length-6} estados documentados adicionales (no operativos verificados).</small>:null}
     </div>:null}
    </>:<small>Fuente JOB-001 no comprobable; no se muestran ceros inventados.{result.job001?.reason?` Código: ${result.job001.reason}.`:''}</small>}
   </div>
   <div className="op-uni-lab-work" aria-label="Registro multiempresa y Fábrica FACT-001 mediante Gateway Universal">
    <strong>Registro de empresas y Fábrica · fuentes existentes</strong>
    <span>Conexión: {result.ownerSources?.state||'UNAVAILABLE'} · Registro: {result.ownerSources?.registryState||'UNAVAILABLE'} · FACT GitOps: {result.ownerSources?.factoryState||'UNAVAILABLE'}</span>
    {result.ownerSources?.registryState==='OK'
     ?<small>Registro: {result.ownerSources.companyRecords} empresas, {result.ownerSources.projectRecords} proyectos, {result.ownerSources.engineRecords} motores con fichas en fuente.</small>
     :<small>Registro: sin conteos verificados; no se interpretan como cero registros.</small>}
    {result.ownerSources?.factoryState==='OK'
     ?<small>FACT GitOps: {result.ownerSources.factoryCatalog} definiciones, {result.ownerSources.factoryScaffolds} directorios detectados.</small>
     :<small>FACT GitOps: sin conteos verificados; no se interpretan como cero directorios.</small>}
    <small>Solo metadatos; no prueba runtime, permisos de ejecución ni JOB-001. Fuente del registro: {result.ownerSources?.registrySource||'UNVERIFIED'}.</small>
   </div>
   <div className="op-uni-lab-work" aria-label="Actividad de GitHub Actions mediante Gateway Universal">
    <strong>Trabajos observados · GitHub Actions</strong>
    <span>Fuente: {result.workActivity?.source||'NO CONECTADA'} · {result.workActivity?.state||'UNAVAILABLE'}</span>
    {result.workActivity?.provenance==='PUBLIC_GITHUB_REST_READ_ONLY_FALLBACK'?<small>Lectura directa de GitHub; muestra limitada, sin datos de jobs ni cola.</small>:null}
    {result.workActivity?.observedAt?<small>Última captura: {result.workActivity.observedAt}</small>:null}
    <small>Es una muestra de workflows, NO la cola JOB-001 ni la ejecución de 179 motores.</small>
    {result.workActivity?.rows.map(run=><div key={run.run_id} className="op-uni-lab-work-row">
     <a href={run.html_url} target="_blank" rel="noreferrer">{run.workflow_name||'Workflow #'+run.run_id}</a>
     <small>{run.status} · {run.environment} · {run.engine_id||'Motor no atribuido'}</small>
    </div>)}
    {result.workActivity?.state==='UNAVAILABLE'?<small>Fuente no disponible: sin estimaciones ni estados inventados.</small>:null}
   </div>
  </div>:null}
 </section>;
}
