import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DurableJobRuntimeV1} from '../../../runtime/durable-job-runtime-v1.mjs';
import {SEO_ORDER_TYPES,planSeoDirectorOrder,queueSeoOrderInLab,seoTeamReadiness}
 from '../runtime/seo-director-order-router-v1.mjs';
const load=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const training=load('seo-specialist-training-and-commands-v1.json');
const mkt=load('seo-marketing-plan-for-owner-approval-v1.json');
const assets=load('seo-existing-content-assets-source-registry-v1.json');
const org=load('organization.manifest.json');
const policy=load('seo-all-departments-full-lifecycle-v1.json');
const tmp=t=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),'seo-orders-v1-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));return path.join(d,'job001.v8');};
const base=(type,ref='OWNER_COMMAND_1234')=>({company_id:'fenix',work_type:type,objective:'Preparar una misión especializada del departamento sin publicar ni modificar el sitio',scope:'SITE',territory:'Córdoba',request_ref:ref});
test('courseware is unique, non-generic, complete for all 32 canonical departments and eight families',()=>{
 const canonical=new Map(org.departments.map(d=>[d.department_id,d.family_id]));
 const seen=new Set(),exercises=new Set();
 assert.equal(training.family_count,8);
 assert.equal(training.department_count,32);
 assert.equal(training.departments.length,32);
 for(const d of training.departments){
  assert.equal(d.family_id,canonical.get(d.department_id));
  assert.ok(!seen.has(d.department_id));
  seen.add(d.department_id);
  assert.ok(d.mission.length>15);
  assert.ok(d.training_unit.exercise.length>35);
  assert.ok(!exercises.has(d.training_unit.exercise));
  exercises.add(d.training_unit.exercise);
  assert.equal(d.training_unit.evaluation.real_exercises_passed,0);
  assert.equal(d.training_unit.evaluation.minimum_missions,3);
  assert.equal(d.training_unit.evaluation.score_threshold,90);
  assert.equal(d.training_unit.evaluation.safety_floor,95);
  assert.equal(d.training_unit.evaluation.independent_qa_required,true);
  assert.equal(d.training_unit.evaluation.tribunal_required,true);
  assert.equal(d.deployment.training_completed,false);
  assert.equal(d.deployment.real_exam_passed,false);
  assert.equal(d.deployment.skill_activated_prod,false);
  assert.equal(d.operator.actual_iam_principal_id,null);
  assert.equal(d.deployment.real_writes_authorized,false);
 }
 assert.deepEqual([...canonical.keys()].sort(),[...seen].sort());
 assert.equal(policy.department_count,32);
 assert.equal(training.role_instances_materialized_in_prod,0);
 const state=seoTeamReadiness();
 assert.equal(state.courseware_prepared,32);
 assert.equal(state.modules_prepared_percent,100);
 assert.equal(state.physical_agents_IAM_verified,0);
 assert.equal(state.physical_full_operational_percent,0);
});
test('all 12 specialist owner command types route to registered departments and director/QA/tribunal',()=>{
 assert.equal(SEO_ORDER_TYPES.length,12);
 for(let i=0;i<SEO_ORDER_TYPES.length;i++){
  const type=SEO_ORDER_TYPES[i];
  const r=planSeoDirectorOrder(base(type,'ORDER_'+String(i).padStart(5,'0')));
  assert.equal(r.company_id,'fenix');
  assert.equal(r.engine_id,'SEO-001');
  assert.equal(r.environment,'PREPROD');
  assert.equal(r.real_owner_identity_verified,false);
  assert.equal(r.real_agent_allocated,false);
  assert.equal(r.only_proposal,true);
  assert.equal(r.wordpress_production_writes_allowed,false);
  assert.equal(r.auto_publish,false);
  assert.equal(r.input_data_policy,'INTERNAL_EXISTING_ARTIFACTS_FIRST_NO_REAUDIT_BY_DEFAULT');
  assert.ok(r.immutable_request_sha256.length===64);
  assert.equal(r.collaborating_departments.length>0,true);
  assert.ok(r.governance_roles.includes('SEO-D31:QA_AGENT'));
  assert.ok(r.required_gates.includes('REAL_TRUSTED_OWNER_GATEWAY'));
  assert.ok(org.departments.some(x=>x.department_id===r.lead_department));
  assert.ok(r.director_role_templates.length>0);
 }
});
test('village design differences remain scoped staged backlog, not a mass edit or repeat full-site audit',()=>{
 const r=planSeoDirectorOrder({...base('TOWN_TEMPLATE_NORMALIZATION'),scope:'VILLAGE',
  objective:'Preparar un pueblo por vez; reemplazar morados y rosas con estructura visual coherente con ciudades'});
 assert.equal(r.output_artifact_type,'OWNER_SELECTED_ONE_URL_OLD_NEW_VISUAL_CANDIDATE');
 assert.equal(r.wordpress_production_writes_allowed,false);
 assert.equal(training.backlog.village_design_debt.no_mass_template_changes,true);
 assert.equal(training.backlog.village_design_debt.preserve_existing_urls_slugs_and_content,true);
 assert.equal(training.backlog.village_design_debt.state,'KNOWN_OWNER_OBSERVATION_NOT_SITE_REAUDITED');
 assert.equal(training.now_baseline,'EXISTING_AUDITS_ALREADY_DONE_DO_NOT_REPEAT');
});
test('marketing proposal is complete but explicitly awaits owner strategy approval and cannot spend or publish',()=>{
 assert.equal(mkt.approval_state,'PENDING_OWNER_STRATEGIC_APPROVAL');
 assert.equal(mkt.strategy_has_not_been_approved_by_owner,true);
 assert.equal(mkt.publication_or_spend_permission_granted,false);
 assert.equal(mkt.channels.length,6);
 assert.equal(mkt.segments.length,4);
 assert.equal(mkt.proposed_first_batch.length,6);
 assert.ok(mkt.content_funnel_requirements.includes('TWO_SEGMENTED_WEEKLY_NEWSLETTERS_FOR_PRIVATE_AND_AGENCIES'));
 assert.equal(mkt.kpis.cost_ceiling_eur,0);
 const r=planSeoDirectorOrder(base('MARKETING_PLAN'));
 assert.equal(r.state,'STRATEGY_PROPOSAL_PENDING_OWNER_APPROVAL');
 assert.equal(r.marketing_plan_owner_approved,false);
 assert.equal(r.extra_subscriptions_eur,0);
});
test('input identity, scope, tenant, unsupported commands, sensitive data and too-long objectives all fail closed',()=>{
 assert.throws(()=>planSeoDirectorOrder({...base('TECHNICAL_SEO'),company_id:'other'}),/INVALID_OR_SENSITIVE_SCOPE/);
 assert.throws(()=>planSeoDirectorOrder({...base('TECHNICAL_SEO'),scope:'WP_ADMIN'}),/TYPE_OR_SCOPE/);
 assert.throws(()=>planSeoDirectorOrder(base('PUBLISH_ALL')),/TYPE_OR_SCOPE/);
 assert.throws(()=>planSeoDirectorOrder({...base('LOCAL_SEO'),objective:'DNI 12345678Z'}),/INVALID_OR_SENSITIVE_SCOPE/);
 assert.throws(()=>planSeoDirectorOrder({...base('LOCAL_SEO'),objective:'Contactar email usuario@example.com'}),/INVALID_OR_SENSITIVE_SCOPE/);
 assert.throws(()=>planSeoDirectorOrder({...base('LOCAL_SEO'),objective:'x'.repeat(301)}),/INVALID_OR_SENSITIVE_SCOPE/);
});
test('persistent JOB-001 PLAN-ONLY queue accepts request once, never executes production work or grants authority',t=>{
 const file_path=tmp(t),order=base('MARKETING_PLAN');
 const a=queueSeoOrderInLab({file_path,order,now_ms:1793904000000});
 const b=queueSeoOrderInLab({file_path,order,now_ms:1793904000100});
 assert.equal(a.newly_queued,true);assert.equal(b.duplicate,true);
 assert.equal(a.job_id,b.job_id);
 assert.equal(a.real_workforce_activated,false);
 assert.equal(a.publish_authorized,false);
 assert.equal(a.external_writes,0);
 const reopened=new DurableJobRuntimeV1({file_path});
 const jobs=reopened.listForContext({company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'1.0.0'});
 assert.equal(jobs.length,1);
 assert.equal(jobs[0].status,'QUEUED');
 assert.equal(jobs[0].payload.owner_approval_required,true);
 assert.equal(jobs[0].payload.external_write,false);
 assert.equal(jobs[0].payload.publish_permission,false);
 assert.equal(jobs[0].payload.gate_real_owner_identity_verified,false);
});

