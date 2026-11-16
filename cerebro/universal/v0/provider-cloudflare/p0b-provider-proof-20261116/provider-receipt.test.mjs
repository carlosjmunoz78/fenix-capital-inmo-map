import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const r=JSON.parse(fs.readFileSync(new URL('./provider-receipt.json', import.meta.url),'utf8'));
const regexp=/^[a-z][a-z0-9_-]{10,100}$/;
test('receipt records exact scope, provider and local correlation IDs',()=>{
 assert.equal(r.status,'PASS_LIMITED_PROVIDER_LIFECYCLE');
 assert.equal(r.scope.company_id_literal,'fenix-capital');
 assert.equal(r.scope.company_registry_mapping_verified,false);
 assert.equal(r.scope.engine_id,'FACT-001');assert.equal(r.scope.environment,'LAB');
 assert.equal(r.executor,'CHATGPT_CLOUDFLARE_UNIVERSAL_OPERATOR');
 for (const k of ['run_id','job_id','request_id','receipt_id']) assert.match(r.correlation[k],regexp);
 assert.equal(r.correlation.provider_echoed_any_correlation_ids,false);
 assert.match(r.correlation.source_sha256_local,/^[a-f0-9]{64}$/);
});
test('create readback is physical and all public or privileged surfaces disabled',()=>{
 const c=r.facts.create;
 assert.deepEqual([r.facts.before.worker_count,c.worker_count_after,r.facts.after.worker_count],[39,40,39]);
 assert.equal(r.facts.before.target_exists,false);assert.equal(c.upload_success,true);
 assert.equal(c.target_in_script_list,true);assert.equal(c.provider_settings_readback,true);
 assert.equal(c.bindings_count,0);assert.equal(c.secrets_count,0);assert.equal(c.crons_count,0);
 assert.equal(c.workers_dev_enabled,false);assert.equal(c.preview_urls_enabled,false);
 assert.equal(c.custom_routes_count,0);assert.equal(c.custom_domains_count,0);
 assert.match(c.version_id,/^[a-f0-9-]{36}$/);
 assert.match(c.deployment_id,/^[a-f0-9-]{36}$/);
});
test('rollback readback proves worker was deleted but not business execution',()=>{
 assert.equal(r.facts.delete.target_version_matches_created,true);
 assert.equal(r.facts.delete.delete_success,true);
 assert.equal(r.facts.delete.force,false);
 assert.equal(r.facts.after.target_exists,false);
 assert.equal(r.facts.after.target_domains_count,0);
 assert.equal(r.facts.after.target_routes_count,0);
 assert.equal(r.facts.after.rollback_provider_readback_verified,true);
 assert.equal(r.gates.provider_create_readback_verified,true);
 assert.equal(r.gates.provider_delete_readback_verified,true);
 for(const k of ['historical_fact001_job_correlated','executed_by_existing_fact001_runtime','d1_command_event_write','business_result_receipt_verified','owner_gateway_policy_authorized','company_registry_verified','prod_execution_authorized'])assert.equal(r.gates[k],false);
});
test('no finance promises or hidden cost assumption',()=>{
 assert.equal(r.cost.new_subscriptions_eur,0);
 assert.equal(r.cost.measured_provider_consumption_eur,null);
 assert.equal(r.cost.additional_cost_total_verified,false);
 assert.equal(r.scope.policy_engine_evaluated,false);
});
