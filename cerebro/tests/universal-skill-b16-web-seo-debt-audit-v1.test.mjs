import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildWebSeoDebtAudit,classifySourceTruthState} from '../runtime/universal-skill-web-seo-debt-audit-v1.mjs';
import {listLatestLegacyReconciliations} from '../runtime/universal-skill-reconciliation-resolver-v1.mjs';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const repoRoot=path.resolve(__dirname,'../..');
const evidence=JSON.parse(fs.readFileSync(path.join(repoRoot,'cerebro/registry/universal-skill-b16-web-seo-debt-audit.v1.json'),'utf8'));

test('B16 latest reconciliation selector preserves history but consumes only newest exact range',()=>{
  const latest=listLatestLegacyReconciliations({repo_root:repoRoot});
  const items=latest.flatMap((row)=>row.doc.items);
  assert.ok(latest.length>0);
  assert.equal(items.length,184);
  assert.equal(new Set(items.map((item)=>item.id)).size,184);
  assert.ok(latest.some((row)=>row.ref==='cerebro/skills/cerebro-184-items-176-184-live-reconciliation.v3.json'));
  assert.ok(!latest.some((row)=>row.ref==='cerebro/skills/cerebro-184-items-176-184-live-reconciliation.v2.json'));
});

test('B16 web/SEO audit is item-scoped, measured and never treats reusable profiles as generic providers',()=>{
  const audit=buildWebSeoDebtAudit({repo_root:repoRoot});
  assert.equal(audit.status,'MEASURED_NO_UNSUPPORTED_PROVIDER_PROMOTION');
  assert.equal(audit.sources.item_count,184);
  assert.equal(audit.reusable_evidence.length,4);
  assert.ok(audit.reusable_evidence.every((row)=>row.exists===true));
  assert.ok(audit.reusable_evidence.every((row)=>row.generic_execution_domains.length===0));
  for(const domain of ['web-wordpress-frontend','seo-search-content']){
    const family=audit.families[domain];
    const locked=evidence.families[domain];
    assert.equal(family.candidate_count,locked.candidate_count);
    assert.equal(family.engineering_debt_count,locked.engineering_debt_count);
    assert.equal(family.repeated_engineering_debt,locked.repeated_engineering_debt);
    assert.equal(family.provider_already_available,false);
    assert.deepEqual(family.generic_execution_evidence_refs,[]);
    assert.equal(family.recommendation,'NO_NEW_PROVIDER_JUSTIFIED');
    assert.ok(family.rows.every((row)=>Number.isInteger(row.item_id)&&row.source_ref&&row.source_range&&Number.isInteger(row.source_version)));
  }
  assert.equal(audit.global_recommendation,evidence.global_recommendation);
  assert.equal(audit.global_recommendation,'NO_NEW_WEB_SEO_PROVIDER_JUSTIFIED');
});

test('B16 measured debt is repeated but does not justify fabricated generic execution',()=>{
  assert.deepEqual(evidence.families['web-wordpress-frontend'],{candidate_count:17,engineering_debt_count:7,repeated_engineering_debt:true,provider_already_available:false,generic_execution_evidence_refs:[],recommendation:'NO_NEW_PROVIDER_JUSTIFIED',reason:'REPEATED_DEBT_BUT_NO_EXPLICIT_GENERIC_EXECUTION_EVIDENCE'});
  assert.deepEqual(evidence.families['seo-search-content'],{candidate_count:30,engineering_debt_count:19,repeated_engineering_debt:true,provider_already_available:false,generic_execution_evidence_refs:[],recommendation:'NO_NEW_PROVIDER_JUSTIFIED',reason:'REPEATED_DEBT_BUT_NO_EXPLICIT_GENERIC_EXECUTION_EVIDENCE'});
});

test('B16 item 183 remains web engineering debt with candidate-specific physical evidence only',()=>{
  const audit=buildWebSeoDebtAudit({repo_root:repoRoot});
  const web=audit.families['web-wordpress-frontend'];
  const item183=web.rows.find((row)=>row.item_id===183);
  assert.ok(item183);
  assert.equal(item183.source_ref,'cerebro/skills/cerebro-184-items-176-184-live-reconciliation.v3.json');
  assert.equal(item183.truth_state,'ENGINEERING_DEBT');
  assert.match(item183.source_state,/PHYSICAL_DEVICE_PENDING/);
  assert.equal(item183.next_gate,'AUTHORIZED_DEVICE_INSTALL_AND_RENDER_E2E');
});

test('B16 source truth classifier remains fail-closed for partial and physical states',()=>{
  assert.equal(classifySourceTruthState({state:'FULL_PREPROD_DETERMINISTIC_LOCAL'}),'EVIDENCE_FULL_PREPROD');
  assert.equal(classifySourceTruthState({state:'PARTIAL_PREPROD_PLAN_ONLY'}),'ENGINEERING_DEBT');
  assert.equal(classifySourceTruthState({state:'DEFINED_NOT_BUILT_TEMPLATE_PACKS'}),'ENGINEERING_DEBT');
  assert.equal(classifySourceTruthState({state:'FULL_PREPROD',next_gate:'PHYSICAL_DEVICE_REQUIRED'}),'ENGINEERING_DEBT');
  assert.equal(classifySourceTruthState({state:'TERMINAL_REFERENCE_PATTERN_ONLY'}),'TERMINAL_REFERENCE_OR_CATALOG');
});

test('B16 audit authority remains PREPROD zero-cost and cannot mutate PROD or publish',()=>{
  const audit=buildWebSeoDebtAudit({repo_root:repoRoot});
  assert.equal(audit.environment,'PREPROD');
  assert.equal(audit.prod_authorized,false);
  assert.equal(audit.prod_write_authorized,false);
  assert.equal(audit.public_deploy_authorized,false);
  assert.equal(audit.auto_merge_authorized,false);
  assert.equal(audit.external_skill_code_execution_authorized,false);
  assert.equal(audit.external_dependency_install_authorized,false);
  assert.equal(audit.customer_data_authorized,false);
  assert.equal(audit.trading_access,false);
  assert.equal(audit.additional_cost_eur,0);
  assert.deepEqual(audit.human_required,[]);
});
