#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const ROOT=path.resolve(__dirname,'..');
const DEFAULT_ROUTING=path.join(ROOT,'skills','cerebro-184-fact001-gap-routing.v1.json');
const DEFAULT_REGISTRY=path.join(ROOT,'registry','engine-registry.v1.json');
const DEFAULT_RECONCILIATIONS=[
  path.join(ROOT,'skills','cerebro-184-items-38-50-live-reconciliation.v2.json'),
  path.join(ROOT,'skills','cerebro-184-items-51-61-live-reconciliation.v2.json'),
  path.join(ROOT,'skills','cerebro-184-items-62-68-live-reconciliation.v2.json'),
  path.join(ROOT,'skills','cerebro-184-items-74-82-live-reconciliation.v2.json'),
  path.join(ROOT,'skills','cerebro-184-items-176-184-live-reconciliation.v2.json')
];
const EXPECTED_IDS=Object.freeze([47,48,57,62,74,183]);

function req(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim();}
function assertFalse(obj,key){if(obj?.[key]!==false)throw new Error(`AUTHORITY_MUST_REMAIN_FALSE:${key}`);}

export function validateFact001GapRouting({routing,engineRegistry,reconciliations}){
  if(!routing||routing.state_type!=='CEREBRO_184_FACT001_GAP_ROUTING_V1')throw new Error('INVALID_ROUTING_STATE_TYPE');
  if(routing.company_id!=='GLOBAL'||routing.engine_id!=='FACT-001'||routing.environment!=='PREPROD')throw new Error('INVALID_ROUTING_IDENTITY');
  if(!engineRegistry||engineRegistry.state_type!=='CEREBRO_ENGINE_REGISTRY_V1')throw new Error('INVALID_ENGINE_REGISTRY');
  if(!Array.isArray(engineRegistry.engine_ids)||engineRegistry.engine_ids.length!==engineRegistry.count)throw new Error('ENGINE_REGISTRY_COUNT_MISMATCH');
  const policy=routing.policy||{};
  for(const key of ['create_new_engine_authorized','external_dependency_install_authorized','external_code_execution_authorized','prod_authorized','prod_write_authorized','trading_access','automatic_paid_fallback'])assertFalse(policy,key);
  if(policy.extend_existing_engines_first!==true)throw new Error('EXTEND_EXISTING_REQUIRED');
  if(policy.additional_cost_eur!==0)throw new Error('ADDITIONAL_COST_MUST_BE_ZERO');
  const gaps=Array.isArray(routing.gaps)?routing.gaps:[];
  if(gaps.length!==EXPECTED_IDS.length)throw new Error('GAP_COUNT_MISMATCH');
  const ids=gaps.map(g=>g.item_id);
  if(new Set(ids).size!==ids.length)throw new Error('DUPLICATE_GAP_ITEM');
  if(JSON.stringify([...ids].sort((a,b)=>a-b))!==JSON.stringify(EXPECTED_IDS))throw new Error('GAP_SET_MISMATCH');
  const engineSet=new Set(engineRegistry.engine_ids);
  const itemMap=new Map();
  for(const reconciliation of reconciliations){
    for(const item of reconciliation?.items??[]){
      if(itemMap.has(item.id))throw new Error(`DUPLICATE_RECONCILIATION_ITEM:${item.id}`);
      itemMap.set(item.id,item);
    }
  }
  for(const gap of gaps){
    req(gap.capability_id,`gap ${gap.item_id} capability_id`);
    const primary=req(gap.primary_engine_id,`gap ${gap.item_id} primary_engine_id`);
    if(!engineSet.has(primary))throw new Error(`UNKNOWN_PRIMARY_ENGINE:${gap.item_id}:${primary}`);
    const support=Array.isArray(gap.support_engine_ids)?gap.support_engine_ids:[];
    if(!support.includes('FACT-001'))throw new Error(`FACT001_SUPPORT_REQUIRED:${gap.item_id}`);
    for(const engineId of support)if(!engineSet.has(engineId))throw new Error(`UNKNOWN_SUPPORT_ENGINE:${gap.item_id}:${engineId}`);
    if(gap.build_mode!=='EXTEND_EXISTING_ENGINES')throw new Error(`INVALID_BUILD_MODE:${gap.item_id}`);
    if(gap.target_state!=='PREPROD_CAPABILITY_V0')throw new Error(`INVALID_TARGET_STATE:${gap.item_id}`);
    if(!Array.isArray(gap.required_outputs)||gap.required_outputs.length<3)throw new Error(`REQUIRED_OUTPUTS_MISSING:${gap.item_id}`);
    const source=itemMap.get(gap.item_id);
    if(!source)throw new Error(`SOURCE_RECONCILIATION_MISSING:${gap.item_id}`);
    if(source.disposition!=='FABRICAR_GRATIS')throw new Error(`SOURCE_NOT_FABRICAR_GRATIS:${gap.item_id}`);
    if(gap.disposition!=='FABRICAR_GRATIS')throw new Error(`ROUTING_DISPOSITION_MISMATCH:${gap.item_id}`);
  }
  if((routing.summary?.new_engine_ids_created??[]).length!==0)throw new Error('NEW_ENGINE_IDS_FORBIDDEN');
  if(routing.summary?.additional_cost_eur!==0)throw new Error('SUMMARY_COST_MUST_BE_ZERO');
  if(routing.summary?.prod_authorized!==false||routing.summary?.prod_write_authorized!==false||routing.summary?.trading_access!==false)throw new Error('SUMMARY_AUTHORITY_EXPANSION_FORBIDDEN');
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_184_FACT001_GAP_ROUTING_REPORT_V1',status:'FACT001_GAP_ROUTING_GREEN',
    company_id:routing.company_id,engine_id:routing.engine_id,environment:routing.environment,version:routing.version,
    gap_count:gaps.length,item_ids:Object.freeze([...ids]),routes:Object.freeze(gaps.map(g=>Object.freeze({item_id:g.item_id,capability_id:g.capability_id,primary_engine_id:g.primary_engine_id,support_engine_ids:Object.freeze([...g.support_engine_ids]),next_gate:g.next_gate}))),
    create_new_engine_authorized:false,new_engine_ids_created:Object.freeze([]),additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false,external_code_execution:false,external_dependency_install:false,human_required:Object.freeze([]),next_gate:'FACT001_BUILD_GAPS_BATCH_PREPROD'
  });
}

export function runFact001GapRouter({routingFile=DEFAULT_ROUTING,registryFile=DEFAULT_REGISTRY,reconciliationFiles=DEFAULT_RECONCILIATIONS}={}){
  const routing=JSON.parse(fs.readFileSync(routingFile,'utf8'));
  const engineRegistry=JSON.parse(fs.readFileSync(registryFile,'utf8'));
  const reconciliations=reconciliationFiles.map(file=>JSON.parse(fs.readFileSync(file,'utf8')));
  return validateFact001GapRouting({routing,engineRegistry,reconciliations});
}

if(process.argv[1]&&path.resolve(process.argv[1])===__filename){try{process.stdout.write(`${JSON.stringify(runFact001GapRouter(),null,2)}\n`);}catch(error){process.stderr.write(`${JSON.stringify({status:'FACT001_GAP_ROUTING_RED',error:error.message,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0})}\n`);process.exitCode=1;}}
