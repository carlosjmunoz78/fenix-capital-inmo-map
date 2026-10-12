import fs from 'node:fs';
import path from 'node:path';
import { createRealCerebroActorAdapter, preflightRealCerebroActor } from './real-cerebro-actor-adapter.mjs';
import { runPairedReplay } from './conversation-harness.mjs';
import { observeActorBehavior, assertObserverEvent } from '../evaluation/behavior-observer-v1.mjs';
import { aggregateConversationMetrics } from '../evaluation/conversation-metrics-v1.mjs';

const PREPROD_BASE='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1';
const OLD_FUNCTION='cerebro-human-old-actor-preprod-v0';
const NEW_FUNCTION='cerebro-human-new-actor-preprod-v1';
const OLD_URL=`${PREPROD_BASE}/${OLD_FUNCTION}/chat`;
const NEW_URL=`${PREPROD_BASE}/${NEW_FUNCTION}/chat`;
const OLD_MODE='FROZEN_PROD_V33_SANDBOX';
const NEW_MODE='HUMAN_INTELLIGENCE_NEW_V1_PREPROD';
const VARIANTS=['NORMAL_COOPERATIVE','AMBIGUOUS_INCOMPLETE','FRICTION_HIGH_LOAD','ADVERSARIAL_CONTRADICTORY'];

function arg(name,fallback=null){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:fallback;}
function loadLibrary(){
  const p=new URL('../scenarios/fenix-human-60.v1.json',import.meta.url);
  const lib=JSON.parse(fs.readFileSync(p,'utf8'));
  if(!Array.isArray(lib.cases)||lib.cases.length!==60)throw new Error(`canonical_60_required:${lib.cases?.length??0}`);
  return lib;
}
function variantUtterance(base,variant){
  const b=String(base??'').trim();
  if(variant==='NORMAL_COOPERATIVE')return b;
  if(variant==='AMBIGUOUS_INCOMPLETE')return `No sé explicarlo del todo bien. ${b}`;
  if(variant==='FRICTION_HIGH_LOAD')return `Voy con prisa y esto me está generando bastante agobio. ${b}`;
  if(variant==='ADVERSARIAL_CONTRADICTORY')return `No me des una respuesta general porque antes me han dicho cosas distintas. ${b}`;
  throw new Error(`unsupported_variant:${variant}`);
}
async function githubOidcToken(audience){
  const requestUrl=process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if(!requestUrl||!requestToken)throw new Error('REAL_CEREBRO_ACTOR_UNAVAILABLE:GITHUB_OIDC_ENV_MISSING');
  const url=new URL(requestUrl);url.searchParams.set('audience',audience);
  const response=await fetch(url,{headers:{authorization:`Bearer ${requestToken}`,'cache-control':'no-store'}});
  const body=await response.json().catch(()=>null);
  if(!response.ok||!body?.value)throw new Error(`REAL_CEREBRO_ACTOR_UNAVAILABLE:GITHUB_OIDC_TOKEN_FAILED:${audience}:${response.status}`);
  return String(body.value);
}
function outcome({transcript}){
  if(transcript.some(t=>t.actor_error))return {complete:true,reason:'ACTOR_ERROR'};
  const n=transcript.filter(t=>typeof t.actor==='string'&&t.actor.trim()).length;
  return n>=3?{complete:true,reason:'GOLDEN_THREE_TURNS'}:{complete:false};
}
function delta(a,b){return Number((Number(a??0)-Number(b??0)).toFixed(4));}
async function poolMap(items,limit,worker){
  const out=new Array(items.length);let cursor=0;
  async function lane(){while(true){const i=cursor++;if(i>=items.length)return;out[i]=await worker(items[i],i);}}
  await Promise.all(Array.from({length:Math.min(limit,items.length)},()=>lane()));
  return out;
}

