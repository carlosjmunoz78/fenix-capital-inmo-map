import { assertCharacterContinuityEvidenceV1 } from './creative-character-bible-v1.mjs';

function arr(v){return Array.isArray(v)?v:[]}
function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function n(v,f=0){const x=Number(v);return Number.isFinite(x)?x:f}
function fail(code,detail){return {code,detail}}
function text(s){return String(s||'')}
function numericDensity(plan){const scenes=arr(plan.scenes);if(!scenes.length)return 0;const hits=scenes.filter(s=>/\b\d+(?:[.,]\d+)?%?\b/.test([s.headline,s.subheadline,s.metric,s.metric_label].filter(Boolean).join(' '))).length;return hits/scenes.length}

const REQUIRED_EXPERTS=new Set(['SHOWRUNNER','SOCIAL_STRATEGIST','SCREENWRITER','CREATIVE_DIRECTOR','ART_DIRECTOR','CASTING_CONTINUITY_DIRECTOR','PERFORMANCE_DIRECTOR','DIRECTOR_OF_PHOTOGRAPHY','EDITOR','MOTION_VFX_DIRECTOR','VOICE_DIRECTOR','SOUND_DESIGNER','BRAND_GUARDIAN','RETENTION_EDITOR','CHANNEL_EDITOR','CREATIVE_CRITIC']);

