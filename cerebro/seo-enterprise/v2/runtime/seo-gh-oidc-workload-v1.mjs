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
 'seo-corpus-tribunal':'SEO_CORPUS_TRIBUNAL',
 'seo-corpus-sandbox-writer':'SEO_SANDBOX_DRAFT_WRITER'
});
const fail=code=>{throw Error('SEO_GH_WORKLOAD_'+code)};
const dec=x=>JSON.parse(Buffer.from(x,'base64url').toString('utf8'));
const asInt=x=>typeof x==='string'&&/^[1-9]\d{0,14}$/.test(x)?Number(x):NaN;
const getJson=async (url,init={},fetchImpl=fetch)=>{
 const resp=await fetchImpl(url,{...init,redirect:'error',signal:AbortSignal.timeout(9000)});
 if(!resp?.ok)fail('HTTP_'+String(resp?.status||'UNKNOWN'));return resp.json();
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
  sub:typeof payload.sub==='string'&&payload.sub.length>=8&&payload.sub.length<=1024};
 for(const [key,ok] of Object.entries(claims))if(!ok)fail('JWT_CLAIM_'+key.toUpperCase());
 return {verified:true,issuer:ISSUER,subject_sha256:crypto.createHash('sha256').update(payload.sub).digest('hex'),audience:AUD,
   sha256:crypto.createHash('sha256').update(jwt).digest('hex'),expires_at:payload.exp};
}
export async function verifySeoGithubWorkload({env=process.env,fetchImpl=fetch,nowSeconds}={}){
 if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_REPOSITORY!==REPO||env.GITHUB_HEAD_REF!==BRANCH||
   env.GITHUB_EVENT_NAME!=='pull_request'||!Object.hasOwn(HOST_ROLES,env.GITHUB_JOB)||
   !/^refs\/pull\/\d+\/merge$/.test(env.GITHUB_REF||''))fail('HOST_ENV');
 const runId=asInt(env.GITHUB_RUN_ID),runAttempt=asInt(env.GITHUB_RUN_ATTEMPT);
 if(!Number.isSafeInteger(runId)||!Number.isSafeInteger(runAttempt))fail('RUN_INPUT');
 let u;
 try{u=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL)}catch{fail('OIDC_REQUEST_URL')}
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
 const signed=verifyJwtSignedByGithub({jwt:minted.value,jwks,env,nowSeconds});
 let provider='NOT_AVAILABLE',jobId=null,apiStatus='UNKNOWN';
 if(typeof env.GITHUB_TOKEN==='string'&&env.GITHUB_TOKEN.length>15){
  const base='https://api.github.com/repos/'+REPO;
  const headers={Authorization:'Bearer '+env.GITHUB_TOKEN,Accept:'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28'};
  try{
   const run=await getJson(base+'/actions/runs/'+runId,{headers},fetchImpl);
   const jobs=await getJson(base+'/actions/runs/'+runId+'/jobs?per_page=100',{headers},fetchImpl);
   if(run.id!==runId||run.run_attempt!==runAttempt||run.repository?.full_name!==REPO||
      run.event!=='pull_request'||run.head_branch!==BRANCH||run.path!==WORKFLOW||
      !['in_progress','completed'].includes(run.status))fail('RUN_BINDING');
   const own=(jobs.jobs||[]).filter(x=>x.name===env.GITHUB_JOB&&x.run_id===runId);
   if(own.length!==1||!Number.isSafeInteger(own[0].id)||
     !['in_progress','completed'].includes(own[0].status)||
     (own[0].conclusion&&own[0].conclusion!=='success'))fail('JOB_BINDING');
   provider='VERIFIED_BY_GITHUB_API';jobId=own[0].id;apiStatus='SUCCESS';
  }catch(err){
   if(!String(err?.message||'').includes('HTTP_401'))throw err;
   provider='OIDC_ONLY_GITHUB_API_AUTH_401';
   apiStatus='401_READ_PERMISSION_NOT_AVAILABLE';
  }
 }
 return {schema_version:'1.1.0',
  status:provider==='VERIFIED_BY_GITHUB_API'?'GITHUB_OIDC_JWKS_AND_API_JOB_VERIFIED':'GITHUB_OIDC_JWKS_VERIFIED_PROVIDER_API_UNAVAILABLE_LAB',
  company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'2.1.0',
  repository:REPO,head_branch:BRANCH,workflow_path:WORKFLOW,workflow_name:NAME,
  oidc_issuer:signed.issuer,oidc_subject_sha256:signed.subject_sha256,
  oidc_token_sha256:signed.sha256,oidc_expiration:signed.expires_at,
  github_run_id:runId,github_run_attempt:runAttempt,github_job_id:jobId,
  github_job_name:env.GITHUB_JOB,github_sha:env.GITHUB_SHA,
  role:HOST_ROLES[env.GITHUB_JOB],workload_oidc_verified:true,
  provider_job_verified:provider==='VERIFIED_BY_GITHUB_API',
  provider_job_verification:provider,provider_api_status:apiStatus,
  token_values_logged:false,individual_agent_iam_verified:false,
  can_read_snapshot:true,can_write_prod:false,can_grant_permissions:false,
  can_publish:false,cost_added_eur:0};
}
export async function verifyPriorSeoJob({prior,env=process.env}={}){
 const bad=()=>fail('PRIOR_JOB_CONTINUITY_DENIED');
 if(!prior||!['GITHUB_OIDC_JWKS_AND_API_JOB_VERIFIED','GITHUB_OIDC_JWKS_VERIFIED_PROVIDER_API_UNAVAILABLE_LAB'].includes(prior.status)||
  prior.repository!==REPO||prior.github_run_id!==asInt(env.GITHUB_RUN_ID)||
  prior.github_run_attempt!==asInt(env.GITHUB_RUN_ATTEMPT)||
  prior.github_sha!==env.GITHUB_SHA||prior.workload_oidc_verified!==true||
  prior.can_write_prod!==false||prior.can_publish!==false||
  !Object.hasOwn(HOST_ROLES,prior.github_job_name)||prior.role!==HOST_ROLES[prior.github_job_name]||
  prior.github_job_name===env.GITHUB_JOB||
  !/^[a-f0-9]{64}$/.test(prior.oidc_token_sha256||'')||
  !/^[a-f0-9]{64}$/.test(prior.oidc_subject_sha256||'')||
  (prior.provider_job_verified!==true&&prior.provider_job_verified!==false))bad();
 return {status:prior.provider_job_verified?'OIDC_AND_API_PRIOR_RECEIPT_PRESENT':'OIDC_ONLY_PRIOR_RECEIPT_DAG_DEPENDENCY',
  prior_role:prior.role,provider_job_verified:prior.provider_job_verified,
  note:'DAG dependency assures predecessor success; prior receipt not cryptographically reverified without original JWT'};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const path=process.argv[2];
 verifySeoGithubWorkload().then(result=>{
  if(!path)fail('OUTPUT_REQUIRED');
  fs.writeFileSync(path,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  process.stdout.write(JSON.stringify({status:result.status,role:result.role,
   run_id:result.github_run_id,github_job_id:result.github_job_id,
   workload_oidc_verified:true,provider_job_verified:result.provider_job_verified,agent_iam_verified:false,prod_writes:0})+'\n');
 }).catch(err=>{process.stderr.write(String(err.message||'BLOCKED')+'\n');process.exitCode=2});
}
