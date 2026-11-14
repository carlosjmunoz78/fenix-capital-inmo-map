import test from 'node:test';
import assert from 'node:assert/strict';
import {ActionGatewayV1} from '../../../gateway/action-gateway-v1.mjs';
import {evaluateSeoAutopublishShadow,installSeoAutopublishGatewayShadow}
 from '../runtime/seo-autopublish-gateway-shadow-v0.mjs';

const now=1770000000000,sha='a'.repeat(64);
const request={company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
 version:'0.1.0',site_origin:'https://fenixcapital.es',
 work_id:'SEO001-FENIX-B2C-EDITORIAL-001',content_sha256:sha,
 slug:'comparar-dos-pisos-cordoba',content_class:'STANDARD_BLOG'};
const actor={verified:true,assurance:'SERVER_VERIFIED',company_id:'fenix',
 role:'SEO_PUBLISHER_SHADOW',principal_id:'seo-publisher-shadow'};
const item={company_id:'fenix',work_id:request.work_id,content_sha256:sha,
 content_class:request.content_class,slug:request.slug,
 independent_editorial_qa_approved:true,original_media_license_verified:true,
 global_media_duplicate_check_passed:true,live_slug_collision_free:true,
 source_citations_checked:true,author_principal_id:'seo-author',
 reviewer_principal_id:'seo-independent-reviewer',
 slug_verified_at_ms:now-5000,owner_exact_digest_approved:true,
 owner_approval_assurance:'SERVER_VERIFIED'};
const oneRelease=i=>({
 release_id:'release_verified_'+i,company_id:'fenix',engine_id:'SEO-001',
 site_origin:request.site_origin,content_class:request.content_class,
 status:'PUBLISHED_VERIFIED',owner_exact_sha_approved:true,
 owner_approval_assurance:'SERVER_VERIFIED',independent_qa_approved:true,
 physical_release_audited:true,slug:'verified-post-'+i,
 content_sha256:String(i).repeat(64),published_at_ms:now-5000
});
const grant={
 verified:true,assurance:'SERVER_VERIFIED',signature_verified:true,revoked:false,
 grant_id:'grant_fenix_seo001_001',company_id:'fenix',engine_id:'SEO-001',
 site_origin:request.site_origin,content_class:'STANDARD_BLOG',
 allowed_slug_prefix:'comparar-',issued_at_ms:now-2000,expires_at_ms:now+1000000
};
const state=()=>({assurance:'SERVER_VERIFIED',company_id:'fenix',
 engine_id:'SEO-001',environment:'PREPROD_SHADOW',version:'0.1.0',
 source_kind:'TRUSTED_PRIVATE_LEDGER_READER',security_incident:false,
 kill_switch_enabled:true,grants_revoked:false,
 safety:{real_hostinger_backup_isolated_restore_verified:true,
  physical_rollback_verified:true,least_privilege_iam_verified:true,
  gateway_binding_verified:true,independent_tribunal_verified:true,
  observability_idempotency_budget_verified:true},
 current_item:{...item},successful_new_url_publications:[],owner_scope_grant:null});
const assess=(s=state(),r=request,a=actor)=>evaluateSeoAutopublishShadow({
 request:r,actor:a,evidence:s,now_ms:now});
const denied=(out,reason)=>{assert.equal(out.status,'HUMAN_REQUIRED');
 assert.equal(out.reason,reason);assert.equal(out.executed,false);
 assert.equal(out.wordpress_writes,0);assert.equal(out.production_publish_authorized,false);};

test('initial state requires exact owner approval even if 3 calendar days elapsed',()=>{
 const s=state();s.current_item.owner_exact_digest_approved=false;
 denied(assess(s),'SIGNATURE_REQUIRED');
 s.current_item.owner_exact_digest_approved=true;
 const r=assess(s);
 assert.equal(r.status,'SHADOW_SUPERVISED_APPROVAL_PRESENT');
 assert.equal(r.owner_approval_required_for_current_item,true);
 assert.equal(r.verified_prior_publication_count,0);
 assert.equal(r.production_publish_authorized,false);
});

