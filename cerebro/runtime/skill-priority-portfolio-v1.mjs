#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const CEREBRO_ROOT=path.resolve(HERE,'..');
const DEFAULT_POLICY=path.join(CEREBRO_ROOT,'registry','skill-priority-portfolio-v1.json');
const DEFAULT_QUEUE=path.join(CEREBRO_ROOT,'registry','skill-full-adoption-v1.json');
const DEFAULT_ENGINES=path.join(CEREBRO_ROOT,'registry','engine-registry.v1.json');
const READONLY_MODES=new Set(['ADVISE','ANALYZE','REVIEW','PLAN','READONLY_OBSERVE']);

function loadJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function normalize(value){return String(value??'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'');}
function candidateText(candidate){return normalize([
  candidate?.technical_name,candidate?.alias_es,candidate?.name,candidate?.description,candidate?.benefit_reason,
  candidate?.upstream,candidate?.manifest_path,candidate?.source_file,candidate?.subpath,candidate?.repository
].filter(Boolean).join(' '));}
function authority(){return Object.freeze({prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,trading_access:false,spend_authorized:false,additional_cost_eur:0});}

export function classifyCandidate(candidate,policy){
  const text=candidateText(candidate);
  const hits=[];
  for(const family of policy?.portfolio??[]){
    const terms=(family?.candidate_terms??[]).map(normalize).filter(Boolean);
    const matched=terms.filter((term)=>text.includes(term));
    if(!matched.length) continue;
    hits.push(Object.freeze({
      capability_family:family.capability_family,
      human_alias_es:family.human_alias_es,
      base_weight:Number(family.weight??0),
      matched_terms:Object.freeze(matched),
      score:Number(family.weight??0)+Math.min(9,matched.length*2),
      priority:Number(family.priority??999),
      global_cross_cutting:family.global_cross_cutting===true,
      primary_engine_bindings:Object.freeze([...(family.primary_engine_bindings??[])])
    }));
  }
  hits.sort((a,b)=>b.score-a.score||a.priority-b.priority||a.capability_family.localeCompare(b.capability_family));
  return Object.freeze({candidate_id:candidate?.candidate_id??null,technical_name:candidate?.technical_name??candidate?.name??null,matched:hits.length>0,best_match:hits[0]??null,matches:Object.freeze(hits)});
}

export function rankPriorityCandidates(candidates,policy){
  const rows=(candidates??[]).map((candidate)=>({candidate,classification:classifyCandidate(candidate,policy)}));
  rows.sort((a,b)=>{
    const as=a.classification.best_match?.score??0;
    const bs=b.classification.best_match?.score??0;
    if(bs!==as)return bs-as;
    const ap=a.classification.best_match?.priority??999;
    const bp=b.classification.best_match?.priority??999;
    if(ap!==bp)return ap-bp;
    return String(a.candidate?.technical_name??a.candidate?.candidate_id??'').localeCompare(String(b.candidate?.technical_name??b.candidate?.candidate_id??''));
  });
  return Object.freeze(rows.map(({candidate,classification},index)=>Object.freeze({
    rank:index+1,
    candidate_id:candidate?.candidate_id??null,
    technical_name:candidate?.technical_name??candidate?.name??null,
    current_status:candidate?.status??null,
    current_evidence:candidate?.current_evidence??null,
    human_required:candidate?.human_required??null,
    priority_match:classification.best_match,
    matched:classification.matched
  })));
}

function isTradingEngine(engineId,policy){
  const id=String(engineId??'');
  if((policy?.global_language_binding?.excluded_engine_ids??[]).includes(id))return true;
  return (policy?.global_language_binding?.excluded_engine_id_prefixes??[]).some((prefix)=>id.startsWith(prefix));
}

export function resolveGlobalLanguageBinding({candidate,policy,engineRegistry,requested_mode='ANALYZE'}={}){
  const classification=classifyCandidate(candidate??{},policy??{});
  const isLanguage=classification.matches.some((x)=>x.capability_family==='LANGUAGE_HUMAN_INTERACTION');
  const blockers=[];
  if(!isLanguage)blockers.push('NOT_LANGUAGE_HUMAN_INTERACTION');
  if(candidate?.prod_capability_state!=='PROD_CAPABILITY_AVAILABLE_READONLY')blockers.push('LANGUAGE_CAPABILITY_NOT_PROD_READONLY_GREEN');
  if(candidate?.human_required!=null)blockers.push('HUMAN_REQUIRED_ACTIVE');
  if(!READONLY_MODES.has(requested_mode))blockers.push('MODE_NOT_READONLY');
  if(Number(candidate?.additional_cost_eur??0)!==0)blockers.push('NONZERO_INCREMENTAL_COST');
  if(candidate?.external_skill_code_execution===true)blockers.push('EXTERNAL_SKILL_CODE_EXECUTION_FORBIDDEN');
  const engineIds=[...(engineRegistry?.engine_ids??[])];
  const targets=engineIds.filter((id)=>!isTradingEngine(id,policy));
  const eligible=blockers.length===0;
  return Object.freeze({
    allowed:eligible,
    status:eligible?'GLOBAL_LANGUAGE_READONLY_BINDING_READY':'HOLD_GLOBAL_LANGUAGE_BINDING',
    candidate_id:candidate?.candidate_id??null,
    technical_name:candidate?.technical_name??null,
    requested_mode,
    target_engine_count:eligible?targets.length:0,
    target_engine_ids:Object.freeze(eligible?targets:[]),
    excluded_engine_ids:Object.freeze(engineIds.filter((id)=>isTradingEngine(id,policy))),
    blockers:Object.freeze(blockers),
    action_authority_source:'ORIGIN_ENGINE_GOVERNED_POLICY_ONLY',
    ...authority()
  });
}

export function buildPriorityReport({policyFile=DEFAULT_POLICY,queueFile=DEFAULT_QUEUE,engineRegistryFile=DEFAULT_ENGINES}={}){
  const policy=loadJson(policyFile);
  const queue=loadJson(queueFile);
  const engines=loadJson(engineRegistryFile);
  const ranked=rankPriorityCandidates(queue?.queue??[],policy);
  const matched=ranked.filter((x)=>x.matched);
  const familyCounts={};
  for(const row of matched){const key=row.priority_match.capability_family;familyCounts[key]=(familyCounts[key]??0)+1;}
  return Object.freeze({
    schema_version:'1.1.0',state_type:'CEREBRO_SKILL_PRIORITY_PORTFOLIO_REPORT_V1',company_id:'GLOBAL',engine_id:'FACT-001',environment:'PREPROD',version:'1.1.0',
    status:'GREEN_PRIORITY_POLICY_ACTIVE',portfolio_count:(policy?.portfolio??[]).length,queue_count:(queue?.queue??[]).length,matched_count:matched.length,
    ranked,capability_family_counts:Object.freeze(familyCounts),canonical_engine_count:(engines?.engine_ids??[]).length,
    registry_version:engines?.schema_version??null,registry_extension_ids:Object.freeze([...(engines?.extension?.added_engine_ids??[])]),
    global_language_binding_policy:policy?.global_language_binding??null,synthetic_human_policy:policy?.synthetic_human_policy??null,
    ...authority()
  });
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const report=buildPriorityReport();
  const text=`${JSON.stringify(report,null,2)}\n`;
  const out=arg('--output');
  if(out){fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(out,text,'utf8');}
  process.stdout.write(text);
}
