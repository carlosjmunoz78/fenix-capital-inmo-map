import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CEREBRO = path.resolve(HERE, '..');
const CATALOG = JSON.parse(fs.readFileSync(path.join(CEREBRO, 'evidence', 'gcp-readonly-command-catalog-v0.json'), 'utf8'));

const PROJECTS = Object.freeze([...CATALOG.known_project_ids]);
const DOMAINS = Object.freeze([...CATALOG.required_inventory_domains]);
const PROJECT_SET = new Set(PROJECTS);
const DOMAIN_SET = new Set(DOMAINS);
const RESULT_STATUS = new Set(['SUCCESS','PERMISSION_DENIED','API_UNAVAILABLE','EMPTY','ERROR']);
const CLASSIFICATION_STATUS = new Set(['UNCLASSIFIED','TRAINING','TRADING','APP_CRM','SHARED_REQUIRES_REVIEW','OTHER']);
const DOMAIN_SENTINEL = '__DOMAIN__';
const BASE_FIELDS = Object.freeze(['capture_id','record_kind','captured_at','company_id','engine_id','environment','version','project_id','domain','command_template_id_or_ref','principal_ref','result_status','evidence_ref','raw_payload_stored','secret_payload_present','resource_ref','classification_status']);
const COVERAGE_FIELDS = Object.freeze([...BASE_FIELDS,'required_command_templates','command_results']);
const RESOURCE_FIELDS = BASE_FIELDS;
const COMMAND_RESULT_FIELDS = Object.freeze(['command_run_ref','command_template_id_or_ref','result_status','captured_at','principal_ref','evidence_ref','resolved_parameters','discovered_values']);
const ENVELOPE_FIELDS = Object.freeze(['coverage_records','resource_records']);

const CATALOG_TEMPLATES = new Map(CATALOG.domain_commands.map(({domain,commands}) => [domain, commands.map((_, index) => `GCP-READONLY-CATALOG:${domain}:${index}`)]));

function assertJsonString(value){ if(typeof value!=='string'||value.length===0) throw new TypeError('envelope must be a non-empty JSON string'); }
function assertExactKeys(value, expected, label){
  if(!value||typeof value!=='object'||Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  const keys=Object.keys(value).sort(); const exp=[...expected].sort();
  if(keys.length!==exp.length||keys.some((k,i)=>k!==exp[i])) throw new Error(`${label} fields must match the canonical contract exactly`);
}
function rejectDuplicateJsonObjectKeys(text){
  const stack=[]; let i=0;
  while(i<text.length){
    const ch=text[i]; if(/\s/.test(ch)){i++;continue;}
    if(ch==='"'){
      const start=i++; let escaped=false;
      while(i<text.length){const c=text[i]; if(escaped){escaped=false;i++;continue;} if(c==='\\'){escaped=true;i++;continue;} if(c==='"')break; i++;}
      if(i>=text.length) return;
      const token=text.slice(start,i+1); const top=stack.at(-1);
      if(top?.type==='object'&&top.expectKey){let key; try{key=JSON.parse(token);}catch{return;} if(top.keys.has(key)) throw new Error(`duplicate JSON object key: ${key}`); top.keys.add(key); top.expectKey=false;}
      i++; continue;
    }
    if(ch==='{'){stack.push({type:'object',keys:new Set(),expectKey:true});i++;continue;}
    if(ch==='['){stack.push({type:'array'});i++;continue;}
    if(ch==='}'||ch===']'){stack.pop();i++;continue;}
    if(ch===','){const top=stack.at(-1); if(top?.type==='object') top.expectKey=true; i++;continue;}
    i++;
  }
}
function parseEnvelopeJson(text){
  assertJsonString(text); rejectDuplicateJsonObjectKeys(text); let parsed;
  try{parsed=JSON.parse(text);}catch{throw new TypeError('envelope must be valid JSON');}
  assertExactKeys(parsed,ENVELOPE_FIELDS,'envelope');
  if(!Array.isArray(parsed.coverage_records)||!Array.isArray(parsed.resource_records)) throw new TypeError('coverage_records and resource_records must be arrays');
  return parsed;
}
function assertCanonicalString(v,label){if(typeof v!=='string'||v.length===0||v!==v.trim()||/[\u0000-\u001F\u007F]/.test(v)) throw new TypeError(`${label} must be canonical without edge whitespace/control chars`);}
function assertTimestamp(v,label){
  assertCanonicalString(v,label);
  const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/.exec(v);
  if(!m) throw new TypeError(`${label} must be an ISO-8601 UTC timestamp`);
  const [y,mo,d,h,mi,s]=m.slice(1,7).map(Number); const ms=Number((m[7]||'0').padEnd(3,'0'));
  if(h>23||mi>59||s>59) throw new TypeError(`${label} contains an invalid calendar/time component`);
  const dt=new Date(Date.UTC(y,mo-1,d,h,mi,s,ms));
  if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==mo-1||dt.getUTCDate()!==d||dt.getUTCHours()!==h||dt.getUTCMinutes()!==mi||dt.getUTCSeconds()!==s||dt.getUTCMilliseconds()!==ms) throw new TypeError(`${label} contains an invalid calendar/time component`);
}
function assertPrincipalRef(v,label){assertCanonicalString(v,label); if(!/^(?:principal|credential-ref|workload-identity):\/\/[A-Za-z0-9._~:/@+-]+$/.test(v)) throw new TypeError(`${label} must be a canonical principal/credential reference`);}
function assertEvidenceRef(v,label){assertCanonicalString(v,label); if(!/^evidence:\/\/[A-Za-z0-9._~:/@+-]+$/.test(v)) throw new TypeError(`${label} must be evidence:// reference`);}
function domainRef(domain){return `GCP-READONLY-CATALOG:${domain}`;}
function assertDomainRef(v,domain,label){assertCanonicalString(v,label); if(v!==domainRef(domain)) throw new TypeError(`${label} must reference ${domainRef(domain)}`);}
function assertTemplateRef(v,domain,label){assertCanonicalString(v,label); const expected=CATALOG_TEMPLATES.get(domain)||[]; if(!expected.includes(v)) throw new TypeError(`${label} must be a canonical command template for ${domain}`);}
function assertResolvedParameters(v,projectId,label){assertExactKeys(v, Object.keys(v), label); if(v.PROJECT_ID!==projectId) throw new Error(`${label}.PROJECT_ID must equal record.project_id`); for(const [k,val] of Object.entries(v)){assertCanonicalString(k,`${label} key`); assertCanonicalString(val,`${label}.${k}`);} }
function pairKey(p,d){return `${p}::${d}`;} function resourceKey(p,r){return `${p}::${r}`;}

