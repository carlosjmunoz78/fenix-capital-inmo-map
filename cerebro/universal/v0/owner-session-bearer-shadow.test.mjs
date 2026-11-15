import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,verify} from 'node:crypto';
import {createOwnerBearerSessionGateShadow,OWNER_BEARER_SESSION_GATE_SHADOW} from './owner-session-bearer-shadow.mjs';

// Ephemeral test-only Ed25519 key, generated at test runtime; NEVER a PROD signing key.
const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const ISSUER='https://cluhljgonannaafpmblx.supabase.co/auth/v1';
const USER='11111111-1111-4111-a111-111111111111';
const SID='22222222-2222-4222-a222-222222222222';
const NOW=Date.parse('2026-11-16T12:00:00Z');
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const claims=()=>({iss:ISSUER,sub:USER,session_id:SID,aud:'authenticated',role:'authenticated',
 exp:Math.floor(NOW/1000)+3600,iat:Math.floor(NOW/1000)-300});
const signed=payload=>{const data=b64({alg:'EdDSA',typ:'JWT'})+'.'+b64(payload);return data+'.'+sign(null,Buffer.from(data),privateKey).toString('base64url')};
const request=(token,extra={})=>({authorization:'Bearer '+token,environment:'LAB',company_id:'fenix',nowMs:NOW,...extra});
const realVerifier=async(token,expectedIssuer)=>{
 const parts=token.split('.');
 if(parts.length!==3)throw Error('malformed JWT');
 const [h,p,s]=parts;
 if(!verify(null,Buffer.from(h+'.'+p),publicKey,Buffer.from(s,'base64url')))throw Error('bad signature');
 const payload=JSON.parse(Buffer.from(p,'base64url').toString('utf8'));
 if(payload.iss!==expectedIssuer)throw Error('wrong issuer');
 return {user:{id:payload.sub},claims:payload};
};
function fixture(overrides={}){
 const calls={verified:0,actor:0,session:0};
 const verifyIssuerJwt=overrides.verifyIssuerJwt||async(t,iss)=>{calls.verified++;return realVerifier(t,iss)};
 const resolveOwnerByVerifiedUser=overrides.resolveOwnerByVerifiedUser||async id=>{
  calls.actor++;assert.equal(id,USER);return {actor_code:'CARLOS-ADMIN',active:true};
 };
 const readActiveSession=overrides.readActiveSession||async query=>{
  calls.session++;assert.deepEqual(query,{sessionId:SID,userId:USER});
  return {id:SID,user_id:USER,not_after:null};
 };
 return {gate:createOwnerBearerSessionGateShadow({verifyIssuerJwt,resolveOwnerByVerifiedUser,readActiveSession}),calls};
}
test('shadow signed synthetic JWT, actor and live session produce read-only allow',async()=>{
 const {gate,calls}=fixture();
 const r=await gate(request(signed(claims())));
 assert.deepEqual(r,{status:'ALLOW',reason:'ACTIVE_SESSION_CONFIRMED_BY_SERVER',
  authorized:true,read_only:true,executed:false});
 assert.deepEqual(calls,{verified:1,actor:1,session:1});
});
test('scope and malformed Authorization fail before any signer/actor/session call',async()=>{
 const {gate,calls}=fixture();
 const good=signed(claims());
 for(const input of [
  request(good,{company_id:'other'}),
  request(good,{environment:'PROD'}),
  request(good,{company_id:'FENIX'}),
  {...request(good),authorization:'token '+good},
  {...request(good),authorization:'Bearer '+good+'\\n'},
  {...request(good),authorization:'Bearer '+good.slice(0,15)+' '+good.slice(15)},
  {...request(good),authorization:null}
 ]){
  const r=await gate(input);assert.equal(r.authorized,false);
  assert.equal(r.executed,false);
 }
 assert.deepEqual(calls,{verified:0,actor:0,session:0});
});
test('tampered JWT payload (without matching private signature) is rejected before owner/session',async()=>{
 const good=signed(claims());
 const [header,,signature]=good.split('.');
 const forged=header+'.'+b64({...claims(),sub:'33333333-3333-4333-a333-333333333333'})+'.'+signature;
 const {gate,calls}=fixture();
 const r=await gate(request(forged));
 assert.equal(r.reason,'SIGNATURE_OR_IDENTITY_UNVERIFIED');
 assert.equal(calls.actor,0);assert.equal(calls.session,0);
});
test('wrong issuer, audience or role signed with test key fails closed',async()=>{
 for(const altered of [
  {...claims(),iss:'https://other.supabase.co/auth/v1'},
  {...claims(),aud:'anon'},
  {...claims(),role:'service_role'},
  {...claims(),sub:'invalid'},
  {...claims(),exp:Math.floor(NOW/1000)-10},
 ]){
  const {gate,calls}=fixture();
  const r=await gate(request(signed(altered)));
  assert.equal(r.authorized,false);
  assert.equal(calls.session,0);
 }
});
test('valid signed JWT with missing/revoked or mismatched session is denied',async()=>{
 for(const readActiveSession of [
  async()=>null,
  async()=>({id:SID,user_id:'33333333-3333-4333-a333-333333333333'}),
  async()=>({id:'33333333-3333-4333-a333-333333333333',user_id:USER}),
  async()=>({id:SID,user_id:USER,not_after:'2026-11-16T11:00:00Z'}),
  async()=>{throw Error('sensitive details must not leak')}
 ]){
  const {gate}=fixture({readActiveSession});
  const r=await gate(request(signed(claims())));
  assert.equal(r.authorized,false);
  assert.equal(r.executed,false);
  assert.ok(!JSON.stringify(r).includes('sensitive details'));
 }
});
test('owner denied, unresolved or wrong actor never calls session reader',async()=>{
 for(const actorFn of [
  async()=>({actor_code:'OTHER',active:true}),
  async()=>({actor_code:'CARLOS-ADMIN',active:false}),
  async()=>{throw Error('backend failure')}
 ]){
  const {gate,calls}=fixture({resolveOwnerByVerifiedUser:actorFn});
  const r=await gate(request(signed(claims())));
  assert.equal(r.authorized,false);assert.equal(calls.session,0);
 }
});
test('caller-supplied forged identity, verifiedClaims, issuer, reader cannot override server dependencies',async()=>{
 const {gate,calls}=fixture();
 const r=await gate({...request(signed(claims())),
  identity:{actor_code:'OTHER'},verifiedClaims:{sub:'BAD'},
  issuer:'https://evil.example',readActiveSession:async()=>null});
 assert.equal(r.status,'ALLOW');assert.deepEqual(calls,{verified:1,actor:1,session:1});
 assert.equal(OWNER_BEARER_SESSION_GATE_SHADOW.ready_for_http_integration,false);
 assert.equal(OWNER_BEARER_SESSION_GATE_SHADOW.ready_for_prod,false);
});
test('missing privileged dependencies prevents guard creation',()=>{
 assert.throws(()=>createOwnerBearerSessionGateShadow({}),/TRUSTED_SERVER_DEPENDENCIES_REQUIRED/);
});
