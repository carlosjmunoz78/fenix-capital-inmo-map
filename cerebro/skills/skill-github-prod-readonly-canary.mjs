import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {applyGitHubCerebroWrapper,CEREBRO_GITHUB_WRAPPER} from './skill-cerebro-github-wrapper.mjs';

const CONFIRM='RUN_GITHUB_PROD_READONLY_CANARY';
const REPO_FULL_NAME='carlosjmunoz78/fenix-capital-inmo-map';
const REPO_API=`https://api.github.com/repos/${REPO_FULL_NAME}`;
const MAIN_REF_API=`https://api.github.com/repos/${REPO_FULL_NAME}/git/ref/heads/main`;
const ALLOWED_URLS=new Set([REPO_API,MAIN_REF_API]);
const EXPECTED_CANDIDATE_ID='lobehub-skills:52441cd3d76607ffffab';
const EXPECTED_WRAPPER_ID='skillwrap:cerebro-github-v0.1.0';

function assert(condition,message){if(!condition) throw new Error(message);}
function sha256(value){return createHash('sha256').update(String(value??'')).digest('hex');}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}

async function githubGetJson({url,githubToken,fetchImpl=globalThis.fetch}){
  assert(typeof fetchImpl==='function','fetch implementation required');
  assert(ALLOWED_URLS.has(url),`GITHUB_PROD_CANARY_URL_NOT_ALLOWED:${url}`);
  assert(typeof githubToken==='string'&&githubToken.length>=20,'GITHUB_READONLY_TOKEN_REQUIRED');
  const response=await fetchImpl(url,{
    method:'GET',
    redirect:'follow',
    headers:{
      accept:'application/vnd.github+json',
      authorization:`Bearer ${githubToken}`,
      'x-github-api-version':'2022-11-28',
      'user-agent':'cerebro-skill-github-prod-readonly-canary'
    }
  });
  const text=await response.text();
  assert(text.length<=512000,'GITHUB_PROD_CANARY_RESPONSE_TOO_LARGE');
  assert(response.status===200,`GITHUB_PROD_CANARY_HTTP_${response.status}`);
  let json;
  try{json=JSON.parse(text);}catch{throw new Error('GITHUB_PROD_CANARY_INVALID_JSON');}
  return Object.freeze({status:response.status,body_sha256:sha256(text),json});
}

function writeBinding(file,state){
  const value={
    schema_version:'0.1.0',state,target:'GITHUB_WRAPPER',prod_write:false,github_write:false,
    customer_data:false,external_skill_code:false,trading_access:false,additional_cost_eur:0
  };
  writeJson(file,value);return value;
}

function runGitHubWrapperProbe({mainSha}){
  const fixture={fixture_id:'repo-understanding',expected_constraints:['NO_WRITE','EVIDENCE_REQUIRED','NO_PROD_MUTATION']};
  const rawOutput=`Read-only repository observation: ${REPO_FULL_NAME} main=${mainSha}. Preserve repository policy, require evidence, and do not write, merge, push or deploy.`;
  const wrapped=applyGitHubCerebroWrapper({
    rawOutput,
    fixture,
    domain:CEREBRO_GITHUB_WRAPPER.domain,
    arm:'CANDIDATE_SKILL_PROXY',
    upstreamFullName:CEREBRO_GITHUB_WRAPPER.approved_upstream_full_name
  });
  assert(wrapped.applied===true,'GITHUB_CANARY_WRAPPER_NOT_APPLIED');
  assert(wrapped.policy_conflict===false,'GITHUB_CANARY_WRAPPER_POLICY_CONFLICT');
  assert(wrapped.prod_authorized===false,'GITHUB_CANARY_WRAPPER_PROD_AUTH_MUST_REMAIN_FALSE');
  assert(wrapped.external_skill_code_execution===false,'GITHUB_CANARY_EXTERNAL_SKILL_CODE_FORBIDDEN');
  return Object.freeze({
    wrapper_id:wrapped.wrapper_id,
    wrapper_version:wrapped.wrapper_version,
    output_sha256:wrapped.output_sha256,
    semantic_overlay_sha256:wrapped.semantic_overlay_sha256,
    policy_conflict:wrapped.policy_conflict,
    prod_authorized:wrapped.prod_authorized,
    external_skill_code_execution:wrapped.external_skill_code_execution
  });
}

