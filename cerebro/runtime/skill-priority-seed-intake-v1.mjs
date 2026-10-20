#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const CEREBRO_ROOT=path.resolve(HERE,'..');
const DEFAULT_SEEDS=path.join(CEREBRO_ROOT,'registry','skill-priority-seed-sources-v1.json');

function loadJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function req(value,label){const out=String(value??'').trim();if(!out)throw new Error(`${label} required`);return out;}
function safePinnedUrl(value){const url=req(value,'github_url');if(!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/tree\/[a-f0-9]{40}(?:\/.*)?$/.test(url))throw new Error(`unsafe or unpinned github_url:${url}`);return url;}
function authority(){return Object.freeze({prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,dependency_install_authorized:false,customer_data_authorized:false,trading_access:false,spend_authorized:false,additional_cost_eur:0});}

export function buildPrioritySeedEvent({seeds,company_id='fenix'}={}){
  if(!seeds||seeds.state_type!=='CEREBRO_SKILL_PRIORITY_SEED_SOURCES_V1')throw new Error('priority seed registry required');
  const rows=[...(seeds.sources??[])];
  if(!rows.length)throw new Error('priority seed registry empty');
  const urls=[];const seen=new Set();
  for(const row of rows.sort((a,b)=>Number(a.priority??999)-Number(b.priority??999)||String(a.technical_name??'').localeCompare(String(b.technical_name??'')))){
    if(row.license_spdx!=='MIT')throw new Error(`seed license not pre-evidenced MIT:${row.technical_name}`);
    if(row.execution_policy!=='INERT_TEXT_ONLY_UNTIL_CEREBRO_WRAPPER_GATES_PASS')throw new Error(`unsafe execution policy:${row.technical_name}`);
    const url=safePinnedUrl(row.github_url);
    if(!seen.has(url)){seen.add(url);urls.push(url);}
  }
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_SKILL_PRIORITY_SEED_EVENT_V1',status:'PRIORITY_PINNED_SEEDS_READY',company_id:req(company_id,'company_id'),engine_id:'FACT-001',environment:'PREPROD',version:'1.0.0',
    priority_seed_count:urls.length,client_payload:Object.freeze({company_id:req(company_id,'company_id'),github_urls:Object.freeze(urls)}),
    source_registry:'cerebro/registry/skill-priority-seed-sources-v1.json',...authority()
  });
}

export function buildFromFile({seedFile=DEFAULT_SEEDS,company_id='fenix'}={}){return buildPrioritySeedEvent({seeds:loadJson(seedFile),company_id});}
function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  try{
    const out=req(arg('--out'),'--out');const company=arg('--company-id')??process.env.CEREBRO_COMPANY_ID??'fenix';const event=buildFromFile({company_id:company});
    fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(out,`${JSON.stringify(event,null,2)}\n`,{mode:0o600});
    process.stdout.write(`${JSON.stringify({status:event.status,priority_seed_count:event.priority_seed_count,environment:event.environment,prod_write:false,external_skill_code:false,trading:false,cost_eur:0})}\n`);
  }catch(error){process.stderr.write(`${JSON.stringify({status:'RED_FAIL_CLOSED',error:String(error?.message??error),...authority()})}\n`);process.exitCode=1;}
}
