import test from 'node:test';
import assert from 'node:assert/strict';
import registry from '../registry/physical-adapter-candidates.json' with {type:'json'};
import {evaluatePhysicalAdapterEvidence} from '../runtime/physical-adapter-evidence.mjs';

function report(probes){return {state_type:'CEREBRO_UMS_RUNTIME_PROBE_REPORT_V1',runner:'unit-test',observed_at:'2026-10-25T00:00:00Z',probes};}

test('found binaries become PREPROD_DISCOVERED only, never operational or PROD bound',()=>{
  const result=evaluatePhysicalAdapterEvidence({registry,probe_report:report([{key:'ffmpeg',found:true,path:'/usr/bin/ffmpeg',version:'ffmpeg version test'},{key:'node',found:true,path:'/usr/bin/node',version:'v24.0.0'}])});
  assert.equal(result.discovered,2);
  assert.equal(result.prod_bound,0);
  assert.equal(result.operational_claims,0);
  for(const adapter of result.adapters.filter((x)=>x.status==='PREPROD_DISCOVERED')){
    assert.equal(adapter.smoke_test_status,'NOT_RUN');
    assert.equal(adapter.license_status,'REVIEW_REQUIRED');
    assert.equal(adapter.security_status,'REVIEW_REQUIRED');
    assert.equal(adapter.prod_binding_status,'NOT_BOUND');
    assert.equal(adapter.operational_claim,false);
  }
});

test('missing binaries remain unavailable without causing fabricated capabilities',()=>{
  const result=evaluatePhysicalAdapterEvidence({registry,probe_report:report([])});
  assert.equal(result.discovered,0);
  assert.equal(result.unavailable,registry.candidates.length);
  assert.ok(result.adapters.every((x)=>x.status==='UNAVAILABLE_IN_PROBED_RUNTIME'));
});

test('authority remains zero-cost and non-mutating regardless of discovery',()=>{
  const result=evaluatePhysicalAdapterEvidence({registry,probe_report:report([{key:'blender',found:true,path:'/usr/bin/blender',version:'Blender test'}])});
  assert.equal(result.prod_authorized,false);
  assert.equal(result.prod_write_authorized,false);
  assert.equal(result.installation_authorized,false);
  assert.equal(result.network_download_authorized,false);
  assert.equal(result.spend_authorized,false);
  assert.equal(result.additional_cost_eur,0);
  assert.equal(result.trading_access,false);
});
