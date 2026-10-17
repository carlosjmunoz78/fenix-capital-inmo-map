#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadActivationRouting} from './universal-skill-activation-planner-v1.mjs';

function uniq(v){return [...new Set(v??[])];}
function slug(v){return String(v??'item').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function authority(){return {prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};}

export function inferLegacyDomains(item,routing=loadActivationRouting()){
  const owners=new Set(item.owner_engine_ids??[]);const scored=[];
  for(const d of routing.signals.domains){const overlap=d.engine_bindings.filter((id)=>owners.has(id));if(overlap.length)scored.push({domain_id:d.domain_id,score:overlap.length,overlap});}
  scored.sort((a,b)=>b.score-a.score||a.domain_id.localeCompare(b.domain_id));
  const top=scored[0]?.score??0;
  return Object.freeze(scored.filter((x)=>x.score===top).map((x)=>Object.freeze(x)));
}

export function normalizeLegacy184Item(item,{source_ref='legacy184:unknown',routing=loadActivationRouting()}={}){
  if(!Number.isInteger(item?.id)||!item?.name)throw new Error('INVALID_LEGACY_184_ITEM');
  const evidence=uniq([source_ref,...(item.evidence??[])]).filter(Boolean);
  const candidate_id=`legacy184:${item.id}:${slug(item.name)}`;
  const common={company_id:'fenix',candidate_id,technical_name:slug(item.name),description:`${item.name}. ${item.reason??''}`,source_refs:evidence,inventory_complete:true,dependencies_mapped:true,reuse_checked:true,additional_cost_eur:0};

  if(item.disposition==='REUTILIZAR'&&String(item.state??'').includes('FULL_PREPROD')){
    return Object.freeze({source_item_id:item.id,source_disposition:item.disposition,source_state:item.state,expected_outcome:'ABSORBED',activation_input:{...common,provenance_license_green:true,reuse_assessment:{decision:'ABSORB',evidence_refs:evidence}},candidate_evidence:{semantic_bindings:[]},...authority()});
  }
  if(String(item.state??'').includes('PHYSICAL')||String(item.next_gate??'').includes('PHYSICAL')){
    return Object.freeze({source_item_id:item.id,source_disposition:item.disposition,source_state:item.state,expected_outcome:'BLOCKED_EXTERNAL',activation_input:{...common,provenance_license_green:false},candidate_evidence:{semantic_bindings:[]},...authority()});
  }
  if(item.disposition==='FABRICAR_GRATIS'||item.disposition==='ENVOLVER'){
    const inferred=inferLegacyDomains(item,routing);
    if(!inferred.length)return Object.freeze({source_item_id:item.id,source_disposition:item.disposition,source_state:item.state,expected_outcome:'HUMAN_REQUIRED',activation_input:{...common,provenance_license_green:true,description:`unmapped ${item.name}`},candidate_evidence:{semantic_bindings:[]},...authority()});
    const capabilities=inferred.map((d,i)=>({capability_id:`${candidate_id}:cap:${i+1}`,technical_name:`${slug(item.name)}-${d.domain_id}`,declared_domains:[d.domain_id],domain_evidence:{[d.domain_id]:evidence}}));
    return Object.freeze({source_item_id:item.id,source_disposition:item.disposition,source_state:item.state,expected_outcome:'ENGINEERING_TASK_REQUIRED',activation_input:{...common,provenance_license_green:true,capabilities},candidate_evidence:{semantic_bindings:[]},...authority()});
  }
  const terminal=(item.disposition==='HOLD'||item.disposition==='DESCARTAR'||item.disposition==='CATALOGAR')?'REJECTED':'BLOCKED_EXTERNAL';
  return Object.freeze({source_item_id:item.id,source_disposition:item.disposition,source_state:item.state,expected_outcome:terminal,excluded_from_activation_batch:true,terminal_reason:item.reason??item.state??item.disposition,evidence_refs:evidence,...authority()});
}

export function selectBlindLegacyBatch(document,{limit=4,source_ref='legacy184:document'}={}){
  if(!document||!Array.isArray(document.items))throw new Error('LEGACY_DOCUMENT_ITEMS_REQUIRED');
  const normalized=document.items.map((item)=>normalizeLegacy184Item(item,{source_ref}));
  const eligible=normalized.filter((x)=>!x.excluded_from_activation_batch);
  const categories=['ABSORBED','BLOCKED_EXTERNAL','ENGINEERING_TASK_REQUIRED','HUMAN_REQUIRED'];const selected=[];
  for(const category of categories){const row=eligible.find((x)=>x.expected_outcome===category&&!selected.includes(x));if(row)selected.push(row);if(selected.length>=limit)break;}
  for(const row of eligible){if(selected.length>=limit)break;if(!selected.includes(row))selected.push(row);}
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_BLIND_LEGACY184_BATCH_SELECTION_V1',catalog_range:document.catalog_range??null,selected:Object.freeze(selected),excluded_terminal:Object.freeze(normalized.filter((x)=>x.excluded_from_activation_batch)),...authority()});
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))){const file=process.argv[2];if(!file){process.stderr.write('Usage: node universal-skill-legacy184-normalizer-v1.mjs <reconciliation.json>\n');process.exitCode=2;}else{const doc=JSON.parse(fs.readFileSync(file,'utf8'));process.stdout.write(`${JSON.stringify(selectBlindLegacyBatch(doc,{source_ref:file}),null,2)}\n`);}}
