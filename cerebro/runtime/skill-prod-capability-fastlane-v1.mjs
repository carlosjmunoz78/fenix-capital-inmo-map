#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const CEREBRO_ROOT=path.resolve(HERE,'..');
const DEFAULT_QUEUE=path.join(CEREBRO_ROOT,'registry','skill-full-adoption-v1.json');
const PROD_CAPABILITY_STATE='PROD_CAPABILITY_AVAILABLE_READONLY';
const ALLOWED_REQUEST_MODES=new Set(['ADVISE','ANALYZE','REVIEW','PLAN','READONLY_OBSERVE']);
const CANARY_RE=/^GREEN_[A-Z0-9_]+_PROD_READONLY_CANARY$/;

function loadJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function boolFalse(v){return v===false;}
function nonEmptyArray(v){return Array.isArray(v)&&v.length>0;}
function closurePath(row,root=CEREBRO_ROOT){
  const rel=String(row?.closure_evidence??'').trim();
  if(!rel||rel.includes('..')) return null;
  return path.resolve(root,'..',rel.startsWith('cerebro/')?rel.slice('cerebro/'.length):rel);
}
function requiredClosureGreen(required={}){
  const requiredKeys=[
    'provenance_and_license_green','safe_internal_wrapper_or_reuse_path','relevant_engine_bindings_resolved',
    'old_vs_new_pass_for_each_activated_binding','tribunal_pass','no_regression','rollback_proven','rebuild_proven',
    'observability_connected','audit_chain_connected','finops_connected','lrn001_feedback_connected','idempotency_proven',
    'zero_additional_cost','preprod_continuous_evidence_where_cadence_applies'
  ];
  return requiredKeys.every((key)=>required?.[key]===true);
}
function scopeIsReadonly(row){
  const scope=String(row?.current_scope??row?.scope??'').toUpperCase();
  return scope.includes('READONLY')&&!/(PROD_WRITE|PROD_MUTATION|WRITE_AUTHORIZED|MUTATION_AUTHORIZED|EXTERNAL_SIDE_EFFECT_AUTHORIZED)/.test(scope);
}
function closureSafetyGreen(closure){
  const safety=closure?.safety??{};
  const wrapper=closure?.safe_internal_wrapper??{};
  return closure?.status==='FULL_SAFE_PREPROD'&&
    closure?.human_required==null&&
    Number(closure?.additional_cost_eur??-1)===0&&
    closure?.provenance?.provenance_and_license_status==='GREEN'&&
    wrapper?.external_upstream_code_execution===false&&
    requiredClosureGreen(closure?.required_closure)&&
    boolFalse(safety.prod_write)&&boolFalse(safety.prod_mutation)&&boolFalse(safety.customer_data)&&
    boolFalse(safety.external_skill_code_execution)&&boolFalse(safety.trading)&&boolFalse(safety.paid_fallback)&&
    boolFalse(safety.permission_expansion)&&nonEmptyArray(closure?.target_engine_bindings);
}

export function evaluateProdCapabilityCandidate({row,closure}){
  const blockers=[];
  if(row?.status!=='FULL_SAFE_PREPROD') blockers.push('NOT_FULL_SAFE_PREPROD');
  if(row?.human_required!=null) blockers.push('HUMAN_REQUIRED_ACTIVE');
  if(Number(row?.additional_cost_eur??0)!==0) blockers.push('NONZERO_INCREMENTAL_COST');
  if(!CANARY_RE.test(String(row?.current_evidence??''))) blockers.push('NO_GREEN_PROD_READONLY_CANARY');
  if(!scopeIsReadonly(row)) blockers.push('CURRENT_SCOPE_NOT_READONLY');
  if(!closure) blockers.push('CLOSURE_EVIDENCE_MISSING');
  else if(!closureSafetyGreen(closure)) blockers.push('CLOSURE_SAFETY_NOT_GREEN');
  const eligible=blockers.length===0;
  return Object.freeze({
    candidate_id:row?.candidate_id??null,
    alias_es:row?.alias_es??null,
    technical_name:row?.technical_name??null,
    target_engine_bindings:Object.freeze([...(closure?.target_engine_bindings??row?.target_engine_bindings??[])]),
    eligible,
    status:eligible?PROD_CAPABILITY_STATE:'HOLD_PREPROD',
    blockers:Object.freeze(blockers),
    canary_evidence:row?.current_evidence??null,
    capability_mode:eligible?'INTERNAL_WRAPPER_READONLY_ADVISORY':'DISABLED',
    authority:Object.freeze({
      prod_capability_available_readonly:eligible,
      prod_authorized:false,
      prod_write_authorized:false,
      prod_mutation_authorized:false,
      permission_expansion_authorized:false,
      external_skill_code_execution:false,
      customer_data_authorized:false,
      trading_access:false,
      spend_authorized:false,
      additional_cost_eur:0,
      action_authority_source:'ORIGIN_ENGINE_GOVERNED_POLICY_ONLY'
    })
  });
}

