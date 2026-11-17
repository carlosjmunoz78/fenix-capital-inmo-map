import {useEffect,useState} from 'react';
import {readStagingSuspensionLab,captureStagingSuspensionLab,type StagingLiveResult} from './cerebroStagingSuspensionLabApi';

/** Isolated, owner-only LAB widget. Does not probe staging or control schedulers. */
export default function CerebroStagingSuspensionLab(){
 const [result,setResult]=useState<StagingLiveResult|null>(null);
 const [busy,setBusy]=useState(false);
 const [captureBusy,setCaptureBusy]=useState(false);
 const [captured,setCaptured]=useState<StagingLiveResult|null>(null);
 useEffect(()=>{let mounted=true;
  void readStagingSuspensionLab().then(r=>{if(mounted)setResult(r)});
  return()=>{mounted=false};
 },[]);
 async function refresh(){
  if(busy||captureBusy)return;
  setBusy(true);
  try{setResult(await readStagingSuspensionLab())}finally{setBusy(false)}
 }
 async function capture(){
  if(captureBusy||busy||result?.kind!=='observed')return;
  setCaptureBusy(true);
  try{const r=await captureStagingSuspensionLab();setCaptured(r);if(r.kind==='observed'){
   const latest=await readStagingSuspensionLab();setResult(latest.kind==='observed'?latest:r)
  }}
  finally{setCaptureBusy(false)}
 }
 const s=result?.snapshot;
 return <div className="op-uni-lab-evidence" aria-label="Suspensión de staging: verificación actual en PREPROD">
  <strong>Suspensión de staging · evidencia en vivo</strong>
  <span role="status">{!result?'Cargando lectura actual…':
   result.kind==='observed'?(s?.known_controls_closed?'Protecciones conocidas verificadas.':'Protecciones conocidas degradadas; intervención técnica pendiente.'):
   'No se dispone de una lectura verificada. Staging permanece suspendido.'}</span>
  {s?<>
   <small>JOB-001: {s.staging_job001.paused}/{s.staging_job001.expected} pausados ·
     cron: {s.staging_cron.paused}/{s.staging_cron.expected} pausados ·
     funciones SQL: {s.sql_guard.protected}/{s.sql_guard.expected} protegidas.</small>
   <small>Controles generales JOB-001: {s.gateway_job001.active} activos, {s.gateway_job001.paused} pausados (de {s.gateway_job001.total}).</small>
   <small>Último registro del puente: {s.bridge_health.last_recorded_at?new Date(s.bridge_health.last_recorded_at).toLocaleString('es-ES'):'sin datos'}.
     Lectura: {new Date(s.observed_at).toLocaleString('es-ES')}.</small>
   {s.edge_backups?<small>Recuperación protegida: <strong>{s.edge_backups.source_snapshots} snapshots Edge</strong> y {s.edge_backups.sql_source_snapshots} snapshots SQL. Es respaldo de fuentes, no prueba de actividad de las Edge.</small>:null}
   {s.durable_evidence?<small><strong>Evidencias persistidas en LAB: {s.durable_evidence.recorded}.</strong>
    {s.durable_evidence.latest_evidence_id?' Última: '+s.durable_evidence.latest_evidence_id:''}
    {s.durable_evidence.last_recorded_at?' · '+new Date(s.durable_evidence.last_recorded_at).toLocaleString('es-ES'):''}
   </small>:<small>Historial durable de evidencias aún no verificado.</small>}
   <small><strong>Verificación técnica adicional del 14/11/2026:</strong> 94 Edge protegidas en inventario original + 3 Edge de rutas antiguas revisadas por separado; 11 funciones SQL heredadas adicionales bloqueadas, con originales respaldados y 11 pruebas sin efectos. Este dato procede de la auditoría de código y PREPROD, no de una consulta de estas rutas desde el navegador. <a href="https://github.com/carlosjmunoz78/fenix-capital-inmo-map/blob/cerebro/universal-control-plane-lab-v0-20261113/cerebro/universal/v0/staging-suspension/STATE_2026-11-14.md" target="_blank" rel="noopener noreferrer">Ver pruebas y recuperación</a>.</small>
   <small><strong>Hostinger · evidencia manual (14/11/2026):</strong> cuatro cron canary que contactaban staging retirados; cron maestro conservado; fichero job001_enabled_jobs.json reducido a los cinco IDs 2, 6, 12, 17 y 19, confirmado tras reabrirlo. <a href="https://github.com/carlosjmunoz78/fenix-capital-inmo-map/blob/cerebro/universal-control-plane-lab-v0-20261113/cerebro/universal/v0/staging-suspension/HOSTINGER_CRON_INVENTORY_2026-11-14.md" target="_blank" rel="noopener noreferrer">Ver inventario y recuperación</a>. Esta es una comprobación manual histórica, no una lectura en vivo de Hostinger.</small>
   <small><strong>Aislamiento global: NO CERTIFICADO.</strong> Los controles actuales de Supabase están verificados en vivo; posibles consumidores externos no inventariados siguen pendientes de una auditoría independiente.</small>
  </>:<small>{result?.message||'Sin datos de control verificados.'}</small>}
  <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
   <button type="button" disabled={busy||captureBusy} onClick={()=>{void refresh()}}>
    {busy?'Comprobando…':'Actualizar estado real'}
   </button>
   <button type="button" disabled={busy||captureBusy||result?.kind!=='observed'} onClick={()=>{void capture()}}>
    {captureBusy?'Registrando…':'Guardar evidencia LAB'}
   </button>
  </div>
  {captured?<small role="status">{captured.message}
   {captured.evidence_id?' Referencia: '+captured.evidence_id:''}
  </small>:null}
  <small>Solo consulta de Supabase y registro de evidencia, sin ejecutar trabajos ni acceder a staging.</small>
 </div>;
}
