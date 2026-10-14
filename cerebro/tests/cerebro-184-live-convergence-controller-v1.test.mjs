import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {parseRange,validateConvergenceLedger,runConvergenceController} from '../skills/cerebro-184-live-convergence-controller-v1.mjs';

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const repoRoot=path.resolve(__dirname,'..','..');
const ledgerPath=path.join(repoRoot,'cerebro/skills/cerebro-184-live-convergence.v2.json');
function loadLedger(){return JSON.parse(fs.readFileSync(ledgerPath,'utf8'));}

test('canonical ranges cover exactly 184 capabilities with no duplicate or missing item',()=>{const r=runConvergenceController({ledgerPath,repoRoot});assert.equal(r.status,'GREEN_COVERAGE_ACTIVE_CONVERGENCE');assert.equal(r.catalog_size,184);assert.equal(r.covered_items,184);assert.equal(r.coverage_complete,true);assert.equal(r.blocks_total,17);});
test('production, trading, external code, customer data and paid fallback stay denied',()=>{const l=loadLedger();const r=validateConvergenceLedger(l,{repoRoot,checkFiles:true});assert.equal(l.authority.prod_authorized,false);assert.equal(l.authority.prod_write_authorized,false);assert.equal(l.authority.external_skill_code_execution_authorized,false);assert.equal(l.authority.customer_data_authorized,false);assert.equal(l.authority.trading_access,false);assert.equal(l.authority.automatic_paid_fallback,false);assert.equal(l.authority.additional_cost_eur,0);assert.equal(r.prod.authorized,false);assert.equal(r.prod.write_authorized,false);assert.equal(r.trading_access,false);assert.equal(r.additional_cost_eur,0);});
test('main remains integration-only and Cloudflare production branch remains isolated',()=>{const r=runConvergenceController({ledgerPath,repoRoot});assert.equal(r.prod.cloudflare_production_branch,'deploy/cloudflare-prod');assert.equal(r.prod.main_is_production_branch,false);});
test('all declared current-main evidence files physically exist',()=>{const l=loadLedger();for(const b of l.blocks){for(const rel of [b.registry,b.item_level_reconciliation].filter(Boolean))assert.equal(fs.existsSync(path.join(repoRoot,rel)),true,rel);}assert.equal(fs.existsSync(path.join(repoRoot,l.fact001_gap_routing)),true,l.fact001_gap_routing);});
test('item-level normalization is complete without claiming physical activation',()=>{const r=runConvergenceController({ledgerPath,repoRoot});assert.equal(r.full_item_count,184);assert.equal(r.remaining_item_count,0);assert.match(r.item_count_reason,/normalized/i);assert.match(r.item_count_reason,/does not mean every child capability is physically live/i);});
test('all 184 are normalized, six real gaps are routed and next is FACT-001 build batch',()=>{const r=runConvergenceController({ledgerPath,repoRoot});assert.equal(r.next,'FACT001_BUILD_GAPS_BATCH_PREPROD_47_48_57_62_74_183');assert.deepEqual(r.blocks_terminal_at_declared_scope.slice(0,2),['1-12','13-24']);for(const range of ['25-37','38-50','51-61','62-68','69-73','74-82','83-92','93-104','105-117','118-131','132-142','143-151','152-161','162-175','176-184'])assert.equal(r.blocks_active_or_partial.some(b=>b.range===range),true,range);});
test('range parser fails closed on malformed ranges',()=>{assert.deepEqual(parseRange('25-37'),{start:25,end:37,count:13});assert.throws(()=>parseRange('37-25'),/INVALID_RANGE/);assert.throws(()=>parseRange('bad'),/INVALID_RANGE/);});
test('coverage validation fails closed if an item range is removed',()=>{const l=loadLedger();l.blocks=l.blocks.filter(b=>b.range!=='176-184');assert.throws(()=>validateConvergenceLedger(l,{repoRoot,checkFiles:false}),/MISSING_ITEMS/);});
test('normalization counts fail closed if they do not sum to 184',()=>{const l=loadLedger();l.remaining_item_normalization_count=1;assert.throws(()=>validateConvergenceLedger(l,{repoRoot,checkFiles:false}),/ITEM_NORMALIZATION_COUNTS_MUST_SUM_TO_CATALOG/);});
test('authority validation fails closed on accidental PROD expansion',()=>{const l=loadLedger();l.authority.prod_write_authorized=true;assert.throws(()=>validateConvergenceLedger(l,{repoRoot,checkFiles:false}),/AUTHORITY_MUST_REMAIN_FALSE:prod_write_authorized/);});
