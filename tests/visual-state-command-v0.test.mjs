import test from 'node:test';
import assert from 'node:assert/strict';
import {CerebroGatewayV0} from '../cerebro/console/gateway.mjs';
import {registerVisualStateCommand,buildVisualStateSnapshot} from '../cerebro/console/visual-state-command-v0.mjs';

const registry={count:2,engine_ids:['APP-001','MOTION-001']};
const reconciliation={state_type:'CEREBRO_ENGINE_REALITY_RECONCILIATION_V0',registry_default_state:'UNKNOWN_REQUIRES_AUDIT',prod_authorized:false,additional_cost_eur:0,evidence_overrides:[{engine_id:'APP-001',state:'CONFIRMED_OPERATIONAL_EXISTING_SURFACE_ONLY',live_connected:true}],verified_dependency_edges:[['APP-001','MOTION-001']],noncanonical_candidates:[]};

test('snapshot never upgrades unknown engines or invents jobs/artifacts',()=>{
  const snap=buildVisualStateSnapshot({registry,reconciliation,company_id:'fenix',environment:'PREPROD',version:'0.1.0',observed_at:'2026-10-13T01:30:00Z'});
  assert.equal(snap.canonical_engine_count,2);
  assert.equal(snap.live_active_engine_count,0);
  assert.equal(snap.engines.find(e=>e.engine_id==='MOTION-001').evidence_state,'UNKNOWN_REQUIRES_AUDIT');
  assert.equal(snap.engines[0].current_job_state,'NOT_PROVEN');
  assert.equal(snap.engines[0].artifact_state,'NOT_PROVEN');
});

test('only REAL_EVIDENCE events mark live activity',()=>{
  const projection={state_type:'CEREBRO_LIVE_EVENT_PROJECTION_V0',events:[
    {engine_id:'APP-001',event_id:'real1',event_type:'READ',truth_class:'REAL_EVIDENCE',observed_at:'2026-10-13T01:00:00Z',evidence_ref:'real'},
    {engine_id:'MOTION-001',event_id:'demo1',event_type:'DEMO',truth_class:'SYNTHETIC_LAB',observed_at:'2026-10-13T01:10:00Z',evidence_ref:'demo'}
  ]};
  const snap=buildVisualStateSnapshot({registry,reconciliation,event_projection:projection,company_id:'fenix',environment:'PREPROD',version:'0.1.0',observed_at:'2026-10-13T01:30:00Z'});
  assert.equal(snap.live_active_engine_count,1);
  assert.equal(snap.engines.find(e=>e.engine_id==='APP-001').live_activity,true);
  assert.equal(snap.engines.find(e=>e.engine_id==='MOTION-001').live_activity,false);
});

test('Gateway command is read-only PREPROD and returns canonical context',async()=>{
  const gateway=new CerebroGatewayV0({environment:'PREPROD',version:'0.1.0'});
  gateway.createSession({session_id:'s1',company_id:'fenix',context:{engine_id:'CONSOLE-001'}});
  const reg=registerVisualStateCommand({gateway,registry,reconciliation,clock:()=>new Date('2026-10-13T01:30:00Z')});
  assert.equal(reg.read_only,true);
  const result=await gateway.execute({session_id:'s1',command:'visual.snapshot'});
  assert.equal(result.company_id,'fenix');
  assert.equal(result.environment,'PREPROD');
  assert.equal(result.prod_authorized,false);
  assert.equal(result.canonical_engine_count,2);
});
