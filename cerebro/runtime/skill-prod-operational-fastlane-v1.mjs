#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildProdCapabilityFastLane} from './skill-prod-capability-fastlane-v1.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_WRAPPERS=path.resolve(HERE,'../registry/skill-operational-wrapper-registry-v1.json');
const OPERATIONAL_STATE='PROD_CAPABILITY_AVAILABLE_OPERATIONAL';
const SAFE_OPERATIONAL_MODES=new Set(['ADVISE','ANALYZE','REVIEW','PLAN','READONLY_OBSERVE','TRANSFORM','GENERATE','VALIDATE','SIMULATE','INTERNAL_BUILD','EXECUTE_INTERNAL']);

function loadJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function safeAuthority(row){const a=row?.authority??{};return a.prod_write_authorized===false&&a.prod_mutation_authorized===false&&a.permission_expansion_authorized===false&&a.external_skill_code_execution===false&&a.trading_access===false&&a.spend_authorized===false&&Number(a.additional_cost_eur??-1)===0;}
function hasBindings(row){return Array.isArray(row?.target_engine_bindings)&&row.target_engine_bindings.length>0;}
function evidenceGreen(row){return /_PROD_READONLY_CANARY$/.test(String(row?.canary_evidence??''));}
function wrapperSafe(wrapper){return wrapper&&wrapper.status==='READY_INTERNAL_OPERATIONAL_CANARY'&&wrapper.implementation_kind==='CEREBRO_INTERNAL_REIMPLEMENTATION_FROM_LICENSED_KNOWLEDGE'&&wrapper.external_skill_code_execution===false&&wrapper.dependency_install_authorized===false&&wrapper.external_side_effects_authorized===false&&wrapper.prod_write_authorized===false&&wrapper.prod_mutation_authorized===false&&wrapper.trading_access===false&&wrapper.spend_authorized===false&&Number(wrapper.additional_cost_eur??-1)===0&&String(wrapper.wrapper_ref??'').startsWith('cerebro/runtime/skill-wrappers/')&&!String(wrapper.wrapper_ref).includes('..')&&Array.isArray(wrapper.supported_modes)&&wrapper.supported_modes.length>0;}
function loadWrapperMap(file=DEFAULT_WRAPPERS){const r=loadJson(file);if(r?.state_type!=='CEREBRO_SKILL_OPERATIONAL_WRAPPER_REGISTRY_V1')throw new Error('OPERATIONAL_WRAPPER_REGISTRY_REQUIRED');return new Map((r.wrappers??[]).map(x=>[x.candidate_id,x]));}

export function evaluateProdOperationalCandidate(row,wrapper=null){
  const blockers=[];
  if(row?.eligible!==true)blockers.push('READONLY_FASTLANE_NOT_GREEN');
  if(!safeAuthority(row))blockers.push('UNSAFE_CAPABILITY_AUTHORITY');
  if(!hasBindings(row))blockers.push('ENGINE_BINDINGS_MISSING');
  if(!evidenceGreen(row))blockers.push('PROD_READONLY_CANARY_MISSING');
  if((row?.target_engine_bindings??[]).some(x=>/TRAD|TRADING/i.test(String(x))))blockers.push('TRADING_BINDING_DENIED');
  if(!wrapperSafe(wrapper))blockers.push('EXECUTABLE_INTERNAL_WRAPPER_MISSING');
  if(wrapperSafe(wrapper)){
    if(wrapper.technical_name!==row.technical_name)blockers.push('WRAPPER_TECHNICAL_NAME_MISMATCH');
    if(wrapper.pinned_sha&&row.pinned_sha&&wrapper.pinned_sha!==row.pinned_sha)blockers.push('WRAPPER_PINNED_SHA_MISMATCH');
    const wb=new Set(wrapper.target_engine_bindings??[]);if((row.target_engine_bindings??[]).some(x=>!wb.has(x)))blockers.push('WRAPPER_BINDING_COVERAGE_INCOMPLETE');
  }
  const eligible=blockers.length===0;
  const allowedModes=eligible?[...SAFE_OPERATIONAL_MODES].filter(x=>wrapper.supported_modes.includes(x)):[];
  return Object.freeze({candidate_id:row?.candidate_id??null,alias_es:row?.alias_es??null,technical_name:row?.technical_name??null,target_engine_bindings:Object.freeze([...(row?.target_engine_bindings??[])]),source_kind:row?.source_kind??null,capability_contracts:Object.freeze([...(row?.capability_contracts??[])]),source_locator:row?.source_locator??null,pinned_sha:row?.pinned_sha??null,eligible,status:eligible?OPERATIONAL_STATE:'HOLD_PROD_OPERATIONAL',blockers:Object.freeze(blockers),readonly_canary_evidence:row?.canary_evidence??null,capability_mode:eligible?'INTERNAL_GOVERNED_EXECUTABLE_WRAPPER_NO_EXTERNAL_SIDE_EFFECTS':'DISABLED',wrapper_id:eligible?wrapper.wrapper_id:null,wrapper_ref:eligible?wrapper.wrapper_ref:null,wrapper_export:eligible?wrapper.export_name:null,allowed_modes:Object.freeze(allowedModes),authority:Object.freeze({prod_capability_operational:eligible,direct_prod_write_authorized:false,direct_prod_mutation_authorized:false,external_side_effects_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,trading_access:false,spend_authorized:false,additional_cost_eur:0,action_authority_source:'ORIGIN_ENGINE_GOVERNED_POLICY_ONLY'})});
}

