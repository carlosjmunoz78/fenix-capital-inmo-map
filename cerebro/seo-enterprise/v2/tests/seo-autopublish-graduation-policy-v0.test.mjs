import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const policy=JSON.parse(fs.readFileSync('cerebro/seo-enterprise/v2/seo-prod-draft-autopublish-policy-v0.json','utf8'));

test('draft status is only the temporary preparation phase, not the final destination',()=>{
 const l=policy.lifecycle;
 assert.equal(policy.state,'DEFINED_NOT_LIVE_CONNECTED');
 assert.equal(policy.environment,'POLICY_LAB_NOT_ENFORCED');
 assert.equal(l.target,'HUMAN_BY_EXCEPTION_SCOPED_AUTONOMOUS_NEW_URL_PUBLICATION');
 assert.equal(l.drafts_role,'TEMPORARY_STAGING_AND_QA_GATE_NOT_PERMANENT_OPERATING_MODE');
 assert.equal(l.calendar_time_alone_must_never_approve,true);
 assert.equal(l.no_forced_calendar_wait_after_verified_gates,true);
 assert.equal(l.supervised_period_goal_days,3);
 assert.equal(l.current_operational_phase,'DRAFT_PREPARATION');
 assert.equal(l.current_operational_phase_verified,false);
 assert.equal(l.current_scoped_autopublish_grant_present,false);
 assert.equal(l.production_publisher_connected,false);
});

test('three individually approved first publications then scoped automatic ordinary publishing',()=>{
 const l=policy.lifecycle;
 assert.deepEqual(l.phases.map(p=>p.id),[
  'DRAFT_PREPARATION','SUPERVISED_PUBLICATION','SCOPED_AUTOPUBLISH','PAUSED_OR_ROLLBACK']);
 assert.equal(l.supervised_initial_publications,3);
 assert.equal(policy.graduation.minimum_individually_owner_approved_successful_publications,3);
 const supervised=l.phases[1],automatic=l.phases[2];
 assert.equal(supervised.requires_owner_each_publication,true);
 assert.equal(automatic.requires_owner_each_publication,false);
 assert.equal(automatic.allows_live_publication,true);
 assert.equal(l.auto_publish_without_new_owner_approval_after_graduation,true);
 assert.equal(l.per_item_independent_qa_still_required,true);
 assert.equal(l.final_promotion_requirements.includes('SIGNED_OWNER_GRANT_COMPANY_CONTENT_CLASS_CHANNEL'),true);
 assert.equal(l.final_promotion_requirements.includes('REAL_HOSTINGER_PRIVATE_FULL_RESTORE_AND_ROLLBACK_PROOF'),true);
 assert.equal(l.final_promotion_requirements.includes('REAL_LEAST_PRIVILEGE_ACTOR_IAM_AND_PUBLISH_GATEWAY_BINDING'),true);
});

test('autopublish is constrained to new URLs, never delete/modify existing posts or self-grant rights',()=>{
 const l=policy.lifecycle;
 assert.equal(policy.hard_limits.never_auto_change_existing_published_pages,true);
 assert.equal(policy.hard_limits.never_auto_expand_scopes,true);
 assert.equal(l.actions_allowed_after_scoped_promotion.includes('PUBLISH_NEW_OWNER_GRANTED_SCOPE_URL'),true);
 for(const forbidden of ['MODIFY_EXISTING_PUBLISHED_POST','DELETE_POST','PUBLISH_LEGAL_TEXT','CHANGE_APP_CRM','BUY_SUBSCRIPTIONS','ESCALATE_SELF_PERMISSIONS']){
  assert.equal(l.actions_never_implicitly_granted.includes(forbidden),true);
  assert.equal(l.actions_allowed_after_scoped_promotion.includes(forbidden),false);
 }
 assert.equal(l.publisher_identity,'SEPARATE_FROM_DRAFT_PREPARER_WITH_GATEWAY_SCOPED_AUTHORITY');
 assert.equal(policy.physical_state.real_auto_publish_enabled,false);
 assert.equal(policy.physical_state.real_rollback_verified,false);
 assert.equal(policy.cost.additional_subscriptions_eur,0);
});

test('scoped autonomy still routes exceptional cases to humans and fail-closed safety',()=>{
 const allowed=new Set([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT',
  'SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
 assert.deepEqual(new Set(policy.human_required),allowed);
 assert.equal(policy.graduation.requires_owner_grant_for_scoped_automatic_publication,true);
 assert.equal(policy.graduation.independent_qa_each_time,true);
 assert.equal(policy.graduation.revocable_on_error,true);
 assert.equal(policy.hard_limits.missing_trusted_proof_fail_closed,true);
 assert.equal(policy.lifecycle.phases[3].allows_live_publication,false);
});
