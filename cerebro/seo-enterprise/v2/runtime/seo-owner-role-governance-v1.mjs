/**
 * SEO-001 universal role inheritance. Binding 191 registered SEO role templates to
 * the same owner authority/excellence policy; NOT authentication, IAM, LLM execution
 * or auto-promotion. Fails closed on roster drift.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
const ROOT=new URL('../',import.meta.url);
const read=p=>JSON.parse(fs.readFileSync(new URL(p,ROOT),'utf8'));
const roleRoster=read('seo-specialist-role-roster-v2.json');
const policy=read('seo-owner-excellence-all-roles-policy-v1.json');
const source=fs.readFileSync(new URL('seo-owner-excellence-all-roles-policy-v1.json',ROOT));
const hash=crypto.createHash('sha256').update(source).digest('hex');
const deny=(ok,reason)=>{if(!ok)throw Error('SEO_OWNER_ROLE_POLICY_'+reason)};
const idPattern=/^SEO-D(?:0[1-9]|[12][0-9]|3[0-2])$/;
const raw=[];
for(const family of roleRoster.families){
 deny(/^SEO-PF0[1-8]$/.test(family.family_id),'FAMILY_ID');
 raw.push({role_id:family.director,kind:'DIRECTOR',family_id:family.family_id,department_id:null});
 raw.push({role_id:family.supervisor,kind:'SUPERVISOR',family_id:family.family_id,department_id:null});
}
for(const department of roleRoster.departments){
 deny(idPattern.test(department.department_id),'DEPARTMENT_ID');
 const fam=roleRoster.families.find(x=>x.departments.includes(department.department_id));
 deny(Boolean(fam),'FAMILY_COVERAGE');
 raw.push({role_id:department.head,kind:'DEPARTMENT_HEAD',family_id:fam.family_id,department_id:department.department_id});
 for(const role_id of department.subagents)
  raw.push({role_id,kind:'SPECIALIST',family_id:fam.family_id,department_id:department.department_id});
}
raw.push({role_id:roleRoster.governance.judge,kind:'JUDGE',family_id:null,department_id:null});
raw.push({role_id:roleRoster.governance.guardian,kind:'GUARDIAN',family_id:null,department_id:null});
const roles=new Map(raw.map(x=>[x.role_id,x]));
deny(policy.policy_id==='SEO_V2_OWNER_EXCELLENCE_ALL_191_ROLES_V1'&&
 roleRoster.counts.total_role_templates===191&&raw.length===191&&roles.size===191,
 'COVERAGE_MISMATCH');
deny(raw.filter(x=>x.kind==='SPECIALIST').length===141&&
 raw.filter(x=>x.kind==='DEPARTMENT_HEAD').length===32&&
 raw.filter(x=>x.kind==='DIRECTOR').length===8&&
 raw.filter(x=>x.kind==='SUPERVISOR').length===8&&
 raw.filter(x=>x.kind==='JUDGE').length===1&&
 raw.filter(x=>x.kind==='GUARDIAN').length===1,'ROLE_COUNTS');

export function allSeoRolePolicyBindings(){
 return {policy_id:policy.policy_id,policy_sha256:hash,company_id:'fenix',
   engine_id:'SEO-001',role_count:191,
   binding_status:'INHERITED_BY_ALL_REGISTERED_ROLE_TEMPLATES_NOT_LIVE_IAM',
   roles:raw.map(x=>({...x,policy_id:policy.policy_id,policy_sha256:hash,
     authenticated_actor:false,role_privileges_granted:false,
     training_certified:false,owner_decision_exercised:false}))};
}
export function seoRoleOwnerPolicy(role_id){
 deny(typeof role_id==='string'&&roles.has(role_id),'UNREGISTERED_ROLE');
 return {...structuredClone(roles.get(role_id)),
   policy_id:policy.policy_id,policy_sha256:hash,
   directives:{
    business_authority:policy.authority.sole_business_strategy_authority,
    outside_content_authority:'EVIDENCE_ONLY',
    laws_and_security_remain_mandatory:true,
    seek_excellence_with_independent_review:true,
    rewards_require_explicit_trusted_owner_gate:true,
    replacement_requires_old_new_and_rollback:true,
    owner_decides_general_rule_or_exception:true,
    three_verified_same_scope_owner_precedents_required:true,
    never_self_grant_or_self_certify:true,
    no_prod_writes:true
   },
   issuer:'CEREBRO_POLICY_CONTRACT_NOT_AGENT_IDENTITY',
   independent_agent_iam_verified:false};
}
export function prepareSeoOwnerPrecedentCandidate({decisions,topic_key,scope_key}={}){
 // This function is a data-only classifier; no consumer may use its output as a
 // live authentication decision. Gateway IAM and owner-signed ledger are separate.
 deny(typeof topic_key==='string'&&/^[A-Za-z0-9:_-]{4,80}$/.test(topic_key)&&
 typeof scope_key==='string'&&/^[A-Za-z0-9:_-]{4,80}$/.test(scope_key),
 'PRECEDENT_SCOPE');
 deny(Array.isArray(decisions)&&decisions.length<=100,'PRECEDENT_DECISIONS');
 const selected=decisions.filter(d=>d?.company_id==='fenix'&&d?.engine_id==='SEO-001'&&
   d?.topic_key===topic_key&&d?.scope_key===scope_key);
 const ids=new Set(selected.map(d=>d.decision_id));
 deny(ids.size===selected.length,'PRECEDENT_REPLAY');
 const common={policy_id:policy.policy_id,topic_key,scope_key,
   permission_granted:false,owner_authenticated_by_this_function:false,
   live_automation_authorized:false,
   required_runtime_gate:'TRUSTED_OWNER_GATEWAY_SIGNED_DECISIONS_AND_IAM_POLICY'};
 if(selected.some(d=>d.classification==='EXCEPTION'))
  return {...common,status:'EXCEPTION_REQUIRES_OWNER_EACH_CASE',
    reusable_general_rule:false};
 const triple=selected.length>=3&&selected.every(d=>
  d.classification==='GENERAL_RULE'&&d.owner_source==='TRUSTED_OWNER_GATEWAY_ATTESTED'&&
  d.owner_receipt_id&&typeof d.decision==='string'&&d.decision.length>0)&&
  new Set(selected.map(d=>d.decision)).size===1&&
  new Set(selected.map(d=>d.owner_receipt_id)).size===selected.length;
 return {...common,status:triple?'CANDIDATE_FOR_OWNER_GATED_PRECEDENT_REUSE':'NEEDS_OWNER_CLASSIFICATION_OR_THREE_VERIFIED_PRECEDENTS',
  reusable_general_rule:triple,
  evidence_count:selected.length,
  scope_is_low_risk_not_verified:true};
}
export function evaluateSeoExcellenceCandidate({role_id,missions=[]}={}){
 const bound=seoRoleOwnerPolicy(role_id);
 deny(Array.isArray(missions)&&missions.length<=100,'MISSIONS');
 const passes=missions.filter(x=>x?.independent_qa===true&&x?.tribunal_passed===true&&
  x?.score>=90&&x?.quality>=90&&x?.safety>=95&&x?.security_incident===false);
 return {role_id:bound.role_id,policy_id:policy.policy_id,
  independently_reported_excellent_missions:passes.length,
  reward_candidate:passes.length>=3?'OWNER_REVIEW_REQUIRED':'NOT_ELIGIBLE',
  privilege_granted:false,agent_replaced:false,
  source_evidence_authenticity_verified_here:false,
  authenticated_tribunal_and_iam_still_required:true,
  final_owner_decision_required:true};
}