function validateCommon(r,label,kind,fields){
  assertExactKeys(r,fields,label); assertCanonicalString(r.capture_id,`${label}.capture_id`); if(r.record_kind!==kind) throw new Error(`${label}.record_kind must be ${kind}`);
  assertTimestamp(r.captured_at,`${label}.captured_at`); assertCanonicalString(r.company_id,`${label}.company_id`); if(r.engine_id!=='INT-001') throw new Error(`${label}.engine_id must be INT-001`); if(r.environment!=='SCAFFOLD') throw new Error(`${label}.environment must be SCAFFOLD`);
  assertCanonicalString(r.version,`${label}.version`); assertCanonicalString(r.project_id,`${label}.project_id`); assertCanonicalString(r.domain,`${label}.domain`); if(!PROJECT_SET.has(r.project_id)) throw new RangeError(`${label}.project_id not allowlisted`); if(!DOMAIN_SET.has(r.domain)) throw new RangeError(`${label}.domain not canonical`);
  assertDomainRef(r.command_template_id_or_ref,r.domain,`${label}.command_template_id_or_ref`); assertPrincipalRef(r.principal_ref,`${label}.principal_ref`); assertEvidenceRef(r.evidence_ref,`${label}.evidence_ref`); if(!RESULT_STATUS.has(r.result_status)) throw new RangeError(`${label}.result_status invalid`); if(!CLASSIFICATION_STATUS.has(r.classification_status)) throw new RangeError(`${label}.classification_status invalid`); if(r.raw_payload_stored!==false||r.secret_payload_present!==false) throw new Error(`${label} raw/secret payload flags must be false`); assertCanonicalString(r.resource_ref,`${label}.resource_ref`);
}

