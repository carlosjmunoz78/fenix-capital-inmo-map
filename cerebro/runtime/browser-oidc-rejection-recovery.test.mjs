import test from 'node:test';
import assert from 'node:assert/strict';
import {callApi} from './browser-interactive-session-v3.mjs';

const reply=(status,error)=>({ok:status===200,status,json:async()=>status===200?{ok:true}:{ok:false,error}});
test('a transient OIDC rejection revalidates before executing the route',async()=>{
  let calls=0,credentials=0;
  const result=await callApi('https://worker.test','worker/poll',async()=>{credentials++;return 'synthetic';},{},async()=>++calls===1?reply(403,'GITHUB_OIDC_INVALID'):reply(200));
  assert.equal(result.ok,true);assert.equal(calls,2);assert.equal(credentials,2);
});
test('persistent invalid credentials remain denied after three attempts',async()=>{
  let calls=0;
  await assert.rejects(callApi('https://worker.test','worker/poll',async()=>'synthetic',{},async()=>{calls++;return reply(403,'GITHUB_OIDC_INVALID');}),/403:GITHUB_OIDC_INVALID/);
  assert.equal(calls,3);
});
test('policy denials and ambiguous transport errors never replay actions',async()=>{
  for(const error of ['GITHUB_REF_DENIED','GITHUB_REPOSITORY_DENIED','GITHUB_WORKFLOW_DENIED']){
    let calls=0;
    await assert.rejects(callApi('https://worker.test','worker/complete',async()=>'synthetic',{},async()=>{calls++;return reply(403,error);}),new RegExp(error));
    assert.equal(calls,1);
  }
  let calls=0;
  await assert.rejects(callApi('https://worker.test','worker/complete',async()=>'synthetic',{},async()=>{calls++;throw new Error('network');}),/network/);
  assert.equal(calls,1);
});
