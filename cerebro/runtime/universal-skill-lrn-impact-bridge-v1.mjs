import crypto from 'node:crypto';
import {normalizeEvent,observeOutcome,createEvidence,proposeCandidate} from './learning-pipeline.mjs';
import {LearningLedgerV0} from './learning-ledger.mjs';
import {buildVersionedImprovementCandidate,ImprovementCandidateLedgerV0} from './improvement-candidate-factory.mjs';

const PREPROD='PREPROD';
const PERSISTENCE_SCOPE='LOCAL_PREPROD_LRN_LEDGER_ONLY';

function req(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim();}
function stable(value){if(value===null||typeof value!=='object')return value;if(Array.isArray(value))return value.map(stable);return Object.fromEntries(Object.keys(value).sort().map((key)=>[key,stable(value[key])]));}
function hash(value){return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');}
function avg(values){if(!values.length)return 0;return Number((values.reduce((sum,value)=>sum+Number(value),0)/values.length).toFixed(6));}
function authority(){return {prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,dependency_install_authorized:false,customer_data_used:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0};}
function eligibleReceipt(receipt){return receipt?.status==='PASS'&&receipt?.real_consumption===true&&receipt?.meaningful_change===true&&receipt?.old_vs_new?.decision==='PASS'&&Number(receipt?.candidate_coverage)>Number(receipt?.baseline_coverage)&&receipt?.engine_id;}
function groupByEngine(receipts){const groups=new Map();for(const receipt of receipts.filter(eligibleReceipt)){const engine=req(receipt.engine_id,'receipt.engine_id');if(!groups.has(engine))groups.set(engine,[]);groups.get(engine).push(receipt);}return groups;}
function evidenceRefs({report,receipts,source_locator}){return [...new Set([`skill:${report.candidate_id}`,`binding:${report.binding_id}`,`tribunal:${report.independent_tribunal?.decision??'UNKNOWN'}`,`source:${source_locator}`,...receipts.flatMap((receipt)=>Array.isArray(receipt.evidence_refs)?receipt.evidence_refs:[]),...receipts.map((receipt)=>`binding-outcome:${receipt.outcome_hash}`)])].sort();}
function buildLearning({report,engine_id,receipts,skill_version,source_locator,observed_at}){
  const oldScore=avg(receipts.map((receipt)=>receipt.baseline_coverage));
  const newScore=avg(receipts.map((receipt)=>receipt.candidate_coverage));
  if(!(newScore>oldScore))throw new Error(`NON_IMPROVING_ENGINE_BINDING:${engine_id}`);
  const receiptFingerprint=hash(receipts.map((receipt)=>({capability_id:receipt.capability_id,domain_id:receipt.domain_id,engine_id:receipt.engine_id,outcome_hash:receipt.outcome_hash})).sort((a,b)=>`${a.capability_id}:${a.domain_id}`.localeCompare(`${b.capability_id}:${b.domain_id}`)));
  const event=normalizeEvent({
    event_id:`evt:skill-impact:${hash({company_id:report.company_id,candidate_id:report.candidate_id,skill_version,engine_id,receiptFingerprint}).slice(0,24)}`,
    company_id:report.company_id,engine_id,environment:PREPROD,version:skill_version,occurred_at:observed_at,source_type:'ENGINE_RESULT',
    payload:{metric:'semantic_binding_coverage',skill_candidate_id:report.candidate_id,skill_version,binding_id:report.binding_id,baseline_score:oldScore,candidate_score:newScore,receipt_count:receipts.length,tribunal_decision:report.independent_tribunal.decision},
    evidence_refs:evidenceRefs({report,receipts,source_locator})
  });
  const outcome=observeOutcome({event,expected:oldScore,actual:newScore,observed_at});
  const evidence=createEvidence({outcome,refs:event.evidence_refs,confidence:0.99,provenance:{source:'UNIVERSAL_SKILL_REAL_BINDING',binding_id:report.binding_id,skill_candidate_id:report.candidate_id,skill_version,engine_id,tribunal_decision:report.independent_tribunal.decision,old_vs_new:'PASS'}});
  const proposed=proposeCandidate({event,outcome,evidence,hypothesis:`Skill ${report.candidate_id}@${skill_version} measurably improves governed semantic coverage for ${engine_id} without authority expansion.`,expected_metric_delta:{name:'semantic_binding_coverage',direction:'HIGHER',measurement:'CONTROLLED_OLD_VS_NEW'},risk_class:'LOW',created_by:'LRN-001',reason:'UNIVERSAL_SKILL_MEASURED_ENGINE_OUTCOME'});
  return Object.freeze({...proposed,source_version:skill_version,source_environment:PREPROD,persistent_publish_authorized:true,persistence_scope:PERSISTENCE_SCOPE});
}

export function runUniversalSkillLrnImpactBridge({binding_report,skill_version,source_locator,observed_at,learning_ledger_file,candidate_ledger_file}={}){
  const report=binding_report;
  const version=req(skill_version,'skill_version');const source=req(source_locator,'source_locator');const observed=req(observed_at,'observed_at');
  if(!report||report.state_type!=='CEREBRO_UNIVERSAL_SKILL_REAL_BINDING_REPORT_V1')throw new Error('UNIVERSAL_SKILL_REAL_BINDING_REPORT_REQUIRED');
  if(report.environment!==PREPROD||report.full_safe_preprod!==true||report.prod_authorized!==false||report.prod_write_authorized!==false||report.trading_access!==false||Number(report.additional_cost_eur)!==0)throw new Error('SAFE_FULL_PREPROD_BINDING_REQUIRED');
  if(report.independent_tribunal?.decision!=='PASS'||report.per_binding_old_vs_new_pass!==true)throw new Error('OLD_NEW_TRIBUNAL_PASS_REQUIRED');
  const groups=groupByEngine(report.semantic_bindings??[]);if(groups.size===0)throw new Error('NO_MEASURED_ENGINE_IMPROVEMENTS');
  const learningLedger=new LearningLedgerV0({file_path:req(learning_ledger_file,'learning_ledger_file'),environment:PREPROD});
  const candidateLedger=new ImprovementCandidateLedgerV0({file_path:req(candidate_ledger_file,'candidate_ledger_file')});
  const rows=[];
  for(const engine_id of [...groups.keys()].sort()){
    const receipts=groups.get(engine_id);const learning=buildLearning({report,engine_id,receipts,skill_version:version,source_locator:source,observed_at:observed});
    const learningPersist=learningLedger.persist(learning);const built=buildVersionedImprovementCandidate(learning);if(!built.ok)throw new Error(`IMPROVEMENT_CANDIDATE_BUILD_FAILED:${engine_id}:${built.reasons.join(',')}`);
    const candidatePersist=candidateLedger.persist(built.candidate);
    rows.push(Object.freeze({engine_id,skill_version:version,receipt_count:receipts.length,learning_id:learning.learning_id,learning_accepted:learningPersist.accepted,learning_duplicate:learningPersist.duplicate,improvement_candidate_id:built.candidate.candidate_id,candidate_accepted:candidatePersist.accepted,candidate_duplicate:candidatePersist.duplicate,next_gate:built.candidate.next_gate,baseline_version:built.candidate.baseline_version,candidate_version:built.candidate.candidate_version,source_old_vs_new:'PASS',source_tribunal:'PASS',...authority()}));
  }
  const green=rows.length===groups.size&&rows.every((row)=>row.next_gate==='OLD_VS_NEW_EXPERIMENT'&&row.source_old_vs_new==='PASS'&&row.source_tribunal==='PASS');
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_UNIVERSAL_SKILL_LRN_IMPACT_BRIDGE_V1',status:green?'LRN_IMPACT_GREEN_PREPROD':'LRN_IMPACT_HOLD',company_id:report.company_id,engine_id:'LRN-001',environment:PREPROD,version:'1.0.0',skill_candidate_id:report.candidate_id,skill_version:version,binding_id:report.binding_id,engines_total:groups.size,learning_new:rows.filter((row)=>row.learning_accepted).length,learning_duplicates:rows.filter((row)=>row.learning_duplicate).length,candidates_new:rows.filter((row)=>row.candidate_accepted).length,candidate_duplicates:rows.filter((row)=>row.candidate_duplicate).length,learning_ledger_operations:learningLedger.operation_count,candidate_ledger_operations:candidateLedger.operation_count,rows:Object.freeze(rows),next_gate:'OLD_VS_NEW_EXPERIMENT',...authority()});
}

export const UNIVERSAL_SKILL_LRN_IMPACT_BRIDGE_V1_CONTRACT=Object.freeze({environment:PREPROD,source_gate:'FULL_SAFE_PREPROD_AND_OLD_NEW_AND_TRIBUNAL_PASS',granularity:'ONE_LEARNING_AND_IMPROVEMENT_CANDIDATE_PER_COMPANY_SKILL_VERSION_ENGINE',learning_persistence:'LearningLedgerV0',candidate_persistence:'ImprovementCandidateLedgerV0',duplicate_policy:'STABLE_CONTENT_VERSION_ENGINE_IDS',prod_writes:false,autonomous_prod:false,trading_access:false,additional_cost_target_eur:0});
