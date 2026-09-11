import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {putOffloadedJson,getOffloadedJson,STOROFF_LOCAL_CONTRACT} from '../storage/storoff-local.mjs';

const ctx={company_id:'fenix-capital',engine_id:'OBSERV-001',environment:'PREPROD',version:'0.1.0'};

test('contract is zero-cost local and keeps Supabase/PROD/Trading untouched',()=>{
  assert.equal(STOROFF_LOCAL_CONTRACT.additional_cost_target_eur,0);
  assert.equal(STOROFF_LOCAL_CONTRACT.supabase_write,false);
  assert.equal(STOROFF_LOCAL_CONTRACT.prod_write,false);
  assert.equal(STOROFF_LOCAL_CONTRACT.trading_access,false);
});

test('writes atomically into tenant-scoped path and reads same payload',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'storoff-'));
  const w=putOffloadedJson({root,context:ctx,key:'event-001',value:{kind:'audit',ok:true}});
  assert.equal(w.status,'GREEN');
  assert.ok(w.path.includes('fenix-capital/OBSERV-001/PREPROD/0.1.0'));
  const r=getOffloadedJson({root,context:ctx,key:'event-001'});
  assert.equal(r.status,'GREEN');
  assert.deepEqual(r.data.value,{kind:'audit',ok:true});
  assert.equal(r.sha256,w.sha256);
});

test('rejects path traversal, PROD and Trading',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'storoff-'));
  assert.throws(()=>putOffloadedJson({root,context:ctx,key:'../escape',value:{}}),/key invalid/);
  assert.throws(()=>putOffloadedJson({root,context:{...ctx,environment:'PROD'},key:'x',value:{}}),/environment not allowed/);
  assert.throws(()=>putOffloadedJson({root,context:{...ctx,engine_id:'LAB-TRD'},key:'x',value:{}}),/Trading access forbidden/);
});
