import fs from 'node:fs';
import path from 'node:path';

function byCandidate(report){
  const map=new Map();
  for(const item of report?.results??[]) if(item?.candidate_id) map.set(item.candidate_id,item);
  return map;
}

function isTestPath(filePath){
  const p=String(filePath??'').toLowerCase();
  return /(^|\/)(?:test|tests|__tests__)(\/|$)/.test(p)||/(^|\/)test_[^/]+/.test(p)||/\.test\.[a-z0-9]+$/.test(p)||/\.spec\.[a-z0-9]+$/.test(p);
}

function exactLicenseGreen(item){
  if(!item||item.status!=='EXACT_LICENSE_FILE_EVIDENCE') return false;
  const detected=(item.detected_families??[]).filter((x)=>x&&x!=='UNKNOWN');
  if(!detected.length) return false;
  if(item.repo_license_spdx&&detected.includes(item.repo_license_spdx)) return true;
  return item.metadata_matches_detected===true&&Boolean(item.repo_license_spdx);
}

function reviewCandidate(admission,bundle,license){
  const blockers=[];
  const risk=admission?.bundle_risk??null;
  if(admission?.prelab_state!=='TEST_CODE_REVIEW_REQUIRED') blockers.push('NOT_TEST_CODE_REVIEW_REQUIRED');
  if(!bundle||bundle.status!=='BUNDLE_STATIC_SCAN_COMPLETE') blockers.push('BUNDLE_SCAN_MISSING');
  if(risk?.state!=='TEST_ONLY_FLAGS') blockers.push('RISK_NOT_TEST_ONLY');
  if((risk?.runtime_flags??[]).length>0) blockers.push('RUNTIME_FLAGS_PRESENT');
  if((risk?.test_only_flags??[]).length===0) blockers.push('TEST_ONLY_FLAGS_MISSING');
  if(!exactLicenseGreen(license)) blockers.push('LICENSE_EVIDENCE_NOT_EXACT_GREEN');

  const flagged=[];
  const runtimeOrSupportFlagged=[];
  for(const file of bundle?.fetched_text_files??[]){
    const flags=[...(file.flags??[])];
    if(!flags.length) continue;
    const testPath=isTestPath(file.path);
    flagged.push({path:file.path,flags,test_path:testPath});
    if(!testPath) runtimeOrSupportFlagged.push({path:file.path,flags});
  }
  if(!flagged.length) blockers.push('FLAGGED_TEST_FILES_MISSING');
  if(runtimeOrSupportFlagged.length) blockers.push('FLAGGED_RUNTIME_OR_SUPPORT_FILE');

  const riskEvidence=risk?.evidence??[];
  if(riskEvidence.some((x)=>x.scope!=='TEST'||!isTestPath(x.path))) blockers.push('RISK_EVIDENCE_NOT_TEST_SCOPED');

  const green=blockers.length===0;
  return {
    status:green?'GREEN_FOR_WRAPPER_PLANNING_ONLY':'HOLD_TEST_ONLY_REVIEW',
    green,
    blockers,
    test_only_flags:[...(risk?.test_only_flags??[])],
    runtime_flags:[...(risk?.runtime_flags??[])],
    flagged_files:flagged,
    runtime_or_support_flagged_files:runtimeOrSupportFlagged,
    external_code_executed:false,
    test_code_executed:false,
    sandbox_authorized:false,
    install_authorized:false,
    prod_authorized:false
  };
}

export function buildReviewedPrelab(rawPrelab,bundles,licenses){
  const bundleMap=byCandidate(bundles);
  const licenseMap=byCandidate(licenses);
  const results=(rawPrelab?.results??[]).map((admission)=>{
    if(admission.prelab_state!=='TEST_CODE_REVIEW_REQUIRED') return structuredClone(admission);
    const review=reviewCandidate(admission,bundleMap.get(admission.candidate_id),licenseMap.get(admission.candidate_id));
    if(!review.green){
      return {...structuredClone(admission),test_only_review:review};
    }
    return {
      ...structuredClone(admission),
      prelab_state:'STATIC_PRELAB_READY_CODE_BUNDLE_REVIEWED_TEST_ONLY',
      next_action:'DESIGN_ISOLATED_SANDBOX_EVAL_WITH_NO_PROD_CREDENTIALS',
      test_only_review:review,
      sandbox_authorized:false,
      install_authorized:false,
      prod_authorized:false
    };
  });
  const state_counts={};
  for(const item of results) state_counts[item.prelab_state]=(state_counts[item.prelab_state]??0)+1;
  const reviewed=results.filter((x)=>x.test_only_review);
  const greenReviewed=reviewed.filter((x)=>x.test_only_review.green);
  return Object.freeze({
    schema_version:'0.1.0',
    execution_mode:'STATIC_TEST_ONLY_REVIEW_AND_PRELAB_NORMALIZATION',
    raw_prelab_preserved:true,
    test_only_reviews:reviewed.length,
    test_only_reviews_green:greenReviewed.length,
    static_prelab_ready:results.filter((x)=>String(x.prelab_state??'').startsWith('STATIC_PRELAB_READY')).length,
    state_counts,
    external_code_executed:false,
    test_code_executed:false,
    sandbox_authorized:false,
    install_authorized:false,
    prod_authorized:false,
    results
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const raw=JSON.parse(fs.readFileSync(argValue('--prelab')??'artifacts/cerebro-skill-prelab-p0.json','utf8'));
  const bundles=JSON.parse(fs.readFileSync(argValue('--bundles')??'artifacts/cerebro-skill-bundles-p0.json','utf8'));
  const licenses=JSON.parse(fs.readFileSync(argValue('--licenses')??'artifacts/cerebro-skill-license-evidence.json','utf8'));
  const output=argValue('--output')??'artifacts/cerebro-skill-prelab-reviewed-p0.json';
  const report=buildReviewedPrelab(raw,bundles,licenses);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,test_only_reviews:report.test_only_reviews,test_only_reviews_green:report.test_only_reviews_green,static_prelab_ready:report.static_prelab_ready,external_code_executed:false,prod_authorized:false}));
}
