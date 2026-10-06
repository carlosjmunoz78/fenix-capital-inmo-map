import fs from 'node:fs';
import path from 'node:path';

const PERMISSIVE_FAMILIES=new Set(['MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','ISC']);
const byCandidate=(report,key='results')=>new Map((report?.[key]??[]).filter(x=>x?.candidate_id).map(x=>[x.candidate_id,x]));

export function runSkillTribunal({staticLab=null,licenses=null,behavioralResults=null,independentJudge=null,rollback=null,routeAudit=null,rsiShadow=null}={}){
  const licenseMap=byCandidate(licenses);
  const behavioralMap=byCandidate(behavioralResults);
  const judgeMap=byCandidate(independentJudge,'packages');
  const rollbackMap=byCandidate(rollback,'plans');
  const candidates=[];

  for(const candidate of staticLab?.results??[]){
    if(candidate?.status!=='STATIC_LAB_GREEN_FOR_BEHAVIORAL_EVAL') continue;
    const blockers=[];
    const lic=licenseMap.get(candidate.candidate_id);
    const behavioral=behavioralMap.get(candidate.candidate_id);
    const judge=judgeMap.get(candidate.candidate_id);
    const rb=rollbackMap.get(candidate.candidate_id);
    const detectedFamilies=lic?.detected_families??[];
    const permissiveEvidence=detectedFamilies.length>0&&detectedFamilies.every(x=>PERMISSIVE_FAMILIES.has(x));

    if((candidate?.hard_blocks??[]).length) blockers.push('STATIC_SECURITY_HARD_BLOCK');
    if(Number(candidate?.policy_alignment_score??0)!==100) blockers.push('STATIC_POLICY_NOT_FULLY_ALIGNED');
    if(lic?.status!=='EXACT_LICENSE_FILE_EVIDENCE') blockers.push('EXACT_LICENSE_EVIDENCE_MISSING');
    if(lic?.metadata_matches_detected!==true) blockers.push('LICENSE_METADATA_MISMATCH');
    if(!permissiveEvidence) blockers.push('PERMISSIVE_LICENSE_EVIDENCE_NOT_ESTABLISHED');
    if(behavioral?.status!=='PROXY_COMPLETE') blockers.push('BEHAVIORAL_PACKAGE_NOT_COMPLETE');
    if(judge?.decision!=='GREEN') blockers.push('INDEPENDENT_JUDGE_PACKAGE_NOT_GREEN');
    if(rb?.ready!==true||rb?.decision!=='GREEN') blockers.push('ROLLBACK_BINDING_PROOF_NOT_GREEN');
    if(routeAudit?.status!=='READY_ZERO_COST_ROUTE') blockers.push('ZERO_COST_ROUTE_NOT_READY');
    if(rsiShadow?.bridge_status!=='SHADOW_BRIDGE_GREEN') blockers.push('RSI_SHADOW_NOT_GREEN');

    candidates.push({
      candidate_id:candidate.candidate_id,
      name:candidate.declared_name??candidate.name??null,
      domain:candidate.domain??null,
      decision:blockers.length?'HOLD':'GREEN',
      blockers:[...new Set(blockers)],
      evidence:{
        static_lab_status:candidate.status,
        static_policy_alignment:candidate.policy_alignment_score??null,
        behavioral_status:behavioral?.status??'MISSING',
        independent_judge_decision:judge?.decision??'MISSING',
        rollback_binding_proof:rb?.decision??'MISSING',
        license_status:lic?.status??'MISSING',
        detected_license_families:detectedFamilies,
        license_metadata_matches:lic?.metadata_matches_detected===true,
        legal_compatibility:lic?.legal_compatibility??'UNASSESSED',
        zero_cost_route:routeAudit?.status??'MISSING',
        rsi_shadow:rsiShadow?.bridge_status??'MISSING'
      },
      legal_final_opinion:false,
      install_authorized:false,
      merge_authorized:false,
      prod_authorized:false
    });
  }

  const globalBlockers=[];
  if(!candidates.length) globalBlockers.push('NO_STATIC_LAB_GREEN_CANDIDATES');
  if(candidates.some(x=>x.decision!=='GREEN')) globalBlockers.push('ONE_OR_MORE_TRIBUNAL_CANDIDATES_NOT_GREEN');
  if(behavioralResults?.status!=='PROXY_COMPLETE') globalBlockers.push('BEHAVIORAL_EVIDENCE_NOT_COMPLETE');
  if(independentJudge?.green!==true||independentJudge?.decision!=='GREEN_FOR_TRIBUNAL_REVIEW') globalBlockers.push('INDEPENDENT_JUDGE_NOT_GREEN');
  if(rollback?.ready!==true||rollback?.status!=='GREEN_ROLLBACK_REBUILD_PROOF') globalBlockers.push('ROLLBACK_PROOF_NOT_GREEN');
  if(routeAudit?.status!=='READY_ZERO_COST_ROUTE') globalBlockers.push('ZERO_COST_ROUTE_NOT_READY');
  if(rsiShadow?.bridge_status!=='SHADOW_BRIDGE_GREEN') globalBlockers.push('RSI_SHADOW_NOT_GREEN');

  const green=globalBlockers.length===0&&candidates.length>0;
  return Object.freeze({
    schema_version:'0.1.0',
    execution_mode:'EVIDENCE_ONLY_SKILL_TRIBUNAL',
    decision:green?'GREEN':'NOT_READY',
    green,
    blockers:[...new Set(globalBlockers)],
    candidates,
    legal_final_opinion:false,
    legal_note:'License gate is technical evidence only; it does not constitute legal advice or a final legal compatibility opinion.',
    external_skill_code_executed:false,
    install_authorized:false,
    merge_authorized:false,
    prod_authorized:false,
    autonomous_promotion_authorized:false
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
function load(p){return p&&fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const output=argValue('--output')??'artifacts/cerebro-skill-tribunal.json';
  const report=runSkillTribunal({
    staticLab:load(argValue('--static-lab')??'artifacts/cerebro-skill-static-lab-p0.json'),
    licenses:load(argValue('--licenses')??'artifacts/cerebro-skill-license-evidence.json'),
    behavioralResults:load(argValue('--behavioral-results')??'artifacts/cerebro-skill-behavioral-proxy.json'),
    independentJudge:load(argValue('--independent-judge')??'artifacts/cerebro-skill-independent-judge.json'),
    rollback:load(argValue('--rollback')??'artifacts/cerebro-skill-rollback-proof.json'),
    routeAudit:load(argValue('--route')??'artifacts/cerebro-skill-zero-cost-route.json'),
    rsiShadow:load(argValue('--rsi-shadow')??'artifacts/cerebro-skill-rsi-shadow.json')
  });
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,decision:report.decision,green:report.green,blockers:report.blockers,candidates:report.candidates.length,prod_authorized:false}));
}
