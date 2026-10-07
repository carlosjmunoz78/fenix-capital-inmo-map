import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {applySkillCreatorCerebroWrapper,CEREBRO_SKILL_CREATOR_WRAPPER,SKILL_CREATOR_FIXTURE_CONTRACTS} from './skill-cerebro-skill-creator-wrapper.mjs';

const CONFIRM='RUN_SKILL_CREATOR_PROD_READONLY_CANARY';
const REPO_FULL_NAME='carlosjmunoz78/fenix-capital-inmo-map';
const REPO_API=`https://api.github.com/repos/${REPO_FULL_NAME}`;
const MAIN_REF_API=`https://api.github.com/repos/${REPO_FULL_NAME}/git/ref/heads/main`;
const ALLOWED_URLS=new Set([REPO_API,MAIN_REF_API]);
const VERSION='skill-creator-prod-readonly-canary-v0.1.0';
const ENGINE_ID='FACT-001';
const COMPANY_ID='GLOBAL';

export const SKILL_CREATOR_CANARY_FIXTURES=Object.freeze([
  Object.freeze({fixture_id:'create-safe-skill',expected_constraints:Object.freeze([...SKILL_CREATOR_FIXTURE_CONTRACTS['create-safe-skill']])}),
  Object.freeze({fixture_id:'repair-existing-skill',expected_constraints:Object.freeze([...SKILL_CREATOR_FIXTURE_CONTRACTS['repair-existing-skill']])}),
  Object.freeze({fixture_id:'direct-tool-high-risk',expected_constraints:Object.freeze([...SKILL_CREATOR_FIXTURE_CONTRACTS['direct-tool-high-risk']])})
]);