function validateCommandResults(record,label){
  const expected=CATALOG_TEMPLATES.get(record.domain)||[];
  if(!Array.isArray(record.required_command_templates)||record.required_command_templates.length!==expected.length||record.required_command_templates.some((v,i)=>v!==expected[i])) throw new Error(`${label}.required_command_templates must exactly match canonical catalog order`);
  if(!Array.isArray(record.command_results)||record.command_results.length===0) throw new Error(`${label}.command_results required`);
  const seenRuns=new Set(); const byTemplate=new Map();
  for(const [i,res] of record.command_results.entries()){
    const rl=`${label}.command_results[${i}]`; assertExactKeys(res,COMMAND_RESULT_FIELDS,rl); assertCanonicalString(res.command_run_ref,`${rl}.command_run_ref`); if(seenRuns.has(res.command_run_ref)) throw new Error(`${label} duplicate command_run_ref`); seenRuns.add(res.command_run_ref); assertTemplateRef(res.command_template_id_or_ref,record.domain,`${rl}.command_template_id_or_ref`); if(!RESULT_STATUS.has(res.result_status)) throw new RangeError(`${rl}.result_status invalid`); assertTimestamp(res.captured_at,`${rl}.captured_at`); assertPrincipalRef(res.principal_ref,`${rl}.principal_ref`); assertEvidenceRef(res.evidence_ref,`${rl}.evidence_ref`); if(!res.resolved_parameters||typeof res.resolved_parameters!=='object'||Array.isArray(res.resolved_parameters)) throw new TypeError(`${rl}.resolved_parameters must be an object`); assertResolvedParameters(res.resolved_parameters,record.project_id,`${rl}.resolved_parameters`); if(!Array.isArray(res.discovered_values)) throw new TypeError(`${rl}.discovered_values must be an array`); for(const v of res.discovered_values) assertCanonicalString(v,`${rl}.discovered_values[]`); const arr=byTemplate.get(res.command_template_id_or_ref)||[]; arr.push(res); byTemplate.set(res.command_template_id_or_ref,arr);
  }
  for(const template of expected){if(!byTemplate.has(template)) throw new Error(`${label} missing required command template result: ${template}`);}
  if(record.domain!=='scheduler') for(const template of expected){if(byTemplate.get(template).length!==1) throw new Error(`${label} requires exactly one result for ${template}`);}
  if(record.domain==='scheduler'){
    const discovery=byTemplate.get(expected[0]); const jobs=byTemplate.get(expected[1]);
    if(discovery.length!==1) throw new Error(`${label} scheduler location discovery must run exactly once`);
    const locations=discovery[0].discovered_values; if(new Set(locations).size!==locations.length) throw new Error(`${label} scheduler discovered locations must be unique`);
    const jobLocations=jobs.map((r)=>r.resolved_parameters.LOCATION);
    if(jobLocations.some((v)=>typeof v!=='string')) throw new Error(`${label} scheduler job result requires LOCATION`);
    if(new Set(jobLocations).size!==jobLocations.length) throw new Error(`${label} scheduler duplicate LOCATION result`);
    if(jobLocations.length!==locations.length||locations.some((loc)=>!jobLocations.includes(loc))) throw new Error(`${label} scheduler results must exactly cover discovered locations`);
  }
}

export function expectedCoveragePairs(){return PROJECTS.flatMap((project_id)=>DOMAINS.map((domain)=>({project_id,domain})));}
export function expectedTemplatesForDomain(domain){return [...(CATALOG_TEMPLATES.get(domain)||[])];}
export function validateGcpInventoryEnvelope(text){
  const input=parseEnvelopeJson(text); const seenCaptureIds=new Set(); const coveragePairs=new Set();
  for(const [i,r] of input.coverage_records.entries()){
    const label=`coverage_records[${i}]`; validateCommon(r,label,'COVERAGE',COVERAGE_FIELDS); validateCommandResults(r,label); if(r.resource_ref!==DOMAIN_SENTINEL||r.classification_status!=='UNCLASSIFIED') throw new Error(`${label} invalid coverage sentinel/classification`); if(seenCaptureIds.has(r.capture_id)) throw new Error(`duplicate capture_id: ${r.capture_id}`); seenCaptureIds.add(r.capture_id); const k=pairKey(r.project_id,r.domain); if(coveragePairs.has(k)) throw new Error(`duplicate coverage pair: ${k}`); coveragePairs.add(k);
  }
  const expected=expectedCoveragePairs().map(({project_id,domain})=>pairKey(project_id,domain)); const missing=expected.filter((k)=>!coveragePairs.has(k)); if(input.coverage_records.length!==76||coveragePairs.size!==76||missing.length) throw new Error(`incomplete project-domain coverage`);
  const resourceIds=new Set();
  for(const [i,r] of input.resource_records.entries()){
    const label=`resource_records[${i}]`; validateCommon(r,label,'RESOURCE',RESOURCE_FIELDS); if(r.resource_ref===DOMAIN_SENTINEL) throw new Error(`${label} cannot use domain sentinel`); if(seenCaptureIds.has(r.capture_id)) throw new Error(`duplicate capture_id: ${r.capture_id}`); seenCaptureIds.add(r.capture_id); const k=resourceKey(r.project_id,r.resource_ref); if(resourceIds.has(k)) throw new Error(`duplicate resource identity across domains: ${k}`); resourceIds.add(k);
  }
  return Object.freeze({valid:true,project_count:4,domain_count:19,coverage_pairs:76,resource_records:resourceIds.size,execution_mode:'READ_ONLY_CAPTURE_ONLY',prod_writes:false,autonomous_prod:false,trading_mutation_forbidden:true});
}
export const GCP_INVENTORY_VALIDATOR_CONSTANTS=Object.freeze({PROJECTS,DOMAINS,DOMAIN_SENTINEL,BASE_FIELDS,COVERAGE_FIELDS,RESOURCE_FIELDS,COMMAND_RESULT_FIELDS,ENVELOPE_FIELDS});
