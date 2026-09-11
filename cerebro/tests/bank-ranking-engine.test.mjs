import test from 'node:test';
import assert from 'node:assert/strict';
import {rankBanks} from '../banking/bank-ranking-engine.mjs';
const context={company_id:'fenix',engine_id:'BNK-002',environment:'PREPROD',version:'0.1.0'};
const base={context,authorized:true,requires_prod_write:false,confidence:0.95,source_refs:['bnk:knowledge'],banks:[{bank:'A',approval_probability:.9,total_cost_eur:12000,expected_days:20,profile_fit:.9,experience_score:.8},{bank:'B',approval_probability:.7,total_cost_eur:5000,expected_days:10,profile_fit:.7,experience_score:.7}]};
test('BNK-002 ranks deterministically with explanation',()=>{const r=rankBanks(base);assert.equal(r.status,'BANK_RANKING_READY');assert.equal(r.ranked_banks.length,2);assert.ok(r.ranked_banks[0].score>=r.ranked_banks[1].score);assert.equal(r.read_only,true);assert.equal(r.executed,false);assert.equal(r.model_used,false);});
test('BNK-002 blocks unsafe execution',()=>{assert.equal(rankBanks({...base,authorized:false}).reason,'POLICY_CONFLICT');assert.equal(rankBanks({...base,requires_prod_write:true}).reason,'HIGH_RISK');assert.equal(rankBanks({...base,confidence:.2}).reason,'LOW_CONFIDENCE');});
test('BNK-002 requires evidence and PREPROD/LAB',()=>{assert.throws(()=>rankBanks({...base,source_refs:[]}));assert.throws(()=>rankBanks({...base,context:{...context,environment:'PROD'}}));});
