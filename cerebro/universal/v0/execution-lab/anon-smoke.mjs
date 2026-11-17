import test from 'node:test';
import assert from 'node:assert/strict';
// No API credentials, no owner JWT, no staging IO, no production mutation.
const URL='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-operativa-command-executor-lab-v0';
test('new shared FACT executor denies anonymous read and execution',async()=>{
 for(const method of ['GET','POST']){
  const response=await fetch(URL,{method,redirect:'manual',cache:'no-store',
   signal:AbortSignal.timeout(11000),headers:method==='POST'?{'content-type':'application/json'}:{accept:'application/json'},
   ...(method==='POST'?{body:JSON.stringify({action:'FACT001_REGISTRY_ATTEST',
    company_id:'fenix',environment:'LAB',engine_id:'FACT-001',capability_id:'fact.registry.attest',
    version:'0.1.0-lab',idempotency_key:'lab-fact-attest-anon-negative-20261114',
    registry_count:179,base_count:177,preserved_base:true,registry_digest:'a'.repeat(64)})}:{})
  });
  assert.equal(response.status,401,`${method} must reject missing owner JWT`);
  const body=await response.json();
  assert.equal(body.status,'CLOSED');
  assert.equal(body.executed,false);
  assert.equal(body.prod_execution_enabled,false);
 }
});
