import {useCallback,useEffect,useRef,useState} from 'react';
import {CircleAlert,CheckCircle2,Clock3,Pause,Play,RefreshCw,RotateCcw,ShieldCheck} from 'lucide-react';
import {
 readOperativaLabControl,sendOperativaLabCommand,sendOperativaConsoleReadOnce,
 type LabControlState,type LabControlReceipt,type LabEngineId,type LabCommand,type LabConsoleReceipt
} from './cerebroOperativaControlsApi';
import './cerebro-operativa-controls-lab.css';

type State={kind:'loading'|'ready'|'unavailable';data:LabControlState|null;reason:string};
const EMPTY:State={kind:'loading',data:null,reason:''};
const NAMES:Record<LabEngineId,string>={
 'QA-001':'QA · Verificación automática','CERT-001':'CERT · Supervisor de certificación'
};
const ERROR:Record<string,string>={
 OWNER_SESSION_REQUIRED:'No hay sesión de propietario verificada.',
 OWNER_DENIED:'La sesión no dispone de permisos de propietario.',
 CRON_CONTRACT_DRIFT:'La programación ha cambiado: operación bloqueada.',
 RATE_LIMIT_60S:'Ya se ha ejecutado recientemente. Revisa el recibo antes de repetir.',
 ULTIMO_SUPERVISOR_PROTEGIDO:'No se puede pausar el último supervisor activo; se mantiene la vigilancia.',
 COMMAND_EXECUTION_FAILED:'La ejecución no se ha podido confirmar.',
 LAB_OPERATOR_UNAVAILABLE:'No se puede verificar el ejecutor LAB.',
 SESION_PROPETARIO_REQUERIDA:'Inicia sesión como propietario.',
 CONTRATO_CONTROL_NO_VERIFICADO:'El estado recibido no cumple el contrato de seguridad.',
};
const explain=(e:unknown)=>ERROR[String(e instanceof Error?e.message:e)]||
 'No se ha confirmado la acción. Comprueba la actividad antes de volver a intentarla.';
