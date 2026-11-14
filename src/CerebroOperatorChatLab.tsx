import {useRef,useState,type FormEvent,type KeyboardEvent} from 'react';
import {planOwnerInstructionLab,type OperatorIntent} from './cerebroOperatorChatLabApi';
import {readUniversalOperativaLab,simulateFactRegistryDryRunLab} from './cerebroUniversalOperativaLabApi';
import {readStagingSuspensionLab,captureStagingSuspensionLab} from './cerebroStagingSuspensionLabApi';
import {readFactRegistryAttestationLab,executeFactRegistryAttestationLab} from './cerebroFactRegistryExecutionLabApi';

type Line={id:number;who:'owner'|'cerebro';body:string;receipt?:string};
const HELP='Órdenes disponibles: «estado de motores», «estado del motor SEO-001», «estado de job-001», «estado de staging», «última certificación», «simular FACT-001», «certificar FACT-001» y «certificar suspensión de staging». Solo LAB de Fénix; no ejecuta motores de negocio ni publicación.';
export default function CerebroOperatorChatLab(){
 const [input,setInput]=useState('');
 const [lines,setLines]=useState<Line[]>([{id:0,who:'cerebro',body:'Conectado al Gateway LAB. Soy un intérprete de órdenes verificables, no una IA general. Escribe «ayuda» para consultar acciones disponibles.'}]);
 const [pending,setPending]=useState<{intent:OperatorIntent;label:string}|null>(null);
 const [busy,setBusy]=useState(false);
 const busyRef=useRef(false);
 const count=useRef(0);
 const add=(who:Line['who'],body:string,receipt?:string)=>{
  setLines(list=>[...list,{id:++count.current,who,body,receipt}].slice(-35));
 };
 const execute=async(intent:OperatorIntent)=>{
  try{
   if(intent==='HELP'){add('cerebro',HELP);return;}
   if(intent==='REGISTRY_STATUS'){
    const r=await readUniversalOperativaLab();
    add('cerebro',r.kind==='ready'
     ?'Registro verificado en LAB: '+r.registeredDefinitions+' definiciones. Motores empresariales operativos: NO VERIFICADOS. Fuente: '+r.source+'.'
     :'No he podido verificar el registro: '+r.kind+'. Sin ejecución.');
    return;
   }
   if(intent==='JOB001_STATUS'){
    const r=await readUniversalOperativaLab(),j=r.job001;
    add('cerebro',r.kind==='ready'&&j?.state==='OK'
     ?'JOB-001 PREPROD: '+j.controlRows+' controles, '+j.enabledControls+' habilitados. El resultado procede de controles reales, no certifica ejecución de trabajos. Sin acceso a staging.'
     :'JOB-001 no tiene una lectura actual verificada. No voy a inventar estados.');
    return;
   }
   if(intent==='STAGING_STATUS'){
    const r=await readStagingSuspensionLab(),s=r.snapshot;
    add('cerebro',r.kind==='observed'&&s
     ?'Staging SUSPENDIDA POR EL PROPIETARIO. JOB-001 '+s.staging_job001.paused+'/15 pausados; pg_cron '+s.staging_cron.paused+'/14; funciones SQL '+s.sql_guard.protected+'/4 protegidas. Aislamiento GLOBAL NO CERTIFICADO. No he visitado staging.'
     :'No hay lectura SQL verificada en este momento. La suspensión continúa vigente; no se han ejecutado trabajos.');
    return;
   }
   if(intent==='STAGING_CAPTURE'){
    // Durable PREPROD evidence only. Existing Gateway enforces owner scope,
    // idempotency and negative staging I/O. No staging probe or job dispatch.
    const r=await captureStagingSuspensionLab();
    add('cerebro',r.kind==='observed'&&r.evidence_id
     ?'Evidencia de suspensión registrada en LAB: '+r.evidence_id+'. Controles conocidos: '+(r.snapshot?.known_controls_closed?'bloqueados':'DEGRADADOS')+'. Aislamiento global: NO CERTIFICADO. Sin conexión a staging.'
     :r.message,r.evidence_id);
    return;
   }
   if(intent==='FACT_LATEST'){
    const r=await readFactRegistryAttestationLab(),x=r.latest;
    add('cerebro',r.kind==='verified'&&x
     ?'Última certificación real: '+x.registry_count+' definiciones. Recibo: '+x.receipt_id+'. Registrada: '+new Date(x.created_at).toLocaleString('es-ES')+'. Motores empresariales no iniciados.'
     :r.message,x?.receipt_id);
    return;
   }
   if(intent==='FACT_DRY_RUN'){
    const r=await simulateFactRegistryDryRunLab();
    add('cerebro',r.message);
    return;
   }
   if(intent==='FACT_ATTEST'){
    const r=await executeFactRegistryAttestationLab();
    const x=r.latest;
    add('cerebro',r.kind==='verified'&&x
      ?r.message+' Recibo permanente: '+x.receipt_id+'. '+x.registry_count+' definiciones, sin otros motores, sin staging, sin PROD.'
      :r.message,x?.receipt_id);
    return;
   }
  }catch{add('cerebro','El Gateway no confirmó esta operación. Sin resultado acreditado; consulta el estado antes de repetir.');}
 };
 async function submit(e?:FormEvent<HTMLFormElement>){
  e?.preventDefault();
  if(busyRef.current||pending)return;
  const text=input.trim();
  if(text.length<2||text.length>240)return;
  busyRef.current=true;setBusy(true);setInput('');add('owner',text);
  try{
   const plan=await planOwnerInstructionLab(text);
   if(plan.kind!=='planned'||!plan.intent){add('cerebro',plan.message);return;}
   if(plan.intent==='ENGINE_STATUS'){
    add('cerebro',plan.engineId&&plan.runtime==='NOT_VERIFIED'&&plan.definitionEnvironment==='SCAFFOLD'
     ?'Motor '+plan.engineId+' acreditado en el registro de FACT-001. Estado: SCAFFOLD. Runtime: NO VERIFICADO. No se ha ejecutado el motor ni consultado producción.'
     :'No puedo verificar el estado individual del motor. Ninguna operación ejecutada.');
    return;
   }
   if(plan.requiresConfirmation){
    setPending({intent:plan.intent,label:plan.label});
    add('cerebro','Orden autorizable en LAB: '+plan.label+'. Solo guardará una evidencia permitida en LAB. Confirma explícitamente abajo o cancela; aún NO se ha ejecutado.');
    return;
   }
   await execute(plan.intent);
  }finally{busyRef.current=false;setBusy(false);}
 }
 async function confirm(){
  if(busyRef.current||!pending||!['FACT_ATTEST','STAGING_CAPTURE'].includes(pending.intent))return;
  const intent=pending.intent;
  busyRef.current=true;setBusy(true);setPending(null);
  add('owner',intent==='STAGING_CAPTURE'?'Confirmar registro de suspensión de staging (LAB)':'Confirmar certificación FACT-001 (LAB)');
  try{await execute(intent);}finally{busyRef.current=false;setBusy(false);}
 }
 function cancel(){
  if(busyRef.current)return;
  setPending(null);add('cerebro','Orden cancelada. No se ha ejecutado ninguna certificación.');
 }
 const keydown=(e:KeyboardEvent<HTMLTextAreaElement>)=>{
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void submit();}
 };
 return <section className="op-uni-lab-chat" aria-label="Consola CEREBRO · órdenes de propietario en LAB">
  <div className="op-uni-lab-chat-head">
   <strong>Consola CEREBRO · órdenes reales (LAB)</strong>
   <small>Propietario · Fénix · Gateway Universal · permisos y contratos verificados · sin IA de pago</small>
  </div>
  <div className="op-uni-lab-chat-log" role="log" aria-label="Conversación de Operativa LAB" aria-live="polite" aria-relevant="additions">
   {lines.map(line=><div key={line.id} className={'op-uni-lab-chat-line '+(line.who==='owner'?'is-owner':'is-cerebro')}>
    <strong>{line.who==='owner'?'Tú':'CEREBRO LAB'}</strong>
    <span>{line.body}</span>
   </div>)}
   {busy?<p role="status">Validando con el Gateway…</p>:null}
  </div>
  {pending?<div className="op-uni-lab-chat-pending" aria-label="Confirmación de orden">
   <strong>{pending.label}</strong>
   <small>Confirmación obligatoria · recibo de LAB únicamente. Sin publicación, conexión a staging ni ejecución de motores empresariales.</small>
   <div><button type="button" disabled={busy} onClick={()=>{void confirm()}}>{pending.intent==='STAGING_CAPTURE'?'Guardar evidencia de suspensión':'Confirmar certificación'}</button>
   <button type="button" disabled={busy} onClick={cancel}>Cancelar</button></div>
  </div>:null}
  <form onSubmit={e=>{void submit(e)}} className="op-uni-lab-chat-form">
   <label htmlFor="cerebro-lab-command">Escribe tu orden</label>
   <textarea id="cerebro-lab-command" value={input} onChange={e=>setInput(e.target.value)}
    onKeyDown={keydown} maxLength={240} rows={2} disabled={busy||!!pending}
    placeholder="Ej.: certificar suspensión de staging · estado de motores"/>
   <button type="submit" disabled={busy||!!pending||input.trim().length<2}>Enviar orden</button>
  </form>
  <small>Historial de conversación solo de esta sesión, no persistido. Las certificaciones y simulaciones confirmadas se auditan en PREPROD. No hay control de producción, publicación ni acceso a staging.</small>
 </section>;
}
