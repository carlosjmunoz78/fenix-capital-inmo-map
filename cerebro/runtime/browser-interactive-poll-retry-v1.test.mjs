import test from 'node:test';
import assert from 'node:assert/strict';
import {interactivePollRetryDelayMs,isTransientInteractivePollError,pollInteractiveWithRetry} from './browser-interactive-poll-retry-v1.mjs';

test('504 and gateway/network failures are transient but auth failures are not',()=>{
  assert.equal(isTransientInteractivePollError(new Error('BROWSER_V3_WORKER_POLL_FAILED:504:UNKNOWN')),true);
  assert.equal(isTransientInteractivePollError(new Error('BROWSER_V3_WORKER_POLL_FAILED:503:UPSTREAM_UNAVAILABLE')),true);
  assert.equal(isTransientInteractivePollError(new Error('fetch failed')),true);
  assert.equal(isTransientInteractivePollError(new Error('BROWSER_V3_WORKER_POLL_FAILED:403:GITHUB_OIDC_INVALID')),false);
  assert.equal(isTransientInteractivePollError(new Error('BROWSER_V3_WORKER_POLL_FAILED:401:UNAUTHORIZED')),false);
});

test('retry preserves the same poll operation and succeeds after a transient 504',async()=>{
  let calls=0;
  const sleeps=[];
  const result=await pollInteractiveWithRetry({
    poll:async()=>{
      calls+=1;
      if(calls===1)throw new Error('BROWSER_V3_WORKER_POLL_FAILED:504:UNKNOWN');
      return{ok:true,state:'CEREBRO_CONTROLLED'};
    },
    sleep:async ms=>{sleeps.push(ms);},
    max_attempts:4,
    base_delay_ms:300
  });
  assert.equal(calls,2);
  assert.deepEqual(sleeps,[300]);
  assert.equal(result.ok,true);
});

test('non-transient auth failure is not retried',async()=>{
  let calls=0;
  await assert.rejects(()=>pollInteractiveWithRetry({
    poll:async()=>{calls+=1;throw new Error('BROWSER_V3_WORKER_POLL_FAILED:403:GITHUB_OIDC_INVALID');},
    sleep:async()=>{},
    max_attempts:4
  }),/GITHUB_OIDC_INVALID/);
  assert.equal(calls,1);
});

test('backoff is bounded',()=>{
  assert.equal(interactivePollRetryDelayMs(1,{base_delay_ms:300,max_delay_ms:3000}),300);
  assert.equal(interactivePollRetryDelayMs(2,{base_delay_ms:300,max_delay_ms:3000}),600);
  assert.equal(interactivePollRetryDelayMs(9,{base_delay_ms:300,max_delay_ms:3000}),3000);
});
