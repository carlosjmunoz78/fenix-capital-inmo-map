function norm(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}

export function episodeMetrics(episode){
  const transcript=Array.isArray(episode?.transcript)?episode.transcript:[];
  const actorTurns=transcript.filter(t=>typeof t?.actor==='string'&&t.actor.trim());
  let duplicates=0;
  for(let i=1;i<actorTurns.length;i++) if(norm(actorTurns[i].actor)===norm(actorTurns[i-1].actor)) duplicates++;
  const eventCounts={};
  for(const turn of transcript){
    const event=String(turn?.observed_event??'');
    if(event) eventCounts[event]=(eventCounts[event]??0)+1;
  }
  const humanTexts=transcript.map(t=>String(t?.human??''));
  const ontologyLabels=['UNSTATED_CONSTRAINT','PRIOR_BAD_EXPERIENCE','MISSING_DOCUMENT','CONFLICTING_COMMITMENT','UNDECLARED_FINANCIAL_OBLIGATION','PRIVATE_DECISION_CRITERION','THIRD_PARTY_DEPENDENCY','PREVIOUS_CONTRADICTORY_ADVICE'];
  const ontologyLeaks=humanTexts.filter(text=>ontologyLabels.some(label=>text.includes(label))).length;
  const revealedUnique=new Set(transcript.flatMap(t=>Array.isArray(t?.revealed_facts)?t.revealed_facts.map(f=>String(f?.fact_id??f?.type??'')):[]).filter(Boolean));
  return {
    turns:transcript.length,
    actor_turns:actorTurns.length,
    verified_real_actor:episode?.real_cerebro_actor===true,
    duplicate_consecutive_actor_replies:duplicates,
    duplicate_reply_rate:actorTurns.length>1?Number((duplicates/(actorTurns.length-1)).toFixed(4)):0,
    useful_question_count:eventCounts.USEFUL_QUESTION??0,
    ignored_concern_count:eventCounts.IGNORED_CONCERN??0,
    grounding_count:eventCounts.GROUNDING_CONFIRMATION??0,
    clear_explanation_count:eventCounts.CLEAR_PROPORTIONATE_EXPLANATION??0,
    excessive_detail_count:eventCounts.EXCESSIVE_DETAIL??0,
    false_certainty_count:eventCounts.FALSE_CERTAINTY??0,
    pressure_count:eventCounts.UNNECESSARY_PRESSURE??0,
    respectful_boundary_count:eventCounts.RESPECTFUL_BOUNDARY??0,
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
    hidden_facts_revealed_total:sum('hidden_facts_revealed'),
    ontology_leaks_total:sum('ontology_leaks'),
    actor_errors_total:sum('actor_errors'),
    completion_reasons:completion,
    per_episode:perEpisode,
    safety:{prod_write_authorized:false,prod_execution_enabled:false,customer_data:false,trading_access:false,additional_cost_eur:0}
  };
}