export function buildProdOperationalFastLane({wrapperRegistryFile=DEFAULT_WRAPPERS,...options}={}){
  const readonly=buildProdCapabilityFastLane(options);const wrappers=loadWrapperMap(wrapperRegistryFile);
  const evaluated=(readonly.available??[]).map(row=>evaluateProdOperationalCandidate(row,wrappers.get(row.candidate_id)??null));const available=evaluated.filter(x=>x.eligible);
  return Object.freeze({schema_version:'1.1.0',state_type:'CEREBRO_SKILL_PROD_OPERATIONAL_FAST_LANE_V1',company_id:'GLOBAL',engine_id:'FACT-001',environment:'PROD_CAPABILITY',version:'1.1.0',status:available.length?'GREEN_PROD_OPERATIONAL_INTERNAL_CAPABILITY_SET':'NO_ELIGIBLE_OPERATIONAL_CAPABILITIES',policy:Object.freeze({source_requires_green_prod_readonly_fastlane:true,executable_internal_wrapper_required:true,internal_execution_enabled:true,external_side_effects_authorized:false,direct_prod_write_authorized:false,direct_prod_mutation_authorized:false,origin_engine_policy_controls_external_actions:true,human_required_only_canonical_reasons:true,trading_access:false,additional_cost_budget_eur:0}),available_count:available.length,dynamic_available_count:available.filter(x=>x.source_kind==='DYNAMIC_ADOPTION').length,available:Object.freeze(available),evaluated:Object.freeze(evaluated)});
}

export function resolveProdOperationalSkillCapability({candidate_id,engine_id,requested_mode='ANALYZE',...options}={}){
  const report=buildProdOperationalFastLane(options);const row=report.available.find(x=>x.candidate_id===candidate_id);
  if(!row)return Object.freeze({allowed:false,status:'DENY_NOT_PROD_OPERATIONAL',candidate_id,engine_id,requested_mode});
  if(!row.target_engine_bindings.includes(engine_id))return Object.freeze({allowed:false,status:'DENY_ENGINE_BINDING_MISMATCH',candidate_id,engine_id,requested_mode});
  if(!row.allowed_modes.includes(requested_mode))return Object.freeze({allowed:false,status:'DENY_MODE_NOT_SAFE_OPERATIONAL',candidate_id,engine_id,requested_mode});
  const contracts=row.source_kind==='DYNAMIC_ADOPTION'?row.capability_contracts.map(cap=>({...cap,domains:(cap.domains??[]).filter(d=>(d.engine_bindings??[]).includes(engine_id))})).filter(cap=>cap.domains.length):[];
  return Object.freeze({allowed:true,status:OPERATIONAL_STATE,candidate_id,technical_name:row.technical_name,engine_id,requested_mode,capability_mode:row.capability_mode,source_kind:row.source_kind,capability_contracts:Object.freeze(contracts),source_locator:row.source_locator,pinned_sha:row.pinned_sha,readonly_canary_evidence:row.readonly_canary_evidence,wrapper_id:row.wrapper_id,wrapper_ref:row.wrapper_ref,wrapper_export:row.wrapper_export,prod_capability_operational:true,direct_prod_write_authorized:false,direct_prod_mutation_authorized:false,external_side_effects_authorized:false,external_skill_code_execution:false,trading_access:false,spend_authorized:false,additional_cost_eur:0,action_authority_source:'ORIGIN_ENGINE_GOVERNED_POLICY_ONLY'});
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){const report=buildProdOperationalFastLane();const text=`${JSON.stringify(report,null,2)}\n`;const out=arg('--output');if(out){fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,text,'utf8');}process.stdout.write(text);}