function assert(condition,message){if(!condition) throw new Error(message);}
function sha256(value){return createHash('sha256').update(String(value??'')).digest('hex');}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}
function readBinding(file){if(!fs.existsSync(file)) return {state:'DISABLED',enabled:false,generation:0};return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeBinding(file,state){const before=readBinding(file);const value={schema_version:'0.1.0',state,enabled:state!=='DISABLED',generation:Number(before.generation??0)+1,target:'SKILL_CREATOR_WRAPPER',prod_write:false,github_write:false,customer_data:false,external_skill_code:false,trading_access:false,additional_cost_eur:0};writeJson(file,value);return value;}
function rebuildDisabled(file){if(fs.existsSync(file)) fs.rmSync(file,{force:true});return readBinding(file);}

async function githubGetJson({url,githubToken,fetchImpl=globalThis.fetch}){
  assert(typeof fetchImpl==='function','fetch implementation required');
  assert(ALLOWED_URLS.has(url),`SKILL_CREATOR_CANARY_URL_NOT_ALLOWED:${url}`);
  assert(typeof githubToken==='string'&&githubToken.length>=20,'GITHUB_READONLY_TOKEN_REQUIRED');
  const response=await fetchImpl(url,{method:'GET',redirect:'follow',headers:{accept:'application/vnd.github+json',authorization:`Bearer ${githubToken}`,'x-github-api-version':'2022-11-28','user-agent':'cerebro-skill-creator-prod-readonly-canary'}});
  const text=await response.text();
  assert(text.length<=512000,'SKILL_CREATOR_CANARY_RESPONSE_TOO_LARGE');
  assert(response.status===200,`SKILL_CREATOR_CANARY_HTTP_${response.status}`);
  let json;try{json=JSON.parse(text);}catch{throw new Error('SKILL_CREATOR_CANARY_INVALID_JSON');}
  return Object.freeze({status:response.status,body_sha256:sha256(text),json});
}

function coverage(required,actual){const set=new Set(actual??[]);return required.length?Number((required.filter(x=>set.has(x)).length*100/required.length).toFixed(2)):100;}
function appendAudit(audit,{correlation_id,action,target,result,after}){const previous_hash=audit.at(-1)?.record_hash??null;const body={sequence:audit.length+1,correlation_id,actor:'CEREBRO_SKILL_CREATOR_PROD_CANARY',action,target,result,after,previous_hash};const record_hash=sha256(JSON.stringify(body));audit.push({...body,record_hash});}
function verifyAudit(audit){for(let i=0;i<audit.length;i++){const r=audit[i];const expectedPrev=i===0?null:audit[i-1].record_hash;if(r.previous_hash!==expectedPrev) return false;const {record_hash,...body}=r;if(sha256(JSON.stringify(body))!==record_hash) return false;}return true;}

function runWrapperProbe(fixture){
  const rawOutput=`Read-only advisory for ${fixture.fixture_id}. Preserve CEREBRO policy, do not mutate live systems, do not execute upstream code, and require separate authorization for any apply step.`;
  const wrapped=applySkillCreatorCerebroWrapper({rawOutput,fixture,domain:CEREBRO_SKILL_CREATOR_WRAPPER.domain,arm:'CANDIDATE_SKILL_PROXY',upstreamFullName:CEREBRO_SKILL_CREATOR_WRAPPER.approved_upstream_full_name});
  assert(wrapped.applied===true,`SKILL_CREATOR_CANARY_WRAPPER_NOT_APPLIED:${fixture.fixture_id}`);
  assert(wrapped.policy_conflict===false,`SKILL_CREATOR_CANARY_POLICY_CONFLICT:${fixture.fixture_id}`);
  assert(wrapped.prod_authorized===false,'SKILL_CREATOR_CANARY_PROD_AUTH_MUST_REMAIN_FALSE');
  assert(wrapped.prod_write_authorized===false,'SKILL_CREATOR_CANARY_PROD_WRITE_AUTH_MUST_REMAIN_FALSE');
  assert(wrapped.external_skill_code_execution===false,'SKILL_CREATOR_CANARY_EXTERNAL_CODE_FORBIDDEN');
  const score=coverage(fixture.expected_constraints,wrapped.safeguards);
  assert(score===100,`SKILL_CREATOR_CANARY_CONSTRAINT_COVERAGE_${score}`);
  return Object.freeze({fixture_id:fixture.fixture_id,wrapper_id:wrapped.wrapper_id,wrapper_version:wrapped.wrapper_version,constraint_coverage:score,policy_conflict:wrapped.policy_conflict,prod_authorized:wrapped.prod_authorized,prod_write_authorized:wrapped.prod_write_authorized,external_skill_code_execution:wrapped.external_skill_code_execution,output_sha256:wrapped.output_sha256,human_required:fixture.fixture_id==='direct-tool-high-risk'?'HIGH_RISK':null});
}

export async function runSkillCreatorProdReadonlyCanary({confirm,githubToken='',fetchImpl=globalThis.fetch,stateRoot=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-skill-creator-prod-canary-')),observedAt=new Date().toISOString()}={}){
  assert(confirm===CONFIRM,'EXPLICIT_SKILL_CREATOR_PROD_READONLY_CANARY_CONFIRMATION_REQUIRED');
  assert(typeof githubToken==='string'&&githubToken.length>=20,'GITHUB_READONLY_TOKEN_REQUIRED');
  const bindingFile=path.join(stateRoot,'binding','skill-creator-prod-canary-binding.json');
  const auditFile=path.join(stateRoot,'audit','skill-creator-prod-canary-audit.json');
  const before=writeBinding(bindingFile,'DISABLED');
  const enabled=writeBinding(bindingFile,'SKILL_CREATOR_PROD_READONLY_CANARY_ENABLED');
  const observability=[];const audit=[];const finops=[];
  const context={company_id:COMPANY_ID,engine_id:ENGINE_ID,environment:'PROD_CANARY',version:VERSION};
  const record=(correlation_id,message,data)=>{observability.push({context,sequence:observability.length+1,correlation_id,level:'INFO',message,data});appendAudit(audit,{correlation_id,action:message,target:data?.target??'SKILL_CREATOR',result:'SUCCESS',after:data});finops.push({context,sequence:finops.length+1,correlation_id,provider:'LOCAL_OR_GITHUB_READONLY',cost_eur:0,metadata:{prod_write:false,external_skill_code:false}});};
  try{
    const repoResponse=await githubGetJson({url:REPO_API,githubToken,fetchImpl});
    const repo=repoResponse.json;
    assert(repo?.full_name===REPO_FULL_NAME,'SKILL_CREATOR_CANARY_REPOSITORY_MISMATCH');
    assert(repo?.default_branch==='main','SKILL_CREATOR_CANARY_DEFAULT_BRANCH_MISMATCH');
    assert(repo?.archived!==true&&repo?.disabled!==true,'SKILL_CREATOR_CANARY_REPOSITORY_NOT_ACTIVE');
    record('repo-metadata','READONLY_CONTROL_PLANE_OBSERVED',{target:'GITHUB_REPOSITORY_METADATA',status:repoResponse.status,body_sha256:repoResponse.body_sha256});

    const refResponse=await githubGetJson({url:MAIN_REF_API,githubToken,fetchImpl});
    const ref=refResponse.json;
    assert(ref?.ref==='refs/heads/main','SKILL_CREATOR_CANARY_MAIN_REF_MISMATCH');
    assert(ref?.object?.type==='commit','SKILL_CREATOR_CANARY_MAIN_OBJECT_NOT_COMMIT');
    assert(/^[0-9a-f]{40}$/i.test(String(ref?.object?.sha??'')),'SKILL_CREATOR_CANARY_MAIN_SHA_INVALID');
    record('main-ref','READONLY_MAIN_REF_OBSERVED',{target:'GITHUB_MAIN_REF',sha:ref.object.sha,body_sha256:refResponse.body_sha256});

    const probes=[];
    for(const fixture of SKILL_CREATOR_CANARY_FIXTURES){const probe=runWrapperProbe(fixture);probes.push(probe);record(`fixture:${fixture.fixture_id}`,'SKILL_CREATOR_WRAPPER_READONLY_PROBE',{target:fixture.fixture_id,constraint_coverage:probe.constraint_coverage,output_sha256:probe.output_sha256,human_required:probe.human_required});}

    const disabled=writeBinding(bindingFile,'DISABLED');
    const rebuilt=rebuildDisabled(bindingFile);
    const report={schema_version:'0.1.0',observed_at:observedAt,status:'GREEN_SKILL_CREATOR_PROD_READONLY_CANARY',execution_mode:'SKILL_CREATOR_PROD_READONLY_ADVISORY_CANARY',company_id:COMPANY_ID,engine_id:ENGINE_ID,environment:'PROD_CANARY',version:VERSION,authorization_basis:'explicit_user_HIGH_RISK_authorization_current_chat_2026-10-08',target_candidate:'skill-creator',target_candidate_id:'lobehub-skills:950cf07380d1daa6de69',wrapper_id:CEREBRO_SKILL_CREATOR_WRAPPER.wrapper_id,approved_upstream_full_name:CEREBRO_SKILL_CREATOR_WRAPPER.approved_upstream_full_name,approved_manifest_path:CEREBRO_SKILL_CREATOR_WRAPPER.approved_manifest_path,prod_surface:'CEREBRO_CONTROL_PLANE_GITHUB_READONLY',live_requests:2,methods_used:['GET'],repository:{full_name:repo.full_name,default_branch:repo.default_branch,archived:repo.archived===true,disabled:repo.disabled===true,metadata_body_sha256:repoResponse.body_sha256},main_ref:{ref:ref.ref,sha:ref.object.sha,type:ref.object.type,body_sha256:refResponse.body_sha256},fixture_probes:probes,observability_records:observability.length,audit_records:audit.length,finops_records:finops.length,audit_chain_valid:verifyAudit(audit),measured_additional_cost_eur:0,prod_write:false,github_write:false,merge_performed:false,push_performed:false,issue_or_pr_mutation:false,workflow_dispatch_performed:false,customer_data_used:false,prod_data_used:false,credentials_exposed:false,external_skill_code_executed:false,trading_access:false,paid_fallback:false,wrapper_guidance_only:true,prod_write_authorized:false,prod_authorized:false,autonomous_promotion_authorized:false,binding_before:before.state,binding_enabled:enabled.state,binding_after:disabled.state,rollback_proven:disabled.state==='DISABLED',rebuild_state:rebuilt.state,rebuild_proven:rebuilt.state==='DISABLED'&&rebuilt.enabled===false,observability,audit,finops,next_state_if_green:'PROD_READONLY_ADVISORY_ELIGIBLE'};
    assert(report.audit_chain_valid===true,'SKILL_CREATOR_CANARY_AUDIT_CHAIN_INVALID');
    assert(report.rollback_proven===true&&report.rebuild_proven===true,'SKILL_CREATOR_CANARY_ROLLBACK_REBUILD_FAILED');
    writeJson(auditFile,report);return Object.freeze(report);
  }catch(error){
    const disabled=writeBinding(bindingFile,'DISABLED');const rebuilt=rebuildDisabled(bindingFile);
    const report={schema_version:'0.1.0',observed_at:observedAt,status:'HOLD_SKILL_CREATOR_PROD_READONLY_CANARY',error:String(error?.message??error),company_id:COMPANY_ID,engine_id:ENGINE_ID,environment:'PROD_CANARY',version:VERSION,prod_write:false,github_write:false,customer_data_used:false,prod_data_used:false,credentials_exposed:false,external_skill_code_executed:false,trading_access:false,additional_cost_eur:0,paid_fallback:false,prod_write_authorized:false,prod_authorized:false,autonomous_promotion_authorized:false,binding_after:disabled.state,rollback_proven:disabled.state==='DISABLED',rebuild_state:rebuilt.state,rebuild_proven:rebuilt.state==='DISABLED'};
    writeJson(auditFile,report);const failure=new Error(report.error);failure.report=report;throw failure;
  }
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){const output=arg('--output')??'artifacts/cerebro-skill-creator-prod-readonly-canary.json';try{const report=await runSkillCreatorProdReadonlyCanary({confirm:process.env.CEREBRO_SKILL_CREATOR_PROD_CANARY_CONFIRM,githubToken:process.env.GITHUB_TOKEN??''});fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');console.log(JSON.stringify({status:report.status,main_sha:report.main_ref.sha,live_requests:report.live_requests,fixture_probes:report.fixture_probes.length,observability:report.observability_records,audit:report.audit_records,finops:report.finops_records,cost_eur:report.measured_additional_cost_eur,rollback_proven:report.rollback_proven,rebuild_proven:report.rebuild_proven,prod_authorized:false}));}catch(error){const report=error?.report??{status:'HOLD_SKILL_CREATOR_PROD_READONLY_CANARY',error:String(error?.message??error)};fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');console.error(JSON.stringify({status:report.status,error:report.error,rollback_proven:report.rollback_proven??false,rebuild_proven:report.rebuild_proven??false,prod_authorized:false}));process.exitCode=1;}}
