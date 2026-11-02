import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Actgw001DurableGuardV1, ACTGW001_DURABLE_GUARD_V1_CONTRACT } from '../gateway/actgw001-durable-guard-v1.mjs';
import { PersistentEventBus } from '../runtime/persistent-runtime.mjs';

const context={company_id:'fenix',engine_id:'ACTGW-001',environment:'PREPROD',version:'1.0.0'};
const temp=()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'actgw001-'));return {dir,file:path.join(dir,'actions.v8journal')}};

test('persists prepare/commit and replays committed result after restart without re-executing',async()=>{
  const t=temp(); let calls=0;
  let g=new Actgw001DurableGuardV1({journal_file:t.file});
  g.registerCapability('echo.safe',async({payload})=>({ok:true,value:payload.value,calls:++calls}));
  const input={context,authorized:true,capability:'echo.safe',payload:{value:7},idempotency_key:'a1',risk:'LOW'};
  const first=await g.execute(input);
  assert.equal(first.status,'ACTION_EXECUTED');assert.equal(calls,1);assert.equal(g.ledgerEvents('fenix').length,2);
  g=new Actgw001DurableGuardV1({journal_file:t.file});
  g.registerCapability('echo.safe',async()=>({calls:++calls}));
  const second=await g.execute(input);
  assert.deepEqual(second,first);assert.equal(calls,1);
  fs.rmSync(t.dir,{recursive:true,force:true});
});

test('prepared without commit after restart fails closed and never repeats execution',async()=>{
  const t=temp();
  const bus=new PersistentEventBus({file_path:t.file});
  const fingerprint='{"capability":"echo.safe","company_id":"fenix","payload":{},"version":"1.0.0"}';
  bus.publish({type:'ACTGW_ACTION_PREPARED',context,idempotency_key:'actgw:amb:prepared',payload:{action_idempotency_key:'amb',capability:'echo.safe',fingerprint}});
  let calls=0;const g=new Actgw001DurableGuardV1({journal_file:t.file});g.registerCapability('echo.safe',async()=>({calls:++calls}));
  const r=await g.execute({context,authorized:true,capability:'echo.safe',payload:{},idempotency_key:'amb',risk:'LOW'});
  assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'HIGH_RISK');assert.equal(r.executed,false);assert.equal(calls,0);
  fs.rmSync(t.dir,{recursive:true,force:true});
});

test('keeps existing gateway safety boundaries and zero-cost contract',async()=>{
  const t=temp();const g=new Actgw001DurableGuardV1({journal_file:t.file});g.registerCapability('safe',async()=>({ok:true}));
  const prod=await g.execute({context,authorized:true,capability:'safe',payload:{},idempotency_key:'p1',requires_prod_write:true});
  assert.equal(prod.reason,'HIGH_RISK');
  const trading=await g.execute({context,authorized:true,capability:'safe',payload:{},idempotency_key:'t1',trading_access:true});
  assert.equal(trading.reason,'POLICY_CONFLICT');
  assert.equal(ACTGW001_DURABLE_GUARD_V1_CONTRACT.additional_cost_eur,0);assert.equal(ACTGW001_DURABLE_GUARD_V1_CONTRACT.prod_write_authorized,false);assert.equal(ACTGW001_DURABLE_GUARD_V1_CONTRACT.trading_access,false);
  fs.rmSync(t.dir,{recursive:true,force:true});
});
