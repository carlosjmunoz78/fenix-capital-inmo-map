import test from 'node:test';
import assert from 'node:assert/strict';
import {FenixOwnerChannelIdentityProvider} from './jarvis-fenix-channel-identity.mjs';
import {ZeusGlobalIdentityProvider} from './jarvis-global-identity.mjs';
import {createJarvisB3DecisionService} from './jarvis-b3-decision-service.mjs';
import {createJarvisGatewayHandler} from './jarvis-gateway-handler.mjs';
import {JarvisUniversalCore,MemoryEventStore} from './jarvis-universal-core.mjs';
import {createJarvisB2B3GatewayReadGate} from './jarvis-b2-b3-gateway-read-gate.mjs';
import {createJarvisGatewaySecurityGate} from './jarvis-gateway-security-gate.mjs';
const URL='https://jarvis.lab.example.test/v1/missions/mission001';
const mk=(token='signed-owner-session-A',url=URL,method='GET')=>new Request(url,{method,headers:{authorization:'Bearer '+token}});
async function rig(opts={}){
 const calls={auth:0,context:0,registry:0,limit:0,b3:0,handler:0,grant:0,audit:0};
 const channel=new FenixOwnerChannelIdentityProvider({
  authClient:{auth:{
   getUser:async(token)=>{calls.auth++;return{data:{user:{id:'auth-user-1'}},error:null}},
   getClaims:async(token)=>({data:{claims:{sub:'auth-user-1',session_id:
    token==='signed-owner-session-B'?'session-B':'session-A'}},error:null})
  }},
  contextClient:{rpc:async()=>{calls.context++;return{data:{ok:true,actor_code:'CARLOS-ADMIN'},error:null}}},
  resolveCompanies:async()=>opts.channelCompanies||['fenix']
 });
 const identityProvider=new ZeusGlobalIdentityProvider({
  channels:new Map([['fenix-app',channel]]),
  registry:{resolve:async()=>{calls.registry++;return{active:true,role:'OWNER_ROOT',
   ownerId:'zeus-owner-1',authorizedCompanies:opts.registryCompanies||['fenix']}}}
 });
 const store=new MemoryEventStore();
 const core=new JarvisUniversalCore({identityProvider,store,
  capabilities:new Map(),ids:()=> 'mission001',environment:'LAB'});
 await core.submit({token:{channel:'fenix-app',accessToken:'signed-owner-session-A'},
  companyId:'fenix',projectId:'PRJ-1',intent:'STATUS',
  idempotencyKey:'key-1',channel:'desktop',payload:{}});
 const realHandler=createJarvisGatewayHandler({core,trustedAuthChannel:'fenix-app'});
 const handler=async(r)=>{calls.handler++;return realHandler(r)};
 const b3=createJarvisB3DecisionService({
  identityProvider:{verify:async token=>identityProvider.verify({channel:'fenix-app',accessToken:token})},
  controlStore:{get:async()=>opts.control||{enabled:true,killSwitch:false}},
  grantStore:{find:async()=>{calls.grant++;return{
   grantId:'grant-1',ownerId:'zeus-owner-1',companyId:'fenix',
   environment:'LAB',actions:['MISSION_INSPECT'],active:true,
   revoked:opts.revoked===true,expiresAt:Date.now()+60_000,
   maxCost:0,allowMutations:false}}},
  actionCatalog:{get:async()=>({name:'MISSION_INSPECT',mutating:false,estimatedCost:0})},
  auditStore:{append:async event=>{calls.audit++;
   assert.equal(JSON.stringify(event).includes('signed-owner-session'),false);
   return opts.audit!==false}}
 });
 const b3DecisionService={authorize:async args=>{calls.b3++;
  const r=await b3.authorize(args);
  return opts.badPolicyResult?{...r,ownerId:'another-owner'}:r}};
 const gate=createJarvisB2B3GatewayReadGate({handler,
  identityProvider,b3DecisionService,missionStore:store,
  rateLimiter:async()=>{calls.limit++;return opts.limit!==false},
  enabled:true,environment:'LAB',trustedChannel:'fenix-app'});
 return {gate,calls,store};
}
test('gate disabled by default: no handler access',async()=>{
 let calls=0;const gate=createJarvisB2B3GatewayReadGate({handler:async()=>{calls++;return new Response('unsafe')}});
 const response=await gate(mk());
 assert.equal(response.status,503);assert.equal(calls,0);
});
test('PROD and PREPROD cannot enable this read gate',()=>{
 for(const environment of ['PROD','PREPROD']){
  assert.throws(()=>createJarvisB2B3GatewayReadGate({handler:async()=>{},
   enabled:true,environment}),/NOT_CERTIFIED/);
 }
});
test('LAB enabling without trusted adapters fails at construction',()=>{
 assert.throws(()=>createJarvisB2B3GatewayReadGate({handler:async()=>{},enabled:true}),
  /SERVER_AUTHORIZATION_ADAPTERS_REQUIRED/);
});
test('B2 signed owner + scoped B3 grant + original core inspect reads existing mission',async()=>{
 const {gate,calls}=await rig();
 const res=await gate(mk());
 assert.equal(res.status,200);
 const result=await res.json();
 assert.equal(result.status,'OK');assert.equal(result.mission.id,'mission001');
 assert.equal(calls.b3,1);assert.equal(calls.handler,1);
 assert.equal(calls.grant,1);assert.equal(calls.audit,1);
});
test('authenticated second device reads same owner mission but not creates/executes',async()=>{
 const {gate,calls}=await rig();
 const r=await gate(mk('signed-owner-session-B'));
 assert.equal(r.status,200);assert.equal((await r.json()).mission.id,'mission001');
 assert.equal((await gate(mk('signed-owner-session-B',URL,'POST'))).status,405);
 assert.equal((await gate(mk('signed-owner-session-B','https://jarvis.lab.example.test/v1/missions','POST'))).status,405);
 assert.equal(calls.handler,1);
});
for(const [label,opts,expected] of [
 ['grant revoked',{revoked:true},403],
 ['B3 kill switch',{control:{enabled:false,killSwitch:true}},403],
 ['B3 audit down',{audit:false},403],
 ['rate limit',{limit:false},429],
 ['B3 identity mismatch',{badPolicyResult:true},403]
]){
 test('never dispatch unauthorized read: '+label,async()=>{
  const {gate,calls}=await rig(opts);
  const res=await gate(mk());
  assert.equal(res.status,expected);assert.equal(calls.handler,0);
 });
}
test('no tenant access by a different company scope',async()=>{
 const {gate,calls}=await rig({channelCompanies:['fenix']});
 const mission=await gate(mk('signed-owner-session-A',URL+'?company_id=aion'));
 assert.equal(mission.status,404);
 assert.equal(calls.handler,0);
});
test('unknown route and even GET health are blocked until separate certification',async()=>{
 const {gate,calls}=await rig();
 for(const url of ['https://jarvis.lab.example.test/v1/health',
  'https://jarvis.lab.example.test/v1/missions',
  'https://jarvis.lab.example.test/v1/missions/mission001/execute',
  'https://jarvis.lab.example.test/v1/missions/mission001?debug=true']){
  assert.equal((await gate(mk('signed-owner-session-A',url))).status,404);
 }
 assert.equal(calls.handler,0);
});
test('missing bearer cannot enumerate an existing mission',async()=>{
 const {gate,calls}=await rig();
 const response=await gate(new Request(URL));
 assert.equal(response.status,401);assert.equal(calls.handler,0);
});
test('private mission store failure cannot reach gateway',async()=>{
 const{gate,store,calls}=await rig();
 store.get=async()=>{throw Error('DB_DOWN')};
 const response=await gate(mk());
 assert.notEqual(response.status,200);assert.equal(calls.handler,0);
});

