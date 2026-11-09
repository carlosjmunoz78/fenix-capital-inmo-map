import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {ACCOUNT_ID,REPO,BRANCH,WORKFLOW_REF,OIDC_AUDIENCE,SCOPE,assertScope,assertClaims,verifyGitHubOidc,validateInventory,isCloudflareRateLimited} from '../logic.mjs';
const time=Math.floor(Date.now()/1000);
const baseClaims={iss:'https://token.actions.githubusercontent.com',aud:OIDC_AUDIENCE,repository:REPO,ref:BRANCH,workflow_ref:WORKFLOW_REF,event_name:'push',iat:time,exp:time+300};
const b64=x=>Buffer.from(x).toString('base64url');
test('proper source-verified OIDC claims accepted',()=>assert.equal(assertClaims(baseClaims,time).client_id,'cerebro-github-oidc'));
for(const key of ['iss','aud','repository','ref','workflow_ref','event_name'])test('OIDC rejects wrong '+key,()=>assert.throws(()=>assertClaims({...baseClaims,[key]:'forged'},time),/OIDC_SCOPE_DENIED/));
test('expired and far-future claims reject',()=>{assert.throws(()=>assertClaims({...baseClaims,exp:time-1},time),/OIDC_TIME_DENIED/);assert.throws(()=>assertClaims({...baseClaims,exp:time+10000},time),/OIDC_TIME_DENIED/);});
test('invalid raw unauthenticated requests rejected',async()=>await assert.rejects(()=>verifyGitHubOidc('not a JWT'),/OIDC_TOKEN_INVALID/));
test('valid signature and pinned issuer JWKS are needed',async()=>{
 const pair=await webcrypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk=await webcrypto.subtle.exportKey('jwk',pair.publicKey);jwk.kid='test-key-1';
 const h=b64(JSON.stringify({alg:'RS256',kid:'test-key-1'})),p=b64(JSON.stringify(baseClaims));
 const sig=await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(h+'.'+p));
 const tok=h+'.'+p+'.'+b64(Buffer.from(sig));
 const http=async url=>{assert.equal(url,'https://token.actions.githubusercontent.com/.well-known/jwks');return {status:200,json:async()=>({keys:[jwk]})};};
 assert.equal((await verifyGitHubOidc(tok,{http,now:time,cryptoImpl:webcrypto})).trusted,true);
 await assert.rejects(()=>verifyGitHubOidc(tok.slice(0,-4)+'bad!',{http,now:time,cryptoImpl:webcrypto}));
 const flipped=h+'.'+b64(JSON.stringify({...baseClaims,repository:'attacker/repo'}))+'.'+b64(Buffer.from(sig));
 await assert.rejects(()=>verifyGitHubOidc(flipped,{http,now:time,cryptoImpl:webcrypto}),/OIDC_SCOPE_DENIED/);
});
test('forbid payload injection and all prod targets',()=>{
 assert.equal(assertScope(SCOPE),true);
 assert.throws(()=>assertScope({...SCOPE,environment:'PROD'}),/SCOPE_DENIED/);
 assert.throws(()=>assertScope({...SCOPE,path:'/accounts'}),/SCOPE_FIELDS_DENIED/);
 assert.throws(()=>assertScope({...SCOPE,api_token:'foo'}),/SCOPE_FIELDS_DENIED/);
 assert.throws(()=>assertScope({...SCOPE,api_token:'x'.repeat(20)+'\n'},{pair:true}),/PAIR_CREDENTIAL_DENIED/);
});
test('inventory accepts only exact shape and safe numeric summary',()=>{
 const d={success:true,result:[{name:'a'}],result_info:{total_count:8}};
 const w={success:true,result:[{id:'worker'}]};
 assert.deepEqual(validateInventory(d,w),{account_id:ACCOUNT_ID,d1_count:8,workers_count:1,cloudflare_writes:0});
 assert.throws(()=>validateInventory({...d,success:false},w),/CF_UNTRUSTED_INVENTORY/);
 assert.throws(()=>validateInventory({...d,result_info:{total_count:'8'}},w),/CF_PAGINATION_UNTRUSTED/);
});
test('owner route remains LAB only',()=>assert.equal(SCOPE.environment,'LAB'));

test('rate limit is not silently accepted',()=>{assert.equal(isCloudflareRateLimited('CLOUDFLARE_READ_HTTP_429'),true);assert.equal(isCloudflareRateLimited('CLOUDFLARE_READ_HTTP_403'),false);});
