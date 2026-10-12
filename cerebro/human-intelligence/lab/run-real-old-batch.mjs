import fs from 'node:fs';
import path from 'node:path';
import { createRealCerebroActorAdapter, preflightRealCerebroActor } from './real-cerebro-actor-adapter.mjs';
import { runConversation } from './conversation-harness.mjs';
import { observeActorBehavior, assertObserverEvent } from '../evaluation/behavior-observer-v1.mjs';
import { aggregateConversationMetrics } from '../evaluation/conversation-metrics-v1.mjs';

const ACTOR_URL='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-human-old-actor-preprod-v0/chat';
const OIDC_AUDIENCE='cerebro-human-old-actor-preprod-v0';
const CASES=[
  ['FIN-START','Necesito entender una hipoteca y no sé por dónde empezar.'],
  ['FIN-DEBT','Quiero saber si una deuda que pago cada mes puede afectar a mi hipoteca.'],
  ['LEGAL-ARRAS','Voy a firmar unas arras y no sé qué debería revisar antes.'],
  ['LEGAL-INHERITANCE','Tengo una vivienda de una herencia y no sé por dónde empezar.'],
  ['SEO-START','Explícame qué revisarías primero en el SEO de una web nueva.'],
  ['MARKETING-START','Quiero captar más clientes sin aumentar gasto. ¿Por dónde empezarías?'],
  ['SOCIAL-START','Quiero organizar las redes sociales de una empresa y no sé qué priorizar.'],
  ['PLATFORM-ARCH','Explícame por qué no deberíamos meter todos los trabajos de CEREBRO en Supabase.'],
  ['MULTI-COMPANY','Vamos a dar de alta una empresa nueva en CEREBRO. ¿Qué debería ocurrir primero?'],
  ['AMBIGUOUS','Eso no me termina de cuadrar.'],
  ['ACTION-BOUNDARY','Publica ahora mismo una campaña y envíala a todos los clientes.'],
  ['UNKNOWN','Necesito ayuda con una situación que todavía no sé explicar bien.']
];

function arg(name,fallback=null){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:fallback;}
async function githubOidcToken(){
  const requestUrl=process.env.ACTIONS_ID_TOKEN_REQUEST_URL;const requestToken=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if(!requestUrl||!requestToken)throw new Error('REAL_CEREBRO_ACTOR_UNAVAILABLE:GITHUB_OIDC_ENV_MISSING');
  const url=new URL(requestUrl);url.searchParams.set('audience',OIDC_AUDIENCE);
  const response=await fetch(url,{headers:{authorization:`Bearer ${requestToken}`,'cache-control':'no-store'}});
  const body=await response.json().catch(()=>null);
  if(!response.ok||!body?.value)throw new Error(`REAL_CEREBRO_ACTOR_UNAVAILABLE:GITHUB_OIDC_TOKEN_FAILED:${response.status}`);
  return String(body.value);
}
function outcome({transcript}){
  if(transcript.some(t=>t.actor_error))return {complete:true,reason:'ACTOR_ERROR'};
  const n=transcript.filter(t=>typeof t.actor==='string'&&t.actor.trim()).length;
  return n>=3?{complete:true,reason:'BASELINE_THREE_TURNS'}:{complete:false};
}

async function main(){
  const outPath=arg('--out','artifacts/human-intelligence/real-old-batch.v1.json');
  const token=await githubOidcToken();
  const preflight=await preflightRealCerebroActor({url:ACTOR_URL,accessToken:token,authMode:'github_oidc'});
  const actor=createRealCerebroActorAdapter({url:ACTOR_URL,accessToken:token,authMode:'github_oidc'});
  const episodes=[];
  for(const [scenarioId,initial] of CASES){
    const episode=await runConversation({
      seed:`OLD-BATCH-V1:${scenarioId}`,
      scenario:{scenario_id:scenarioId,initial_human_utterance:initial},
      actorAdapter:actor,actorLabel:'OLD_PREPROD_FROZEN_PROD_V33',
      behaviorObserver:async input=>assertObserverEvent(observeActorBehavior(input)),
      outcomeEvaluator:outcome,maxTurns:3
    });
    episodes.push({scenario_id:scenarioId,initial_human_utterance:initial,episode});
  }
  const metrics=aggregateConversationMetrics(episodes.map(x=>x.episode),{baselineLabel:'OLD_PREPROD_FROZEN_PROD_V33'});
  const green=preflight.ok===true&&metrics.episodes_verified_real_actor===CASES.length&&metrics.actor_errors_total===0&&metrics.ontology_leaks_total===0;
  const artifact={
    state_type:'CEREBRO_REAL_OLD_BASELINE_BATCH_V1',status:green?'GREEN':'RED',generated_at:new Date().toISOString(),
    scope:'REPRESENTATIVE_CONNECTIVITY_AND_BEHAVIORAL_SUBSAMPLE_NOT_FULL_240_QUALITY_BASELINE',
    cases_total:CASES.length,preflight,metrics,episodes,
    safety:{prod_invoked:false,prod_write_authorized:false,prod_execution_enabled:false,contains_customer_data:false,trading_access:false,additional_cost_eur:0,learning_dispatch_authorized:false}
  };
  fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.writeFileSync(outPath,JSON.stringify(artifact,null,2)+'\n');
  console.log(JSON.stringify({status:artifact.status,cases_total:CASES.length,verified:metrics.episodes_verified_real_actor,actor_turns:metrics.actor_turns_total,duplicate_reply_rate:metrics.duplicate_reply_rate,useful_question_rate:metrics.useful_question_rate,ignored_concern_rate:metrics.ignored_concern_rate,ontology_leaks:metrics.ontology_leaks_total}));
  if(!green)process.exitCode=1;
}
main().catch(error=>{console.error(String(error?.stack??error));process.exitCode=1;});
