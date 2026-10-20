#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {buildProdCapabilityFastLane} from './skill-prod-capability-fastlane-v1.mjs';

const OPERATIONAL_STATE='PROD_CAPABILITY_AVAILABLE_OPERATIONAL';
const SAFE_OPERATIONAL_MODES=new Set([
  'ADVISE','ANALYZE','REVIEW','PLAN','READONLY_OBSERVE',
  'TRANSFORM','GENERATE','VALIDATE','SIMULATE','INTERNAL_BUILD','EXECUTE_INTERNAL'
]);

function safeAuthority(row){
  const a=row?.authority??{};
  return a.prod_write_authorized===false&&
    a.prod_mutation_authorized===false&&
    a.permission_expansion_authorized===false&&
    a.external_skill_code_execution===false&&
    a.trading_access===false&&
    a.spend_authorized===false&&
    Number(a.additional_cost_eur??-1)===0;
}

function hasBindings(row){return Array.isArray(row?.target_engine_bindings)&&row.target_engine_bindings.length>0;}
function evidenceGreen(row){return /_PROD_READONLY_CANARY$/.test(String(row?.canary_evidence??''));}

export function evaluateProdOperationalCandidate(row){
  const blockers=[];
  if(row?.eligible!==true)blockers.push('READONLY_FASTLANE_NOT_GREEN');
  if(!safeAuthority(row))blockers.push('UNSAFE_CAPABILITY_AUTHORITY');
  if(!hasBindings(row))blockers.push('ENGINE_BINDINGS_MISSING');
  if(!evidenceGreen(row))blockers.push('PROD_READONLY_CANARY_MISSING');
  if((row?.target_engine_bindings??[]).some((x)=>/TRAD|TRADING/i.test(String(x))))blockers.push('TRADING_BINDING_DENIED');
  const eligible=blockers.length===0;
  return Object.freeze({
    candidate_id:row?.candidate_id??null,
    alias_es:row?.alias_es??null,
    technical_name:row?.technical_name??null,
    target_engine_bindings:Object.freeze([...(row?.target_engine_bindings??[])]),
    source_kind:row?.source_kind??null,
    capability_contracts:Object.freeze([...(row?.capability_contracts??[])]),
    source_locator:row?.source_locator??null,
    pinned_sha:row?.pinned_sha??null,
    eligible,
    status:eligible?OPERATIONAL_STATE:'HOLD_PROD_OPERATIONAL',
    blockers:Object.freeze(blockers),
    readonly_canary_evidence:row?.canary_evidence??null,
    capability_mode:eligible?'INTERNAL_GOVERNED_OPERATIONAL_NO_EXTERNAL_SIDE_EFFECTS':'DISABLED',
    allowed_modes:Object.freeze([...SAFE_OPERATIONAL_MODES]),
    authority:Object.freeze({
      prod_capability_operational:eligible,
      direct_prod_write_authorized:false,
      direct_prod_mutation_authorized:false,
      external_side_effects_authorized:false,
      permission_expansion_authorized:false,
      external_skill_code_execution:false,
      trading_access:false,
      spend_authorized:false,
      additional_cost_eur:0,
      action_authority_source:'ORIGIN_ENGINE_GOVERNED_POLICY_ONLY'
    })
  });
}

export function buildProdOperationalFastLane(options={}){
  const readonly=buildProdCapabilityFastLane(options);
  const evaluated=(readonly.available??[]).map(evaluateProdOperationalCandidate);
  const available=evaluated.filter((x)=>x.eligible);
  return Object.freeze({
    schema_version:'1.0.0',
    state_type:'CEREBRO_SKILL_PROD_OPERATIONAL_FAST_LANE_V1',
    company_id:'GLOBAL',
    engine_id:'FACT-001',
    environment:'PROD_CAPABILITY',
    version:'1.0.0',
    status:available.length?'GREEN_PROD_OPERATIONAL_INTERNAL_CAPABILITY_SET':'NO_ELIGIBLE_OPERATIONAL_CAPABILITIES',
    policy:Object.freeze({
      source_requires_green_prod_readonly_fastlane:true,
      internal_execution_enabled:true,
      external_side_effects_authorized:false,
      direct_prod_write_authorized:false,
      direct_prod_mutation_authorized:false,
      origin_engine_policy_controls_external_actions:true,
      human_required_only_canonical_reasons:true,
      trading_access:false,
      additional_cost_budget_eur:0
    }),
    available_count:available.length,
    dynamic_available_count:available.filter((x)=>x.source_kind==='DYNAMIC_ADOPTION').length,
    available:Object.freeze(available),
    evaluated:Object.freeze(evaluated)
  });
}

export function resolveProdOperationalSkillCapability({candidate_id,engine_id,requested_mode='ANALYZE',...options}={}){
  const report=buildProdOperationalFastLane(options);
  const row=report.available.find((x)=>x.candidate_id===candidate_id);
  if(!row)return Object.freeze({allowed:false,status:'DENY_NOT_PROD_OPERATIONAL',candidate_id,engine_id,requested_mode});
  if(!row.target_engine_bindings.includes(engine_id))return Object.freeze({allowed:false,status:'DENY_ENGINE_BINDING_MISMATCH',candidate_id,engine_id,requested_mode});
  if(!SAFE_OPERATIONAL_MODES.has(requested_mode))return Object.freeze({allowed:false,status:'DENY_MODE_NOT_SAFE_OPERATIONAL',candidate_id,engine_id,requested_mode});
  const contracts=row.source_kind==='DYNAMIC_ADOPTION'
    ?row.capability_contracts.map((cap)=>({...cap,domains:(cap.domains??[]).filter((d)=>(d.engine_bindings??[]).includes(engine_id))})).filter((cap)=>cap.domains.length)
    :[];
  return Object.freeze({
    allowed:true,
    status:OPERATIONAL_STATE,
    candidate_id,
    technical_name:row.technical_name,
    engine_id,
    requested_mode,
    capability_mode:row.capability_mode,
    source_kind:row.source_kind,
    capability_contracts:Object.freeze(contracts),
    source_locator:row.source_locator,
    pinned_sha:row.pinned_sha,
    readonly_canary_evidence:row.readonly_canary_evidence,
    prod_capability_operational:true,
    direct_prod_write_authorized:false,
    direct_prod_mutation_authorized:false,
    external_side_effects_authorized:false,
    external_skill_code_execution:false,
    trading_access:false,
    spend_authorized:false,
    additional_cost_eur:0,
    action_authority_source:'ORIGIN_ENGINE_GOVERNED_POLICY_ONLY'
  });
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const report=buildProdOperationalFastLane();
  const text=`${JSON.stringify(report,null,2)}\n`;
  const out=arg('--output');
  if(out){fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,text,'utf8');}
  process.stdout.write(text);
}
