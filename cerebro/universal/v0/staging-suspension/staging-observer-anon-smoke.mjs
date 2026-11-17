// Non-privileged negative proof against fixed LAB observer endpoint.
// Does NOT call staging, does not use any credentials, and never modifies data.
import test from 'node:test';
import assert from 'node:assert/strict';

test('owner-only suspension observer rejects anonymous read and durable capture',async()=>{
 const url='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-universal-staging-observe-lab-v0';
 for(const method of ['GET','POST']){
  const res=await fetch(url,{
   method,redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(11000),
   headers:method==='POST'?{'content-type':'application/json'}:{accept:'application/json'},
   ...(method==='POST'?{body:JSON.stringify({action:'CAPTURE_SUSPENSION_EVIDENCE',
     company_id:'fenix',environment:'LAB',idempotency_key:'lab-observe-anonymous-negative'})}:{})
  });
  assert.equal(res.status,401,`${method}: expected deny HTTP 401`);
  const body=await res.json();
  assert.equal(body.status,'CLOSED');assert.equal(body.external_actions_executed,false);
 }
});
