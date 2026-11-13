import {useCallback,useEffect,useState} from 'react';
import {canPreviewUniversalOperativa,readUniversalOperativaLab,type UniversalLabProof} from './cerebroUniversalOperativaLabApi';
import './cerebro-universal-operativa-lab.css';
export default function CerebroUniversalOperativaLabPanel({company}:{company:'fenix'|'all'|'aion'|'captacasa'}){
 const [result,setResult]=useState<UniversalLabProof|null>(null);
 const [loading,setLoading]=useState(false);
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
 if(!enabled)return null;
 return <section className="op-uni-lab" aria-label="Gateway Universal en ensayo">
  <div className="op-uni-lab-head">
   <div><strong>Gateway Universal · LAB</strong><span>Operativa, sin JARVIS · Solo lectura</span></div>
   <button type="button" onClick={()=>{void refresh()}} disabled={loading} aria-label="Verificar conexión del Gateway Universal">
    {loading?'Comprobando…':'Verificar conexión'}
   </button>
  </div>
  <p role="status" aria-live="polite">
   {loading?'Comprobando autorización y contrato FACT-001…':
    result?.kind==='ready'?
     'Conexión de lectura acreditada en LAB. El funcionamiento de los motores en producción sigue sin verificarse.':
    result?.kind==='denied'?`Acceso no autorizado a este contexto de laboratorio (${result.reason||'SIN_CODIGO'}).`:
    result?.kind==='unavailable'?'No hay verificación disponible. La Operativa actual continúa sin cambios.':
    'Preparando verificación de LAB…'}
  </p>
  {result?.kind==='ready'?<div className="op-uni-lab-proof">
   <span>Capacidades consultables: <b>{result.capabilities.length}</b></span>
   <span>Definiciones registradas: <b>{result.registeredDefinitions}</b></span>
   <span>Motores operativos: <b>No verificados</b></span>
   <small>Fuente: {result.source}. Esta capacidad solo consulta el registro; NO ejecuta motores.</small>
   <div className="op-uni-lab-work" aria-label="Registro multiempresa y Fábrica FACT-001 mediante Gateway Universal">
    <strong>Registro de empresas y Fábrica · fuentes existentes</strong>
    <span>Conexión: {result.ownerSources?.state||'UNAVAILABLE'} · Registro: {result.ownerSources?.registryState||'UNAVAILABLE'} · FACT GitOps: {result.ownerSources?.factoryState||'UNAVAILABLE'}</span>
    <small>Registro: {result.ownerSources?.companyRecords||0} empresas, {result.ownerSources?.projectRecords||0} proyectos, {result.ownerSources?.engineRecords||0} motores con fichas en fuente.</small>
    <small>FACT GitOps: {result.ownerSources?.factoryCatalog||0} definiciones, {result.ownerSources?.factoryScaffolds||0} directorios detectados.</small>
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