test('1 or 2 successful owner publications remain supervised; three transition to shadow auto',()=>{
 for(const n of [1,2]){const s=state();s.successful_new_url_publications=[1,2].slice(0,n).map(oneRelease);
  const r=assess(s);assert.equal(r.status,'SHADOW_SUPERVISED_APPROVAL_PRESENT');
  assert.equal(r.verified_prior_publication_count,n);}
 const s=state();s.successful_new_url_publications=[1,2,3].map(oneRelease);
 s.owner_scope_grant={...grant};
 const r=assess(s);
 assert.equal(r.status,'SHADOW_AUTONOMOUS_SCOPE_ELIGIBLE');
 assert.equal(r.owner_approval_required_for_current_item,false);
 assert.equal(r.verified_prior_publication_count,3);
 assert.equal(r.execute_wordpress_operation,false);
 assert.equal(r.production_publish_authorized,false);
});

test('three prior publications without explicit scoped owner grant cannot promote',()=>{
 const s=state();s.successful_new_url_publications=[1,2,3].map(oneRelease);
 denied(assess(s),'SIGNATURE_REQUIRED');
});

test('revoked, expired, cross-tenant, wrong-content and wrong-slug grants deny autopublish',()=>{
 for(const mutation of [
  g=>{g.revoked=true;},g=>{g.expires_at_ms=now-1;},
  g=>{g.company_id='different-company';},g=>{g.content_class='FINANCIAL_MORTGAGE';},
  g=>{g.allowed_slug_prefix='other-';},g=>{g.signature_verified=false;}
 ]){
  const s=state();s.successful_new_url_publications=[1,2,3].map(oneRelease);
  s.owner_scope_grant={...grant};mutation(s.owner_scope_grant);
  denied(assess(s),'SIGNATURE_REQUIRED');
 }
});

test('reused prior releases and corrupt ledger cannot fake three published posts',()=>{
 for(const mutation of [
  a=>{a[1].release_id=a[0].release_id;},
  a=>{a[1].slug=a[0].slug;},
  a=>{a[2].owner_exact_sha_approved=false;},
  a=>{a[2].status='DRAFT';},
  a=>{a[2].company_id='other';},
  a=>{a[2].published_at_ms=now+1;}
 ]){
  const s=state();s.successful_new_url_publications=[1,2,3].map(oneRelease);
  mutation(s.successful_new_url_publications);
  s.owner_scope_grant={...grant};
  denied(assess(s),'SECURITY_INCIDENT');
 }
});

test('physical backup and rollback are mandatory for every mode',()=>{
 for(const key of ['real_hostinger_backup_isolated_restore_verified','physical_rollback_verified']){
  const s=state();s.safety[key]=false;
  denied(assess(s),'HIGH_RISK');
 }
});

test('missing isolated IAM/Gateway/tribunal/monitoring refuses even simulated publishing',()=>{
 for(const key of ['least_privilege_iam_verified','gateway_binding_verified',
  'independent_tribunal_verified','observability_idempotency_budget_verified']){
  const s=state();s.safety[key]=false;
  denied(assess(s),'POLICY_CONFLICT');
 }
});

test('no QA, missing image rights, duplicate media, stale slug or tampered digest',()=>{
 for(const mutation of [
  s=>{s.current_item.independent_editorial_qa_approved=false;},
  s=>{s.current_item.original_media_license_verified=false;},
  s=>{s.current_item.global_media_duplicate_check_passed=false;},
  s=>{s.current_item.slug_verified_at_ms=now-600001;},
  s=>{s.current_item.content_sha256='b'.repeat(64);},
  s=>{s.current_item.live_slug_collision_free=false;}
 ]){
  const s=state();mutation(s);
  denied(assess(s),'HIGH_RISK');
 }
});

test('mortgage financial scope requires independent legal YMYL QA, not ordinary blog QA',()=>{
 const s=state(),r={...request,content_class:'FINANCIAL_MORTGAGE'};
 s.current_item.content_class='FINANCIAL_MORTGAGE';
 denied(assess(s,r),'LEGAL_REQUIRED');
 s.current_item.independent_legal_ymyl_qa_approved=true;
 const out=assess(s,r);
 assert.equal(out.status,'SHADOW_SUPERVISED_APPROVAL_PRESENT');
});

