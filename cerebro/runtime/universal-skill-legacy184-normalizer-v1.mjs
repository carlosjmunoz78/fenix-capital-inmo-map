#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadActivationRouting,classifyCapability} from './universal-skill-activation-planner-v1.mjs';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CURRENT_EVIDENCE_OVERLAY=path.resolve(__dirname,'../registry/legacy184-current-evidence-overlay.v1.json');
let defaultOverlayCache=null;
function uniq(v){return [...new Set(v??[])];}
function slug(v){return String(v??'item').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function authority(){return {prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};}
const GENERIC_OWNERS=new Set(['FACT-001','JOB-001','RSH-001','LRN-001','QA-001','API-001','ORCH-001','ROUTE-001']);
function ownerScore(domain,owners){let score=0;const overlap=[];owners.forEach((id,index)=>{if(!domain.engine_bindings.includes(id))return;overlap.push(id);if(index===0&&!GENERIC_OWNERS.has(id))score+=20;else if(!GENERIC_OWNERS.has(id))score+=5;else score+=1;});return {score,overlap};}

export function loadLegacy184CurrentEvidenceOverlay({overlay_file=DEFAULT_CURRENT_EVIDENCE_OVERLAY}={}){
  const resolved=path.resolve(overlay_file);
  if(resolved===DEFAULT_CURRENT_EVIDENCE_OVERLAY&&defaultOverlayCache)return defaultOverlayCache;
  if(!fs.existsSync(resolved))return Object.freeze({schema_version:'0.0.0',state_type:'CEREBRO_LEGACY184_CURRENT_EVIDENCE_OVERLAY_ABSENT',items:Object.freeze({})});
  const doc=JSON.parse(fs.readFileSync(resolved,'utf8'));
  if(!doc||typeof doc!=='object'||Array.isArray(doc)||!doc.items||typeof doc.items!=='object')throw new Error('INVALID_LEGACY184_CURRENT_EVIDENCE_OVERLAY');
  const allowed=new Set(['ABSORBED','BLOCKED_EXTERNAL']);
  for(const [id,row] of Object.entries(doc.items)){
    if(!/^\d+$/.test(id)||!row||!allowed.has(row.resolution))throw new Error(`INVALID_LEGACY184_CURRENT_EVIDENCE_ROW:${id}`);
    if(row.resolution==='FULL_SAFE_PREPROD')throw new Error(`FORBIDDEN_LEGACY184_OVERLAY_FULL:${id}`);
    if(!Array.isArray(row.evidence_refs)||row.evidence_refs.length===0)throw new Error(`MISSING_LEGACY184_OVERLAY_EVIDENCE:${id}`);
  }
  const frozen=Object.freeze({...doc,items:Object.freeze({...doc.items})});
  if(resolved===DEFAULT_CURRENT_EVIDENCE_OVERLAY)defaultOverlayCache=frozen;
  return frozen;
}

export function inferLegacyDomains(item,routing=loadActivationRouting()){
  const owners=uniq(item.owner_engine_ids??[]);const description=[item.reason??'',item.next_gate??'',item.state??''].filter(Boolean).join(' ').replaceAll('/',' ');
  const textCapability=classifyCapability({capability_id:`legacy-domain:${item.id??'x'}`,technical_name:String(item.name??'legacy capability'),description,terms:[]},routing);
  const textByDomain=new Map((textCapability.classification_evidence??[]).map((x)=>[x.domain_id,x]));const rows=[];
  for(const domain of routing.signals.domains){const owner=ownerScore(domain,owners);const text=textByDomain.get(domain.domain_id);const textScore=Number(text?.score??0);if(owner.score<=0&&textScore<=0)continue;rows.push({domain_id:domain.domain_id,score:textScore*10+owner.score,text_score:textScore,owner_score:owner.score,overlap:owner.overlap,text_matches:text?.matches??[]});}
  const withText=rows.filter((x)=>x.text_score>0);let selected=[];if(withText.length){const topText=Math.max(...withText.map((x)=>x.text_score));const floor=topText>=4?Math.ceil(topText*0.75):2;selected=withText.filter((x)=>x.text_score>=floor);}if(!selected.length&&rows.length){const topOwner=Math.max(...rows.map((x)=>x.owner_score));selected=rows.filter((x)=>x.owner_score===topOwner&&topOwner>0);}selected.sort((a,b)=>b.score-a.score||a.domain_id.localeCompare(b.domain_id));return Object.freeze(selected.map((x)=>Object.freeze({...x,overlap:Object.freeze([...x.overlap]),text_matches:Object.freeze([...x.text_matches])})));
}

export function normalizeLegacy184Item(item,{source_ref='legacy184:unknown',routing=loadActivationRouting(),current_evidence_overlay=loadLegacy184CurrentEvidenceOverlay()}={}){
  if(!Number.isInteger(item?.id)||!item?.name)throw new Error('INVALID_LEGACY_184_ITEM');
  const overlayRow=current_evidence_overlay?.items?.[String(item.id)]??null;
  const evidence=uniq([source_ref,...(item.evidence??[]),...(overlayRow?.evidence_refs??[])]).filter(Boolean);
  const candidate_id=`legacy184:${item.id}:${slug(item.name)}`;
  const common={company_id:'fenix',candidate_id,technical_name:slug(item.name),description:`${item.name}. ${item.reason??''}`,source_refs:evidence,inventory_complete:true,dependencies_mapped:true,reuse_checked:true,additional_cost_eur:0};
  const reconciliation=overlayRow?{evidence_resolution:overlayRow.resolution,reconciled_state:overlayRow.current_state??null,reconciliation_reason:overlayRow.reason??null,reconciliation_evidence_refs:Object.freeze([...(overlayRow.evidence_refs??[])]),remaining_gate:overlayRow.remaining_gate??null}:{};
  if(overlayRow?.resolution==='ABSORBED')return Object.freeze({source_item_id:item.id,source_disposition:item.disposition,source_state:item.state,expected_outcome:'ABSORBED',activation_input:{...common,provenance_license_green:true,reuse_assessment:{decision:'ABSORB',evidence_refs:evidence}},candidate_evidence:{semantic_bindings:[]},...reconciliation,...authority()});
  if(overlayRow?.resolution==='BLOCKED_EXTERNAL')return Object.freeze({source_item_id:item.id,source_disposition:item.disposition,source_state:item.state,expected_outcome:'BLOCKED_EXTERNAL',activation_input:{...common,provenance_license_green:false},candidate_evidence:{semantic_bindings:[]},...reconciliation,...authority()});
  if(item.disposition==='REUTILIZAR'&&String(item.state??'').includes('FULL_PREPROD'))return Object.freeze({source_item_id:item.id,source_disposition:item.disposition,source_state:item.state,expected_outcome:'ABSORBED',activation_input:{...common,provenance_license_green:true,reuse_assessment:{decision:'ABSORB',evidence_refs:evidence}},candidate_evidence:{semantic_bindings:[]},...authority()});
  if(String(item.state??'').includes('PHYSICAL')||String(item.next_gate??'').includes('PHYSICAL'))return Object.freeze({source_item_id:item.id,source_disposition:item.disposition,source_state:item.state,expected_outcome:'BLOCKED_EXTERNAL',activation_input:{...common,provenance_license_green:false},candidate_evidence:{semantic_bindings:[]},...authority()});
  if(item.disposition==='FABRICAR_GRATIS'||item.disposition==='ENVOLVER'){const inferred=inferLegacyDomains(item,routing);if(!inferred.length)return Object.freeze({source_item_id:item.id,source_disposition:item.disposition,source_state:item.state,expected_outcome:'HUMAN_REQUIRED',activation_input:{...common,provenance_license_green:true,description:`unmapped ${item.name}`},candidate_evidence:{semantic_bindings:[]},...authority()});const capabilities=inferred.map((d,i)=>({capability_id:`${candidate_id}:cap:${i+1}`,technical_name:`${slug(item.name)}-${d.domain_id}`,description:common.description,terms:d.text_matches,declared_domains:[d.domain_id],domain_evidence:{[d.domain_id]:evidence}}));return Object.freeze({source_item_id:item.id,source_disposition:item.disposition,source_state:item.state,expected_outcome:'ENGINEERING_TASK_REQUIRED',domain_inference:Object.freeze(inferred),activation_input:{...common,provenance_license_green:true,capabilities},candidate_evidence:{semantic_bindings:[]},...authority()});}
  const terminal=(item.disposition==='HOLD'||item.disposition==='DESCARTAR'||item.disposition==='CATALOGAR')?'REJECTED':'BLOCKED_EXTERNAL';return Object.freeze({source_item_id:item.id,source_disposition:item.disposition,source_state:item.state,expected_outcome:terminal,excluded_from_activation_batch:true,terminal_reason:item.reason??item.state??item.disposition,evidence_refs:evidence,...authority()});
}

export function selectBlindLegacyBatch(document,{limit=4,source_ref='legacy184:document',current_evidence_overlay=loadLegacy184CurrentEvidenceOverlay()}={}){if(!document||!Array.isArray(document.items))throw new Error('LEGACY_DOCUMENT_ITEMS_REQUIRED');const normalized=document.items.map((item)=>normalizeLegacy184Item(item,{source_ref,current_evidence_overlay}));const eligible=normalized.filter((x)=>!x.excluded_from_activation_batch);const categories=['ABSORBED','BLOCKED_EXTERNAL','ENGINEERING_TASK_REQUIRED','HUMAN_REQUIRED'];const selected=[];for(const category of categories){const row=eligible.find((x)=>x.expected_outcome===category&&!selected.includes(x));if(row)selected.push(row);if(selected.length>=limit)break;}for(const row of eligible){if(selected.length>=limit)break;if(!selected.includes(row))selected.push(row);}return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_BLIND_LEGACY184_BATCH_SELECTION_V1',catalog_range:document.catalog_range??null,selected:Object.freeze(selected),excluded_terminal:Object.freeze(normalized.filter((x)=>x.excluded_from_activation_batch)),...authority()});}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))){const file=process.argv[2];if(!file){process.stderr.write('Usage: node universal-skill-legacy184-normalizer-v1.mjs <reconciliation.json>\n');process.exitCode=2;}else{const doc=JSON.parse(fs.readFileSync(file,'utf8'));process.stdout.write(`${JSON.stringify(selectBlindLegacyBatch(doc,{source_ref:file}),null,2)}\n`);}}
