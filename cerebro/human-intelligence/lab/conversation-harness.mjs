import { generateSyntheticHuman, publicActorView, applyObservableEvent, inferSyntheticScenarioDomain, contract as populationContract } from './synthetic-human-population.mjs';
import { nextSyntheticHumanUtterance, assertNoOntologyLeak } from './synthetic-human-utterance.mjs';
import { verifyRealActorEvidence } from './real-cerebro-actor-adapter.mjs';

function safePublicTranscript(transcript) {
  const text = JSON.stringify(transcript);
  for (const forbidden of ['private_state','private_goal','hidden_facts','misbeliefs','reveal_rules','internal_state','semantic_key','scenario_domain','simulator_overrides']) {
    if (text.includes(forbidden)) throw new Error(`private_state_leak:${forbidden}`);
  }
  return transcript;
}
function actorEvidenceFrom(output) {if(!output||typeof output!=='object')return null;const evidence=output.actor_evidence??null;if(evidence?.real_cerebro_actor===true&&!verifyRealActorEvidence(evidence))throw new Error('unsafe_or_unverified_real_actor_evidence');return evidence;}
function safeAttestation(evidence){
  if(!verifyRealActorEvidence(evidence))return null;
  return Object.freeze({
    real_cerebro_actor:true,
    environment:evidence.environment,
    project_ref:evidence.project_ref,
    prod_write_authorized:evidence.prod_write_authorized,
    prod_execution_enabled:evidence.prod_execution_enabled,
    customer_data:evidence.customer_data,
    trading_access:evidence.trading_access,
    additional_cost_eur:evidence.additional_cost_eur,
    source_service:evidence.source_service??null,
    source_version:evidence.source_version,
    provenance_kind:evidence.provenance_kind??'SHA256',
    source_sha256:evidence.source_sha256??null,
    source_commit_sha:evidence.source_commit_sha??null,
    source_blob_sha:evidence.source_blob_sha??null,
    source_mode:evidence.source_mode,
    source_scope:evidence.source_scope,
    auth_mode:evidence.auth_mode
  });
}
function clamp(v){return Math.max(0,Math.min(1,Number(v)));}
function applySimulatorOverrides(profile,raw){
  if(!raw||typeof raw!=='object')return profile;
  const next=structuredClone(profile);const c=populationContract();
  if(typeof raw.strategy==='string'&&c.generation_strategies.includes(raw.strategy))next.strategy=raw.strategy;
  const dims=raw.dimensions&&typeof raw.dimensions==='object'?raw.dimensions:{};
  for(const [key,value] of Object.entries(dims)){
    if(!Array.isArray(c.dimensions?.[key])||!c.dimensions[key].includes(value))throw new Error(`invalid_simulator_override:${key}:${value}`);
    next.dimensions[key]=value;
  }
  const state=raw.initial_state&&typeof raw.initial_state==='object'?raw.initial_state:{};
  for(const key of c.internal_state_variables??[]){if(state[key]!=null){const value=Number(state[key]);if(!Number.isFinite(value)||value<0||value>1)throw new Error(`invalid_simulator_state_override:${key}`);next.private_state.internal_state[key]=clamp(value);}}
  return next;
}

