/** Isolated LAB-only OLD / NEW shadow arm. Public synthetic fixtures, no network. */
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
const profiles={
  OLD:[['FUTURE_TYPO',/\bfurura\b/ig]],
  NEW:[['FUTURE_TYPO',/\bfurura\b/ig],['CONSTRUCTION_TYPO',/\bconstucci[oó]n\b/ig]]
};
const sha=s=>createHash('sha256').update(s).digest('hex');
export function runShadowArm({arm,cases}){
 if(!Object.hasOwn(profiles,arm))throw Error('SHADOW_ARM_INVALID');
 if(!Array.isArray(cases)||cases.length<1||cases.length>100)throw Error('SHADOW_CASES_INVALID');
 const results=cases.map((c,i)=>{
  if(typeof c.text!=='string'||c.text.length>2000||!Array.isArray(c.expected_codes))throw Error('SHADOW_CASE_INVALID_'+i);
  const found=profiles[arm].flatMap(([code,re])=>[...c.text.matchAll(re)].map(()=>code));
  const expected=new Set(c.expected_codes),detected=new Set(found);
  const true_positive=[...detected].filter(x=>expected.has(x)).length;
  const false_positive=[...detected].filter(x=>!expected.has(x)).length;
  const false_negative=[...expected].filter(x=>!detected.has(x)).length;
  return {case_id:c.case_id,true_positive,false_positive,false_negative};
 });
 const counts=results.reduce((a,x)=>({tp:a.tp+x.true_positive,fp:a.fp+x.false_positive,fn:a.fn+x.false_negative}),{tp:0,fp:0,fn:0});
 const precision=counts.tp+counts.fp?counts.tp/(counts.tp+counts.fp):0;
 const recall=counts.tp+counts.fn?counts.tp/(counts.tp+counts.fn):0;
 const f1=precision+recall?2*precision*recall/(precision+recall):0;
 return {arm,case_count:cases.length,counts,precision,recall,f1,
  results_sha256:sha(JSON.stringify(results)),input_sha256:sha(JSON.stringify(cases)),
  process_pid:process.pid,public_fixture_not_secret_holdout:true,
  cost_eur:0,external_writes:0,prod_authorized:false};
}
async function main(){
 const arm=process.argv[2];if(!['OLD','NEW'].includes(arm))throw Error('ARM_INVALID');
 let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>160000)throw Error('INPUT_TOO_LARGE');}
 process.stdout.write(JSON.stringify(runShadowArm({arm,cases:JSON.parse(input)}))+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{process.stderr.write(JSON.stringify({state:'BLOCKED',reason:String(e.message).slice(0,70)})+'\n');process.exitCode=2;});
