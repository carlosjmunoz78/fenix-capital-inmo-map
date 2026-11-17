import {supabase,SUPABASE_PUBLISHABLE_KEY} from './supabase';
const HOST=/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/;
const PATH='/api/cerebro-lab-worker-control?company_id=fenix';
export type LabWorkerState={
 status:'OK';source:'PREPROD_LAB_WORKER_RPC_V0';transport:'PREPROD_OWNER_LAB_RUNTIME_V0';
 company_id:'fenix';environment:'LAB';engine_id:'LAB-DEMO-001';version:'0.1.0';
 desired_state:'RUNNING'|'PAUSED';priority:number;revision:number;work_units:number;
 last_receipt_id:string|null;updated_at:string;observed_at:string;
 runtime_kind:'DETERMINISTIC_MANUAL_LAB_WORKER';autonomous_scheduling:false;prod_execution_enabled:false;executed:false;
};
export type LabWorkerAction='PAUSE'|'RESUME'|'PRIORITIZE'|'TICK';
export type LabWorkerReceipt={
 status:'APPLIED'|'REPLAY';source:'PREPROD_LAB_WORKER_RPC_V0';transport:'PREPROD_OWNER_LAB_RUNTIME_V0';
 company_id:'fenix';environment:'LAB';engine_id:'LAB-DEMO-001';
 before:{desired_state:'PAUSED'|'RUNNING';priority:number;revision:number;work_units:number};
 after:{desired_state:'PAUSED'|'RUNNING';priority:number;revision:number;work_units:number};
 receipt_id:string;executed:boolean;executed_work_units:0|1;
 prod_execution_enabled:false;external_actions_executed:false;autonomous_scheduling:false;additional_cost_eur:0;
};
export type LabWorkerResponse<T>={kind:'ready'|'denied'|'unavailable'|'conflict';data:T|null;reason:string};
function obj(x:unknown):x is Record<string,unknown>{return!!x&&typeof x==='object'&&!Array.isArray(x)}
function validState(raw:unknown):raw is LabWorkerState{
 if(!obj(raw))return false;
 return raw.status==='OK'&&raw.source==='PREPROD_LAB_WORKER_RPC_V0'&&
  raw.transport==='PREPROD_OWNER_LAB_RUNTIME_V0'&&raw.company_id==='fenix'&&
  raw.environment==='LAB'&&raw.engine_id==='LAB-DEMO-001'&&raw.version==='0.1.0'&&
  ['PAUSED','RUNNING'].includes(String(raw.desired_state))&&
  Number.isSafeInteger(raw.revision)&&Number(raw.revision)>0&&
  Number.isSafeInteger(raw.priority)&&Number(raw.priority)>=1&&Number(raw.priority)<=5&&
  Number.isSafeInteger(raw.work_units)&&Number(raw.work_units)>=0&&
  raw.autonomous_scheduling===false&&raw.prod_execution_enabled===false&&raw.executed===false;
}
function validReceipt(raw:unknown):raw is LabWorkerReceipt{
 if(!obj(raw)||!obj(raw.before)||!obj(raw.after))return false;
 return ['APPLIED','REPLAY'].includes(String(raw.status))&&
  raw.source==='PREPROD_LAB_WORKER_RPC_V0'&&
  raw.transport==='PREPROD_OWNER_LAB_RUNTIME_V0'&&raw.company_id==='fenix'&&
  raw.environment==='LAB'&&raw.engine_id==='LAB-DEMO-001'&&
  raw.prod_execution_enabled===false&&raw.external_actions_executed===false&&
  raw.autonomous_scheduling===false&&raw.additional_cost_eur===0&&
  typeof raw.receipt_id==='string'&&/^[0-9a-f-]{36}$/.test(raw.receipt_id)&&
  Number.isSafeInteger(raw.after.revision)&&Number.isSafeInteger(raw.before.revision)&&
  Number(raw.after.revision)===Number(raw.before.revision)+1&&
  Number.isSafeInteger(raw.after.work_units)&&Number.isSafeInteger(raw.before.work_units)&&
  (raw.executed_work_units===0||raw.executed_work_units===1)&&
  (raw.status==='APPLIED'?raw.executed===true:raw.executed===false);
}
async function headers(){
 if(typeof window==='undefined'||!HOST.test(window.location.hostname)||
  new URLSearchParams(window.location.search).get('visual_lab')!=='cockpit-v3')return null;
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return null;
 return{authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,'content-type':'application/json'};
}
export async function readLabWorkerState(signal?:AbortSignal):Promise<LabWorkerResponse<LabWorkerState>>{
 const h=await headers();
 if(!h)return{kind:'denied',data:null,reason:'OWNER_AUTH_REQUIRED'};
 try{
  const r=await fetch(PATH,{method:'GET',cache:'no-store',headers:h,signal});
  if(r.status===401||r.status===403)return{kind:'denied',data:null,reason:'OWNER_DENIED'};
  if(r.status!==200)return{kind:'unavailable',data:null,reason:'LAB_STATE_HTTP_'+r.status};
  const v:unknown=await r.json();
  return validState(v)?{kind:'ready',data:v,reason:''}:{kind:'unavailable',data:null,reason:'STATE_NOT_VERIFIED'};
 }catch{return{kind:'unavailable',data:null,reason:'LAB_STATE_NETWORK_UNAVAILABLE'}}
}
export async function applyLabWorkerAction(input:{action:LabWorkerAction;priority:number|null;expected_revision:number;idempotency_key:string}):Promise<LabWorkerResponse<LabWorkerReceipt>>{
 const h=await headers();
 if(!h)return{kind:'denied',data:null,reason:'OWNER_AUTH_REQUIRED'};
 if(!['PAUSE','RESUME','PRIORITIZE','TICK'].includes(input.action)||!
  Number.isSafeInteger(input.expected_revision)||input.expected_revision<1||
  !/^labctrl-[a-z0-9-]{20,60}$/.test(input.idempotency_key)||
  (input.action==='PRIORITIZE'?input.priority===null||input.priority<1||input.priority>5||!Number.isSafeInteger(input.priority):input.priority!==null))
  return{kind:'denied',data:null,reason:'INVALID_CONTROL_ENVELOPE'};
 try{
  const r=await fetch(PATH,{method:'POST',cache:'no-store',headers:h,body:JSON.stringify({
   company_id:'fenix',environment:'LAB',engine_id:'LAB-DEMO-001',version:'0.1.0',...input
  })});
  if(r.status===409)return{kind:'conflict',data:null,reason:'REVISION_OR_IDEMPOTENCY_CONFLICT'};
  if(r.status===401||r.status===403)return{kind:'denied',data:null,reason:'CONTROL_DENIED'};
  if(r.status!==200)return{kind:'unavailable',data:null,reason:'CONTROL_HTTP_'+r.status};
  const v:unknown=await r.json();
  return validReceipt(v)?{kind:'ready',data:v,reason:''}:{kind:'unavailable',data:null,reason:'RECEIPT_NOT_VERIFIED'};
 }catch{return{kind:'unavailable',data:null,reason:'CONTROL_NETWORK_UNKNOWN_CHECK_RECEIPTS'}}
}
