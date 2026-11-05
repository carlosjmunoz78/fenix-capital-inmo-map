/** Executable real SQLite persistence + HTTP Request contract, with STUB authentication. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ZeusBindingRegistry} from './jarvis-zeus-binding-registry.mjs';
import {ZeusGlobalIdentityProvider} from './jarvis-global-identity.mjs';
import {JarvisUniversalCore} from './jarvis-universal-core.mjs';
import {SqliteMissionStore} from './jarvis-sqlite-store.mjs';
import {createJarvisGatewayHandler} from './jarvis-gateway-handler.mjs';
const key='test-key-not-a-live-secret-aaaaaaaaaaaaaaaaaa';
const request=(method,url,token,body)=>new Request(url,{method,headers:{authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
test('two independently authenticated simulated channels share an actual restarted SQLite mission store',async()=>{
  const folder=mkdtempSync(join(tmpdir(),'zeus-b2-e2e-'));const dbpath=join(folder,'state.db');
  let store;try{
    const init=new ZeusBindingRegistry({serviceClient:{from:()=>({select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})})})},subjectHmacKey:key});
    const records=new Map([['fenix','fenix-sub'],['mobile','mobile-sub']].map(([channel,subject])=>[`${channel}:${init.digest(channel,subject)}`,{owner_id:'ZEUS_OWNER_CANONICAL_001',role:'OWNER_ROOT',active:true,authorized_companies:['fenix']} ]));
    const serviceClient={from:()=>({select:()=>{let channel,digest;const q={eq(k,v){if(k==='channel')channel=v; if(k==='subject_hmac')digest=v;return q},async maybeSingle(){return {data:records.get(`${channel}:${digest}`)||null,error:null}}};return q}})};
    const registry=new ZeusBindingRegistry({serviceClient,subjectHmacKey:key});
    const channels=new Map([['fenix',{verify:async token=>token==='fenix-signed-session'?{subject:'fenix-sub',sessionId:'fenix-session',authorizedCompanies:['fenix']}:null}],['mobile',{verify:async token=>token==='mobile-signed-session'?{subject:'mobile-sub',sessionId:'mobile-session',authorizedCompanies:['fenix']}:null}]]);
    const identity=new ZeusGlobalIdentityProvider({channels,registry});
    store=new SqliteMissionStore(dbpath);
    const fenixCore=new JarvisUniversalCore({identityProvider:identity,store,ids:()=> 'mission-cross-device-001'});
    const fenixHandler=createJarvisGatewayHandler({core:fenixCore,trustedAuthChannel:'fenix'});
    const missionInput={company_id:'fenix',project_id:'PRJ-SUPERAGENT-001',intent:'UNKNOWN',idempotency_key:'e2e-001',channel:'desktop',payload:{topic:'continuity'}};
    const created=await fenixHandler(request('POST','https://test.local/v1/missions','fenix-signed-session',missionInput));
    assert.equal(created.status,201);const json=await created.json();assert.equal(json.mission.ownerId,'ZEUS_OWNER_CANONICAL_001');
    store.close();store=new SqliteMissionStore(dbpath); // physical reopen, new core, separate channel
    const mobileCore=new JarvisUniversalCore({identityProvider:identity,store});
    const mobileHandler=createJarvisGatewayHandler({core:mobileCore,trustedAuthChannel:'mobile'});
    const retrieved=await mobileHandler(request('GET','https://test.local/v1/missions/mission-cross-device-001','mobile-signed-session'));
    assert.equal(retrieved.status,200);assert.equal((await retrieved.json()).mission.companyId,'fenix');
    const replay=await mobileHandler(request('POST','https://test.local/v1/missions','mobile-signed-session',{...missionInput,channel:'mobile'}));assert.equal(replay.status,200);
    const forged=await mobileHandler(request('GET','https://test.local/v1/missions/mission-cross-device-001','fenix-signed-session'));assert.equal(forged.status,403);
  }finally{store?.close();rmSync(folder,{recursive:true,force:true})}
});