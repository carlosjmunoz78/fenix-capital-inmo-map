import test from 'node:test';
import assert from 'node:assert/strict';
import {readCut63Fixtures,inspectCut63,OBSERVED_SCOPE} from './cut63-edge-auth-backup-admission-v0.mjs';

const good=()=>readCut63Fixtures();
const wrong=(cb)=>{const s=good();cb(s);return s;};
const veto=(cb,code)=>assert.throws(()=>inspectCut63(wrong(cb)),new RegExp(code));

test('CUT63 all live 95 Edge endpoints accounted for, all 60 JWT-disabled deployed code sampled',()=>{
 const r=inspectCut63(good());
 assert.equal(r.deployed_total,95);
 assert.equal(r.jwt_off_60,60);
 assert.equal(r.jwt_on_35,35);
 assert.equal(r.jwt_off_code_sources_read,60);
 assert.equal(r.source_batched_5,5);
 assert.equal(r.static_auth_cues_count.auth_header,37);
 assert.equal(r.static_auth_cues_count.crypto,35);
 assert.equal(r.static_auth_cues_count.server_secret,42);
 assert.equal(r.without_examined_auth_cue.length,13);
 assert.equal(r.verdict,'NO_GO');
});
test('real Pro PHYSICAL backup entries do not prove a successful isolated PROD restore',()=>{
 const r=inspectCut63(good());
 assert.equal(r.real_pro_physical_backup_entries_visible,8);
 assert.equal(r.latest_real_backup_visible_utc,'2026-11-07T02:59:58Z');
 assert.equal(r.backup_success_status_verified,false);
 assert.equal(r.backed_up_database_bytes_verified,false);
 assert.equal(r.storage_objects_backed_up_by_database,false);
 assert.equal(r.real_prod_restore_to_isolated_target_verified,false);
 assert.equal(r.new_project_created,false);
 assert.equal(r.additional_paid_subscriptions,0);
});
test('no automatic authority from verify_jwt false or source static auth cues',()=>{
 const r=inspectCut63(good());
 assert.equal(r.source_code_read_does_not_prove_authentication,true);
 assert.equal(r.jwt_disabled_does_not_prove_authentication_bypass,true);
 assert.equal(r.runtime_negative_auth_tests_executed,0);
 assert.equal(r.owner_b2b3_e2e_verified,false);
 assert.equal(r.supabase_prod_write_authorized,false);
 assert.ok(r.policy_sensitive_without_examined_auth_cue.includes('cerebro-gateway-prod-governed-write-canary-v1'));
});
test('fabricated edge source count, JWT-off drift and duplicate slugs fail closed',()=>{
 veto(x=>x.listing.total=94,'EDGE_DEPLOYMENT_CARDINALITY');
 veto(x=>x.listing.functions[0].verify_jwt=true,'JWT_FALSE_COUNT_DRIFT');
 veto(x=>x.batches[0].rows.pop(),'BATCH_SCOPE_OR_CARDINALITY');
 veto(x=>x.batches[0].rows[1].slug=x.batches[0].rows[0].slug,'EDGE_SOURCE_MISMATCH_OR_PRIVATE_SOURCE_EXPORT');
});
test('unsupported or over-claimed source authorizations fail closed',()=>{
 veto(x=>x.batches[0].rows[0].verify_jwt=true,'EDGE_SOURCE_MISMATCH_OR_PRIVATE_SOURCE_EXPORT');
 veto(x=>x.batches[0].rows[0].flags.crypto='proved','EDGE_SOURCE_MISMATCH_OR_PRIVATE_SOURCE_EXPORT');
 veto(x=>x.batches[0].rows[0].source_text='SECRET_SNIPPET','EDGE_SOURCE_MISMATCH_OR_PRIVATE_SOURCE_EXPORT');
 veto(x=>x.batches[2].live_endpoints_called=true,'BATCH_SCOPE_OR_CARDINALITY');
});
test('backup cannot be fabricated, restored or enabled by editing a flag',()=>{
 veto(x=>x.backup.organization_plan='free','REAL_BACKUP_PROOF_SCOPE');
 veto(x=>x.backup.visible_backup_entries=9,'REAL_BACKUP_PROOF_SCOPE');
 veto(x=>x.backup.listed_backup_times_utc[7]='2026-11-09T02:59:59Z','REAL_BACKUP_PROOF_SCOPE');
 veto(x=>x.backup.actual_backup_restore_to_isolated_project_tested=true,'REAL_BACKUP_PROOF_SCOPE');
 veto(x=>x.backup.restore_action_clicked=true,'REAL_BACKUP_PROOF_SCOPE');
 veto(x=>x.backup.new_paid_addons_enabled=true,'REAL_BACKUP_PROOF_SCOPE');
});
test('wrong company / project and release permission escalation fail closed',()=>{
 veto(x=>x.listing.company_id='aion','LISTING_SCOPE');
 veto(x=>x.listing.project_ref='hnqlnvakzaywtafeiybt','LISTING_SCOPE');
 veto(x=>x.listing.supabase_prod_modified=true,'LISTING_SCOPE');
 assert.equal(OBSERVED_SCOPE.company_id,'fenix');
 assert.equal(OBSERVED_SCOPE.expected_off_platform_jwt,60);
});
