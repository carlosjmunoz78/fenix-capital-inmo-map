import test from 'node:test';
import assert from 'node:assert/strict';
import {obtainEphemeralToken,validateEphemeralSession,tokenClaims,E2E_EMAIL} from './e2e-ephemeral-token.mjs';
const uuid='123e4567-e89b-42d3-a456-426614174000',now=Math.floor(Date.now()/1000);
const marker={cerebro_e2e_readonly:true,provider:'email'};
function jwt(change={}){let claims={iss:'https://cluhljgonannaafpmblx.supabase.co/auth/v1',aud:'authenticated',sub:uuid,email:E2E_EMAIL,exp:now+3600,app_metadata:marker,...change};return ['a',Buffer.from(JSON.stringify(claims)).toString('base64url'),'b'].join('.')}
function response(change={}){return{access_token:jwt(),refresh_token:'rotates-and-must-never-be-stored',user:{id:uuid,email:E2E_EMAIL,email_confirmed_at:new Date().toISOString(),app_metadata:marker},...change}}
const env={CEREBRO_E2E_TEST_PASSWORD:'mock-secret-never-real',PROD_SUPABASE_PUBLISHABLE_KEY:'mock-publishable'};
test('one dedicated password secret; ephemeral JWT only in memory',async()=>{
 let called=0,request;
 const r=await obtainEphemeralToken(env,async (url,opts)=>{called++;request={url,opts};return{status:200,json:async()=>response()}});
 assert.equal(called,1);assert.equal(request.opts.method,'POST');assert.equal(request.opts.redirect,'error');
 assert.equal(JSON.parse(request.opts.body).email,E2E_EMAIL);
 assert.equal(tokenClaims(r.access_token).sub,uuid);
 assert.ok(!('refresh_token' in r));assert.ok(!('password' in r));
});
test('no password means no network call',async()=>{
 let calls=0;await assert.rejects(obtainEphemeralToken({...env,CEREBRO_E2E_TEST_PASSWORD:''},async()=>{calls++;}),/NOT_CONFIGURED/);assert.equal(calls,0);
});
test('unconfirmed technical email is not accepted',()=>assert.throws(()=>validateEphemeralSession(response({user:{id:uuid,email:E2E_EMAIL,app_metadata:marker}})),/EMAIL_NOT_CONFIRMED/));
test('email mismatch is denied',()=>assert.throws(()=>validateEphemeralSession(response({user:{id:uuid,email:'owner@example.com',email_confirmed_at:'2026-11-18T11:00:00Z',app_metadata:marker}})),/MISMATCH/));
test('metadata must be app_metadata, not editable user_metadata',()=>assert.throws(()=>validateEphemeralSession(response({user:{id:uuid,email:E2E_EMAIL,email_confirmed_at:'2026-11-18T11:00:00Z',app_metadata:{provider:'email'},user_metadata:marker}})),/MARKER/));
test('privileged technical account forbidden',()=>assert.throws(()=>validateEphemeralSession(response({user:{id:uuid,email:E2E_EMAIL,email_confirmed_at:'2026-11-18T11:00:00Z',app_metadata:{...marker,actor_code:'CARLOS-ADMIN'}}})),/PRIVILEGED/));
test('JWT without signed metadata marker is denied',()=>assert.throws(()=>validateEphemeralSession(response({access_token:jwt({app_metadata:{}})})),/TTL_INVALID/));
test('wrong issuer, identity or expiring tokens fail',()=>{
 for(const claims of [{iss:'https://evil.example'},{sub:'another-identity'},{exp:now+120},{is_anonymous:true}]){
  assert.throws(()=>validateEphemeralSession(response({access_token:jwt(claims)})),/TTL_INVALID/);
 }
});
test('login failure is sanitized and no token or password printed',async()=>await assert.rejects(obtainEphemeralToken(env,async()=>({status:401})),/LOGIN_REJECTED_HTTP_401/));
