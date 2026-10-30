import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REGISTRY=path.resolve(HERE,'../../registry/engine-registry.seed.json');
const DEFAULT_AUDIT=path.resolve(HERE,'../mission-001/engine-evidence-audit.v1.json');

function loadAudit(audit_path){
 try{
  const x=JSON.parse(fs.readFileSync(audit_path,'utf8'));
  if(!Array.isArray(x.items)||x.audited_engine_count!==x.items.length)return null;
  return x;
 }catch{return null;}
}

export function loadEngineRegistryCapabilities({registry_path=DEFAULT_REGISTRY,audit_path=DEFAULT_AUDIT,exclude=[]}={}){
 const raw=JSON.parse(fs.readFileSync(registry_path,'utf8'));
 if(!Array.isArray(raw.engine_ids)||raw.engine_ids.length!==raw.count)throw new Error('ENGINE_REGISTRY_COUNT_MISMATCH');
 if(new Set(raw.engine_ids).size!==raw.engine_ids.length)throw new Error('ENGINE_REGISTRY_DUPLICATE_ID');
 const audit=loadAudit(audit_path);const byId=new Map((audit?.items||[]).map(x=>[x.engine_id,x]));
 const skip=new Set(exclude);
 return raw.engine_ids.filter(id=>!skip.has(id)).map(engine_id=>{
   const evidence=byId.get(engine_id)||null;
   return Object.freeze({
     capability_id:engine_id,
     version:raw.defaults?.version||'0.1.0',
     environments:['LAB','PREPROD'],
     company_scope:raw.defaults?.company_scope||'GLOBAL_OR_SCOPED',
     evidence_state:evidence?.evidence_state||raw.defaults?.evidence_state||'UNKNOWN_REQUIRES_AUDIT',
     evidence_refs:Object.freeze([...(evidence?.evidence_refs||[])]),
     evidence_count:Number(evidence?.evidence_count||0),
     source_status:raw.defaults?.source_status||'UNKNOWN_REQUIRES_AUDIT',
     source:'cerebro/registry/engine-registry.seed.json',
     evidence_audit_source:audit?'cerebro/jarvis/mission-001/engine-evidence-audit.v1.json':null,
     operational_claim:false,
     requires_live_audit:true,
     reuse_policy:evidence&&evidence.evidence_state!=='REGISTERED_ONLY'?'EVIDENCE_EXISTS_AUDIT_THEN_REUSE':'AUDIT_THEN_REUSE_BEFORE_BUILD'
   });
 });
}

export function engineRegistryCapabilitySummary({registry_path=DEFAULT_REGISTRY,audit_path=DEFAULT_AUDIT,exclude=[]}={}){
 const all=loadEngineRegistryCapabilities({registry_path,audit_path,exclude});const audit=loadAudit(audit_path);const states={};for(const x of all)states[x.evidence_state]=(states[x.evidence_state]||0)+1;
 return Object.freeze({registered_capability_count:all.length,operational_claim_count:all.filter(x=>x.operational_claim).length,live_audit_required_count:all.filter(x=>x.requires_live_audit).length,evidence_audited:Boolean(audit),evidence_audit_fingerprint:audit?.audit_fingerprint||null,evidence_state_counts:Object.freeze(states),source:'cerebro/registry/engine-registry.seed.json',rule:'REGISTERED_OR_REPOSITORY_EVIDENCE_DOES_NOT_MEAN_OPERATIONAL'});
}
