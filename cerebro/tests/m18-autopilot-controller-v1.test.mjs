import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {synthesizeM18CapabilityDecisions,buildM18CapabilityGraph,buildLocalizationScaffold,buildM18ReferenceProductDryRun,buildM18AutopilotState,writeM18AutopilotArtifacts} from '../digital-build/m18-autopilot-controller-v1.mjs';

test('M18 decision synthesis is reuse-first and only localization may scaffold',()=>{
  const d=synthesizeM18CapabilityDecisions();
  assert.equal(d.environment,'PREPROD');
  assert.equal(d.capability_count,45);
  assert.deepEqual(d.internal_capability_scaffolds_authorized,['localization_factory']);
  assert.equal(d.final_engine_identities_created,0);
  assert.equal(d.safety.prod_write,false);
  assert.equal(d.safety.paid_ai,false);
  assert.equal(d.safety.trading,false);
  assert.equal(d.safety.additional_cost_eur,0);
  const wp=d.decisions.find(x=>x.capability_family==='wordpress_factory');
  assert.equal(wp.decision,'REUSE_OR_EXTEND');
});

test('capability graph binds every family to the shared governed control plane',()=>{
  const d=synthesizeM18CapabilityDecisions();
  const g=buildM18CapabilityGraph(d);
  assert.equal(g.nodes.length,45);
  assert.equal(g.shared_control_plane.includes('FACT-001'),true);
  assert.equal(g.shared_control_plane.includes('EVA-001'),true);
  assert.equal(g.shared_control_plane.includes('JDG-001'),true);
  assert.equal(g.edges.length,45*g.shared_control_plane.length);
  assert.equal(g.prod_authorized,false);
});

test('localization scaffold is internal, non-operational and fail-closed',()=>{
  const s=buildLocalizationScaffold();
  assert.equal(s.manifest.engine_id,'FACT-001');
  assert.equal(s.manifest.capability_id,'LOCALIZATION_FACTORY');
  assert.equal(s.manifest.operational,false);
  assert.equal(s.manifest.permissions.prod_write,false);
  assert.match(s.runtime,/SCAFFOLD_NOT_IMPLEMENTED/);
  assert.equal(s.evaluation.promotion_authorized,false);
  assert.equal(s.recovery.prod_authorized,false);
});

test('reference product is a zero-cost PREPROD plan with no external effect',()=>{
  const r=buildM18ReferenceProductDryRun();
  assert.equal(r.environment,'PREPROD');
  assert.equal(r.brand_tokens.allowed,true);
  assert.equal(r.app_plan.allowed,true);
  assert.equal(r.app_plan.plan.deploy,false);
  assert.equal(r.external_side_effect_executed,false);
  assert.equal(r.prod_authorized,false);
  assert.equal(r.additional_cost_eur,0);
});

test('autopilot state uses existing continuous worker and bounded stop conditions',()=>{
  const s=buildM18AutopilotState();
  assert.equal(s.status,'AUTOPILOT_ACTIVE_PREPROD');
  assert.equal(s.phase,'CONTINUOUS_M18_MISSION_SWEEP');
  assert.equal(s.m18_atomic_units,84);
  assert.equal(s.continuous_worker.workflow,'.github/workflows/cerebro-cloud-useful-continuous-worker-v1.yml');
  assert.equal(s.continuous_worker.mission_filter,'M18');
  assert.equal(s.continuous_worker.auto_refill,true);
  assert.equal(s.continuous_worker.max_cycle,504);
  assert.equal(s.human_required,null);
  assert.equal(s.prod_authorized,false);
});

test('artifact writer creates inspectable evidence and localization scaffold without PROD authority',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'m18-autopilot-'));
  const out=writeM18AutopilotArtifacts({outRoot:tmp,repoWrite:false});
  assert.equal(fs.existsSync(path.join(tmp,'M18_CAPABILITY_DECISIONS_V1.json')),true);
  assert.equal(fs.existsSync(path.join(tmp,'M18_CAPABILITY_GRAPH_V1.json')),true);
  assert.equal(fs.existsSync(path.join(tmp,'M18_AUTOPILOT_STATE_V1.json')),true);
  assert.equal(fs.existsSync(path.join(tmp,'localization-factory/localization-factory-v1.scaffold.test.mjs')),true);
  assert.equal(out.state.safety.prod_write,false);
});
