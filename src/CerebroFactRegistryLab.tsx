import {useEffect,useState} from 'react';
import {readFactRegistryAttestationLab,executeFactRegistryAttestationLab,type FactResult} from './cerebroFactRegistryExecutionLabApi';

/** Owner-LAB only, deterministic FACT attestation with durable receipt.
 * Does not start or publish any of the 179 engine definitions.
 */
export default function CerebroFactRegistryLab(){
 const [latest,setLatest]=useState<FactResult|null>(null);
 const [outcome,setOutcome]=useState<FactResult|null>(null);
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  let mounted=true;
  void readFactRegistryAttestationLab().then(r=>{if(mounted)setLatest(r)});
  return()=>{mounted=false};
 },[]);
 async function attest(){
  if(busy)return;
  setBusy(true);
  try{
   const r=await executeFactRegistryAttestationLab();
   setOutcome(r);if(r.kind==='verified')setLatest(r);
  }finally{setBusy(false)}
 }
 const record=latest?.latest;
 return <div className="op-uni-lab-evidence" aria-label="FACT-001 ejecución determinista de integridad en LAB">
  <strong>FACT-001 · Certificación real del registro (LAB)</strong>
  <span>Valida el registro canónico de 179 definiciones, calcula su huella SHA-256 y guarda un justificante único. No inicia motores, staging ni producción.</span>
  {latest?.kind==='verified'&&record?<small>
   <strong>Última certificación persistida:</strong> {new Date(record.created_at).toLocaleString('es-ES')} ·
   {record.registry_count} definiciones · recibo {record.receipt_id} · SHA-256 {record.registry_digest.slice(0,16)}…
  </small>:<small>{latest?.message||'Consultando la fuente del ejecutor…'}</small>}
  <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
   <button type="button" onClick={()=>{void attest()}} disabled={busy||latest?.kind==='denied'}>
    {busy?'Certificando…':'Ejecutar certificación FACT-001 (LAB)'}
   </button>
   <button type="button" onClick={()=>{void readFactRegistryAttestationLab().then(setLatest)}} disabled={busy}>
    Ver última certificación
   </button>
  </div>
  {outcome?<small role="status">{outcome.message}</small>:null}
  <small><strong>Fábrica FACT-001 validada en CI:</strong> 179 scaffolds y 3.222 archivos verificados sin instalar motores. GitHub Actions genera además un paquete ZIP descargable de LAB <strong>solo después de superar las pruebas de seguridad</strong>, conservado durante siete días. <a href="https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/66" target="_blank" rel="noreferrer noopener">Ver la PR y descargar el artefacto en la última ejecución verde</a>.</small>
  <small>Única ejecución autorizada: FACT-001 / fact.registry.attest · escritura de justificante LAB. Autonomía de los demás motores: NO VERIFICADA.</small>
 </div>;
}
