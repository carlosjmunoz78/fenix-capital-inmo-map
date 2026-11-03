import test from 'node:test';
import assert from 'node:assert/strict';
import {Knw001KnowledgeStoreV1,Trn001TrainingLedgerV1,Finops001CostLedgerV1,FOUNDATION_HOLDS_V1_CONTRACT} from '../runtime/foundation-holds-v1.mjs';

const t='2026-11-03T15:10:00.000Z';
test('KNW lifecycle, provenance, conflicts and tenant isolation',()=>{
 const k=new Knw001KnowledgeStoreV1();
 k.put({company_id:'fenix',engine_id:'KNW-001',environment:'PREPROD',version:'1',knowledge_id:'k1',subject:'bank-rule',value:{ltv:80},lifecycle:'CURRENT',source:{type:'document',ref:'doc:1'},confidence:.8,created_at:t});
 k.put({company_id:'other',engine_id:'KNW-001',environment:'PREPROD',version:'1',knowledge_id:'k2',subject:'bank-rule',value:{ltv:70},lifecycle:'VALIDATED',source:{type:'git',ref:'rule:2'},confidence:1,created_at:t});
 assert.equal(k.query({company_id:'fenix'}).length,1);
 k.put({company_id:'fenix',engine_id:'KNW-001',environment:'PREPROD',version:'2',knowledge_id:'k3',subject:'bank-rule',value:{ltv:75},lifecycle:'VALIDATED',source:{type:'notion',ref:'page:3'},confidence:.95,supersedes:'k1',created_at:t});
 assert.equal(k.query({company_id:'fenix'}).length,1);
 k.put({company_id:'fenix',engine_id:'KNW-001',environment:'PREPROD',version:'2',knowledge_id:'k4',subject:'bank-rule',value:{ltv:78},lifecycle:'UNCERTAIN',source:{type:'document',ref:'doc:4'},confidence:.4,created_at:t});
 assert.equal(k.conflicts({company_id:'fenix',subject:'bank-rule'}).conflict,true);
});

test('TRN dataset/run is reproducible and cannot self-promote',()=>{
 const trn=new Trn001TrainingLedgerV1();
 const ds=trn.registerDataset({company_id:'fenix',engine_id:'SEO-001',dataset_id:'d1',version:'v1',cases:[{in:1,out:2}],created_at:t});
 const a=trn.recordRun({company_id:'fenix',engine_id:'SEO-001',dataset_id:'d1',dataset_version:'v1',run_id:'r1',candidate_version:'c1',metrics:{accuracy:.8},created_at:t});
 const b=trn.recordRun({company_id:'fenix',engine_id:'SEO-001',dataset_id:'d1',dataset_version:'v1',run_id:'r2',candidate_version:'c2',metrics:{accuracy:.9},created_at:t});
 assert.equal(a.dataset_hash,ds.dataset_hash);assert.equal(b.promotion_authorized,false);
 const c=trn.compare({company_id:'fenix',engine_id:'SEO-001',champion_run_id:'r1',challenger_run_id:'r2',metric:'accuracy'});
 assert.equal(c.challenger_wins,true);assert.equal(c.tribunal_required,true);assert.equal(c.promotion_authorized,false);
});

test('FINOPS attributes costs, deduplicates and hard-stops budget',()=>{
 const f=new Finops001CostLedgerV1();
 f.setBudget({company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'1',budget_eur:1,hard_stop:true});
 const one=f.ingest({company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'1',event_id:'e1',task_id:'t1',provider:'local',resource_type:'cpu',cost_eur:0,savings_eur:.2,occurred_at:t});
 assert.equal(one.usage.cost_eur,0);assert.equal(one.hard_stop,false);
 const dup=f.ingest({company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'1',event_id:'e1',task_id:'t1',provider:'local',resource_type:'cpu',cost_eur:0,savings_eur:.2,occurred_at:t});
 assert.equal(dup.deduplicated,true);
 const two=f.ingest({company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'1',event_id:'e2',task_id:'t2',provider:'api-x',resource_type:'api',cost_eur:1,savings_eur:0,occurred_at:t});
 assert.equal(two.hard_stop,true);assert.equal(two.alert_threshold,'100');assert.equal(two.usage.by_provider['api-x'],1);
});

test('all three remain non-PROD and trading isolated',()=>{
 assert.equal(FOUNDATION_HOLDS_V1_CONTRACT['KNW-001'].prod_write_authorized,false);
 assert.equal(FOUNDATION_HOLDS_V1_CONTRACT['TRN-001'].self_promote,false);
 assert.equal(FOUNDATION_HOLDS_V1_CONTRACT['FINOPS-001'].hard_stop,true);
 assert.equal(FOUNDATION_HOLDS_V1_CONTRACT.trading_access,false);
});