test('marketing and all department courses reuse existing complete URL/copy/image V4 baseline, not recrawl or invent new assets',()=>{
 assert.equal(assets.canonical_snapshot.url_count,204);
 assert.equal(assets.canonical_snapshot.image_count,680);
 assert.equal(assets.canonical_snapshot.internal_links,42073);
 assert.equal(assets.canonical_snapshot.scope,'STAGING');
 assert.equal(assets.real_state.all_204_copy_payloads_loaded_in_job001,false);
 assert.equal(assets.real_state.all_680_image_maps_joined_to_prod,false);
 assert.equal(assets.constraints.no_global_reaudit_now,true);
 assert.equal(mkt.existing_assets_first.historical_urls,204);
 assert.equal(mkt.existing_assets_first.historical_images,680);
 assert.equal(mkt.existing_assets_first.content_creation_allowed_without_per_url_asset_evidence,false);
 assert.equal(mkt.existing_assets_first.marketing_plan_preliminary_until_asset_reconciliation,true);
 for(const d of training.departments){
  assert.ok(d.training_unit.study_sources.includes('cerebro/seo-enterprise/v2/seo-existing-content-assets-source-registry-v1.json'));
 }
 const routed=planSeoDirectorOrder(base('CONTENT_AND_LANDINGS'));
 assert.equal(routed.historical_url_copy_image_snapshot_verified,true);
 assert.equal(routed.historical_archive_operational,false);
 assert.equal(routed.historical_asset_payloads_mounted_in_job001,false);
 assert.equal(routed.current_operational_corpus,'ACCEPTED_FROZEN_PROD_2026_11_05');
 assert.equal(routed.current_corpus_documents,200);
 assert.equal(routed.current_corpus_images,629);
 assert.equal(routed.operational_source_policy,'PROD_FROZEN_ONLY_NO_STAGING_NO_REAUDIT');
 assert.ok(routed.existing_asset_registry.endsWith('fenix-prod-wp-url-media-inventory-2026-11-05-v1.json'));
 assert.equal(routed.historical_asset_join_is_not_an_activation_gate,true);
 assert.equal(routed.content_or_marketing_activation_blocked_until_asset_join,false);
 assert.equal(routed.content_or_marketing_execution_blocked_until_iam_qa_and_owner_gates,true);
 assert.equal(routed.only_proposal,true);
 assert.equal(routed.auto_publish,false);
});
