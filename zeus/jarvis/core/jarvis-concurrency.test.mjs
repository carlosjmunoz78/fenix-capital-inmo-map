import test from 'node:test';
import assert from 'node:assert/strict';
import {JarvisUniversalCore} from './jarvis-universal-core.mjs';
const clone=x=>structuredClone(x);
test('concurrent executions cannot both enter a read-only capability when CAS is enforced',async()=>{
 let row=null,calls=0;let reads=0,release;
 const bothRead=new Promise(resolve=>release=resolve);
 const store={
  async findByIdempotency(){return row?clone(row):null},
  async get(){const result=clone(row);reads++;if(reads===2)release();await bothRead;return result},
  async createIfAbsent(m){if(row)return clone(row);row={...clone(m),revision:0};return clone(row)},
  async put(m){if(row.revision!==m.revision)throw new Error('MISSION_REVISION_CONFLICT');row={...clone(m),revision:m.revision+1};return clone(row)}
 };
 const identityProvider={verify:async()=>({ownerId:'zeus-1',sessionId:'s1',roles:['OWNER_ROOT'],authorizedCompanies:['fenix']})};
 const capabilities=new Map([['READ',{mutating:false,run:async()=>{calls++;return{ok:true}}}]]);
 const one=new JarvisUniversalCore({identityProvider,store,capabilities}),two=new JarvisUniversalCore({identityProvider,store,capabilities});
 const {mission}=await one.submit({token:'valid',companyId:'fenix',projectId:'p1',intent:'READ',idempotencyKey:'once'});
 const results=await Promise.allSettled([one.execute({token:'valid',missionId:mission.id}),two.execute({token:'valid',missionId:mission.id})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.message==='MISSION_REVISION_CONFLICT').length,1);
 assert.equal(calls,1);
});