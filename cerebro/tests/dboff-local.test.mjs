import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {appendOffloadedRecord,queryOffloadedRecords,DBOFF_LOCAL_CONTRACT} from '../storage/dboff-local.mjs';

const ctx={company_id:'fenix-capital',engine_id:'AUD-001',environment:'PREPROD',version:'0.1.0'};

test('contract keeps Supabase/PROD/Trading untouched and costs zero',()=>{
  assert.equal(DBOFF_LOCAL_CONTRACT.additional_cost_target_eur,0);
  assert.equal(DBOFF_LOCAL_CONTRACT.supabase_write,false);
  assert.equal(DBOFF_LOCAL_CONTRACT.prod_write,false);
  assert.equal(DBOFF_LOCAL_CONTRACT.trading_access,false);
  assert.equal(DBOFF_LOCAL_CONTRACT.append_only,true);
});

test('append/query is tenant scoped and record_id idempotent',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'dboff-'));
  const a=appendOffloadedRecord({root,context:ctx,collection:'audit',record_id:'r1',type:'decision',payload:{ok:true},created_at:'2026-09-11T00:00:00Z'});
  assert.equal(a.status,'GREEN'); assert.equal(a.idempotent_replay,false);
  const b=appendOffloadedRecord({root,context:ctx,collection:'audit',record_id:'r1',type:'decision',payload:{ok:false}});
  assert.equal(b.idempotent_replay,true); assert.deepEqual(b.record.payload,{ok:true});
  appendOffloadedRecord({root,context:ctx,collection:'audit',record_id:'r2',type:'event',payload:{n:2}});
  const q=queryOffloadedRecords({root,context:ctx,collection:'audit',type:'decision'});
  assert.equal(q.count,1); assert.equal(q.records[0].record_id,'r1');
});

test('rejects traversal, PROD and Trading',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'dboff-'));
  assert.throws(()=>appendOffloadedRecord({root,context:ctx,collection:'../x',record_id:'r1',payload:{}}),/collection invalid/);
  assert.throws(()=>appendOffloadedRecord({root,context:{...ctx,environment:'PROD'},collection:'x',record_id:'r1',payload:{}}),/environment not allowed/);
  assert.throws(()=>appendOffloadedRecord({root,context:{...ctx,engine_id:'LAB-TRD'},collection:'x',record_id:'r1',payload:{}}),/Trading access forbidden/);
});
