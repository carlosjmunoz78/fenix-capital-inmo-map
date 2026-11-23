import {githubActionsReader} from './github-actions-reader.mjs';
import {verifyLearningPublication} from './learning-publication-reader.mjs';
const token=process.env.GITHUB_TOKEN_LRN_LAB;
if(!token)throw Error('JOB_GITHUB_TOKEN_MISSING');
const runId=45198055197,attempt=1,stateCommit='c9d7a17bf3632413facd6439a1b8738d69f2e023';
const github=githubActionsReader(async fn=>fn(token));
const manifest=await verifyLearningPublication({github,runId,attempt,stateCommit});
if(manifest.schema!=='zeus-lrn-publication/v1'||manifest.event!=='workflow_run'||manifest.jobId!==137773725781||
   manifest.daily_result.status!=='NO_DAILY_RESULT'||manifest.promotion_allowed!==false||
   manifest.health_state!=='GREEN_AT_OBSERVATION')throw Error('CP105_PROVENANCE_NOT_VERIFIED');
console.log(JSON.stringify({verified:true,source:'GITHUB_ACTIONS_AUTHENTIC',runId:manifest.runId,
 jobId:manifest.jobId,commit:manifest.stateCommit,event:manifest.event,scope:manifest.scope,
 daily_result:manifest.daily_result.status,storage:'READ_ONLY',d1_writes:0}));
