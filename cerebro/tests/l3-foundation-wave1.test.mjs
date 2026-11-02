import test from 'node:test';
import assert from 'node:assert/strict';
import {manifest as notifManifest,planInternalNotifications} from '../runtime/l3/notif001-foundation-v1.mjs';
import {manifest as c360Manifest,buildCustomer360Snapshot} from '../runtime/l3/c360001-foundation-v1.mjs';
import {manifest as cmpManifest,triageComplaint} from '../runtime/l3/cmp001-foundation-v1.mjs';

const base={company_id:'fenix',principal_company_id:'fenix',environment:'PREPROD',version:'0.1.0-foundation'};

test('L3 foundation manifests remain zero-cost non-PROD and non-Trading',()=>{
  for(const m of [notifManifest,c360Manifest,cmpManifest]){
    assert.equal(m.layer,'L3');assert.equal(m.additional_cost_eur,0);assert.equal(m.prod_writes,false);assert.equal(m.trading_access,false);assert.equal(m.network_execution,false);assert.equal(m.promotion_authorized,false);
  }
});

test('NOTIF-001 wraps existing runtimes and deterministically deduplicates internal notifications',()=>{
  assert.ok(notifManifest.wrapped_existing_paths.includes('cerebro/communication/notif-native-v1.mjs'));
  const r=planInternalNotifications({...base,events:[{type:'TASK',record_id:'1'},{type:'TASK',record_id:'1'},{type:'RISK',record_id:'2'}]});
  assert.equal(r.notifications.length,2);assert.equal(r.deduplicated_count,1);assert.equal(r.external_delivery,false);
});

test('C360-001 wraps existing runtime and computes input-only completeness',()=>{
  assert.ok(c360Manifest.wrapped_existing_paths.includes('cerebro/customer/c360-native-v1.mjs'));
  const r=buildCustomer360Snapshot({...base,facets:{identity:{id:'synthetic'},contact:{},consent:{status:'unknown'}}});
  assert.equal(r.completeness_pct,43);assert.equal(r.source_mode,'INPUT_ONLY_NO_EXTERNAL_LOOKUP');assert.equal(r.prod_write,false);
});

test('CMP-001 provides deterministic complaint triage without external action',()=>{
  const r=triageComplaint({...base,repeat:true});assert.equal(r.status,'FOUNDATION_OK');assert.equal(r.severity,'MEDIUM');assert.equal(r.autonomous_external_response,false);
});

test('CMP-001 emits canonical LEGAL_REQUIRED for legal/regulatory complaint',()=>{
  const r=triageComplaint({...base,legal_claim:true});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.human_required_code,'LEGAL_REQUIRED');
});

test('all L3 foundation runtimes deny cross-company access',()=>{
  for(const fn of [planInternalNotifications,buildCustomer360Snapshot,triageComplaint]) assert.throws(()=>fn({...base,principal_company_id:'other-company'}),/CROSS_COMPANY_DENIED/);
});

test('all L3 foundation runtimes fail closed outside LAB PREPROD',()=>{
  for(const fn of [planInternalNotifications,buildCustomer360Snapshot,triageComplaint]) assert.throws(()=>fn({...base,environment:'PROD'}),/LAB or PREPROD/);
});
