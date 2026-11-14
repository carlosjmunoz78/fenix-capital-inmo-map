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
  try{const r=await captureStagingSuspensionLab();setCaptured(r);if(r.kind==='observed')setResult(r)}
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
   <small>**Aislamiento global: NO CERTIFICADO.** Hostinger y otros consumidores externos siguen sujetos a auditoría independiente.</small>
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
