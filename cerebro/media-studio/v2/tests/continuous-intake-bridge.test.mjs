import test from 'node:test';
import assert from 'node:assert/strict';
import {buildUmsContinuousLearningProposal} from '../learning/continuous-intake-bridge.mjs';

function candidate(overrides={}){return {candidate_id:'repo:media-safe',technical_name:'video-render-workflow',source_locator:'github://example/repo@0123456789012345678901234567890123456789/skills/video-render',pinned_sha:'0123456789012345678901234567890123456789',snapshot_sha256:'a'.repeat(64),manifest_sha256:'b'.repeat(64),outcome_hash:'c'.repeat(64),target_engine_bindings:['QA-001'],capability_contracts:[{technical_name:'video-render-workflow',description:'Video render timeline color and audio workflow',domains:[{domain_id:'media-video-render',engine_bindings:['QA-001']}]}],closure_summary:{full_safe_preprod:true,per_binding_old_vs_new_pass:true,tribunal_pass:true},status:'PROD_CAPABILITY_AVAILABLE_READONLY',learning_impact_status:'LRN_IMPACT_GREEN_PREPROD',prod_write_authorized:false,prod_mutation_authorized:false,external_skill_code_execution:false,trading_access:false,additional_cost_eur:0,current_evidence:'GREEN_CANARY',observed_at:'2026-10-25T12:00:00Z',...overrides};}
const snapshot={snapshot_date:'2026-10-25',sources:[{source_id:'ACES',uri:'https://example.invalid/aces',departments:['DPT-IMAGE'],observed_version:'2.0',topic:'color_management'}]};

test('safe media capability becomes benchmark-required proposal, never accepted knowledge',()=>{
  const dynamic_registry={state_type:'CEREBRO_DYNAMIC_SKILL_ADOPTION_REGISTRY_V1',capabilities:[candidate()]};
  const report=buildUmsContinuousLearningProposal({dynamic_registry,source_snapshot:snapshot,now:new Date('2026-10-25T12:00:00Z')});
  assert.equal(report.status,'PREPROD_REVIEW_REQUIRED');
  assert.equal(report.media_relevant_capabilities,1);
  assert.equal(report.learning_candidates[0].status,'BENCHMARK_REQUIRED');
  assert.equal(report.learning_candidates[0].promotion_authorized,false);
  assert.equal(report.knowledge_auto_promotion,false);
  assert.equal(report.readiness_mutation,false);
  assert.equal(report.additional_cost_eur,0);
});

test('unsafe, paid or unproven capability is rejected from UMS learning candidates',()=>{
  const dynamic_registry={state_type:'CEREBRO_DYNAMIC_SKILL_ADOPTION_REGISTRY_V1',capabilities:[candidate({prod_write_authorized:true}),candidate({candidate_id:'repo:paid',additional_cost_eur:1}),candidate({candidate_id:'repo:no-tribunal',closure_summary:{full_safe_preprod:true,per_binding_old_vs_new_pass:true,tribunal_pass:false}})]};
  const report=buildUmsContinuousLearningProposal({dynamic_registry,source_snapshot:snapshot,now:new Date('2026-10-25T12:00:00Z')});
  assert.equal(report.learning_candidates.length,0);
  assert.equal(report.rejected_unsafe_or_unproven,3);
});

test('non-media safe capability does not contaminate media learning',()=>{
  const dynamic_registry={state_type:'CEREBRO_DYNAMIC_SKILL_ADOPTION_REGISTRY_V1',capabilities:[candidate({technical_name:'tax-ledger-review',capability_contracts:[{technical_name:'tax-ledger-review',description:'Tax ledger review',domains:[{domain_id:'finance-ops',engine_bindings:['FIN-001']}]}]})]};
  const report=buildUmsContinuousLearningProposal({dynamic_registry,source_snapshot:snapshot,now:new Date('2026-10-25T12:00:00Z')});
  assert.equal(report.safe_capabilities,1);
  assert.equal(report.media_relevant_capabilities,0);
});

test('style-only design capability is rejected even if description mentions a visual attribute',()=>{
  const style=candidate({technical_name:'gradient',source_locator:'github://example/styles/gradient',capability_contracts:[{technical_name:'gradient',description:'Colorful gradient visual style for modern interfaces',domains:[{domain_id:'web-wordpress-frontend',engine_bindings:['WEB-001']}]}]});
  const report=buildUmsContinuousLearningProposal({dynamic_registry:{state_type:'CEREBRO_DYNAMIC_SKILL_ADOPTION_REGISTRY_V1',capabilities:[style]},source_snapshot:snapshot,now:new Date('2026-10-25T12:00:00Z')});
  assert.equal(report.media_relevant_capabilities,0);
  assert.equal(report.rejected_weak_media_signal,1);
});

test('operational description fallback requires multiple media groups plus an action',()=>{
  const operational=candidate({technical_name:'media-worker',capability_contracts:[{technical_name:'media-worker',description:'Analyze image frames and process audio tracks into synchronized outputs',domains:[{domain_id:'creative-tools',engine_bindings:['QA-001']}]}]});
  const report=buildUmsContinuousLearningProposal({dynamic_registry:{state_type:'CEREBRO_DYNAMIC_SKILL_ADOPTION_REGISTRY_V1',capabilities:[operational]},source_snapshot:snapshot,now:new Date('2026-10-25T12:00:00Z')});
  assert.equal(report.media_relevant_capabilities,1);
  assert.equal(report.learning_candidates[0].relevance_signal,'MULTI_GROUP_OPERATIONAL_DESCRIPTION');
});

test('duplicate technical capability and domain keep only newest governed evidence',()=>{
  const older=candidate({candidate_id:'repo:old',technical_name:'image-analysis',source_locator:'github://example/repo@old/skills/image-analysis',observed_at:'2026-10-20T12:00:00Z',capability_contracts:[{technical_name:'image-analysis',description:'Analyze image content',domains:[{domain_id:'image-analysis',engine_bindings:['QA-001']}]}]});
  const newer=candidate({candidate_id:'repo:new',technical_name:'image-analysis',source_locator:'github://example/repo@new/skills/image-analysis',observed_at:'2026-10-25T12:00:00Z',capability_contracts:[{technical_name:'image-analysis',description:'Analyze image content',domains:[{domain_id:'image-analysis',engine_bindings:['QA-001']}]}]});
  const report=buildUmsContinuousLearningProposal({dynamic_registry:{state_type:'CEREBRO_DYNAMIC_SKILL_ADOPTION_REGISTRY_V1',capabilities:[older,newer]},source_snapshot:snapshot,now:new Date('2026-10-25T12:00:00Z')});
  assert.equal(report.media_relevant_raw,2);
  assert.equal(report.media_relevant_capabilities,1);
  assert.equal(report.media_duplicates_removed,1);
  assert.equal(report.learning_candidates[0].source_candidate_id,'repo:new');
});

test('stale professional source snapshot creates refresh jobs without promoting knowledge',()=>{
  const dynamic_registry={state_type:'CEREBRO_DYNAMIC_SKILL_ADOPTION_REGISTRY_V1',capabilities:[]};
  const report=buildUmsContinuousLearningProposal({dynamic_registry,source_snapshot:snapshot,now:new Date('2026-11-10T12:00:00Z')});
  assert.equal(report.professional_source_freshness.stale,true);
  assert.equal(report.source_refresh_jobs.length,1);
  assert.equal(report.knowledge_auto_promotion,false);
});