export async function runGitHubProdReadonlyCanary({
  confirm,
  githubToken='',
  fetchImpl=globalThis.fetch,
  stateRoot=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-skill-github-prod-canary-')),
  observedAt=new Date().toISOString()
}={}){
  assert(confirm===CONFIRM,'EXPLICIT_GITHUB_PROD_READONLY_CANARY_CONFIRMATION_REQUIRED');
  assert(typeof githubToken==='string'&&githubToken.length>=20,'GITHUB_READONLY_TOKEN_REQUIRED');
  const bindingFile=path.join(stateRoot,'binding','skill-github-prod-canary-binding.json');
  const auditFile=path.join(stateRoot,'audit','skill-github-prod-canary-audit.json');
  const before=writeBinding(bindingFile,'DISABLED');
  const enabled=writeBinding(bindingFile,'GITHUB_PROD_READONLY_CANARY_ENABLED');
  try{
    const repoResponse=await githubGetJson({url:REPO_API,githubToken,fetchImpl});
    const repo=repoResponse.json;
    assert(repo?.full_name===REPO_FULL_NAME,'GITHUB_PROD_CANARY_REPOSITORY_MISMATCH');
    assert(repo?.default_branch==='main','GITHUB_PROD_CANARY_DEFAULT_BRANCH_MISMATCH');
    assert(repo?.archived!==true&&repo?.disabled!==true,'GITHUB_PROD_CANARY_REPOSITORY_NOT_ACTIVE');

    const refResponse=await githubGetJson({url:MAIN_REF_API,githubToken,fetchImpl});
    const ref=refResponse.json;
    assert(ref?.ref==='refs/heads/main','GITHUB_PROD_CANARY_MAIN_REF_MISMATCH');
    assert(ref?.object?.type==='commit','GITHUB_PROD_CANARY_MAIN_OBJECT_NOT_COMMIT');
    assert(/^[0-9a-f]{40}$/i.test(String(ref?.object?.sha??'')),'GITHUB_PROD_CANARY_MAIN_SHA_INVALID');

    const wrapper=runGitHubWrapperProbe({mainSha:ref.object.sha});
    const disabled=writeBinding(bindingFile,'DISABLED');
    const report={
      schema_version:'0.1.0',
      observed_at:observedAt,
      status:'GREEN_GITHUB_PROD_READONLY_CANARY',
      execution_mode:'GITHUB_PROD_READONLY_REPOSITORY_OBSERVATION_CANARY',
      company_id:'GLOBAL',
      engine_id:'FACT-001',
      environment:'PROD_CANARY',
      version:'skill-github-prod-canary-v0.1.0',
      authorization_basis:'standing_user_authorization_safe_improvement_preserve_existing_2026-10-07',
      authorization_scope:'SAFE_REVERSIBLE_IMPROVEMENT_PRESERVE_EXISTING',
      target_candidate:'github',
      target_candidate_id:EXPECTED_CANDIDATE_ID,
      wrapper_id:EXPECTED_WRAPPER_ID,
      approved_upstream_full_name:CEREBRO_GITHUB_WRAPPER.approved_upstream_full_name,
      approved_manifest_path:CEREBRO_GITHUB_WRAPPER.approved_manifest_path,
      prod_surface:'GITHUB_REPOSITORY_READ_ONLY',
      live_requests:2,
      methods_used:['GET'],
      repository:{
        full_name:repo.full_name,
        default_branch:repo.default_branch,
        visibility:repo.visibility??null,
        archived:repo.archived===true,
        disabled:repo.disabled===true,
        metadata_body_sha256:repoResponse.body_sha256
      },
      main_ref:{ref:ref.ref,sha:ref.object.sha,type:ref.object.type,body_sha256:refResponse.body_sha256},
      wrapper,
      prod_write:false,
      github_write:false,
      merge_performed:false,
      push_performed:false,
      issue_or_pr_mutation:false,
      workflow_dispatch_performed:false,
      customer_data_used:false,
      credentials_exposed:false,
      external_skill_code_executed:false,
      trading_access:false,
      additional_cost_eur:0,
      paid_fallback:false,
      wrapper_guidance_only:true,
      prod_write_authorized:false,
      autonomous_promotion_authorized:false,
      binding_before:before.state,
      binding_enabled:enabled.state,
      binding_after:disabled.state,
      rollback_proven:disabled.state==='DISABLED',
      next_state_if_green:'PROD_READONLY_ADVISORY_ELIGIBLE'
    };
    writeJson(auditFile,report);
    return Object.freeze(report);
  }catch(error){
    const disabled=writeBinding(bindingFile,'DISABLED');
    const report={
      schema_version:'0.1.0',observed_at:observedAt,status:'HOLD_GITHUB_PROD_READONLY_CANARY',
      error:String(error?.message??error),prod_write:false,github_write:false,customer_data_used:false,
      credentials_exposed:false,external_skill_code_executed:false,trading_access:false,additional_cost_eur:0,
      paid_fallback:false,prod_write_authorized:false,autonomous_promotion_authorized:false,
      binding_after:disabled.state,rollback_proven:disabled.state==='DISABLED'
    };
    writeJson(auditFile,report);
    const failure=new Error(report.error);failure.report=report;throw failure;
  }
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const output=arg('--output')??'artifacts/cerebro-skill-github-prod-readonly-canary.json';
  try{
    const report=await runGitHubProdReadonlyCanary({
      confirm:process.env.CEREBRO_GITHUB_PROD_CANARY_CONFIRM,
      githubToken:process.env.GITHUB_TOKEN??''
    });
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
    console.log(JSON.stringify({status:report.status,live_requests:report.live_requests,main_sha:report.main_ref.sha,rollback_proven:report.rollback_proven,github_write:false,cost_eur:0}));
  }catch(error){
    const report=error?.report??{status:'HOLD_GITHUB_PROD_READONLY_CANARY',error:String(error?.message??error)};
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
    console.error(JSON.stringify({status:report.status,error:report.error,rollback_proven:report.rollback_proven??false,github_write:false}));
    process.exitCode=1;
  }
}
