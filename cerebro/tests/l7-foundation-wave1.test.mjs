import test from 'node:test';
import assert from 'node:assert/strict';
import {ENGINE_DEFINITIONS,foundationManifest,executeFoundation} from '../runtime/l7/foundation-engines-v1.mjs';

const EXPECTED=['STR-001','FRC-001','CAPA-001','OPP-001','INN-001','LAB-TRD','LAB-SEO','LAB-MKT','LAB-AI','LAB-AUT','MKT-002','EXPAND-001','FRAN-001','VENT-001'];
const ctx={company_id:'fenix',principal_company_id:'fenix',environment:'LAB'};

test('L7 foundation covers exactly the 14 nonphysical engines and preserves EXP-001',()=>{
  assert.deepEqual(ENGINE_DEFINITIONS.map(x=>x.engine_id),EXPECTED);
  assert.equal(ENGINE_DEFINITIONS.some(x=>x.engine_id==='EXP-001'),false);
});
test('all L7 manifests are zero-cost LAB/PREPROD-only and deny Trading/PROD writes',()=>{
  for(const id of EXPECTED){const m=foundationManifest(id);assert.equal(m.layer,'L7');assert.equal(m.prod_writes,false);assert.equal(m.trading_access,false);assert.equal(m.additional_cost_eur,0);assert.equal(m.promotion_authorized,false);}
});
test('multi-company isolation and PROD denial are enforced',()=>{
  assert.throws(()=>executeFoundation('STR-001',{company_id:'a',principal_company_id:'b',environment:'LAB'}),/CROSS_COMPANY_DENIED/);
  assert.throws(()=>executeFoundation('STR-001',{company_id:'a',environment:'PROD'}),/LAB or PREPROD/);
});
test('partial engines are WRAP_PRESERVE and retain observed paths',()=>{
  assert.ok(foundationManifest('INN-001').wrapped_existing_paths.includes('cerebro/runtime/cerebro-technical-specialists-v1.mjs'));
  assert.ok(foundationManifest('LAB-MKT').wrapped_existing_paths.includes('cerebro/integrations/canva/canva-capability-router-v1.mjs'));
  assert.ok(foundationManifest('EXPAND-001').wrapped_existing_paths.includes('cerebro/runtime/compet-real-consumer-adoption-v1.mjs'));
});
test('deterministic strategy and forecast foundations execute real logic',()=>{
  const a=executeFoundation('STR-001',{...ctx,options:[{id:'A',value:40,risk:10,effort:5},{id:'B',value:20,risk:0,effort:0}]});
  const b=executeFoundation('STR-001',{...ctx,options:[{id:'A',value:40,risk:10,effort:5},{id:'B',value:20,risk:0,effort:0}]});
  assert.deepEqual(a,b);assert.equal(a.recommendation,'A');
  assert.equal(executeFoundation('FRC-001',{...ctx,series:[10,20,30]}).forecast,20);
  assert.equal(executeFoundation('CAPA-001',{...ctx,demand:12,capacity:10}).gap,2);
});
test('LAB-TRD is a physical isolation guard, not Trading execution',()=>{
  const r=executeFoundation('LAB-TRD',ctx);assert.equal(r.status,'ISOLATED_LAB_FOUNDATION');assert.equal(r.trading_execution,false);assert.equal(r.credential_access,false);assert.equal(r.shared_prod_resources,false);assert.equal(r.network_execution,false);
});
test('money and high-risk boundaries emit canonical HUMAN_REQUIRED',()=>{
  assert.equal(executeFoundation('OPP-001',{...ctx,requested_spend_eur:1,preauthorized_spend_eur:0}).human_required_code,'MONEY_LIMIT');
  assert.equal(executeFoundation('VENT-001',{...ctx,high_risk:true}).human_required_code,'HIGH_RISK');
});
