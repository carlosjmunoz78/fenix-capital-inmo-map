import test from 'node:test';
import assert from 'node:assert/strict';
import {validateZeroCostSmokeEvidence} from '../runtime/zero-cost-smoke-evidence.mjs';

function report(overrides={}){return {state_type:'CEREBRO_UMS_ZERO_COST_SMOKE_REPORT_V1',environment:'PREPROD',observed_at:'2026-10-25T15:00:00Z',installation_performed:false,network_download_performed:false,external_network_used_by_test:false,input_html_sha256:'a'.repeat(64),runtimes:{chrome:{found:true,version:'Chrome test'},node:{found:true,version:'v24'},python:{found:true,version:'Python 3.12'}},outputs:{browser_screenshot:{mime:'image/png',sha256:'b'.repeat(64),bytes:1234,width:640,height:360}},...overrides};}

test('valid physical smoke becomes PREPROD smoke evidence only',()=>{
  const evidence=validateZeroCostSmokeEvidence(report());
  assert.equal(evidence.status,'PREPROD_SMOKE_GREEN');
  assert.deepEqual(evidence.validated_adapters,['ADAPTER-CHROME','ADAPTER-NODE','ADAPTER-PYTHON']);
  assert.equal(evidence.preprod_smoke_claim,true);
  assert.equal(evidence.prod_operational_claim,false);
  assert.equal(evidence.benchmark_credit,false);
  assert.equal(evidence.readiness_mutation,false);
  assert.equal(evidence.additional_cost_eur,0);
});

test('network or install activity fails closed',()=>{
  assert.throws(()=>validateZeroCostSmokeEvidence(report({external_network_used_by_test:true})),/ZERO_INSTALL_ZERO_NETWORK/);
  assert.throws(()=>validateZeroCostSmokeEvidence(report({installation_performed:true})),/ZERO_INSTALL_ZERO_NETWORK/);
});

test('invalid screenshot evidence cannot become green',()=>{
  const bad=report();bad.outputs.browser_screenshot.sha256='bad';
  assert.throws(()=>validateZeroCostSmokeEvidence(bad),/BROWSER_SCREENSHOT_EVIDENCE_INVALID/);
});
