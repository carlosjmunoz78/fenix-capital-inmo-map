import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createJarvisD1MissionStore} from './jarvis-d1-mission-store.mjs';
import {JarvisUniversalCore} from './jarvis-universal-core.mjs';

const migration=readFileSync(fileURLToPath(new URL('../cloudflare-lab/0001_jarvis_d1_mission_lab.sql',import.meta.url)),'utf8');
const now='2026-11-05T22:00:00.000Z';
const owner='zeus-owner:synthetic';
const mission=(id='cut19-a')=>({id,ownerId:owner,companyId:'fenix',
 projectId:'PRJ',engineId:'JARVIS-CORE-001',coreVersion:'0.1.0',
 environment:'LAB',intent:'STATUS',status:'RECEIVED',idempotencyKey:'once',
 request:{},events:[],channel:'desktop',createdAt:now,updatedAt:now});
function open(filename,spy=[]){
 const sqlite=new DatabaseSync(filename);
 sqlite.exec(migration);
 const binding={prepare(sql){
  spy.push(sql);
  return {bind(...args){return {
   async first(){return sqlite.prepare(sql).get(...args)??null},
   async run(){return {success:true,results:sqlite.prepare(sql).all(...args)}}
  }}};
 }};
 return {sqlite,binding,store:createJarvisD1MissionStore({db:binding})};
}
const inTemp=async fn=>{
 const dir=mkdtempSync(join(tmpdir(),'jarvis-d1-cut19-'));const file=join(dir,'d1.db');
 try{await fn(file)}finally{rmSync(dir,{recursive:true,force:true})}
};
test('CUT19 does not create production store or accept missing D1 binding',()=>{
 assert.throws(()=>createJarvisD1MissionStore(),/TRUSTED_D1_BINDING_REQUIRED/);
 assert.throws(()=>createJarvisD1MissionStore({db:{prepare(){}},environment:'PROD'}),/D1_LAB_ONLY/);
});
test('CUT19 D1 adapter survives process reconnect and two simulated device sessions',()=>inTemp(async file=>{
 const a=open(file),principal={verify:async token=>{
  if(!['desktop','mobile'].includes(token))throw Error('AUTH_DENIED');
  return {ownerId:owner,sessionId:token,roles:['OWNER_ROOT'],authorizedCompanies:['fenix']};
 }};
 const first=new JarvisUniversalCore({identityProvider:principal,store:a.store,ids:()=> 'cut19-a'});
 const input={token:'desktop',companyId:'fenix',projectId:'PRJ',intent:'STATUS',idempotencyKey:'once'};
 const x=await first.submit(input);assert.equal(x.replayed,false);a.sqlite.close();
 const b=open(file),second=new JarvisUniversalCore({identityProvider:principal,store:b.store,ids:()=> 'cut19-b'});
 const y=await second.submit({...input,token:'mobile',channel:'mobile'});
 assert.equal(y.replayed,true);assert.equal(y.mission.id,x.mission.id);
 assert.equal((await second.inspect({token:'mobile',missionId:x.mission.id})).id,'cut19-a');
 const row=await b.store.getForScope({missionId:'cut19-a',ownerId:owner,companyId:'fenix'});
 assert.equal(row.id,'cut19-a');assert.equal(row.revision,0);
 b.sqlite.close();
}));
test('CUT19 DB unique key rejects duplicate mission without duplicate record',()=>inTemp(async file=>{
 const a=open(file),b=open(file);
 const x=await a.store.createIfAbsent(mission('cut19-a'));
 const y=await b.store.createIfAbsent(mission('cut19-b'));
 assert.equal(x.id,'cut19-a');assert.equal(y.id,'cut19-a');
 const rows=a.sqlite.prepare('SELECT count(*) AS n FROM jarvis_lab_mission_v0').get();
 assert.equal(rows.n,1);a.sqlite.close();b.sqlite.close();
}));
test('CUT19 CAS rejects stale revision and protects newer mission state',()=>inTemp(async file=>{
 const a=open(file),b=open(file);const initial=await a.store.createIfAbsent(mission());
 const newer=await b.store.put({...initial,status:'AUTHORIZED'});
 assert.equal(newer.revision,1);
 await assert.rejects(a.store.put({...initial,status:'SUCCEEDED'}),/MISSION_REVISION_CONFLICT/);
 const current=await a.store.get('cut19-a');
 assert.equal(current.status,'AUTHORIZED');assert.equal(current.revision,1);
 a.sqlite.close();b.sqlite.close();
}));
test('CUT19 scoping hides mission from other owner and company',()=>inTemp(async file=>{
 const a=open(file);await a.store.createIfAbsent(mission());
 assert.equal(await a.store.getForScope({missionId:'cut19-a',ownerId:'zeus-owner:attacker',companyId:'fenix'}),null);
 assert.equal(await a.store.getForScope({missionId:'cut19-a',ownerId:owner,companyId:'aion'}),null);
 assert.equal((await a.store.findByIdempotency(owner+':fenix','once')).id,'cut19-a');
 assert.equal(await a.store.findByIdempotency(owner+':aion','once'),null);
 a.sqlite.close();
}));
test('CUT19 rejects invalid scope, wrong environment and oversized missions before write',()=>inTemp(async file=>{
 const a=open(file);
 await assert.rejects(a.store.createIfAbsent({...mission(),environment:'PROD'}),/D1_LAB_ONLY/);
 await assert.rejects(a.store.createIfAbsent({...mission(),request:{large:'x'.repeat(40000)}}),/MISSION_SIZE_INVALID/);
 await assert.rejects(a.store.findByIdempotency('invalid','x'),/SCOPE_INVALID/);
 await assert.rejects(a.store.get('not_valid;DROP'),/MISSION_ID_INVALID/);
 assert.equal(a.sqlite.prepare('SELECT count(*) AS n FROM jarvis_lab_mission_v0').get().n,0);
 a.sqlite.close();
}));
test('CUT19 SQL queries use placeholders, never embed raw owner or idempotency values',()=>inTemp(async file=>{
 const queries=[];const a=open(file,queries);await a.store.createIfAbsent(mission());
 await a.store.findByIdempotency(owner+':fenix','once');
 assert.ok(queries.every(s=>!s.includes(owner)));
 assert.ok(queries.every(s=>!s.includes('once')));
 assert.ok(queries.some(s=>s.includes('?')));
 a.sqlite.close();
}));
test('CUT19 errors are fail-closed and never leak database secrets',async()=>{
 const db={prepare(){throw Error('private database password / token')}};
 const s=createJarvisD1MissionStore({db});
 await assert.rejects(s.get('x'),e=>e.message==='D1_READ_UNAVAILABLE');
 await assert.rejects(s.createIfAbsent(mission()),e=>e.message==='D1_WRITE_UNAVAILABLE');
});
