import test from 'node:test';
import assert from 'node:assert/strict';
import {probeNotionD1Lab,FACT001_D1_UUID} from '../notion-d1-status.mjs';
const token='CEREBRO_TEST_SCOPED_READ_ONLY_TOKEN_0123456789';
function mock(data={owned_total:1,approved_total:0,snapshots_total:0,audit_total:0}){
 let seen=0;const http=async(url,opts)=>{
  seen++;assert.equal(url,'https://api.cloudflare.com/client/v4/accounts/e39a57e1ac42650ca5a6d5307cf0ac8e/d1/database/'+FACT001_D1_UUID+'/query');
  assert.equal(opts.method,'POST');assert.equal(opts.headers.Authorization,'Bearer '+token);
  const payload=JSON.parse(opts.body);
  assert.deepEqual(Object.keys(payload),['sql']);assert.ok(payload.sql.startsWith('SELECT'));
  assert.ok(!/\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b/.test(payload.sql));
  return {status:200,json:async()=>({success:true,result:[{success:true,results:[data]}]})};
 };
 return {http,count:()=>seen};
}
test('fixed Notion LAB D1 read uses scoped credential and returns only counts',async()=>{
 const f=mock();const r=await probeNotionD1Lab({token,http:f.http});
 assert.equal(r.status,'FACT001_NOTION_D1_SIGNED_READ_VERIFIED');assert.equal(r.approved_count,0);
 assert.equal(r.external_provider_writes,0);assert.equal(f.count(),1);
 assert.ok(!JSON.stringify(r).includes(token));assert.equal(r.scope.environment,'LAB');
});
test('does not allow arbitrary SQL, URL or database selection from caller arguments',async()=>{
 const f=mock();await probeNotionD1Lab({token,http:f.http,sql:'DELETE FROM users',db:'user-supplied'});
 assert.equal(f.count(),1);
});
test('denies invalid token before any network',async()=>{
 const f=mock();
 for(const value of ['', 'wrong', 'bad\nline'])await assert.rejects(()=>probeNotionD1Lab({token:value,http:f.http}),/D1_SCOPED_TOKEN_INVALID/);
 assert.equal(f.count(),0);
});
test('upstream 401/403/429 errors fail closed and do not leak bodies or credentials',async()=>{
 for(const status of [401,403,429])await assert.rejects(()=>probeNotionD1Lab({token,http:async()=>({status})}));
});
test('malformed/cloudflare-failed/extra rows reject',async()=>{
 for(const body of [null,{success:false,result:[]},{success:true,result:[]},
 {success:true,result:[{success:true,results:[{},{}]}]},
 {success:true,result:[{success:true,results:[{owned_total:1,approved_total:2,snapshots_total:0,audit_total:0}]}]}]){
  await assert.rejects(()=>probeNotionD1Lab({token,http:async()=>({status:200,json:async()=>body})}));
 }
});
