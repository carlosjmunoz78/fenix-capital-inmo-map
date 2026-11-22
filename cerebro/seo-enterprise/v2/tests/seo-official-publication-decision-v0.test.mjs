import test from 'node:test';
import assert from 'node:assert/strict';
import {assessSeoOfficialPublishing,SEO_OFFICIAL_PUBLICATION_POLICY_V0} from '../runtime/seo-official-publication-decision-v0.mjs';
const base={
 company_id:'fenix',site_origin:'https://fenixcapital.es',
 content_class:'STANDARD_LOCAL_LANDING',operation:'CREATE_NEW_URL',
 prerequisites:{inventory_checked:true,unique_slug_verified:true,site_access_scope_verified:true,
  backup_restorable:true,rollback_tested:true,wp_draft_api_credential_scoped:true,
  production_publish_api_scoped:true,publication_monitoring_active:true},
 content_safety:{independent_qa_passed:true,sources_verified:true,legal_policy_passed:true,incident_found:false},
 authorization:{},history:{}
};
const checked={score:96,quality:96,safety:99};
const auto={history:{independent_owner_approvals_verified:3,independent_qa_successes_verified:3,
 merit_recent_approved_scores:[checked,checked,checked]},
 authorization:{owner_autopublish_grant_gateway_verified:true,agent_iam_verified:true,evaluator_iam_verified:true,
  grant_company_id:'fenix',grant_content_class:'STANDARD_LOCAL_LANDING',grant_active:true,grant_revoked:false}};
test('official public read allowed but never writes',()=>{
 const r=assessSeoOfficialPublishing({...base,operation:'PUBLIC_READ'});
 assert.equal(r.status,'OFFICIAL_PUBLIC_READ_ALLOWED');
 assert.equal(r.production_write_executed,false);
 assert.equal(SEO_OFFICIAL_PUBLICATION_POLICY_V0.live_wordpress_enforcement,false);
 assert.equal(SEO_OFFICIAL_PUBLICATION_POLICY_V0.default_new_url_status,'draft');
});
test('new URL always starts draft; owner approval tied to exact digest may make publish eligible',()=>{
 const draft=assessSeoOfficialPublishing(base);
 assert.equal(draft.status,'DRAFT_ONLY_PENDING_OWNER_APPROVAL');
 assert.equal(draft.desired_wordpress_status,'draft');assert.equal(draft.can_publish,false);
 const approved=assessSeoOfficialPublishing({...base,authorization:{
  owner_approved_this_draft:true,owner_approval_gateway_verified:true,approval_content_digest_matches:true}});
 assert.equal(approved.status,'OWNER_APPROVED_PUBLICATION_ELIGIBLE');
 assert.equal(approved.can_publish,true);
 assert.equal(approved.autopublish,false);
 assert.equal(approved.production_write_executed,false);
 const spoof=assessSeoOfficialPublishing({...base,authorization:{owner_approved_this_draft:true}});
 assert.equal(spoof.can_publish,false);
});
test('three good owner-approved missions produce autonomy eligibility ONLY with independent IAM, owner scope and recovery',()=>{
 const result=assessSeoOfficialPublishing({...base,...auto});
 assert.equal(result.status,'SCOPED_AUTOPUBLISH_ELIGIBLE');
 assert.equal(result.autopublish,true);
 assert.equal(result.requires_last_mile_wordpress_preflight,true);
 assert.equal(result.production_write_executed,false);
 const notYet=assessSeoOfficialPublishing({...base,...auto,
  history:{...auto.history,independent_owner_approvals_verified:2}});
 assert.equal(notYet.can_publish,false);
 const noOwnerGrant=assessSeoOfficialPublishing({...base,...auto,
  authorization:{...auto.authorization,owner_autopublish_grant_gateway_verified:false}});
 assert.equal(noOwnerGrant.can_publish,false);
 const wrongScope=assessSeoOfficialPublishing({...base,...auto,
  authorization:{...auto.authorization,grant_content_class:'STANDARD_BLOG'}});
 assert.equal(wrongScope.can_publish,false);
 const revoked=assessSeoOfficialPublishing({...base,...auto,
  authorization:{...auto.authorization,grant_revoked:true}});
 assert.equal(revoked.can_publish,false);
 const badScore=assessSeoOfficialPublishing({...base,...auto,
  history:{...auto.history,merit_recent_approved_scores:[checked,{score:45,quality:50,safety:70},checked]}});
 assert.equal(badScore.can_publish,false);
});
test('financial mortgage claims cannot publish without independent fact-check and legally required review',()=>{
 const financial=assessSeoOfficialPublishing({...base,...auto,content_class:'FINANCIAL_MORTGAGE',
  authorization:{...auto.authorization,grant_content_class:'FINANCIAL_MORTGAGE'}});
 assert.equal(financial.status,'BLOCKED');
 assert.equal(financial.reason,'HIGH_RISK_FACT_CHECK_INCOMPLETE');
 const validated=assessSeoOfficialPublishing({...base,content_class:'FINANCIAL_MORTGAGE',
  content_safety:{...base.content_safety,independent_factcheck_passed:true,
   financial_claims_proven:true,legal_review_when_required_passed:true}});
 assert.equal(validated.desired_wordpress_status,'draft');
 assert.equal(validated.can_publish,false);
});
test('no modification of existing URLs, wrong domains, missing backups, new costs or unknown categories',()=>{
 for(const o of ['EDIT_EXISTING','REPLACE_PUBLISHED','DELETE','CROSS_COMPANY_UPDATE']){
  assert.equal(assessSeoOfficialPublishing({...base,operation:o}).can_publish,false);
 }
 assert.equal(assessSeoOfficialPublishing({...base,site_origin:'https://staging.fenixcapital.es'}).can_create_draft,false);
 assert.equal(assessSeoOfficialPublishing({...base,company_id:'otra'}).can_create_draft,false);
 assert.equal(assessSeoOfficialPublishing({...base,content_class:'OTHER'}).can_create_draft,false);
 assert.equal(assessSeoOfficialPublishing({...base,prerequisites:{...base.prerequisites,backup_restorable:false}}).can_create_draft,false);
 assert.equal(assessSeoOfficialPublishing({...base,content_safety:{...base.content_safety,incident_found:true}}).can_create_draft,false);
});
