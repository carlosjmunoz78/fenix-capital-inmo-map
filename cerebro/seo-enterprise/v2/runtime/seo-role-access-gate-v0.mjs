/** Shared fail-closed logical role gate for existing GitHub Actions workload.
 * A verified JOB is not a verified per-agent login; this gate never grants site write authority.
 */
import fs from 'node:fs';
import path from 'node:path';
const EXPECTED={
 SEO_D15_WORKER:'mission:execute',
 SEO_D31_QA:'mission:evaluate',
 SEO_JUDGE_A:'mission:verdict:read'
};
const EXPECTED_BRANCH='cerebro/seo-enterprise-family-staging-contract-v1-20261105';
const EXPECTED_WORKFLOW='.github/workflows/cerebro-seo-staging-readonly-v0.yml';
const registry=()=>JSON.parse(fs.readFileSync(new URL('../seo-role-workunit-bindings-v0.json',import.meta.url),'utf8'));
export function authorizeSeoRole({attestation,role_id,scope,company_id='fenix',environment='PREPROD'}){
 const forbidden=()=>{throw Error('SEO_ROLE_SCOPE_DENIED')};
 const b=registry();
 if(b.company_id!==company_id||b.environment!==environment||environment!=='PREPROD')forbidden();
 if(attestation?.status!=='GITHUB_API_WORKLOAD_RUN_VERIFIED_READONLY'||
  attestation.company_id!==company_id||attestation.environment!==environment||
  attestation.engine_id!=='SEO-001'||attestation.repository!=='carlosjmunoz78/fenix-capital-inmo-map'||
  attestation.workflow_path!==EXPECTED_WORKFLOW||attestation.head_branch!==EXPECTED_BRANCH||
  attestation.event!=='pull_request'||attestation.job_name!=='readonly-staging'||
  attestation.provider_api_read_completed!==true||attestation.github_job_identity_observed!==true||
  attestation.prod_write_authorized!==false||attestation.web_write_authorized!==false||
  attestation.actor_role_credentials_verified!==false)forbidden();
 if(!Object.hasOwn(EXPECTED,role_id)||scope!==EXPECTED[role_id])forbidden();
 const role=b.roles.find(x=>x.role_id===role_id);
 if(!role||!role.scope.includes(scope)||role.identity_verified!==false||b.governance.prod_writes!==false)forbidden();
 if(!Number.isSafeInteger(attestation.run_id)||!Number.isSafeInteger(attestation.github_job_id))forbidden();
 return {authorized_for:'GITHUB_ACTIONS_STAGING_READONLY_PROCESS_TASK',
  role_id,scope,company_id,engine_id:'SEO-001',environment,
  workflow_run_id:attestation.run_id,workflow_job_id:attestation.github_job_id,
  verified_workload:true,verified_agent_identity:false,
  external_write_authority:false,prod_write_authority:false,permission_changes:[],
  subscription_added_eur:0};
}
export function enforceSeoRoleIfRequested({role_id,scope,env=process.env}){
 if(env.SEO_ROLE_GATE_REQUIRED!=='1')return {gate:'LAB_CLI_UNATTESTED',verified_workload:false};
 const filename=env.SEO_ROLE_ATTESTATION_FILE;
 if(typeof filename!=='string'||!filename)throw Error('SEO_ROLE_ATTESTATION_REQUIRED');
 const data=JSON.parse(fs.readFileSync(path.resolve(filename),'utf8'));
 return authorizeSeoRole({attestation:data,role_id,scope});
}
