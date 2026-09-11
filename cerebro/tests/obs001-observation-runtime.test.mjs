import test from 'node:test';
import assert from 'node:assert/strict';
import {ObservationLedgerV0,assessObservationSet,OBS001_CONTRACT} from '../knowledge/observation-runtime.mjs';

const c={company_id:'fenix',engine_id:'OBS-001',environment:'PREPROD',version:'0.1.0'};
const make=(x={})=>({context:c,observation_id:'o1',subject_ref:'KNW:k1',observed_at:'2026-09-11T12:00:00Z',source_ref:'PRV:p1',kind:'FACT',payload:{value:1},confidence:0.9,provenance_refs:['p1'],...x});

test('OBS-001 contract stays safe',()=>{assert.equal(OBS001_CONTRACT.append_only,true);assert.equal(OBS001_CONTRACT.prod_write,false);assert.equal(OBS001_CONTRACT.trading_access,false);assert.equal(OBS001_CONTRACT.knowledge_promotion,false);assert.equal(OBS001_CONTRACT.additional_cost_target_eur,0);});
test('append is immutable and idempotent',()=>{const l=new ObservationLedgerV0();assert.equal(l.append(make()).decision,'OBSERVATION_APPENDED');assert.equal(l.append(make()).decision,'OBSERVATION_IDEMPOTENT');assert.equal(l.append(make({payload:{value:2}})).reason,'POLICY_CONFLICT');});
test('cross-company observations fail closed',()=>{const l=new ObservationLedgerV0();l.append(make());const r=l.append(make({context:{...c,company_id:'other'}}));assert.equal(r.reason,'POLICY_CONFLICT');});
test('assessment requires enough confident observations',()=>{const l=new ObservationLedgerV0();const a=l.append(make({observation_id:'o1'})).row;const b=l.append(make({observation_id:'o2',source_ref:'PRV:p2',provenance_refs:['p2'],payload:{value:1}})).row;assert.equal(assessObservationSet({context:c,observations:[a]}).reason,'LOW_CONFIDENCE');assert.equal(assessObservationSet({context:c,observations:[a,b]}).status,'GREEN');});
test('low confidence and PROD fail closed',()=>{const l=new ObservationLedgerV0();const a=l.append(make({observation_id:'o1',confidence:0.2})).row;const b=l.append(make({observation_id:'o2',confidence:0.3})).row;assert.equal(assessObservationSet({context:c,observations:[a,b]}).reason,'LOW_CONFIDENCE');assert.throws(()=>l.append(make({context:{...c,environment:'PROD'}})),/LAB\/PREPROD/);});