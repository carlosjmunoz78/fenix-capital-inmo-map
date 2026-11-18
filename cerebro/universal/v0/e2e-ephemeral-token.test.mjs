import test from 'node:test';
import assert from 'node:assert/strict';
import {obtainEphemeralToken,validateEphemeralSession,tokenClaims} from './e2e-ephemeral-token.mjs';
const uuid='123e4567-e89b-42d3-a456-426614174000',email='e2e@example.invalid',now=Math.floor(Date.now()/1000);
function jwt(change={}){const claims={iss:'https://cluhljgonannaafpmblx.supabase.co/auth/v1',aud:'authenticated',sub:uuid,exp:now+3600,...change};return ['a',Buffer.from(JSON.stringify(claims)).toString('base64url'),'b'].join('.')}
function response(change={}){return{access_token:jwt(),refresh_token:'never-persist-this-on-disk',user:{id:uuid,email,app_metadata:{cerebro_e2e_readonly:true}},...change}}
const env={CEREBRO_E2E_TEST_EMAIL:email,CEREBRO_E2E_TEST_PASSWORD:'demo-only',CEREBRO_E2E_TEST_USER_ID:uuid,PROD_SUPABASE_PUBLISHABLE_KEY:'publishable-demo'};
test('new ephemeral credentials create JWT only in memory',async()=>{
 let url,options;
 const r=await obtainEphemeralToken(env,async (u,o)=>{url=u;options=o;return{status:200,json:async()=>response()}});
 assert.match(url,/auth\/v1\/token\?grant_type=password/);
 assert.equal(options.method,'POST');assert.equal(options.redirect,'error');
 assert.equal(JSON.parse(options.body).email,email);
 assert.ok(r.access_token);assert.ok(!('refresh_token' in r));assert.ok(!('password' in r));assert.equal(tokenClaims(r.access_token).sub,uuid);
});
test('no credential means no network call',async()=>{
 let calls=0;await assert.rejects(obtainEphemeralToken({...env,CEREBRO_E2E_TEST_PASSWORD:''},async()=>{calls++;}),/NOT_CONFIGURED/);assert.equal(calls,0);
});
test('deny identity substitution',()=>assert.throws(()=>validateEphemeralSession(response({user:{id:uuid,email:'other@example.invalid',app_metadata:{cerebro_e2e_readonly:true}}}),env),/MISMATCH/));
test('deny unmarked and privileged identities',()=>assert.throws(()=>validateEphemeralSession(response({user:{id:uuid,email,app_metadata:{role:'admin'}}}),env),/READONLY/));
test('deny access tokens with wrong issuer',()=>assert.throws(()=>validateEphemeralSession(response({access_token:jwt({iss:'https://evil.test'})}),env),/TTL_INVALID/));
test('deny expiring tokens',()=>assert.throws(()=>validateEphemeralSession(response({access_token:jwt({exp:now+20})}),env),/TTL_INVALID/));
test('failed login is a hard failure with no password disclosure',async()=>{
 await assert.rejects(obtainEphemeralToken(env,async()=>({status:400})),/LOGIN_REJECTED_HTTP_400/);
});
