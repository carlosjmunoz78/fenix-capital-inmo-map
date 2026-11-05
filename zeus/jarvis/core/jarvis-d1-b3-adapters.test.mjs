import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createJarvisD1B3Adapters} from './jarvis-d1-b3-adapters.mjs';
import {createJarvisB3DecisionService} from './jarvis-b3-decision-service.mjs';

const ddl=readFileSync(fileURLToPath(new URL('../cloudflare-lab/0003_jarvis_d1_b3_readonly_audit_lab.sql',import.meta.url)),'utf8');
const owner='zeus-owner:synthetic';
const eventReq={token:'synthetic-bearer',companyId:'fenix',environment:'LAB',actionName:'MISSION_INSPECT'};
function rig(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(ddl);
 const queries=[];
 const binding={prepare(sql){
  queries.push(sql);
  return {bind(...values){return{
   async first(){return sqlite.prepare(sql).get(...values)??null},
   async run(){const m=sqlite.prepare(sql).run(...values);return{success:true,meta:{changes:Number(m.changes)},results:[]}}
  }}};
 }};
 const adapters=createJarvisD1B3Adapters({db:binding});
 const svc=createJarvisB3DecisionService({
  identityProvider:{verify:async token=>token==='synthetic-bearer'?{
   ownerId:owner,sessionId:'session-a',roles:['OWNER_ROOT'],authorizedCompanies:['fenix']
  }:null},...adapters
 });
 const seedControl=({companyId='fenix',enabled=1,killSwitch=0}={})=>
  sqlite.prepare('INSERT INTO jarvis_lab_b3_control_v0(company_id,environment,enabled,kill_switch) VALUES (?, ?, ?, ?)')
   .run(companyId,'LAB',enabled,killSwitch);
 const seedGrant=({ownerId=owner,companyId='fenix',active=1,revoked=0,
    expiresAt=Date.now()+3600000}={})=>
  sqlite.prepare('INSERT INTO jarvis_lab_b3_read_grant_v0(grant_id,owner_id,company_id,environment,action_name,active,revoked,max_cost,allow_mutations,expires_at_ms,issued_at_ms) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
   .run('grant-synthetic',ownerId,companyId,'LAB','MISSION_INSPECT',active,revoked,0,0,expiresAt,Date.now()-1000);
 const events=()=>sqlite.prepare('SELECT event_code,allowed,grant_id,company_id FROM jarvis_lab_b3_audit_v0 ORDER BY event_id').all();
 return {sqlite,queries,adapters,svc,seedControl,seedGrant,events};
}
test('CUT24 requires trusted server D1 binding and environment LAB',()=>{
 assert.throws(()=>createJarvisD1B3Adapters(),/TRUSTED_D1_B3_ADAPTERS_REQUIRED/);
 assert.throws(()=>createJarvisD1B3Adapters({environment:'PROD',db:{prepare(){}}}),/D1_B3_LAB_ONLY/);
});
test('CUT24 fresh D1 has no grants; B3 default denies and logs without a token',async()=>{
 const r=rig();try{
  assert.equal(r.sqlite.prepare('SELECT count(*) AS n FROM jarvis_lab_b3_read_grant_v0').get().n,0);
  const x=await r.svc.authorize(eventReq);
  assert.equal(x.decision,'DENY');assert.equal(x.reason,'KILL_SWITCH');
  assert.deepEqual(r.events().map(x=>x.event_code),['DENY']);
  assert.equal(JSON.stringify(r.events()).includes(eventReq.token),false);
 }finally{r.sqlite.close()}
});
test('CUT24 grants alone cannot override disabled kill switch',async()=>{
 const r=rig();try{
  r.seedControl({enabled:0,killSwitch:1});r.seedGrant();
  const x=await r.svc.authorize(eventReq);
  assert.equal(x.decision,'DENY');
  assert.equal(x.reason,'KILL_SWITCH');
 }finally{r.sqlite.close()}
});
test('CUT24 explicit enabled control and zero-cost read grant allow MISSION_INSPECT',async()=>{
 const r=rig();try{
  r.seedControl();r.seedGrant();
  const x=await r.svc.authorize(eventReq);
  assert.equal(x.decision,'ALLOW');
  assert.equal(x.action,'MISSION_INSPECT');
  assert.equal(x.ownerId,owner);
  const events=r.events();
  assert.equal(events.length,1);
  assert.equal(events[0].event_code,'ALLOW');
  assert.equal(events[0].allowed,1);
  assert.equal(events[0].grant_id,'grant-synthetic');
  assert.equal(JSON.stringify(events).includes(eventReq.token),false);
 }finally{r.sqlite.close()}
});
test('CUT24 revocation affects next authorization and leaves both audit rows',async()=>{
 const r=rig();try{
  r.seedControl();r.seedGrant();
  assert.equal((await r.svc.authorize(eventReq)).decision,'ALLOW');
  r.sqlite.prepare('UPDATE jarvis_lab_b3_read_grant_v0 SET revoked=1').run();
  const after=await r.svc.authorize(eventReq);
  assert.equal(after.decision,'DENY');
  assert.deepEqual(r.events().map(x=>x.event_code),['ALLOW','DENY']);
 }finally{r.sqlite.close()}
});
test('CUT24 expired grant or inactive grant never authorize',async()=>{
 for(const opts of [{expiresAt:Date.now()-1},{active:0},{revoked:1}]){
  const r=rig();try{
   r.seedControl();r.seedGrant(opts);
   assert.notEqual((await r.svc.authorize(eventReq)).decision,'ALLOW');
   assert.deepEqual(r.events().map(x=>x.event_code),['DENY']);
  }finally{r.sqlite.close()}
 }
});
test('CUT24 foreign owner, tenant or action have no access',async()=>{
 const r=rig();try{
  r.seedControl();r.seedGrant({ownerId:'zeus-owner:other'});
  assert.notEqual((await r.svc.authorize(eventReq)).decision,'ALLOW');
  assert.notEqual((await r.svc.authorize({...eventReq,companyId:'aion'})).decision,'ALLOW');
  assert.notEqual((await r.svc.authorize({...eventReq,actionName:'MISSION_DELETE'})).decision,'ALLOW');
 }finally{r.sqlite.close()}
});
test('CUT24 SQLite hard bounds prevent mutating or paid read grants',()=>{
 const r=rig();try{
  const params=['synthetic','zeus-owner:synthetic','fenix','LAB','MISSION_INSPECT',1,0,0,0,Date.now()+10000,Date.now()];
  const sql='INSERT INTO jarvis_lab_b3_read_grant_v0(grant_id,owner_id,company_id,environment,action_name,active,revoked,max_cost,allow_mutations,expires_at_ms,issued_at_ms) VALUES (?,?,?,?,?,?,?,?,?,?,?)';
  assert.throws(()=>r.sqlite.prepare(sql).run(...params.slice(0,7),1,...params.slice(8)));
  assert.throws(()=>r.sqlite.prepare(sql).run(...params.slice(0,8),1,...params.slice(9)));
  assert.throws(()=>r.sqlite.prepare(sql).run(...params.slice(0,4),'MISSION_DELETE',...params.slice(5)));
 }finally{r.sqlite.close()}
});
test('CUT24 audit rows cannot be updated or deleted by SQL',async()=>{
 const r=rig();try{
  await r.svc.authorize(eventReq);
  assert.throws(()=>r.sqlite.prepare("UPDATE jarvis_lab_b3_audit_v0 SET allowed=1").run(),/B3_AUDIT_APPEND_ONLY/);
  assert.throws(()=>r.sqlite.prepare("DELETE FROM jarvis_lab_b3_audit_v0").run(),/B3_AUDIT_APPEND_ONLY/);
  assert.equal(r.events()[0].allowed,0);
 }finally{r.sqlite.close()}
});
test('CUT24 database failure and audit failure deny even valid owner',async()=>{
 const db={prepare(sql){if(sql.startsWith('INSERT INTO jarvis_lab_b3_audit'))throw Error('secret database error');return{bind(){return{first:async()=>null}}}}};
 const a=createJarvisD1B3Adapters({db});
 const svc=createJarvisB3DecisionService({identityProvider:{verify:async()=>({
  ownerId:owner,sessionId:'session-a',roles:['OWNER_ROOT'],authorizedCompanies:['fenix']
 })},...a});
 const out=await svc.authorize(eventReq);
 assert.equal(out.decision,'DENY');
 assert.equal(out.reason,'AUDIT_UNAVAILABLE');
 assert.equal(JSON.stringify(out).includes('secret'),false);
});
test('CUT24 no D1 SQL ever contains bearer or owner literal from user input',async()=>{
 const r=rig();try{
  r.seedControl();r.seedGrant();await r.svc.authorize(eventReq);
  assert.ok(r.queries.length>0);
  assert.ok(r.queries.every(x=>!x.includes(eventReq.token)&&!x.includes(owner)));
  assert.ok(r.queries.every(x=>!x.includes('synthetic-bearer')));
 }finally{r.sqlite.close()}
});
