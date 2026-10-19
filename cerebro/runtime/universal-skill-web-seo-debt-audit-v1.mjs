#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadActivationRouting} from './universal-skill-activation-planner-v1.mjs';
import {supportedAutoEngineeringDomains} from './universal-skill-auto-engineering-v1.mjs';
import {listLatestLegacyReconciliations,assertNoProdAuthority} from './universal-skill-reconciliation-resolver-v1.mjs';

const VERSION='1.0.0';
const PREPROD='PREPROD';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT=path.resolve(__dirname,'../..');
const TARGET_DOMAINS=Object.freeze(['web-wordpress-frontend','seo-search-content']);
const REUSABLE_EVIDENCE=Object.freeze([
  Object.freeze({ref:'cerebro/registry/web-acquisition-intelligence-profile.v1.json',scope:'ANALYSIS_AND_ACQUISITION_INTELLIGENCE_NOT_UNIVERSAL_MUTATION_PROVIDER'}),
  Object.freeze({ref:'cerebro/registry/phase13-marketing-seo-feedback-profile.v0.json',scope:'SAFE_SHADOW_FEEDBACK_CONTROL_NOT_UNIVERSAL_EXECUTION_PROVIDER'}),
  Object.freeze({ref:'cerebro/registry/physical-adapter-audit-v1.json',scope:'PHYSICAL_SURFACE_AUDIT_NOT_GENERIC_WEB_OR_SEO_BINDING'}),
  Object.freeze({ref:'cerebro/registry/fact001-android-staging-48-183.v0.json',scope:'CANDIDATE_SPECIFIC_WORDPRESS_STAGING_AND_ANDROID_BUILD_EVIDENCE'})
]);

