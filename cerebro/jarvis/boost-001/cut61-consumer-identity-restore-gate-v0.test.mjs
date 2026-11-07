import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CUT61_REQUIREMENTS,validateLiveCatalogSnapshot,physicalCut61Gate,cut61Report} from './cut61-consumer-identity-restore-gate-v0.mjs';

const file=path.join(path.dirname(fileURLToPath(import.meta.url)),'cut61-consumer-identity-observation-20261107.json');
const fresh=()=>JSON.parse(fs.readFileSync(file,'utf8'));
const tamper=cb=>{const x=fresh();cb(x);return x;};
const throws=(fn,code)=>assert.throws(()=>validateLiveCatalogSnapshot(tamper(fn)),new RegExp(code));

test('CUT61 real catalog matches exact 17 functions and 10 FKs but NO source-code completeness',()=>{
 const data=validateLiveCatalogSnapshot(fresh());
 assert.equal(data.direct_sql_functions,17);
 assert.equal(data.foreign_keys,10);
 assert.equal(data.rls_protected_tables,5);
 assert.equal(data.app_crm_source_consumers_inventory_complete,false);
 assert.equal(CUT61_REQUIREMENTS.expectedFunctions.length,17);
});
test('actual live B3 is OFF without grants, no restored backup evidence, no PROD',()=>{
 const bytes=fs.readFileSync(file);
 const r=cut61Report(JSON.parse(bytes),bytes);
 assert.match(r.original_catalog_sha256,/^[0-9a-f]{64}$/);
 assert.equal(r.verified_database_dependencies,27);
 assert.equal(r.b3_grants_found,0);
 assert.equal(r.b3_enabled,false);
 assert.equal(r.b3_kill_switch,true);
 assert.equal(r.physical_restore_verified,false);
 assert.equal(r.current_browser_access_challenge,'LOGIN_REQUIRED');
 assert.equal(r.readiness.status,'BLOCKED');
 assert.equal(r.readiness.code,'NO_INDEPENDENT_PHYSICAL_ACCEPTANCE');
 assert.equal(r.app_crm_modified,false);
 assert.equal(r.mutating_db_requests,0);
});
test('rejects forged duplicate or missing SQL consumers',()=>{
 throws(x=>x.live_database_state.functions.pop(),'CONSUMER_GRAPH_CHANGED');
 throws(x=>x.live_database_state.functions[0].routine=x.live_database_state.functions[1].routine,'MISSING_OR_FABRICATED_RPC_CONSUMER');
 throws(x=>x.live_database_state.functions[0].registry=false||x.live_database_state.functions[0].onboarding===true,'MISSING_OR_FABRICATED_RPC_CONSUMER');
});
test('rejects missing FK dependency, new RLS consumer grant, changed data',()=>{
 throws(x=>x.live_database_state.foreign_keys.pop(),'CONSUMER_GRAPH_CHANGED');
 throws(x=>x.live_database_state.foreign_keys[0].child='unrelated','FOREIGN_KEY_CHAIN_UNVERIFIED');
 throws(x=>x.live_database_state.protected_tables[0].rls=false,'TABLE_RLS_OR_ACCESS_POLICY_DRIFT');
 throws(x=>x.live_database_state.protected_tables[0].policy_count=1,'TABLE_RLS_OR_ACCESS_POLICY_DRIFT');
 throws(x=>x.live_database_state.engine_rows_count=17,'TARGET_STATE_CHANGED');
});
test('identity permissions cannot be faked: owner B3 grants, switch, wrong tenant',()=>{
 throws(x=>x.live_database_state.b3_owner_grants_count=1,'LIVE_B3_STATE_DRIFT');
 throws(x=>x.live_database_state.b3_control[0].enabled=true,'LIVE_B3_STATE_DRIFT');
 throws(x=>x.live_database_state.b3_control[0].kill_switch=false,'LIVE_B3_STATE_DRIFT');
 throws(x=>x.company_id='competing_company','INVALID_SCOPE_OR_AUTHORITY');
 throws(x=>x.target_project_ref='hnqlnvakzaywtafeiybt','INVALID_SCOPE_OR_AUTHORITY');
});
test('fake backup, live restore or authenticated cloud browser proof vetoed',()=>{
 throws(x=>x.backup_snapshot_retrieved=true,'EVIDENCE_OR_AUTHORITY_FALSE_ASSERTION');
 throws(x=>x.physical_restore_performed=true,'EVIDENCE_OR_AUTHORITY_FALSE_ASSERTION');
 throws(x=>x.owner_b2_b3_physical_e2e_passed=true,'EVIDENCE_OR_AUTHORITY_FALSE_ASSERTION');
 throws(x=>x.owner_current_browser_canary_authenticated=true,'EVIDENCE_OR_AUTHORITY_FALSE_ASSERTION');
 throws(x=>x.source_repo_code_consumers_exhaustively_verified=true,'EVIDENCE_OR_AUTHORITY_FALSE_ASSERTION');
 throws(x=>x.cloudflare_cut30_changed=true,'EVIDENCE_OR_AUTHORITY_FALSE_ASSERTION');
});
test('physical gate requires independent approval and all 8 real backups/identity conditions',()=>{
 const base=fresh();
 const denied=physicalCut61Gate(base,{source:'EXTERNAL_INDEPENDENT_PHYSICAL_E2E'});
 assert.equal(denied.code,'BACKUP_CONSUMER_AND_OWNER_GATES_MISSING');
 assert.equal(denied.missing.length,8);
 assert.equal(denied.write_authorized,false);
 const e={source:'EXTERNAL_INDEPENDENT_PHYSICAL_E2E'};
 for(const key of denied.missing)e[key]=true;
 const stillBlocked=physicalCut61Gate(base,e);
 assert.equal(stillBlocked.code,'RELEASE_TRIBUNAL_PRODUCTION_GATE_NOT_EVALUATED');
 assert.equal(stillBlocked.production_promotion,false);
 assert.equal(stillBlocked.company_onboarding_authorized,false);
 assert.equal(stillBlocked.learning_ingest_authorized,false);
});
