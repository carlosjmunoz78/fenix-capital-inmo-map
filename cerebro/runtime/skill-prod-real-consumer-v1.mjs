#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {resolveProdOperationalSkillCapability} from './skill-prod-operational-fastlane-v1.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const CEREBRO_ROOT=path.resolve(HERE,'..');
const WRAPPER_ROOT=path.resolve(HERE,'skill-wrappers');
const SAFE_MODES=new Set(['ADVISE','ANALYZE','REVIEW','PLAN','READONLY_OBSERVE','TRANSFORM','GENERATE','VALIDATE','SIMULATE','INTERNAL_BUILD','EXECUTE_INTERNAL']);

function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function safeWrapperPath(ref){if(typeof ref!=='string'||!ref.startsWith('cerebro/runtime/skill-wrappers/')||ref.includes('..'))throw new Error('UNSAFE_WRAPPER_REF');const file=path.resolve(CEREBRO_ROOT,ref.slice('cerebro/'.length));if(!file.startsWith(`${WRAPPER_ROOT}${path.sep}`))throw new Error('WRAPPER_OUTSIDE_TRUSTED_ROOT');if(!fs.existsSync(file))throw new Error('WRAPPER_FILE_MISSING');return file;}

export async function executeProdSkillCapability({request_id,candidate_id,company_id='fenix',engine_id,requested_mode='ANALYZE',request={}}={}){
  if(typeof request_id!=='string'||!request_id.trim())throw new Error('REQUEST_ID_REQUIRED');
  if(!SAFE_MODES.has(requested_mode))throw new Error('REQUESTED_MODE_NOT_SAFE_INTERNAL');
  if(/TRAD|TRADING/i.test(String(engine_id??'')))throw new Error('TRADING_BINDING_DENIED');
  const resolution=resolveProdOperationalSkillCapability({candidate_id,engine_id,requested_mode});
  if(resolution.allowed!==true)throw new Error(`CAPABILITY_NOT_OPERATIONAL:${resolution.status}`);
  if(resolution.direct_prod_write_authorized!==false||resolution.direct_prod_mutation_authorized!==false||resolution.external_side_effects_authorized!==false||resolution.external_skill_code_execution!==false||resolution.trading_access!==false||Number(resolution.additional_cost_eur)!==0)throw new Error('CAPABILITY_AUTHORITY_NOT_FAIL_CLOSED');
  const wrapperFile=safeWrapperPath(resolution.wrapper_ref);
  const mod=await import(`${pathToFileURL(wrapperFile).href}?v=${encodeURIComponent(resolution.pinned_sha??'internal')}`);
  const fn=mod[resolution.wrapper_export];if(typeof fn!=='function')throw new Error('WRAPPER_EXPORT_MISSING');
  const started_at=new Date().toISOString();
  const result=await fn({mode:requested_mode,request,context:{request_id,company_id,engine_id,environment:'PROD_CAPABILITY',candidate_id}});
  const resultHash=hash(result);
  const receipt={
    schema_version:'1.0.0',state_type:'CEREBRO_SKILL_PROD_REAL_CONSUMER_RECEIPT',request_id,candidate_id,technical_name:resolution.technical_name,company_id,engine_id,environment:'PROD_CAPABILITY',requested_mode,status:'PROD_CAPABILITY_REAL_INTERNAL_EXECUTION_GREEN',wrapper_id:resolution.wrapper_id,wrapper_ref:resolution.wrapper_ref,readonly_canary_evidence:resolution.readonly_canary_evidence,started_at,completed_at:new Date().toISOString(),result_hash:resultHash,result,
    authority:{direct_prod_write_authorized:false,direct_prod_mutation_authorized:false,external_side_effects_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,trading_access:false,spend_authorized:false,additional_cost_eur:0,action_authority_source:'ORIGIN_ENGINE_GOVERNED_POLICY_ONLY'}
  };
  return Object.freeze({...receipt,receipt_hash:hash(receipt)});
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const candidate_id=arg('--candidate');const engine_id=arg('--engine');const requested_mode=arg('--mode')??'GENERATE';const task=arg('--task')??'PRODUCT_VIEWER';const output=arg('--output');
  const receipt=await executeProdSkillCapability({request_id:`cli:${process.env.GITHUB_RUN_ID??Date.now()}`,candidate_id,company_id:arg('--company')??'fenix',engine_id,requested_mode,request:{task,goal:arg('--goal')??'Representative governed internal skill execution'}});
  const text=`${JSON.stringify(receipt,null,2)}\n`;if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,text,'utf8');}process.stdout.write(text);
}