export async function runConversation({seed, scenario={}, actorAdapter, behaviorObserver, outcomeEvaluator, maxTurns=12, actorLabel='DRY_RUN'}) {
  if (typeof actorAdapter !== 'function') throw new Error('actor_adapter_required');
  if (typeof behaviorObserver !== 'function') throw new Error('independent_behavior_observer_required');
  const scenarioDomain=inferSyntheticScenarioDomain(scenario);
  const generated=generateSyntheticHuman(seed,{scenario_domain:scenarioDomain});
  const initial=applySimulatorOverrides(generated,scenario?.simulator_overrides);
  let profile=structuredClone(initial);
  const transcript=[];const actorEvidence=[];
  let humanText=assertNoOntologyLeak(scenario.initial_human_utterance ?? `Necesito ayuda con ${String(profile.dimensions.goal_family).toLowerCase()}.`);
  let completion_reason='MAX_TURNS';
  for(let turn=1;turn<=maxTurns;turn++){
    const actorInput={seed:String(seed),scenario_id:scenario.scenario_id??'SYNTHETIC',turn,human_message:humanText,history:structuredClone(transcript),human_profile:publicActorView(profile),environment:'LAB',prod_write_authorized:false,trading_access:false};
    safePublicTranscript(actorInput);
    let actorOutput,evidence;
    try{actorOutput=await actorAdapter(actorInput);evidence=actorEvidenceFrom(actorOutput);}catch(error){completion_reason='ACTOR_ERROR';transcript.push({turn,human:humanText,actor_error:String(error?.message??error)});break;}
    actorEvidence.push(evidence);
    const actorText=typeof actorOutput==='string'?actorOutput:String(actorOutput?.text??'');
    const actorMeta=typeof actorOutput==='object'&&actorOutput?{
      status:String(actorOutput.actor_status??'OK'),
      intent:actorOutput.actor_intent??null,
      executed:actorOutput.actor_executed===true,
      epistemic_state:actorOutput.actor_epistemic_state??null,
      truth_basis:actorOutput.actor_truth_basis??null,
      context_applied:actorOutput.actor_context_applied===true
    }:{status:'OK',intent:null,executed:false,epistemic_state:null,truth_basis:null,context_applied:false};
    const attestation=safeAttestation(evidence);
    const event=await behaviorObserver({actor_text:actorText,human_message:humanText,history:structuredClone(transcript),public_profile:publicActorView(profile)});
    const revealedIdsBefore=new Set(profile.private_state.hidden_facts.filter(f=>f.revealed).map(f=>f.fact_id));
    profile=applyObservableEvent(profile,event);
    const newlyRevealedPrivate=profile.private_state.hidden_facts.filter(f=>f.revealed&&!revealedIdsBefore.has(f.fact_id));
    transcript.push({turn,human:humanText,actor:actorText,actor_meta:actorMeta,actor_attestation:attestation,observed_event:event,revealed_facts:structuredClone(profile.observable_state.explicit_facts_revealed)});
    safePublicTranscript(transcript);
    const outcome=typeof outcomeEvaluator==='function'?await outcomeEvaluator({transcript:structuredClone(transcript),public_profile:publicActorView(profile)}):null;
    if(outcome?.complete){completion_reason=outcome.reason??'SUCCESS';break;}
    humanText=assertNoOntologyLeak(nextSyntheticHumanUtterance({profile,turn:turn+1,newlyRevealedFact:newlyRevealedPrivate.at(-1)??null,lastActorText:actorText}));
  }
  const completedActorTurns=transcript.filter(turn=>typeof turn.actor==='string').length;
  const realCerebroActor=completedActorTurns>0&&actorEvidence.length===completedActorTurns&&actorEvidence.every(verifyRealActorEvidence);
  const sourceVersions=[...new Set(actorEvidence.filter(verifyRealActorEvidence).map(e=>String(e.source_version)))];
  const sourceBlobs=[...new Set(actorEvidence.filter(verifyRealActorEvidence).map(e=>e.source_blob_sha??e.source_sha256).filter(Boolean).map(String))];
  return {state_type:'CEREBRO_HUMAN_CONVERSATION_EPISODE_V1',actor_mode:actorLabel,real_cerebro_actor:realCerebroActor,seed:String(seed),environment:'LAB',engine_id:'SIM-001',completion_reason,turns:transcript.length,transcript:safePublicTranscript(transcript),actor_evidence_summary:{completed_actor_turns:completedActorTurns,verified_real_actor_turns:actorEvidence.filter(verifyRealActorEvidence).length,all_turns_verified:realCerebroActor,actor_environment:realCerebroActor?'PREPROD':null,source_versions:sourceVersions,source_digests:sourceBlobs},initial_public_profile:publicActorView(initial),final_public_profile:publicActorView(profile),safety:{contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0}};
}

export async function runPairedReplay({seed,scenario={},actorOld,actorNew,behaviorObserver,outcomeEvaluator,maxTurns=12}){const common={seed,scenario,behaviorObserver,outcomeEvaluator,maxTurns};const oldEpisode=await runConversation({...common,actorAdapter:actorOld,actorLabel:'OLD'});const newEpisode=await runConversation({...common,actorAdapter:actorNew,actorLabel:'NEW'});const sameInitial=JSON.stringify(oldEpisode.initial_public_profile)===JSON.stringify(newEpisode.initial_public_profile);return {state_type:'CEREBRO_HUMAN_PAIRED_REPLAY_V1',seed:String(seed),same_seed:true,same_initial_public_profile:sameInitial,real_cerebro_actor:oldEpisode.real_cerebro_actor===true&&newEpisode.real_cerebro_actor===true,comparable:sameInitial&&oldEpisode.turns>0&&newEpisode.turns>0,old:oldEpisode,new:newEpisode};}
