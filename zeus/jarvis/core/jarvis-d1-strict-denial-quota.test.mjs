import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createJarvisD1StrictDenialQuotaGuard,CUT26_DEFAULT_DAILY_BUDGET}
 from './jarvis-d1-strict-denial-quota.mjs';
import {createJarvisD1GatewayDenialAudit,createJarvisGatewayDenialAuditWrapper}
 from './jarvis-gateway-denial-audit.mjs';
const schema=['0005_jarvis_d1_daily_denial_quota_lab.sql',
 '0004_jarvis_d1_gateway_denial_audit_lab.sql'].map(name=>
 readFileSync(fileURLToPath(new URL('../cloudflare-lab/'+name,import.meta.url)),'utf8')
).join('\n');
const day1=Date.parse('2026-11-06T23:59:58Z');
const day2=Date.parse('2026-11-07T00:00:02Z');
function open(path=':memory:'){
 const sqlite=new DatabaseSync(path);sqlite.exec(schema);const calls=[];
 const binding={prepare(sql){
  calls.push(sql);
  return {bind(...args){return {
   async first(){return sqlite.prepare(sql).get(...args)??null},
   async run(){const result=sqlite.prepare(sql).run(...args);
    return {success:true,meta:{changes:Number(result.changes)},results:[]}}
  }}}
 }};
 const rows=()=>sqlite.prepare('SELECT usage_day,environment,quota_name,consumed,max_per_day FROM jarvis_lab_denial_quota_v0 ORDER BY usage_day').all();
 return{sqlite,binding,calls,rows};
}
test('CUT26 strict D1 quota is LAB-only and has a bounded free-tier ceiling',()=>{
 assert.equal(CUT26_DEFAULT_DAILY_BUDGET,500);
 assert.throws(()=>createJarvisD1StrictDenialQuotaGuard(),/TRUSTED_D1_QUOTA_BINDING_REQUIRED/);
 assert.throws(()=>createJarvisD1StrictDenialQuotaGuard({db:{prepare(){}},environment:'PROD'}),/QUOTA_LAB_ONLY/);
 for(const maxDailyWrites of [0,-1,1001,Infinity,NaN,3.1,'100']){
  assert.throws(()=>createJarvisD1StrictDenialQuotaGuard({db:{prepare(){}},maxDailyWrites}),/QUOTA_SAFE_BOUND_INVALID/);
 }
});
test('CUT26 atomically accepts exactly budget reservations, then denies',async()=>{
 const r=open();try{
  const guard=createJarvisD1StrictDenialQuotaGuard({db:r.binding,clock:()=>day1,maxDailyWrites:3});
  assert.deepEqual(await Promise.all(Array.from({length:8},()=>guard())),
   [true,true,true,false,false,false,false,false]);
  assert.equal(r.rows().length,1);assert.equal(r.rows()[0].consumed,3);
  assert.equal(r.rows()[0].environment,'LAB');
 }finally{r.sqlite.close()}
});
test('CUT26 immutable maximum cannot silently expand when code changes',async()=>{
 const r=open();try{
  const low=createJarvisD1StrictDenialQuotaGuard({db:r.binding,clock:()=>day1,maxDailyWrites:2});
  assert.equal(await low(),true);
  const high=createJarvisD1StrictDenialQuotaGuard({db:r.binding,clock:()=>day1,maxDailyWrites:1000});
  assert.equal(await high(),false);
  assert.equal(r.rows()[0].max_per_day,2);
  assert.equal(await low(),true);assert.equal(await low(),false);
 }finally{r.sqlite.close()}
});
test('CUT26 daily quota uses UTC and resets at midnight, never overwrites history',async()=>{
 const r=open();try{
  const a=createJarvisD1StrictDenialQuotaGuard({db:r.binding,clock:()=>day1,maxDailyWrites:1});
  const b=createJarvisD1StrictDenialQuotaGuard({db:r.binding,clock:()=>day2,maxDailyWrites:1});
  assert.equal(await a(),true);assert.equal(await a(),false);
  assert.equal(await b(),true);assert.equal(await b(),false);
  assert.deepEqual(r.rows().map(x=>x.usage_day),['2026-11-06','2026-11-07']);
 }finally{r.sqlite.close()}
});
test('CUT26 quota state persists across independent SQLite D1 connection reopen',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'jarvis-cut26-')),file=join(dir,'lab.sqlite');let a,b;
 try{
  a=open(file);
  const one=createJarvisD1StrictDenialQuotaGuard({db:a.binding,clock:()=>day1,maxDailyWrites:2});
  assert.equal(await one(),true);a.sqlite.close();a=null;
  b=open(file);
  const second=createJarvisD1StrictDenialQuotaGuard({db:b.binding,clock:()=>day1,maxDailyWrites:2});
  assert.equal(await second(),true);assert.equal(await second(),false);
  assert.equal(b.rows()[0].consumed,2);
 }finally{try{a?.sqlite.close()}catch{}try{b?.sqlite.close()}catch{}
  rmSync(dir,{recursive:true,force:true})}
});
test('CUT26 invalid clock and backend failures deny without leaking credentials',async()=>{
 const r=open();try{
  for(const clock of [()=>NaN,()=>Infinity,()=>0,()=>{throw Error('sensitive UTC')}]) {
   const guard=createJarvisD1StrictDenialQuotaGuard({db:r.binding,clock});
   assert.equal(await guard(),false);
  }
  assert.equal(r.rows().length,0);
  const fail=createJarvisD1StrictDenialQuotaGuard({db:{
   prepare(){throw Error('database token and password')}
  },clock:()=>day1});
  assert.equal(await fail(),false);
 }finally{r.sqlite.close()}
});
test('CUT26 quota table contains only day and event count, no user data',async()=>{
 const r=open();try{
  const guard=createJarvisD1StrictDenialQuotaGuard({db:r.binding,clock:()=>day1,maxDailyWrites:2});
  assert.equal(await guard(),true);
  const snapshot=JSON.stringify(r.rows());
  for(const secret of ['Bearer','ownerId','sessionId','client-ip','fenix','JWT'])
   assert.equal(snapshot.includes(secret),false);
  assert.ok(r.calls.every(sql=>!sql.includes('user_agent')&&!sql.includes('Authorization')));
 }finally{r.sqlite.close()}
});
test('CUT26 real CUT25 wrapper consumes only 2 audit writes, then denies third',async()=>{
 const r=open();try{
  const quota=createJarvisD1StrictDenialQuotaGuard({db:r.binding,clock:()=>day1,maxDailyWrites:2});
  const audit=createJarvisD1GatewayDenialAudit({db:r.binding,clock:()=>day1});
  const audited=createJarvisGatewayDenialAuditWrapper({enabled:true,
   handler:async()=>new Response('denied',{status:401}),audit,quotaGuard:quota});
  const input=new Request('https://jarvis-lab.invalid/v1/missions/test',{
   headers:{authorization:'Bearer synthetic-no-real-token'}
  });
  assert.equal((await audited(input)).status,401);
  assert.equal((await audited(input)).status,401);
  assert.equal((await audited(input)).status,429);
  assert.equal(r.rows()[0].consumed,2);
  assert.equal(r.sqlite.prepare('SELECT count(*) AS c FROM jarvis_lab_gateway_denial_audit_v0').get().c,2);
 }finally{r.sqlite.close()}
});
test('CUT26 full cap with 32 simultaneous calls never exceeds configured daily write cap',async()=>{
 const r=open();try{
  const guard=createJarvisD1StrictDenialQuotaGuard({db:r.binding,clock:()=>day1,maxDailyWrites:11});
  const results=await Promise.all(Array.from({length:32},()=>guard()));
  assert.equal(results.filter(Boolean).length,11);
  assert.equal(r.rows()[0].consumed,11);
 }finally{r.sqlite.close()}
});
