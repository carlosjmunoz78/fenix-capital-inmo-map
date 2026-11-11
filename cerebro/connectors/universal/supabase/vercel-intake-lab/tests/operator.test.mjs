import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {SCOPE,TEAM_ID,PROJECT_ID,PROJECT_NAME,validateOrder} from '../vercel-policy.mjs';
import {executeOrder} from '../vercel-operator.mjs';
test('sealed service exact scope and provider project',()=>{
 assert.equal(SCOPE.environment,'LAB');
 const request={...SCOPE,provider:'vercel',team_id:TEAM_ID,project_id:PROJECT_ID,project_name:PROJECT_NAME,
  operation:'vercel.project.read_lab',max_cost_eur:0,request_id:'FACT001-VERCEL-20261111-READ-01',idempotency_key:'fact001-vercel-oidc-20261111-read-01'};
 assert.equal(validateOrder(request),true);
 for(const wrong of [{team_id:'other'},{project_id:'prj_other'},{environment:'PROD'},{max_cost_eur:1},{operation:'vercel.delete_all'}])
  assert.throws(()=>validateOrder({...request,...wrong}));
});
test('authorized read mock never edits project',async()=>{
 let callCount=0;
 const request={...SCOPE,provider:'vercel',team_id:TEAM_ID,project_id:PROJECT_ID,project_name:PROJECT_NAME,
  operation:'vercel.project.read_lab',max_cost_eur:0,request_id:'FACT001-VERCEL-20261111-READ-01',idempotency_key:'fact001-vercel-oidc-20261111-read-01'};
 const http=async(url,options)=>{
  callCount++;assert.equal(options.method,'GET');
  assert.ok(url.includes(PROJECT_ID));
  return{status:200,json:async()=>({id:PROJECT_ID,name:PROJECT_NAME,accountId:TEAM_ID,framework:null,latestDeployment:null,live:false,domains:[],ssoProtection:{enabled:true,deploymentType:'all'}})};
 };
 assert.equal((await executeOrder(request,'A'.repeat(36),http)).status,'VERIFIED');
 assert.equal(callCount,1);
});
test('edge execute requires verified JWT and D1 job claim; secret never emitted',()=>{
 const s=readFileSync(new URL('../index.ts',import.meta.url),'utf8');
 assert.ok(s.indexOf('verifyGitHubOidc(auth(req))')<s.indexOf("if(route==='execute')"));
 assert.ok(s.includes("CLAIM_EXECUTE"));
 assert.ok(s.includes("state='QUEUED' AND attempts=0"));
 assert.ok(s.includes("cerebro_vercel_service_token_v1"));
 assert.ok(s.includes("withVercelServiceToken(token=>executeOrder(order,token))"));
 assert.ok(!s.includes('console.log('));
 assert.ok(!s.includes('token_exposed:true'));
 assert.ok(!s.includes('api.vercel.com'));
});
