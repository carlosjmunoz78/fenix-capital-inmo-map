import test from 'node:test';
import assert from 'node:assert/strict';
import {Observ001ControlPlaneV1,OBSERV001_CONTROL_PLANE_V1_CONTRACT} from '../runtime/observ001-control-plane-v1.mjs';

const write={id:'qa',scopes:['observability:write','observability:read']};
const read={id:'reader',scopes:['observability:read']};
const ctx={company_id:'fenix',engine_id:'JOB-001',environment:'PREPROD',version:'1.0.0'};
const at='2026-11-02T00:00:00.000Z';

test('normalizes dispersed sources under one correlation id and keeps zero-cost isolation',()=>{
  const cp=new Observ001ControlPlaneV1();
  for(const [source,kind] of [['GITHUB_REPO','EVENT'],['GITHUB_ACTIONS','TRACE'],['SUPABASE_LOG','JSON_LOG'],['VM_LOG','METRIC']]){
    cp.ingest({actor:write,context:ctx,source,kind,correlation_id:'flow-001',observed_at:at,payload:{message:'ok',token:'do-not-store'}});
  }
  const rows=cp.query({actor:read,company_id:'fenix',correlation_id:'flow-001'});
  assert.equal(rows.length,4); assert.ok(rows.every(x=>x.correlation_id==='flow-001'));
  assert.ok(rows.every(x=>x.payload.token==='[REDACTED]'));
  const health=cp.health({actor:read,company_id:'fenix'});
  assert.equal(health.status,'GREEN'); assert.equal(health.events_total,4); assert.equal(health.additional_cost_eur,0);
  assert.equal(health.prod_write_authorized,false); assert.equal(health.trading_access,false);
  assert.equal(OBSERV001_CONTROL_PLANE_V1_CONTRACT.engine_id,'OBSERV-001');
});

test('fails closed on missing correlation id, unauthorized source, PROD and missing scope',()=>{
  const cp=new Observ001ControlPlaneV1();
  assert.throws(()=>cp.ingest({actor:write,context:ctx,source:'VM_LOG',kind:'EVENT',observed_at:at,payload:{}}),/MISSING_CORRELATION_ID/);
  assert.throws(()=>cp.ingest({actor:write,context:ctx,source:'UNKNOWN',kind:'EVENT',correlation_id:'x',observed_at:at,payload:{}}),/SOURCE_DENIED/);
  assert.throws(()=>cp.ingest({actor:write,context:{...ctx,environment:'PROD'},source:'VM_LOG',kind:'EVENT',correlation_id:'x',observed_at:at,payload:{}}),/PROD_WRITE_DENIED/);
  assert.throws(()=>cp.ingest({actor:read,context:ctx,source:'VM_LOG',kind:'EVENT',correlation_id:'x',observed_at:at,payload:{}}),/PERMISSION_DENIED/);
});

test('enforces company isolation and deterministic health trace',()=>{
  const cp=new Observ001ControlPlaneV1();
  cp.ingest({actor:write,context:ctx,source:'CEREBRO_RUNTIME',kind:'EVENT',correlation_id:'x',observed_at:at,payload:{value:1}});
  cp.ingest({actor:write,context:{...ctx,company_id:'other'},source:'CEREBRO_RUNTIME',kind:'EVENT',correlation_id:'x',observed_at:at,payload:{value:2}});
  assert.equal(cp.query({actor:read,company_id:'fenix'}).length,1);
  assert.equal(cp.query({actor:read,company_id:'other'}).length,1);
  assert.equal(cp.health({actor:read,company_id:'fenix'}).trace,cp.health({actor:read,company_id:'fenix'}).trace);
});
