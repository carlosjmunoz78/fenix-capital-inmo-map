import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const STOROFF_LOCAL_CONTRACT=Object.freeze({
  engine_id:'STOROFF-001',
  environments:['LAB','PREPROD'],
  backend:'LOCAL_FILESYSTEM',
  additional_cost_target_eur:0,
  supabase_write:false,
  prod_write:false,
  trading_access:false,
  atomic_write:true,
  checksum:'sha256',
  tenant_isolation:true
});

function req(v,label){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);return v.trim();}
function safeSegment(v,label){const s=req(v,label);if(!/^[A-Za-z0-9._-]+$/.test(s)||s==='.'||s==='..')throw new Error(`${label} invalid`);return s;}
function contextParts(context={}){
  const company_id=safeSegment(context.company_id,'context.company_id');
  const engine_id=safeSegment(context.engine_id,'context.engine_id');
  const environment=safeSegment(context.environment,'context.environment');
  const version=safeSegment(context.version,'context.version');
  if(!STOROFF_LOCAL_CONTRACT.environments.includes(environment))throw new Error('environment not allowed');
  if(engine_id==='LAB-TRD')throw new Error('Trading access forbidden');
  return {company_id,engine_id,environment,version};
}
function targetPath(root,context,key){
  const c=contextParts(context); const k=safeSegment(key,'key');
  return path.join(root,c.company_id,c.engine_id,c.environment,c.version,`${k}.json`);
}
export function checksum(value){return crypto.createHash('sha256').update(Buffer.from(value)).digest('hex');}

export function putOffloadedJson({root,context,key,value}={}){
  const base=req(root,'root'); const target=targetPath(base,context,key); const dir=path.dirname(target);
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  const payload=JSON.stringify({schema_version:'1.0.0',context:contextParts(context),key:safeSegment(key,'key'),value});
  const digest=checksum(payload); const tmp=`${target}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp,payload,{mode:0o600}); fs.renameSync(tmp,target);
  return Object.freeze({status:'GREEN',engine_id:'STOROFF-001',backend:'LOCAL_FILESYSTEM',path:target,sha256:digest,bytes:Buffer.byteLength(payload),supabase_write:false,prod_write:false,trading_access:false});
}

export function getOffloadedJson({root,context,key}={}){
  const target=targetPath(req(root,'root'),context,key); const raw=fs.readFileSync(target,'utf8');
  return Object.freeze({status:'GREEN',engine_id:'STOROFF-001',backend:'LOCAL_FILESYSTEM',path:target,sha256:checksum(raw),data:JSON.parse(raw),supabase_write:false,prod_write:false,trading_access:false});
}
