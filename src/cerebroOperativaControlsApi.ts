import {supabase,SUPABASE_PUBLISHABLE_KEY} from './supabase';
export type LabEngineId='QA-001'|'CERT-001';
export type LabCommand='RUN_ONCE'|'PAUSE_SCHEDULE'|'RESUME_SCHEDULE';
export type LabConsoleControlState={
 status:'OK';source:'CEREBRO_CONSOLE_OPSCTRL_LAB_V1';company_id:'fenix';
 engine_id:'CONSOLE-001';environment:'LAB';version:'1.0.0';
 read_only:true;executed:false;prod_execution_enabled:false;
 collector_schedules_active:true;capability:'PUBLIC_REPO_READ_ONCE_ONLY';
 signed_receipt_cryptographically_verified:false;observed_at:string;
 requests:Array<{request_id:string;job_id:string;state:string;
  created_at:string;completed_at:string|null;http_status:number|null;
  signed_receipt_present:boolean}>;
};
export type LabConsoleReceipt={status:'QUEUED'|'ALREADY_QUEUED';
 company_id:'fenix';engine_id:'CONSOLE-001';environment:'LAB';version:'1.0.0';
 command:'RUN_ONCE';request_id:string;job_id:string;outcome:'QUEUED';
 executed:false;audit_persisted:true;prod_execution_enabled:false};