export default function CerebroOperativaControlsLab(){
 const [state,setState]=useState<State>(EMPTY);
 const [busy,setBusy]=useState<LabEngineId|'CONSOLE-001'|null>(null);
 const [receipt,setReceipt]=useState<LabControlReceipt|null>(null);
 const [consoleReceipt,setConsoleReceipt]=useState<LabConsoleReceipt|null>(null);
 const [message,setMessage]=useState('');
 const heldRequest=useRef<{engine:LabEngineId;command:LabCommand;id:string}|null>(null);
 const heldConsole=useRef<string|null>(null);
 const active=useRef(true);
 const refresh=useCallback(async(signal?:AbortSignal)=>{
  try{
   const data=await readOperativaLabControl(signal);
   if(active.current)setState({kind:'ready',data,reason:''});
  }catch(e){
   if(!active.current||signal?.aborted)return;
   setState({kind:'unavailable',data:null,reason:explain(e)});
  }
 },[]);
 useEffect(()=>{
  active.current=true;
  const controller=new AbortController();
  void refresh(controller.signal);
  const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void refresh()},20000);
  return()=>{active.current=false;controller.abort();window.clearInterval(timer)};
 },[refresh]);
 async function invoke(engine:LabEngineId,command:LabCommand){
  if(busy||state.kind!=='ready')return;
  const original=heldRequest.current;
  const id=original?.engine===engine&&original?.command===command?
   original.id:crypto.randomUUID();
  heldRequest.current={engine,command,id};
  setBusy(engine);setMessage('Enviando orden a LAB…');
  try{
   const result=await sendOperativaLabCommand(engine,command,id);
   if(!active.current)return;
   heldRequest.current=null;setReceipt(result);
   setMessage(result.status==='ALREADY_APPLIED'?'Orden ya registrada. Sin doble ejecución.':
    result.outcome==='NO_CHANGE'?'Estado ya establecido; no hubo cambios.':
    command==='RUN_ONCE'?'Ejecución real completada y auditada.':
    command==='PAUSE_SCHEDULE'?'Programación detenida y comprobada.':
    'Programación reanudada y comprobada.');
   await refresh();
  }catch(e){if(active.current)setMessage(explain(e))}
  finally{if(active.current)setBusy(null)}
 }
 async function invokeConsole(){
  if(busy||state.kind!=='ready'||!state.data?.console_readonly?.collector_schedules_active)return;
  const id=heldConsole.current??crypto.randomUUID();heldConsole.current=id;
  setBusy('CONSOLE-001');setReceipt(null);setConsoleReceipt(null);
  setMessage('Solicitando lectura pública desde CONSOLE LAB…');
  try{
   const result=await sendOperativaConsoleReadOnce(id);
   if(!active.current)return;
   heldConsole.current=null;setConsoleReceipt(result);
   setMessage(result.status==='ALREADY_QUEUED'?
    'Lectura previamente solicitada. No se ha enviado una segunda vez.':
    'Lectura solicitada y registrada EN COLA. Se comprobará el resultado del recolector.');
   await refresh();
  }catch(e){if(active.current)setMessage(explain(e))}
  finally{if(active.current)setBusy(null)}
 }
 return <section className="opctrl" aria-label="Mandos operativos reales de motores LAB">
  <header className="opctrl-head">
   <div><p className="opctrl-kicker"><ShieldCheck size={15}/> MANDOS REALES · ACCESO DEL PROPIETARIO</p>
    <h3>Control de motores acreditados</h3>
    <p>Control limitado a dos ejecutores de diagnóstico en LAB. Producción, pagos,
     UMS y otros motores no se activan desde estos mandos.</p>
   </div>
   <button type="button" className="opctrl-refresh" onClick={()=>{void refresh()}}
    disabled={busy!==null} aria-label="Actualizar estados de los mandos">
    <RefreshCw size={16}/> Actualizar
   </button>
  </header>
  {state.kind==='unavailable'?<p role="alert" className="opctrl-warning">
    <CircleAlert size={17}/> {state.reason} Los controles permanecen deshabilitados.
   </p>:null}
  <div className="opctrl-grid">
   {(['QA-001','CERT-001'] as const).map(engine=>{
    const data=state.data?.engines.find(x=>x.engine_id===engine);
    const ready=state.kind==='ready'&&!!data&&busy===null;
    return <article key={engine} className="opctrl-engine">
     <div className="opctrl-title"><strong>{NAMES[engine]}</strong>
      <span className={data?.schedule_active?'opctrl-running':'opctrl-paused'}>
       {state.kind==='loading'?'Consultando…':state.kind!=='ready'?'SIN VERIFICAR':
        data?.schedule_active?'PROGRAMADO':'PAUSADO'}
      </span>
     </div>
     <p>ID: <code>{engine}</code> · Cron LAB #{data?.cron_job_id??'—'}</p>
     <div className="opctrl-actions">
      <button type="button" disabled={!ready} onClick={()=>{void invoke(engine,'RUN_ONCE')}}>
       <Play size={16}/> Ejecutar ahora
      </button>
      <button type="button" disabled={!ready} onClick={()=>{void invoke(engine,
       data?.schedule_active?'PAUSE_SCHEDULE':'RESUME_SCHEDULE')}}>
       {data?.schedule_active?<><Pause size={16}/> Pausar</>:
       <><RotateCcw size={16}/> Reanudar</>}
      </button>
     </div>
    </article>;
   })}
  </div>
  <div className="opctrl-grid">
   <article className="opctrl-engine" aria-label="CONSOLE-001 lectura pública controlada">
    <div className="opctrl-title"><strong>CONSOLE · Lectura pública de repositorio</strong>
     <span className={state.data?.console_readonly?.collector_schedules_active?'opctrl-running':'opctrl-paused'}>
      {state.kind==='loading'?'Consultando…':state.kind!=='ready'?'SIN VERIFICAR':
       state.data?.console_readonly?.collector_schedules_active?'PROGRAMADO':'BLOQUEADO'}
     </span>
    </div>
    <p>ID: <code>CONSOLE-001</code> · Solo lectura pública de GitHub, en LAB; no escribe código.</p>
    <div className="opctrl-actions">
     <button type="button" disabled={state.kind!=='ready'||busy!==null||
       !state.data?.console_readonly?.collector_schedules_active} onClick={()=>{void invokeConsole()}}>
      <Play size={16}/> Solicitar lectura
     </button>
    </div>
    {consoleReceipt?<p className="opctrl-proof">Orden CONSOLE registrada: <b>EN COLA</b> ·
     <code>{consoleReceipt.job_id}</code>. Pendiente de respuesta del recolector; no es éxito confirmado.</p>:null}
    {(state.data?.console_readonly?.requests?.length??0)>0?
     <div className="opctrl-audit"><strong>Lecturas ordenadas desde OPERATIVA</strong>
      <ul>{state.data!.console_readonly.requests.slice(0,5).map(x=>
       <li key={x.request_id}><code>{x.job_id}</code> · {x.state} ·
        {x.http_status??'sin HTTP'} · firma almacenada: {x.signed_receipt_present?'sí':'no'}
       </li>)}</ul>
     </div>:null}
   </article>
  </div>
  <div className="opctrl-locked">
   <strong>Otros motores:</strong> FACT-001 y UMS-001 mantienen sus
   permisos actuales. No se muestran botones de ejecución sin contrato verificado.
  </div>
  {message?<p role="status" className="opctrl-result">
    {consoleReceipt?<Clock3 size={17}/>:receipt&&heldRequest.current===null?
     <CheckCircle2 size={17}/>:<CircleAlert size={17}/>} {message}
   </p>:null}
  {receipt?<p className="opctrl-proof">Última orden: {receipt.engine_id} · {receipt.command} ·
    {receipt.outcome} · <code>{receipt.request_id}</code> · LAB</p>:null}
  {state.data?.commands.length?<div className="opctrl-audit">
   <strong>Historial de órdenes acreditadas</strong>
   <ul>{state.data.commands.slice(0,6).map(x=>
    <li key={x.request_id}><code>{x.engine_id}</code> · {x.command} ·
     {x.outcome} · {new Date(x.created_at).toLocaleString('es-ES')}</li>)}</ul>
  </div>:null}
  <p className="opctrl-foot">Chat y voz: HECHO · A MEJORAR. Mandos de producción: no habilitados
   hasta verificar identidad, permisos y reversión en el entorno de producción.</p>
 </section>;
}
