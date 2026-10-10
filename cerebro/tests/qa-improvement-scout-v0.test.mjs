import test from 'node:test';
import assert from 'node:assert/strict';
import {buildImprovementScoutState} from '../qa/improvement-scout.mjs';

function reportWithObservation(observation,{duration=1200,project='mobile-chromium'}={}){
  return {suites:[{title:'CEREBRO',specs:[{title:`[${observation.kind}] surface · human read-only journey`,tests:[{projectName:project,status:'expected',results:[{status:'passed',duration,stdout:[{text:`CEREBRO_OBS:${JSON.stringify({...observation,project})}\n`}]}]}]}]}]};
}

test('scout converts measured human observations into low-risk PREPROD improvement candidates',()=>{
  const state=buildImprovementScoutState({
    report:reportWithObservation({kind:'WEB',url:'https://fenixcapital.es',mainCount:0,h1Count:2,unnamedInteractiveCount:3,unlabeledInputs:1,imagesMissingAlt:2,smallTouchTargets:6,horizontalOverflow:false,visibleTextChars:2500,ctaCount:0}),
    quality:{coverage:{app_authenticated:'POR_AUDITAR_PREPROD_HARNESS',products:'POR_AUDITAR_CANONICAL_PREPROD_TARGET'}},
    now:'2026-10-11T01:00:00Z'
  });
  assert.equal(state.status,'IMPROVEMENTS_FOUND');
  assert.ok(state.candidates_total>=7);
  assert.ok(state.candidates.some(x=>x.engine_id==='HCI-001'&&x.dimension==='accessibility_names'));
  assert.ok(state.candidates.some(x=>x.engine_id==='SEO-001'&&x.dimension==='information_architecture'));
  assert.ok(state.candidates.some(x=>x.engine_id==='QA-001'&&x.dimension==='qa_coverage'));
  assert.ok(state.candidates.every(x=>x.environment==='PREPROD'&&x.auto_fix_eligible===false&&x.prod_write_authorized===false&&x.additional_cost_eur===0));
  assert.deepEqual(state.human_required,[]);
});

test('scout stays GREEN when observations and coverage contain no measured improvement signal',()=>{
  const state=buildImprovementScoutState({
    report:reportWithObservation({kind:'APP',url:'https://app.fenixcapital.es',mainCount:1,h1Count:1,unnamedInteractiveCount:0,unlabeledInputs:0,imagesMissingAlt:0,smallTouchTargets:0,horizontalOverflow:false,visibleTextChars:800,ctaCount:2},{project:'desktop-chromium'}),
    quality:{coverage:{app_authenticated:'ENABLED_SYNTHETIC_PREPROD',products:'ENABLED_SYNTHETIC_PREPROD'}},
    now:'2026-10-11T01:00:00Z'
  });
  assert.equal(state.status,'GREEN_NO_IMPROVEMENTS');
  assert.equal(state.candidates_total,0);
  assert.equal(state.safety.prod_write,false);
  assert.equal(state.safety.additional_subscription_eur,0);
});
