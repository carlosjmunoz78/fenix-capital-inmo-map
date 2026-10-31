#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {resolveQaSource} from './source-resolver-v0.mjs';

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null}
function req(v,l){if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);return v.trim()}
function read(file){return JSON.parse(fs.readFileSync(file,'utf8'))}

function improvementByLearningId(improvements){
  const map=new Map();
  for(const item of improvements?.candidates??[]){
    const id=String(item.improvement_id??'');
    if(id.startsWith('qa-imp:')) map.set(`qa-learning:${id.slice('qa-imp:'.length)}`,item);
  }
  return map;
}

function defaultTarget(owner){
  if(owner==='APP-001'||owner==='HCI-001') return 'APP:UNKNOWN';
  if(owner==='WEB-001'||owner==='SEO-001'||owner==='MKT-001') return 'WEB:UNKNOWN';
  if(owner==='QAB-001') return 'PRODUCT:PREPROD';
  return 'GLOBAL';
}

export function buildSourceMappingState({improvements={},remediation={},healing={},now=new Date().toISOString()}={}){
  if(remediation?.state_type!=='CEREBRO_QA_AUTONOMOUS_REMEDIATION_STATE_V0') throw new Error('verified remediation state required');
  if(healing?.state_type!=='CEREBRO_SELF_HEALING_PLAN_BATCH_V0') throw new Error('verified healing plan batch required');
  const cases=new Map((remediation.cases??[]).map(x=>[x.case_id,x]));
  const improvementsByLearning=improvementByLearningId(improvements);
  const mappings=[];
  for(const plan of healing.plans??[]){
    if(plan.status!=='PLAN_READY') continue;
    const c=cases.get(plan.case_id)??{};
    const improvement=improvementsByLearning.get(c.source_learning_id);
    const target=improvement?.target??defaultTarget(plan.owner_engine);
    const dimension=improvement?.dimension??(c.source==='BUG'?'bug_repair':'unknown');
    const localizationEvidence=Array.isArray(improvement?.localization_evidence)?improvement.localization_evidence:[];
    const resolved=resolveQaSource({target,dimension,owner_engine:plan.owner_engine,localization_evidence:localizationEvidence});
    mappings.push({
      repair_id:plan.repair_id,
      case_id:plan.case_id,
      source:c.source??plan.source??'UNKNOWN',
      owner_engine:plan.owner_engine,
      target,
      dimension,
      improvement_id:improvement?.improvement_id??null,
      expected_metric_delta:improvement?.expected_metric_delta??null,
      localization_status:resolved.localization_status??'POR_AUDITAR',
      resolution:resolved,
      execution_authority:{code_mutation_authorized:false,preprod_only:true,auto_merge:false,prod_write_authorized:false}
    });
  }
  return {
    schema_version:'0.2.0',state_type:'CEREBRO_QA_SOURCE_MAPPING_STATE_V0',company_id:remediation.company_id??'fenix',engine_id:'QA-001',environment:'PREPROD_CONTROL_PLANE',version:'0.2.0',updated_at:now,
    mappings_total:mappings.length,
    verified_repo_hints:mappings.filter(x=>x.resolution.status==='SOURCE_HINT_VERIFIED').length,
    localized_element_samples:mappings.reduce((sum,x)=>sum+(x.resolution.localization_evidence?.length??0),0),
    external_owner_routes:mappings.filter(x=>x.resolution.status==='EXTERNAL_SURFACE_OWNER_VERIFIED').length,
    por_auditar:mappings.filter(x=>String(x.resolution.status).startsWith('POR_AUDITAR')).length,
    mappings,
    next_gate:'AUTO001_CERTIFIED_TRANSFORM_LOCALIZATION',
    safety:{prod_write:false,customer_data:false,trading:false,paid_fallback:false,additional_subscription_eur:0}
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const improvements=req(arg('--improvements'),'--improvements');
  const remediation=req(arg('--remediation'),'--remediation');
  const healing=req(arg('--healing'),'--healing');
  const out=req(arg('--out'),'--out');
  const state=buildSourceMappingState({improvements:read(improvements),remediation:read(remediation),healing:read(healing)});
  fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(state,null,2)+'\n');
  console.log(JSON.stringify({status:'SOURCE_MAPPING_READY',mappings:state.mappings_total,repo_hints:state.verified_repo_hints,localized_element_samples:state.localized_element_samples,external_routes:state.external_owner_routes,por_auditar:state.por_auditar,cost_eur:0}));
}
