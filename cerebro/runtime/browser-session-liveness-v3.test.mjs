import test from 'node:test';
import assert from 'node:assert/strict';
import {classifySessionReuseV3} from '../../supabase/functions/cerebro-browser-interactive-v3/session-liveness.mjs';

const NOW=Date.parse('2026-10-24T10:00:00.000Z');
const base={session_id:'s1',job_id:'j1',state:'CONNECTING',expires_at:'2026-10-24T10:15:00.000Z'};

test('reuses a live CONNECTING session while its job is still queued',()=>{
  assert.deepEqual(classifySessionReuseV3(base,{job_status:'QUEUED',now_ms:NOW}),{reusable:true,reason:'ACTIVE_SESSION'});
});

test('rejects an expired session even if its state still looks active',()=>{
  assert.deepEqual(classifySessionReuseV3({...base,expires_at:'2026-10-24T09:59:59.000Z'},{job_status:'QUEUED',now_ms:NOW}),{reusable:false,reason:'SESSION_EXPIRED'});
});

test('rejects CONNECTING when the backing job already succeeded',()=>{
  assert.deepEqual(classifySessionReuseV3(base,{job_status:'SUCCEEDED',now_ms:NOW}),{reusable:false,reason:'CONNECTING_JOB_TERMINAL'});
});

test('rejects CONNECTING for all terminal queue outcomes',()=>{
  for(const status of ['FAILED','CANCELLED','DEAD_LETTER']){
    assert.equal(classifySessionReuseV3(base,{job_status:status,now_ms:NOW}).reusable,false,status);
  }
});

test('keeps a non-expired controlled session reusable',()=>{
  assert.deepEqual(classifySessionReuseV3({...base,state:'CEREBRO_CONTROLLED'},{job_status:'SUCCEEDED',now_ms:NOW}),{reusable:true,reason:'ACTIVE_SESSION'});
});
