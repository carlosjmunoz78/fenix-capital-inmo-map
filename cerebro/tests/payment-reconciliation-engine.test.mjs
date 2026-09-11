import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileClosingPayments} from '../notarial/payment-reconciliation-engine.mjs';
const context={company_id:'fenix',engine_id:'PAY-001',environment:'PREPROD',version:'0.1.0'};
const base={context,authorized:true,requires_prod_write:false,confidence:.95,source_refs:['closing:1'],sale_price_cents:20000000,arras_cents:2000000,encumbrance_cents:1000000,fenix_fees_cents:50000,other_adjustments_cents:0,payment_instruments_cents:[17050000]};
test('PAY-001 reconciles exactly to cent',()=>{const r=reconcileClosingPayments(base);assert.equal(r.status,'PAYMENT_RECONCILED');assert.equal(r.delta_cents,0);assert.equal(r.double_check.arithmetic_match,true);});
test('PAY-001 blocks any mismatch',()=>{const r=reconcileClosingPayments({...base,payment_instruments_cents:[17049999]});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'HIGH_RISK');assert.equal(r.delta_cents,-1);});
test('PAY-001 requires integer cents/evidence',()=>{assert.throws(()=>reconcileClosingPayments({...base,sale_price_cents:1.5}));assert.throws(()=>reconcileClosingPayments({...base,source_refs:[]}));assert.equal(reconcileClosingPayments({...base,confidence:.2}).reason,'LOW_CONFIDENCE');});
