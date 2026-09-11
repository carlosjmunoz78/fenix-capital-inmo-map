import test from 'node:test';
import assert from 'node:assert/strict';
import {planWebsiteAudit} from '../web/website-audit.mjs';
const context={company_id:'fenix',engine_id:'WAUD-001',environment:'SCAFFOLD',version:'0.1.0'};
test('WAUD-001 builds zero-cost read-only audit plan',()=>{const r=planWebsiteAudit({context,url:'https://fenixcapital.es',authorized:true,estimated_additional_cost_eur:0});assert.equal(r.status,'PLAN_READY');assert.equal(r.mode,'READ_ONLY_PUBLIC_AUDIT');assert.equal(r.additional_cost_target_eur,0);assert.equal(r.executed,false);assert.ok(r.checks.includes('seo_basics'));assert.ok(r.checks.includes('security_headers'));});
test('WAUD-001 blocks unauthorized/cost/prod',()=>{assert.equal(planWebsiteAudit({context,url:'https://fenixcapital.es',authorized:false}).reason,'POLICY_CONFLICT');assert.equal(planWebsiteAudit({context,url:'https://fenixcapital.es',authorized:true,estimated_additional_cost_eur:1}).reason,'MONEY_LIMIT');assert.equal(planWebsiteAudit({context,url:'https://fenixcapital.es',authorized:true,requires_prod_write:true}).reason,'HIGH_RISK');});
test('WAUD-001 fails closed on invalid URL/context',()=>{assert.throws(()=>planWebsiteAudit({context,url:'javascript:alert(1)',authorized:true}));assert.throws(()=>planWebsiteAudit({context:{...context,engine_id:'KW-001'},url:'https://fenixcapital.es',authorized:true}));});
