/**
 * CEREBRO JARVIS CUT59 · Verify two-project LRN readiness from read-only metadata.
 * No API, credentials, permissions, worker, database write or live verification.
 *
 * A snapshot of database metadata is never physical motor readiness. The App
 * PREPROD remains cancelled. No historical row can be migrated into PROD by
 * this assessor, even if all its metadata rows were labelled GREEN.
 */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const CUT59_CONTRACT = Object.freeze({
  schema:'cerebro.cut59.readonly.supabase.observation.v1',
  company_id:'fenix',
  source_project_ref:'hnqlnvakzaywtafeiybt',
  target_project_ref:'cluhljgonannaafpmblx',
  environment:'PREPROD',
  expected_count:17,
  max_metadata_age_days:1,
  observed_at_utc_date:'2026-11-07',
  six_pending:Object.freeze([
    'MKTBOOT-001','CRMBOOT-001','APPBOOT-001','AUTBOOT-001','TRNBOOT-001','ENGACT-001'
  ]),
  never_authorize_prod:true,
  never_mutate_app_crm:true,
  no_auto_green:true
});
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const ymd=value=>{
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('INVALID_OBSERVATION_DATE');
  const ms=Date.parse(value+'T00:00:00.000Z');
  if(!Number.isFinite(ms))throw Error('INVALID_OBSERVATION_DATE');
  return ms;
};
const isArr=Array.isArray;
const fail=reason=>{throw Error('CUT59_FAIL_CLOSED:'+reason);};
const validHash=v=>typeof v==='boolean';
const legalState=new Set(['GREEN','READY','BLOCKED']);
const bools=['prod_authorized','prod_write_authorized','trading_access'];
const exactCost=v=>v==='0.00'||v==='0'||v===0||v===0.0;

