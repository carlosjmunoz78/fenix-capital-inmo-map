import test from 'node:test';
import assert from 'node:assert/strict';
import {assertClaims,assertOrder,REPO,BRANCH,WORKFLOW_REF,OIDC_AUDIENCE,SCOPE,TEAM_ID,LAB_PROJECT_ID} from '../policy.mjs';
const fixed={...SCOPE,team_id:TEAM_ID,client_id:'cerebro',operation:'vercel.projects.list_lab',request_id:'FACT001-VERCEL-SERVICE-READ-20261110'};
const now=1794300000;
const claims={iss:'https://token.actions.githubusercontent.com',aud:OIDC_AUDIENCE,repository:REPO,ref:BRANCH,workflow_ref:WORKFLOW_REF,event_name:'push',iat:now-30,exp:now+300};
test('exact 4D LAB and one Vercel read order accepted',()=>assert.equal(assertOrder({...fixed}),true));
test('reject arbitrary methods, team, provider, repo, extra credentials',()=>{
 for(const x of [
  {...fixed,environment:'PROD'},
  {...fixed,client_id:'chatgpt'},
  {...fixed,team_id:'another'},
  {...fixed,operation:'vercel.project.delete'},
  {...fixed,bearer_token:'abc'},
  {...fixed,request_id:'OTHER'}
 ])assert.throws(()=>assertOrder(x));
});
test('GitHub OIDC exact repo/ref/audience/workflow/event and expiry',()=>{
 assert.equal(assertClaims(claims,now).client_id,'cerebro');
 for(const [k,v] of [['repository','owner/other'],['ref','refs/heads/main'],['aud','wrong'],['workflow_ref','other.yml'],['event_name','pull_request'],['exp',now-1]]){
  assert.throws(()=>assertClaims({...claims,[k]:v},now),k);
 }
});
test('lab scope and project IDs are pinned',()=>{
 assert.equal(SCOPE.environment,'LAB');assert.equal(SCOPE.engine_id,'FACT-001');
 assert.match(LAB_PROJECT_ID,/^prj_/);assert.match(TEAM_ID,/^team_/);
});
