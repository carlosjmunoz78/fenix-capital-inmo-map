import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCloudflareReadOnly, PreflightError, ACCOUNT_ID, FACEBOOK_D1_NAME } from '../preflight/cloudflare-readonly.mjs';

function harness({n=7, tokenStatus='active', facebook=false, workers=true, corrupt=false}={}){
  const calls=[];
  const names=Array.from({length:n},(_,i)=>({name:`other-${i}`,uuid:`u-${i}`,jurisdiction:'eu'}));
  if(facebook){names[n-1]={name:FACEBOOK_D1_NAME,uuid:'fb',jurisdiction:'eu'};}
  const http=async(url,opt)=>{
    const u=new URL(url);calls.push({url:u.pathname,method:opt.method,hasBearer:opt.headers.Authorization.startsWith('Bearer ')});
    let result, result_info;
    if(u.pathname==='/client/v4/user/tokens/verify')result={status:tokenStatus};
    else if(u.pathname===`/client/v4/accounts/${ACCOUNT_ID}/d1/database`){const page=Number(u.searchParams.get('page'));result=names.slice((page-1)*100,page*100);result_info={total_count:n};}
    else if(u.pathname===`/client/v4/accounts/${ACCOUNT_ID}/workers/scripts`){if(!workers)return {ok:false,status:403};result=[];}
    else throw Error('unexpected path');
    return {ok:true,status:200,json:async()=>corrupt?{success:false}:{success:true,result,result_info}};
  };
  return {http,calls};
}
test('read-only physical path checks token, exact account D1 and Workers; 7 D1 no FB',async()=>{
  const f=harness();const r=await checkCloudflareReadOnly({token:'INJECTED_TEST_VALUE',http:f.http});
  assert.equal(r.d1_count,7);assert.equal(r.facebook_d1_exists,false);assert.equal(r.free_db_slots_under_documented_reference_limit,3);
  assert.equal(r.free_plan_attested,false);assert.equal(r.writes_executed,false);
  assert.deepEqual([...new Set(f.calls.map(c=>c.method))],['GET']);
  assert.ok(f.calls.every(c=>c.hasBearer));
});
test('Facebook presence from API is reported without creating another D1',async()=>{
  const f=harness({facebook:true});const r=await checkCloudflareReadOnly({token:'T',http:f.http});
  assert.equal(r.facebook_d1_exists,true);assert.equal(r.facebook_d1_jurisdiction,'eu');assert.ok(f.calls.every(c=>c.method==='GET'));
});
test('cannot read API without secret',async()=>{
  const f=harness();await assert.rejects(checkCloudflareReadOnly({token:'',http:f.http}),e=>e.code==='TOKEN_SECRET_MISSING');assert.equal(f.calls.length,0);
});
test('token inactive blocks without additional calls',async()=>{
  const f=harness({tokenStatus:'expired'});await assert.rejects(checkCloudflareReadOnly({token:'T',http:f.http}),e=>e.code==='TOKEN_NOT_ACTIVE');assert.equal(f.calls.length,1);
});
test('Workers permission missing blocks exact account verification',async()=>{
  const f=harness({workers:false});await assert.rejects(checkCloudflareReadOnly({token:'T',http:f.http}),e=>e.code==='HTTP_403');assert.equal(f.calls.filter(c=>c.method!=='GET').length,0);
});
test('rejects invalid API responses',async()=>{
  const f=harness({corrupt:true});await assert.rejects(checkCloudflareReadOnly({token:'T',http:f.http}),e=>e.code==='API_SUCCESS_FALSE');
});
test('paginates D1 while preventing live writes',async()=>{
  const f=harness({n:103});const r=await checkCloudflareReadOnly({token:'T',http:f.http});assert.equal(r.d1_count,103);assert.equal(r.free_db_slots_under_documented_reference_limit,0);
  assert.equal(f.calls.filter(c=>c.url.endsWith('/d1/database')).length,2);assert.ok(f.calls.every(c=>c.method==='GET'));
});