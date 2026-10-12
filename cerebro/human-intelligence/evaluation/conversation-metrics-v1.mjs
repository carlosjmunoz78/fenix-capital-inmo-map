import { observeActorSignals } from './behavior-observer-v1.mjs';

function norm(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}

export function episodeMetrics(episode){
  const transcript=Array.isArray(episode?.transcript)?episode.transcript:[];
  const actorTurns=transcript.filter(t=>typeof t?.actor==='string'&&t.actor.trim());
  let duplicates=0;
  for(let i=1;i<actorTurns.length;i++) if(norm(actorTurns[i].actor)===norm(actorTurns[i-1].actor)) duplicates++;
  const eventCounts={};
  const signalCounts={
    asks_question:0,grounding:0,clear_explanation:0,ignores_concern:0,human_concern:0,
    acknowledges_concern:0,question_budget_ok:0,repair_repetition:0,respectful_boundary:0,
    false_certainty:0,unnecessary_pressure:0,excessive_detail:0,repeated_exact:0
  };
  for(let index=0;index<transcript.length;index++){
    const turn=transcript[index];
    const event=String(turn?.observed_event??'');
    if(event) eventCounts[event]=(eventCounts[event]??0)+1;
    if(typeof turn?.actor==='string'&&turn.actor.trim()){
      const s=observeActorSignals({actor_text:turn.actor,human_message:turn.human,history:transcript.slice(0,index)});
      for(const key of Object.keys(signalCounts)) if(s[key]===true) signalCounts[key]++;
    }
  }
  const humanTexts=transcript.map(t=>String(t?.human??''));
  const ontologyLabels=['UNSTATED_CONSTRAINT','PRIOR_BAD_EXPERIENCE','MISSING_DOCUMENT','CONFLICTING_COMMITMENT','UNDECLARED_FINANCIAL_OBLIGATION','PRIVATE_DECISION_CRITERION','THIRD_PARTY_DEPENDENCY','PREVIOUS_CONTRADICTORY_ADVICE'];
  const ontologyLeaks=humanTexts.filter(text=>ontologyLabels.some(label=>text.includes(label))).length;
  const revealedUnique=new Set(transcript.flatMap(t=>Array.isArray(t?.revealed_facts)?t.revealed_facts.map(f=>String(f?.fact_id??f?.type??'')):[]).filter(Boolean));
  const actorCount=actorTurns.length;
  return {
    turns:transcript.length,
    actor_turns:actorCount,
    verified_real_actor:episode?.real_cerebro_actor===true,
    duplicate_consecutive_actor_replies:duplicates,
    duplicate_reply_rate:actorCount>1?Number((duplicates/(actorCount-1)).toFixed(4)):0,
    useful_question_count:eventCounts.USEFUL_QUESTION??0,
    ignored_concern_count:eventCounts.IGNORED_CONCERN??0,
    grounding_count:eventCounts.GROUNDING_CONFIRMATION??0,
    clear_explanation_count:eventCounts.CLEAR_PROPORTIONATE_EXPLANATION??0,
    excessive_detail_count:eventCounts.EXCESSIVE_DETAIL??0,
    false_certainty_count:eventCounts.FALSE_CERTAINTY??0,
    pressure_count:eventCounts.UNNECESSARY_PRESSURE??0,
    respectful_boundary_count:eventCounts.RESPECTFUL_BOUNDARY??0,
    signal_question_turns:signalCounts.asks_question,
    signal_grounding_turns:signalCounts.grounding,
    signal_clear_explanation_turns:signalCounts.clear_explanation,
    signal_ignored_concern_turns:signalCounts.ignores_concern,
    signal_human_concern_turns:signalCounts.human_concern,
    signal_acknowledged_concern_turns:signalCounts.acknowledges_concern,
    signal_question_budget_ok_turns:signalCounts.question_budget_ok,
    signal_repair_repetition_turns:signalCounts.repair_repetition,
    signal_respectful_boundary_turns:signalCounts.respectful_boundary,
    signal_false_certainty_turns:signalCounts.false_certainty,
    signal_unnecessary_pressure_turns:signalCounts.unnecessary_pressure,
    signal_excessive_detail_turns:signalCounts.excessive_detail,
    signal_repeated_exact_turns:signalCounts.repeated_exact,
    hidden_facts_revealed:revealedUnique.size,
    ontology_leaks:ontologyLeaks,
    actor_errors:transcript.filter(t=>t?.actor_error).length,
    completion_reason:String(episode?.completion_reason??'UNKNOWN')
  };
}

