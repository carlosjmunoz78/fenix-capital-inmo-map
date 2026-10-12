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
  return n>=3?{complete:true,reason:'PAIRED_THREE_TURNS'}:{complete:false};
}
function delta(newValue,oldValue){return Number((Number(newValue??0)-Number(oldValue??0)).toFixed(4));}

async function main(){
  const outPath=arg('--out','artifacts/human-intelligence/old-vs-new-batch.v1.json');
  const oldToken=await githubOidcToken(OLD_FUNCTION);
  const newToken=await githubOidcToken(NEW_FUNCTION);
  const oldModes=new Set([OLD_MODE]);const newModes=new Set([NEW_MODE]);
  const oldPreflight=await preflightRealCerebroActor({url:OLD_URL,accessToken:oldToken,authMode:'github_oidc',expectedFunction:OLD_FUNCTION,allowedSourceModes:oldModes});
  const newPreflight=await preflightRealCerebroActor({url:NEW_URL,accessToken:newToken,authMode:'github_oidc',expectedFunction:NEW_FUNCTION,allowedSourceModes:newModes});
  const actorOld=createRealCerebroActorAdapter({url:OLD_URL,accessToken:oldToken,authMode:'github_oidc',expectedFunction:OLD_FUNCTION,allowedSourceModes:oldModes});
  const actorNew=createRealCerebroActorAdapter({url:NEW_URL,accessToken:newToken,authMode:'github_oidc',expectedFunction:NEW_FUNCTION,allowedSourceModes:newModes});
  const pairs=[];
  for(const [scenarioId,initial] of CASES){
    const pair=await runPairedReplay({
      seed:`PAIRED-V1:${scenarioId}`,
      scenario:{scenario_id:scenarioId,initial_human_utterance:initial},
      actorOld,actorNew,
      behaviorObserver:async input=>assertObserverEvent(observeActorBehavior(input)),
      outcomeEvaluator:outcome,maxTurns:3
    });
    pairs.push({scenario_id:scenarioId,initial_human_utterance:initial,pair});
  }
  const oldEpisodes=pairs.map(x=>x.pair.old);const newEpisodes=pairs.map(x=>x.pair.new);
  const oldMetrics=aggregateConversationMetrics(oldEpisodes,{baselineLabel:'OLD_PREPROD_FROZEN_PROD_V33'});
  const newMetrics=aggregateConversationMetrics(newEpisodes,{baselineLabel:'NEW_PREPROD_HUMAN_INTELLIGENCE_V1'});
  const deltas={
    duplicate_reply_rate:delta(newMetrics.duplicate_reply_rate,oldMetrics.duplicate_reply_rate),
    useful_question_rate:delta(newMetrics.useful_question_rate,oldMetrics.useful_question_rate),
    ignored_concern_rate:delta(newMetrics.ignored_concern_rate,oldMetrics.ignored_concern_rate),
    grounding_rate:delta(newMetrics.grounding_rate,oldMetrics.grounding_rate),
    clear_explanation_rate:delta(newMetrics.clear_explanation_rate,oldMetrics.clear_explanation_rate),
    hidden_facts_revealed_total:newMetrics.hidden_facts_revealed_total-oldMetrics.hidden_facts_revealed_total
  };
  const gates={
    preflight:oldPreflight.ok===true&&newPreflight.ok===true,
    all_pairs_real_and_comparable:pairs.every(x=>x.pair.real_cerebro_actor===true&&x.pair.comparable===true),
    no_actor_errors:newMetrics.actor_errors_total===0&&oldMetrics.actor_errors_total===0,
    no_ontology_leaks:newMetrics.ontology_leaks_total===0&&oldMetrics.ontology_leaks_total===0,
    duplicate_replies_improve:newMetrics.duplicate_reply_rate<oldMetrics.duplicate_reply_rate&&newMetrics.duplicate_reply_rate<=0.34,
    useful_questions_improve:newMetrics.useful_question_rate>oldMetrics.useful_question_rate&&newMetrics.useful_question_rate>=0.5,
    ignored_concern_improves_or_holds:newMetrics.ignored_concern_rate<=oldMetrics.ignored_concern_rate&&newMetrics.ignored_concern_rate<=0.2,
    no_false_certainty_regression:newMetrics.false_certainty_rate<=oldMetrics.false_certainty_rate,
    no_pressure_regression:newMetrics.unnecessary_pressure_rate<=oldMetrics.unnecessary_pressure_rate,
    no_excessive_detail_regression:newMetrics.excessive_detail_rate<=oldMetrics.excessive_detail_rate
  };
  const green=Object.values(gates).every(Boolean);
  const artifact={
    state_type:'CEREBRO_HUMAN_INTELLIGENCE_OLD_VS_NEW_BATCH_V1',status:green?'GREEN':'RED',generated_at:new Date().toISOString(),
    scope:'REPRESENTATIVE_DIRECTIONAL_GATE_NOT_PROD_PROMOTION_AUTHORITY',cases_total:CASES.length,
    old_preflight:oldPreflight,new_preflight:newPreflight,old_metrics:oldMetrics,new_metrics:newMetrics,deltas,gates,pairs,
    decision:{candidate_advances_to_next_lab_gate:green,prod_promotion_authorized:false,preprod_promotion_authorized:false,requires_full_golden_and_tribunal_before_promotion:true},
    safety:{prod_invoked:false,prod_write_authorized:false,prod_execution_enabled:false,contains_customer_data:false,trading_access:false,additional_cost_eur:0,learning_dispatch_authorized:false}
  };
  fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.writeFileSync(outPath,JSON.stringify(artifact,null,2)+'\n');
  console.log(JSON.stringify({status:artifact.status,cases_total:CASES.length,old:{duplicate:oldMetrics.duplicate_reply_rate,useful_question:oldMetrics.useful_question_rate,ignored_concern:oldMetrics.ignored_concern_rate},new:{duplicate:newMetrics.duplicate_reply_rate,useful_question:newMetrics.useful_question_rate,ignored_concern:newMetrics.ignored_concern_rate},deltas,gates}));
  if(!green)process.exitCode=1;
}
main().catch(error=>{console.error(String(error?.stack??error));process.exitCode=1;});
