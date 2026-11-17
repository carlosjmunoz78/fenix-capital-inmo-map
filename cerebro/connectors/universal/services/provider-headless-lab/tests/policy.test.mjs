import test from 'node:test';
import assert from 'node:assert/strict';
import {assertClaims,assertReadOrder,REPO,BRANCH,WORKFLOW_REF,OIDC_AUDIENCE,ORDER,OWNER} from '../policy.mjs';
const now=1794318000;
const claims={iss:'https://token.actions.githubusercontent.com',aud:OIDC_AUDIENCE,repository:REPO,ref:BRANCH,workflow_ref:WORKFLOW_REF,event_name:'push',actor:OWNER,iat:now-20,exp:now+280};
test('source signature metadata validates only authorized GitHub workflow',()=>{
 assert.equal(assertClaims(claims,now).client_id,'cerebro');
 for(const [key,value] of [['repository','unknown/foreign'],['ref','refs/heads/main'],['workflow_ref','unapproved.yml'],['aud','wrong'],['actor','unauthorized'],['event_name','pull_request'],['exp',now-2]]){
  assert.throws(()=>assertClaims({...claims,[key]:value},now),key);
 }
});
test('only 3 read providers are valid with exact LAB owner order',()=>{
 for(const provider of ['cloudflare','vercel','supabase'])assert.equal(assertReadOrder({...ORDER,provider}),provider);
 for(const order of [{...ORDER,provider:'github'}, {...ORDER,provider:'notion'}, {...ORDER,provider:'vercel',environment:'PROD'}, {...ORDER,provider:'vercel',api_token:'abc'}, {...ORDER,provider:'supabase',operation:'delete'}, {...ORDER,provider:'cloudflare',source:'automation'}])assert.throws(()=>assertReadOrder(order));
});
