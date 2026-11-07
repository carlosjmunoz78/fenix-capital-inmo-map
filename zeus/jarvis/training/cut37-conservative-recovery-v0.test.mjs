import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {RECOVERY, conservativelyRecover, validateEvidence} from './cut37-conservative-recovery-v0.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const original=JSON.parse(fs.readFileSync(path.join(here,'../state/jarvis-deepseek-autonomy-ledger-v1.json'),'utf8'));
const proof={trusted_hash_count:4,observed_calls:13,completed_full_cycles:1,billing_verified:false,observed_peak_estimate_usd:0.0059874};
test('conservative recovery counts full 1.80 USD without claiming actual invoicing',()=>{
 const recovered=conservativelyRecover(original,proof);
 assert.equal(recovered.status,'PAUSED');
 assert.equal(recovered.pending,null);
 assert.equal(recovered.spent_estimate_usd,3.699419652);
 assert.equal(recovered.recovery.charged_conservative_usd,1.8);
 assert.equal(recovered.recovery.observed_peak_estimate_usd,0.0059874);
 assert.equal(recovered.recovery.provider_billing_reconciled,false);
 assert.equal(recovered.recovery.auto_resume,false);
 assert.equal(recovered.auto_recharge,false);
 assert.equal(recovered.production_mutation,false);
 assert.equal(original.status,'RESERVED');
 assert.equal(original.pending.run_id,RECOVERY.run_id);
});
test('recovery never claims partial jobs as completed or authorizes production',()=>{
 const next=conservativelyRecover(original,proof);
 assert.equal(next.cycle_cursor,original.cycle_cursor);
 assert.equal(next.calls_completed,original.calls_completed);
 assert.equal(next.scenarios_completed,original.scenarios_completed);
 assert.equal(next.last_completed_run_id,original.last_completed_run_id);
 assert.equal(next.auto_promote,false);
 assert.equal(next.recovery.observed_calls_not_counted_as_completed,13);
});
test('recovery is fail-closed for wrong run, cap, ledger or repeated attempt',()=>{
 assert.throws(()=>conservativelyRecover({...original,pending:{...original.pending,run_id:'different'}},proof),/PRECONDITIONS/);
 assert.throws(()=>conservativelyRecover({...original,status:'ACTIVE'},proof),/PRECONDITIONS/);
 assert.throws(()=>conservativelyRecover({...original,lifetime_guard_usd:900},proof),/PRECONDITIONS/);
 assert.throws(()=>conservativelyRecover({...original,spent_estimate_usd:38.9},proof),/PRECONDITIONS/);
 assert.throws(()=>conservativelyRecover({...original,pending:null},proof),/PRECONDITIONS/);
 assert.throws(()=>conservativelyRecover(original,{...proof,billing_verified:true}),/EVIDENCE_INVALID/);
 assert.throws(()=>conservativelyRecover(conservativelyRecover(original,proof),proof),/PRECONDITIONS/);
});
test('artifact file digests are exact immutable evidence, not user-provided counters',()=>{
 assert.equal(Object.keys(RECOVERY.artifact_files).length,4);
 assert.throws(()=>validateEvidence('/irrelevant',()=>Buffer.from('{}')),/EVIDENCE_SHA_MISMATCH/);
});
