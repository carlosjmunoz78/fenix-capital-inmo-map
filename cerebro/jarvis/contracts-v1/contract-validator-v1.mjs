import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const REGISTRY=JSON.parse(fs.readFileSync(path.join(HERE,'contract-registry.v1.json'),'utf8'));
const HUMAN=new Set(REGISTRY.canonical_human_required);
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const missing=(value,fields)=>fields.filter(k=>value?.[k]===undefined||value?.[k]===null||value?.[k]==='');

export function getJarvisContractRegistryV1(){return structuredClone(REGISTRY);}

export function validateJarvisContractV1(type,value,{require_context=true}={}){
 const spec=REGISTRY.contracts[type];if(!spec)return Object.freeze({ok:false,code:'UNKNOWN_CONTRACT',type});
 if(!value||typeof value!=='object'||Array.isArray(value))return Object.freeze({ok:false,code:'OBJECT_REQUIRED',type});
 const required=[...new Set([...(require_context?REGISTRY.common_context_required:[]),...spec.required])];
 const absent=missing(value,required);if(absent.length)return Object.freeze({ok:false,code:'MISSING_FIELDS',type,missing:Object.freeze(absent)});
 if(require_context){
  if(value.environment!=='PREPROD')return Object.freeze({ok:false,code:'PREPROD_ONLY',type});
  for(const k of ['company_id','project_id','version'])if(typeof value[k]!=='string'||!value[k].trim())return Object.freeze({ok:false,code:'INVALID_CONTEXT',type,field:k});
 }
 if(type==='ExceptionRequest'&&!HUMAN.has(value.reason))return Object.freeze({ok:false,code:'INVALID_HUMAN_REQUIRED_REASON',type,reason:value.reason});
 if(type==='HandshakeResponse'&&typeof value.granted!=='boolean')return Object.freeze({ok:false,code:'GRANTED_BOOLEAN_REQUIRED',type});
 if(type==='AuthzDecision'&&typeof value.allowed!=='boolean')return Object.freeze({ok:false,code:'ALLOWED_BOOLEAN_REQUIRED',type});
 if(type==='Verdict'&&!['PASS','FAIL','HOLD','HUMAN_REQUIRED'].includes(value.decision))return Object.freeze({ok:false,code:'INVALID_VERDICT',type});
 if(type==='ComplexityBudget'){
  for(const k of ['max_steps','token_ceiling','parallelism_ceiling'])if(!Number.isFinite(Number(value[k]))||Number(value[k])<0)return Object.freeze({ok:false,code:'INVALID_NONNEGATIVE_NUMBER',type,field:k});
  if(!Number.isFinite(Number(value.cost_ceiling_eur))||Number(value.cost_ceiling_eur)<0)return Object.freeze({ok:false,code:'INVALID_NONNEGATIVE_NUMBER',type,field:'cost_ceiling_eur'});
 }
 return Object.freeze({ok:true,code:'VALID',type,contract_version:spec.version,contract_hash:hash(value)});
}

export function freezeJarvisContractV1(type,value,{require_context=true}={}){
 const validation=validateJarvisContractV1(type,value,{require_context});if(!validation.ok)throw new Error(`JARVIS_CONTRACT_INVALID:${type}:${validation.code}:${(validation.missing||[]).join(',')}`);
 return Object.freeze({contract_type:type,contract_version:validation.contract_version,contract_hash:validation.contract_hash,frozen_at:new Date().toISOString(),value:Object.freeze(structuredClone(value))});
}

export const JARVIS_CONTRACTS_V1=Object.freeze({registry_id:REGISTRY.registry_id,contract_count:Object.keys(REGISTRY.contracts).length,canonical_human_required:Object.freeze([...REGISTRY.canonical_human_required]),prod_authorized:false,trading_access:false});
