import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../../supabase/functions/cerebro-console-gateway-human-v1-canary/',import.meta.url);
const indexSource=readFileSync(new URL('index.ts',root),'utf8');
const routerSource=readFileSync(new URL('router.ts',root),'utf8');
const overlaySource=readFileSync(new URL('overlay.ts',root),'utf8');

test('Human canary V2 is compiled to NEW 0% and fails closed to OLD',()=>{
  assert.match(routerSource,/export const LIVE_CANARY_PERCENT=0;/);
  assert.match(routerSource,/ZERO_FAIL_CLOSED/);
  assert.match(routerSource,/MISSING_STABLE_COHORT_KEY/);
  assert.match(routerSource,/percent>25/);
  assert.match(indexSource,/fail_closed_target:'OLD'/);
  assert.match(indexSource,/consumer_routing_enabled:false/);
  assert.match(indexSource,/live_canary_percent:LIVE_CANARY_PERCENT/);
});

test('Human canary V2 preserves stable authority and only overlays NEW chat path',()=>{
  assert.match(indexSource,/cerebro-console-gateway-v0/);
  assert.match(indexSource,/if\(routing\.route==='OLD'\)/);
  assert.match(indexSource,/pass-through-zero/);
  assert.match(indexSource,/routing\.route==='OLD'/);
  assert.match(indexSource,/applyOverlay/);
  assert.match(indexSource,/route\.path!=='\/chat'/);
});

test('OIDC rehearsals do not invoke upstream and routing rehearsal is synthetic only',()=>{
  assert.match(indexSource,/\/canary\/router-rehearsal/);
  assert.match(indexSource,/upstream_prod_chat_called:false/);
  assert.match(indexSource,/route_state_mutated:false/);
  assert.match(indexSource,/synthetic_only:true/);
  assert.match(indexSource,/traffic_enabled:false/);
});

test('Human canary V2 cannot grant write or Trading authority and has no service-role secret',()=>{
  const bundle=`${indexSource}\n${routerSource}\n${overlaySource}`;
  assert.doesNotMatch(bundle,/SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(bundle,/prod_write_authorized\s*:\s*true/);
  assert.doesNotMatch(bundle,/trading_access\s*:\s*true/);
  assert.match(indexSource,/additional_cost_eur:0/);
});
