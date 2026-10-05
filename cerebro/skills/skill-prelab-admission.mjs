import fs from 'node:fs';
import path from 'node:path';

const STRONG_FLAGS = new Set(['PROCESS_EXEC','DYNAMIC_EVAL','DESTRUCTIVE_FS','PACKAGE_INSTALL','PERMISSION_CHANGE','CAPTCHA_EVASION','ANTI_DETECT','CREDENTIAL_EXTRACTION']);
const PERMISSION_FLAGS = new Set(['SECRET_ENV_ACCESS','NETWORK_CLIENT']);

function byCandidate(report){
  const map=new Map();
  for(const item of report?.results??[]) if(item?.candidate_id) map.set(item.candidate_id,item);
  return map;
}

function isTestPath(filePath){
  const p=String(filePath??'').toLowerCase();
  return /(^|\/)(?:test|tests|__tests__)(\/|$)/.test(p)||/(^|\/)test_[^/]+/.test(p)||/\.test\.[a-z0-9]+$/.test(p)||/\.spec\.[a-z0-9]+$/.test(p);
}

export function classifyBundleRisk(bundle){
  if(!bundle||bundle.status!=='BUNDLE_STATIC_SCAN_COMPLETE') return {state:'BUNDLE_SCAN_MISSING',runtime_flags:[],test_only_flags:[],evidence:[]};
  const runtime=new Set();
  const tests=new Set();
  const evidence=[];
  for(const file of bundle.fetched_text_files??[]){
    for(const flag of file.flags??[]){
      const target=isTestPath(file.path)?tests:runtime;
      target.add(flag);
      evidence.push({path:file.path,flag,scope:isTestPath(file.path)?'TEST':'RUNTIME_OR_SUPPORT'});
    }
  }
  for(const flag of bundle.bundle_static_flags??[]){
    if(!runtime.has(flag)&&!tests.has(flag)) runtime.add(flag);
  }
  const runtimeFlags=[...runtime];
  const testFlags=[...tests].filter((f)=>!runtime.has(f));
  let state='STATIC_CLEAR';
  if(runtimeFlags.some((f)=>STRONG_FLAGS.has(f))) state='RUNTIME_SECURITY_FLAGS';
  else if(runtimeFlags.some((f)=>PERMISSION_FLAGS.has(f))) state='RUNTIME_PERMISSION_FLAGS';
  else if(testFlags.length) state='TEST_ONLY_FLAGS';
  return {state,runtime_flags:runtimeFlags,test_only_flags:testFlags,evidence};
}

function licenseEvidenceState(item){
  if(!item) return {state:'LICENSE_EVIDENCE_MISSING',evidence:[]};
  if(item.status!=='EXACT_LICENSE_FILE_EVIDENCE') return {state:item.status??'LICENSE_EVIDENCE_MISSING',evidence:item.exact_evidence??[]};
  const detected=item.detected_families??[];
  if(!detected.length||detected.includes('UNKNOWN')) return {state:'LICENSE_TEXT_UNCLASSIFIED',evidence:item.exact_evidence??[]};
  if(item.metadata_matches_detected===false&&item.repo_license_spdx) return {state:'LICENSE_METADATA_MISMATCH',evidence:item.exact_evidence??[]};
  return {state:'EXACT_LICENSE_EVIDENCE_PRESENT',evidence:item.exact_evidence??[]};
}

