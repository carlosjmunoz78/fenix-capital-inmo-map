import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {authorizeSeoRole,enforceSeoRoleIfRequested} from '../runtime/seo-role-access-gate-v0.mjs';
const attestation={
 status:'GITHUB_API_WORKLOAD_RUN_VERIFIED_READONLY',
 company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
 repository:'carlosjmunoz78/fenix-capital-inmo-map',
 workflow_path:'.github/workflows/cerebro-seo-staging-readonly-v0.yml',
 head_branch:'cerebro/seo-enterprise-family-staging-contract-v1-20261105',
 event:'pull_request',job_name:'readonly-staging',
 provider_api_read_completed:true,github_job_identity_observed:true,
 prod_write_authorized:false,web_write_authorized:false,actor_role_credentials_verified:false,
 run_id:41981809622,github_job_id:127093387061
};
const roles=[['SEO_D15_WORKER','mission:execute'],['SEO_D31_QA','mission:evaluate'],['SEO_JUDGE_A','mission:verdict:read']];
test('each logical role is restricted to its exact scope under the existing verified workload',()=>{
 for(const [role_id,scope] of roles){
  const grant=authorizeSeoRole({attestation,role_id,scope});
  assert.equal(grant.verified_workload,true);assert.equal(grant.verified_agent_identity,false);
  assert.equal(grant.external_write_authority,false);
  for(const [,other] of roles.filter(x=>x[1]!==scope)){
   assert.throws(()=>authorizeSeoRole({attestation,role_id,scope:other}),/SEO_ROLE_SCOPE_DENIED/);
  }
 }
});
test('never grants PROD, another tenant, altered branch, unregistered agent or purported IAM authority',()=>{
 assert.throws(()=>authorizeSeoRole({attestation,role_id:'SEO_D15_WORKER',scope:'mission:execute',environment:'PROD'}),/SEO_ROLE_SCOPE_DENIED/);
 assert.throws(()=>authorizeSeoRole({attestation,role_id:'SEO_D15_WORKER',scope:'mission:execute',company_id:'other-company'}),/SEO_ROLE_SCOPE_DENIED/);
 assert.throws(()=>authorizeSeoRole({attestation:{...attestation,head_branch:'main'},role_id:'SEO_D15_WORKER',scope:'mission:execute'}),/SEO_ROLE_SCOPE_DENIED/);
 assert.throws(()=>authorizeSeoRole({attestation:{...attestation,actor_role_credentials_verified:true},role_id:'SEO_D15_WORKER',scope:'mission:execute'}),/SEO_ROLE_SCOPE_DENIED/);
 assert.throws(()=>authorizeSeoRole({attestation,role_id:'SEO_UNKNOWN',scope:'mission:execute'}),/SEO_ROLE_SCOPE_DENIED/);
});
test('enforcement mode refuses missing evidence, accepts known receipt and preserves local LAB-CLI fallback',t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'seo-gate-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const filepath=path.join(temp,'verified.json');
 assert.throws(()=>enforceSeoRoleIfRequested({role_id:'SEO_D15_WORKER',scope:'mission:execute',env:{SEO_ROLE_GATE_REQUIRED:'1'}}),/SEO_ROLE_ATTESTATION_REQUIRED/);
 fs.writeFileSync(filepath,JSON.stringify(attestation));
 const out=enforceSeoRoleIfRequested({role_id:'SEO_D15_WORKER',scope:'mission:execute',env:{SEO_ROLE_GATE_REQUIRED:'1',SEO_ROLE_ATTESTATION_FILE:filepath}});
 assert.equal(out.verified_agent_identity,false);assert.equal(out.verified_workload,true);
 assert.equal(enforceSeoRoleIfRequested({role_id:'SEO_D15_WORKER',scope:'mission:execute',env:{}}).gate,'LAB_CLI_UNATTESTED');
});
