import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

/**
 * Read-only source-of-truth adapter. Reads existing CEREBRO registries afresh
 * every time, including FACT-001-approved future updates. No register, grant,
 * activate, write, model or provider API call. No independent JARVIS memory.
 *
 * Registry files must be supplied by the trusted CEREBRO server runtime,
 * NOT by any client path or LLM argument.
 */
const DEFAULT_REGISTRY_DIR=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../registry');
const FILES=Object.freeze([
 'engine-registry.v1.json',
 'role-agent-registry.v1.json',
 'native-capability-operational-adoption-v1.json',
 'skill-real-engine-binding-v1.json'
]);
const digest=contents=>crypto.createHash('sha256').update(contents.join('\n')).digest('hex');
const read=(directory,name)=>{
 const content=fs.readFileSync(path.join(directory,name),'utf8');
 return {content,data:JSON.parse(content)};
};
export function createJarvisCerebroRegistryReaderV0({registry_dir=DEFAULT_REGISTRY_DIR}={}){
 // Explicitly trusted backend path: never expose registry_dir as a request param.
 if(typeof registry_dir!=='string'||!path.isAbsolute(registry_dir))
  throw Error('TRUSTED_ABSOLUTE_REGISTRY_DIR_REQUIRED');
 const directory=path.resolve(registry_dir);
 return async function readCanonicalCatalogue(){
  const [engines,roles,native,skills]=FILES.map(file=>read(directory,file));
  if(!Array.isArray(engines.data.engine_ids)||
    engines.data.engine_ids.length!==engines.data.count||
    !Array.isArray(roles.data.roles)||!Array.isArray(native.data.capabilities)||
    !skills.data.skills||typeof skills.data.skills!=='object')
   throw Error('CEREBRO_CANONICAL_REGISTRY_CONTRACT_MISMATCH');
  const known=new Set(engines.data.engine_ids);
  const learned=[];
  for(const capability of native.data.capabilities){
   const id=capability?.capability_id,engine=capability?.owner_engine_id;
   if(typeof id!=='string'||!id||typeof engine!=='string'||!known.has(engine))continue;
   learned.push({capability_id:id,target_id:engine,state:'TESTED_NOT_RELEASED'});
  }
  for(const [name,entry] of Object.entries(skills.data.skills)){
   const target=entry?.target_engine_bindings?.find(id=>known.has(id));
   if(!target||!name)continue;
   // A skill binding shows existing knowledge/wrapping, not JARVIS authority.
   learned.push({capability_id:'skill:'+name,target_id:target,
    state:'TESTED_NOT_RELEASED'});
  }
  const seen=new Set();
  const unique=learned.filter(x=>{
   if(seen.has(x.capability_id))return false;
   seen.add(x.capability_id);return true;
  });
  return {
   source:'CEREBRO_CANONICAL_REGISTRY',
   revision:digest([engines.content,roles.content,native.content,skills.content]),
   engine_ids:[...engines.data.engine_ids],
   roles:roles.data.roles.map(r=>({role_id:r.role_id,state:r.state,
    reports_to_state:r.reports_to_state})),
   learned_capabilities:unique
  };
 };
}
export const JARVIS_CEREBRO_REGISTRY_READER_V0_CONTRACT=Object.freeze({
 environment:'PREPROD',mode:'READ_THROUGH_EXISTING_REGISTRIES',
 files:FILES,auto_refresh:'PER_CALL',automatic_permission_grants:false,
 direct_exec:false,write_access:false,prod_authorized:false,trading_access:false,
 new_subscription_eur:0
});
