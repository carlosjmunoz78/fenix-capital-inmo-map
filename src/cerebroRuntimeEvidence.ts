import type {LabWorkerState} from './cerebroLabWorkerControlApi';

/**
 * Runtime proof V0: an authenticated state read proves only a state read.
 * Desired RUNNING never implies autonomous job execution, a heartbeat or an agent.
 */
export type RuntimeProof={
 source:'PREPROD_LAB_WORKER_RPC_V0';company_id:'fenix';environment:'LAB';
 engine_id:'LAB-DEMO-001';runtime_kind:'DETERMINISTIC_MANUAL_LAB_WORKER';
 state:'PAUSED'|'RUNNING';revision:number;priority:number;work_units:number;
 observed_at:string;updated_at:string;last_receipt_id:string|null;
 agent_id:null;subagent_id:null;job_id:null;heartbeat_at:null;
 active_execution_verified:false;autonomous_scheduling:false;
 health:'OBSERVED_STATE_RECENT';cost_eur:'NO_MEDIDO';
};
export type RuntimeProofRead=
 {kind:'ready';proof:RuntimeProof;reason:''}|
 {kind:'unavailable';proof:null;reason:'STATE_NOT_VERIFIED'|'OBSERVATION_STALE'|'OBSERVATION_CLOCK_INVALID'};
const time=(s:string):number=>typeof s==='string'?Date.parse(s):NaN;
export function summarizeLabRuntimeEvidence(state:LabWorkerState|null|undefined,now=Date.now()):RuntimeProofRead{
 if(!state||state.status!=='OK'||state.source!=='PREPROD_LAB_WORKER_RPC_V0'||
  state.company_id!=='fenix'||state.environment!=='LAB'||state.engine_id!=='LAB-DEMO-001'||
  state.version!=='0.1.0'||state.runtime_kind!=='DETERMINISTIC_MANUAL_LAB_WORKER'||
  state.autonomous_scheduling!==false||state.prod_execution_enabled!==false||state.executed!==false||
  !['PAUSED','RUNNING'].includes(state.desired_state)||
  !Number.isSafeInteger(state.revision)||state.revision<1||
  !Number.isSafeInteger(state.priority)||state.priority<1||state.priority>5||
  !Number.isSafeInteger(state.work_units)||state.work_units<0)
  return {kind:'unavailable',proof:null,reason:'STATE_NOT_VERIFIED'};
 const seen=time(state.observed_at),updated=time(state.updated_at);
 if(!Number.isFinite(seen)||!Number.isFinite(updated)||updated>seen+60000||
  seen>now+60000)return {kind:'unavailable',proof:null,reason:'OBSERVATION_CLOCK_INVALID'};
 if(now-seen>300000)return {kind:'unavailable',proof:null,reason:'OBSERVATION_STALE'};
 const receipt=state.last_receipt_id;
 const last_receipt_id=typeof receipt==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(receipt)?receipt:null;
 return {kind:'ready',reason:'',proof:{
  source:'PREPROD_LAB_WORKER_RPC_V0',company_id:'fenix',environment:'LAB',
  engine_id:'LAB-DEMO-001',runtime_kind:'DETERMINISTIC_MANUAL_LAB_WORKER',
  state:state.desired_state,revision:state.revision,priority:state.priority,
  work_units:state.work_units,observed_at:state.observed_at,updated_at:state.updated_at,
  last_receipt_id,agent_id:null,subagent_id:null,job_id:null,heartbeat_at:null,
  active_execution_verified:false,autonomous_scheduling:false,
  health:'OBSERVED_STATE_RECENT',cost_eur:'NO_MEDIDO'
 }};
}
export function describeLabRuntimeEvidence(state:LabWorkerState|null|undefined,now=Date.now()):string{
 const result=summarizeLabRuntimeEvidence(state,now);
 if(result.kind!=='ready')return 'LAB-DEMO-001: lectura de estado no acreditada ('+result.reason+
  '). No se puede concluir si está ejecutando trabajos ni si existe un agente activo.';
 const p=result.proof;
 return 'LAB-DEMO-001 · ESTADO OBSERVADO RECIENTEMENTE: '+p.state+
  ' (estado deseado, no ejecución activa), prioridad '+p.priority+', revisión '+p.revision+
  ', '+p.work_units+' unidades manuales acumuladas. Última lectura '+p.observed_at+
  '. Instancia: worker determinista aislado, empresa Fénix, LAB, versión 0.1.0.'+
  ' agent_id, subagent_id, job_id y heartbeat: NO VERIFICADOS.'+
  ' Ejecución autónoma y trabajo en curso: NO ACREDITADOS. Coste real: NO_MEDIDO.'+
  (p.last_receipt_id?' Último recibo asociado al estado: '+p.last_receipt_id+'.':' Sin último recibo comprobable.');
}
