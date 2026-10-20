#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildP0OperationalCatalog,evaluateCommunicationText,descriptiveStatistics,twoProportionAB,buildStructuredReport} from './p0-operational-capability-pack-v1.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'..');
const ENGINES=path.join(ROOT,'registry','engine-registry.v1.json');
const PORTFOLIO=path.join(ROOT,'registry','skill-priority-portfolio-v1.json');
function load(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function authority(){return Object.freeze({prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,customer_data_authorized:false,trading_access:false,spend_authorized:false,additional_cost_eur:0,action_authority_source:'ORIGIN_ENGINE_GOVERNED_POLICY_ONLY'});}
function canaryName(name){return `GREEN_${String(name).toUpperCase().replace(/[^A-Z0-9]+/g,'_')}_PROD_READONLY_CANARY`;}
function isTrading(id,portfolio){const g=portfolio.global_language_binding??{};return (g.excluded_engine_ids??[]).includes(id)||(g.excluded_engine_id_prefixes??[]).some((p)=>String(id).startsWith(p));}
function representativeProbe(row){
  if(row.capability_family==='LANGUAGE_HUMAN_INTERACTION')return evaluateCommunicationText('Sí. Lo importante primero: esta es una prueba read-only con evidencia y sin cambios de producción.');
  if(row.capability_family==='ANALYTICS_STATISTICS')return row.technical_name==='ab-testing'?twoProportionAB({control_success:10,control_total:100,variant_success:12,variant_total:100}):descriptiveStatistics([1,2,3,4,5]);
  if(row.capability_family==='REPORTING_DOCUMENTS')return buildStructuredReport({title:'Canary read-only',summary:'No publica ni escribe en PROD.',metrics:{candidate:row.technical_name},sections:[],format:'markdown'});
  return Object.freeze({status:'GREEN_READONLY_PLAN_PROBE',technical_name:row.technical_name,capability_family:row.capability_family,mode:'PLAN',side_effects:false});
}

export function runP0ProdReadonlyCanary({requireMain=false,ref=process.env.GITHUB_REF??'',sha=process.env.GITHUB_SHA??''}={}){
  if(requireMain&&ref!=='refs/heads/main')throw new Error('MAIN_REF_REQUIRED_FOR_CANONICAL_CANARY');
  const catalog=buildP0OperationalCatalog(),engines=load(ENGINES),portfolio=load(PORTFOLIO);const rows=[];
  if(catalog.capability_count!==10||catalog.status!=='GREEN_P0_OPERATIONAL_CATALOG')throw new Error('P0_OPERATIONAL_CATALOG_NOT_GREEN');
  for(const row of catalog.capabilities){
    if(!row.full_safe_preprod_evidence_green)throw new Error(`${row.technical_name}:FULL_SAFE_PREPROD_EVIDENCE_NOT_GREEN`);
    if(!row.target_engine_bindings.length)throw new Error(`${row.technical_name}:NO_ENGINE_BINDINGS`);
    for(const id of row.target_engine_bindings){if(!(engines.engine_ids??[]).includes(id))throw new Error(`${row.technical_name}:UNKNOWN_ENGINE:${id}`);if(isTrading(id,portfolio))throw new Error(`${row.technical_name}:TRADING_ENGINE_BINDING_FORBIDDEN:${id}`);}
    const probe=representativeProbe(row);
    if(!String(probe.status).startsWith('GREEN_'))throw new Error(`${row.technical_name}:READONLY_PROBE_NOT_GREEN`);
    rows.push(Object.freeze({technical_name:row.technical_name,candidate_id:row.candidate_id,capability_family:row.capability_family,evidence:canaryName(row.technical_name),representative_engine_id:row.target_engine_bindings[0],requested_mode:'ANALYZE',probe_status:probe.status,side_effects:false}));
  }
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_P0_PROD_READONLY_CANARY_V1',company_id:'GLOBAL',engine_id:'FACT-001',environment:'PROD_READONLY_CANARY',version:'1.0.0',status:'GREEN_P0_PROD_READONLY_CANARY_SET',canonical_main_ref:ref==='refs/heads/main',head_sha:sha||null,capability_count:rows.length,canaries:Object.freeze(rows),...authority()});
}

if(import.meta.url===`file://${process.argv[1]}`){const requireMain=process.argv.includes('--require-main');const report=runP0ProdReadonlyCanary({requireMain});process.stdout.write(`${JSON.stringify(report,null,2)}\n`);}
