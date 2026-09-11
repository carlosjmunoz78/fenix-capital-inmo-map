import test from 'node:test';
import assert from 'node:assert/strict';
import {assessVentureOpportunity} from '../zero-cost-venture-factory.mjs';
const context={company_id:'fenix',engine_id:'VENT-001',environment:'SCAFFOLD',version:'0.1.0'};
const opportunity={opportunity_id:'opp-1',source_ref:'evidence://opp-1',hypothesis:'service demand exists',demand:90,margin:80,speed_to_validate:90,zero_cost_fit:100,reversibility:95,estimated_additional_cost_eur:0,confidence:0.9};
test('strong zero-cost opportunity reaches MVP_PLAN',()=>{const r=assessVentureOpportunity({context,opportunity,prod_write:false,legal_issue:false,paid_ads:false,stock_purchase:false,capex:false});assert.equal(r.status,'VENTURE_ASSESSED');assert.equal(r.decision,'MVP_PLAN');assert.equal(r.executed,false);});
test('paid spend requires MONEY_LIMIT',()=>{const r=assessVentureOpportunity({context,opportunity:{...opportunity,estimated_additional_cost_eur:10},prod_write:false,legal_issue:false,paid_ads:false,stock_purchase:false,capex:false});assert.equal(r.reason,'MONEY_LIMIT');});
test('legal issue requires LEGAL_REQUIRED',()=>{const r=assessVentureOpportunity({context,opportunity,prod_write:false,legal_issue:true,paid_ads:false,stock_purchase:false,capex:false});assert.equal(r.reason,'LEGAL_REQUIRED');});
test('low confidence requires LOW_CONFIDENCE',()=>{const r=assessVentureOpportunity({context,opportunity:{...opportunity,confidence:0.4},prod_write:false,legal_issue:false,paid_ads:false,stock_purchase:false,capex:false});assert.equal(r.reason,'LOW_CONFIDENCE');});
