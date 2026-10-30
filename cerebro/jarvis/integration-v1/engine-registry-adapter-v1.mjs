import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REGISTRY=path.resolve(HERE,'../../registry/engine-registry.seed.json');

export function loadEngineRegistryCapabilities({registry_path=DEFAULT_REGISTRY,exclude=[]}={}){
 const raw=JSON.parse(fs.readFileSync(registry_path,'utf8'));
 if(!Array.isArray(raw.engine_ids)||raw.engine_ids.length!==raw.count)throw new Error('ENGINE_REGISTRY_COUNT_MISMATCH');
 if(new Set(raw.engine_ids).size!==raw.engine_ids.length)throw new Error('ENGINE_REGISTRY_DUPLICATE_ID');
 const skip=new Set(exclude);
 return raw.engine_ids.filter(id=>!skip.has(id)).map(engine_id=>Object.freeze({
   capability_id:engine_id,
   version:raw.defaults?.version||'0.1.0',
   environments:['LAB','PREPROD'],
   company_scope:raw.defaults?.company_scope||'GLOBAL_OR_SCOPED',
   evidence_state:raw.defaults?.evidence_state||'UNKNOWN_REQUIRES_AUDIT',
   source_status:raw.defaults?.source_status||'UNKNOWN_REQUIRES_AUDIT',
   source:'cerebro/registry/engine-registry.seed.json',
   operational_claim:false,
   reuse_policy:'AUDIT_THEN_REUSE_BEFORE_BUILD'
 }));
}

export function engineRegistryCapabilitySummary(options={}){
 const all=loadEngineRegistryCapabilities(options);
 return Object.freeze({registered_capability_count:all.length,operational_claim_count:all.filter(x=>x.operational_claim).length,audit_required_count:all.filter(x=>!x.operational_claim).length,source:'cerebro/registry/engine-registry.seed.json'});
}