async function main(){
  const outPath=arg('--out','artifacts/human-intelligence/full-golden-old-vs-new.v1.json');
  const concurrency=Math.max(1,Math.min(24,Number(arg('--concurrency','12'))||12));
  const lib=loadLibrary();
  const tasks=lib.cases.flatMap(c=>VARIANTS.map(variant=>({
    case_id:Number(c.case),category:String(c.category),title:String(c.title),variant,
    scenario_id:`FENIX-${String(c.case).padStart(2,'0')}-${variant}`,
    initial_human_utterance:variantUtterance(c.initial_utterance,variant)
  })));
  if(tasks.length!==240)throw new Error(`golden_240_required:${tasks.length}`);

  const [oldToken,newToken]=await Promise.all([githubOidcToken(OLD_FUNCTION),githubOidcToken(NEW_FUNCTION)]);
  const oldModes=new Set([OLD_MODE]),newModes=new Set([NEW_MODE]);
  const [oldPreflight,newPreflight]=await Promise.all([
    preflightRealCerebroActor({url:OLD_URL,accessToken:oldToken,authMode:'github_oidc',expectedFunction:OLD_FUNCTION,allowedSourceModes:oldModes}),
    preflightRealCerebroActor({url:NEW_URL,accessToken:newToken,authMode:'github_oidc',expectedFunction:NEW_FUNCTION,allowedSourceModes:newModes})
  ]);
  const actorOld=createRealCerebroActorAdapter({url:OLD_URL,accessToken:oldToken,authMode:'github_oidc',expectedFunction:OLD_FUNCTION,allowedSourceModes:oldModes});
  const actorNew=createRealCerebroActorAdapter({url:NEW_URL,accessToken:newToken,authMode:'github_oidc',expectedFunction:NEW_FUNCTION,allowedSourceModes:newModes});

  const pairs=await poolMap(tasks,concurrency,async task=>{
    const pair=await runPairedReplay({
      seed:`GOLDEN-V1:${task.scenario_id}`,
      scenario:{scenario_id:task.scenario_id,initial_human_utterance:task.initial_human_utterance},
      actorOld,actorNew,
      behaviorObserver:async input=>assertObserverEvent(observeActorBehavior(input)),
      outcomeEvaluator:outcome,maxTurns:3
    });
    return {...task,pair};
  });

  const oldEpisodes=pairs.map(x=>x.pair.old),newEpisodes=pairs.map(x=>x.pair.new);
  const oldMetrics=aggregateConversationMetrics(oldEpisodes,{baselineLabel:'OLD_PREPROD_FROZEN_PROD_V33_FULL_GOLDEN'});
  const newMetrics=aggregateConversationMetrics(newEpisodes,{baselineLabel:'NEW_PREPROD_HUMAN_INTELLIGENCE_V1_FULL_GOLDEN'});
  const deltas={
    duplicate_reply_rate:delta(newMetrics.duplicate_reply_rate,oldMetrics.duplicate_reply_rate),
    signal_question_rate:delta(newMetrics.signal_question_rate,oldMetrics.signal_question_rate),
    signal_ignored_concern_rate:delta(newMetrics.signal_ignored_concern_rate,oldMetrics.signal_ignored_concern_rate),
    signal_acknowledged_concern_rate:delta(newMetrics.signal_acknowledged_concern_rate,oldMetrics.signal_acknowledged_concern_rate),
    signal_grounding_rate:delta(newMetrics.signal_grounding_rate,oldMetrics.signal_grounding_rate),
    signal_clear_explanation_rate:delta(newMetrics.signal_clear_explanation_rate,oldMetrics.signal_clear_explanation_rate),
    signal_question_budget_ok_rate:delta(newMetrics.signal_question_budget_ok_rate,oldMetrics.signal_question_budget_ok_rate),
    signal_false_certainty_rate:delta(newMetrics.signal_false_certainty_rate,oldMetrics.signal_false_certainty_rate),
    signal_unnecessary_pressure_rate:delta(newMetrics.signal_unnecessary_pressure_rate,oldMetrics.signal_unnecessary_pressure_rate),
    signal_excessive_detail_rate:delta(newMetrics.signal_excessive_detail_rate,oldMetrics.signal_excessive_detail_rate)
  };
  const physical={
    cases_total:60,variants_total:4,pairs_total:pairs.length,
    old_verified:oldMetrics.episodes_verified_real_actor,new_verified:newMetrics.episodes_verified_real_actor,
    all_pairs_real_and_comparable:pairs.every(x=>x.pair.real_cerebro_actor===true&&x.pair.comparable===true),
    no_actor_errors:oldMetrics.actor_errors_total===0&&newMetrics.actor_errors_total===0,
    no_ontology_leaks:oldMetrics.ontology_leaks_total===0&&newMetrics.ontology_leaks_total===0
  };
  const green=oldPreflight.ok===true&&newPreflight.ok===true&&physical.pairs_total===240&&physical.old_verified===240&&physical.new_verified===240&&physical.all_pairs_real_and_comparable&&physical.no_actor_errors&&physical.no_ontology_leaks;
  const artifact={
    state_type:'CEREBRO_HUMAN_INTELLIGENCE_FULL_GOLDEN_OLD_VS_NEW_V1',status:green?'GREEN':'RED',generated_at:new Date().toISOString(),
    scope:'FULL_CANONICAL_60_X_4_PHYSICAL_PAIRED_GOLDEN',library_id:lib.library_id,cases_total:60,variants:VARIANTS,pairs_total:240,
    old_preflight:oldPreflight,new_preflight:newPreflight,physical,old_metrics:oldMetrics,new_metrics:newMetrics,deltas,pairs,
    decision:{tribunal_required:true,prod_promotion_authorized:false,preprod_promotion_authorized:false},
    safety:{prod_invoked:false,prod_write_authorized:false,prod_execution_enabled:false,contains_customer_data:false,trading_access:false,additional_cost_eur:0,learning_dispatch_authorized:false}
  };
  fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.writeFileSync(outPath,JSON.stringify(artifact,null,2)+'\n');
  console.log(JSON.stringify({status:artifact.status,pairs:240,old_verified:physical.old_verified,new_verified:physical.new_verified,deltas}));
  if(!green)process.exitCode=1;
}
main().catch(error=>{console.error(String(error?.stack??error));process.exitCode=1;});
