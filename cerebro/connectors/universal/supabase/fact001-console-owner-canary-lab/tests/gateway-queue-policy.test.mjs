import test from 'node:test';import assert from 'node:assert/strict';
import {GATEWAY_SCOPE,GATEWAY_SIGNED_ID,GATEWAY_SESSION_ID,GATEWAY_D1_DATABASE,GATEWAY_D1_VAULT,
 assertGatewayQueueOrder,INSERT_HEARTBEAT,GET_HEARTBEAT,CONFIG_QUERY} from '../gateway-queue-policy.mjs';
const cmd=(mode)=>({...GATEWAY_SCOPE,operation:'fact001.lab.heartbeat',request_id:mode==='owner'?GATEWAY_SESSION_ID:GATEWAY_SIGNED_ID,max_cost_eur:0});
test('signed and Supabase session require their own fixed owner order and 4D LAB',()=>{
 assert.equal(assertGatewayQueueOrder(cmd('signed'),'signed'),GATEWAY_SIGNED_ID);
 assert.equal(assertGatewayQueueOrder(cmd('owner'),'owner'),GATEWAY_SESSION_ID);
 assert.throws(()=>assertGatewayQueueOrder(cmd('signed'),'owner'));
 assert.throws(()=>assertGatewayQueueOrder(cmd('owner'),'signed'));
});
test('arbitrary provider ops, SQL, token, PROD, cross-tenant, cost fail closed',()=>{
 for(const patch of [{environment:'PROD'},{company_id:'another'},{operation:'cloudflare.dns.update'},
  {sql:'DELETE FROM anything'},{token:'SECRET'},{max_cost_eur:1},{request_id:'arbitrary'}])
   assert.throws(()=>assertGatewayQueueOrder({...cmd('signed'),...patch},'signed'));
});
test('D1 statements target only existing LAB heartbeat and never expose external job types',()=>{
 assert.equal(GATEWAY_D1_DATABASE,'1305f791-7c44-47f9-946b-f330a09c88aa');
 assert.equal(GATEWAY_D1_VAULT,'cerebro_cf_gateway_recovery_d1_write_lab_20261111');
 assert.ok(INSERT_HEARTBEAT.includes('ON CONFLICT(id) DO NOTHING'));
 assert.ok(INSERT_HEARTBEAT.includes("'fact001.lab.heartbeat'"));
 assert.ok(GET_HEARTBEAT.includes('WHERE id=?1'));
 assert.ok(CONFIG_QUERY.includes('max_jobs_per_tick'));
 assert.ok(!/delete|drop|alter|pragma|update/i.test(INSERT_HEARTBEAT+' '+GET_HEARTBEAT));
});
