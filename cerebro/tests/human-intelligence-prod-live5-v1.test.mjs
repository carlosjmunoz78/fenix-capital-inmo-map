import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../../',import.meta.url);
const read=(path)=>readFileSync(new URL(path,root),'utf8');
const zeroCandidate=read('supabase/functions/cerebro-console-gateway-human-v1-canary/index.ts');
const zeroCandidateRouter=read('supabase/functions/cerebro-console-gateway-human-v1-canary/router.ts');
const live=read('supabase/functions/cerebro-console-gateway-human-v1-canary/live5.ts');
const liveRouter=read('supabase/functions/cerebro-console-gateway-human-v1-canary/router-live5.ts');
const zeroRouter=read('supabase/functions/cerebro-console-human-router-zero-v1/router.ts');

function stableBucket(value){
  let hash=2166136261;
  for(let i=0;i<value.length;i++){
    hash^=value.charCodeAt(i);
    hash=Math.imul(hash,16777619)>>>0;
  }
  return hash%10000;
}

test('immutable zero candidate and zero router remain compiled to zero',()=>{
  assert.match(zeroCandidate,/PROD_CANARY_UNROUTED/);
  assert.match(zeroCandidateRouter,/export const LIVE_CANARY_PERCENT=0;/);
  assert.match(zeroRouter,/export const LIVE_CANARY_PERCENT=0;/);
});

test('parallel live5 surface is bounded and always wraps OLD authority',()=>{
  assert.match(liveRouter,/export const LIVE_CANARY_PERCENT=5;/);
  assert.match(liveRouter,/export const MAX_CANARY_PERCENT=25;/);
  assert.match(liveRouter,/MISSING_STABLE_COHORT_KEY/);
  assert.match(live,/cerebro-console-gateway-human-v1-live5/);
  assert.match(live,/cerebro-console-gateway-v0/);
  assert.match(live,/OVERLAY_FAIL_SAFE/);
  assert.match(live,/prod_write_authorized:false/);
  assert.match(live,/trading_access:false/);
  assert.doesNotMatch(live,/SUPABASE_SERVICE_ROLE_KEY/);
});

test('deterministic cohort distribution stays approximately five percent',()=>{
  let selected=0;
  for(let i=0;i<10000;i++)if(stableBucket(`session-${i}`)<500)selected++;
  assert.ok(selected>=400&&selected<=600,`selected=${selected}`);
});

test('route audit is privacy-minimized and does not log request payloads',()=>{
  const audit=live.match(/function auditRoute\([\s\S]*?\}\n\nDeno\.serve/)?.[0]??'';
  assert.match(audit,/contains_user_data:false/);
  assert.match(audit,/prod_write_authorized:false/);
  assert.match(audit,/trading_access:false/);
  assert.doesNotMatch(audit,/user_message|authorization|cohort_key|access_token|refresh_token/i);
  assert.equal((live.match(/console\.log\(/g)??[]).length,1);
});

test('live5 never changes protected action semantics because it reuses conservative overlay',()=>{
  assert.match(live,/import \{ applyOverlay \} from "\.\/overlay\.ts"/);
  const overlay=read('supabase/functions/cerebro-console-gateway-human-v1-canary/overlay.ts');
  assert.match(overlay,/PROTECTED_STATUSES/);
  assert.match(overlay,/HUMAN_REQUIRED/);
  assert.match(overlay,/PROTECTED_OR_NONPASSIVE/);
  assert.match(overlay,/authoritative_preserved:true/);
});
