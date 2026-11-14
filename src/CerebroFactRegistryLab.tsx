import {useEffect,useRef,useState} from 'react';
import {readFactRegistryAttestationLab,executeFactRegistryAttestationLab,type FactResult} from './cerebroFactRegistryExecutionLabApi';

/** Owner-LAB only, deterministic FACT attestation with durable receipt.
 * Does not start or publish any of the 179 engine definitions.
 */
export default function CerebroFactRegistryLab(){
 const [latest,setLatest]=useState<FactResult|null>(null);
 const [outcome,setOutcome]=useState<FactResult|null>(null);
 const [busy,setBusy]=useState(false);
 const acceptanceOnce=useRef(false);
 useEffect(()=>{
  let mounted=true;
  void readFactRegistryAttestationLab().then(r=>{if(mounted)setLatest(r)});
  return()=>{mounted=false};
 },[]);
 // Isolated one-time owner-authorized E2E acceptance in LAB Preview.
 // Consume URL flag BEFORE writing, and use stable idempotency key across retries.
 useEffect(()=>{
  if(acceptanceOnce.current||latest===null)return;
  const url=new URL(window.location.href);
  if(url.searchParams.get('op3_fact_attest_once')!=='owner-accepted-20261114')return;
  acceptanceOnce.current=true;
  url.searchParams.delete('op3_fact_attest_once');
  window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
  setBusy(true);
  void executeFactRegistryAttestationLab('lab-fact-attest-owner-accepted-20261114')
   .then(result=>{setOutcome(result);if(result.kind==='verified')setLatest(result)})
   .finally(()=>setBusy(false));
 },[latest?.kind]);
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
  <small>Única ejecución autorizada: FACT-001 / fact.registry.attest · escritura de justificante LAB. Autonomía de los demás motores: NO VERIFICADA.</small>
 </div>;
}
