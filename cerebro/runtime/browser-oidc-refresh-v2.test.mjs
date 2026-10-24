import test from 'node:test';
import assert from 'node:assert/strict';
import {createOidcTokenProviderV2,oidcTokenExpiryMs} from './browser-job-runner-v2.mjs';

function jwt(exp,jti='t'){
  const enc=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${enc({alg:'none',typ:'JWT'})}.${enc({exp,jti})}.sig`;
}

test('reads OIDC expiry without logging or validating secret material',()=>{
  assert.equal(oidcTokenExpiryMs(jwt(12345)),12345_000);
  assert.equal(oidcTokenExpiryMs('invalid'),0);
});

test('refreshes GitHub OIDC before expiry during a long browser session',async()=>{
  let nowMs=1_800_000_000_000;
  let calls=0;
  const fetch_impl=async()=>{
    calls+=1;
    const token=jwt(Math.floor((nowMs+300_000)/1000),`token-${calls}`);
    return {ok:true,status:200,json:async()=>({value:token})};
  };
  const provider=createOidcTokenProviderV2({
    fetch_impl,
    now:()=>nowMs,
    refresh_skew_ms:60_000,
    oidc_options:{request_url:'https://oidc.test/token',request_token:'request-token',audience:'cerebro-browser-worker-v1'}
  });
  const first=await provider();
  assert.equal(calls,1);
  nowMs+=120_000;
  assert.equal(await provider(),first);
  assert.equal(calls,1);
  nowMs+=130_000;
  const second=await provider();
  assert.equal(calls,2);
  assert.notEqual(second,first);
});

test('uses a still-valid cached token if proactive refresh transiently fails',async()=>{
  let nowMs=1_800_000_000_000;
  let calls=0;
  let fail=false;
  const fetch_impl=async()=>{
    calls+=1;
    if(fail)throw new Error('TRANSIENT_OIDC_FAILURE');
    return {ok:true,status:200,json:async()=>({value:jwt(Math.floor((nowMs+300_000)/1000),'cached')})};
  };
  const provider=createOidcTokenProviderV2({
    fetch_impl,
    now:()=>nowMs,
    refresh_skew_ms:60_000,
    oidc_options:{request_url:'https://oidc.test/token',request_token:'request-token'}
  });
  const cached=await provider();
  fail=true;
  nowMs+=250_000;
  assert.equal(await provider(),cached);
  assert.equal(calls,2);
  nowMs+=46_000;
  await assert.rejects(provider,/TRANSIENT_OIDC_FAILURE/);
});

test('explicit static test token remains backward compatible and never requests OIDC',async()=>{
  let calls=0;
  const provider=createOidcTokenProviderV2({static_token:'static-test-token',fetch_impl:async()=>{calls+=1;throw new Error('SHOULD_NOT_FETCH');}});
  assert.equal(await provider(),'static-test-token');
  assert.equal(calls,0);
});
