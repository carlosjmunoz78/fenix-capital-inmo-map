import fs from 'node:fs';
import path from 'node:path';

export const DBOFF_LOCAL_CONTRACT=Object.freeze({
  engine_id:'DBOFF-001',
  environments:['LAB','PREPROD'],
  backend:'LOCAL_JSONL',
  additional_cost_target_eur:0,
  supabase_write:false,
  prod_write:false,
  trading_access:false,
  append_only:true,
  tenant_isolation:true,
  idempotent_record_id:true
});

function req(v,label){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);return v.trim();}
function seg(v,label){const s=req(v,label);if(!/^[A-Za-z0-9._-]+$/.test(s)||s==='.'||s==='..')throw new Error(`${label} invalid`);return s;}
function scope(context={}){
  const company_id=seg(context.company_id,'context.company_id');
  const engine_id=seg(context.engine_id,'context.engine_id');
  const environment=seg(context.environment,'context.environment');
  const version=seg(context.version,'context.version');
  if(!DBOFF_LOCAL_CONTRACT.environments.includes(environment))throw new Error('environment not allowed');
  if(engine_id==='LAB-TRD')throw new Error('Trading access forbidden');
  return {company_id,engine_id,environment,version};
}
function collectionPath(root,context,collection){
  const c=scope(context); const col=seg(collection,'collection');
  return path.join(req(root,'root'),c.company_id,c.engine_id,c.environment,c.version,`${col}.jsonl`);
}
function readLines(file){if(!fs.existsSync(file))return [];return fs.readFileSync(file,'utf8').split(/\r?\n/).filter(Boolean).map(x=>JSON.parse(x));}

export function appendOffloadedRecord({root,context,collection,record_id,type='generic',payload,created_at=new Date().toISOString()}={}){
  const rid=seg(record_id,'record_id'); const t=seg(type,'type'); const file=collectionPath(root,context,collection);
  const existing=readLines(file).find(r=>r.record_id===rid);
  if(existing)return Object.freeze({status:'GREEN',engine_id:'DBOFF-001',idempotent_replay:true,record:existing,supabase_write:false,prod_write:false,trading_access:false});
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  const record=Object.freeze({schema_version:'1.0.0',context:scope(context),collection:seg(collection,'collection'),record_id:rid,type:t,created_at:String(created_at),payload});
  fs.appendFileSync(file,`${JSON.stringify(record)}\n`,{mode:0o600});
  fs.chmodSync(file,0o600);
  return Object.freeze({status:'GREEN',engine_id:'DBOFF-001',idempotent_replay:false,record,supabase_write:false,prod_write:false,trading_access:false});
}

export function queryOffloadedRecords({root,context,collection,type,limit=100}={}){
  const file=collectionPath(root,context,collection); const n=Number(limit);
  if(!Number.isInteger(n)||n<1||n>1000)throw new Error('limit invalid');
  let rows=readLines(file); if(type!==undefined){const t=seg(type,'type');rows=rows.filter(r=>r.type===t);}
  return Object.freeze({status:'GREEN',engine_id:'DBOFF-001',records:Object.freeze(rows.slice(-n)),count:Math.min(rows.length,n),supabase_write:false,prod_write:false,trading_access:false});
}