test('physical gateway security policy + B2 + B3 + universal core compose in LAB',async()=>{
 const{gate,calls}=await rig();
 const perimeter=createJarvisGatewaySecurityGate({
  handler:gate,enabled:true,
  allowedOrigins:['https://app.fenixcapital.es'],
  allowedHosts:['https://jarvis.lab.example.test'],
  rateLimiter:async()=>true
 });
 const safe=new Request(URL,{method:'GET',headers:{
  authorization:'Bearer signed-owner-session-B',origin:'https://app.fenixcapital.es'
 }});
 const ok=await perimeter(safe);
 assert.equal(ok.status,200);
 assert.equal((await ok.json()).mission.id,'mission001');
 assert.equal(calls.handler,1);
 const forged=new Request(URL,{method:'GET',headers:{
  authorization:'Bearer signed-owner-session-B',origin:'https://attacker.example'
 }});
 assert.equal((await perimeter(forged)).status,403);
 assert.equal(calls.handler,1);
 const forgedHost=new Request('https://attacker.example/v1/missions/mission001',{
  method:'GET',headers:{authorization:'Bearer signed-owner-session-B',
   origin:'https://app.fenixcapital.es'}
 });
 assert.equal((await perimeter(forgedHost)).status,403);
 assert.equal(calls.handler,1);
});
test('outer security gate OFF prohibits even authenticated B2/B3 reads',async()=>{
 const{gate,calls}=await rig();
 const perimeter=createJarvisGatewaySecurityGate({handler:gate});
 assert.equal((await perimeter(mk())).status,503);
 assert.equal(calls.handler,0);
});
