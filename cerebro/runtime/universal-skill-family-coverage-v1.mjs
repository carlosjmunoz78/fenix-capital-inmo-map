#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {supportedAutoEngineeringDomains} from './universal-skill-auto-engineering-v1.mjs';

const PREPROD='PREPROD';
function safeAuthority(){return {prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};}
function uniq(values){return [...new Set(values??[])].sort();}

export function buildFamilyCoverageReport({matrix=[]}={}){
  if(!Array.isArray(matrix))throw new TypeError('matrix must be an array');
  const providers=uniq(supportedAutoEngineeringDomains());
  const engineeringRows=matrix.filter((row)=>row?.observed_outcome==='ENGINEERING_TASK_REQUIRED');
  const observedDomains=uniq(engineeringRows.flatMap((row)=>Array.isArray(row?.domain_ids)?row.domain_ids:[]));
  const providerAvailable=observedDomains.filter((domain)=>providers.includes(domain));
  const noProvider=observedDomains.filter((domain)=>!providers.includes(domain));
  const rows=Object.freeze(engineeringRows.map((row)=>Object.freeze({item_id:row.item_id??null,candidate_id:row.candidate_id??null,source_state:row.source_state??null,domain_ids:Object.freeze(uniq(row.domain_ids)),provider_domains:Object.freeze(uniq((row.domain_ids??[]).filter((domain)=>providers.includes(domain)))),no_provider_domains:Object.freeze(uniq((row.domain_ids??[]).filter((domain)=>!providers.includes(domain))))})));
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_AUTO_ENGINEERING_FAMILY_COVERAGE_V1',status:'TRUTHFUL_COVERAGE_GREEN',environment:PREPROD,provider_domains:Object.freeze(providers),provider_count:providers.length,engineering_debt_count:engineeringRows.length,observed_gap_domains:Object.freeze(observedDomains),provider_available_but_unresolved:Object.freeze(providerAvailable),no_provider_gap_domains:Object.freeze(noProvider),rows,note:'Provider availability is not a FULL claim. An unresolved row remains ENGINEERING_TASK_REQUIRED until source evidence, semantic binding, evaluation, tribunal and any required physical evidence are GREEN.',...safeAuthority()});
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))){const file=process.argv[2];if(!file){process.stderr.write('Usage: node universal-skill-family-coverage-v1.mjs <scale-report.json>\n');process.exitCode=2;}else{const report=JSON.parse(fs.readFileSync(path.resolve(file),'utf8'));process.stdout.write(`${JSON.stringify(buildFamilyCoverageReport({matrix:report.matrix??[]}),null,2)}\n`);}}
