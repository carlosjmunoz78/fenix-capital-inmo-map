import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {CEREBRO_GITHUB_WRAPPER} from './skill-cerebro-github-wrapper.mjs';

function stableId(value){return `oldnew:${createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,24)}`;}

export function buildGitHubOldVsNew(normalizedAdmission,genericOldVsNew,{createdAt=new Date().toISOString()}={}){
  const admitted=(normalizedAdmission?.results??[]).filter((x)=>x.status==='NORMALIZED_WRAPPER_GREEN_FOR_BEHAVIORAL_EVAL'&&x.raw_status_preserved===true);
  const packages=[];
  for(const admission of admitted){
    const raw=(genericOldVsNew?.packages??[]).find((x)=>x.candidate_id===admission.candidate_id);
    if(!raw||raw.domain!==CEREBRO_GITHUB_WRAPPER.domain||(raw.fixtures??[]).length!==3) continue;
    const pkg=structuredClone(raw);
    pkg.package_id=stableId([raw.package_id,admission.wrapper_id,'NORMALIZED_CEREBRO_GITHUB_WRAPPER']);
    pkg.admission_basis='NORMALIZED_CEREBRO_WRAPPER';
    pkg.raw_static_status=admission.raw_static_status;
    pkg.raw_status_preserved=true;
    pkg.candidate.wrapper_id=admission.wrapper_id;
    pkg.current_evidence={...(pkg.current_evidence??{}),raw_static_status:admission.raw_static_status,raw_policy_alignment_score:admission.raw_policy_alignment_score,raw_coverage_score:admission.raw_coverage_score,normalized_policy_alignment_score:admission.normalized_policy_alignment_score};
    pkg.execution_state='PLANNED_NOT_EXECUTED';pkg.created_at=createdAt;
    pkg.external_skill_execution_authorized=false;pkg.baseline_execution_authorized=false;pkg.candidate_execution_authorized=false;pkg.prod_authorized=false;pkg.promotion_authorized=false;
    packages.push(pkg);
  }
  return Object.freeze({schema_version:'0.1.0',execution_mode:'OLD_VS_NEW_NORMALIZED_GITHUB_WRAPPER_CONTRACT_ONLY',target:'github',packages_total:packages.length,behavioral_execution_authorized:false,external_skill_execution_authorized:false,prod_authorized:false,promotion_authorized:false,packages});
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
function load(p){return JSON.parse(fs.readFileSync(p,'utf8'));}
if(import.meta.url===`file://${process.argv[1]}`){
  const report=buildGitHubOldVsNew(load(argValue('--admission')??'artifacts/cerebro-skill-github-normalized-wrapper-admission.manual.json'),load(argValue('--oldnew')??'artifacts/cerebro-skill-old-vs-new-p0.json'));
  const output=argValue('--output')??'artifacts/cerebro-skill-old-vs-new-github.manual.json';
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,target:'github',packages_total:report.packages_total,fixtures:report.packages[0]?.fixtures?.length??0,raw_status_preserved:true,prod_authorized:false}));
}
