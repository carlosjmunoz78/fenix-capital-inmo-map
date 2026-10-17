#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadActivationRouting} from './universal-skill-activation-planner-v1.mjs';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONTRACTS=path.resolve(__dirname,'../registry/universal-skill-activation-contracts-v1.json');
const ALLOWED_PHYSICAL_MODES=new Set([
  'SYNTHETIC_PREPROD_ALLOWED',
  'REMOTE_READONLY_OR_SYNTHETIC_PREPROD',
  'PHYSICAL_BROWSER_PREPROD_WHEN_ACTION_CAPABLE',
  'MEDIA_RUNTIME_PREPROD_REQUIRED'
]);

function req(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim();}
function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function exactSet(a,b){return JSON.stringify([...new Set(a??[])].sort())===JSON.stringify([...new Set(b??[])].sort());}
function authority(){return Object.freeze({prod_authorized:false,prod_write_authorized:false,external_skill_code_execution:false,trading_access:false,additional_cost_eur:0});}

export function loadSemanticContracts({contractsFile=DEFAULT_CONTRACTS,routing}={}){
  const registry=JSON.parse(fs.readFileSync(contractsFile,'utf8'));
  const rt=routing??loadActivationRouting();
  if(registry.state_type!=='CEREBRO_UNIVERSAL_SKILL_ACTIVATION_CONTRACTS_V1'||registry.engine_id!=='FACT-001'||registry.environment!=='PREPROD')throw new Error('INVALID_SEMANTIC_CONTRACT_REGISTRY');
  const policy=registry.policy??{};
  for(const key of ['prod_authorized','prod_write_authorized','external_skill_code_execution','trading_access'])if(policy[key]!==false)throw new Error(`CONTRACT_POLICY_AUTHORITY_MUST_REMAIN_FALSE:${key}`);
  if(policy.additional_cost_eur!==0)throw new Error('CONTRACT_POLICY_COST_MUST_BE_ZERO');
  if(policy.domain_level_not_skill_specific!==true||policy.exact_wrapper_or_adapter_contract_required!==true||policy.real_semantic_probe_required!==true||policy.old_vs_new_required_per_binding!==true)throw new Error('CONTRACT_POLICY_INCOMPLETE');

  const routingDomains=rt.signals.domains.map((d)=>d.domain_id);
  const contractDomains=Object.keys(registry.contracts??{});
  if(!exactSet(routingDomains,contractDomains))throw new Error('DOMAIN_CONTRACT_COVERAGE_MISMATCH');
  const contractIds=new Set();
  for(const [domain_id,contract] of Object.entries(registry.contracts)){
    const contractId=req(contract.contract_id,`${domain_id}.contract_id`);
    if(contractIds.has(contractId))throw new Error(`DUPLICATE_CONTRACT_ID:${contractId}`);contractIds.add(contractId);
    req(contract.fixture_id,`${domain_id}.fixture_id`);req(contract.probe_kind,`${domain_id}.probe_kind`);
    const baseline=contract.baseline_constraints??[],required=contract.required_constraints??[];
    if(!Array.isArray(baseline)||!Array.isArray(required)||baseline.length===0||required.length===0)throw new Error(`CONSTRAINTS_REQUIRED:${domain_id}`);
    if(new Set(baseline).size!==baseline.length||new Set(required).size!==required.length)throw new Error(`DUPLICATE_CONSTRAINT:${domain_id}`);
    for(const c of baseline)if(!required.includes(c))throw new Error(`BASELINE_NOT_SUBSET_REQUIRED:${domain_id}:${c}`);
    if(required.length<=baseline.length)throw new Error(`NO_MEASURABLE_CONTRACT_DELTA:${domain_id}`);
    if(!ALLOWED_PHYSICAL_MODES.has(contract.physical_evidence_mode))throw new Error(`INVALID_PHYSICAL_EVIDENCE_MODE:${domain_id}`);
  }
  return Object.freeze({registry,routing:rt});
}

export function resolveSemanticContract({domain_id,engine_id},options={}){
  const domain=req(domain_id,'domain_id'),engine=req(engine_id,'engine_id');
  const loaded=options.loaded??loadSemanticContracts(options);
  const routingDomain=loaded.routing.signals.domains.find((d)=>d.domain_id===domain);
  if(!routingDomain)throw new Error(`UNKNOWN_DOMAIN:${domain}`);
  if(!routingDomain.engine_bindings.includes(engine))throw new Error(`ENGINE_NOT_BOUND_TO_DOMAIN:${domain}:${engine}`);
  const contract=loaded.registry.contracts[domain];
  const binding_contract_id=`bindcontract_${hash({domain,engine,contract_id:contract.contract_id,version:loaded.registry.version}).slice(0,24)}`;
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_UNIVERSAL_SKILL_BINDING_CONTRACT_V1',
    binding_contract_id,company_id:'GLOBAL',owner_engine_id:'FACT-001',environment:'PREPROD',version:loaded.registry.version,
    domain_id:domain,engine_id:engine,contract_id:contract.contract_id,fixture_id:contract.fixture_id,probe_kind:contract.probe_kind,
    baseline_constraints:Object.freeze([...contract.baseline_constraints]),
    required_constraints:Object.freeze([...contract.required_constraints]),
    physical_evidence_mode:contract.physical_evidence_mode,
    exact_adapter_contract_required:true,real_semantic_probe_required:true,old_vs_new_required:true,
    ...authority()
  });
}

export function validateAdapterAgainstContract({contract,adapter_profile}){
  if(!contract||contract.state_type!=='CEREBRO_UNIVERSAL_SKILL_BINDING_CONTRACT_V1')throw new Error('BINDING_CONTRACT_REQUIRED');
  if(!adapter_profile||typeof adapter_profile!=='object')throw new Error('ADAPTER_PROFILE_REQUIRED');
  const provided=Array.isArray(adapter_profile.required_constraints)?adapter_profile.required_constraints:[];
  const missing=contract.required_constraints.filter((c)=>!provided.includes(c));
  const extra=provided.filter((c)=>!contract.required_constraints.includes(c));
  const authorityGreen=adapter_profile.prod_authorized===false&&adapter_profile.prod_write_authorized!==true&&adapter_profile.external_skill_code_execution===false&&adapter_profile.trading_access===false&&Number(adapter_profile.additional_cost_eur??0)===0;
  const exact=missing.length===0&&extra.length===0&&authorityGreen&&adapter_profile.contract_exact===true;
  return Object.freeze({
    status:exact?'ADAPTER_CONTRACT_GREEN':'ADAPTER_CONTRACT_HOLD',
    exact,missing_constraints:Object.freeze(missing),unexpected_constraints:Object.freeze(extra),authority_green:authorityGreen,
    wrapper_id:adapter_profile.wrapper_id??adapter_profile.adapter_id??null,
    ...authority()
  });
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))){
  try{const loaded=loadSemanticContracts();process.stdout.write(`${JSON.stringify({status:'GREEN',domains:Object.keys(loaded.registry.contracts).length,...authority()},null,2)}\n`);}catch(error){process.stderr.write(`${JSON.stringify({status:'RED_FAIL_CLOSED',error:error.message,...authority()})}\n`);process.exitCode=1;}
}
