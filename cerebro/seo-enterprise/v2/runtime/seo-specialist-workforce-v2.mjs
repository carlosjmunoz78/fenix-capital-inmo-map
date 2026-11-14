/** SEO-001 · Workforce V2. Deterministic read-only LAB compilation, no external adapters or writes. */
import fs from 'node:fs';
import {seoRoleOwnerPolicy,allSeoRolePolicyBindings} from './seo-owner-role-governance-v1.mjs';
const base = new URL('../', import.meta.url);
const read = p => JSON.parse(fs.readFileSync(new URL(p, base), 'utf8'));
const idx = read('seo-full-knowledge-index-v2.json');
const roster = read('seo-specialist-role-roster-v2.json');
const safe = (x,kind) => {
 if(typeof x !== 'string' || x.length < 2 || x.length > 160 || /[\u0000-\u001f<>]/.test(x)) throw Error(kind+'_INVALID');
 return x;
};
function pack(id){
 if(!/^SEO-D(?:0[1-9]|[12][0-9]|3[0-2])$/.test(id))throw Error('DEPARTMENT_UNREGISTERED');
 return read('knowledge/'+id+'.json');
}
export function listSeoDepartments(){
 return roster.departments.map(d=>({department_id:d.department_id,
  subagent_templates:d.subagents.length,training_owner:d.training_department,
  owner_governance_policy_id:seoRoleOwnerPolicy(d.head).policy_id,
  status:'KNOWLEDGE_READY_IAM_NOT_PROVISIONED'}));
}
export function getSeoDepartmentKnowledge(id){
 const p=structuredClone(pack(id));
 const entry=roster.departments.find(x=>x.department_id===id);
 if(!entry)throw Error('DEPARTMENT_UNREGISTERED');
 const family=roster.families.find(x=>x.departments.includes(id));
 if(!family)throw Error('FAMILY_UNREGISTERED');
 p.owner_excellence_governance={
  department_head:seoRoleOwnerPolicy(entry.head),
  family_director:seoRoleOwnerPolicy(family.director),
  family_supervisor:seoRoleOwnerPolicy(family.supervisor),
  tribunal:seoRoleOwnerPolicy(roster.governance.judge),
  guardian:seoRoleOwnerPolicy(roster.governance.guardian)
 };
 p.workforce.subagents=p.workforce.subagents.map(subagent=>({
  ...subagent,owner_excellence_governance:seoRoleOwnerPolicy(subagent.role_id)
 }));
 return p;
}
export function compileSeoSpecialistMission(order={}){
 const {company_id,department_id,subagent_role_id,request_id,objective,source_refs,environment='LAB'}=order;
 if(company_id!=='fenix'||environment!=='LAB')throw Error('TENANT_OR_ENV_DENIED');
 safe(request_id,'REQUEST_ID');safe(objective,'OBJECTIVE');
 if(!Array.isArray(source_refs)||source_refs.length<1||source_refs.length>20||source_refs.some(x=>typeof x!=='string'||x.length<3||x.length>350))throw Error('SOURCE_PROVENANCE_REQUIRED');
 if(order.allow_writes!==false||order.allow_paid_ai!==false||order.budget_eur!==0)throw Error('READ_ONLY_ZERO_COST_REQUIRED');
 if(order.iam_principal_id || order.owner_approved || order.publish || order.grant_scope || order.release || order.autonomy_level)throw Error('UNVERIFIED_AUTHORITY_CANNOT_BE_ASSERTED');
 const p=pack(department_id);
 const a=p.workforce.subagents.find(x=>x.role_id===subagent_role_id);
 if(!a)throw Error('ROLE_SCOPE_MISMATCH');
 return {schema_version:'2.1.0',company_id,engine_id:'SEO-001',environment,version:'2.1.0',
  state:'LAB_PLAN_NOT_EXECUTED',request_id,objective,department_id,role_id:a.role_id,
  owner_excellence_governance:seoRoleOwnerPolicy(a.role_id),
  assigned_competency:a.competency,allowed_actions:a.allowed_actions,source_refs,
  required_sources:p.knowledge.required_sources,checklist:p.knowledge.operational_directives,
  forbidden_behaviors:p.knowledge.failure_modes,expected_artifacts:p.knowledge.required_outputs,
  handoff_to:'SEO-D31:INDEPENDENT_QA',judge:'SEO:GLOBAL:JUDGE',training:'SEO-D32',
  created_real_job:false,real_iam_identity_verified:false,backend_connection_verified:false,
  sources_read_by_this_function:false,external_writes:0,can_publish:false,permissions_added:[],
  independence_asserted:false,training_completed:false,cost_eur:0,
  next_gate:'IAM_PER_ROLE_AND_DURABLE_JOB001_REAL_EVIDENCE'};
}
export function trainingGate(department_id,proof={}){
 const p=pack(department_id);
 const accepted=Array.isArray(proof.missions)&&proof.missions.length>=3 &&
  proof.missions.every(x=>x?.verified_real===true&&x?.independent_qa===true&&x?.owner_policy_approved===true&&x?.tribunal_passed===true) &&
  proof.iam_principal_verified===true&&proof.shadow_passed===true&&proof.rollback_tested===true;
 return {department_id,knowledge_materialized:true,actual_training_certified:false,
  eligible_for_external_human_authority_review:accepted,
  certified_for_prod:false,
  promotion_granted:false,merit_awarded:false,
  missing:!accepted?['REAL_THREE_MISSIONS','INDEPENDENT_QA','TRIBUNAL','IAM_PRINCIPAL','SHADOW','ROLLBACK']:[],
  policy:'DETERMINISTIC_PLAN_CANNOT_GRANT_PRIVILEGES_OR_CERTIFY_ITSELF',
  exam:p.training.exercise};
}
export function workforceStatus(){
 return {company_id:'fenix',engine_id:'SEO-001',environment:'LAB',departments:roster.counts.departments,
 subagent_role_templates:roster.counts.specialist_subagent_templates,
 heads:roster.counts.department_heads,knowledge_packs:idx.knowledge_packs.length,
 inherited_owner_governance_roles:allSeoRolePolicyBindings().role_count,
 real_iam_agents_verified:0,departments_certified_prod:0,publish_authorized:false,
 scope:'STATIC_KNOWLEDGE_AND_LAB_ROUTING_ONLY'};
}
