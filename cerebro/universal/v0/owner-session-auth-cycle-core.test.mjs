import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runOfficialLabSessionCycle} from './security-lab/owner-session-auth-cycle-core.mjs';
const U='11111111-1111-4111-a111-111111111111';
const SID='22222222-2222-4222-a222-222222222222';
const ISS='https://hnqlnvakzaywtafeiybt.supabase.co/auth/v1';
const email='cerebro-p0a-'+'1'.repeat(32)+'@example.invalid';
const password='x'.repeat(44);
function fixture(o={}){
 const calls={create:0,signin:0,claims:0,read:[],logout:0,delete:0};
 let loggedOut=false;
 const admin={
  auth:{admin:{
   createUser:async()=>{calls.create++;return o.create||{data:{user:{id:U}},error:null}},
   deleteUser:async()=>{calls.delete++;return o.del||{error:null}}
  }},
  rpc:async(name,args)=>{
   assert.equal(name,'cerebro_operativa_session_guard_lab_v0');
   calls.read.push([args.p_session_id,args.p_user_id]);
   if(o.rpc) return o.rpc(args,loggedOut);
   return {data:args.p_session_id===SID&&args.p_user_id===U&&!loggedOut,error:null};
  }
 };
 const userClient={auth:{
  signInWithPassword:async()=>{calls.signin++;return o.signin||{data:{session:{access_token:'Z'.repeat(64)}},error:null}},
  getClaims:async()=>{calls.claims++;return o.claims||{data:{claims:{iss:ISS,sub:U,session_id:SID,aud:'authenticated',role:'authenticated',exp:2000000000}},error:null}},
  signOut:async args=>{calls.logout++;assert.deepEqual(args,{scope:'local'});
   if(o.logout){const r=await o.logout();if(!r.error)loggedOut=true;return r}
   loggedOut=true;return {error:null}
  }
 }};
 return {admin,userClient,calls};
}
const run=(f,extra={})=>runOfficialLabSessionCycle({...f,email,password,now:()=>1763330000000,sleep:async()=>{},...extra});
test('mocked official LAB Auth sequence accepts live and rejects after logout; scoped cleanup',async()=>{
 const f=fixture();const r=await run(f);
 assert.deepEqual(r,{status:'PASS',stage:'COMPLETE',cleanup_status:'DONE',issuer_scope:'LAB_ISSUER_ONLY',real_owner_prod_certified:false,secrets_in_result:false});
 assert.deepEqual(f.calls,{create:1,signin:1,claims:1,read:[[ '00000000-0000-4000-8000-000000000002',U],[SID,'00000000-0000-4000-8000-000000000001'],[SID,U],[SID,U]],logout:1,delete:1});
});
test('create error without user means no cleanup and never logs or falsely reports pass',async()=>{
 const f=fixture({create:{data:{user:null},error:{message:'could contain PII'}}});
 const r=await run(f);assert.equal(r.status,'FAIL');assert.equal(r.stage,'CREATE');
 assert.equal(r.cleanup_status,'NOT_NEEDED');assert.equal(f.calls.delete,0);
 assert.ok(!JSON.stringify(r).includes('PII'));
});
test('partial create error with user ID must clean that exact created account',async()=>{
 const f=fixture({create:{data:{user:{id:U}},error:{message:'error'}}});
 const r=await run(f);assert.equal(r.status,'FAIL');
 assert.equal(r.cleanup_status,'DONE');assert.equal(f.calls.delete,1);
});
test('sign in failed after create still deletes only created user',async()=>{
 const f=fixture({signin:{error:{message:'blocked'},data:null}});
 const r=await run(f);assert.equal(r.status,'FAIL');
 assert.equal(r.stage,'SIGN_IN');assert.equal(r.cleanup_status,'DONE');
 assert.equal(f.calls.logout,0);assert.equal(f.calls.delete,1);
});
test('invalid signed claims deny before session lookup and still revoke/delete created test user',async()=>{
 const f=fixture({claims:{data:{claims:{iss:'https://evil.example',sub:U,session_id:SID,aud:'authenticated',role:'authenticated',exp:2000000000}}}});
 const r=await run(f);assert.equal(r.status,'FAIL');assert.equal(r.stage,'CLAIMS');
 assert.equal(f.calls.read.length,0);assert.equal(f.calls.logout,1);assert.equal(f.calls.delete,1);
});
test('session never active fails closed and cleans up',async()=>{
 const f=fixture({rpc:async()=>({data:false,error:null})});
 const r=await run(f);assert.equal(r.status,'FAIL');assert.equal(r.stage,'ACTIVE');
 assert.equal(r.cleanup_status,'DONE');assert.equal(f.calls.logout,1);assert.equal(f.calls.delete,1);
});
test('session still active after three bounded checks after logout is NOT a pass',async()=>{
 const f=fixture({rpc:async(args)=>({data:args.p_session_id===SID&&args.p_user_id===U,error:null})});
 let waits=0;const r=await run(f,{sleep:async ms=>{assert.equal(ms,300);waits++}});
 assert.equal(r.status,'FAIL');assert.equal(r.stage,'REVOKED');
 assert.equal(r.cleanup_status,'DONE');assert.equal(waits,2);assert.equal(f.calls.delete,1);
});
test('cleanup failure overrides otherwise passing lifecycle and never leaks credentials',async()=>{
 const f=fixture({del:{error:{message:'SECRET-DO-NOT-LOG'}}});
 const r=await run(f);assert.equal(r.status,'FAIL');assert.equal(r.stage,'COMPLETE');
 assert.equal(r.cleanup_status,'FAILED');assert.ok(!JSON.stringify(r).includes('SECRET-DO-NOT-LOG'));
});
test('missing dependencies/invalid caller email deny without creating any account',async()=>{
 const f=fixture();const r=await run(f,{email:'owner@example.com'});
 assert.equal(r.status,'FAIL');assert.equal(r.cleanup_status,'NOT_NEEDED');
 assert.deepEqual(f.calls,{create:0,signin:0,claims:0,read:[],logout:0,delete:0});
});
