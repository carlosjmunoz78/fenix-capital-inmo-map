import fs from 'node:fs';
import path from 'node:path';
import {
  createRealCerebroActorAdapter,
  preflightRealCerebroActor,
  REAL_CEREBRO_ACTOR_CONTRACT_V1
} from './real-cerebro-actor-adapter.mjs';
import { runConversation } from './conversation-harness.mjs';
import { observeActorBehavior, assertObserverEvent } from '../evaluation/behavior-observer-v1.mjs';

const ACTOR_URL='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-human-old-actor-preprod-v0/chat';
const OIDC_AUDIENCE='cerebro-human-old-actor-preprod-v0';

function arg(name,fallback=null){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:fallback;}

async function githubOidcToken(){
  const requestUrl=process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if(!requestUrl||!requestToken) throw new Error('REAL_CEREBRO_ACTOR_UNAVAILABLE:GITHUB_OIDC_ENV_MISSING');
  const url=new URL(requestUrl);
  url.searchParams.set('audience',OIDC_AUDIENCE);
  const response=await fetch(url,{headers:{authorization:`Bearer ${requestToken}`,'cache-control':'no-store'}});
  const body=await response.json().catch(()=>null);
  if(!response.ok||!body?.value) throw new Error(`REAL_CEREBRO_ACTOR_UNAVAILABLE:GITHUB_OIDC_TOKEN_FAILED:${response.status}`);
  return String(body.value);
}

function connectivityOutcome({transcript}){
  if(transcript.some(turn=>turn.actor_error)) return {complete:true,reason:'ACTOR_ERROR'};
  const actorTurns=transcript.filter(turn=>typeof turn.actor==='string'&&turn.actor.trim()).length;
  return actorTurns>=3?{complete:true,reason:'PREPROD_MULTI_TURN_CONNECTIVITY_CONFIRMED'}:{complete:false};
}

async function main(){
  const outPath=arg('--out','artifacts/human-intelligence/real-old-sample.v1.json');
  const accessToken=await githubOidcToken();
  const preflight=await preflightRealCerebroActor({url:ACTOR_URL,accessToken,authMode:'github_oidc'});
  const actor=createRealCerebroActorAdapter({url:ACTOR_URL,accessToken,authMode:'github_oidc'});
  const episode=await runConversation({
    seed:'CEREBRO-HUMAN-OLD-PHYSICAL-SAMPLE-V1',
    scenario:{scenario_id:'OLD-PHYSICAL-SAMPLE-001',initial_human_utterance:'Necesito entender una hipoteca y no sé por dónde empezar.'},
    actorAdapter:actor,
    actorLabel:'OLD_PREPROD_FROZEN_PROD_V33',
    behaviorObserver:async(input)=>assertObserverEvent(observeActorBehavior(input)),
    outcomeEvaluator:connectivityOutcome,
    maxTurns:4
  });
  const green=preflight.ok===true&&episode.real_cerebro_actor===true&&episode.turns>=3&&episode.completion_reason==='PREPROD_MULTI_TURN_CONNECTIVITY_CONFIRMED';
  const artifact={
    state_type:'CEREBRO_REAL_OLD_ACTOR_PHYSICAL_SAMPLE_V1',
    status:green?'GREEN':'RED',
    generated_at:new Date().toISOString(),
    contract:REAL_CEREBRO_ACTOR_CONTRACT_V1,
    preflight,
    episode,
    safety:{prod_invoked:false,prod_write_authorized:false,prod_execution_enabled:false,contains_customer_data:false,trading_access:false,additional_cost_eur:0}
  };
  fs.mkdirSync(path.dirname(outPath),{recursive:true});
  fs.writeFileSync(outPath,JSON.stringify(artifact,null,2)+'\n');
  console.log(JSON.stringify({status:artifact.status,turns:episode.turns,real_cerebro_actor:episode.real_cerebro_actor,completion_reason:episode.completion_reason,actor_environment:episode.actor_evidence_summary.actor_environment}));
  if(!green) process.exitCode=1;
}

main().catch(error=>{
  console.error(String(error?.stack??error));
  process.exitCode=1;
});
