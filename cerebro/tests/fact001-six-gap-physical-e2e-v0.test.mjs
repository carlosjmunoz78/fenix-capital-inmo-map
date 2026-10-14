import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runFact001SixGapPhysicalE2EV0 } from '../runtime/fact001-six-gap-physical-e2e-v0.mjs';

const expectedItems=[47,48,57,62,74,183];

test('six-gap physical E2E harness proves local/durable scopes and leaves external bindings explicit', async () => {
  const dir=mkdtempSync(join(tmpdir(),'cerebro-six-gap-physical-'));
  try {
    const report=await runFact001SixGapPhysicalE2EV0({workdir:dir});
    assert.equal(report.status,'LOCAL_E2E_GREEN_PHYSICAL_EXTERNAL_BINDINGS_PENDING');
    assert.equal(report.environment,'PREPROD');
    assert.equal(report.passed,6);
    assert.equal(report.total,6);
    assert.deepEqual(report.results.map(x=>x.item),expectedItems);
    assert.equal(report.prod_authorized,false);
    assert.equal(report.prod_write_authorized,false);
    assert.equal(report.trading_access,false);
    assert.equal(report.additional_cost_eur,0);
    assert.deepEqual(report.human_required,[]);
    assert.match(report.evidence_sha256,/^[a-f0-9]{64}$/);
    assert.equal(report.results.every(x=>x.prod_authorized===false&&x.prod_write_authorized===false&&x.trading_access===false&&x.additional_cost_eur===0),true);
    assert.equal(report.results.every(x=>typeof x.remaining_gate==='string'&&x.remaining_gate.length>0),true);

    const byId=Object.fromEntries(report.results.map(x=>[x.item,x]));
    assert.equal(byId[47].state,'LOCAL_E2E_GREEN');
    assert.equal(byId[47].evidence.replay_status,'REPLAY_MATCH');
    assert.equal(byId[48].state,'GOVERNED_SHELL_GREEN_PHYSICAL_DEVICE_PENDING');
    assert.equal(byId[48].evidence.kill_switch_enabled,true);
    assert.equal(byId[48].evidence.blocked_reason,'KILL_SWITCH_ENABLED');
    assert.equal(byId[57].state,'DURABLE_SCHEDULER_E2E_GREEN_SOURCE_ADAPTER_PENDING');
    assert.equal(byId[57].evidence.job_status,'SUCCEEDED');
    assert.equal(byId[57].evidence.change_count,1);
    assert.equal(byId[62].state,'DURABLE_SCHEDULER_E2E_GREEN_SOURCE_ADAPTER_PENDING');
    assert.equal(byId[62].evidence.job_status,'SUCCEEDED');
    assert.equal(byId[62].evidence.company_count,1);
    assert.equal(byId[62].evidence.top_fit_score,100);
    assert.equal(byId[74].state,'LOCAL_HTTP_EMITTER_CAPTURE_E2E_GREEN_STAGING_BINDING_PENDING');
    assert.equal(byId[74].evidence.http_status,201);
    assert.equal(byId[74].evidence.persisted_events,1);
    assert.equal(byId[183].state,'LOCAL_PWA_SERVE_E2E_GREEN_MOBILE_BUILD_DEPLOY_PENDING');
    assert.equal(byId[183].evidence.pwa_http_status,200);
    assert.equal(byId[183].evidence.manifest_http_status,200);

    for(const file of ['compet-jobs.v8journal','cap-jobs.v8journal','first-party-events.v8journal']){
      assert.equal(fs.existsSync(join(dir,file)),true,file);
      assert.ok(fs.statSync(join(dir,file)).size>0,file);
    }
  } finally { rmSync(dir,{recursive:true,force:true}); }
});

test('re-running with a clean workdir is deterministic at semantic status scope', async () => {
  const a=mkdtempSync(join(tmpdir(),'cerebro-six-gap-a-'));
  const b=mkdtempSync(join(tmpdir(),'cerebro-six-gap-b-'));
  try {
    const first=await runFact001SixGapPhysicalE2EV0({workdir:a});
    const second=await runFact001SixGapPhysicalE2EV0({workdir:b});
    assert.equal(first.status,second.status);
    assert.deepEqual(first.results.map(x=>[x.item,x.state,x.remaining_gate]),second.results.map(x=>[x.item,x.state,x.remaining_gate]));
    assert.equal(first.results.find(x=>x.item===47).evidence.procedure_checksum,second.results.find(x=>x.item===47).evidence.procedure_checksum);
    assert.equal(first.results.find(x=>x.item===183).evidence.pwa_checksum,second.results.find(x=>x.item===183).evidence.pwa_checksum);
  } finally { rmSync(a,{recursive:true,force:true}); rmSync(b,{recursive:true,force:true}); }
});
