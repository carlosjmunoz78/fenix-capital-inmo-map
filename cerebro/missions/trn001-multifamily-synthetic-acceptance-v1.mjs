#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {Trn001TrainingLedgerV1} from '../runtime/foundation-holds-v1.mjs';

const at='2026-11-03T18:00:00.000Z';
const families={
 'KNW-001':[{input:'approved reference',expected:'REFERENCE_ONLY'},{input:'unknown rights',expected:'HOLD_RIGHTS'}],
 'RUNTIME-001':[{input:'durable job PREPROD',expected:'EXECUTE'},{input:'trading job',expected:'DENY'}],
 'FINOPS-001':[{input:'0 EUR verified local',expected:'ALLOW'},{input:'positive estimated cost',expected:'DENY'}],
 'DOC-001':[{input:'synthetic readable image',expected:'INSPECT'},{input:'customer document without grant',expected:'DENY'}]
};
function run(){
 const ledger=new Trn001TrainingLedgerV1();
 const items=[];
 for(const [engine_id,cases] of Object.entries(families)){
  const base={company_id:'fenix',engine_id,dataset_id:'synthetic-preprod-eval',version:'v1',created_at:at};
  const dataset=ledger.registerDataset({...base,cases});
  const champion=ledger.recordRun({company_id:'fenix',engine_id,dataset_id:base.dataset_id,dataset_version:'v1',run_id:'champion-'+engine_id,candidate_version:'v1',metrics:{synthetic_accuracy:0.5},created_at:at});
  const challenger=ledger.recordRun({company_id:'fenix',engine_id,dataset_id:base.dataset_id,dataset_version:'v1',run_id:'challenger-'+engine_id,candidate_version:'v2',metrics:{synthetic_accuracy:1},created_at:at});
  const compared=ledger.compare({company_id:'fenix',engine_id,champion_run_id:champion.run_id,challenger_run_id:challenger.run_id,metric:'synthetic_accuracy'});
  assert.equal(compared.challenger_wins,true);
  assert.equal(compared.tribunal_required,true);
  assert.equal(compared.promotion_authorized,false);
  assert.equal(challenger.promotion_authorized,false);
  assert.equal(challenger.dataset_hash,dataset.dataset_hash);
  items.push({engine_id,dataset_hash:dataset.dataset_hash,case_count:dataset.case_count,tribunal_required:true,promotion_authorized:false});
 }
 assert.equal(items.length,4);
 assert.throws(()=>ledger.compare({company_id:'other-company',engine_id:'KNW-001',champion_run_id:'champion-KNW-001',challenger_run_id:'challenger-KNW-001',metric:'synthetic_accuracy'}),/TRN001_RUN_NOT_FOUND/);
 return {status:'GREEN_MULTIFAMILY_SYNTHETIC_EVALUATION',engine_id:'TRN-001',environment:'LAB',families:items,synthetic_metrics_only:true,actual_model_evaluation:false,tribunal_real_connector_bound:false,promotion_authorized:false,prod_writes:false,trading_access:false,additional_cost_eur:0};
}
const first=run(),second=run();
assert.equal(crypto.createHash('sha256').update(JSON.stringify(first)).digest('hex'),crypto.createHash('sha256').update(JSON.stringify(second)).digest('hex'));
const out=process.env.CEREBRO_TRN_EVIDENCE_OUT||'/tmp/cerebro-trn-multifamily';
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/SUMMARY.json',JSON.stringify(first,null,2)+'\n');
console.log('TRN001_MULTIFAMILY_ACCEPTANCE='+JSON.stringify(first));
