import {githubActionsReader} from './github-actions-reader.mjs';
import {verifyLearningPublication} from './learning-publication-reader.mjs';
const token=process.env.ZEUS_LAB_JOB_TOKEN;
if(!token)throw Error('GITHUB_TOKEN_MISSING');
const github=githubActionsReader(async callback=>callback(token));
const manifest=await verifyLearningPublication({
 github,runId:45198055197,attempt:1,stateCommit:'c9d7a17bf3632413facd6439a1b8738d69f2e023'
});
if(manifest.daily_result.status!=='NO_DAILY_RESULT')throw Error('DAILY_RESULT_CHANGED');
const url=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
url.searchParams.set('audience','cerebro-zeus-lrn-cp106-lab');
const issued=await fetch(url,{headers:{Authorization:'Bearer '+process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN},redirect:'manual'});
if(!issued.ok)throw Error('OIDC_ISSUE_FAILED');
const jwt=(await issued.json()).value;
if(typeof jwt!=='string'||jwt.split('.').length!==3)throw Error('OIDC_INVALID');
const endpoint='https://cerebro-zeus-lrn-oidc-cp103-lab.carlosj-munozcabeza.workers.dev/v1/publication';
const send=async (data,bearer)=>{
 const headers={'Content-Type':'application/json'};
 if(bearer)headers.Authorization='Bearer '+bearer;
 const response=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify(data),redirect:'manual',signal:AbortSignal.timeout(12000)});
 return {status:response.status,body:await response.json()};
};
if((await send(manifest)).status!==403)throw Error('ANONYMOUS_WRITE_NOT_REJECTED');
if((await send({...manifest,scope:{...manifest.scope,company_id:'other-company'}},jwt)).status!==422)
  throw Error('CROSS_COMPANY_NOT_REJECTED');
const received=await send(manifest,jwt);
if(received.status!==200||received.body.status!=='RECORDED'||![0,1].includes(received.body.writes))
  throw Error('D1_PUBLICATION_WRITE_FAILED_'+received.status);
const retry=await send(manifest,jwt);
if(retry.status!==200||retry.body.writes!==0)throw Error('IDEMPOTENCE_DENIED');
console.log(JSON.stringify({realEvidence:true,oidcVerified:true,d1Recorded:true,firstWrite:received.body.writes,retryWrite:retry.body.writes,
 runId:manifest.runId,jobId:manifest.jobId,commit:manifest.stateCommit,dailyResult:manifest.daily_result.status,
 scope:manifest.scope,prod_authorized:false}));
