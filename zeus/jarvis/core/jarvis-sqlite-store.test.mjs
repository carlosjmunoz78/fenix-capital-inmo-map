import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SqliteMissionStore} from './jarvis-sqlite-store.mjs';
import {JarvisUniversalCore} from './jarvis-universal-core.mjs';
const principal={verify:async token=> token==='owner'?{ownerId:'carlos',sessionId:'session-1',roles:['OWNER_ROOT'],authorizedCompanies:['fenix','aion']}:null};
const base={token:'owner',companyId:'fenix',projectId:'PRJ',intent:'READ_ONLY',idempotencyKey:'k-1',channel:'desktop'};
test('durable mission remains after restart and different device',async()=>{
 const d=mkdtempSync(join(tmpdir(),'jarvis-b2-')),file=join(d,'missions.db');
 try{
  const s1=new SqliteMissionStore(file),c1=new JarvisUniversalCore({identityProvider:principal,store:s1});
  const first=await c1.submit(base);s1.close();
  const s2=new SqliteMissionStore(file),c2=new JarvisUniversalCore({identityProvider:principal,store:s2});
  const second=await c2.submit({...base,channel:'mobile'});
  assert.equal(second.replayed,true);assert.equal(first.mission.id,second.mission.id);
  assert.equal((await c2.inspect({token:'owner',missionId:first.mission.id})).channel,'desktop');
  assert.equal((await s2.list('carlos')).length,1);s2.close();
 }finally{rmSync(d,{recursive:true,force:true});}
});
test('db-level idempotency unique constraint rejects second distinct mission id',async()=>{
 const d=mkdtempSync(join(tmpdir(),'jarvis-b2-')),file=join(d,'missions.db');
 try{const s=new SqliteMissionStore(file);const a={id:'m-1',ownerId:'carlos',companyId:'fenix',idempotencyKey:'same',updatedAt:'2026-11-03'};
  await s.put(a);await assert.rejects(s.put({...a,id:'m-2'}),/MISSION_KEY_CONFLICT/);
  assert.equal((await s.list('carlos')).length,1);s.close();
 }finally{rmSync(d,{recursive:true,force:true});}
});