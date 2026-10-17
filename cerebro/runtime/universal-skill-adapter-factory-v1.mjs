#!/usr/bin/env node
import crypto from 'node:crypto';
import {planFactEngineeringTask} from './fact-safe-engineering-bootstrap-v1.mjs';

const PREPROD='PREPROD';
const VERSION='1.0.0';
const SAFE_EVIDENCE_KINDS=new Set(['FIRST_PARTY_INTERNAL','NORMALIZED_STATIC_LAB','GOVERNED_READONLY_REMOTE','PHYSICAL_PREPROD']);
const EXECUTABLE_KINDS=new Set(['EXECUTABLE','BROWSER_ACTION','DEVICE_ACTION','REMOTE_MUTATION']);

function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function uniq(values){return [...new Set(values??[])];}
function exactSet(a,b){return JSON.stringify(uniq(a).sort())===JSON.stringify(uniq(b).sort());}
function authority(){return {prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,dependency_install_authorized:false,customer_data_used:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0};}
function safeAuthorityObject(v={}){return v.prod_authorized===false&&v.prod_write_authorized!==true&&v.prod_mutation_authorized!==true&&v.permission_expansion_authorized!==true&&v.external_skill_code_execution===false&&v.customer_data_used!==true&&v.paid_fallback!==true&&v.spend_authorized!==true&&v.trading_access===false&&Number(v.additional_cost_eur??0)===0;}
function refs(value){return uniq((Array.isArray(value)?value:[]).filter((x)=>typeof x==='string'&&x.trim()).map((x)=>x.trim())).sort();}

function matchingEvidence(rows,{capability_id,domain_id,engine_id}){
  return (rows??[]).filter((row)=>row&&row.capability_id===capability_id&&row.domain_id===domain_id&&(row.engine_id==null||row.engine_id===engine_id));
}

function existingAdapter(existing,{capability_id,domain_id,engine_id}){
  if(!existing||typeof existing!=='object')return null;
  const keys=[`${capability_id}:${domain_id}:${engine_id}`,`${domain_id}:${engine_id}`,`${capability_id}:${domain_id}`,domain_id];
  for(const key of keys){if(existing[key])return existing[key];}
  return null;
}

function physicalRequired(contract,profile){
  if(contract.physical_evidence_mode==='MEDIA_RUNTIME_PREPROD_REQUIRED')return true;
  return contract.physical_evidence_mode==='PHYSICAL_BROWSER_PREPROD_WHEN_ACTION_CAPABLE'&&profile.action_capable===true;
}

function validateEvidence(row,contract){
  const evidence_refs=refs(row?.evidence_refs);
  const observed=uniq(Array.isArray(row?.observed_constraints)?row.observed_constraints:[]).sort();
  const kind=String(row?.evidence_kind??'');
  const execution_kind=String(row?.execution_kind??'DECLARATIVE');
  const sourceSafe=SAFE_EVIDENCE_KINDS.has(kind);
  const exact=exactSet(observed,contract.required_constraints);
  const semantic=sourceSafe&&exact&&evidence_refs.length>0&&row.real_consumption_proven===true&&safeAuthorityObject(row);
  const actionCapable=EXECUTABLE_KINDS.has(execution_kind)||row.action_capable===true;
  const needsPhysical=contract.physical_evidence_mode==='MEDIA_RUNTIME_PREPROD_REQUIRED'||(contract.physical_evidence_mode==='PHYSICAL_BROWSER_PREPROD_WHEN_ACTION_CAPABLE'&&actionCapable);
  const physicalGreen=!needsPhysical||row.physical_evidence===true;
  return Object.freeze({semantic,physicalGreen,needsPhysical,actionCapable,evidence_refs,observed,kind,execution_kind,sourceSafe,exact});
}

function normalizeExistingAdapter(adapter,contract){
  if(!adapter||typeof adapter.probe!=='function'||adapter.execution_authority!=='INTERNAL_PREPROD_PROBE')return null;
  const p=adapter.profile??{};
  if(p.contract_exact!==true||!exactSet(p.required_constraints,contract.required_constraints)||!safeAuthorityObject(p))return null;
  return adapter;
}

function generatedAdapter({candidate_id,capability,domain_id,engine_id,contract,row,validation}){
  const adapter_id=`usaf_adapter_${hash({candidate_id,capability_id:capability.capability_id,domain_id,engine_id,contract_id:contract.contract_id,evidence:validation.evidence_refs,observed:validation.observed}).slice(0,24)}`;
  const profile=Object.freeze({
    adapter_id,adapter_version:VERSION,generated_by:'CEREBRO_UNIVERSAL_SKILL_ADAPTER_FACTORY_V1',
    capability_id:capability.capability_id,domain_id,engine_id,contract_exact:true,
    required_constraints:Object.freeze([...validation.observed]),action_capable:validation.actionCapable,
    evidence_kind:validation.kind,evidence_refs:Object.freeze([...validation.evidence_refs]),
    ...authority()
  });
  return Object.freeze({
    execution_authority:'INTERNAL_PREPROD_PROBE',profile,
    probe:()=>Object.freeze({
      status:'PASS',real_consumption:true,decision:'EVIDENCE_GROUNDED_INTERNAL_ADAPTER_PASS',
      observed_constraints:Object.freeze([...validation.observed]),evidence_refs:Object.freeze([...validation.evidence_refs]),
      physical_evidence:row.physical_evidence===true,source_evidence_kind:validation.kind,
      ...authority()
    })
  });
}

