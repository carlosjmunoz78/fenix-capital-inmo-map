/**
 * SEO-001 / Fenix: evidence-based departmental readiness audit.
 * OFFLINE ONLY. Does not re-crawl sites, promote agents, read secrets,
 * call models, change WordPress, or claim external Google metrics.
 * Operational status is separate from coverage of 191 logical role templates.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {listSeoDepartments,getSeoDepartmentKnowledge} from './seo-specialist-workforce-v2.mjs';
import {buildSeoPhase2AllRolesCurriculum} from './seo-phase2-all-roles-curriculum-v1.mjs';
import {loadFrozenSeoCorpus} from './seo-corpus-job001-work-v1.mjs';
import {seoStagingSuspensionStatus} from './seo-staging-suspension-v1.mjs';
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const deny=c=>{throw Error('SEO_DEPARTMENT_READINESS_'+c)};
const REGISTRY=new URL('../registry/seo001-operational-assurance-plan-v1.json',import.meta.url);
const validId=x=>/^SEO-D(?:0[1-9]|[12][0-9]|3[0-2])$/.test(x);
export function auditSeoDepartmentReadiness({environment='LAB',externalEvidence={}}={}){
 if(environment!=='LAB'||externalEvidence===null||typeof externalEvidence!=='object'||
    Array.isArray(externalEvidence))deny('INPUT_OR_ENVIRONMENT');
 const policy=JSON.parse(fs.readFileSync(REGISTRY,'utf8'));
 if(policy.company_id!=='fenix'||policy.engine_id!=='SEO-001'||policy.prod_writes_allowed!==false||
    policy.staging_access_allowed!==false||policy.deepseek.allow_unmetered_calls!==false||
    policy.deepseek.model_key_present_verified!==false||policy.alerts.use_existing_automation_only!==true)
    deny('CONTROL_POLICY_DRIFT');
 const src=seoStagingSuspensionStatus();
 if(src.staging_off!==true||src.allow_staging_requests!==false)deny('STAGING_OPEN');
 const departments=listSeoDepartments();
 const curriculum=buildSeoPhase2AllRolesCurriculum();
 const corpus=loadFrozenSeoCorpus();
 if(departments.length!==32||curriculum.counts.all_roles!==191||
    curriculum.counts.specialist!==141||curriculum.counts.oversight!==50||
    curriculum.counts.all_drill_templates!==573||corpus.documents.length!==200)
    deny('CANONICAL_COUNTS_MISMATCH');
 const ids=new Set(),roles=new Set();
 const coverage=departments.map(d=>{
  if(!validId(d.department_id)||ids.has(d.department_id))deny('DUPLICATE_OR_BAD_DEPARTMENT');
  ids.add(d.department_id);
  const p=getSeoDepartmentKnowledge(d.department_id);
  const agents=p.workforce?.subagents||[];
  if(p.department_id!==d.department_id||p.engine_id!=='SEO-001'||
      !p.knowledge?.operational_directives?.length||
      !p.knowledge?.competencies?.length||
      !p.knowledge?.required_sources?.length||
      !p.training?.evaluation?.rubric||agents.length!==d.subagent_templates)
    deny('INCOMPLETE_KNOWLEDGE_'+d.department_id);
  for(const a of agents){
   if(roles.has(a.role_id)||a.iam_principal_id!==null||
     a.execution_state!=='ROLE_TEMPLATE_DEFINED_NOT_ACTIVE'||
     a.allowed_actions?.includes('PUBLISH_PROD'))deny('ROLE_TEMPLATE_MISMATCH');
   roles.add(a.role_id);
  }
  const cases=curriculum.drills.filter(x=>x.role_id.startsWith(d.department_id+':SPECIALIST:'));
  if(cases.length!==agents.length*3)deny('EXERCISE_COVERAGE_MISMATCH');
  return {department_id:d.department_id,knowledge_pack:p.knowledge_pack_id,
   specialist_templates:agents.length,prepared_exercises:cases.length,
   knowledge_package_present:true,training_curriculum_present:true,
   active_independent_specialists_verified:0,certified_prod:false,
   state:'DEFINED_WITH_KNOWLEDGE_AND_TRAINING_NOT_AUTONOMOUS'};
 });
 if(roles.size!==141)deny('SPECIALISTS_NOT_141');
 if(externalEvidence.agent_iam_verified===true||externalEvidence.professional_exams_passed===true||
    externalEvidence.prod_certified===true||externalEvidence.gsc_authenticated===true||
    externalEvidence.wordpress_restorable_backup===true)
    deny('UNATTESTED_EXTERNAL_EVIDENCE_CANNOT_GRANT_STATUS');
 const blockers=policy.gates.filter(x=>x.state!=='VERIFIED').map(x=>({
  id:x.id,owner:x.owner,severity:x.severity,state:x.state,next_action:x.next_action}));
 const report={
  schema_version:'1.0.0',company_id:'fenix',engine_id:'SEO-001',
  environment:'LAB',version:'1.0.0',status:'ROLE_COVERAGE_VERIFIED_AUTONOMY_AND_PROD_HOLD',
  source:'PINNED_200_URL_CORPUS_AND_EXISTING_ROLE_REGISTRY',
  corpus_sha256:corpus.corpus_digest,role_count:191,department_count:32,
  specialist_template_count:roles.size,oversight_template_count:50,training_cases_prepared:573,
  independent_agent_accounts_verified:0,semantic_exams_passed:0,
  production_departments_certified:0,real_google_metrics_read:false,
  google_connector_status:'GSC_WIZARD_SUBSCRIPTION_REQUIRED_OBSERVED_NOT_AUTHENTICATED_DATA',
  live_wordpress_state:'READONLY_POINT_IN_TIME_OBSERVATION_NOT_A_PROD_UPDATE',
  weekly_learning_state:'POLICY_DEFINED_NOT_CONFIRMED_191_INDEPENDENT_ACTORS',
  deepseek_state:'OPTIONAL_NO_AUTH_KEY_OR_HARD_CAP_VERIFIED_NO_API_CALL',
  blocking_gates:blockers,departments:coverage,
  prod_write_authorized:false,staging_requests:0,new_subscriptions_eur:0,
  actual_paid_model_calls:0,release_decision:'HOLD',
  rollback:'REVERT_ONLY_THIS_PR_DRAFT_COMMIT'
 };
 return {...report,receipt_sha256:hash(report)};
}
async function cli(){
 const filename=process.argv[2],out=auditSeoDepartmentReadiness();
 if(!filename||!path.isAbsolute(filename)||fs.existsSync(filename))deny('OUTPUT_PATH_REQUIRED_NEW');
 fs.writeFileSync(filename,JSON.stringify(out,null,2)+'\n',{mode:0o600,flag:'wx'});
 process.stdout.write(JSON.stringify({status:out.status,departments:out.department_count,
  specialist_templates:out.specialist_template_count,training_cases:out.training_cases_prepared,
  prod_certified:0,paid_calls:0})+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 cli().catch(e=>{process.stderr.write(String(e.message).slice(0,250)+'\n');process.exitCode=2});
