import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename=fileURLToPath(import.meta.url);const __dirname=path.dirname(__filename);const repoRoot=path.resolve(__dirname,'..','..');
const specs=[
 ['cerebro/skills/cerebro-184-items-93-104-live-reconciliation.v2.json','CEREBRO_184_ITEMS_93_104_LIVE_RECONCILIATION_V2',93,104],
 ['cerebro/skills/cerebro-184-items-105-117-live-reconciliation.v2.json','CEREBRO_184_ITEMS_105_117_LIVE_RECONCILIATION_V2',105,117],
 ['cerebro/skills/cerebro-184-items-118-131-live-reconciliation.v2.json','CEREBRO_184_ITEMS_118_131_LIVE_RECONCILIATION_V2',118,131]
];
const canonical=new Set(['REUTILIZAR','ENVOLVER','CATALOGAR','FABRICAR_GRATIS','HOLD','DESCARTAR','PAGO_JUSTIFICADO']);
const load=spec=>JSON.parse(fs.readFileSync(path.join(repoRoot,spec[0]),'utf8'));

test('reconciliation covers exact canonical item ids 93 through 131 once',()=>{const ids=[];for(const spec of specs){const s=load(spec);assert.equal(s.state_type,spec[1]);assert.equal(s.company_id,'GLOBAL');assert.equal(s.engine_id,'FACT-001');assert.equal(s.environment,'PREPROD');const expected=Array.from({length:spec[3]-spec[2]+1},(_,i)=>spec[2]+i);assert.deepEqual(s.items.map(i=>i.id),expected);ids.push(...expected);}assert.equal(ids.length,39);assert.equal(new Set(ids).size,39);assert.deepEqual(ids,Array.from({length:39},(_,i)=>93+i));});

test('every item has canonical disposition, owner, evidence and reason',()=>{for(const spec of specs){for(const item of load(spec).items){assert.equal(canonical.has(item.disposition),true,`item ${item.id}`);assert.ok(item.owner_engine_ids?.length,`owner ${item.id}`);assert.ok(item.evidence?.length,`evidence ${item.id}`);assert.ok(item.reason?.length>30,`reason ${item.id}`);for(const rel of item.evidence)assert.equal(fs.existsSync(path.join(repoRoot,rel)),true,`${item.id}:${rel}`);}}});

test('all blocks preserve zero-cost fail-closed authority',()=>{for(const spec of specs){const s=load(spec),a=s.authority;for(const key of ['prod_authorized','prod_write_authorized','auto_merge_authorized','external_skill_code_execution_authorized','external_dependency_install_authorized','customer_data_authorized','trading_access','automatic_paid_fallback'])assert.equal(a[key],false,`${spec[0]}:${key}`);assert.equal(a.additional_cost_eur,0);assert.equal(s.summary.additional_cost_eur,0);assert.deepEqual(s.summary.human_required,[]);assert.equal(s.items.some(i=>i.disposition==='PAGO_JUSTIFICADO'),false);}});

test('sales execution reuses canonical SALE/COM/JOB and keeps real dispatch disabled by scope',()=>{const s=load(specs[0]);for(const id of [93,99,100,102,104])assert.equal(s.items.find(i=>i.id===id)?.disposition,'REUTILIZAR',`item ${id}`);assert.equal(s.items.find(i=>i.id===101)?.disposition,'ENVOLVER');for(const id of [94,95,96,97,98,103])assert.equal(s.items.find(i=>i.id===id)?.disposition,'CATALOGAR',`item ${id}`);});

test('voice commercial providers stay HOLD and scenarios stay simulation-only',()=>{const s=load(specs[1]);for(const id of [109,110])assert.equal(s.items.find(i=>i.id===id)?.disposition,'HOLD',`item ${id}`);for(const id of [111,112,113,114,115,116,117]){const item=s.items.find(i=>i.id===id);assert.equal(item?.disposition,'REUTILIZAR');assert.match(item?.state,/SIMULATION_ONLY/);}});

test('agenda-commerce composes existing engines and does not create a second payment/delivery stack',()=>{const s=load(specs[2]);for(const id of [119,120,121,122,124,125,129,131])assert.equal(s.items.find(i=>i.id===id)?.disposition,'REUTILIZAR',`item ${id}`);assert.equal(s.items.find(i=>i.id===128)?.disposition,'ENVOLVER');assert.equal(s.items.find(i=>i.id===130)?.disposition,'ENVOLVER');for(const id of [118,123,126,127])assert.equal(s.items.find(i=>i.id===id)?.disposition,'CATALOGAR',`item ${id}`);});
