#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {planFactEngineeringTask} from './fact-safe-engineering-bootstrap-v1.mjs';

const PREPROD='PREPROD';
const VERSION='1.0.0';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SIGNALS=path.resolve(__dirname,'../skills/internal-capability-signals.v0.json');
const DEFAULT_ENGINES=path.resolve(__dirname,'../registry/engine-registry.v1.json');

function req(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim();}
function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function uniq(values){return [...new Set(values)];}
function normalizeText(value){return String(value??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9+#./-]+/g,' ').replace(/\s+/g,' ').trim();}
function stringList(value,label){if(value==null)return [];if(!Array.isArray(value))throw new Error(`${label} must be array`);return uniq(value.map((x)=>req(x,label)));}
function authority(){return Object.freeze({prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,dependency_install_authorized:false,customer_data_authorized:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0});}

export function loadActivationRouting({signalsFile=DEFAULT_SIGNALS,enginesFile=DEFAULT_ENGINES}={}){
  const signals=JSON.parse(fs.readFileSync(signalsFile,'utf8'));
  const engines=JSON.parse(fs.readFileSync(enginesFile,'utf8'));
  if(signals.status!=='ROUTING_SIGNALS_ONLY_NOT_IMPLEMENTATION_CLAIMS'||signals.owner_engine_id!=='FACT-001')throw new Error('INVALID_CAPABILITY_ROUTING_SIGNALS');
  if(!Array.isArray(signals.domains)||signals.domains.length===0)throw new Error('CAPABILITY_DOMAINS_REQUIRED');
  if(engines.state_type!=='CEREBRO_ENGINE_REGISTRY_V1'||!Array.isArray(engines.engine_ids)||engines.engine_ids.length!==engines.count)throw new Error('INVALID_ENGINE_REGISTRY');
  const known=new Set(engines.engine_ids);
  for(const domain of signals.domains){
    req(domain.domain_id,'domain_id');
    if(!Array.isArray(domain.engine_bindings)||domain.engine_bindings.length===0)throw new Error(`DOMAIN_BINDINGS_REQUIRED:${domain.domain_id}`);
    for(const id of domain.engine_bindings)if(!known.has(id))throw new Error(`UNKNOWN_CANONICAL_ENGINE:${domain.domain_id}:${id}`);
  }
  return Object.freeze({signals,engines});
}

function phraseWeight(keyword){const words=normalizeText(keyword).split(' ').filter(Boolean).length;return words>=3?5:words===2?3:2;}

export function classifyCapability(capability,routing){
  const capability_id=req(capability.capability_id??capability.technical_name??'capability','capability_id');
  const technical_name=req(capability.technical_name??capability_id,'technical_name');
  const description=String(capability.description??'').trim();
  const terms=stringList(capability.terms??[],'terms');
  const declared=stringList(capability.declared_domains??[],'declared_domains');
  const domainEvidence=capability.domain_evidence??{};
  const domainsById=new Map(routing.signals.domains.map((d)=>[d.domain_id,d]));
  for(const id of declared)if(!domainsById.has(id))throw new Error(`UNKNOWN_DECLARED_DOMAIN:${id}`);

  const haystack=` ${normalizeText([technical_name,description,...terms].join(' '))} `;
  const scored=[];
  for(const domain of routing.signals.domains){
    let score=0;const matches=[];let declaredEvidence=false;
    if(declared.includes(domain.domain_id)){
      const refs=Array.isArray(domainEvidence[domain.domain_id])?domainEvidence[domain.domain_id].filter((x)=>typeof x==='string'&&x.trim()):[];
      if(refs.length){score+=100;declaredEvidence=true;matches.push(`declared:${domain.domain_id}`);}
    }
    for(const keyword of domain.keywords??[]){
      const normalized=normalizeText(keyword);if(!normalized)continue;
      if(haystack.includes(` ${normalized} `)||haystack.includes(` ${normalized}-`)||haystack.includes(`-${normalized} `)){
        score+=phraseWeight(keyword);matches.push(keyword);
      }
    }
    if(score>0)scored.push({domain_id:domain.domain_id,score,matches:uniq(matches).sort(),declared_evidence:declaredEvidence,engine_bindings:[...domain.engine_bindings]});
  }

  scored.sort((a,b)=>b.score-a.score||a.domain_id.localeCompare(b.domain_id));
  const top=scored[0]?.score??0;
  const selected=scored.filter((x)=>x.declared_evidence||(x.score>=3&&x.score>=Math.max(3,Math.floor(top*0.5))));
  const confidence=top>=100?'HIGH':top>=8?'HIGH':top>=4?'MEDIUM':top>=3?'LOW':'NONE';
  const bindings=uniq(selected.flatMap((x)=>x.engine_bindings));

  return Object.freeze({
    capability_id,technical_name,description,terms:Object.freeze(terms),
    status:selected.length?'CLASSIFIED':'LOW_CONFIDENCE',confidence,
    domains:Object.freeze(selected.map((x)=>Object.freeze({...x,engine_bindings:Object.freeze(x.engine_bindings)}))),
    target_engine_bindings:Object.freeze(bindings),binding_count:bindings.length,
    classification_evidence:Object.freeze(scored.map((x)=>Object.freeze({domain_id:x.domain_id,score:x.score,matches:Object.freeze(x.matches),declared_evidence:x.declared_evidence})))
  });
}

function normalizeCapabilities(input){
  if(Array.isArray(input.capabilities)&&input.capabilities.length){
    return input.capabilities.map((cap,index)=>({
      ...cap,
      capability_id:cap.capability_id??`${input.candidate_id}:cap:${index+1}`,
      technical_name:cap.technical_name??cap.capability_id??`${input.technical_name}:cap:${index+1}`
    }));
  }
  return [{
    capability_id:input.capability_id??input.candidate_id,
    technical_name:input.technical_name,
    description:input.description,
    terms:input.terms,
    declared_domains:input.declared_domains,
    domain_evidence:input.domain_evidence
  }];
}

export function buildUniversalActivationPlan(input={},options={}){
  const candidate_id=req(input.candidate_id,'candidate_id');
  const technical_name=req(input.technical_name,'technical_name');
  const source_refs=stringList(input.source_refs??[],'source_refs');
  const routing=options.routing??loadActivationRouting(options);

  const engineering=planFactEngineeringTask({
    company_id:input.company_id??'fenix',candidate_id,task_kind:'ACTIVATION_PLAN',
    objective:`Resolve governed activation plan for ${technical_name}`,source_refs,
    inventory_complete:input.inventory_complete===true,
    dependencies_mapped:input.dependencies_mapped===true,
    reuse_checked:input.reuse_checked===true,
    mutation:false,planned_files_changed:0,additional_cost_eur:Number(input.additional_cost_eur??0),
    low_confidence:false,policy_conflict:input.policy_conflict===true
  });

  const base={schema_version:'1.0.0',state_type:'CEREBRO_UNIVERSAL_SKILL_ACTIVATION_PLAN_V1',company_id:input.company_id??'fenix',engine_id:'FACT-001',environment:PREPROD,version:VERSION,candidate_id,technical_name,source_refs:Object.freeze(source_refs),...authority()};

  if(engineering.status!=='FACT_ENGINEERING_READY'){
    return Object.freeze({...base,status:engineering.status,terminal_state:null,engineering_task:engineering,capabilities:Object.freeze([]),target_engine_bindings:Object.freeze([]),binding_count:0,blockers:Object.freeze([...engineering.blockers]),human_required:Object.freeze([...engineering.human_required]),next_gate:engineering.status});
  }

  const reuse=input.reuse_assessment??null;
  if(reuse?.decision==='ABSORB'){
    const evidence=stringList(reuse.evidence_refs??[],'reuse evidence_refs');
    if(!evidence.length)throw new Error('ABSORB_REQUIRES_EVIDENCE');
    const seed={candidate_id,technical_name,reuse,evidence};
    return Object.freeze({...base,plan_id:`actplan_${hash(seed).slice(0,24)}`,status:'TERMINAL',terminal_state:'ABSORBED',engineering_task:engineering,capabilities:Object.freeze([]),target_engine_bindings:Object.freeze([]),binding_count:0,blockers:Object.freeze([]),human_required:Object.freeze([]),reuse_evidence:Object.freeze(evidence),next_gate:'NONE_TERMINAL'});
  }

  if(input.provenance_license_green!==true){
    const seed={candidate_id,technical_name,reason:'PROVENANCE_LICENSE_NOT_GREEN'};
    return Object.freeze({...base,plan_id:`actplan_${hash(seed).slice(0,24)}`,status:'HOLD',terminal_state:null,engineering_task:engineering,capabilities:Object.freeze([]),target_engine_bindings:Object.freeze([]),binding_count:0,blockers:Object.freeze(['provenance_license_green_required']),human_required:Object.freeze([]),next_gate:'PROVENANCE_AND_LICENSE_GREEN'});
  }

  const capabilities=normalizeCapabilities(input).map((cap)=>classifyCapability(cap,routing));
  const low=capabilities.filter((x)=>x.status==='LOW_CONFIDENCE');
  if(low.length){
    const seed={candidate_id,technical_name,low:low.map((x)=>x.capability_id)};
    return Object.freeze({...base,plan_id:`actplan_${hash(seed).slice(0,24)}`,status:'HUMAN_REQUIRED',terminal_state:null,engineering_task:engineering,capabilities:Object.freeze(capabilities),target_engine_bindings:Object.freeze([]),binding_count:0,blockers:Object.freeze(['capability_domain_low_confidence']),human_required:Object.freeze(['LOW_CONFIDENCE']),next_gate:'LOW_CONFIDENCE'});
  }

  const bindings=uniq(capabilities.flatMap((x)=>x.target_engine_bindings));
  const domain_ids=uniq(capabilities.flatMap((x)=>x.domains.map((d)=>d.domain_id)));
  const seed={candidate_id,technical_name,capabilities:capabilities.map((x)=>({capability_id:x.capability_id,domains:x.domains.map((d)=>d.domain_id),bindings:x.target_engine_bindings})),bindings};
  const plan_id=`actplan_${hash(seed).slice(0,24)}`;
  return Object.freeze({
    ...base,plan_id,status:'ACTIVATION_PLAN_READY',terminal_state:null,engineering_task:engineering,
    capabilities:Object.freeze(capabilities),domain_ids:Object.freeze(domain_ids),
    target_engine_bindings:Object.freeze(bindings),binding_count:bindings.length,
    blockers:Object.freeze([]),human_required:Object.freeze([]),
    gates:Object.freeze(['SAFE_WRAPPER_OR_REUSE_PATH','SEMANTIC_CONTRACTS_RESOLVED','REAL_BINDING_EXECUTION','OLD_VS_NEW_PER_BINDING','QA_EVA_TRIBUNAL','LRN_OBS_AUDIT_FINOPS','BACKUP_ROLLBACK_REBUILD','PHYSICAL_PREPROD_WHERE_REQUIRED']),
    next_gate:'B3_SEMANTIC_CONTRACT_FAMILIES'
  });
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))){
  const file=process.argv[2];
  if(!file){process.stderr.write('Usage: node universal-skill-activation-planner-v1.mjs <candidate.json>\n');process.exitCode=2;}
  else{try{const input=JSON.parse(fs.readFileSync(file,'utf8'));process.stdout.write(`${JSON.stringify(buildUniversalActivationPlan(input),null,2)}\n`);}catch(error){process.stderr.write(`${JSON.stringify({status:'RED_FAIL_CLOSED',error:error.message,...authority()})}\n`);process.exitCode=1;}}
}
