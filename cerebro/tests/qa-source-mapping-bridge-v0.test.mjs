import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveQaSource} from '../qa/source-resolver-v0.mjs';
import {buildSourceMappingState} from '../qa/source-mapping-bridge-v0.mjs';

test('resolver maps APP findings to verified repo hints and WEB findings to external PREPROD owner',()=>{
  const app=resolveQaSource({target:'APP:qa-mobile-chromium',dimension:'accessibility_names',owner_engine:'HCI-001'});
  assert.equal(app.status,'SOURCE_HINT_VERIFIED');
  assert.equal(app.repository,'carlosjmunoz78/fenix-capital-inmo-map');
  assert.deepEqual(app.file_hints,['src/App.tsx']);
  assert.equal(app.prod_write_authorized,false);
  const web=resolveQaSource({target:'WEB:qa-mobile-chromium',dimension:'mobile_usability',owner_engine:'HCI-001'});
  assert.equal(web.status,'EXTERNAL_SURFACE_OWNER_VERIFIED');
  assert.equal(web.mutation_surface,'WORDPRESS_PREPROD_ONLY');
  assert.equal(web.repository,null);
});

test('bridge binds SELF-001 repair plans to evidence-backed source surfaces',()=>{
  const improvements={candidates:[{improvement_id:'qa-imp:abc',target:'APP:qa-mobile-chromium',dimension:'accessibility_names',engine_id:'HCI-001'}]};
  const remediation={state_type:'CEREBRO_QA_AUTONOMOUS_REMEDIATION_STATE_V0',company_id:'fenix',cases:[{case_id:'case-1',source:'IMPROVEMENT',source_learning_id:'qa-learning:abc',owner_engine:'HCI-001'}]};
  const healing={state_type:'CEREBRO_SELF_HEALING_PLAN_BATCH_V0',plans:[{repair_id:'repair-1',case_id:'case-1',owner_engine:'HCI-001',source:'IMPROVEMENT',status:'PLAN_READY'}]};
  const state=buildSourceMappingState({improvements,remediation,healing,now:'2026-10-11T05:00:00Z'});
  assert.equal(state.mappings_total,1);
  assert.equal(state.verified_repo_hints,1);
  assert.equal(state.mappings[0].resolution.repository,'carlosjmunoz78/fenix-capital-inmo-map');
  assert.deepEqual(state.mappings[0].resolution.file_hints,['src/App.tsx']);
  assert.equal(state.mappings[0].execution_authority.code_mutation_authorized,false);
  assert.equal(state.next_gate,'AUTO001_PREPROD_PATCH_EXECUTOR_V0_DESIGN');
  assert.equal(state.safety.additional_subscription_eur,0);
});
