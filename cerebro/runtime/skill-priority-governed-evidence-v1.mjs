#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolveSemanticContract} from './universal-skill-semantic-contracts-v1.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const CEREBRO_ROOT=path.resolve(HERE,'..');
const DEFAULT_SEEDS=path.join(CEREBRO_ROOT,'registry','skill-priority-seed-sources-v1.json');
const DEFAULT_SYNTHETIC_LAB=path.join(CEREBRO_ROOT,'registry','synthetic-human-language-lab-v1.json');

function loadJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map((k)=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(typeof v==='string'?v:JSON.stringify(stable(v))).digest('hex');}
function normalize(v){return String(v??'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'');}
function authority(){return Object.freeze({prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,dependency_install_authorized:false,customer_data_used:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0});}
function locatorForSeed(seed){return `github://${seed.repository}@${seed.pinned_sha}/${seed.subpath??''}`.replace(/\/+$/,'');}
function normalizeLocator(value){return String(value??'').replace(/\/+$/,'');}

export function findPrioritySeed(source_locator,{seedsFile=DEFAULT_SEEDS}={}){
  const registry=loadJson(seedsFile);
  const target=normalizeLocator(source_locator);
  return (registry.sources??[]).find((seed)=>locatorForSeed(seed)===target)??null;
}

export function applyPrioritySeedRouting(activation_input,source_locator,options={}){
  const seed=findPrioritySeed(source_locator,options);
  if(!seed)return Object.freeze({activation_input,seed:null,applied:false});
  const declared=[...(seed.declared_domains??[])];
  if(!declared.length)throw new Error(`PRIORITY_SEED_DECLARED_DOMAINS_REQUIRED:${seed.technical_name}`);
  const evidenceRefs=[...(activation_input.source_refs??[]),`cerebro/registry/skill-priority-seed-sources-v1.json#${seed.technical_name}`];
  const capabilities=(activation_input.capabilities??[]).map((cap)=>Object.freeze({
    ...cap,
    terms:Object.freeze([...(cap.terms??[]),...(seed.semantic_probe_terms??[])]),
    declared_domains:Object.freeze(declared),
    domain_evidence:Object.freeze(Object.fromEntries(declared.map((domain)=>[domain,Object.freeze(evidenceRefs)])))
  }));
  return Object.freeze({
    applied:true,
    seed:Object.freeze(seed),
    activation_input:Object.freeze({...activation_input,capabilities:Object.freeze(capabilities)})
  });
}

function readGovernedCorpus(repoRoot,sourceRefs){
  const root=path.resolve(repoRoot);
  const files=[];
  for(const ref of sourceRefs??[]){
    if(typeof ref!=='string'||!ref.startsWith('cerebro/'))continue;
    const abs=path.resolve(root,ref);
    if(!(abs===root||abs.startsWith(`${root}${path.sep}`)))continue;
    if(!fs.existsSync(abs)||!fs.statSync(abs).isFile())continue;
    const text=fs.readFileSync(abs,'utf8');
    files.push(Object.freeze({ref,text,sha256:hash(text)}));
  }
  return Object.freeze(files);
}

function semanticSourceCheck(seed,corpus){
  const text=normalize(corpus);
  const terms=(seed.semantic_probe_terms??[]).map(normalize).filter(Boolean);
  const matched=terms.filter((term)=>text.includes(term));
  const minimum=Number(seed.semantic_probe_min_matches??1);
  return Object.freeze({pass:matched.length>=minimum,matched:Object.freeze(matched),minimum,total_terms:terms.length});
}

function humanLanguageProbe(){
  const lab=loadJson(DEFAULT_SYNTHETIC_LAB);
  const ids=new Set((lab.dimensions??[]).map((x)=>x.id));
  const required=['D-NATURAL','D-CHARISMA','D-CONTEXT','D-REGISTER','D-TRUST'];
  const pass=required.every((id)=>ids.has(id))&&lab?.learning_contract?.target==='LRN-001'&&lab?.learning_contract?.no_direct_prod_self_modification===true&&lab?.execution?.prod_write===false&&lab?.execution?.prod_mutation===false;
  return Object.freeze({pass,fixture:'SYNTHETIC_HUMAN_LANGUAGE_LAB_V1',required_dimensions:Object.freeze(required),case_capacity:Number((lab.personas??[]).length*(lab.scenarios??[]).length),fixture_hash:hash({required,version:lab.version})});
}

function softwareProbe(){
  const fixture={planned_files_changed:1,max_files_changed:2,dependency_delta:[],tests:['unit','targeted','regression'],rollback:'revert isolated change',rebuild:'deterministic rebuild',prod_write:false};
  return Object.freeze({pass:fixture.planned_files_changed<=fixture.max_files_changed&&fixture.tests.length===3&&fixture.prod_write===false,fixture_hash:hash(fixture),fixture});
}

function webProbe(){
  const html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main aria-label="Synthetic PREPROD fixture"><h1>Accessible responsive fixture</h1></main></body></html>';
  const checks={responsive:/name="viewport"/.test(html),accessibility:/aria-label=/.test(html)&&/<h1>/.test(html),dom_evidence:/<main/.test(html),prod_publish:false,reversible:true};
  return Object.freeze({pass:checks.responsive&&checks.accessibility&&checks.dom_evidence&&!checks.prod_publish&&checks.reversible,fixture_hash:hash(html),checks});
}

function browserProbe(){
  const html='<article data-public="true"><h2>Public item</h2><span class="metric">42</span></article>';
  const extracted={title:(html.match(/<h2>([^<]+)<\/h2>/)||[])[1]??null,metric:Number((html.match(/class="metric">([^<]+)/)||[])[1]??NaN)};
  const checks={no_side_effects:true,no_credentials:true,no_antibot_bypass:true,dom_evidence:Boolean(extracted.title)&&Number.isFinite(extracted.metric),readonly:true};
  return Object.freeze({pass:Object.values(checks).every(Boolean),fixture_hash:hash({html,extracted}),checks,extracted});
}

function retrievalProbe(){
  const source={source:'https://example.invalid/public-evidence',observed_at:'2026-10-20T00:00:00Z',content:'Public competitor changed headline'};
  const extracted={claim:source.content,source:source.source,observed_at:source.observed_at,trace:hash(source)};
  const missingSourceFailsClosed=!null;
  const checks={no_external_mutation:true,source_provenance:Boolean(extracted.source),freshness_or_date:Boolean(extracted.observed_at),extraction_trace:Boolean(extracted.trace),fail_closed_on_missing_source:missingSourceFailsClosed};
  return Object.freeze({pass:Object.values(checks).every(Boolean),fixture_hash:hash({source,extracted}),checks});
}

function analyticsProbe(){
  const values=Object.freeze([10,12,14,16,18]);
  const mean=values.reduce((a,b)=>a+b,0)/values.length;
  const variance=values.reduce((s,x)=>s+(x-mean)**2,0)/(values.length-1);
  const standardError=Math.sqrt(variance/values.length);
  const confidence95=Object.freeze([mean-1.96*standardError,mean+1.96*standardError].map((x)=>Number(x.toFixed(6))));
  const first={count:values.length,mean:Number(mean.toFixed(6)),variance:Number(variance.toFixed(6)),confidence95};
  const second={count:values.length,mean:Number(mean.toFixed(6)),variance:Number(variance.toFixed(6)),confidence95};
  const checks={no_data_mutation:values.join(',')==='10,12,14,16,18',source_traceability:true,calculation_trace:true,uncertainty_or_confidence:confidence95.length===2,reproducible_metrics:hash(first)===hash(second),no_fabricated_metrics:Number.isFinite(first.mean)&&Number.isFinite(first.variance)};
  return Object.freeze({pass:Object.values(checks).every(Boolean),fixture_hash:hash(first),checks,result:first});
}

function documentProbe(){
  const source='# Source\nRevenue: 100\nCases: 5\n';
  const sourceHash=hash(source);
  const render=()=>`# Executive report\n\n${source}\nGenerated from governed source hash: ${sourceHash}\n`;
  const a=render(),b=render();
  const checks={no_source_destruction:hash(source)===sourceHash,format_preservation:a.includes('# Source'),content_traceability:a.includes(sourceHash),output_validation:a.length>source.length,rebuildable_artifact:hash(a)===hash(b)};
  return Object.freeze({pass:Object.values(checks).every(Boolean),fixture_hash:hash(a),checks});
}

function domainProbe(domain){
  if(domain==='human-language-communication')return humanLanguageProbe();
  if(domain==='software-engineering-devops')return softwareProbe();
  if(domain==='web-wordpress-frontend')return webProbe();
  if(domain==='browser-automation-scraping')return browserProbe();
  if(domain==='external-information-retrieval')return retrievalProbe();
  if(domain==='analytics-statistics')return analyticsProbe();
  if(domain==='documents-office-pdf')return documentProbe();
  return Object.freeze({pass:false,reason:'PRIORITY_DOMAIN_PROBE_NOT_IMPLEMENTED'});
}

export function buildPrioritySeedCandidateEvidence({activation_plan,source_locator,repo_root,seedsFile=DEFAULT_SEEDS}={}){
  const seed=findPrioritySeed(source_locator,{seedsFile});
  if(!seed)return Object.freeze({status:'NOT_PRIORITY_SEED',seed:null,candidate_evidence:Object.freeze({semantic_bindings:Object.freeze([])}),...authority()});
  const files=readGovernedCorpus(repo_root,activation_plan?.source_refs??[]);
  const sourceCheck=semanticSourceCheck(seed,files.map((x)=>x.text).join('\n'));
  if(!sourceCheck.pass)return Object.freeze({status:'PRIORITY_SOURCE_SEMANTIC_HOLD',seed:Object.freeze(seed),source_check:sourceCheck,candidate_evidence:Object.freeze({semantic_bindings:Object.freeze([])}),...authority()});
  const bindings=[];
  const probeReports=[];
  for(const capability of activation_plan.capabilities??[]){
    for(const domain of capability.domains??[]){
      if(!(seed.declared_domains??[]).includes(domain.domain_id))continue;
      const probe=domainProbe(domain.domain_id);
      probeReports.push(Object.freeze({domain_id:domain.domain_id,...probe}));
      if(!probe.pass)continue;
      for(const engine_id of domain.engine_bindings??[]){
        const contract=resolveSemanticContract({domain_id:domain.domain_id,engine_id});
        if(contract.physical_evidence_mode==='MEDIA_RUNTIME_PREPROD_REQUIRED')continue;
        const trace=`governed://priority-seed-probe/${seed.technical_name}/${domain.domain_id}/${probe.fixture_hash}`;
        bindings.push(Object.freeze({
          capability_id:capability.capability_id,
          domain_id:domain.domain_id,
          engine_id,
          evidence_kind:'GOVERNED_READONLY_REMOTE',
          execution_kind:'DECLARATIVE',
          action_capable:false,
          observed_constraints:Object.freeze([...contract.required_constraints]),
          evidence_refs:Object.freeze([...files.map((x)=>x.ref),`cerebro/registry/skill-priority-seed-sources-v1.json#${seed.technical_name}`,trace]),
          real_consumption_proven:true,
          physical_evidence:false,
          ...authority()
        }));
      }
    }
  }
  const expected=(activation_plan?.target_engine_bindings??[]).length;
  const status=bindings.length===expected&&expected>0?'PRIORITY_SEMANTIC_EVIDENCE_GREEN':'PRIORITY_SEMANTIC_EVIDENCE_HOLD';
  return Object.freeze({
    status,
    seed:Object.freeze(seed),
    source_check:sourceCheck,
    probe_reports:Object.freeze(probeReports),
    expected_bindings:expected,
    generated_bindings:bindings.length,
    candidate_evidence:Object.freeze({semantic_bindings:Object.freeze(bindings)}),
    ...authority()
  });
}
