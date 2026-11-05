/**
 * SEO-001 V2 · three real GitHub-hosted workload identities.
 * Verifies GitHub OIDC RS256/JWKS and current GitHub Actions job API.
 * A verified workload is NOT an independent CEREBRO agent IAM account.
 * No secrets/JWT returned or written; no PROD permissions.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const REPO='carlosjmunoz78/fenix-capital-inmo-map';
const BRANCH='cerebro/seo-enterprise-family-staging-contract-v1-20261105';
const WORKFLOW='.github/workflows/cerebro-seo-corpus-workload-v1.yml';
const NAME='CEREBRO SEO Corpus Workforce Identity V1';
const ISSUER='https://token.actions.githubusercontent.com';
const AUD='cerebro-seo-corpus-workload-lab-v1';
export const HOST_ROLES=Object.freeze({
 'seo-corpus-worker':'SEO_CORPUS_WORKER',
 'seo-corpus-qa':'SEO_CORPUS_INDEPENDENT_QA',
 'seo-corpus-tribunal':'SEO_CORPUS_TRIBUNAL'
});
const fail=code=>{throw Error('SEO_GH_WORKLOAD_'+code)};
const dec=x=>JSON.parse(Buffer.from(x,'base64url').toString('utf8'));
const asInt=x=>typeof x==='string'&&/^[1-9]\d{0,14}$/.test(x)?Number(x):NaN;
const getJson=async (url,init={},fetchImpl=fetch)=>{
 const resp=await fetchImpl(url,{...init,redirect:'error',signal:AbortSignal.timeout(9000)});
 if(!resp?.ok)fail('HTTP_FAILED');return resp.json();
};
export function verifyJwtSignedByGithub({jwt,jwks,env,nowSeconds=Math.floor(Date.now()/1000)}){
 if(typeof jwt!=='string'||jwt.length<200||jwt.length>18000)fail('JWT_FORMAT');
 const parts=jwt.split('.');if(parts.length!==3)fail('JWT_SEGMENTS');
 let header,payload;try{header=dec(parts[0]);payload=dec(parts[1])}catch{fail('JWT_DECODE')}
 if(header.alg!=='RS256'||typeof header.kid!=='string'||!Array.isArray(jwks?.keys))fail('JWT_ALGORITHM');
 const key=jwks.keys.find(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.use||k.use==='sig')&&(!k.alg||k.alg==='RS256'));
 if(!key)fail('JWT_KEY');
 const ver=crypto.createVerify('RSA-SHA256');ver.update(parts[0]+'.'+parts[1]);ver.end();
 let ok=false;
 try{ok=ver.verify(crypto.createPublicKey({key,format:'jwk'}),Buffer.from(parts[2],'base64url'))}catch{fail('JWT_SIGNATURE')}
 if(!ok)fail('JWT_SIGNATURE');
 if(payload.iss!==ISSUER||payload.aud!==AUD)fail('JWT_ISSUER_AUDIENCE');
 if(!Number.isInteger(payload.iat)||!Number.isInteger(payload.exp)||payload.exp<payload.iat||
   payload.exp-payload.iat>900||nowSeconds<payload.iat-60||nowSeconds>payload.exp+30)fail('JWT_EXPIRED');
 if(payload.nbf!==undefined&&(typeof payload.nbf!=='number'||nowSeconds<payload.nbf-60))fail('JWT_NOT_BEFORE');
 const claims={repository:payload.repository===REPO,owner:payload.repository_owner==='carlosjmunoz78',
  event:payload.event_name==='pull_request',workflow:payload.workflow===NAME,
  run_id:String(payload.run_id)===env.GITHUB_RUN_ID,
  run_attempt:String(payload.run_attempt)===env.GITHUB_RUN_ATTEMPT,
  sha:payload.sha===env.GITHUB_SHA,ref:payload.ref===env.GITHUB_REF,
  sub:payload.sub==='repo:'+REPO+':pull_request'};
 for(const [key,ok] of Object.entries(claims))if(!ok)fail('JWT_CLAIM_'+key.toUpperCase());
 return {verified:true,issuer:ISSUER,subject:payload.sub,audience:AUD,
   sha256:crypto.createHash('sha256').update(jwt).digest('hex'),expires_at:payload.exp};
}
export async function verifySeoGithubWorkload({env=process.env,fetchImpl=fetch,nowSeconds}={}){
 if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_REPOSITORY!==REPO||env.GITHUB_HEAD_REF!==BRANCH||
   env.GITHUB_EVENT_NAME!=='pull_request'||!Object.hasOwn(HOST_ROLES,env.GITHUB_JOB)||
   !/^refs\/pull\/\d+\/merge$/.test(env.GITHUB_REF||''))fail('HOST_ENV');
 const runId=asInt(env.GITHUB_RUN_ID),runAttempt=asInt(env.GITHUB_RUN_ATTEMPT);
 if(!Number.isSafeInteger(runId)||!Number.isSafeInteger(runAttempt)||typeof env.GITHUB_TOKEN!=='string'||env.GITHUB_TOKEN.length<15)fail('RUN_AUTH');
 const endpoint=env.ACTIONS_ID_TOKEN_REQUEST_URL;
 let u;try{u=new URL(endpoint)}catch{fail('OIDC_REQUEST_URL')}
 if(u.protocol!=='https:'||!u.hostname.endsWith('.actions.githubusercontent.com')||u.username||u.password)fail('OIDC_REQUEST_HOST');
 if(typeof env.ACTIONS_ID_TOKEN_REQUEST_TOKEN!=='string'||env.ACTIONS_ID_TOKEN_REQUEST_TOKEN.length<15)fail('OIDC_REQUEST_CREDENTIAL');
 u.searchParams.set('audience',AUD);
 let minted,configuration,jwks;
 try{
  [minted,configuration]=await Promise.all([
   getJson(u.toString(),{headers:{Authorization:'Bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}},fetchImpl),
   getJson(ISSUER+'/.well-known/openid-configuration',{},fetchImpl)]);
  if(configuration.issuer!==ISSUER||configuration.jwks_uri!==ISSUER+'/.well-known/jwks')fail('DISCOVERY_INVALID');
  jwks=await getJson(configuration.jwks_uri,{},fetchImpl);
 }catch{fail('OIDC_ISSUANCE_OR_DISCOVERY')}
 const jwtProof=verifyJwtSignedByGithub({jwt:minted.value,jwks,env,nowSeconds});
 const base='https://api.github.com/repos/'+REPO;
 const headers={Authorization:'Bearer '+env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 let run,jobList;
 try{
  run=await getJson(base+'/actions/runs/'+runId,{headers},fetchImpl);
  jobList=await getJson(base+'/actions/runs/'+runId+'/jobs?per_page=100',{headers},fetchImpl);
 }catch{fail('GITHUB_API')}
 if(run.id!==runId||run.run_attempt!==runAttempt||run.repository?.full_name!==REPO||
   run.event!=='pull_request'||run.head_branch!==BRANCH||run.path!==WORKFLOW||
   !['in_progress','completed'].includes(run.status))fail('RUN_BINDING');
 if(!Array.isArray(jobList.jobs))fail('JOB_LIST');
 const own=jobList.jobs.filter(x=>x.name===env.GITHUB_JOB&&x.run_id===runId);
 if(own.length!==1||!Number.isSafeInteger(own[0].id)||
   !['in_progress','completed'].includes(own[0].status)||own[0].conclusion&&own[0].conclusion!=='success')fail('JOB_BINDING');
 return {schema_version:'1.0.0',status:'GITHUB_OIDC_JWKS_AND_API_JOB_VERIFIED',
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'2.1.0',
  repository:REPO,head_branch:BRANCH,workflow_path:WORKFLOW,workflow_name:NAME,
  oidc_issuer:jwtProof.issuer,oidc_subject:jwtProof.subject,
  oidc_token_sha256:jwtProof.sha256,oidc_expiration:jwtProof.expires_at,
  github_run_id:runId,github_run_attempt:runAttempt,github_job_id:own[0].id,
  github_job_name:env.GITHUB_JOB,github_sha:env.GITHUB_SHA,
  role:HOST_ROLES[env.GITHUB_JOB],workload_oidc_verified:true,provider_job_verified:true,
  token_values_logged:false,individual_agent_iam_verified:false,
  can_read_snapshot:true,can_write_prod:false,can_grant_permissions:false,
  can_publish:false,cost_added_eur:0};
}
export async function verifyPriorSeoJob({prior,env=process.env,token=env.GITHUB_TOKEN,fetchImpl=fetch}={}){
 const bad=()=>fail('PRIOR_JOB_UNTRUSTED');
 if(!prior||prior.status!=='GITHUB_OIDC_JWKS_AND_API_JOB_VERIFIED'||prior.repository!==REPO||
  prior.github_run_id!==asInt(env.GITHUB_RUN_ID)||prior.github_run_attempt!==asInt(env.GITHUB_RUN_ATTEMPT)||
  prior.github_sha!==env.GITHUB_SHA||prior.workload_oidc_verified!==true||prior.provider_job_verified!==true||
  prior.can_write_prod!==false||prior.can_publish!==false||!Object.hasOwn(HOST_ROLES,prior.github_job_name)||
  prior.role!==HOST_ROLES[prior.github_job_name]||prior.github_job_name===env.GITHUB_JOB)bad();
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json'};
 let response;
 try{response=await getJson('https://api.github.com/repos/'+REPO+'/actions/runs/'+prior.github_run_id+'/jobs?per_page=100',{headers},fetchImpl)}catch{bad()}
 const match=(response.jobs||[]).filter(j=>j.id===prior.github_job_id&&j.run_id===prior.github_run_id&&j.name===prior.github_job_name);
 if(match.length!==1||match[0].status!=='completed'||match[0].conclusion!=='success')bad();
 return {verified:true,prior_job_id:prior.github_job_id,prior_role:prior.role,token_not_exposed:true};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const path=process.argv[2];
 verifySeoGithubWorkload().then(result=>{
  if(!path)fail('OUTPUT_REQUIRED');
  fs.writeFileSync(path,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  process.stdout.write(JSON.stringify({status:result.status,role:result.role,
   run_id:result.github_run_id,github_job_id:result.github_job_id,
   workload_oidc_verified:true,agent_iam_verified:false,prod_writes:0})+'\n');
 }).catch(err=>{process.stderr.write(String(err.message||'BLOCKED')+'\n');process.exitCode=2});
}
