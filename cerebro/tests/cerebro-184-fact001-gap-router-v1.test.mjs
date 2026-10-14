import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {runFact001GapRouter,validateFact001GapRouting} from '../runtime/cerebro-184-fact001-gap-router-v1.mjs';

const __filename=fileURLToPath(import.meta.url);const __dirname=path.dirname(__filename);const root=path.resolve(__dirname,'..');
const routing=JSON.parse(fs.readFileSync(path.join(root,'skills','cerebro-184-fact001-gap-routing.v1.json'),'utf8'));
const engineRegistry=JSON.parse(fs.readFileSync(path.join(root,'registry','engine-registry.v1.json'),'utf8'));
const reconciliationFiles=['38-50','51-61','62-68','74-82','176-184'].map(range=>path.join(root,'skills',`cerebro-184-items-${range}-live-reconciliation.v2.json`));
const reconciliations=reconciliationFiles.map(file=>JSON.parse(fs.readFileSync(file,'utf8')));

function clone(value){return structuredClone(value);}

test('routes exactly the six normalized zero-cost gaps to existing engines',()=>{const report=runFact001GapRouter();assert.equal(report.status,'FACT001_GAP_ROUTING_GREEN');assert.equal(report.gap_count,6);assert.deepEqual(report.item_ids,[47,48,57,62,74,183]);assert.equal(report.create_new_engine_authorized,false);assert.deepEqual(report.new_engine_ids_created,[]);assert.equal(report.next_gate,'FACT001_BUILD_GAPS_BATCH_PREPROD');});

test('every route resolves primary/support engines from the canonical 179-engine registry',()=>{const report=runFact001GapRouter();const ids=new Set(engineRegistry.engine_ids);assert.equal(engineRegistry.count,179);for(const route of report.routes){assert.equal(ids.has(route.primary_engine_id),true,route.primary_engine_id);assert.equal(route.support_engine_ids.includes('FACT-001'),true,`item ${route.item_id}`);for(const id of route.support_engine_ids)assert.equal(ids.has(id),true,id);}});

test('routing agrees with source reconciliation FABRICAR_GRATIS decisions',()=>{const sources=new Map(reconciliations.flatMap(r=>r.items).map(i=>[i.id,i]));for(const gap of routing.gaps){assert.equal(gap.disposition,'FABRICAR_GRATIS');assert.equal(sources.get(gap.item_id)?.disposition,'FABRICAR_GRATIS',`item ${gap.item_id}`);}});

test('zero-cost and authority boundaries remain fail closed',()=>{const report=runFact001GapRouter();assert.equal(report.additional_cost_eur,0);assert.equal(report.prod_authorized,false);assert.equal(report.prod_write_authorized,false);assert.equal(report.trading_access,false);assert.equal(report.external_code_execution,false);assert.equal(report.external_dependency_install,false);assert.deepEqual(report.human_required,[]);});

test('fails closed if a new engine id is introduced',()=>{const bad=clone(routing);bad.gaps[0].primary_engine_id='NEW-999';assert.throws(()=>validateFact001GapRouting({routing:bad,engineRegistry,reconciliations}),/UNKNOWN_PRIMARY_ENGINE/);});

test('fails closed if source item is not FABRICAR_GRATIS',()=>{const badSources=clone(reconciliations);for(const r of badSources){const item=r.items.find(i=>i.id===47);if(item)item.disposition='REUTILIZAR';}assert.throws(()=>validateFact001GapRouting({routing,engineRegistry,reconciliations:badSources}),/SOURCE_NOT_FABRICAR_GRATIS:47/);});

test('fails closed on PROD, paid, external install or Trading authority expansion',()=>{for(const [key,value] of [['prod_authorized',true],['prod_write_authorized',true],['external_dependency_install_authorized',true],['external_code_execution_authorized',true],['trading_access',true],['automatic_paid_fallback',true],['additional_cost_eur',1]]){const bad=clone(routing);bad.policy[key]=value;assert.throws(()=>validateFact001GapRouting({routing:bad,engineRegistry,reconciliations}),/AUTHORITY_MUST_REMAIN_FALSE|ADDITIONAL_COST_MUST_BE_ZERO/,key);}});