export type LabControlState={
 status:'OK';source:'CEREBRO_OPERATIVA_OPERATOR_LAB_V1';company_id:'fenix';
 environment:'LAB';prod_execution_enabled:false;read_only:true;executed:false;
 observed_at:string;control_scope:'TWO_LAB_DIAGNOSTIC_ENGINES';
 console_readonly:LabConsoleControlState;
 engines:Array<{engine_id:LabEngineId;cron_job_id:74|77;schedule_active:boolean;
  schedule:string;control_capability:'RUN_ONCE_PAUSE_RESUME_LAB_ONLY'}>;
 commands:Array<{request_id:string;engine_id:LabEngineId;command:LabCommand;
  outcome:'SUCCEEDED'|'NO_CHANGE';job_id:74|77;previous_active:boolean;
  final_active:boolean;created_at:string}>;
};
export type LabControlReceipt={
 status:'APPLIED'|'ALREADY_APPLIED';source?:'CEREBRO_OPERATIVA_OPERATOR_LAB_V1';
 company_id:'fenix';environment:'LAB';prod_execution_enabled:false;executed:boolean;
 engine_id:LabEngineId;command:LabCommand;request_id:string;
 outcome:'SUCCEEDED'|'NO_CHANGE';previous_active:boolean;final_active:boolean;
 result_status:string;audit_persisted?:boolean;
};
const ENDPOINT='/api/cerebro-operativa-controls?company_id=fenix';
const SAFE_HOST=/^fenix-capital-preprod-[a-z0-9]+\.vercel\.app$/;
const ids=new Set(['QA-001','CERT-001']);
const actions=new Set(['RUN_ONCE','PAUSE_SCHEDULE','RESUME_SCHEDULE']);
function assertHost(){
 if(typeof window==='undefined'||!SAFE_HOST.test(window.location.hostname))
  throw Error('CONTROLES_SOLO_LAB_PRIVADO');
}
async function authorization(){
 assertHost();
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)throw Error('SESION_PROPETARIO_REQUERIDA');
 return{authorization:'Bearer '+session.access_token,
  apikey:SUPABASE_PUBLISHABLE_KEY,accept:'application/json'};
}
function validity(x:any):x is LabControlState{
 return x?.status==='OK'&&x?.source==='CEREBRO_OPERATIVA_OPERATOR_LAB_V1'&&
  x.company_id==='fenix'&&x.environment==='LAB'&&x.read_only===true&&
  x.executed===false&&x.prod_execution_enabled===false&&
  x.control_scope==='TWO_LAB_DIAGNOSTIC_ENGINES'&&
  x.console_readonly?.status==='OK'&&
  x.console_readonly?.source==='CEREBRO_CONSOLE_OPSCTRL_LAB_V1'&&
  x.console_readonly?.engine_id==='CONSOLE-001'&&
  x.console_readonly?.company_id==='fenix'&&
  x.console_readonly?.environment==='LAB'&&
  x.console_readonly?.capability==='PUBLIC_REPO_READ_ONCE_ONLY'&&
  x.console_readonly?.read_only===true&&
  x.console_readonly?.executed===false&&
  x.console_readonly?.prod_execution_enabled===false&&
  x.console_readonly?.collector_schedules_active===true&&
  x.console_readonly?.signed_receipt_cryptographically_verified===false&&
  Array.isArray(x.console_readonly?.requests)&&x.console_readonly.requests.length<=10&&
  x.console_readonly.requests.every((r:any)=>typeof r.job_id==='string'&&
   typeof r.request_id==='string'&&
   ['QUEUED','SUCCEEDED','FAILED','NO_RESPONSE'].includes(r.state)&&
   typeof r.signed_receipt_present==='boolean')&&
  Array.isArray(x.engines)&&x.engines.length===2&&
  new Set(x.engines.map((e:any)=>e.engine_id)).size===2&&
  x.engines.every((e:any)=>ids.has(e.engine_id)&&
   e.cron_job_id===(e.engine_id==='QA-001'?74:77)&&
   typeof e.schedule_active==='boolean'&&
   e.control_capability==='RUN_ONCE_PAUSE_RESUME_LAB_ONLY')&&
  Array.isArray(x.commands)&&x.commands.length<=15&&
  x.commands.every((v:any)=>ids.has(v.engine_id)&&actions.has(v.command)&&
   ['SUCCEEDED','NO_CHANGE'].includes(v.outcome)&&
   typeof v.created_at==='string'&&Number.isFinite(Date.parse(v.created_at)))&&
  Number.isFinite(Date.parse(x.observed_at));
}
async function decode(response:Response){
 let x:any=null;
 try{x=await response.json()}catch{throw Error('RESPUESTA_NO_VERIFICABLE')}
 if(!response.ok)throw Error(typeof x.reason==='string'&&x.reason.length<90?x.reason:'SERVIDOR_NO_DISPONIBLE');
 return x;
}
export async function readOperativaLabControl(signal?:AbortSignal):Promise<LabControlState>{
 const headers=await authorization();
 const res=await fetch(ENDPOINT,{method:'GET',headers,cache:'no-store',signal});
 const x=await decode(res);
 if(!validity(x))throw Error('CONTRATO_CONTROL_NO_VERIFICADO');
 return x;
}
export async function sendOperativaLabCommand(engine_id:LabEngineId,command:LabCommand,request_id:string):Promise<LabControlReceipt>{
 if(!ids.has(engine_id)||!actions.has(command)||!/^[0-9a-f-]{36}$/i.test(request_id))
  throw Error('ORDEN_NO_AUTORIZADA');
 const headers=await authorization();
 const res=await fetch(ENDPOINT,{method:'POST',cache:'no-store',
  headers:{...headers,'content-type':'application/json'},
  body:JSON.stringify({company_id:'fenix',environment:'LAB',engine_id,command,request_id})});
 const x=await decode(res);
 if(!['APPLIED','ALREADY_APPLIED'].includes(x?.status)||x?.company_id!=='fenix'||
  x?.environment!=='LAB'||x?.prod_execution_enabled!==false||
  x?.engine_id!==engine_id||x?.command!==command||x?.request_id!==request_id||
  !['SUCCEEDED','NO_CHANGE'].includes(x?.outcome)||
  typeof x?.final_active!=='boolean'||typeof x?.previous_active!=='boolean'||
  typeof x?.executed!=='boolean'||
  (x.status==='APPLIED'&&x.audit_persisted!==true)||
  (x.status==='APPLIED'&&x.executed!==(x.outcome==='SUCCEEDED'))||
  (command==='PAUSE_SCHEDULE'&&x.final_active!==false)||
  (command==='RESUME_SCHEDULE'&&x.final_active!==true))
  throw Error('RECIBO_NO_VERIFICADO');
 return x as LabControlReceipt;
}

export async function sendOperativaConsoleReadOnce(request_id:string):Promise<LabConsoleReceipt>{
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request_id))
  throw Error('ORDEN_NO_AUTORIZADA');
 const headers=await authorization();
 const res=await fetch(ENDPOINT,{method:'POST',cache:'no-store',
  headers:{...headers,'content-type':'application/json'},
  body:JSON.stringify({company_id:'fenix',environment:'LAB',
    engine_id:'CONSOLE-001',command:'RUN_ONCE',request_id})});
 const x=await decode(res);
 if(!['QUEUED','ALREADY_QUEUED'].includes(x?.status)||
  x?.company_id!=='fenix'||x?.environment!=='LAB'||
  x?.engine_id!=='CONSOLE-001'||x?.command!=='RUN_ONCE'||
  x?.request_id!==request_id||x?.outcome!=='QUEUED'||
  x?.executed!==false||x?.prod_execution_enabled!==false||
  x?.audit_persisted!==true||typeof x?.job_id!=='string'||
  !/^[a-f0-9-]{36}$/i.test(x.job_id))
  throw Error('RECIBO_NO_VERIFICADO');
 return x as LabConsoleReceipt;
}
