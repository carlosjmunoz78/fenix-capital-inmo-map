import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduledP5} from '../worker.mjs';
function fixtures(){
 const event=[];
 const db={prepare(sql){return{bind(...args){return{first:async()=>{event.push({sql,args});if(sql.startsWith('SELECT'))return {company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',enabled:1,max_daily_jobs:1};if(sql.startsWith('INSERT'))return {request_id:args[0]};return null;}}}}}};
 return {event,env:{P5_ENABLED:'true',P5_ACCEPTANCE_ONCE:'true',RECOVERY_DB:db}};
}
test('owner acceptance uses separate fixed one-time day key, never retries previous failed ticket',async()=>{
 const x=fixtures();
 const http=async(u,opt)=>{const body=JSON.parse(opt.body);assert.equal(body.request_id,'FACT001-P5-20261112-A1');assert.equal(opt.redirect,'manual');return {status:200,json:async()=>({status:'COMPLETED',provider_count:5,request_id:body.request_id})}};
 const r=await scheduledP5(x.env,Date.UTC(2026,10,12,10,45),http);
 assert.equal(r.status,'COMPLETED');
 const insert=x.event.find(x=>x.sql.startsWith('INSERT'));assert.equal(insert.args[0],'FACT001-P5-20261112-A1');assert.equal(insert.args[1],'ACCEPT01');
});
test('acceptance rejects future dates without any D1 insert or network call',async()=>{
 const x=fixtures();const r=await scheduledP5(x.env,Date.UTC(2026,10,13),()=>{throw Error('NETWORK_FORBIDDEN')});assert.equal(r.status,'ACCEPTANCE_DATE_EXPIRED');assert.equal(x.event.some(x=>x.sql.startsWith('INSERT')),false);
});
test('normal daily operation remains date scoped and one-per-day',async()=>{
 const x=fixtures();x.env.P5_ACCEPTANCE_ONCE='false';
 const r=await scheduledP5(x.env,Date.UTC(2026,10,13),async(u,opt)=>({status:200,json:async()=>({status:'COMPLETED',provider_count:5,request_id:JSON.parse(opt.body).request_id})}));
 assert.equal(r.status,'COMPLETED');const q=x.event.find(x=>x.sql.startsWith('INSERT'));assert.equal(q.args[0],'FACT001-P5-20261113');assert.equal(q.args[1],'20261113');
});
