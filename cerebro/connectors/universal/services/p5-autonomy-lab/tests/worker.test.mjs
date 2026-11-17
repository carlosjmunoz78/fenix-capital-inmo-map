import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduledP5} from '../worker.mjs';
const config={enabled:1,max_daily_jobs:1,company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
function fake(){
 let written=0;const calls=[];
 const db={prepare(sql){return {bind(...args){return {async first(){calls.push({sql,args:args.map((x,i)=>sql.startsWith('INSERT')&&i===4?'[HASH]':x)});if(sql.startsWith('SELECT'))return config;if(sql.startsWith('INSERT')){if(written++)return null;return {request_id:args[0]};}throw Error('UNEXPECTED_SQL');}};}}}};
 return {env:{P5_ENABLED:'true',RECOVERY_DB:db},calls,async http(url,opt){assert.equal(url,'https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-fact001-p5-dispatch-lab/dispatch');assert.equal(opt.method,'POST');const body=JSON.parse(opt.body);assert.equal(body.provider_set,'cloudflare,vercel,supabase,notion,github');assert.equal(body.environment,'LAB');assert.equal(body.max_cost_eur,0);return new Response(JSON.stringify({status:'COMPLETED',provider_count:5,request_id:body.request_id}),{status:200});}};
}
test('no autonomous execution until worker and exact registry enabled',async()=>{const f=fake();assert.equal((await scheduledP5({...f.env,P5_ENABLED:'false'},Date.UTC(2026,10,12),f.http)).status,'DISABLED');assert.equal(f.calls.length,0);});
test('registered cron creates a single durable ticketed job and dispatches exactly once',async()=>{const f=fake();const now=Date.UTC(2026,10,12);const a=await scheduledP5(f.env,now,f.http);assert.equal(a.status,'COMPLETED');assert.equal(a.provider_count,5);const b=await scheduledP5(f.env,now,f.http);assert.equal(b.status,'ALREADY_SCHEDULED');assert.equal(f.calls.filter(x=>x.sql.startsWith('INSERT')).length,2);});
test('missing config fails closed',async()=>{const f=fake();const env={...f.env,RECOVERY_DB:{prepare(){return{bind(){return{first:async()=>null}}}}}};assert.equal((await scheduledP5(env,Date.UTC(2026,10,12),f.http)).status,'NOT_REGISTERED');});
