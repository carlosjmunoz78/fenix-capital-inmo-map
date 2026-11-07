import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {CUT59_CONTRACT,assessCut59,evaluateFile} from './cut59-engine-reconciliation-v0.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const source=path.join(here,'cut59-legacy-to-prod-observation-20261107.json');
const base=()=>JSON.parse(fs.readFileSync(source,'utf8'));
const mutate=(fn)=>{const snap=base();fn(snap);return snap;};

test('CUT59 audited frozen observation: 17 legacy but zero current physical proofs',()=>{
 const result=evaluateFile(source);
 assert.equal(result.source_record_count,17);
 assert.equal(result.target_record_count,0);
 assert.equal(result.source_summary.green,11);
 assert.equal(result.source_summary.ready,2);
 assert.equal(result.source_summary.blocked,4);
 assert.equal(result.source_summary.green_with_hash,8);
 assert.equal(result.source_summary.stale,17);
 assert.equal(result.current_physical_green_proofs,0);
 assert.deepEqual(result.priority_pivots,['CRMBOOT-001','MKTBOOT-001']);
 assert.equal(result.lrn_ingest_authorized,false);
 assert.equal(result.prod_authorized,false);
 assert.equal(result.transfer_authorized,false);
 assert.equal(result.preprod_app_restored,false);
 assert.match(result.observation_source_sha256,/^[a-f0-9]{64}$/);
});
test('CUT59 next six form correct real dependency DAG, not automatic GREEN',()=>{
 const r=assessCut59(base());
 assert.equal(r.pending_engines.length,6);
 const byId=new Map(r.pending_engines.map(x=>[x.engine_id,x]));
 assert.deepEqual(byId.get('CRMBOOT-001').not_green_dependencies,[]);
 assert.deepEqual(byId.get('MKTBOOT-001').not_green_dependencies,[]);
 assert.deepEqual(byId.get('APPBOOT-001').not_green_dependencies,['CRMBOOT-001']);
 assert.deepEqual(byId.get('AUTBOOT-001').not_green_dependencies,['CRMBOOT-001','APPBOOT-001']);
 assert.deepEqual(byId.get('TRNBOOT-001').not_green_dependencies,['AUTBOOT-001']);
 assert.deepEqual(byId.get('ENGACT-001').not_green_dependencies,
   ['MKTBOOT-001','CRMBOOT-001','APPBOOT-001','AUTBOOT-001','TRNBOOT-001']);
 for(const x of r.pending_engines){
  assert.equal(x.legacy_evidence_hash_present,false,x.engine_id);
  assert.equal(x.eligible_to_promote,false,x.engine_id);
  assert.equal(x.physical_proof_verified,false,x.engine_id);
  assert.equal(x.source_age_days,25,x.engine_id);
 }
});
test('rejects a synthetic GREEN without fresh runtime acceptance or evidence',()=>{
 const fake=mutate(x=>{x.source.records.find(r=>r.engine_id==='MKTBOOT-001').state='GREEN';});
 assert.throws(()=>assessCut59(fake),/SOURCE_BASELINE_CHANGED_REAUDIT_REQUIRED|SIX_PENDING_CONTRACT_CHANGED/);
 const fakeSource=mutate(x=>{x.independent_current_execution_proof=true;});
 assert.throws(()=>assessCut59(fakeSource),/INVALID_AUTHORITY_METADATA/);
});
test('never registers company or changes PROD count through source-object claims',()=>{
 assert.throws(()=>assessCut59(mutate(x=>{x.target.registered_company_count=1;})),/OBSERVED_TARGET_CHANGED_REQUERY_REQUIRED/);
 assert.throws(()=>assessCut59(mutate(x=>{x.target.engine_state_rows=17;})),/OBSERVED_TARGET_CHANGED_REQUERY_REQUIRED/);
 assert.throws(()=>assessCut59(mutate(x=>{x.source.project_ref='cluhljgonannaafpmblx';})),/PROJECT_IDENTITY_OR_LEGACY_APP_GUARD/);
 assert.throws(()=>assessCut59(mutate(x=>{x.source.legacy_app_preprod_cancelled=false;})),/PROJECT_IDENTITY_OR_LEGACY_APP_GUARD/);
});
test('denies cross-company, altered project, invalid permissions and cost',()=>{
 assert.throws(()=>assessCut59(mutate(x=>{x.scope.company_id='other';})),/INVALID_OR_UNVERIFIED_SNAPSHOT_SCOPE/);
 assert.throws(()=>assessCut59(mutate(x=>{x.source.records[0].prod_authorized=true;})),/MOTOR_ROW_INVALID_OR_DUPLICATED/);
 assert.throws(()=>assessCut59(mutate(x=>{x.source.records[0].trading_access=true;})),/MOTOR_ROW_INVALID_OR_DUPLICATED/);
 assert.throws(()=>assessCut59(mutate(x=>{x.source.records[0].additional_cost_eur='25';})),/MOTOR_ROW_INVALID_OR_DUPLICATED/);
});
test('rejects invalid graph: ghost, cycle, duplicates and missing engine',()=>{
 assert.throws(()=>assessCut59(mutate(x=>{x.source.records[0].dependencies=['NOT-FOUND'];})),/DEPENDENCY_UNKNOWN_OR_SELF/);
 assert.throws(()=>assessCut59(mutate(x=>{x.source.records.find(r=>r.engine_id==='COMP-REG-001').dependencies=['TENANT-001'];})),/DEPENDENCY_CYCLE/);
 assert.throws(()=>assessCut59(mutate(x=>{x.source.records[0].engine_id=x.source.records[1].engine_id;})),/MOTOR_ROW_INVALID_OR_DUPLICATED/);
 assert.throws(()=>assessCut59(mutate(x=>{x.source.records.pop();})),/WRONG_ENGINE_CARDINALITY/);
});
test('date and evidence metadata must not be forged to look current',()=>{
 assert.throws(()=>assessCut59(mutate(x=>{x.source.records[1].updated_at='2027-01-01 00:00:00+00';})),/FUTURE_DATED_SOURCE_RECORD/);
 assert.throws(()=>assessCut59(mutate(x=>{x.source.records.find(r=>r.engine_id==='CRMBOOT-001').has_evidence_hash=true;})),/SIX_PENDING_CONTRACT_CHANGED/);
 assert.equal(CUT59_CONTRACT.no_auto_green,true);
 assert.equal(CUT59_CONTRACT.never_mutate_app_crm,true);
 assert.equal(CUT59_CONTRACT.never_authorize_prod,true);
});
