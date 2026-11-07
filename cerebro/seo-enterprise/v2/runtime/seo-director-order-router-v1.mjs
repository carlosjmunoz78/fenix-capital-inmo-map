/**
 * CEREBRO SEO · deterministic director/department routing and LAB order queue.
 * Owner messages are NOT IAM attestations. Never operates or publishes WordPress.
 * Reuses canonical SEO 8/32 registry, JOB-001 durable journal, and trained-role gates.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {DurableJobRuntimeV1} from '../../../runtime/durable-job-runtime-v1.mjs';
const load=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const catalog=load('seo-specialist-training-and-commands-v1.json');
const marketing=load('seo-marketing-plan-for-owner-approval-v1.json');
const assets=load('seo-existing-content-assets-source-registry-v1.json'); // archive metadata only
const approved=load('seo-operational-readonly-evidence-v1.json');
if(approved.company_id!=='fenix'||approved.engine_id!=='SEO-001'||
   approved.baseline?.snapshot_date!=='2026-11-05'||
   approved.baseline?.stored_urls!==200||approved.baseline?.media_library_images!==629||
   approved.baseline?.published_wordpress_pages!==166||
   approved.baseline?.published_wordpress_posts!==34||
   approved.governance?.no_new_audit!==true||approved.governance?.staging_off!==true)
  throw Error('SEO_APPROVED_PROD_CORPUS_REQUIRED');
const valid=new Set(catalog.departments.map(d=>d.department_id));
const TYPES=Object.freeze({
 SEO_STRATEGY:['SEO-D01','SEO-D02','SEO-D04','SEO-D29'],
 KEYWORDS_AND_SERP:['SEO-D05','SEO-D06','SEO-D07','SEO-D08'],
 COMPETITOR_RESEARCH:['SEO-D07','SEO-D02','SEO-D19'],
 TECHNICAL_SEO:['SEO-D09','SEO-D10','SEO-D11','SEO-D12','SEO-D23'],
 CONTENT_AND_LANDINGS:['SEO-D13','SEO-D05','SEO-D08','SEO-D14','SEO-D16'],
 LOCAL_SEO:['SEO-D17','SEO-D18','SEO-D19','SEO-D20'],
 TOWN_TEMPLATE_NORMALIZATION:['SEO-D21','SEO-D22','SEO-D23','SEO-D11','SEO-D31'],
 CRO_AND_FORMS:['SEO-D24','SEO-D14','SEO-D21','SEO-D30'],
 MEDIA_AND_AEO:['SEO-D25','SEO-D26','SEO-D28'],
 METRICS_AND_GSC:['SEO-D29','SEO-D30','SEO-D31'],
 MARKETING_PLAN:['SEO-D01','SEO-D04','SEO-D13','SEO-D17','SEO-D24','SEO-D28','SEO-D29'],
 TRAIN_AND_SUPERVISE:['SEO-D32','SEO-D31','SEO-D01']
});
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const safe=x=>typeof x==='string'&&!/[\u0000-\u001f]/.test(x)&&x.length>0&&x.length<=300;
const allowedScope=new Set(['SITE','CITY','PROVINCE','VILLAGE','CAMPAIGN','TRAINING']);
const normalize=x=>String(x||'').normalize('NFKC').toUpperCase();
const isSafeTopic=t=>!/@|(?:\b\d{8}[A-Z]\b)|(?:\b(?:IBAN|TOKEN|PASSWORD|CONTRASEÑA|DNI)\b)/i.test(t);
export const SEO_ORDER_TYPES=Object.freeze(Object.keys(TYPES));

export function planSeoDirectorOrder(order={}){
 const {company_id='fenix',work_type,objective,territory='Cordoba',
  scope='SITE',source='OWNER_STRATEGY_PENDING_AUTH',request_ref='SEO_ORDER_DEMO'}=order;
 if(company_id!=='fenix'||!safe(territory)||!safe(objective)||!isSafeTopic(objective)||
   !safe(request_ref)||!/^[A-Za-z0-9][A-Za-z0-9:_-]{3,78}$/.test(request_ref))
  throw Error('SEO_ORDER_INVALID_OR_SENSITIVE_SCOPE');
 if(!allowedScope.has(scope)||!Object.hasOwn(TYPES,work_type))throw Error('SEO_ORDER_TYPE_OR_SCOPE');
 const deps=TYPES[work_type];
 if(!deps.every(x=>valid.has(x)))throw Error('SEO_ORDER_DEPARTMENT_NOT_REGISTERED');
 const directors=[...new Set(deps.map(id=>catalog.departments.find(d=>d.department_id===id).family_id+':DIRECTOR'))];
 const needsEditorial=work_type==='CONTENT_AND_LANDINGS'||work_type==='MARKETING_PLAN'||work_type==='TOWN_TEMPLATE_NORMALIZATION';
 const needsOwnerStrategy=work_type==='SEO_STRATEGY'||work_type==='MARKETING_PLAN';
 const c={company_id,engine_id:'SEO-001',environment:'PREPROD',version:'1.0.0'};
 const route={
  schema_version:'1.0.0',...c,work_type,request_ref,objective,territory,scope,
  original_source:source,real_owner_identity_verified:false,
  state:needsOwnerStrategy?'STRATEGY_PROPOSAL_PENDING_OWNER_APPROVAL':'LAB_PLAN_AWAITING_TRUSTED_OWNER_GATE',
  lead_department:deps[0],collaborating_departments:deps.slice(1),
  director_role_templates:directors,
  governance_roles:['SEO-D31:QA_AGENT','SEO:GLOBAL:JUDGE','SEO:GLOBAL:TRIBUNAL','SEO-D32:TRAINING_SUPERVISOR'],
  dependency_engines:['FACT-001','SEO-001','JOB-001','POL-001','IAM-001','QA-001','LRN-001','MKT-001'],
  workflow:['INTAKE','LEAD_DECOMPOSE','REVIEW_EXISTING_EVIDENCE','WORK_IN_GRANTED_SCOPE',
   'INDEPENDENT_QA','TRIBUNAL','OWNER_APPROVAL_IF_NEEDED','MEASURE_RESULT','LRN_001_TRAIN'],
  required_gates:['REAL_TRUSTED_OWNER_GATEWAY','AGENT_ROLE_IAM','POLICY_SCOPE',
   'BACKUP_AND_ROLLBACK_IF_WRITE','INDEPENDENT_QA','TRIBUNAL','OBSERVABILITY','COST_MEASURED'],
  input_data_policy:'INTERNAL_EXISTING_ARTIFACTS_FIRST_NO_REAUDIT_BY_DEFAULT',
  existing_asset_registry:'cerebro/seo-enterprise/v2/data/fenix-prod-wp-url-media-inventory-2026-11-05-v1.json',
  current_operational_corpus:'ACCEPTED_FROZEN_PROD_2026_11_05',
  current_corpus_documents:approved.baseline.stored_urls,
  current_corpus_images:approved.baseline.media_library_images,
  current_corpus_fragment_glob:'cerebro/seo-enterprise/v2/data/live-copy-chunk-{01..10}.json',
  operational_source_policy:'PROD_FROZEN_ONLY_NO_STAGING_NO_REAUDIT',
  historical_archive_operational:false,
  historical_reference_registry:'cerebro/seo-enterprise/v2/seo-existing-content-assets-source-registry-v1.json',
  existing_asset_archive_status:assets.canonical_snapshot.status,
  historical_url_copy_image_snapshot_verified:assets.canonical_snapshot.url_count===204&&
   assets.canonical_snapshot.image_count===680&&assets.canonical_snapshot.internal_links===42073,
  historical_asset_payloads_mounted_in_job001:assets.real_state.all_204_copy_payloads_loaded_in_job001,
  full_production_url_copy_image_join_verified:assets.real_state.all_680_image_maps_joined_to_prod,
  proposed_asset_revision_requires_reconciliation:true,
  historical_asset_join_is_not_an_activation_gate:true,
  content_or_marketing_activation_blocked_until_asset_join:false,
  content_or_marketing_execution_blocked_until_iam_qa_and_owner_gates:true,
  draft_approval_is_temporary:true,full_seo_work_required:true,
  only_proposal:true,auto_publish:false,wordpress_production_writes_allowed:false,
  real_agent_allocated:false,marketing_plan_owner_approved:false,
  output_artifact_type:work_type==='MARKETING_PLAN'?'OWNER_MARKETING_STRATEGY_DECISION':
   work_type==='TOWN_TEMPLATE_NORMALIZATION'?'OWNER_SELECTED_ONE_URL_OLD_NEW_VISUAL_CANDIDATE':
   needsEditorial?'SEO_PROPOSED_ASSET_WITH_EDITORIAL_QA':'SEO_MISSION_EVIDENCE_AND_RECOMMENDATION',
  extra_subscriptions_eur:0
 };
 return {...route,immutable_request_sha256:digest(route)};
}
export function queueSeoOrderInLab({file_path,order,now_ms=Date.now()}={}){
 const plan=planSeoDirectorOrder(order);
 if(typeof file_path!=='string'||!file_path.trim()||!Number.isSafeInteger(now_ms)||now_ms<1)
  throw Error('SEO_LAB_QUEUE_PARAMETERS');
 const journal=new DurableJobRuntimeV1({file_path});
 const c={company_id:plan.company_id,engine_id:plan.engine_id,
  environment:'PREPROD',version:plan.version};
 const enq=journal.enqueue({
  context:c,name:'SEO_OWNER_COMMAND_PLAN_ONLY_V1',
  idempotency_key:'seo-orders-v1-'+plan.immutable_request_sha256,
  now_ms,priority:85,max_attempts:1,timeout_ms:10000,
  payload:{
   work_type:plan.work_type,request_ref:plan.request_ref,request_hash:plan.immutable_request_sha256,
   lead_department:plan.lead_department,collaborating_departments:plan.collaborating_departments,
   scope:plan.scope,territory:plan.territory,
   desired_result:'PROPOSAL_NOT_PUBLISHED',owner_approval_required:true,
   gate_real_owner_identity_verified:false,external_write:false,publish_permission:false,
   schema_version:'1.0.0'
  }
 });
 return {state:'LAB_COMMAND_PLANNED_NOT_EXECUTED_IN_PROD',
  company_id:plan.company_id,engine_id:plan.engine_id,
  job_id:enq.job.job_id,newly_queued:enq.accepted,duplicate:enq.duplicate,
  lead_department:plan.lead_department,marketing_plan_approved:false,
  real_workforce_activated:false,publish_authorized:false,external_writes:0,
  additional_eur:0};
}
export function seoTeamReadiness(){
 const all=catalog.departments;
 const complete=all.filter(d=>d.training_unit.exercise&&d.training_unit.expected_artifact&&
  d.training_unit.evaluation.independent_qa_required&&d.training_unit.evaluation.tribunal_required);
 const real=all.filter(d=>d.deployment.real_exam_passed&&d.operator.actual_iam_principal_id);
 return {
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
  logical_departments_defined:all.length,courseware_prepared:complete.length,
  physical_agents_IAM_verified:real.length,real_trained_agents_certified:0,
  modules_prepared_percent:Math.round(complete.length/all.length*100),
  physical_full_operational_percent:0,
  marketing_plan_status:marketing.approval_state,
  historical_urls_copy_images_registry_verified:true,
  historical_asset_payloads_ingested_in_job001:assets.real_state.all_204_copy_payloads_loaded_in_job001,
  marketing_strategy_owner_approved:false,
  full_auto_publishing:false,manual_owner_approval_for_new_content:true,
  zero_new_subscription:true,can_route_safe_lab_orders:true,
  real_prod_gateway_exposed:false
 };
}