export function decideAutomaticAdapter({activation_plan,capability,domain_id,engine_id,contract,candidate_evidence={},existing_adapters={}}){
  if(!activation_plan||activation_plan.status!=='ACTIVATION_PLAN_READY')throw new Error('ACTIVATION_PLAN_READY_REQUIRED');
  const base={candidate_id:activation_plan.candidate_id,capability_id:capability.capability_id,domain_id,engine_id,contract_id:contract.contract_id,...authority()};

  const existing=normalizeExistingAdapter(existingAdapter(existing_adapters,{capability_id:capability.capability_id,domain_id,engine_id}),contract);
  if(existing){
    const adapter_id=existing.profile.adapter_id??existing.profile.wrapper_id??'existing-adapter';
    return Object.freeze({...base,status:'ADAPTER_READY',decision:'REUSE_EXISTING_ADAPTER',adapter_id,adapter:existing,engineering_task:null,blockers:Object.freeze([])});
  }

  const rows=matchingEvidence(candidate_evidence.semantic_bindings??[],{capability_id:capability.capability_id,domain_id,engine_id});
  for(const row of rows){
    const check=validateEvidence(row,contract);
    if(!check.semantic)continue;
    if(!check.physicalGreen){
      return Object.freeze({...base,status:'BLOCKED_EXTERNAL',decision:'PHYSICAL_EVIDENCE_REQUIRED',adapter_id:null,adapter:null,engineering_task:null,blockers:Object.freeze(['physical_preprod_evidence_required']),evidence_refs:Object.freeze(check.evidence_refs)});
    }
    const adapter=generatedAdapter({candidate_id:activation_plan.candidate_id,capability,domain_id,engine_id,contract,row,validation:check});
    return Object.freeze({...base,status:'ADAPTER_READY',decision:'GENERATE_DECLARATIVE_ADAPTER',adapter_id:adapter.profile.adapter_id,adapter,engineering_task:null,blockers:Object.freeze([]),evidence_refs:Object.freeze(check.evidence_refs)});
  }

  const unsafeRows=rows.map((row)=>({row,check:validateEvidence(row,contract)}));
  if(unsafeRows.some(({check})=>check.needsPhysical&&!check.physicalGreen&&check.sourceSafe&&check.exact)){
    return Object.freeze({...base,status:'BLOCKED_EXTERNAL',decision:'PHYSICAL_EVIDENCE_REQUIRED',adapter_id:null,adapter:null,engineering_task:null,blockers:Object.freeze(['physical_preprod_evidence_required'])});
  }

  const engineering_task=planFactEngineeringTask({
    company_id:activation_plan.company_id,candidate_id:activation_plan.candidate_id,task_kind:'WRAPPER_ADAPTER',
    objective:`Create governed adapter for ${activation_plan.technical_name} / ${capability.capability_id} / ${domain_id} / ${engine_id}`,
    source_refs:activation_plan.source_refs??[],inventory_complete:true,dependencies_mapped:true,reuse_checked:true,
    new_code:true,new_code_justified:true,mutation:true,worktree_isolated:true,tests_before_change:true,
    rollback_ready:true,rebuild_ready:true,backup_or_snapshot_ready:true,planned_files_changed:2,max_files_changed:10,additional_cost_eur:0
  });
  return Object.freeze({...base,status:'ENGINEERING_TASK_REQUIRED',decision:'ENGINEERING_TASK_REQUIRED',adapter_id:null,adapter:null,engineering_task,blockers:Object.freeze(['semantic_adapter_evidence_missing'])});
}

export function createAutomaticAdapterResolver({activation_plan,candidate_evidence={},existing_adapters={}}={}){
  if(!activation_plan||activation_plan.status!=='ACTIVATION_PLAN_READY')throw new Error('ACTIVATION_PLAN_READY_REQUIRED');
  const decisions=[];
  const resolver=({capability,domain_id,engine_id,contract})=>{
    const decision=decideAutomaticAdapter({activation_plan,capability,domain_id,engine_id,contract,candidate_evidence,existing_adapters});
    decisions.push(Object.freeze({...decision,adapter:undefined}));
    return decision.status==='ADAPTER_READY'?decision.adapter:null;
  };
  return Object.freeze({resolver,decisions,getDecisions:()=>Object.freeze([...decisions])});
}

export function adapterFactorySummary(decisions=[]){
  const counts={ADAPTER_READY:0,ENGINEERING_TASK_REQUIRED:0,BLOCKED_EXTERNAL:0,HUMAN_REQUIRED:0};
  for(const d of decisions)counts[d.status]=(counts[d.status]??0)+1;
  const status=counts.HUMAN_REQUIRED?'HUMAN_REQUIRED':counts.BLOCKED_EXTERNAL?'BLOCKED_EXTERNAL':counts.ENGINEERING_TASK_REQUIRED?'ENGINEERING_TASK_REQUIRED':'ADAPTERS_READY';
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_UNIVERSAL_SKILL_ADAPTER_FACTORY_SUMMARY_V1',status,counts:Object.freeze(counts),...authority()});
}
