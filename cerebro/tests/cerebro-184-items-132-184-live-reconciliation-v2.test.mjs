import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename=fileURLToPath(import.meta.url);const __dirname=path.dirname(__filename);const repoRoot=path.resolve(__dirname,'..','..');
const specs=[
 ['cerebro/skills/cerebro-184-items-132-142-live-reconciliation.v2.json','CEREBRO_184_ITEMS_132_142_LIVE_RECONCILIATION_V2',132,142],
 ['cerebro/skills/cerebro-184-items-143-151-live-reconciliation.v2.json','CEREBRO_184_ITEMS_143_151_LIVE_RECONCILIATION_V2',143,151],
 ['cerebro/skills/cerebro-184-items-152-161-live-reconciliation.v2.json','CEREBRO_184_ITEMS_152_161_LIVE_RECONCILIATION_V2',152,161],
 ['cerebro/skills/cerebro-184-items-162-175-live-reconciliation.v2.json','CEREBRO_184_ITEMS_162_175_LIVE_RECONCILIATION_V2',162,175],
 ['cerebro/skills/cerebro-184-items-176-184-live-reconciliation.v2.json','CEREBRO_184_ITEMS_176_184_LIVE_RECONCILIATION_V2',176,184]
];
const canonical=new Set(['REUTILIZAR','ENVOLVER','CATALOGAR','FABRICAR_GRATIS','HOLD','DESCARTAR','PAGO_JUSTIFICADO']);
const load=spec=>JSON.parse(fs.readFileSync(path.join(repoRoot,spec[0]),'utf8'));

test('reconciliation covers exact canonical item ids 132 through 184 once',()=>{const ids=[];for(const spec of specs){const s=load(spec);assert.equal(s.state_type,spec[1]);assert.equal(s.company_id,'GLOBAL');assert.equal(s.engine_id,'FACT-001');assert.equal(s.environment,'PREPROD');const expected=Array.from({length:spec[3]-spec[2]+1},(_,i)=>spec[2]+i);assert.deepEqual(s.items.map(i=>i.id),expected);ids.push(...expected);}assert.equal(ids.length,53);assert.equal(new Set(ids).size,53);assert.deepEqual(ids,Array.from({length:53},(_,i)=>132+i));});

test('every item has canonical disposition, owner, evidence and reason',()=>{for(const spec of specs){for(const item of load(spec).items){assert.equal(canonical.has(item.disposition),true,`item ${item.id}`);assert.ok(item.owner_engine_ids?.length,`owner ${item.id}`);assert.ok(item.evidence?.length,`evidence ${item.id}`);assert.ok(item.reason?.length>30,`reason ${item.id}`);for(const rel of item.evidence)assert.equal(fs.existsSync(path.join(repoRoot,rel)),true,`${item.id}:${rel}`);}}});

test('all blocks preserve zero-cost fail-closed authority',()=>{for(const spec of specs){const s=load(spec),a=s.authority;for(const key of ['prod_authorized','prod_write_authorized','auto_merge_authorized','external_skill_code_execution_authorized','external_dependency_install_authorized','customer_data_authorized','trading_access','automatic_paid_fallback'])assert.equal(a[key],false,`${spec[0]}:${key}`);assert.equal(a.additional_cost_eur,0);assert.equal(s.summary.additional_cost_eur,0);assert.deepEqual(s.summary.human_required,[]);assert.equal(s.items.some(i=>i.disposition==='PAGO_JUSTIFICADO'),false);}});

test('retention/referral/reputation reuse canonical engines and keep public side effects off',()=>{const s=load(specs[0]);for(const id of [132,133,134,135,136,138,139,141,142])assert.equal(s.items.find(i=>i.id===id)?.disposition,'REUTILIZAR',`item ${id}`);assert.equal(s.items.find(i=>i.id===140)?.disposition,'ENVOLVER');assert.equal(s.items.find(i=>i.id===137)?.disposition,'CATALOGAR');});

test('economic learning stays analytical/decision-only with no paid execution',()=>{const s=load(specs[1]);for(const item of s.items)assert.equal(item.disposition,'REUTILIZAR',`item ${item.id}`);assert.equal(s.items.find(i=>i.id===150)?.state,'PARTIAL_PREPROD_DECISION_ONLY');assert.equal(s.items.find(i=>i.id===151)?.state,'PARTIAL_PREPROD_DECISION_ONLY');});

test('marketing preserves SEO-001 and avoids provider-specific lock-in',()=>{const s=load(specs[2]);assert.equal(s.items.find(i=>i.id===157)?.disposition,'ENVOLVER');assert.equal(s.items.find(i=>i.id===160)?.disposition,'CATALOGAR');for(const id of [152,153,154,155,156,158,159,161])assert.equal(s.items.find(i=>i.id===id)?.disposition,'REUTILIZAR',`item ${id}`);});

test('multimedia keeps unverified/commercial/hardware/license adapters non-executing',()=>{const s=load(specs[3]);for(const id of [171,172,173,174])assert.equal(s.items.find(i=>i.id===id)?.disposition,'HOLD',`item ${id}`);assert.equal(s.items.find(i=>i.id===170)?.disposition,'ENVOLVER');for(const id of [162,163,164,165,166,167,168,169,175])assert.equal(s.items.find(i=>i.id===id)?.disposition,'CATALOGAR',`item ${id}`);});

test('brand/app factory reuses local tokens and routes only template-pack gap to FACT-001',()=>{const s=load(specs[4]);assert.equal(s.items.find(i=>i.id===176)?.disposition,'ENVOLVER');assert.equal(s.items.find(i=>i.id===177)?.state,'FULL_PREPROD_DETERMINISTIC_LOCAL');for(const id of [179,180])assert.equal(s.items.find(i=>i.id===id)?.disposition,'REUTILIZAR',`item ${id}`);assert.equal(s.items.find(i=>i.id===181)?.disposition,'ENVOLVER');assert.equal(s.items.find(i=>i.id===183)?.disposition,'FABRICAR_GRATIS');assert.equal(s.items.find(i=>i.id===183)?.owner_engine_ids.includes('FACT-001'),true);assert.equal(s.items.find(i=>i.id===183)?.owner_engine_ids.includes('APPBOOT-001'),true);for(const id of [178,182,184])assert.equal(s.items.find(i=>i.id===id)?.disposition,'CATALOGAR',`item ${id}`);});
