/**
 * CUT62 · Git-tracked source consumer inventory for legacy company RPC contracts.
 * No DB/API calls. Outputs PATHS, flags and aggregate counts, never source,
 * lines, credentials, tokens or customer data. Does not assert PROD parity.
 */
import {execFileSync} from 'node:child_process';
import {readFileSync,statSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export const LEGACY_CONTRACT_SYMBOLS=Object.freeze([
 'cerebro_company_registry_preprod',
 'cerebro_company_onboarding_preprod',
 'cerebro_company_engine_state_preprod',
 'cerebro_marketing_crm_bootstrap_run_preprod',
 'cerebro_lrn001_continuation_preprod',
 'cerebro_company_register_preprod',
 'cerebro_company_onboarding_start_preprod',
 'cerebro_company_engine_states_get_preprod',
 'cerebro_lrn001_record_preprod',
 'cerebro_marketing_crm_bootstrap_record_preprod',
 'cerebro_company_registry_get_preprod',
 'cerebro_company_onboarding_get_preprod'
]);
const binaryLimit=350000;
const roots=['src/','supabase/functions/','cerebro/','zeus/','scripts/','.github/workflows/'];
const codeSuffix=/\.(mjs|cjs|js|jsx|ts|tsx|sql|py|yml|yaml|json)$/i;
const denyPath=/(^|\/)(node_modules|dist|build|fixtures|evidence|backups|__snapshots__|docs)(\/|$)|(^|\/)\.env|\.test\.|\.spec\.|\.snap$|\/boost-001\/cut6[0-9]-/i;
export function scopeForPath(path){
 if(typeof path!=='string')return 'SKIPPED';
 if(path.startsWith('src/'))return 'FRONTEND_SRC';
 if(path.startsWith('supabase/functions/'))return 'EDGE_REPO_SOURCE';
 if(path.startsWith('cerebro/'))return 'CEREBRO_RUNTIME_OR_SCHEMA';
 if(path.startsWith('zeus/'))return 'ZEUS_RUNTIME';
 if(path.startsWith('scripts/'))return 'SCRIPTS';
 if(path.startsWith('.github/workflows/'))return 'CI_WORKFLOWS';
 return 'SKIPPED';
}
const dynamicPatterns=[
 {name:'SUPABASE_RPC_DYNAMIC_SURFACE',re:/\.\s*rpc\s*\(/},
 {name:'EDGE_FUNCTION_INVOCATION_SURFACE',re:/\.\s*functions\s*\.\s*invoke\s*\(/},
 {name:'DIRECT_EDGE_FUNCTION_HTTP_SURFACE',re:/\/functions\/v1\//},
 {name:'TENANT_CONTEXT_SURFACE',re:/\bcompany_id\b/}
];
const sha=x=>createHash('sha256').update(x).digest('hex');
const uniq=x=>[...new Set(x)];
export function analyzeFile(path,source){
 if(scopeForPath(path)==='SKIPPED'||typeof source!=='string')return null;
 const matched=LEGACY_CONTRACT_SYMBOLS.filter(t=>source.includes(t));
 const generic=dynamicPatterns.filter(x=>x.re.test(source)).map(x=>x.name);
 return Object.freeze({path,scope:scopeForPath(path),direct_contract_symbols:matched,
  generic_suspected_surfaces:generic,
  direct_literal_company_contract_reference:matched.length>0});
}
export function listTrackedCode(){
 const output=execFileSync('git',['ls-files','-z','--',...roots],{
  maxBuffer:20_000_000,encoding:'buffer'
 });
 return output.toString('utf8').split('\0').filter(Boolean)
  .filter(p=>roots.some(root=>p.startsWith(root)))
  .filter(p=>codeSuffix.test(p)&&!denyPath.test(p)).sort();
}
export function inventoryWorkingTree(){
 const paths=listTrackedCode(),results=[];let skippedOversize=0;
 for(const path of paths){
  let stat;try{stat=statSync(path);}catch{throw Error('MISSING_TRACKED_PATH:'+path);}
  if(stat.size>binaryLimit){skippedOversize++;continue;}
  const source=readFileSync(path,'utf8');
  if(source.includes('\0')){skippedOversize++;continue;}
  const row=analyzeFile(path,source);
  if(row&&(row.direct_contract_symbols.length||row.generic_suspected_surfaces.length))
    results.push(row);
 }
 const byScope={};
 for(const s of ['FRONTEND_SRC','EDGE_REPO_SOURCE','CEREBRO_RUNTIME_OR_SCHEMA','ZEUS_RUNTIME','SCRIPTS','CI_WORKFLOWS']){
  const relevant=results.filter(r=>r.scope===s);
  byScope[s]={
   referenced_files:relevant.length,
   exact_contract_file_count:relevant.filter(x=>x.direct_contract_symbols.length).length,
   generic_surface_file_count:relevant.filter(x=>x.generic_suspected_surfaces.length).length
  };
 }
 const exact=results.filter(x=>x.direct_contract_symbols.length);
 return {
  schema:'cerebro.cut62.gittracked.source.consumer.inventory.v1',
  company_id:'fenix',engine_id:'JARVIS',environment:'LAB',version:'CUT62-v0.1',
  scanned_from:'GITHUB_ACTIONS_CHECKOUT_TRACKED_CODE_ONLY',
  observed_date:'2026-11-07',
  checkout_commit:process.env.GITHUB_SHA||'LOCAL_UNKNOWN',
  repositories_scanned:1,
  project_repository:'carlosjmunoz78/fenix-capital-inmo-map',
  tracked_code_files_considered:paths.length,
  tracked_code_files_skipped_oversize_or_binary:skippedOversize,
  source_class_summary:byScope,
  exact_contract_symbols:LEGACY_CONTRACT_SYMBOLS,
  direct_contract_reference_files:exact.map(x=>({path:x.path,scope:x.scope,symbols:x.direct_contract_symbols})),
  indirect_usage_references:results.filter(x=>x.generic_suspected_surfaces.length).map(x=>({path:x.path,scope:x.scope,flags:x.generic_suspected_surfaces})),
  actual_api_call_surface_count:results.filter(x=>x.generic_suspected_surfaces.some(flag=>flag!=='TENANT_CONTEXT_SURFACE')).length,
  tenant_context_surface_count:results.filter(x=>x.generic_suspected_surfaces.includes('TENANT_CONTEXT_SURFACE')).length,
  declaration_detection_only:true,
  repo_code_consumer_inventory_completed_for_tracked_source:true,
  compiled_app_deployment_parity_verified:false,
  deployed_edge_code_fully_scanned:false,
  other_connected_repositories_scanned:false,
  runtime_constructed_names_covered:false,
  physical_prod_backup_verified:false,physical_restore_tested:false,
  owner_b2b3_e2e_verified:false,
  recording_authorized:false,prod_authorized:false,automatic_promotion:false,
  credentials_logged:false,source_snippets_logged:false,
  scan_integrity_sha256:sha(paths.join('\n')+'\n'+exact.map(x=>x.path+':'+x.direct_contract_symbols.join(',')).join('\n'))
 };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const r=inventoryWorkingTree();
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(r,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({scanned:r.tracked_code_files_considered,
  exact_files:r.direct_contract_reference_files.length,
  indirect_files:r.indirect_usage_references.length,
  src:r.source_class_summary.FRONTEND_SRC,
  edge:r.source_class_summary.EDGE_REPO_SOURCE,
  actual_api_call_surface_count:r.actual_api_call_surface_count,
  tenant_context_surface_count:r.tenant_context_surface_count,
  exact_paths:r.direct_contract_reference_files.map(x=>({path:x.path,symbols:x.symbols})),
  prod_authorized:false,no_credentials:true}));
}
