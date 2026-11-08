import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildSeoEvidenceHandoffs} from '../runtime/seo-v11-evidence-gap-role-training.mjs';
const file='cerebro/seo-enterprise/v2/registry/seo001-v11-evidence-gap-role-training-2026-11-08.json';
const original=JSON.parse(fs.readFileSync(file,'utf8'));
const copy=()=>JSON.parse(JSON.stringify(original));
test('7 missing physical evidence gates mapped to existing qualified role templates',()=>{
 const r=buildSeoEvidenceHandoffs();
 assert.equal(r.handoffs.length,7);
 assert.equal(new Set(r.handoffs.map(x=>x.gate)).size,7);
 assert.equal(r.knowledge_binding_verified,true);
 assert.equal(r.missing_physical_evidence_count,7);
 assert.equal(r.role_exams_proven_passed,0);
 assert.equal(r.authenticated_agents_in_this_roster,0);
 assert.equal(r.autopublish_allowed,false);
 assert.equal(r.b2b_live_form_preflight.positive_e2e_verified,false);
 assert.equal(r.b2b_live_form_preflight.bridge_to_prod_host,true);
 assert.equal(r.b2b_live_form_preflight.safe_live_submit_allowed,false);
 assert.equal(r.independent_receipts_newly_created,0);
 assert.equal(r.handoffs.filter(x=>x.human_exception).length,2);
});
test('prove that copying media descriptions, screenshots or synthetic CI is not evidence',()=>{
 const o=buildSeoEvidenceHandoffs();
 for(const p of o.handoffs){
  assert.equal(p.status,'AWAITING_INDEPENDENT_REAL_PROOF');
  assert.equal(p.training_evidence_is_not_real_attestation,true);
  assert.equal(p.actor_iam_verified,false);
  assert.equal(p.release_authorized,false);
  assert.ok(p.failed_example.length>25);
 }
});
test('fail closed for missing knowledge, changed job scope, fake status or swapped experts',()=>{
 const mutation=[
  x=>x.company_id='other',
  x=>x.production_release=true,
  x=>x.real_exams_passed=7,
  x=>x.iam_actors_authenticated=7,
  x=>x.protocols[0].owner_role='SEO-D13:SPECIALIST:01',
  x=>x.protocols[0].competency='not really trained',
  x=>x.protocols[0].human_exception='AUTO_PUBLISH',
  x=>x.protocols[0].gate='THREE_OWNER_SIGNED_PUBLISHES',
  x=>x.protocols[0].required_proof='',
  x=>x.operating_contract.no_publish=false
 ];
 for(const change of mutation){
  const x=copy();change(x);
  assert.throws(()=>buildSeoEvidenceHandoffs({registry:x}),/SEO001_V11_/);
 }
});

test('real WordPress form preflight remains HOLD; reject invented E2E and production submission',()=>{
 const path='cerebro/seo-enterprise/v2/registry/seo001-v11-b2b-live-form-static-readonly-2026-11-08.json';
 const raw=JSON.parse(fs.readFileSync(path,'utf8'));
 for(const mutate of [
   x=>x.observed_limitations.crm_row_created_verified=true,
   x=>x.route_contract.positive_test_safe_on_live_site=true,
   x=>x.observed_limitations.production_requests_sent=1,
   x=>x.crm_writes=1,
   x=>x.status='CERTIFIED'
 ]){
  const m=JSON.parse(JSON.stringify(raw));mutate(m);
  assert.throws(()=>buildSeoEvidenceHandoffs({routeAudit:m}),/SEO001_V11_B2B_ROUTE_NOT_ISOLATED/);
 }
});