export function aggregateConversationMetrics(episodes,{baselineLabel='OLD'}={}){
  if(!Array.isArray(episodes)||episodes.length===0) throw new Error('episodes_required');
  const perEpisode=episodes.map((episode,index)=>({index,...episodeMetrics(episode)}));
  const sum=key=>perEpisode.reduce((n,item)=>n+Number(item[key]??0),0);
  const totalActorTurns=sum('actor_turns');
  const duplicateDenominator=perEpisode.reduce((n,item)=>n+Math.max(0,item.actor_turns-1),0);
  const verified=perEpisode.filter(item=>item.verified_real_actor).length;
  const concernTurns=sum('signal_human_concern_turns');
  const completion={};
  for(const item of perEpisode) completion[item.completion_reason]=(completion[item.completion_reason]??0)+1;
  return {
    state_type:'CEREBRO_CONVERSATION_BASELINE_METRICS_V1',
    baseline_label:baselineLabel,
    episodes_total:episodes.length,
    episodes_verified_real_actor:verified,
    verified_real_actor_rate:Number((verified/episodes.length).toFixed(4)),
    actor_turns_total:totalActorTurns,
    duplicate_consecutive_actor_replies:sum('duplicate_consecutive_actor_replies'),
    duplicate_reply_rate:duplicateDenominator?Number((sum('duplicate_consecutive_actor_replies')/duplicateDenominator).toFixed(4)):0,
    useful_question_rate:totalActorTurns?Number((sum('useful_question_count')/totalActorTurns).toFixed(4)):0,
    ignored_concern_rate:totalActorTurns?Number((sum('ignored_concern_count')/totalActorTurns).toFixed(4)):0,
    grounding_rate:totalActorTurns?Number((sum('grounding_count')/totalActorTurns).toFixed(4)):0,
    clear_explanation_rate:totalActorTurns?Number((sum('clear_explanation_count')/totalActorTurns).toFixed(4)):0,
    excessive_detail_rate:totalActorTurns?Number((sum('excessive_detail_count')/totalActorTurns).toFixed(4)):0,
    false_certainty_rate:totalActorTurns?Number((sum('false_certainty_count')/totalActorTurns).toFixed(4)):0,
    unnecessary_pressure_rate:totalActorTurns?Number((sum('pressure_count')/totalActorTurns).toFixed(4)):0,
    respectful_boundary_rate:totalActorTurns?Number((sum('respectful_boundary_count')/totalActorTurns).toFixed(4)):0,
    signal_question_rate:totalActorTurns?Number((sum('signal_question_turns')/totalActorTurns).toFixed(4)):0,
    signal_grounding_rate:totalActorTurns?Number((sum('signal_grounding_turns')/totalActorTurns).toFixed(4)):0,
    signal_clear_explanation_rate:totalActorTurns?Number((sum('signal_clear_explanation_turns')/totalActorTurns).toFixed(4)):0,
    signal_ignored_concern_rate:totalActorTurns?Number((sum('signal_ignored_concern_turns')/totalActorTurns).toFixed(4)):0,
    signal_human_concern_turns:concernTurns,
    signal_acknowledged_concern_rate:concernTurns?Number((sum('signal_acknowledged_concern_turns')/concernTurns).toFixed(4)):1,
    signal_question_budget_ok_rate:totalActorTurns?Number((sum('signal_question_budget_ok_turns')/totalActorTurns).toFixed(4)):0,
    signal_repair_repetition_rate:totalActorTurns?Number((sum('signal_repair_repetition_turns')/totalActorTurns).toFixed(4)):0,
    signal_respectful_boundary_rate:totalActorTurns?Number((sum('signal_respectful_boundary_turns')/totalActorTurns).toFixed(4)):0,
    signal_false_certainty_rate:totalActorTurns?Number((sum('signal_false_certainty_turns')/totalActorTurns).toFixed(4)):0,
    signal_unnecessary_pressure_rate:totalActorTurns?Number((sum('signal_unnecessary_pressure_turns')/totalActorTurns).toFixed(4)):0,
    signal_excessive_detail_rate:totalActorTurns?Number((sum('signal_excessive_detail_turns')/totalActorTurns).toFixed(4)):0,
    signal_repeated_exact_rate:totalActorTurns?Number((sum('signal_repeated_exact_turns')/totalActorTurns).toFixed(4)):0,
    hidden_facts_revealed_total:sum('hidden_facts_revealed'),
    ontology_leaks_total:sum('ontology_leaks'),
    actor_errors_total:sum('actor_errors'),
    completion_reasons:completion,
    per_episode:perEpisode,
    safety:{prod_write_authorized:false,prod_execution_enabled:false,customer_data:false,trading_access:false,additional_cost_eur:0}
  };
}
