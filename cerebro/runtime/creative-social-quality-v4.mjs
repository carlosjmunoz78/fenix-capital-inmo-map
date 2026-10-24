function arr(v){return Array.isArray(v)?v:[]}
function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function n(v,f=0){const x=Number(v);return Number.isFinite(x)?x:f}
function fail(code,detail){return {code,detail}}
function textOf(s){const x=obj(s);return [x.headline,x.subheadline,x.voiceover,x.metric,x.metric_label].filter(Boolean).join(' ')}

export function evaluateCreativeSocialV4(input={}){
  const plan=obj(input.plan||input),evidence=obj(input.physical_evidence||plan.physical_evidence),scenes=arr(plan.scenes),blocks=arr(plan.narration_blocks),output=String(plan.output_type||'').toUpperCase(),channel=String(plan.channel||'').toUpperCase();
  const social=['INSTAGRAM','FACEBOOK'].includes(channel)&&['REEL','SHORT_VIDEO','STORY_VIDEO','LONG_VIDEO','LANDSCAPE_VIDEO'].includes(output),failures=[],warnings=[];
  if(!social)return Object.freeze({schema_version:'4.0.0',passed:true,hard_fail:false,score:100,failures,warnings,verdict:'SOCIAL_QA_NOT_APPLICABLE'});
  if(plan.social_narrative!==true)failures.push(fail('SOCIAL_NARRATIVE_REQUIRED','Social video must use narrative-first direction'));
  if(n(plan.hook_within_sec,99)>1.2)failures.push(fail('SOCIAL_HOOK_TOO_LATE',String(plan.hook_within_sec)));
  const arc=arr(plan.social_arc).map(x=>String(x).toUpperCase());for(const beat of ['HOOK','TENSION','PAYOFF','CTA'])if(!arc.includes(beat))failures.push(fail('SOCIAL_ARC_INCOMPLETE',beat));
  if(String(plan.voice_style||'').toUpperCase()!=='SOCIAL_ENERGETIC')failures.push(fail('SOCIAL_VOICE_STYLE_REQUIRED','SOCIAL_ENERGETIC'));
  const blockRatio=scenes.length?blocks.length/scenes.length:1;if(blocks.length<2)failures.push(fail('SOCIAL_NARRATION_TOO_FRAGMENTED_OR_EMPTY','Need 2+ narrative blocks'));if(blockRatio>.66)failures.push(fail('TELEGRAM_NARRATION_REJECTED',`${blocks.length}/${scenes.length}`));
  const numericScenes=scenes.filter(s=>/\b\d+(?:[.,]\d+)?%?\b/.test(textOf(s))||String(obj(s).metric||'').trim()!=='').length,numericRatio=scenes.length?numericScenes/scenes.length:0;if(numericRatio>.30)failures.push(fail('SOCIAL_NUMBER_DENSITY_TOO_HIGH',numericRatio.toFixed(2)));
  if(evidence.continuous_narration!==true)failures.push(fail('CONTINUOUS_NARRATION_REQUIRED','Voice must flow independently of scene cuts'));
  if(evidence.scene_locked_narration===true)failures.push(fail('SCENE_LOCKED_NARRATION_REJECTED','One phrase per shot creates telegram pacing'));
  const minVoiceCoverage=output==='LONG_VIDEO'?.42:.52;if(evidence.voice_coverage_ratio!==undefined&&n(evidence.voice_coverage_ratio)<minVoiceCoverage)failures.push(fail('SOCIAL_VOICE_COVERAGE_TOO_LOW',`${evidence.voice_coverage_ratio}<${minVoiceCoverage}`));
  if(evidence.max_voice_gap_sec!==undefined&&n(evidence.max_voice_gap_sec)>2.4)failures.push(fail('SOCIAL_VOICE_GAP_TOO_LONG',String(evidence.max_voice_gap_sec)));
  if(evidence.voice_wpm!==undefined&&(n(evidence.voice_wpm)<135||n(evidence.voice_wpm)>195))failures.push(fail('SOCIAL_VOICE_TEMPO_OUTSIDE_RANGE',String(evidence.voice_wpm)));
  if(evidence.sfx_peak_db!==undefined&&n(evidence.sfx_peak_db,-99)<-18)failures.push(fail('SOCIAL_SFX_NOT_AUDIBLE',`${evidence.sfx_peak_db}dB`));
  if(evidence.sfx_event_count!==undefined&&n(evidence.sfx_event_count)<Math.max(3,Math.ceil(scenes.length*.6)))failures.push(fail('SOCIAL_SFX_DENSITY_TOO_LOW',String(evidence.sfx_event_count)));
  if(evidence.fast_transition_accents===false)failures.push(fail('SOCIAL_TRANSITION_ACCENTS_TOO_SLOW','Fast accents required'));
  if(evidence.repetitive_full_frame_sweeps===true)failures.push(fail('REPETITIVE_SLASH_EFFECT_REJECTED','Do not repeat the same sweep every scene'));
  const scores={hook:plan.hook_within_sec<=1.2?18:4,narrative:plan.social_narrative?18:5,voice:evidence.continuous_narration&&n(evidence.voice_wpm)>=135?18:6,sound:n(evidence.sfx_peak_db,-99)>=-18?16:5,visual:evidence.fast_transition_accents!==false?14:5,channel:16};const score=Object.values(scores).reduce((a,b)=>a+b,0),hard_fail=failures.length>0,passed=!hard_fail&&score>=88;
  return Object.freeze({schema_version:'4.0.0',passed,hard_fail,score,scores,failures,warnings,numeric_scene_ratio:Number(numericRatio.toFixed(3)),narration_block_ratio:Number(blockRatio.toFixed(3)),verdict:passed?'SOCIAL_QA_GREEN':'SOCIAL_QA_REJECTED'});
}
export function assertCreativeSocialV4(input){const r=evaluateCreativeSocialV4(input);if(!r.passed){const e=new Error(`SOCIAL_QA_REJECTED:${r.failures.map(x=>x.code).join(',')||`SCORE_${r.score}`}`);e.tribunal=r;throw e}return r}
export const CREATIVE_SOCIAL_QUALITY_V4_CONTRACT=Object.freeze({schema_version:'4.0.0',owner_engine:'SOC-001',social_first:true,rejects_telegram_voice:true,rejects_training_tone_number_density:true,requires_hook_under_1_2s:true,requires_continuous_narration:true,requires_audible_sfx:true,requires_hook_tension_payoff_cta:true,publication_authority:false,additional_cost_eur:0});
