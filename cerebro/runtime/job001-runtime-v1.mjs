import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PREPROD='PREPROD';
const now=()=>new Date().toISOString();
const clone=v=>JSON.parse(JSON.stringify(v));
const id=()=>`job-${crypto.randomUUID()}`;
function required(v,n){if(typeof v!=='string'||!v.trim())throw new TypeError(`${n} required`);return v.trim();}
function atomicWrite(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.${process.pid}.tmp`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+'\n','utf8');fs.renameSync(tmp,file);}
function normalizeContext({companyId,company_id,engineId,engine_id,environment=PREPROD,version='v1'}={}){const out={company_id:required(companyId||company_id,'company_id'),engine_id:required(engineId||engine_id||'JOB-001','engine_id'),environment:required(environment,'environment'),version:required(version,'version')};if(out.environment!==PREPROD)throw new Error('JOB001_PREPROD_ONLY');if(/trading/i.test(out.engine_id))throw new Error('JOB001_TRADING_DENIED');return out;}

export class JobRuntimeV1{
  constructor({ledgerFile=process.env.CEREBRO_JOB001_LEDGER_FILE||'cerebro/jarvis/mission-001/runtime/job001-ledger.v1.json'}={}){this.file=path.resolve(ledgerFile);this.state=this.#read();}
  #read(){if(!fs.existsSync(this.file))return{schema_version:'1.0',state_type:'JOB001_DURABLE_LEDGER',environment:PREPROD,updated_at:now(),jobs:[]};const x=JSON.parse(fs.readFileSync(this.file,'utf8'));if(x.environment!==PREPROD||!Array.isArray(x.jobs))throw new Error('JOB001_LEDGER_INVALID');return x;}
  #save(){this.state.updated_at=now();atomicWrite(this.file,this.state);}
  #reap(){const t=Date.now();let changed=false;for(const j of this.state.jobs){if(['LEASED','HEARTBEATING','RUNNING'].includes(j.status)&&j.lease_expires_at&&Date.parse(j.lease_expires_at)<=t){j.status='RETRY_WAIT';j.worker_id=null;j.lease_token=null;j.lease_expires_at=null;j.updated_at=now();changed=true;}}if(changed)this.#save();}
  enqueue({jobId=null,name,companyId,engineId='ORCH-001',environment=PREPROD,version='MISSION-JARVIS-001',payload={},idempotencyKey,maxAttempts=3}={}){const c=normalizeContext({companyId,engineId,environment,version});const key=required(idempotencyKey,'idempotencyKey');const existing=this.state.jobs.find(j=>j.idempotency_key===key);if(existing)return clone(existing);const job={job_id:jobId||id(),name:required(name,'name'),...c,payload:clone(payload),idempotency_key:key,max_attempts:Math.max(1,Math.min(10,Number(maxAttempts)||3)),attempts:0,status:'QUEUED',worker_id:null,lease_token:null,lease_expires_at:null,result:null,error:null,created_at:now(),updated_at:now()};this.state.jobs.push(job);this.#save();return clone(job);}
  listJobs({companyId=null,company_id=null,environment=null,engineId=null,engine_id=null}={}){this.#reap();return this.state.jobs.filter(j=>(!companyId&&!company_id||j.company_id===(companyId||company_id))&&(!environment||j.environment===environment)&&(!engineId&&!engine_id||j.engine_id===(engineId||engine_id))).map(clone);}
  listForContext(context={}){const c=normalizeContext(context);return this.state.jobs.filter(j=>j.company_id===c.company_id&&j.engine_id===c.engine_id&&j.environment===c.environment&&j.version===c.version).map(clone);}
  getJob(jobId){this.#reap();const j=this.state.jobs.find(x=>x.job_id===jobId);return j?clone(j):null;}
  leaseJob({workerId,leaseSeconds=420,companyId='zeus',environment=PREPROD,engineId='ORCH-001'}={}){this.#reap();required(workerId,'workerId');normalizeContext({companyId,environment,engineId});const j=this.state.jobs.find(x=>x.company_id===companyId&&x.environment===environment&&x.engine_id===engineId&&['QUEUED','RETRY_WAIT'].includes(x.status));if(!j)return null;j.attempts+=1;j.status='LEASED';j.worker_id=workerId;j.lease_token=crypto.randomUUID();j.lease_expires_at=new Date(Date.now()+Math.max(30,Math.min(900,Number(leaseSeconds)||420))*1000).toISOString();j.updated_at=now();this.#save();return clone(j);}
  heartbeatJob({jobId,workerId,leaseSeconds=420}={}){const j=this.state.jobs.find(x=>x.job_id===jobId);if(!j)throw new Error('JOB_NOT_FOUND');if(j.worker_id!==workerId||!['LEASED','HEARTBEATING','RUNNING'].includes(j.status))throw new Error('LEASE_OWNERSHIP_REQUIRED');j.status='HEARTBEATING';j.lease_expires_at=new Date(Date.now()+Math.max(30,Math.min(900,Number(leaseSeconds)||420))*1000).toISOString();j.updated_at=now();this.#save();return clone(j);}
  completeJob({jobId,workerId,result}={}){const j=this.state.jobs.find(x=>x.job_id===jobId);if(!j)throw new Error('JOB_NOT_FOUND');if(j.worker_id!==workerId||!['LEASED','HEARTBEATING','RUNNING'].includes(j.status))throw new Error('LEASE_OWNERSHIP_REQUIRED');j.status='SUCCEEDED';j.result=clone(result);j.error=null;j.lease_expires_at=null;j.updated_at=now();this.#save();return clone(j);}
  failJob({jobId,workerId,error,terminal=false}={}){const j=this.state.jobs.find(x=>x.job_id===jobId);if(!j)throw new Error('JOB_NOT_FOUND');if(j.worker_id!==workerId)throw new Error('LEASE_OWNERSHIP_REQUIRED');j.error=String(error?.message||error||'UNKNOWN_ERROR');j.lease_expires_at=null;j.updated_at=now();j.status=terminal||j.attempts>=j.max_attempts?'DEAD_LETTER':'RETRY_WAIT';this.#save();return clone(j);}
  summary(){this.#reap();const status={};for(const j of this.state.jobs)status[j.status]=(status[j.status]||0)+1;return{schema_version:'1.0',environment:PREPROD,total:this.state.jobs.length,status,ledger_file:this.file};}
}

export function getJobRuntimeV1(options={}){return new JobRuntimeV1(options);}
