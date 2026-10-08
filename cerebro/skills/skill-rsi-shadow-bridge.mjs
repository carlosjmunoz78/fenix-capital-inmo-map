import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {EventBus} from '../runtime/runtime.mjs';
import {RSI_RECOVERY_SOURCE,validateLearningRecord} from '../runtime/continuous-improvement-contract.mjs';

const RSI_COMPATIBILITY_TARGET=Object.freeze({
  pull_request:416,
  branch:'cerebro-rsi-continuous-improvement-loop-v0-20260919',
  head_sha:'a79d51dccb794ab0718d6959554185bfab3ca0b4',
  historical_contract_path:'cerebro/runtime/continuous-improvement-contract.mjs',
  historical_contract_blob_sha:'ba0021a2801cd550cc5cf7d9bbb34b31d550d378',
  recovered_contract_source:RSI_RECOVERY_SOURCE,
  validator_mode:'CANONICAL_RECOVERED_CONTRACT'
});

function stableId(prefix,value){return `${prefix}:${createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,24)}`;}
function evidenceRefs(event){
  const e=event?.evidence_ref??{};
  const refs=[];
  if(e.source_ref) refs.push(`source:${e.source_ref}`);
  if(e.upstream_full_name) refs.push(`upstream:${e.upstream_full_name}${e.upstream_head_commit?`@${e.upstream_head_commit}`:''}`);
  if(e.manifest_path) refs.push(`manifest:${e.manifest_path}${e.manifest_sha256?`#${e.manifest_sha256}`:''}`);
  return refs.length?refs:[`event:${event?.event_id??'unknown'}`];
}

function riskFor(event){
  if(event?.event_type==='SECURITY_ADVISORY') return event.severity==='HIGH'?'HIGH':'MEDIUM';
  if(event?.event_type==='SKILL_CANDIDATE_STATIC_LAB_GREEN') return 'LOW';
  if(event?.event_type==='SKILL_CANDIDATE_STATIC_LAB_HOLD') return 'MEDIUM';
  if(event?.event_type==='CAPABILITY_GAP_DETECTED') return 'MEDIUM';
  if(event?.event_type?.includes('LICENSE')||event?.event_type?.includes('PERMISSION')) return 'MEDIUM';
  return 'LOW';
}

function confidenceFor(event){
  if(event?.event_type==='SKILL_CANDIDATE_STATIC_LAB_GREEN') return 0.85;
  if(event?.event_type==='SECURITY_ADVISORY') return 0.9;
  if(event?.event_type==='SKILL_CANDIDATE_STATIC_LAB_HOLD') return 0.7;
  if(event?.event_type==='CAPABILITY_GAP_DETECTED') return 0.65;
  if(event?.event_type==='SKILL_CANDIDATE_LOW_OPERATIONAL_FIT') return 0.8;
  return 0.7;
}

function hypothesisFor(event){
  switch(event?.event_type){
    case 'SKILL_CANDIDATE_STATIC_LAB_GREEN': return `Candidate ${event.candidate_id} may improve or safely augment ${event.payload?.domain??'an existing capability'} and merits behavioral OLD-vs-NEW evaluation.`;
    case 'SKILL_CANDIDATE_STATIC_LAB_HOLD': return `Candidate ${event.candidate_id} has potential value but must not advance until policy or coverage concerns are resolved.`;
    case 'SKILL_CANDIDATE_LOW_OPERATIONAL_FIT': return `Candidate ${event.candidate_id} is a likely false-positive discovery and should be deprioritized to improve scout precision.`;
    case 'CAPABILITY_GAP_DETECTED': return `A capability gap may exist for ${event.payload?.top_domain??'an uncovered domain'} and should be validated before FACT-001 creates anything new.`;
    case 'SECURITY_ADVISORY': return `Observed skill evidence indicates a security or supply-chain risk that should tighten candidate policy or quarantine rules.`;
    case 'SKILL_LICENSE_REVIEW_REQUIRED': return `License evidence is insufficient for adoption and should remain reference-only until compatibility is resolved.`;
    case 'SKILL_PERMISSION_REVIEW_REQUIRED': return `Permission requirements may exceed least privilege and should be reduced or rejected before LAB execution.`;
    default: return `Skill supply-chain event ${event?.event_type??'UNKNOWN'} should be evaluated as a controlled improvement candidate.`;
  }
}

export function validateRsiCompatibleLearningRecord(record){
  return validateLearningRecord(record);
}

function toLearningRecord(event,runtimeEvent,{observedAt}){
  return {
    learning_id:stableId('learn',[event.event_id,event.candidate_id,event.event_type]),
    company_id:event.company_id||'GLOBAL_ONLY',
    engine_id:event.engine_id||'FACT-001',
    environment:'LAB',
    version:event.version||'0.1.0',
    source_event_ids:[runtimeEvent.event_id],
    source_type:'SKILL_SUPPLY_CHAIN',
    observed_at:observedAt,
    hypothesis:hypothesisFor(event),
    expected_metric_delta:{metric:event.event_type==='SECURITY_ADVISORY'?'risk':'capability_quality',direction:event.event_type==='SECURITY_ADVISORY'?'LOWER':'HIGHER',measurement:'BEHAVIORAL_LAB_OR_POLICY_REVIEW_REQUIRED'},
    confidence:confidenceFor(event),
    risk_class:riskFor(event),
    evidence_refs:evidenceRefs(event),
    promotion_state:'CANDIDATE',
    created_by:'cap:skill-supply-chain',
    reason:event.reason||event.event_type,
    candidate_id:event.candidate_id??null,
    target_engine_bindings:[...(event.target_engine_bindings??[])],
    source_event_type:event.event_type,
    judge_decision:null
  };
}

export function buildRsiShadowBridge(eventReport,{observedAt=new Date().toISOString(),eventBus=new EventBus()}={}){
  const runtimeEvents=[];
  const learningRecords=[];
  const validationErrors=[];
  for(const proposal of eventReport?.events??[]){
    const context={company_id:proposal.company_id||'GLOBAL_ONLY',engine_id:proposal.engine_id||'FACT-001',environment:'LAB',version:proposal.version||'0.1.0'};
    const published=eventBus.publish({
      type:proposal.event_type,
      context,
      idempotency_key:proposal.event_id,
      payload:{candidate_id:proposal.candidate_id??null,severity:proposal.severity??'INFO',reason:proposal.reason??null,evidence_ref:proposal.evidence_ref??null,payload:proposal.payload??{},target_engine_bindings:proposal.target_engine_bindings??[]}
    });
    if(!published.accepted){
      runtimeEvents.push({proposal_event_id:proposal.event_id,accepted:false,duplicate:true,idempotency_key:published.idempotency_key});
      continue;
    }
    runtimeEvents.push({proposal_event_id:proposal.event_id,accepted:true,duplicate:false,runtime_event:published.event});
    const learning=toLearningRecord(proposal,published.event,{observedAt});
    const check=validateRsiCompatibleLearningRecord(learning);
    if(check.ok) learningRecords.push(learning);
    else validationErrors.push({proposal_event_id:proposal.event_id,errors:check.errors});
  }
  return Object.freeze({
    schema_version:'0.2.0',
    execution_mode:'SHADOW_IN_MEMORY_ONLY',
    compatibility_target:RSI_COMPATIBILITY_TARGET,
    runtime_contract:'RUNTIME-001/EventBus main + recovered continuous-improvement-contract',
    source_events_total:eventReport?.events?.length??0,
    runtime_events_accepted:runtimeEvents.filter(x=>x.accepted).length,
    runtime_duplicates:runtimeEvents.filter(x=>x.duplicate).length,
    learning_candidates_valid:learningRecords.length,
    learning_candidates_invalid:validationErrors.length,
    bridge_status:validationErrors.length?'SHADOW_BRIDGE_PARTIAL':'SHADOW_BRIDGE_GREEN',
    persistent_publish_authorized:false,
    rsi_publish_authorized:false,
    prod_authorized:false,
    prod_write_authorized:false,
    permissions_elevated:false,
    budget_elevated:false,
    runtime_events:runtimeEvents,
    learning_candidates:learningRecords,
    validation_errors:validationErrors
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const events=JSON.parse(fs.readFileSync(argValue('--events')??'artifacts/cerebro-skill-improvement-events.json','utf8'));
  const output=argValue('--output')??'artifacts/cerebro-skill-rsi-shadow.json';
  const report=buildRsiShadowBridge(events);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,bridge_status:report.bridge_status,source_events_total:report.source_events_total,runtime_events_accepted:report.runtime_events_accepted,learning_candidates_valid:report.learning_candidates_valid,persistent_publish_authorized:false,rsi_publish_authorized:false,prod_authorized:false}));
}
