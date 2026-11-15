import {useCallback,useEffect,useState} from 'react';
import {readLabWorkerState,applyLabWorkerAction,type LabWorkerAction,type LabWorkerState,type LabWorkerReceipt} from './cerebroLabWorkerControlApi';

const ACTIONS:{action:LabWorkerAction;label:string}[]=[
 {action:'PAUSE',label:'Pausar LAB'}, {action:'RESUME',label:'Reanudar LAB'},
 {action:'PRIORITIZE',label:'Cambiar prioridad LAB'}, {action:'TICK',label:'Ejecutar 1 paso LAB'}];
const initial='Sin lectura del worker LAB todavía';
const mkKey=()=> 'labctrl-'+crypto.randomUUID();
export default function CerebroLabWorkerControlPanel(){
 const[state,setState]=useState<LabWorkerState|null>(null);
 const[loading,setLoading]=useState(false);
 const[message,setMessage]=useState(initial);
 const[priority,setPriority]=useState(3);
 const[pending,setPending]=useState<LabWorkerAction|null>(null);
 const[receipt,setReceipt]=useState<LabWorkerReceipt|null>(null);
 const[verified,setVerified]=useState(false);
 const refresh=useCallback(async()=>{
  setLoading(true);
  const r=await readLabWorkerState();
  setLoading(false);
  if(r.kind==='ready'&&r.data){
   setState(r.data);setPriority(r.data.priority);
   setMessage('Lectura nueva acreditada: revisión '+r.data.revision+' · '+r.data.desired_state+' · '+r.data.observed_at);
  }else{setState(null);setVerified(false);setMessage('Lectura no acreditada: '+r.reason)}
 },[]);
 useEffect(()=>{void refresh()},[refresh]);
 async function confirm(){
  if(!pending||!state||loading)return;
  const action=pending;
  setPending(null);setLoading(true);setReceipt(null);setVerified(false);
  const proposed={action,priority:action==='PRIORITIZE'?priority:null,
   expected_revision:state.revision,idempotency_key:mkKey()};
  const r=await applyLabWorkerAction(proposed);
  if(r.kind!=='ready'||!r.data){
   setMessage('No hay recibo válido ('+r.reason+'). No repitas la operación sin comprobar el estado.');
   setLoading(false);return;
  }
  setReceipt(r.data);
  // Always read the state after a confirmed write. A receipt by itself is not a verified outcome.
  const check=await readLabWorkerState();
  setLoading(false);
  if(check.kind!=='ready'||!check.data){
   setState(null);setMessage('Recibo recibido, pero read-back NO VERIFICADO. ID '+r.data.receipt_id);
   return;
  }
  setState(check.data);setPriority(check.data.priority);
  const after=r.data.after;
  const matches=check.data.revision===after.revision&&check.data.desired_state===after.desired_state&&
   check.data.priority===after.priority&&check.data.work_units===after.work_units&&
   check.data.last_receipt_id===r.data.receipt_id;
  setVerified(matches);
  setMessage(matches?
   'CONTROL LAB VERIFICADO: '+action+' · '+after.desired_state+' · revisión '+after.revision+
   ' · trabajo completado por el paso: '+r.data.executed_work_units+
   ' · recibo '+r.data.receipt_id:
   'Recibo disponible, pero estado leído no coincide; requiere revisión. ID '+r.data.receipt_id);
 }
 return <section className="op4-lab-actuator" aria-label="Control real del trabajador determinista aislado LAB">
  <h4>Primer ejecutor de control REAL · LAB-DEMO-001</h4>
  <p>Worker determinista, aislado y manual. Solo prueba el control de su propio contador; NO controla SEO, Social ni ejecuta trabajos empresariales.</p>
  <div className="op4-lab-actual">
   <strong>Estado observado: {state?.desired_state||'SIN VERIFICAR'}</strong>
   <span>Revisión: {state?.revision??'—'} · Prioridad: {state?.priority??'—'} · Pasos terminados: {state?.work_units??'—'}</span>
   <small>Última comprobación: {state?.observed_at||'sin lectura'} · Programación autónoma: NO</small>
   <small>Último recibo persistente: {state?.last_receipt_id||'sin operaciones registradas'} · Estado final verificado por lectura directa</small>
  </div>
  <div className="op4-lab-actions">
   <button type="button" disabled={loading} onClick={()=>{void refresh()}}>{loading?'Consultando…':'Comprobar estado ahora'}</button>
   <label>Prioridad de LAB <select aria-label="Prioridad del worker LAB" value={priority}
    disabled={!state||loading||!!pending} onChange={event=>setPriority(Number(event.target.value))}>
    {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}
   </select></label>
   <div className="op4-fleet-actions">
    {ACTIONS.map(({action,label})=><button type="button" key={action}
     disabled={!state||loading||!!pending} onClick={()=>setPending(action)}>{label}</button>)}
   </div>
  </div>
  {pending&&state?<div className="op4-lab-confirm" aria-label="Confirmación exacta del control LAB">
   <p>¿Confirmas {pending} de <strong>LAB-DEMO-001</strong> en <strong>LAB</strong> con revisión esperada <strong>{state.revision}</strong>{pending==='PRIORITIZE'?' y prioridad '+priority:''}? No modifica otros servicios.</p>
   <button type="button" disabled={loading} onClick={()=>{void confirm()}}>Confirmar una vez</button>
   <button type="button" disabled={loading} onClick={()=>setPending(null)}>Cancelar</button>
  </div>:null}
  <p className={verified?'op4-lab-success':'op4-lab-result'} role="status">{message}</p>
  {receipt?<p className="op4-fleet-note">Recibo durable: <code>{receipt.receipt_id}</code>.
    Estado anterior {receipt.before.desired_state}, revisión {receipt.before.revision};
    posterior {receipt.after.desired_state}, revisión {receipt.after.revision}.
    {verified?' Lectura física coincidente.':' Verificación pendiente.'}</p>:null}
 </section>;
}
