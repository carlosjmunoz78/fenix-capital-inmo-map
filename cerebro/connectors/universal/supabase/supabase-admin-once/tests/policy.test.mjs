import test from 'node:test';
import assert from 'node:assert/strict';
import {assertClaims,assertCleanupOrder,REPO,BRANCH,WORKFLOW_REF,OIDC_AUDIENCE,SCOPE,ORDER,SUPABASE_REF,TEST_FUNCTION_ID,TEST_FUNCTION} from '../policy.mjs';
const now=1794310000;
const c={iss:'https://token.actions.githubusercontent.com',aud:OIDC_AUDIENCE,repository:REPO,ref:BRANCH,workflow_ref:WORKFLOW_REF,event_name:'push',iat:now-20,exp:now+250};
test('signed GitHub OIDC matches only fixed repo, branch, workflow, audience and push event',()=>{
 assert.equal(assertClaims(c,now).client_id,'cerebro');
 for(const [k,v] of [['repository','attacker/other'],['ref','refs/heads/main'],['workflow_ref','other.yml'],['aud','wrong'],['event_name','workflow_dispatch'],['exp',now-1]]){
  assert.throws(()=>assertClaims({...c,[k]:v},now));
 }
});
test('one cleanup order matches exact company/engine/project/function id and LAB scope',()=>{
 assert.equal(assertCleanupOrder({...ORDER}),true);
 assert.equal(ORDER.project_ref,SUPABASE_REF);
 assert.equal(ORDER.function_id,TEST_FUNCTION_ID);
 assert.equal(ORDER.function_slug,TEST_FUNCTION);
 assert.equal(SCOPE.environment,'LAB');
});
test('rejects arbitrary function, project, token fields, other clients, PROD, duplicates',()=>{
 for(const o of [
  {...ORDER,environment:'PROD'},
  {...ORDER,function_slug:'cerebro-console-gateway-v0'},
  {...ORDER,project_ref:'other-supabase-project'},
  {...ORDER,function_id:'wrong'},
  {...ORDER,client_id:'chatgpt'},
  {...ORDER,api_token:'forbidden'},
  {...ORDER,request_id:'a-random-unapproved-cleanup'},
  null
 ])assert.throws(()=>assertCleanupOrder(o));
});
