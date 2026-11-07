import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SqliteMissionStore} from './jarvis-sqlite-store.mjs';
import {JarvisUniversalCore} from './jarvis-universal-core.mjs';
import {createJarvisGatewayHandler} from './jarvis-gateway-handler.mjs';
import {createJarvisB2SessionRevocationGate} from './jarvis-b2-session-revocation-gate.mjs';
import {createJarvisB2B3GatewayReadGate} from './jarvis-b2-b3-gateway-read-gate.mjs';
import {createJarvisB3DecisionService} from './jarvis-b3-decision-service.mjs';
const owner='zeus-owner:synthetic';
const key=Buffer.alloc(32,11);
const expires=Date.parse('2026-11-06T22:00:00Z');
const clock=()=>expires-60_000;
const sessionHash=s=>createHmac('sha256',key).update('jarvis-b2-session-v0\0')
 .update(owner).update('\0').update(s).digest('hex');
const req=t=>new Request('https://jarvis.lab.invalid/v1/missions/mission-cut18',{
 headers:{authorization:`Bearer ${t}`},method:'GET'});
const makeMission=()=>({id:'mission-cut18',ownerId:owner,companyId:'fenix',
 environment:'LAB',engineId:'JARVIS-CORE-001',projectId:'PRJ',intent:'STATUS',
 status:'RECEIVED',idempotencyKey:'key-cut18',createdAt:'2026-11-05T00:00:00Z',
 updatedAt:'2026-11-05T00:00:00Z',events:[],channel:'desktop',request:{}});
function wiring(store,revoke){
 const source={verify:async token=>{
  const t=typeof token==='string'?token:token?.accessToken;
  if(!['synthetic-a','synthetic-b'].includes(t))throw Error('AUTH_DENIED');
  return {ownerId:owner,sessionId:`session-${t}`,roles:['OWNER_ROOT'],authorizedCompanies:['fenix','aion']};
 }};
 const sessionStore={get:async({ownerId,sessionHmac,environment})=>{
  if(ownerId!==owner||environment!=='LAB')return null;
  for(const t of ['synthetic-a','synthetic-b']){
   const sid=`session-${t}`;
   if(sessionHmac===sessionHash(sid))return {ownerId:owner,sessionHmac,environment:'LAB',
    active:true,revoked:revoke.has(t),role:'OWNER_ROOT',expiresAt:expires,
    authorizedCompanies:['fenix']};
  }
  return null;
 }};
 const verified=createJarvisB2SessionRevocationGate({identityProvider:source,
  sessionStore,secret:key,clock,enabled:true});
 const core=new JarvisUniversalCore({identityProvider:verified,store,environment:'LAB'});
 const handler=createJarvisGatewayHandler({core,trustedAuthChannel:'fenix-app'});
 const b3=createJarvisB3DecisionService({
  identityProvider:{verify:async token=>verified.verify({channel:'fenix-app',accessToken:token})},
  controlStore:{get:async()=>({enabled:true,killSwitch:false})},
  grantStore:{find:async()=>({grantId:'synthetic-grant',ownerId:owner,companyId:'fenix',
   environment:'LAB',actions:['MISSION_INSPECT'],active:true,revoked:false,
   // B3 uses the real clock; do not expire the synthetic grant on a past date.
   // B2 device/session uses its separate fixed clock to test exact revocation.
   expiresAt:Date.now()+60_000,maxCost:0,allowMutations:false})},
  actionCatalog:{get:async()=>({name:'MISSION_INSPECT',mutating:false,estimatedCost:0})},
  auditStore:{append:async()=>true}
 });
 return createJarvisB2B3GatewayReadGate({handler,identityProvider:verified,
  b3DecisionService:b3,missionStore:store,rateLimiter:async()=>true,
  enabled:true,environment:'LAB',trustedChannel:'fenix-app'});
}
test('CUT18 two simulated sessions read same durable mission after store reopen; revoke isolates second',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'jarvis-cut18-'));
 const path=join(dir,'lab.db');
 try{
  const writer=new SqliteMissionStore(path);await writer.put(makeMission());writer.close();
  const store=new SqliteMissionStore(path);
  const revoked=new Set();const gate=wiring(store,revoked);
  const a=await gate(req('synthetic-a'));assert.equal(a.status,200);
  const b=await gate(req('synthetic-b'));assert.equal(b.status,200);
  assert.equal((await b.json()).mission.id,'mission-cut18');
  revoked.add('synthetic-b');
  const denied=await gate(req('synthetic-b'));assert.notEqual(denied.status,200);
  const remains=await gate(req('synthetic-a'));assert.equal(remains.status,200);
  store.close();
  const opened=new SqliteMissionStore(path);
  assert.equal((await opened.get('mission-cut18')).id,'mission-cut18');opened.close();
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('CUT18 namespaced OWNER_ROOT idempotency lookup works with existing SQLite adapter',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'jarvis-cut18-idem-'));const path=join(dir,'lab.db');
 try{const db=new SqliteMissionStore(path);await db.put(makeMission());
  const same=await db.findByIdempotency(`${owner}:fenix`,'key-cut18');
  assert.equal(same.id,'mission-cut18');db.close();
 }finally{rmSync(dir,{recursive:true,force:true})}
});