export function assessCut59(snapshot,rawBytes=null){
  const c=CUT59_CONTRACT;
  if(!snapshot||typeof snapshot!=='object'||isArr(snapshot) ||
    snapshot.schema!==c.schema ||snapshot.observed_at_utc_date!==c.observed_at_utc_date ||
    snapshot.scope?.company_id!==c.company_id||snapshot.scope?.environment!==c.environment ||
    snapshot.observation_provenance!=='READ_ONLY_SUPABASE_MCP_SELECT_DATABASE_METADATA')
    fail('INVALID_OR_UNVERIFIED_SNAPSHOT_SCOPE');
  if(snapshot.source?.project_ref!==c.source_project_ref ||
     snapshot.target?.project_ref!==c.target_project_ref ||
     snapshot.source?.legacy_app_preprod_cancelled!==true ||
     snapshot.target?.lrn_rpc_present!==true)
    fail('PROJECT_IDENTITY_OR_LEGACY_APP_GUARD');
  if(snapshot.target.registered_company_count!==0 ||
     snapshot.target.engine_state_rows!==0||snapshot.target.lrn_continuation_rows!==0)
    fail('OBSERVED_TARGET_CHANGED_REQUERY_REQUIRED');
  if(snapshot.independent_current_execution_proof!==false ||
     snapshot.company_transfer_authorized!==false ||
     snapshot.prod_write_authorized!==false)
    fail('INVALID_AUTHORITY_METADATA');
  const rows=snapshot.source.records;
  if(!isArr(rows)||rows.length!==c.expected_count)fail('WRONG_ENGINE_CARDINALITY');
  const ids=new Set(),stages=new Set(),byId=new Map();
  for(const row of rows){
    if(!row||typeof row.engine_id!=='string'||ids.has(row.engine_id)||
       row.company_id!==c.company_id||row.environment!==c.environment||
       !legalState.has(row.state)||!Number.isInteger(row.stage)||row.stage<0||
       row.stage>16||stages.has(row.stage)||!isArr(row.dependencies)||
       new Set(row.dependencies).size!==row.dependencies.length||
       !validHash(row.has_evidence_hash)||
       bools.some(k=>row[k]!==false)||!exactCost(row.additional_cost_eur)||
       row.version!=='1.0.0'||typeof row.updated_at!=='string')
      fail('MOTOR_ROW_INVALID_OR_DUPLICATED');
    ids.add(row.engine_id);stages.add(row.stage);byId.set(row.engine_id,row);
  }
  if(ids.size!==17||stages.size!==17)fail('INCOMPLETE_ENGINE_STAGES');
  for(const row of rows){
    if(row.dependencies.some(id=>!byId.has(id)||id===row.engine_id))
      fail('DEPENDENCY_UNKNOWN_OR_SELF');
  }
  // Kahn topological ordering; cycles are forbidden, order is by stage when ready.
  const indegree=new Map(rows.map(x=>[x.engine_id,x.dependencies.length]));
  const dependents=new Map(rows.map(x=>[x.engine_id,[]]));
  for(const row of rows)for(const dep of row.dependencies)
    dependents.get(dep).push(row.engine_id);
  const ordered=[];
  while(ordered.length<rows.length){
    const ready=[...ids].filter(id=>indegree.get(id)===0&&!ordered.includes(id))
      .sort((a,b)=>byId.get(a).stage-byId.get(b).stage);
    if(ready.length===0)fail('DEPENDENCY_CYCLE');
    const id=ready[0];ordered.push(id);
    for(const next of dependents.get(id))indegree.set(next,indegree.get(next)-1);
  }
  const dateMs=ymd(snapshot.observed_at_utc_date);
  const graded=rows.slice().sort((a,b)=>a.stage-b.stage).map(row=>{
    const parsedDate=row.updated_at.slice(0,10);
    const days=Math.floor((dateMs-ymd(parsedDate))/86400000);
    if(days<0)fail('FUTURE_DATED_SOURCE_RECORD');
    const nonGreen=row.dependencies.filter(id=>byId.get(id).state!=='GREEN');
    const physicalProof=false; // Database record is not a physical E2E test.
    const reason=row.state==='READY'?
      (nonGreen.length?'READY_WITH_BLOCKED_PREREQUISITES':'READY_WITHOUT_PHYSICAL_EVIDENCE'):
      row.state==='BLOCKED'?'BLOCKED_DEPENDENCY_CHAIN':
      row.has_evidence_hash?'HISTORICAL_GREEN_HASH_ONLY':'HISTORICAL_GREEN_NO_HASH';
    return Object.freeze({
      engine_id:row.engine_id,stage:row.stage,observed_state:row.state,
      source_age_days:days,legacy_evidence_hash_present:row.has_evidence_hash,
      dependency_ids:[...row.dependencies],not_green_dependencies:nonGreen,
      physical_proof_verified:physicalProof,
      eligible_to_promote:false,scope:'SOURCE_METADATA_ONLY',
      reason
    });
  });
  const counts={
    green:graded.filter(x=>x.observed_state==='GREEN').length,
    ready:graded.filter(x=>x.observed_state==='READY').length,
    blocked:graded.filter(x=>x.observed_state==='BLOCKED').length,
    green_with_hash:graded.filter(x=>x.observed_state==='GREEN'&&x.legacy_evidence_hash_present).length,
    all_hashes:graded.filter(x=>x.legacy_evidence_hash_present).length,
    stale:graded.filter(x=>x.source_age_days>c.max_metadata_age_days).length
  };
  if(JSON.stringify(counts).length<1)fail('UNREACHABLE');
  if(counts.green!==11||counts.ready!==2||counts.blocked!==4||
     counts.green_with_hash!==8||counts.stale!==17)fail('SOURCE_BASELINE_CHANGED_REAUDIT_REQUIRED');
  const pending=graded.filter(x=>c.six_pending.includes(x.engine_id));
  if(pending.length!==6||pending.some(x=>x.observed_state==='GREEN'||x.legacy_evidence_hash_present))
    fail('SIX_PENDING_CONTRACT_CHANGED');
  const sourcesWithZeroBlocked=graded.filter(x=>x.observed_state==='READY'&&x.not_green_dependencies.length===0);
  if(sourcesWithZeroBlocked.length!==2||
     new Set(sourcesWithZeroBlocked.map(x=>x.engine_id)).size!==2)
    fail('READY_PIVOT_CHANGED');
  return Object.freeze({
    schema:'cerebro.cut59.reconciliation.report.v1',
    company_id:c.company_id,environment:'LAB',
    observation_source_sha256:rawBytes?digest(rawBytes):'DIGEST_NOT_SUPPLIED',
    source_project_ref:c.source_project_ref,target_project_ref:c.target_project_ref,
    source_observation_date:c.observed_at_utc_date,
    source_latest_recorded_state:'2026-10-13',
    source_record_count:17,target_record_count:0,
    source_summary:counts,
    priority_pivots:sourcesWithZeroBlocked.map(x=>x.engine_id).sort(),
    pending_engines:pending,
    dependency_order:ordered,
    all_engines:graded,
    lrn_rpc_present_in_target:true,
    target_company_registered:false,
    current_physical_green_proofs:0,
    source_legacy_metadata_not_physical_attestation:true,
    transfer_authorized:false,migration_required_before_lrn:true,
    preprod_app_restored:false,
    next_gate:'CUT59_REAL_MKT_CRM_NONINVASIVE_ACCEPTANCE_AND_TWO_PROJECT_OWNER_CONTRACT',
    prod_authorized:false,prod_write_authorized:false,lrn_ingest_authorized:false,
    actual_cost_reconciled:false,additional_paid_calls:0
  });
}
export function evaluateFile(sourceFile,reportFile){
 const raw=fs.readFileSync(sourceFile);
 const r=assessCut59(JSON.parse(raw.toString('utf8')),raw);
 if(reportFile)fs.writeFileSync(reportFile,JSON.stringify(r,null,2)+'\n',{mode:0o600});
 return r;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==4)throw Error('SOURCE_AND_REPORT_REQUIRED');
 const r=evaluateFile(process.argv[2],process.argv[3]);
 console.log(JSON.stringify({status:'SOURCE_RECONCILED_PROD_BLOCKED',green:r.source_summary.green,
  ready:r.source_summary.ready,blocked:r.source_summary.blocked,
  verified_physical_green:r.current_physical_green_proofs,
  pivots:r.priority_pivots,source_sha256:r.observation_source_sha256,
  prod_authorized:r.prod_authorized}));
}