test('publisher cannot be the author or the independent reviewer',()=>{
 const s=state();s.current_item.author_principal_id=actor.principal_id;
 denied(assess(s),'POLICY_CONFLICT');
 const t=state();t.current_item.reviewer_principal_id=actor.principal_id;
 denied(assess(t),'POLICY_CONFLICT');
});

test('security incident, revoked global grant and missing external IAM fail closed',()=>{
 const s=state();s.security_incident=true;
 denied(assess(s),'SECURITY_INCIDENT');
 const t=state();t.grants_revoked=true;
 denied(assess(t),'POLICY_CONFLICT');
 denied(assess(state(),request,{...actor,verified:false}),'POLICY_CONFLICT');
 denied(assess(state(),{...request,company_id:'other'}),'POLICY_CONFLICT');
 denied(assess({...state(),assurance:'USER_SUBMITTED'}),'POLICY_CONFLICT');
});

test('real ACTGW PREPROD wiring: ticket required, only synthetic shadow actions and no CMS writes',async()=>{
 const gateway=new ActionGatewayV1();
 const session='synthetic-shadow-session-reference';
 let actors=0,evidences=0;
 const binding=installSeoAutopublishGatewayShadow({
  actionGateway:gateway,clock:()=>now,
  verifyTrustedActor:async({session_ref,company_id,required_role})=>{
   assert.equal(session_ref,session);assert.equal(company_id,'fenix');
   assert.equal(required_role,'SEO_PUBLISHER_SHADOW');actors++;return {...actor};
  },
  readTrustedPromotionEvidence:async({company_id,work_id,content_sha256,slug})=>{
   assert.equal(company_id,'fenix');assert.equal(work_id,request.work_id);
   assert.equal(content_sha256,sha);assert.equal(slug,request.slug);
   evidences++;return state();
  }
 });
 const raw=await gateway.execute({
  context:{company_id:'fenix',engine_id:'ACTGW-001',environment:'PREPROD',version:'0.1.0'},
  authorized:true,capability:binding.capability,idempotency_key:'direct-attack',
  payload:{ticket:'forged',request_digest:'fake'},risk:'LOW'
 });
 denied(raw,'POLICY_CONFLICT');
 const response=await binding.request({
  session_ref:session,request_id:'shadow-test-run001',work_id:request.work_id,
  content_sha256:sha,slug:request.slug,content_class:request.content_class
 });
 assert.equal(response.status,'ACTION_EXECUTED');
 assert.equal(response.result.status,'SHADOW_SUPERVISED_APPROVAL_PRESENT');
 assert.equal(actors,1);assert.equal(evidences,1);
 assert.equal(binding.production_publishing_authorized,false);
 assert.equal(binding.real_wordpress_connector_installed,false);
 assert.equal(response.result.execute_wordpress_operation,false);
 assert.equal(JSON.stringify(gateway.auditLog()).includes(session),false);
 assert.equal(JSON.stringify(response).includes(session),false);
});

test('gateway rejects unauthenticated sessions and never calls its trusted evidence providers',async()=>{
 let calls=0;const gateway=new ActionGatewayV1();
 const binding=installSeoAutopublishGatewayShadow({actionGateway:gateway,
  verifyTrustedActor:async()=>{calls++;return actor;},
  readTrustedPromotionEvidence:async()=>{calls++;return state();}});
 const result=await binding.request({session_ref:'no',request_id:'unauthorized123',
  work_id:request.work_id,content_sha256:sha,slug:request.slug,content_class:request.content_class});
 denied(result,'POLICY_CONFLICT');
 assert.equal(calls,0);
});

test('shadow adapter requires existing PREPROD action gateway and private evidence providers',()=>{
 assert.throws(()=>installSeoAutopublishGatewayShadow({actionGateway:new ActionGatewayV1()}),
  /TRUSTED_CALLBACKS_REQUIRED/);
 assert.throws(()=>installSeoAutopublishGatewayShadow({
  verifyTrustedActor:async()=>actor,readTrustedPromotionEvidence:async()=>state()}),
  /PREPROD_ACTGW_REQUIRED/);
 assert.throws(()=>new ActionGatewayV1({environment:'PROD'}),/PREPROD-only/);
});
