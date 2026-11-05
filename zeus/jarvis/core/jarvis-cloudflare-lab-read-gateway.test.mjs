import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createJarvisD1MissionStore} from './jarvis-d1-mission-store.mjs';
import {createJarvisB3DecisionService} from './jarvis-b3-decision-service.mjs';
import {createJarvisCloudflareLabReadGateway} from './jarvis-cloudflare-lab-read-gateway.mjs';

const migration=readFileSync(fileURLToPath(new URL('../cloudflare-lab/0001_jarvis_d1_mission_lab.sql',import.meta.url)),'utf8');
const HOST='https://jarvis-lab.example.test';
const ORIGIN='https://console.lab.example.test';
const owner='zeus-owner:synthetic';
const mission={id:'cut20',ownerId:owner,companyId:'fenix',projectId:'PRJ',
 engineId:'JARVIS-CORE-001',coreVersion:'0.1.0',environment:'LAB',
 intent:'STATUS',status:'RECEIVED',idempotencyKey:'cut20-key',request:{},
 createdAt:'2026-11-05T22:00:00.000Z',updatedAt:'2026-11-05T22:00:00.000Z',events:[]};
const req=(token='synthetic-1',path='/v1/missions/cut20',method='GET',origin=ORIGIN)=>
 new Request(HOST+path,{method,headers:{authorization:'Bearer '+token,origin}});
const open=()=>{
 const db=new DatabaseSync(':memory:');db.exec(migration);
 const binding={prepare(sql){return{bind(...args){return{
  async first(){return db.prepare(sql).get(...args)??null},
  async run(){return{success:true,results:db.prepare(sql).all(...args)}}
 }}}}};
 return {db,binding};
};
async function rig({revoked=false,grant=true,limit=true}={}){
 const {db,binding}=open();const store=createJarvisD1MissionStore({db:binding});
 await store.createIfAbsent(mission);
 const identityProvider={verify:async input=>{
  const token=typeof input==='string'?input:input?.accessToken;
  if(revoked||!['synthetic-1','synthetic-2','other-owner'].includes(token))throw Error('AUTH_REVOKED');
  return {ownerId:token==='other-owner'?'zeus-owner:foreign':owner,
   sessionId:token,roles:['OWNER_ROOT'],authorizedCompanies:['fenix']};
 }};
 const b3DecisionService=createJarvisB3DecisionService({
  identityProvider:{verify:async token=>identityProvider.verify(token)},
  controlStore:{get:async()=>({enabled:true,killSwitch:false})},
  grantStore:{find:async()=>grant?{
   grantId:'synthetic-grant',ownerId:owner,companyId:'fenix',environment:'LAB',
   actions:['MISSION_INSPECT'],active:true,revoked:false,expiresAt:Date.now()+60000,
   maxCost:0,allowMutations:false}:null},
  actionCatalog:{get:async()=>({name:'MISSION_INSPECT',mutating:false,estimatedCost:0})},
  auditStore:{append:async()=>true}
 });
 const fetch=createJarvisCloudflareLabReadGateway({
  identityProvider,b3DecisionService,rateLimiter:async()=>limit,
  perimeterLimiter:async()=>limit,enabled:true,environment:'LAB',
  allowedHosts:[HOST],allowedOrigins:[ORIGIN]
 });
 return {db,fetch,env:{JARVIS_LAB_DB:binding}};
}
test('CUT20 defaults OFF, never accesses D1 or identity or B3',async()=>{
 let touched=0;
 const fetch=createJarvisCloudflareLabReadGateway({
  identityProvider:{verify:async()=>{touched++}},
  b3DecisionService:{authorize:async()=>{touched++}}
 });
 const response=await fetch(req(),{JARVIS_LAB_DB:{get prepare(){touched++;return null}}});
 assert.equal(response.status,503);assert.equal(touched,0);
});
test('CUT20 cannot enable without trusted adapters or outside LAB',()=>{
 assert.throws(()=>createJarvisCloudflareLabReadGateway({enabled:true}),/TRUSTED_PORTS_REQUIRED/);
 assert.throws(()=>createJarvisCloudflareLabReadGateway({enabled:true,environment:'PROD'}),/LAB_ONLY/);
});
test('CUT20 B2+B3+legacy core inspect same D1 mission for second synthetic session',async()=>{
 const a=await rig();try{
  for(const token of ['synthetic-1','synthetic-2']){
   const response=await a.fetch(req(token),a.env);
   assert.equal(response.status,200);
   const json=await response.json();
   assert.equal(json.status,'OK');assert.equal(json.mission.id,'cut20');
  }
 }finally{a.db.close()}
});
test('CUT20 rejects every POST mutation even for trusted owner and valid B3',async()=>{
 const a=await rig();try{
  assert.equal((await a.fetch(req('synthetic-1','/v1/missions/cut20','POST'),a.env)).status,405);
  assert.equal((await a.fetch(req('synthetic-1','/v1/missions','POST'),a.env)).status,405);
 }finally{a.db.close()}
});
test('CUT20 fails closed without D1 and on invalid host, origin, route and query',async()=>{
 const a=await rig();try{
  assert.equal((await a.fetch(req(),{})).status,503);
  assert.equal((await a.fetch(req('synthetic-1','/v1/missions/cut20?company_id=aion'),a.env)).status,404);
  assert.equal((await a.fetch(req('synthetic-1','/v1/missions/cut20','GET','https://evil.invalid'),a.env)).status,403);
  assert.equal((await a.fetch(new Request('https://evil.invalid/v1/missions/cut20',{headers:{
   authorization:'Bearer synthetic-1',origin:ORIGIN}}),a.env)).status,403);
 }finally{a.db.close()}
});
test('CUT20 foreign owner cannot read another owner mission',async()=>{
 const a=await rig();try{
  assert.equal((await a.fetch(req('other-owner'),a.env)).status,404);
 }finally{a.db.close()}
});
test('CUT20 revoked B2 session and missing B3 grant each deny read',async()=>{
 for(const opts of [{revoked:true},{grant:false},{limit:false}]){
  const a=await rig(opts);try{
   assert.notEqual((await a.fetch(req(),a.env)).status,200);
  }finally{a.db.close()}
 }
});
