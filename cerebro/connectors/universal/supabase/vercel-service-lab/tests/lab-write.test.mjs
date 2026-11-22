import test from 'node:test';
import assert from 'node:assert/strict';
import {updateAndRollbackLab} from '../lab-write.mjs';
import {TEAM_ID,LAB_PROJECT_ID,LAB_PROJECT_NAME} from '../policy.mjs';
const cred='FAKE_NEVER_A_REAL_VERCEL_TOKEN_FOR_TESTS';
function fixture({uncertainFirstPatch=false,baseline=null}={}){
 let state=baseline,patches=0;const calls=[];
 const http=async(url,req)=>{
  const u=new URL(url);
  assert.equal(u.origin,'https://api.vercel.com');
  assert.equal(u.pathname,'/v9/projects/'+LAB_PROJECT_ID);
  assert.equal(u.searchParams.get('teamId'),TEAM_ID);
  assert.equal(req.headers.Authorization,'Bearer '+cred);
  assert.equal(req.redirect,'error');
  const body=req.body&&JSON.parse(req.body);
  calls.push({method:req.method,body});
  if(req.method==='PATCH'){
   assert.deepEqual(Object.keys(body),['framework']);
   assert.ok(body.framework===null||body.framework==='vite');
   state=body.framework;patches++;
   if(uncertainFirstPatch&&patches===1)throw Object.assign(Error('fake timeout'),{code:'ETIMEDOUT'});
  }
  return {ok:true,status:200,json:async()=>({id:LAB_PROJECT_ID,name:LAB_PROJECT_NAME,framework:state})};
 };
 return {http,calls,framework:()=>state};
}
test('fixed API scope and two PATCH calls return original LAB framework',async()=>{
 const f=fixture();
 const result=await updateAndRollbackLab({token:cred,http:f.http});
 assert.equal(result.status,'VERCEL_LAB_WRITE_AND_ROLLBACK_VERIFIED');
 assert.equal(result.write_verified,true);assert.equal(result.rollback_verified,true);
 assert.equal(result.credential_exposed,false);assert.equal(result.deployments_created,0);
 assert.equal(f.framework(),null);assert.equal(f.calls.filter(c=>c.method==='PATCH').length,2);
});
test('unknown initial framework blocks all mutation',async()=>{
 const f=fixture({baseline:'nextjs'});
 await assert.rejects(()=>updateAndRollbackLab({token:cred,http:f.http}),/BASELINE_NOT_NULL/);
 assert.equal(f.calls.filter(c=>c.method==='PATCH').length,0);
});
test('timeout after PATCH triggers rollback and does not leave changed configuration',async()=>{
 const f=fixture({uncertainFirstPatch:true});
 await assert.rejects(()=>updateAndRollbackLab({token:cred,http:f.http}),/fake timeout/);
 assert.equal(f.framework(),null);assert.equal(f.calls.filter(c=>c.method==='PATCH').length,2);
});
test('reject invalid tokens before HTTP',async()=>{
 const f=fixture();
 await assert.rejects(()=>updateAndRollbackLab({token:'',http:f.http}),/SERVICE_SECRET_INVALID/);
 assert.equal(f.calls.length,0);
});
