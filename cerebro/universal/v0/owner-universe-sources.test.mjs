import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createOwnerUniverseReaderLabV0} from './owner-universe-reader.mjs';
import {UniversalGatewayLabV0} from './control-plane.mjs';
import {createUniversalInterfaceAutoConnectV0, UNIVERSAL_INTERFACE_TYPES_V0} from './interface-autoconnect.mjs';
import handler from '../../../api/cerebro-universal-preview.ts';

const ENDPOINT='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-gateway-v36-followups-lab/owner-universe?company_id=fenix';
const OWNER='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context';
const TOKEN='token-safe-local-test-identity-1234567890'.repeat(10);
const KEY='test-browser-publishable-key-not-a-secret';
const HOST='fenix-capital-preprod-auditlab1.vercel.app';
const registry=JSON.parse(fs.readFileSync(new URL('../../registry/engine-registry.v1.json',import.meta.url),'utf8'));
const res=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const sample=(overrides={})=>({
 status:'OK',owner_scope:'SERVER_VERIFIED_FENIX_ONLY',executed:false,live_writes:false,prod_execution_enabled:false,
 registry:{status:'OK',source_status:'LIVE_SERVER_READ',companies:[{company_id:'fenix',password:'DO_NOT_LEAK'}],projects:[],engines:[{engine_id:'FACT-001',secret:'DO_NOT_LEAK'}]},
 factory:{status:'OK',source_status:'PUBLIC_GITHUB_CACHED',catalog:[{engine_id:'FACT-001',credential:'DO_NOT_LEAK'}],scaffolded:[]},
 ...overrides
});
test('existing owner-universe GET gives only sanitised source metadata, never records',async()=>{
 const calls=[];
 const reader=createOwnerUniverseReaderLabV0({apiKey:KEY,fetchImpl:async(url,opt)=>{calls.push({url,opt});return res(sample())}});
 const found=await reader.listForContext({company_id:'fenix',environment:'LAB',session_token:TOKEN});
 assert.equal(found.status,'OK');
 assert.equal(found.owner_verified_upstream,true);
 assert.equal(found.registry.engine_records,1);assert.equal(found.factory.catalog_definitions,1);
 assert.equal(found.registry.source_status,'LIVE_SERVER_READ');
 assert.equal(found.factory.source_status,'PUBLIC_GITHUB_CACHED');
 assert.equal(found.runtime_engines_verified,0);
 assert.equal(found.prod_execution_enabled,false);assert.equal(found.job001_connected,false);
 assert.equal(calls.length,1);assert.equal(calls[0].url,ENDPOINT);assert.equal(calls[0].opt.method,'GET');
 assert.equal(calls[0].opt.headers.authorization,'Bearer '+TOKEN);
 assert.equal(JSON.stringify(found).includes('DO_NOT_LEAK'),false);
 assert.equal(JSON.stringify(found).includes(TOKEN),false);
});
test('unauthorized tenant/environment and misleading upstream owner grants fail closed',async()=>{
 let calls=0;
 const reader=createOwnerUniverseReaderLabV0({apiKey:KEY,fetchImpl:async()=>{calls++;return res(sample({owner_scope:'ALL_COMPANIES'}))}});
 await assert.rejects(reader.listForContext({company_id:'aion',environment:'LAB',session_token:TOKEN}),/FENIX_LAB_ONLY/);
 await assert.rejects(reader.listForContext({company_id:'fenix',environment:'PROD',session_token:TOKEN}),/FENIX_LAB_ONLY/);
 await assert.rejects(reader.listForContext({company_id:'fenix',environment:'LAB',session_token:'bad'}),/SESSION_REQUIRED/);
 assert.equal(calls,0);
 const denied=await reader.listForContext({company_id:'fenix',environment:'LAB',session_token:TOKEN});
 assert.equal(denied.status,'UNAVAILABLE');assert.equal(denied.owner_verified_upstream,false);
 assert.equal(denied.reason,'OWNER_UNIVERSE_CONTRACT_INVALID');
});
test('partial source and unreadable request never become runtime proofs',async()=>{
 const partial=createOwnerUniverseReaderLabV0({apiKey:KEY,fetchImpl:async()=>res(sample({status:'PARTIAL',factory:{status:'SOURCE_UNAVAILABLE',source_status:'UNVERIFIED',catalog:[],scaffolded:[]}}),207)});
 const p=await partial.listForContext({company_id:'fenix',environment:'LAB',session_token:TOKEN});
 assert.equal(p.status,'PARTIAL');assert.equal(p.factory.status,'UNAVAILABLE');
 const absent=createOwnerUniverseReaderLabV0({apiKey:KEY,fetchImpl:async()=>{throw Error('network disconnected')}});
 const a=await absent.listForContext({company_id:'fenix',environment:'LAB',session_token:TOKEN});
 assert.equal(a.status,'UNAVAILABLE');assert.equal(a.reason,'UPSTREAM_UNAVAILABLE');
 assert.equal(a.runtime_engines_verified,0);
});
test('all six SDK interface contracts share owner-universe source with server permissions',async()=>{
 const adapter=createOwnerUniverseReaderLabV0({apiKey:KEY,fetchImpl:async()=>res(sample())});
 const grant={actor_id:'CARLOS-ADMIN',company_ids:['fenix'],scopes:['cerebro:universal:read','cerebro:factory:inspect']};
 const gateway=new UniversalGatewayLabV0({registry,authenticate:async token=>token===TOKEN?grant:null,ownerSources:adapter});
 for(const interface_id of UNIVERSAL_INTERFACE_TYPES_V0){
  const sdk=createUniversalInterfaceAutoConnectV0({interface_id,request:request=>gateway.handle(request),getSessionToken:async()=>TOKEN});
  const result=await sdk.readOwnerSources();
  assert.equal(result.status,'OK');assert.equal(result.source,'EXISTING_OWNER_UNIVERSE_LAB');
  assert.equal(result.factory.catalog_definitions,1);assert.equal(result.runtime_engines_verified,0);
 }
 const noPrivilege=new UniversalGatewayLabV0({registry,authenticate:async()=>({...grant,scopes:['cerebro:universal:read']}),ownerSources:adapter});
 await assert.rejects(noPrivilege.handle({session_token:TOKEN,action:'list_owner_sources',params:{company_id:'fenix',environment:'LAB'}}),/SCOPE_DENIED/);
 await assert.rejects(gateway.handle({session_token:TOKEN,action:'list_owner_sources',params:{company_id:'fenix',environment:'PROD'}}),/ENVIRONMENT_LAB_ONLY/);
});
test('preview route authorises owner before read-only owner-universe GET; execute forbidden',async t=>{
 const prior=globalThis.fetch,env=process.env.VERCEL_ENV,vercel=process.env.VERCEL_URL;
 t.after(()=>{globalThis.fetch=prior;process.env.VERCEL_ENV=env;process.env.VERCEL_URL=vercel});
 process.env.VERCEL_ENV='preview';process.env.VERCEL_URL=HOST;
 const calls=[];globalThis.fetch=async(url,opt)=>{
  calls.push({url,method:opt.method});
  if(url===OWNER)return res({ok:true,context:{actor_code:'CARLOS-ADMIN'}});
  if(url===ENDPOINT)return res(sample());
  throw Error('UNKNOWN_SOURCE');
 };
 const headers={host:HOST,origin:'https://'+HOST,authorization:'Bearer '+TOKEN,apikey:KEY};
 const request={method:'POST',headers,body:{action:'list_owner_sources',params:{company_id:'fenix',environment:'LAB'}}};
 const log={code:0,body:null};const reply={setHeader:()=>{},status(c){log.code=c;return reply},json(v){log.body=v;return reply}};
 await handler(request,reply);
 assert.equal(log.code,200);assert.equal(log.body.source,'EXISTING_OWNER_UNIVERSE_LAB');
 assert.equal(log.body.transport,'PREVIEW_ONLY_SERVER_VERIFIED');
 assert.equal(log.body.runtime_engines_verified,0);assert.equal(log.body.prod_execution_enabled,false);
 assert.deepEqual(calls.map(x=>x.url),[OWNER,ENDPOINT]);
 assert.deepEqual(calls.map(x=>x.method),['GET','GET']);
 await handler({...request,body:{action:'execute',params:request.body.params}},reply);
 assert.equal(log.code,404);assert.equal(calls.length,2);
});
