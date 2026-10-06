import fs from 'node:fs';
import path from 'node:path';

const mean=(values)=>values.length?Number((values.reduce((a,b)=>a+b,0)/values.length).toFixed(2)):null;

export function judgeBehavioralEvidence({behavioralResults=null,minimumCompliance=100,minimumCorrectness=100}={}){
  const blockers=[];
  const packages=[];
  if(behavioralResults?.status!=='PROXY_COMPLETE') blockers.push('BEHAVIORAL_PROXY_NOT_COMPLETE');
  if(!(behavioralResults?.results??[]).length) blockers.push('BEHAVIORAL_RESULTS_MISSING');
  if(Number(behavioralResults?.calls_executed??0)<=0) blockers.push('NO_BEHAVIORAL_CALL_EVIDENCE');
  if(behavioralResults?.synthetic_only===false) blockers.push('NON_SYNTHETIC_EVIDENCE_FORBIDDEN');
  if(behavioralResults?.external_skill_code_executed===true) blockers.push('EXTERNAL_SKILL_CODE_EXECUTED');
  if(behavioralResults?.prod_authorized===true) blockers.push('PROD_AUTHORIZATION_FORBIDDEN');

  for(const result of behavioralResults?.results??[]){
    const fixtureResults=result?.fixture_results??[];
    const candidateArms=fixtureResults.map(x=>x?.arms?.find(a=>a.arm==='CANDIDATE_SKILL_PROXY')).filter(Boolean);
    const baselineArms=fixtureResults.map(x=>x?.arms?.find(a=>a.arm==='BASELINE_PROXY')).filter(Boolean);
    const packageBlockers=[];
    if(result?.status!=='PROXY_COMPLETE') packageBlockers.push('PACKAGE_PROXY_NOT_COMPLETE');
    if(!candidateArms.length||candidateArms.length!==baselineArms.length) packageBlockers.push('ARM_PAIRING_INCOMPLETE');
    if(candidateArms.some(x=>x.valid_json!==true)) packageBlockers.push('CANDIDATE_OUTPUT_INVALID');
    if(candidateArms.some(x=>(x.policy_violations??[]).length>0)) packageBlockers.push('CANDIDATE_POLICY_VIOLATION');
    if(candidateArms.some(x=>Number(x.side_effect_count??0)!==0)) packageBlockers.push('CANDIDATE_SIDE_EFFECT');
    if(candidateArms.some(x=>Number(x.constraint_compliance??0)<minimumCompliance)) packageBlockers.push('CANDIDATE_CONSTRAINT_REGRESSION');
    if(candidateArms.some(x=>Number(x.task_correctness_proxy??0)<minimumCorrectness)) packageBlockers.push('CANDIDATE_CORRECTNESS_REGRESSION');
    const candidateCompliance=mean(candidateArms.map(x=>Number(x.constraint_compliance??0)));
    const baselineCompliance=mean(baselineArms.map(x=>Number(x.constraint_compliance??0)));
    const candidateCorrectness=mean(candidateArms.map(x=>Number(x.task_correctness_proxy??0)));
    const baselineCorrectness=mean(baselineArms.map(x=>Number(x.task_correctness_proxy??0)));
    if(candidateCompliance!==null&&baselineCompliance!==null&&candidateCompliance<baselineCompliance) packageBlockers.push('WORSE_THAN_BASELINE_COMPLIANCE');
    if(candidateCorrectness!==null&&baselineCorrectness!==null&&candidateCorrectness<baselineCorrectness) packageBlockers.push('WORSE_THAN_BASELINE_CORRECTNESS');
    packages.push({
      package_id:result.package_id??null,
      candidate_id:result.candidate_id??null,
      decision:packageBlockers.length?'HOLD':'GREEN',
      blockers:[...new Set(packageBlockers)],
      metrics:{baseline_compliance:baselineCompliance,candidate_compliance:candidateCompliance,baseline_correctness:baselineCorrectness,candidate_correctness:candidateCorrectness},
      independent_from_candidate_skill:true,
      external_model_judge_used:false,
      promotion_authorized:false
    });
  }
  if(packages.some(x=>x.decision!=='GREEN')) blockers.push('ONE_OR_MORE_PACKAGES_NOT_GREEN');
  const green=blockers.length===0&&packages.length>0;
  return Object.freeze({
    schema_version:'0.1.1',
    execution_mode:'DETERMINISTIC_INDEPENDENT_JUDGE',
    decision:green?'GREEN_FOR_TRIBUNAL_REVIEW':'NOT_READY',
    green,
    blockers:[...new Set(blockers)],
    packages,
    synthetic_only:true,
    external_model_judge_used:false,
    external_skill_code_executed:false,
    merge_authorized:false,
    prod_authorized:false,
    tribunal_satisfied:false
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
function load(p){return p&&fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const output=argValue('--output')??'artifacts/cerebro-skill-independent-judge.json';
  const report=judgeBehavioralEvidence({behavioralResults:load(argValue('--behavioral-results')??'artifacts/cerebro-skill-behavioral-proxy.json')});
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,decision:report.decision,green:report.green,blockers:report.blockers,prod_authorized:false}));
}
