/**
 * JARVIS CUT56 -> CEREBRO LRN-001 SAFE HANDOFF
 * Pure adapter. Does NOT bind to a live LRN writer or FACT-001, nor call APIs.
 * Quarantines rejected proposals and only signals review requirements.
 * A model, PR author or client cannot turn these records into release grants.
 */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const CONTRACT=Object.freeze({
  source:'JARVIS_CUT56_SEMANTIC_VETO',
  target_engine_id:'LRN-001',
  company_id:'fenix',
  environment:'LAB',
  source_run_id:'42383414151',
  expected_sha256:'975c1c49904acea2a12e1c61d538d305bebe9b6956bf7c00e4939bf3156677d2',
  supported_version:'CUT56-v0.1.0',
  allowed_reasons:[
    'HUMAN_ESCALATION_WITHOUT_EXCEPTION',
    'AMBIGUITY_ESCALATED_WITHOUT_EXCEPTION',
    'UNCONDITIONAL_HUMAN_PROMOTION_GATE',
    'EXECUTIVE_SENOR_PROTOCOL_MISSING',
    'ARBITRARY_90_DAY_EXPIRY',
    'UNCONDITIONAL_MEMORY_APPROVAL',
    'NO_ALTERNATIVE_EXECUTION_ROUTE',
    'DETERMINISTIC_ROUTING_MISSING',
    'PRESERVATION_GATES_MISSING',
    'NON_JARVIS_FAMILIARITY',
    'THREE_PRECEDENTS_MISSING',
    'MEMORY_SCOPE_MISSING',
    'UNKNOWN_TASK_DOMAIN',
    'PROD_TRADING_DENIAL_MISSING',
    'UNVERIFIED_REAL_WORLD_COMPLETION'
  ]
});
const hash=v=>createHash('sha256').update(v).digest('hex');
export function makeSafeLearningHandoff(verdict,bytes){
 if(hash(bytes)!==CONTRACT.expected_sha256)throw Error('UNTRUSTED_TRIBUNAL_REPORT_SHA');
 if(verdict.tribunal_version!==CONTRACT.supported_version ||
    verdict.company_id!==CONTRACT.company_id ||
    verdict.environment!=='LAB' ||
    verdict.evaluated!==5||verdict.structural_pass!==5||
    verdict.semantic_rejected!==5||
    verdict.release_authorized!==false||
    verdict.memory_rules_applied!==0||
    verdict.actual_cost_reconciled!==false||
    !Array.isArray(verdict.verdicts)||verdict.verdicts.length!==5)
    throw Error('TRIBUNAL_CONTRACT_MISMATCH');
 const expectedIds=new Set(['conv-01','det-01','exec-01','persona-01','memory-01']);
 const seen=new Set();
 const rows=[];
 for(const v of verdict.verdicts){
  if(!expectedIds.has(v.task_id)||seen.has(v.task_id)||
    v.state!=='SEMANTIC_REJECTED'||v.structural_pass!==true||
    v.promotion_authorized!==false||v.semantic_heuristic_pass!==false||
    !Array.isArray(v.semantic_vetoes)||v.semantic_vetoes.length===0||
    v.semantic_vetoes.some(reason=>!CONTRACT.allowed_reasons.includes(reason)))
    throw Error('INVALID_CANDIDATE_VERDICT');
  seen.add(v.task_id);
  const id=hash(CONTRACT.source_run_id+':'+v.task_id+':'+CONTRACT.expected_sha256);
  rows.push({
    schema:'lrn.candidate.review.v1',
    idempotency_key:id,
    company_id:'fenix',
    engine_id:'LRN-001',
    target_engine_id:'JARVIS',
    environment:'LAB',
    source_run_id:CONTRACT.source_run_id,
    source_verdict_hash:CONTRACT.expected_sha256,
    task_id:v.task_id,
    status:'QUARANTINED_SEMANTIC_REJECTED',
    reason_codes:[...v.semantic_vetoes],
    reviewer_required:'INDEPENDENT_EVALUATION_GATE',
    candidate_text_included:false,
    memory_write_authorized:false,
    release_manifest_authorized:false,
    execute_authorized:false,
    prod_authorized:false
  });
 }
 return Object.freeze({
  schema:'lrn.candidate.handoff.v1',
  scope:'LAB_ONLY_NOT_SUBMITTED',
  company_id:'fenix',
  engine_id:'LRN-001',
  environment:'LAB',
  version:'CUT56-safe-handoff-v0.1',
  expected_source_hash:CONTRACT.expected_sha256,
  total:rows.length,quarantined:rows.length,released:0,
  accepted_as_memory:0,physical_lrn_ingest_verified:false,
  actual_cost_reconciled:false,
  production_ready:false,
  records:rows
 });
}
export function handoffFile(input,output){
 const bytes=fs.readFileSync(input);
 const result=makeSafeLearningHandoff(JSON.parse(bytes.toString('utf8')),bytes);
 if(output)fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{mode:0o600});
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==4)throw Error('INPUT_AND_OUTPUT_REQUIRED');
 const r=handoffFile(process.argv[2],process.argv[3]);
 console.log(JSON.stringify({status:r.scope,total:r.total,quarantined:r.quarantined,released:0,
    memory_write_authorized:false,physical_lrn_ingest_verified:false}));
}
