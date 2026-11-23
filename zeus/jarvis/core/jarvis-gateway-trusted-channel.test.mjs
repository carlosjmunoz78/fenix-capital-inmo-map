import test from 'node:test';
import assert from 'node:assert/strict';
import {ZeusGlobalIdentityProvider} from './jarvis-global-identity.mjs';
import {JarvisUniversalCore,MemoryEventStore} from './jarvis-universal-core.mjs';
import {createJarvisGatewayHandler} from './jarvis-gateway-handler.mjs';
const provider=new ZeusGlobalIdentityProvider({channels:new Map([['fenix',{verify:async token=>token==='ok-token'?{subject:'u1',sessionId:'s1',authorizedCompanies:['fenix']}:null}]]),registry:{resolve:async()=>({active:true,role:'OWNER_ROOT',ownerId:'zeus-1',authorizedCompanies:['fenix']})}});
const core=new JarvisUniversalCore({identityProvider:provider,store:new MemoryEventStore(),ids:()=> 'mission-from-fenix'});
const gateway=createJarvisGatewayHandler({core,trustedAuthChannel:'fenix'});
const b={company_id:'fenix',project_id:'P1',intent:'STATUS',idempotency_key:'key-1',channel:'mobile',payload:{}};
test('authentication channel is trusted server route, never client-declared UI channel',async()=>{
 const request=new Request('https://localhost/v1/missions',{method:'POST',headers:{authorization:'Bearer ok-token','content-type':'application/json'},body:JSON.stringify(b)});
 const result=await gateway(request);assert.equal(result.status,201);
 const m=(await result.json()).mission;assert.equal(m.ownerId,'zeus-1');assert.equal(m.channel,'mobile');
});
test('unauthorized browser token is rejected despite user supplied channel',async()=>{
 const request=new Request('https://localhost/v1/missions',{method:'POST',headers:{authorization:'Bearer bad-token','content-type':'application/json'},body:JSON.stringify({...b,channel:'fenix',idempotency_key:'key-2'})});
 assert.equal((await gateway(request)).status,403);
});