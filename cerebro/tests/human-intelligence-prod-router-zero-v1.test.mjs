import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PROD_ROUTER_ZERO_CONTRACT,selectHumanRoute,stableBucket} from '../human-intelligence/integration/prod-router-zero-v1.mjs';

const edgeSource=readFileSync(new URL('../../supabase/functions/cerebro-console-human-router-zero-v1/index.ts',import.meta.url),'utf8');

test('zero router targets CHAT-001 while stable Console remains authority',()=>{
  assert.equal(PROD_ROUTER_ZERO_CONTRACT.engine_id,'CHAT-001');
  assert.equal(PROD_ROUTER_ZERO_CONTRACT.stable_authority,'cerebro-console-gateway-v0');
  assert.equal(PROD_ROUTER_ZERO_CONTRACT.candidate_overlay,'cerebro-console-gateway-human-v1-canary');
  assert.equal(PROD_ROUTER_ZERO_CONTRACT.live_canary_percent,0);
  assert.equal(PROD_ROUTER_ZERO_CONTRACT.consumer_routing_enabled,false);
  assert.equal(PROD_ROUTER_ZERO_CONTRACT.fail_closed_target,'OLD');
  assert.equal(PROD_ROUTER_ZERO_CONTRACT.prod_write_authorized,false);
  assert.equal(PROD_ROUTER_ZERO_CONTRACT.trading_access,false);
  assert.equal(PROD_ROUTER_ZERO_CONTRACT.additional_cost_eur,0);
});

test('live zero percent routes every cohort to OLD',()=>{
  for(let i=0;i<2000;i++)assert.equal(selectHumanRoute({cohortKey:`user-${i}`,canaryPercent:0}).route,'OLD');
});

test('nonzero rehearsal selection is deterministic and missing cohort fails closed',()=>{
  const a=selectHumanRoute({cohortKey:'stable-user-1',canaryPercent:1});
  const b=selectHumanRoute({cohortKey:'stable-user-1',canaryPercent:1});
  assert.deepEqual(a,b);
  assert.equal(a.bucket,stableBucket('stable-user-1'));
  assert.equal(selectHumanRoute({cohortKey:'',canaryPercent:1}).route,'OLD');
  assert.equal(selectHumanRoute({cohortKey:'',canaryPercent:1}).reason,'MISSING_STABLE_COHORT_KEY');
});

test('router refuses unsafe canary percentages',()=>{
  assert.throws(()=>selectHumanRoute({cohortKey:'x',canaryPercent:-1}),/unsafe_canary_percent/);
  assert.throws(()=>selectHumanRoute({cohortKey:'x',canaryPercent:25.01}),/unsafe_canary_percent/);
});

test('physical edge source is compiled zero, PREPROD normal routing disabled, and contains no privileged secret path',()=>{
  assert.match(edgeSource,/const LIVE_CANARY_PERCENT=0;/);
  assert.match(edgeSource,/PREPROD_NORMAL_ROUTING_DISABLED/);
  assert.match(edgeSource,/consumer_routing_enabled:false/);
  assert.match(edgeSource,/cerebro-console-gateway-v0/);
  assert.match(edgeSource,/cerebro-console-gateway-human-v1-canary/);
  assert.doesNotMatch(edgeSource,/SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(edgeSource,/prod_write_authorized\s*:\s*true/);
  assert.doesNotMatch(edgeSource,/trading_access\s*:\s*true/);
});