function admissionDecision(shortlistItem,bundle,license){
  if(shortlistItem.priority!=='P0') return {prelab_state:'OUT_OF_SCOPE_PRIORITY',next_action:'WAIT_FOR_P1_P2_PASS'};
  if(shortlistItem.disposition!=='LAB_REVIEW_CANDIDATE') return {prelab_state:'BLOCKED_BY_EXISTING_POLICY',next_action:`RESOLVE_${shortlistItem.disposition}`};
  const bundleRisk=classifyBundleRisk(bundle);
  if(bundleRisk.state==='BUNDLE_SCAN_MISSING') return {prelab_state:'BUNDLE_EVIDENCE_REQUIRED',next_action:'COMPLETE_STATIC_BUNDLE_SCAN',bundle_risk:bundleRisk};
  if(bundleRisk.state==='RUNTIME_SECURITY_FLAGS') return {prelab_state:'SECURITY_REVIEW_REQUIRED',next_action:'REVIEW_RUNTIME_SECURITY_FLAGS_BEFORE_ANY_SANDBOX',bundle_risk:bundleRisk};
  if(bundleRisk.state==='RUNTIME_PERMISSION_FLAGS') return {prelab_state:'PERMISSION_REVIEW_REQUIRED',next_action:'MAP_NETWORK_SECRET_AND_FILESYSTEM_PERMISSIONS',bundle_risk:bundleRisk};
  if(bundleRisk.state==='TEST_ONLY_FLAGS') return {prelab_state:'TEST_CODE_REVIEW_REQUIRED',next_action:'REVIEW_TEST_ONLY_FLAGS_AND_CONFIRM_NO_RUNTIME_PATH',bundle_risk:bundleRisk};
  const lic=licenseEvidenceState(license);
  if(lic.state!=='EXACT_LICENSE_EVIDENCE_PRESENT') return {prelab_state:'LICENSE_EVIDENCE_REVIEW_REQUIRED',next_action:'VERIFY_EXACT_LICENSE_EVIDENCE',bundle_risk:bundleRisk,license_evidence_state:lic.state};
  const codeCount=bundle?.code_files_count??0;
  if(codeCount===0) return {prelab_state:'STATIC_PRELAB_READY_INSTRUCTION_ONLY',next_action:'NORMALIZE_TO_CEREBRO_WRAPPER_NO_CODE_EXECUTION',bundle_risk:bundleRisk,license_evidence_state:lic.state};
  return {prelab_state:'STATIC_PRELAB_READY_CODE_BUNDLE',next_action:'DESIGN_ISOLATED_SANDBOX_EVAL_WITH_NO_PROD_CREDENTIALS',bundle_risk:bundleRisk,license_evidence_state:lic.state};
}

export function buildPrelabAdmission(shortlist,bundles,licenses){
  const bundleMap=byCandidate(bundles);
  const licenseMap=byCandidate(licenses);
  const results=[];
  for(const item of shortlist?.results??[]){
    const bundle=bundleMap.get(item.candidate_id)??null;
    const license=licenseMap.get(item.candidate_id)??null;
    const decision=admissionDecision(item,bundle,license);
    results.push({
      candidate_id:item.candidate_id,
      source_ref:item.source_ref,
      upstream_full_name:item.upstream_full_name,
      top_domain:item.top_domain,
      priority:item.priority,
      prior_disposition:item.disposition,
      repo_license_spdx:item.repo_license_spdx,
      legal_compatibility:'UNASSESSED',
      code_files_count:bundle?.code_files_count??null,
      bundle_static_flags:bundle?.bundle_static_flags??[],
      license_status:license?.status??null,
      ...decision,
      sandbox_authorized:false,
      install_authorized:false,
      prod_authorized:false
    });
  }
  const state_counts={};
  for(const item of results) state_counts[item.prelab_state]=(state_counts[item.prelab_state]??0)+1;
  const staticReady=results.filter((r)=>r.prelab_state.startsWith('STATIC_PRELAB_READY'));
  return Object.freeze({
    schema_version:'0.1.0',
    execution_mode:'STATIC_PRELAB_GATE_ONLY',
    p0_candidates:results.filter((r)=>r.priority==='P0').length,
    static_prelab_ready:staticReady.length,
    state_counts,
    sandbox_authorized:false,
    install_authorized:false,
    prod_authorized:false,
    results
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const shortlist=JSON.parse(fs.readFileSync(argValue('--shortlist')??'artifacts/cerebro-skill-shortlist.json','utf8'));
  const bundles=JSON.parse(fs.readFileSync(argValue('--bundles')??'artifacts/cerebro-skill-bundles-p0.json','utf8'));
  const licenses=JSON.parse(fs.readFileSync(argValue('--licenses')??'artifacts/cerebro-skill-license-evidence.json','utf8'));
  const output=argValue('--output')??'artifacts/cerebro-skill-prelab.json';
  const report=buildPrelabAdmission(shortlist,bundles,licenses);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,p0_candidates:report.p0_candidates,static_prelab_ready:report.static_prelab_ready,state_counts:report.state_counts,sandbox_authorized:false,install_authorized:false,prod_authorized:false}));
}