export function evaluateCreativeStudioV1(input={}){
  const production=obj(input.production||input),physical=obj(input.physical_evidence||{}),plan=obj(production.selected_plan),characterBible=obj(plan.character_bible||production.character_bible),failures=[],warnings=[];
  const experts=arr(production.experts).map(x=>String(obj(x).id||'')),decisions=arr(production.expert_decisions),passes=arr(production.production_passes),candidates=arr(production.candidates),rejected=arr(production.rejected_candidates),scenes=arr(plan.scenes),blocks=arr(plan.narration_blocks);
  for(const id of REQUIRED_EXPERTS)if(!experts.includes(id))failures.push(fail('STUDIO_EXPERT_MISSING',id));
  if(production.studio_mode!=='CEREBRO_STUDIO_GRADE')failures.push(fail('STUDIO_MODE_REQUIRED','CEREBRO_STUDIO_GRADE'));
  if(production.autonomous!==true)failures.push(fail('AUTONOMY_REQUIRED','Production must self-orchestrate ordinary creative work'));
  if(production.publish_authorized!==false||plan.publish_authorized!==false)failures.push(fail('PUBLISH_AUTHORITY_MUST_BE_FALSE','Studio creates; publication remains separately governed'));
  if(n(production.additional_cost_eur)!==0||n(plan.additional_cost_eur)!==0)failures.push(fail('MONEY_LIMIT','Studio V1 default must add 0 EUR recurring cost'));
  if(candidates.length<3)failures.push(fail('MULTI_CANDIDATE_REQUIRED',`${candidates.length}<3`));
  if(!production.selected_candidate_id||!candidates.some(x=>obj(x).id===production.selected_candidate_id))failures.push(fail('SELECTED_CANDIDATE_INVALID',String(production.selected_candidate_id||'')));
  if(rejected.length<2)failures.push(fail('CREATIVE_COMPARISON_REQUIRED','At least two alternatives must be explicitly rejected with reason'));
  if(n(production.iteration_count)<3)failures.push(fail('REWORK_PASSES_TOO_LOW',String(production.iteration_count)));
  if(decisions.length<REQUIRED_EXPERTS.size)failures.push(fail('EXPERT_DECISIONS_INCOMPLETE',`${decisions.length}/${REQUIRED_EXPERTS.size}`));
  if(passes.length<9)failures.push(fail('PRODUCTION_PIPELINE_INCOMPLETE',String(passes.length)));
  if(passes.some(x=>!['GREEN_CANDIDATE','PENDING_PHYSICAL','GREEN'].includes(String(obj(x).status))))failures.push(fail('PRODUCTION_PASS_RED','One or more production passes are not candidate-green'));
  if(plan.social_narrative!==true)failures.push(fail('SOCIAL_NATIVE_DIRECTION_REQUIRED','Selected plan must be narrative-first'));
  const arc=arr(plan.social_arc).map(x=>String(x).toUpperCase());for(const beat of ['HOOK','TENSION','PAYOFF','CTA'])if(!arc.includes(beat))failures.push(fail('STUDIO_ARC_INCOMPLETE',beat));
  if(n(plan.hook_within_sec,99)>.8)failures.push(fail('STUDIO_HOOK_TOO_LATE',String(plan.hook_within_sec)));
  if(String(plan.voice_style||'')!=='SOCIAL_ENERGETIC')failures.push(fail('STUDIO_VOICE_DIRECTION_REQUIRED',String(plan.voice_style||'')));
  if(scenes.length<5)failures.push(fail('STUDIO_SCENES_TOO_LOW',String(scenes.length)));
  const blockRatio=scenes.length?blocks.length/scenes.length:1;if(blockRatio>.60)failures.push(fail('STUDIO_TELEGRAM_RISK',blockRatio.toFixed(2)));
  const numberRatio=numericDensity(plan);if(numberRatio>.20)failures.push(fail('STUDIO_TRAINING_TONE_RISK',numberRatio.toFixed(2)));
  if(arr(plan.director_notes).length<6)failures.push(fail('DIRECTOR_NOTES_REQUIRED','Need explicit creative, continuity and performance direction constraints'));
  const concept=text(plan.creative_concept).toUpperCase();if(!concept||/TRAINING|CHECKLIST|LESSON/.test(concept))failures.push(fail('STUDIO_CONCEPT_NOT_SOCIAL',concept));
  if(!characterBible.mode||!arr(characterBible.characters).length)failures.push(fail('CHARACTER_BIBLE_REQUIRED','Recurring cast/presenter identity must be defined'));
  if(characterBible.same_character_across_scenes!==true)failures.push(fail('CHARACTER_CONTINUITY_REQUIRED','Primary identity must persist across relevant shots'));
  if(characterBible.same_core_cast_across_formats!==true)failures.push(fail('CROSS_FORMAT_CAST_CONTINUITY_REQUIRED','Core cast should persist across campaign formats'));

  if(Object.keys(physical).length){
    if(physical.continuous_narration!==true)failures.push(fail('PHYSICAL_CONTINUOUS_NARRATION_REQUIRED','Voice must cross cuts'));
    if(physical.scene_locked_narration===true)failures.push(fail('PHYSICAL_TELEGRAM_REJECTED','Narration cannot be locked one phrase per shot'));
    if(physical.audio_coverage_ratio!==undefined&&n(physical.audio_coverage_ratio)<.98)failures.push(fail('PHYSICAL_AUDIO_COVERAGE_LOW',String(physical.audio_coverage_ratio)));
    if(physical.sfx_peak_db!==undefined&&n(physical.sfx_peak_db,-99)<-16)failures.push(fail('PHYSICAL_SFX_TOO_QUIET',`${physical.sfx_peak_db}dB`));
    if(physical.repetitive_full_frame_sweeps===true)failures.push(fail('PHYSICAL_REPETITIVE_EFFECT_REJECTED','Repeated slash/sweep pattern'));
    if(physical.fast_transition_accents===false)failures.push(fail('PHYSICAL_TRANSITIONS_TOO_SLOW','Social accents must be fast'));
    if(physical.live_action_seconds_ratio!==undefined&&n(physical.live_action_seconds_ratio)<.62)failures.push(fail('PHYSICAL_LIVE_ACTION_LOW',String(physical.live_action_seconds_ratio)));
    if(physical.unique_frame_ratio!==undefined&&n(physical.unique_frame_ratio)<.55)failures.push(fail('PHYSICAL_VISUAL_VARIATION_LOW',String(physical.unique_frame_ratio)));
    if(physical.motion_score!==undefined&&n(physical.motion_score)<.40)failures.push(fail('PHYSICAL_MOTION_LOW',String(physical.motion_score)));
    if(physical.voice_wpm!==undefined&&(n(physical.voice_wpm)<145||n(physical.voice_wpm)>190))failures.push(fail('PHYSICAL_VOICE_TEMPO_WRONG',String(physical.voice_wpm)));
    try{assertCharacterContinuityEvidenceV1({character_bible:characterBible,evidence:physical.character_continuity||physical})}catch(e){for(const code of arr(e.failures))failures.push(fail(`PHYSICAL_${code}`,'Character/presenter continuity evidence failed'))}
  } else warnings.push(fail('PHYSICAL_REVIEW_PENDING','Architecture is candidate-green; physical render still required'));

  const scores={departments:experts.length>=16?16:4,candidates:candidates.length>=3?14:4,direction:plan.social_narrative&&arc.includes('PAYOFF')?16:5,editing:blockRatio<=.60?14:5,voice:String(plan.voice_style)==='SOCIAL_ENERGETIC'?12:4,sound:Object.keys(physical).length?(n(physical.sfx_peak_db,-99)>=-16?12:4):8,visual:Object.keys(physical).length?(n(physical.unique_frame_ratio,0)>=.55?10:4):7,critique:rejected.length>=2&&n(production.iteration_count)>=3?6:2};
  const score=Object.values(scores).reduce((a,b)=>a+b,0),hard_fail=failures.length>0,passed=!hard_fail&&score>=88;
  return Object.freeze({schema_version:'1.1.0',passed,hard_fail,score,scores,failures,warnings,expert_count:experts.length,candidate_count:candidates.length,narration_block_ratio:Number(blockRatio.toFixed(3)),numeric_scene_ratio:Number(numberRatio.toFixed(3)),character_mode:characterBible.mode||null,verdict:passed?'STUDIO_QA_GREEN':'STUDIO_QA_REJECTED'});
}

export function assertCreativeStudioV1(input){const r=evaluateCreativeStudioV1(input);if(!r.passed){const e=new Error(`STUDIO_QA_REJECTED:${r.failures.map(x=>x.code).join(',')||`SCORE_${r.score}`}`);e.tribunal=r;throw e}return r}

export const CREATIVE_STUDIO_TRIBUNAL_V1_CONTRACT=Object.freeze({schema_version:'1.1.0',owner_engine:'CREATIVE-STUDIO-001',minimum_score:88,expert_departments:16,multi_candidate_required:true,rework_iterations_required:3,rejects_training_tone:true,rejects_telegram_voice:true,rejects_repetitive_effects:true,requires_character_bible:true,requires_physical_character_continuity:true,requires_presenter_consistency_when_applicable:true,requires_physical_audio:true,requires_audible_sfx:true,requires_live_action:true,requires_social_native_direction:true,publication_authority:false,additional_cost_eur:0});
