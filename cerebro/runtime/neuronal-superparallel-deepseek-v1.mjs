import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DeepSeekProviderV0 } from './deepseek-provider-v0.mjs';
import { DeepSeekBudgetGuardV0 } from './deepseek-budget-guard-v0.mjs';
import { DeepSeekLiveBalanceGuardV0 } from './deepseek-live-balance-guard-v0.mjs';
import { deepSeekCandidatesV1, evidenceForNeuronalSubmissionV1 } from './neuronal-superparallel-source-v1.mjs';

const OUT_ROOT = path.resolve(process.env.CEREBRO_NEURONAL_OUT_DIR || 'artifacts/neuronal-superparallel-v1');

function integer(value,label,min,max){const n=Number(value);if(!Number.isSafeInteger(n)||n<min||n>max)throw new TypeError(`${label} must be integer ${min}..${max}`);return n;}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}

export function buildNeuronalDeepSeekInputV1(submissionId){
  const evidence=evidenceForNeuronalSubmissionV1(submissionId);
  const s=evidence.submission;
  const input=[
    'CEREBRO NEURONAL · SUPERPARALLEL V1',
    `SUBMISSION ${s.submission_id}`,
    `REQUIREMENT ${s.requirement_id || 'FOUNDATION'}`,
    `DOMAIN ${s.domain}`,
    `PHASE ${s.phase}`,
    `TITLE ${s.title}`,
    `DEPENDENCIES ${JSON.stringify(s.dependencies || [])}`,
    `REQUIRED_SKILLS ${JSON.stringify(s.required_skills || [])}`,
    `REPO_EVIDENCE ${JSON.stringify({keyword_terms:evidence.keyword_terms,matching_paths:evidence.matching_paths}).slice(0,12000)}`,
    'Produce a bounded candidate work product for this PREPROD submission. Return compact JSON only with: state_assessment, confirmed_existing, missing, conflicts, skill_reuse_candidates, skill_gap, recommended_next_actions, implementation_targets, tests_required, old_vs_new_checks, evidence_needed, blockers, human_required_reason_or_null. Preserve existing systems. Do not claim a change was applied. Do not reveal secrets. Do not write PROD. Trading is isolated. If a skill is missing, recommend FACT-001 reuse/extend/build path rather than inventing a duplicate engine.',
  ].join('\n\n').slice(0,28000);
  return {submission:s,evidence,input};
}

export async function runNeuronalDeepSeekV1(submissionId){
  if(process.env.CEREBRO_ALLOW_PAID_FANOUT!=='YES') throw new Error('paid fanout not authorized by runtime flag');
  if(!process.env.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY missing');
  if(process.env.CEREBRO_PROD_WRITE==='true') throw new Error('PROD writes denied');
  if(process.env.CEREBRO_TRADING_ACCESS==='true') throw new Error('Trading denied');
  const projectedCostEur=Number(process.env.CEREBRO_NEURONAL_PROJECTED_EUR_PER_SUBMISSION || '0.05');
  const projectedCostUsd=Number(process.env.CEREBRO_NEURONAL_PROJECTED_USD_PER_SUBMISSION || '0.05');
  const spentEur=Number(process.env.CEREBRO_NEURONAL_SPENT_EUR || '0');
  const budgetGuard=new DeepSeekBudgetGuardV0({initialHardCapEur:200,autoRecharge:false});
  const budgetAuthorization=budgetGuard.authorize({phase:'bootstrap',spentEur,projectedCostEur});
  if(!budgetAuthorization.allowed) throw new Error('HUMAN_REQUIRED:MONEY_LIMIT');
  const liveGuard=new DeepSeekLiveBalanceGuardV0({baselineUsd:100,autoRecharge:false});
  const liveAuthorization=await liveGuard.authorize({apiKey:process.env.DEEPSEEK_API_KEY,projectedCostUsd});
  if(!liveAuthorization.allowed) throw new Error(`HUMAN_REQUIRED:MONEY_LIMIT:${liveAuthorization.reason}`);
  const provider=new DeepSeekProviderV0();
  const {submission,evidence,input}=buildNeuronalDeepSeekInputV1(submissionId);
  const response=await provider.respond({
    model:'deepseek-flash',
    instructions:'You are a bounded CEREBRO PREPROD challenger/planning agent. Produce evidence-grounded candidate work. Deterministic tests, EVA and Tribunal decide acceptance. No PROD authority.',
    input,
    maxOutputTokens:1400,
  },{requestId:`neuronal-${submission.submission_id}-${process.env.GITHUB_RUN_ID || 'local'}`});
  const record={schema_version:'1.0.0',state_type:'CEREBRO_NEURONAL_DEEPSEEK_CANDIDATE_V1',campaign_id:'NEURONAL-SUPERPARALLEL-V1',submission_id:submission.submission_id,requirement_id:submission.requirement_id,evidence,usage:response.usage,output_text:response.output_text,authorization:{budget:budgetAuthorization,live_balance:liveAuthorization},governance_state:'CANDIDATE_ONLY',submission_completed:false,auto_recharge:false,prod_authorized:false,prod_write_authorized:false,trading_access:false};
  writeJson(path.join(OUT_ROOT,'deepseek',`${submission.submission_id}.json`),record);
  return record;
}

export async function runNeuronalDeepSeekShardV1({shard,shards=8,limit=32}={}){
  const s=integer(shard,'shard',0,63); const count=integer(shards,'shards',1,64); if(s>=count) throw new Error('shard must be < shards');
  const candidates=deepSeekCandidatesV1({limit:integer(limit,'limit',1,64)}).filter((_,index)=>index%count===s);
  const results=[];
  for(const item of candidates) results.push(await runNeuronalDeepSeekV1(item.submission_id));
  return results;
}

async function main(){
  const args=Object.fromEntries(process.argv.slice(2).map(arg=>{const[k,v='true']=arg.replace(/^--/,'').split('=');return[k,v];}));
  if(args.mode==='submission'){
    const r=await runNeuronalDeepSeekV1(args.submission); console.log(JSON.stringify({ok:true,submission_id:r.submission_id,governance_state:r.governance_state}));
  }else if(args.mode==='shard'){
    const r=await runNeuronalDeepSeekShardV1({shard:Number(args.shard),shards:Number(args.shards||8),limit:Number(args.limit||32)}); console.log(JSON.stringify({ok:true,shard:Number(args.shard),processed:r.length,submissions:r.map(x=>x.submission_id)}));
  }else throw new Error('use --mode=submission --submission=ID OR --mode=shard --shard=N --shards=8 --limit=32');
}

const self=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(self)main().catch(error=>{console.error(String(error?.message||error));process.exitCode=1;});