export function buildProdCapabilityFastLane({queueFile=DEFAULT_QUEUE,cerebroRoot=CEREBRO_ROOT}={}){
  const queue=loadJson(queueFile);
  const rows=[];
  for(const row of queue?.queue??[]){
    let closure=null;
    const file=closurePath(row,cerebroRoot);
    if(file&&fs.existsSync(file)) closure=loadJson(file);
    rows.push(evaluateProdCapabilityCandidate({row,closure}));
  }
  const available=rows.filter((x)=>x.eligible);
  return Object.freeze({
    schema_version:'1.0.0',
    state_type:'CEREBRO_SKILL_PROD_CAPABILITY_FAST_LANE_V1',
    company_id:'GLOBAL',
    engine_id:'FACT-001',
    environment:'PROD_CAPABILITY',
    version:'1.0.0',
    status:available.length?'GREEN_PROD_READONLY_CAPABILITY_SET':'NO_ELIGIBLE_CAPABILITIES',
    policy:Object.freeze({
      event_driven:true,
      hourly_wait_required:false,
      blocked_candidate_blocks_independent_work:false,
      full_safe_preprod_required:true,
      real_prod_readonly_canary_required:true,
      origin_engine_policy_controls_actions:true,
      autonomous_prod_write_promotion:false,
      autonomous_prod_mutation_promotion:false,
      external_skill_code_execution:false,
      additional_cost_budget_eur:0
    }),
    available_count:available.length,
    available:Object.freeze(available),
    evaluated:Object.freeze(rows),
    authority:Object.freeze({prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,trading_access:false,spend_authorized:false,additional_cost_eur:0})
  });
}

export function resolveProdSkillCapability({candidate_id,engine_id,requested_mode='ANALYZE',queueFile=DEFAULT_QUEUE,cerebroRoot=CEREBRO_ROOT}={}){
  const report=buildProdCapabilityFastLane({queueFile,cerebroRoot});
  const row=report.available.find((x)=>x.candidate_id===candidate_id);
  if(!row) return Object.freeze({allowed:false,status:'DENY_NOT_PROD_CAPABILITY_AVAILABLE',candidate_id,engine_id,requested_mode,prod_write_authorized:false,prod_mutation_authorized:false});
  if(!row.target_engine_bindings.includes(engine_id)) return Object.freeze({allowed:false,status:'DENY_ENGINE_BINDING_MISMATCH',candidate_id,engine_id,requested_mode,prod_write_authorized:false,prod_mutation_authorized:false});
  if(!ALLOWED_REQUEST_MODES.has(requested_mode)) return Object.freeze({allowed:false,status:'DENY_MODE_NOT_READONLY',candidate_id,engine_id,requested_mode,prod_write_authorized:false,prod_mutation_authorized:false});
  return Object.freeze({allowed:true,status:PROD_CAPABILITY_STATE,candidate_id,engine_id,requested_mode,capability_mode:row.capability_mode,action_authority_source:'ORIGIN_ENGINE_GOVERNED_POLICY_ONLY',prod_write_authorized:false,prod_mutation_authorized:false,external_skill_code_execution:false,additional_cost_eur:0});
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const out=arg('--output');
  const report=buildProdCapabilityFastLane();
  const text=`${JSON.stringify(report,null,2)}\n`;
  if(out){fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,text,'utf8');}
  process.stdout.write(text);
}