function freeze(value){if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;}
function uniq(values){return [...new Set(values??[])].sort();}
function normalize(value){return String(value??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9+#./-]+/g,' ').replace(/\s+/g,' ').trim();}
function safeAuthority(){return {prod_authorized:false,prod_write_authorized:false,public_deploy_authorized:false,auto_merge_authorized:false,external_skill_code_execution_authorized:false,external_dependency_install_authorized:false,customer_data_authorized:false,trading_access:false,automatic_paid_fallback:false,additional_cost_eur:0};}
function itemText(item){return [item?.name,item?.state,item?.disposition,item?.reason,item?.next_gate,...(item?.owner_engine_ids??[])].filter(Boolean).join(' ');}
function hasPhrase(haystack,phrase){const p=normalize(phrase);return p&&(` ${haystack} `).includes(` ${p} `);}

export function classifySourceTruthState(item={}){
  const state=String(item.state??'').toUpperCase();
  const next=String(item.next_gate??'').toUpperCase();
  const joined=`${state} ${next}`;
  if(joined.includes('HUMAN_REQUIRED'))return 'HUMAN_REQUIRED';
  if(joined.includes('BLOCKED_EXTERNAL'))return 'BLOCKED_EXTERNAL';
  if(/^FULL(?:_|$)/.test(state)&&!/(PARTIAL|PLAN|SIMULATION|NOT_PROMOTED|REQUIRED|PENDING|HOLD|SCAFFOLD|DEFINED_NOT_BUILT)/.test(joined))return 'EVIDENCE_FULL_PREPROD';
  if(/TERMINAL|REFERENCE_ONLY|CATALOG_ONLY|REFERENCE_PATTERN|NO_INSTALL/.test(joined))return 'TERMINAL_REFERENCE_OR_CATALOG';
  if(/PARTIAL|DEFINED_NOT_BUILT|PLAN_ONLY|SCAFFOLD|SIMULATION|NOT_PROMOTED|REQUIRED|PENDING|HOLD|LIVE_AUDIT|PHYSICAL_/.test(joined))return 'ENGINEERING_DEBT';
  return 'UNRESOLVED';
}

function explicitGenericExecutionClaim(doc,domain){
  if(!doc||typeof doc!=='object')return false;
  const declared=Array.isArray(doc.universal_provider_domains)?doc.universal_provider_domains:[];
  return declared.includes(domain)&&doc.generic_execution_contract===true&&doc.semantic_binding===true&&doc.environment===PREPROD;
}

function loadReusableEvidence(repoRoot){
  return REUSABLE_EVIDENCE.map((entry)=>{
    const abs=path.join(repoRoot,entry.ref);
    if(!fs.existsSync(abs))return {...entry,exists:false,state_type:null,status:null,generic_execution_domains:[]};
    const doc=JSON.parse(fs.readFileSync(abs,'utf8'));
    const genericDomains=TARGET_DOMAINS.filter((domain)=>explicitGenericExecutionClaim(doc,domain));
    return {...entry,exists:true,state_type:doc.state_type??null,status:doc.status??doc.state??null,generic_execution_domains:genericDomains};
  });
}

function domainMatch(item,domain,routing){
  const rule=routing.signals.domains.find((row)=>row.domain_id===domain);
  if(!rule)throw new Error(`DOMAIN_NOT_FOUND:${domain}`);
  const haystack=normalize(itemText(item));
  const keyword_matches=uniq((rule.keywords??[]).filter((keyword)=>hasPhrase(haystack,keyword)));
  const owners=Array.isArray(item?.owner_engine_ids)?item.owner_engine_ids:[];
  const owner_engine_matches=uniq(owners.filter((engine)=>rule.engine_bindings.includes(engine)));
  return {matched:keyword_matches.length>0||owner_engine_matches.length>0,keyword_matches,owner_engine_matches};
}

export function buildWebSeoDebtAudit({repo_root=DEFAULT_REPO_ROOT}={}){
  const repoRoot=path.resolve(repo_root);
  const latest=listLatestLegacyReconciliations({repo_root:repoRoot});
  for(const row of latest)assertNoProdAuthority({authority:row.doc.authority??null});
  const allItems=latest.flatMap((source)=>source.doc.items.map((item)=>({source_ref:source.ref,source_range:`${source.start}-${source.end}`,source_version:source.version,item})));
  const reusable=loadReusableEvidence(repoRoot);
  const routing=loadActivationRouting({signalsFile:path.join(repoRoot,'cerebro','skills','internal-capability-signals.v0.json'),enginesFile:path.join(repoRoot,'cerebro','registry','engine-registry.v1.json')});
  const providerDomains=new Set(supportedAutoEngineeringDomains());
  const families={};

  for(const domain of TARGET_DOMAINS){
    const rows=[];
    for(const source of allItems){
      const match=domainMatch(source.item,domain,routing);
      if(!match.matched)continue;
      rows.push({item_id:source.item.id??null,name:source.item.name??null,source_ref:source.source_ref,source_range:source.source_range,source_version:source.source_version,source_state:source.item.state??null,truth_state:classifySourceTruthState(source.item),keyword_matches:match.keyword_matches,owner_engine_matches:match.owner_engine_matches,next_gate:source.item.next_gate??null});
    }
    rows.sort((a,b)=>(a.item_id??9999)-(b.item_id??9999));
    const debtRows=rows.filter((row)=>row.truth_state==='ENGINEERING_DEBT');
    const genericEvidenceRefs=reusable.filter((entry)=>entry.generic_execution_domains.includes(domain)).map((entry)=>entry.ref);
    const providerAlreadyAvailable=providerDomains.has(domain);
    const repeatedDebt=debtRows.length>=2;
    let recommendation='NO_NEW_PROVIDER_JUSTIFIED';
    let reason='NO_REPEATED_ENGINEERING_DEBT';
    if(providerAlreadyAvailable){recommendation='REUSE_EXISTING_PROVIDER';reason='PROVIDER_ALREADY_AVAILABLE_REVALIDATE_BINDINGS';}
    else if(repeatedDebt&&genericEvidenceRefs.length>0){recommendation='GENERIC_PROVIDER_CANDIDATE_JUSTIFIED';reason='REPEATED_DEBT_AND_EXPLICIT_GENERIC_EXECUTION_EVIDENCE';}
    else if(repeatedDebt){reason='REPEATED_DEBT_BUT_NO_EXPLICIT_GENERIC_EXECUTION_EVIDENCE';}
    families[domain]={candidate_count:rows.length,engineering_debt_count:debtRows.length,repeated_engineering_debt:repeatedDebt,provider_already_available:providerAlreadyAvailable,generic_execution_evidence_refs:genericEvidenceRefs,recommendation,reason,rows};
  }

  return freeze({schema_version:'1.0.0',state_type:'CEREBRO_UNIVERSAL_SKILL_B16_WEB_SEO_DEBT_AUDIT_V1',status:'MEASURED_NO_UNSUPPORTED_PROVIDER_PROMOTION',company_id:'GLOBAL',engine_id:'FACT-001',environment:PREPROD,version:VERSION,sources:{latest_reconciliations:latest.map((row)=>row.ref),item_count:allItems.length,history_policy:'LATEST_VERSION_PER_EXACT_RANGE_PRESERVE_OLDER_FILES'},reusable_evidence:reusable,auto_engineering_provider_domains:[...providerDomains].sort(),families,global_recommendation:Object.values(families).some((family)=>family.recommendation==='GENERIC_PROVIDER_CANDIDATE_JUSTIFIED')?'REVIEW_JUSTIFIED_GENERIC_PROVIDER_CANDIDATE':'NO_NEW_WEB_SEO_PROVIDER_JUSTIFIED',invariant:'Profiles, audits and candidate-specific physical evidence are reusable evidence but are not generic execution providers unless they explicitly declare a PREPROD generic execution contract and semantic binding.',human_required:[],...safeAuthority()});
}

const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){try{process.stdout.write(`${JSON.stringify(buildWebSeoDebtAudit(),null,2)}\n`);}catch(error){process.stderr.write(`${JSON.stringify({status:'RED_FAIL_CLOSED',error:error.message,...safeAuthority()})}\n`);process.exitCode=1;}}
