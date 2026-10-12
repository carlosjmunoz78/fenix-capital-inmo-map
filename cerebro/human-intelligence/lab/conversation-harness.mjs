import { generateSyntheticHuman, publicActorView, applyObservableEvent } from './synthetic-human-population.mjs';
import { verifyRealActorEvidence } from './real-cerebro-actor-adapter.mjs';

function safePublicTranscript(transcript) {
  const text = JSON.stringify(transcript);
  for (const forbidden of ['private_state','private_goal','hidden_facts','misbeliefs','reveal_rules','internal_state']) {
    if (text.includes(forbidden)) throw new Error(`private_state_leak:${forbidden}`);
  }
  return transcript;
}

function actorEvidenceFrom(output) {
  if(!output||typeof output!=='object') return null;
  const evidence=output.actor_evidence??null;
  if(evidence?.real_cerebro_actor===true&&!verifyRealActorEvidence(evidence)) {
    throw new Error('unsafe_or_unverified_real_actor_evidence');
  }
  return evidence;
}

export async function runConversation({seed, scenario={}, actorAdapter, behaviorObserver, outcomeEvaluator, maxTurns=12, actorLabel='DRY_RUN'}) {
  if (typeof actorAdapter !== 'function') throw new Error('actor_adapter_required');
  if (typeof behaviorObserver !== 'function') throw new Error('independent_behavior_observer_required');
  const initial = generateSyntheticHuman(seed);
  let profile = structuredClone(initial);
  const transcript=[];
  const actorEvidence=[];
  let humanText = scenario.initial_human_utterance ?? `Necesito ayuda con ${profile.dimensions.goal_family.toLowerCase()}.`;
  let completion_reason='MAX_TURNS';

  for (let turn=1; turn<=maxTurns; turn++) {
    const actorInput={
      seed:String(seed), scenario_id:scenario.scenario_id ?? 'SYNTHETIC', turn,
      human_message:humanText, history:structuredClone(transcript), human_profile:publicActorView(profile),
      environment:'LAB', prod_write_authorized:false, trading_access:false
    };
    safePublicTranscript(actorInput);
    let actorOutput;
    try { actorOutput=await actorAdapter(actorInput); }
    catch (error) { completion_reason='ACTOR_ERROR'; transcript.push({turn,human:humanText,actor_error:String(error?.message ?? error)}); break; }
    const evidence=actorEvidenceFrom(actorOutput);
    actorEvidence.push(evidence);
    const actorText=typeof actorOutput==='string' ? actorOutput : String(actorOutput?.text ?? '');
    const event=await behaviorObserver({actor_text:actorText,human_message:humanText,history:structuredClone(transcript),public_profile:publicActorView(profile)});
    profile=applyObservableEvent(profile,event);
    transcript.push({turn,human:humanText,actor:actorText,observed_event:event,revealed_facts:structuredClone(profile.observable_state.explicit_facts_revealed)});
    safePublicTranscript(transcript);
    const outcome=typeof outcomeEvaluator==='function' ? await outcomeEvaluator({transcript:structuredClone(transcript),public_profile:publicActorView(profile)}) : null;
    if (outcome?.complete) { completion_reason=outcome.reason ?? 'SUCCESS'; break; }
    humanText = profile.observable_state.explicit_facts_revealed.length
      ? `Hay algo más relevante: ${profile.observable_state.explicit_facts_revealed.at(-1).type}. ¿Cómo seguimos?`
      : turn % 3 === 0 ? 'Eso no termina de responder a lo que necesito.' : '¿Me lo puedes concretar un poco más?';
  }
  const completedActorTurns=transcript.filter(turn=>typeof turn.actor==='string').length;
  const realCerebroActor=completedActorTurns>0&&actorEvidence.length===completedActorTurns&&actorEvidence.every(verifyRealActorEvidence);
  return {
    state_type:'CEREBRO_HUMAN_CONVERSATION_EPISODE_V1', actor_mode:actorLabel, real_cerebro_actor:realCerebroActor,
    seed:String(seed), environment:'LAB', engine_id:'SIM-001', completion_reason,
    turns:transcript.length, transcript:safePublicTranscript(transcript),
    actor_evidence_summary:{
      completed_actor_turns:completedActorTurns,
      verified_real_actor_turns:actorEvidence.filter(verifyRealActorEvidence).length,
      all_turns_verified:realCerebroActor,
      actor_environment:realCerebroActor?'PREPROD':null
    },
    initial_public_profile:publicActorView(initial), final_public_profile:publicActorView(profile),
    safety:{contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0}
  };
}

export async function runPairedReplay({seed, scenario={}, actorOld, actorNew, behaviorObserver, outcomeEvaluator, maxTurns=12}) {
  const common={seed,scenario,behaviorObserver,outcomeEvaluator,maxTurns};
  const oldEpisode=await runConversation({...common,actorAdapter:actorOld,actorLabel:'OLD'});
  const newEpisode=await runConversation({...common,actorAdapter:actorNew,actorLabel:'NEW'});
  const sameInitial=JSON.stringify(oldEpisode.initial_public_profile)===JSON.stringify(newEpisode.initial_public_profile);
  return {
    state_type:'CEREBRO_HUMAN_PAIRED_REPLAY_V1', seed:String(seed), same_seed:true,
    same_initial_public_profile:sameInitial,
    real_cerebro_actor:oldEpisode.real_cerebro_actor===true&&newEpisode.real_cerebro_actor===true,
    comparable:sameInitial&&oldEpisode.turns>0&&newEpisode.turns>0,
    old:oldEpisode, new:newEpisode
  };
}
