import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProductDeepState} from '../qa/product-deep-state.mjs';

function report(status='expected',result='passed'){
  return {suites:[{title:'product',specs:[{title:'[PRODUCT] [AION_DEEP_ZERO_PAYMENT] AION-P001 journey',tests:[{status,results:[{status:result}]}]}]}]};
}

test('green deep run records zero-payment PREPROD evidence only',()=>{
  const state=buildProductDeepState({report:report(),previous:{},productId:'AION-P001',now:'2026-10-11T09:00:00Z'});
  assert.equal(state.status,'PREPROD_GREEN');
  assert.equal(state.tests.executed,1);
  assert.deepEqual(state.products_verified,['AION-P001']);
  assert.equal(state.safety.real_charge_eur,0);
  assert.equal(state.authority.real_charge_authorized,false);
  assert.equal(state.authority.prod_authorized,false);
  assert.equal(state.authority.prod_write_authorized,false);
  assert.equal(state.safety.customer_data,false);
  assert.equal(state.safety.additional_subscription_eur,0);
});

test('rotating history accumulates independent product evidence',()=>{
  const first=buildProductDeepState({report:report(),previous:{},productId:'AION-P001',now:'2026-10-11T09:00:00Z'});
  const second=buildProductDeepState({report:report(),previous:first,productId:'AION-P002',now:'2026-10-12T09:00:00Z'});
  assert.deepEqual(second.products_verified,['AION-P001','AION-P002']);
  assert.equal(second.coverage.fresh_7d_total,2);
  assert.equal(second.coverage.all_fresh_7d,false);
});

test('failed deep journey fails closed and does not certify product',()=>{
  const state=buildProductDeepState({report:report('unexpected','failed'),previous:{},productId:'AION-P003'});
  assert.equal(state.status,'RED');
  assert.equal(state.tests.failed,1);
  assert.equal(state.products_verified.length,0);
  assert.equal(state.authority.prod_authorized,false);
});
