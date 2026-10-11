#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function arg(name, fallback=null){const i=process.argv.indexOf(name);return i>=0&&process.argv[i+1]?process.argv[i+1]:fallback;}
function req(v,l){if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);return v.trim();}
function read(file){return JSON.parse(fs.readFileSync(file,'utf8'));}

function validateRegistry(registry){
  if(!registry||registry.state_type!=='CEREBRO_OWNER_EXECUTOR_CAPABILITY_REGISTRY_V0')throw new Error('capability registry required');
  if(registry.engine_id!=='AUTO-001'||registry.environment!=='CONTROL_PLANE')throw new Error('capability registry scope mismatch');
  if(registry.policy?.evidence_required!==true||registry.policy?.unknown_means_no_authority!==true||registry.policy?.historical_branch_does_not_equal_current_runtime!==true)throw new Error('capability registry fail-closed policy drift');
  if(Number(registry.policy?.additional_subscription_eur??NaN)!==0)throw new Error('capability registry cost drift');
  if(!Array.isArray(registry.capabilities))throw new Error('capabilities array required');
  const ids=new Set();
  for(const cap of registry.capabilities){
    req(cap.engine_id,'capability.engine_id');
    if(ids.has(cap.engine_id))throw new Error(`duplicate capability ${cap.engine_id}`);
    ids.add(cap.engine_id);
    req(cap.classification,`${cap.engine_id}.classification`);
    for(const key of ['code_patch_generation','repository_write','branch_creation','pull_request_creation','prod_write']) if(typeof cap[key]!=='boolean') throw new Error(`${cap.engine_id}.${key} must be boolean`);
    if(!Array.isArray(cap.evidence)||cap.evidence.length===0)throw new Error(`${cap.engine_id}.evidence required`);
  }
  return registry;
}

function validateHealing(healing){
  if(!healing||healing.state_type!=='CEREBRO_SELF_HEALING_PLAN_BATCH_V0')throw new Error('SELF-001 healing batch required');
  if(healing.engine_id!=='SELF-001'||healing.environment!=='PREPROD_CONTROL_PLANE')throw new Error('SELF-001 healing scope mismatch');
  if(healing.safety?.prod_write!==false||healing.safety?.customer_data!==false||healing.safety?.trading!==false||Number(healing.safety?.additional_subscription_eur??NaN)!==0)throw new Error('SELF-001 safety drift');
  if(healing.execution_authority?.code_mutation_authorized!==false||healing.execution_authority?.prod_write_authorized!==false)throw new Error('SELF-001 authority drift');
  return healing;
}

function isVerifiedCodeExecutor(cap){
  return cap?.current_main===true && cap.code_patch_generation===true && cap.repository_write===true && cap.branch_creation===true && cap.pull_request_creation===true && cap.prod_write===false;
}

export function auditOwnerExecutors({registry,healing,now=new Date().toISOString()}={}){
  validateRegistry(registry);validateHealing(healing);
  const byId=new Map(registry.capabilities.map(x=>[x.engine_id,x]));
  const owners=[...new Set((healing.plans??[]).filter(x=>x.status==='PLAN_READY').map(x=>x.owner_engine))].sort();
  const rows=owners.map(owner=>{
    const cap=byId.get(owner);
    if(!cap)return {owner_engine:owner,status:'NO_VERIFIED_EXECUTOR',classification:'UNKNOWN_FAIL_CLOSED',verified_code_executor:false,evidence:['not-present-in-capability-registry'],next_action:'KEEP_SELF001_PLAN_ONLY'};
    const verified=isVerifiedCodeExecutor(cap);
    return {
      owner_engine:owner,
      status:verified?'VERIFIED_PREPROD_CODE_EXECUTOR':'NO_VERIFIED_EXECUTOR',
      classification:cap.classification,
      verified_code_executor:verified,
      evidence:cap.evidence,
      next_action:verified?'ROUTE_TO_VERIFIED_EXECUTOR':'KEEP_SELF001_PLAN_ONLY'
    };
  });
  const verified=rows.filter(x=>x.verified_code_executor);
  const missing=rows.filter(x=>!x.verified_code_executor);
  return Object.freeze({
    schema_version:'0.1.0',state_type:'CEREBRO_OWNER_EXECUTOR_CAPABILITY_AUDIT_V0',company_id:healing.company_id,engine_id:'AUTO-001',environment:'PREPROD_CONTROL_PLANE',version:'0.1.0',updated_at:now,
    source_healing_updated_at:healing.updated_at,
    owners_total:rows.length,
    verified_code_executors:verified.length,
    owners_without_verified_executor:missing.length,
    status:missing.length?'SAFE_HOLD_NO_VERIFIED_CODE_EXECUTOR':'EXECUTOR_CAPABILITIES_VERIFIED',
    owners:rows,
    historical_findings:{
      auto001:'Historical AUTO-001 implementation is a deterministic PLAN_ONLY planner with executed=false; it is not a code executor.',
      actgw001:'Historical ACTGW-001 implementation is PLAN_ONLY with executed=false; it is not a code executor.',
      fact001:'Current FACT-001 generates structural scaffolds on disk; it is not evidence of arbitrary owner patch execution.'
    },
    decision:missing.length?'DO_NOT_CREATE_OR_INFER_PROD_AUTHORITY':'ALLOW_PREPROD_EXECUTOR_ROUTING_ONLY',
    next_gate:missing.length?'AUTO001_PREPROD_PATCH_EXECUTOR_V0_DESIGN':'ROUTE_SELF001_PLANS_TO_VERIFIED_EXECUTORS',
    authority:{code_mutation_authorized:false,auto_merge:false,promotion_authorized:false,prod_authorized:false,prod_write_authorized:false},
    safety:{prod_write:false,customer_data:false,trading:false,paid_fallback:false,additional_subscription_eur:0}
  });
}

if(import.meta.url===`file://${process.argv[1]}`){
  const registryPath=req(arg('--registry'),'--registry');
  const healingPath=req(arg('--healing'),'--healing');
  const outPath=req(arg('--out'),'--out');
  const state=auditOwnerExecutors({registry:read(registryPath),healing:read(healingPath)});
  fs.mkdirSync(path.dirname(outPath),{recursive:true});
  fs.writeFileSync(outPath,JSON.stringify(state,null,2)+'\n');
  console.log(JSON.stringify({status:state.status,owners:state.owners_total,verified_code_executors:state.verified_code_executors,missing:state.owners_without_verified_executor,next_gate:state.next_gate,cost_eur:0}));
}
