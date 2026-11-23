import { test } from 'node:test';
import assert from 'node:assert/strict';
import {createGithubOidcJwksLoader} from './github-oidc-jwks.mjs';

const issuer = 'https://token.actions.githubusercontent.com';
const A = {kty:'RSA',use:'sig',alg:'RS256',kid:'first',n:'a'.repeat(200),e:'AQAB'};
const B = {...A,kid:'second'};
const makeFetcher = ({keys=[A], issuerOverride=issuer, jwksOverride=issuer+'/.well-known/jwks', error=false, malformed=false, huge=false}={}) => {
  const calls = [];
  const fetcher = async (url,options) => {
    calls.push({url,options});
    if (error) throw Error('offline');
    if (huge) return new Response('x'.repeat(65537));
    return Response.json(url.includes('openid-configuration')
      ? {issuer:issuerOverride,jwks_uri:jwksOverride}
      : malformed ? {keys:[A,A]} : {keys});
  };
  return {fetcher,calls};
};

test('verified discovery, keys, no redirects, no credentials and cache reuse',async()=>{
  const x=makeFetcher();const load=createGithubOidcJwksLoader({fetcher:x.fetcher});
  assert.deepEqual((await load('first')).keys,[A]);
  assert.deepEqual((await load('first')).keys,[A]);
  assert.equal(x.calls.length,2);
  assert(x.calls.every(c=>c.options.redirect==='manual' && !('Authorization' in c.options.headers)));
});
test('refresh after TTL and accept only newly retrieved key',async()=>{
  let now=0, current=[A]; let calls=0;
  const loader=createGithubOidcJwksLoader({now:()=>now,cacheTtlMs:1000,refreshThrottleMs:0,fetcher:async url=>{
    calls++;return Response.json(url.includes('openid-configuration') ? {issuer,jwks_uri:issuer+'/.well-known/jwks'}:{keys:current});
  }});
  await loader('first'); assert.equal(calls,2);now=1001;current=[B];
  assert.deepEqual((await loader('second')).keys,[B]);assert.equal(calls,4);
});
test('unknown kid forces rate-limited refresh and never accepts mismatched kid',async()=>{
  let t=0;const x=makeFetcher();const loader=createGithubOidcJwksLoader({fetcher:x.fetcher,now:()=>t});
  await loader('first');let result=await loader('nonexistent');
  assert(!result.keys.some(k=>k.kid==='nonexistent'));assert.equal(x.calls.length,2);
  t=10001;await loader('nonexistent');assert.equal(x.calls.length,4);
});
test('fail closed on network failure without caching unauthenticated keys',async()=>{
  const x=makeFetcher({error:true});const load=createGithubOidcJwksLoader({fetcher:x.fetcher});
  await assert.rejects(load('first'),/KEYS_FETCH/);await assert.rejects(load('first'),/KEYS_FETCH/);
});
test('reject changed issuer and non-pinned JWKS location',async()=>{
  for(const spec of [{issuerOverride:'https://evil.example'},{jwksOverride:'https://evil.example/jwks'}]){
    const x=makeFetcher(spec);
    await assert.rejects(createGithubOidcJwksLoader({fetcher:x.fetcher})('first'),/JWKS_DISCOVERY/);
    assert.equal(x.calls.length,1);
  }
});
test('reject duplicate signature keys and malformed responses',async()=>{
  const x=makeFetcher({malformed:true});
  await assert.rejects(createGithubOidcJwksLoader({fetcher:x.fetcher})('first'),/JWKS_FORMAT/);
});
test('reject excessively large payloads',async()=>{
  const x=makeFetcher({huge:true});
  await assert.rejects(createGithubOidcJwksLoader({fetcher:x.fetcher})('first'),/KEYS_FETCH|JWKS_SIZE/);
});
test('deduplicate simultaneous discovery',async()=>{
  const x=makeFetcher();const load=createGithubOidcJwksLoader({fetcher:x.fetcher});
  await Promise.all([load('first'),load('first'),load('first')]);assert.equal(x.calls.length,2);
});
test('reject missing kid and unsafe cache settings',async()=>{
  const x=makeFetcher();const load=createGithubOidcJwksLoader({fetcher:x.fetcher});
  await assert.rejects(load('bad.kid'),/KEY/);
  assert.throws(()=>createGithubOidcJwksLoader({cacheTtlMs:600000}),/CACHE_CONFIG/);
});

test('Cloudflare Workers manual redirects are required and rejected',async()=>{
  const original=makeFetcher();
  const loader=createGithubOidcJwksLoader({fetcher:async (url,options)=>{
    assert.equal(options.redirect,'manual');
    if(url.endsWith('openid-configuration')) return Response.redirect('https://bad.invalid/',302);
    return original.fetcher(url,options);
  }});
  await assert.rejects(loader('first'),/KEYS_FETCH/);
});
