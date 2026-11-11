import test from 'node:test';import assert from 'node:assert/strict';
import {SCOPE,TEAM_ID,PROJECT_ID,PROJECT_NAME,validateOrder} from '../policy.mjs';
import {createClient,executeOrder} from '../operator.mjs';
const base={...SCOPE,provider:'vercel',team_id:TEAM_ID,project_id:PROJECT_ID,project_name:PROJECT_NAME,operation:'vercel.project.set_framework_vite_lab',max_cost_eur:0,request_id:'FACT001-VERCEL-20261111-UPDATE-001',idempotency_key:'fact001-vercel-20261111-update-001'};
test('reject unrelated project, PROD and money',()=>{
 assert.equal(validateOrder(base),true);
 for(const delta of [{project_id:'prj_wrong'},{environment:'PROD'},{max_cost_eur:1},{operation:'vercel.project.delete'},{extra:true},{team_id:'other'}])assert.throws(()=>validateOrder({...base,...delta}));
});
test('client refuses absent token',()=>assert.throws(()=>createClient('short')));
function fake(){
 let framework=null,calls=[];
 const http=async(url,opt)=>{
  calls.push({url,method:opt.method});
  const current={id:PROJECT_ID,name:PROJECT_NAME,accountId:TEAM_ID,framework,latestDeployment:null,live:false,domains:[],ssoProtection:{enabled:true,deploymentType:'all'}};
  if(opt.method==='GET'&&url.includes('/v9/projects/'))return{status:200,ok:true,json:async()=>current};
  if(opt.method==='PATCH'){framework=JSON.parse(opt.body).framework;return{status:200,ok:true,json:async()=>({...current,framework})};}
  if(opt.method==='GET'&&url.includes('/v6/deployments'))return{status:200,ok:true,json:async()=>({deployments:[]})};
  throw Error('UNEXPECTED_REQUEST');
 };
 return{http,calls,get framework(){return framework;}};
}
test('physical-like mocked update and rollback preserve isolated SSO',async()=>{
 const x=fake();
 const updated=await executeOrder(base,'A'.repeat(40),x.http);
 assert.equal(updated.status,'COMPLETED');assert.equal(x.framework,'vite');
 const undone=await executeOrder({...base,operation:'vercel.project.rollback_framework_null_lab',request_id:'FACT001-VERCEL-20261111-ROLLBACK-001'},'A'.repeat(40),x.http);
 assert.equal(undone.status,'COMPLETED');assert.equal(x.framework,null);assert.equal(undone.protected,true);
 assert.equal(x.calls.some(c=>c.method==='DELETE'||c.url.includes('/deployments?')),false);
});
test('reject accidental deployment or lost SSO before writes',async()=>{
 let changed=0;
 const bad=async()=>({status:200,json:async()=>({id:PROJECT_ID,name:PROJECT_NAME,accountId:TEAM_ID,live:true,domains:['unsafe'],ssoProtection:{enabled:false}})});
 await assert.rejects(()=>executeOrder(base,'B'.repeat(32),bad));
 assert.equal(changed,0);
});
