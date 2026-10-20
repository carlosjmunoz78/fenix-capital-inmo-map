#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {validateSafeAutoloopState} from '../skills/skill-autoloop-controller.mjs';
import {reconcileSafeHandlerResult} from '../skills/skill-autoloop-safe-handler.mjs';

const PREPROD='PREPROD';
const VERSION='1.0.0';
const SAFE_ENGINEERING_STATUS='SAFE_ENGINEERING_REQUIRED';
const SYNTHETIC_REASON=/^AUTO_ENGINEERING_NOT_FULL(?::|$)/;
const FORBIDDEN_TRUE_FLAGS=[
  'prod_authorized','prod_write_authorized','prod_mutation_authorized','permission_expansion_authorized',
  'external_skill_code_execution','dependency_install_authorized','customer_data_used','paid_fallback',
  'spend_authorized','trading_access'
];

function clone(value){return JSON.parse(JSON.stringify(value??{}));}
function stable(value){if(value===null||typeof value!=='object')return value;if(Array.isArray(value))return value.map(stable);return Object.fromEntries(Object.keys(value).sort().map((key)=>[key,stable(value[key])]));}
function hash(value){return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');}
function text(value){return typeof value==='string'&&value.trim()?value.trim():null;}
function uniq(values){return [...new Set((Array.isArray(values)?values:[]).filter((value)=>text(value)).map((value)=>value.trim()))].sort();}
function authorityGreen(row){return FORBIDDEN_TRUE_FLAGS.every((key)=>row?.[key]!==true)&&Number(row?.additional_cost_eur??0)===0;}
function capabilityBindings(row){const nested=[];for(const capability of row?.capability_contracts??[])for(const domain of capability?.domains??[])nested.push(...(domain?.engine_bindings??[]));return uniq([...(row?.target_engine_bindings??[]),...nested]);}
function technicalName(row){return text(row?.technical_name)??text(row?.priority_seed_technical_name)??text(row?.github_url)?.split('/').filter(Boolean).at(-1)??'unknown-skill';}
function sourceIdentity(row){return {company_id:text(row?.company_id)??'fenix',github_url:text(row?.github_url),source_locator:text(row?.source_locator),pinned_sha:text(row?.pinned_sha),snapshot_sha256:text(row?.snapshot_sha256),manifest_sha256:text(row?.manifest_sha256),technical_name:technicalName(row)};}
function candidateId(row){return text(row?.candidate_id)??`source-engineering:${hash(sourceIdentity(row)).slice(0,28)}`;}
function skillVersion(row){const sha=text(row?.pinned_sha);return sha&&/^[a-f0-9]{40}$/i.test(sha)?`github-${sha.toLowerCase().slice(0,12)}`:`source-${hash(sourceIdentity(row)).slice(0,12)}`;}
function isEngineeringIncomplete(row){return row?.full_safe_preprod!==true&&row?.source_status==='ENGINEERING_TASK_REQUIRED'&&SYNTHETIC_REASON.test(String(row?.reason??''));}
function admissionDecision(row){return capabilityBindings(row).length?'ENVOLVER':'FABRICAR_GRATIS';}

export function normalizeSkillSourceQueueReport(queueReport){
  if(!queueReport||typeof queueReport!=='object'||!Array.isArray(queueReport.results))throw new Error('SOURCE_QUEUE_REPORT_REQUIRED');
  const results=queueReport.results.map((row)=>{
    if(!isEngineeringIncomplete(row))return Object.freeze({...row});
    if(!authorityGreen(row))return Object.freeze({...row,status:'REJECTED',human_required:null,admission_status:'POLICY_REJECTED',admission_reason:'SAFE_ENGINEERING_AUTHORITY_BOUNDARY_VIOLATION'});
    const decision=admissionDecision(row);
    return Object.freeze({...row,status:SAFE_ENGINEERING_STATUS,human_required:null,admission_status:SAFE_ENGINEERING_STATUS,admission_decision:decision,synthetic_low_confidence_removed:row?.status==='HUMAN_REQUIRED'&&row?.human_required==='LOW_CONFIDENCE'});
  });
  const byStatus={};for(const row of results)byStatus[row.status]=(byStatus[row.status]??0)+1;
  const out={...queueReport,state_type:'CEREBRO_UNIVERSAL_SKILL_SOURCE_QUEUE_ADMISSION_REPORT_V1',schema_version:'1.0.0',results:Object.freeze(results),by_status:Object.freeze(byStatus),safe_engineering_required:results.filter((row)=>row.status===SAFE_ENGINEERING_STATUS).length,source_report_hash:queueReport.report_hash??null,prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,external_skill_code_execution:false,trading_access:false,additional_cost_eur:0};
  return Object.freeze({...out,admission_report_hash:hash(out)});
}

function alreadyKnown(state,id){
  return ['waiting_human','waiting_safe_handler','in_flight','completed','terminal_hold','autonomy_action_ledger','autonomy_action_handoffs'].some((bucket)=>Object.prototype.hasOwnProperty.call(state?.[bucket]??{},id));
}

export function applySafeEngineeringAdmissions({state,queue_report,now=new Date().toISOString(),source_run_id=null,max_admissions=1}={}){
  const initial=validateSafeAutoloopState(state);if(!initial.green)throw new Error(`AUTOLOOP_STATE_UNSAFE:${initial.errors.join(',')}`);
  if(!Number.isInteger(max_admissions)||max_admissions<1||max_admissions>25)throw new Error('max_admissions must be 1..25');
  const normalized=normalizeSkillSourceQueueReport(queue_report);
  let out=clone(state);out.processed_candidate_ids=Array.isArray(out.processed_candidate_ids)?[...out.processed_candidate_ids]:[];
  const admissions=[];let admitted=0;
  for(const row of normalized.results){
    if(row.status!==SAFE_ENGINEERING_STATUS)continue;
    if(admitted>=max_admissions){admissions.push({candidate_id:candidateId(row),technical_name:technicalName(row),status:'DEFERRED_SAFE_ENGINEERING',decision:row.admission_decision,human_required:null});continue;}
    const id=candidateId(row);
    if(alreadyKnown(out,id)){admissions.push({candidate_id:id,technical_name:technicalName(row),status:'IDEMPOTENT_ALREADY_RECORDED',decision:row.admission_decision,human_required:null});continue;}
    const bindings=capabilityBindings(row);const decision=bindings.length?'ENVOLVER':'FABRICAR_GRATIS';
    const decisionId=`skill-decision:${hash({id,decision,source:sourceIdentity(row),bindings}).slice(0,24)}`;
    out.waiting_safe_handler=out.waiting_safe_handler??{};
    out.waiting_safe_handler[id]={
      candidate_id:id,company_id:text(row.company_id)??'fenix',name:technicalName(row),human_alias:technicalName(row),
      wrapper_id:`safe-engineering:${hash({id,bindings}).slice(0,20)}`,domain:'universal-skill-engineering',engine_bindings:bindings,
      value_score:null,recommendation:SAFE_ENGINEERING_STATUS,evidence_refs:{github_url:row.github_url??null,source_locator:row.source_locator??null,pinned_sha:row.pinned_sha??null,snapshot_sha256:row.snapshot_sha256??null,manifest_sha256:row.manifest_sha256??null,source_status:row.source_status??null,reason:row.reason??null},
      stage:'SOURCE_ENGINEERING_ADMISSION',status:'WAITING_SAFE_HANDLER',source_discovery_run_id:source_run_id,checkpointed_at:now,
      human_required:null,external_skill_code_execution:false,customer_data_used:false,prod_write:false,trading_access:false,paid_fallback:false,additional_cost_eur:0
    };
    if(!out.processed_candidate_ids.includes(id))out.processed_candidate_ids.push(id);
    const evidence={
      reason:'AUTO_ENGINEERING_INCOMPLETE_IS_TECHNICAL_WORK',decision_id:decisionId,decision,skill_version:skillVersion(row),human_required:null,
      source_status:row.source_status,source_reason:row.reason,source_queue_status:row.status,synthetic_low_confidence_removed:row.synthetic_low_confidence_removed===true,
      preprod_internal_wrapper_activation_authorized:false,factory_candidate_authorized:decision==='FABRICAR_GRATIS',factory_create_authorized:false,
      additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false,external_skill_code_execution_authorized:false
    };
    out=clone(reconcileSafeHandlerResult(out,id,{outcome:'AUTONOMOUS_PREPROD_DECISION',evidence,now}));
    admissions.push({candidate_id:id,technical_name:technicalName(row),status:'ADMITTED_TO_SAFE_ACTION_QUEUE',decision,decision_id:decisionId,action_type:out.completed?.[id]?.action_type??null,action_status:out.completed?.[id]?.action_status??null,human_required:null});
    admitted+=1;
  }
  const finalSafety=validateSafeAutoloopState(out);if(!finalSafety.green)throw new Error(`AUTOLOOP_STATE_UNSAFE_AFTER_ENGINEERING_ADMISSION:${finalSafety.errors.join(',')}`);
  const report={schema_version:'1.0.0',state_type:'CEREBRO_SAFE_ENGINEERING_ADMISSION_V1',status:'GREEN',environment:PREPROD,version:VERSION,source_run_id,engineering_candidates:normalized.safe_engineering_required,admitted,deferred:admissions.filter((row)=>row.status==='DEFERRED_SAFE_ENGINEERING').length,idempotent:admissions.filter((row)=>row.status==='IDEMPOTENT_ALREADY_RECORDED').length,queue_depth:Object.keys(out.autonomy_action_queue??{}).length,admissions:Object.freeze(admissions),human_required:null,prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,external_skill_code_execution:false,trading_access:false,additional_cost_eur:0};
  return Object.freeze({state:Object.freeze(out),normalized_report:normalized,report:Object.freeze({...report,report_hash:hash(report)})});
}

function argValue(name){const index=process.argv.indexOf(name);return index>=0?process.argv[index+1]:null;}
function load(file){if(!file||!fs.existsSync(file))throw new Error(`missing file:${file}`);return JSON.parse(fs.readFileSync(file,'utf8'));}
function write(file,value){fs.mkdirSync(path.dirname(path.resolve(file)),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}

if(import.meta.url===`file://${process.argv[1]}`){
  const queuePath=argValue('--queue-report');if(!queuePath)throw new Error('REQUIRED: --queue-report');
  const reportOutput=argValue('--report-output')??'artifacts/safe-engineering-admission.json';
  const normalized=normalizeSkillSourceQueueReport(load(queuePath));
  if(process.argv.includes('--normalize-only')){
    write(reportOutput,normalized);
    console.log(JSON.stringify({status:'NORMALIZED_GREEN',safe_engineering_required:normalized.safe_engineering_required,human_required:false,prod_authorized:false,additional_cost_eur:0}));
  }else{
    const statePath=argValue('--state');const stateOutput=argValue('--state-output')??'artifacts/state.after-safe-engineering-admission.json';if(!statePath)throw new Error('REQUIRED: --state');
    const sourceRunId=argValue('--source-run-id');const maxAdmissions=Number(argValue('--max-admissions')??1);
    const result=applySafeEngineeringAdmissions({state:load(statePath),queue_report:normalized,source_run_id:sourceRunId?Number(sourceRunId):null,max_admissions:maxAdmissions});
    write(stateOutput,result.state);write(reportOutput,result.report);
    const normalizedOutput=argValue('--normalized-output');if(normalizedOutput)write(normalizedOutput,result.normalized_report);
    console.log(JSON.stringify({status:result.report.status,engineering_candidates:result.report.engineering_candidates,admitted:result.report.admitted,deferred:result.report.deferred,queue_depth:result.report.queue_depth,human_required:null,prod_authorized:false,additional_cost_eur:0}));
  }
}
