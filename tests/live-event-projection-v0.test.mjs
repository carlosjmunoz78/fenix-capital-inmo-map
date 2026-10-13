import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLiveEventProjection,buildEngineActivitySnapshot,LIVE_EVENT_PROJECTION_V0_CONTRACT} from '../cerebro/runtime/live-event-projection-v0.mjs';

const ctx={company_id:'fenix',engine_id:'MOTION-001',environment:'PREPROD',version:'0.1.0'};

test('real EVT-001 evidence marks only the canonical engine as active',()=>{
  const projection=buildLiveEventProjection({observed_at:'2026-10-13T01:00:00Z',sources:[{kind:'EVT001',synthetic:false,evidence_ref:'test:evt001-real',events:[{event_id:'event_real_1',type:'MOTION_STATE',payload:{state:'PROCESSING'},context:ctx,status:'PENDING'}]}]});
  assert.equal(projection.real_events_total,1);
  assert.equal(projection.synthetic_events_total,0);
  const snapshot=buildEngineActivitySnapshot({projection,registry_ids:['MOTION-001','HCI-001']});
  assert.equal(snapshot.active_engine_count,1);
  assert.equal(snapshot.activity.find(x=>x.engine_id==='MOTION-001').truth_state,'REAL_EVENT_EVIDENCE');
  assert.equal(snapshot.activity.find(x=>x.engine_id==='HCI-001').truth_state,'NO_REAL_EVENT_EVIDENCE');
});

test('synthetic QA event never marks an engine as live',()=>{
  const projection=buildLiveEventProjection({observed_at:'2026-10-13T01:00:00Z',sources:[{kind:'SYNTHETIC_LAB',synthetic:true,evidence_ref:'test:synthetic',events:[{event_id:'event_demo_1',type:'DEMO_SIGNAL',payload:{secret_token:'must-not-leak',demo:true},context:ctx,status:'PENDING'}]}]});
  assert.equal(projection.real_events_total,0);
  assert.equal(projection.synthetic_events_total,1);
  assert.equal(Object.hasOwn(projection.events[0].payload,'secret_token'),false);
  const snapshot=buildEngineActivitySnapshot({projection,registry_ids:['MOTION-001']});
  assert.equal(snapshot.active_engine_count,0);
  assert.equal(snapshot.activity[0].synthetic_event_count,1);
  assert.equal(snapshot.activity[0].truth_state,'NO_REAL_EVENT_EVIDENCE');
});

test('source descriptor must explicitly declare synthetic truth',()=>{
  assert.throws(()=>buildLiveEventProjection({observed_at:'2026-10-13T01:00:00Z',sources:[{kind:'EVT001',evidence_ref:'bad',events:[]}]}),/source.synthetic boolean required/);
});

test('duplicate event id with conflicting bodies fails closed',()=>{
  assert.throws(()=>buildLiveEventProjection({observed_at:'2026-10-13T01:00:00Z',sources:[
    {kind:'EVT001',synthetic:false,evidence_ref:'a',events:[{event_id:'same',type:'A',payload:{x:1},context:ctx,status:'PENDING'}]},
    {kind:'EVT001',synthetic:false,evidence_ref:'b',events:[{event_id:'same',type:'B',payload:{x:2},context:ctx,status:'PENDING'}]}
  ]}),/event identity conflict/);
});

test('contract is read-only, zero-cost and non-PROD',()=>{
  assert.deepEqual(LIVE_EVENT_PROJECTION_V0_CONTRACT,{mode:'READ_ONLY_SIDECAR',mutates_evt001:false,mutates_job001:false,requires_explicit_synthetic_label:true,unknown_is_not_live:true,raw_secrets_filtered:true,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
});
