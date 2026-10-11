import test from 'node:test';
import assert from 'node:assert/strict';
import {buildQualityState} from '../qa/quality-delta.mjs';

function report(specs) {
  return {suites:[{title:'CEREBRO',specs:specs.map(({title,project='Desktop Chrome',status='expected',result='passed',errors=[]})=>({title,tests:[{projectName:project,status,results:[{status:result,duration:10,errors}]}]}))}]};
}

test('green read-only run creates a measured GREEN state',()=>{
  const state=buildQualityState({report:report([
    {title:'[WEB] public human read-only journey'},
    {title:'[APP] public shell human read-only journey'}
  ]),previous:{},targetsRegistry:{targets:[]},now:'2026-10-11T00:00:00Z'});
  assert.equal(state.status,'GREEN');
  assert.equal(state.quality_score,100);
  assert.equal(state.targets.WEB.status,'GREEN');
  assert.equal(state.targets.APP.status,'GREEN');
  assert.equal(state.targets.PRODUCT.status,'POR_AUDITAR');
  assert.equal(state.coverage.app_authenticated,'POR_AUDITAR_PREPROD_HARNESS');
  assert.deepEqual(state.human_required,[]);
  assert.equal(state.safety.prod_write,false);
  assert.equal(state.safety.customer_data,false);
  assert.equal(state.safety.trading,false);
  assert.equal(state.safety.additional_subscription_eur,0);
});

test('isolated authenticated App journeys become continuous evidence without pretending deployed PREPROD',()=>{
  const state=buildQualityState({
    report:report([{title:'[APP] public shell human read-only journey'}]),
    authenticatedReport:report([{title:'real five flow authenticated synthetic journey',project:'desktop-chromium'}]),
    previous:{},targetsRegistry:{targets:[]},now:'2026-10-11T00:00:00Z'
  });
  assert.equal(state.status,'GREEN');
  assert.equal(state.targets.APP_AUTH_SYNTHETIC_LOCAL.status,'GREEN');
  assert.equal(state.targets.APP_AUTH_SYNTHETIC_LOCAL.executed,1);
  assert.equal(state.coverage.app_authenticated,'LOCAL_ISOLATED_SYNTHETIC_NO_CUSTOMER_DATA');
  assert.equal(state.coverage.app_authenticated_deployed_preprod,'POR_AUDITAR_CANONICAL_PREPROD_TARGET');
  assert.equal(state.safety.prod_write,false);
  assert.equal(state.safety.customer_data,false);
});

test('authenticated synthetic failure is routed to APP-001 as a real QA finding',()=>{
  const state=buildQualityState({
    report:report([{title:'[APP] public shell human read-only journey'}]),
    authenticatedReport:report([{title:'authenticated expediente flow',project:'desktop-chromium',status:'unexpected',result:'failed',errors:[{message:'button did not complete'}]}]),
    previous:{issue_fingerprints:[]},targetsRegistry:{targets:[]},now:'2026-10-11T00:00:00Z'
  });
  assert.equal(state.status,'FINDINGS_OPEN');
  assert.equal(state.new_issues.length,1);
  assert.equal(state.new_issues[0].kind,'APP');
  assert.equal(state.new_issues[0].owner_engine,'APP-001');
  assert.match(state.new_issues[0].title,/AUTH_SYNTHETIC_LOCAL/);
  assert.equal(state.targets.APP_AUTH_SYNTHETIC_LOCAL.status,'RED');
  assert.equal(state.safety.prod_write,false);
});

test('new failure is fingerprinted and routed without auto-fix or PROD authority',()=>{
  const state=buildQualityState({report:report([
    {title:'[APP] public shell pageerror',status:'unexpected',result:'failed',errors:[{message:'pageerror crash'}]}
  ]),previous:{issue_fingerprints:[]},targetsRegistry:{targets:[]},now:'2026-10-11T00:00:00Z'});
  assert.equal(state.status,'FINDINGS_OPEN');
  assert.equal(state.new_issues.length,1);
  assert.equal(state.new_issues[0].owner_engine,'APP-001');
  assert.equal(state.new_issues[0].auto_fix_eligible,false);
  assert.equal(state.new_issues[0].severity,'HIGH');
  assert.equal(state.dispatch_queue.length,1);
  assert.equal(state.safety.prod_write,false);
});

test('OLD vs NEW delta resolves prior fingerprints deterministically',()=>{
  const first=buildQualityState({report:report([{title:'[WEB] availability',status:'unexpected',result:'failed'}]),previous:{issue_fingerprints:[]},targetsRegistry:{targets:[]},now:'2026-10-11T00:00:00Z'});
  const second=buildQualityState({report:report([{title:'[WEB] availability'}]),previous:first,targetsRegistry:{targets:[]},now:'2026-10-11T04:00:00Z'});
  assert.equal(second.resolved_issue_fingerprints.length,1);
  assert.equal(second.new_issue_fingerprints.length,0);
  assert.equal(second.quality_delta,12);
});

test('same finding becomes recurring and is not redispatched as new',()=>{
  const first=buildQualityState({report:report([{title:'[WEB] responsive',status:'unexpected',result:'failed'}]),previous:{issue_fingerprints:[]},targetsRegistry:{targets:[]}});
  const second=buildQualityState({report:report([{title:'[WEB] responsive',status:'unexpected',result:'failed'}]),previous:first,targetsRegistry:{targets:[]}});
  assert.equal(second.recurring_issues,1);
  assert.equal(second.new_issue_fingerprints.length,0);
  assert.equal(second.dispatch_queue.length,0);
});
