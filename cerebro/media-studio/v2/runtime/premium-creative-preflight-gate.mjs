const PREMIUM_PROFILES=new Set(['PREMIUM_SOCIAL','PREMIUM_BRAND','PREMIUM_CINEMATIC']);
const PROHIBITED_CASTING_FIELDS=new Set(['race','ethnicity','skin_color','skin_tone','nationality_appearance','looks_spanish','spanish_looking']);
const CANARY_VOICE_PROVIDERS=new Set(['PIPER_PINNED_FALLBACK','PIPER','ESPEAK']);
const CANARY_RENDERERS=new Set(['UMS_OWNED_ASSETS_CINEMATIC_V1','UMS_OWNED_ASSETS_CANARY_V1','premium-owned-assets-renderer']);

function arr(v){return Array.isArray(v)?v:[];}
function text(v){return String(v??'').trim();}
function upper(v){return text(v).toUpperCase();}
function pushUnique(list,value){if(value&&!list.includes(value))list.push(value);}
function scanProhibitedCastingFields(value,path='creative_payload'){
  const found=[];
  if(Array.isArray(value)){
    value.forEach((item,index)=>found.push(...scanProhibitedCastingFields(item,`${path}[${index}]`)));
    return found;
  }
  if(!value||typeof value!=='object')return found;
  for(const [key,child] of Object.entries(value)){
    if(PROHIBITED_CASTING_FIELDS.has(String(key).toLowerCase()))found.push(`${path}.${key}`);
    found.push(...scanProhibitedCastingFields(child,`${path}.${key}`));
  }
  return found;
}

export function evaluatePremiumCreativePreflight(job,{capability_registry={}}={}){
  const request=job?.request??job??{};
  const payload=request.creative_payload??{};
  const profile=upper(request.quality_profile);
  const premium=PREMIUM_PROFILES.has(profile)||profile.startsWith('PREMIUM_');
  if(!premium)return Object.freeze({ok:true,status:'PASS',premium:false,issues:[],missing_capabilities:[]});

  const issues=[];
  const missing=[];
  const warnings=[];
  const brief=request.brief??{};
  const voice=payload.voice??{};
  const audio=payload.audio??{};
  const subtitles=payload.subtitles??{};
  const assets=arr(payload.assets);
  const capabilities=payload.required_capabilities??{};

  // Premium may never select the old still-image renderer as its primary execution path.
  const primaryRenderer=upper(payload.primary_renderer??capabilities.primary_renderer??'');
  if(primaryRenderer&&CANARY_RENDERERS.has(primaryRenderer))pushUnique(issues,'PREMIUM_PRIMARY_RENDERER_IS_CANARY');

  // No protected-trait inference/filtering is valid casting input. Contextual casting must use role/scene/business/geography/source metadata.
  const prohibited=scanProhibitedCastingFields(payload);
  if(prohibited.length)pushUnique(issues,'PROTECTED_TRAIT_CASTING_FIELDS_FORBIDDEN');

  // Story must be hook-led, not a long explanatory opening.
  const hook=text(brief.hook??payload.narrative?.hook);
  const hookSeconds=Number(payload.narrative?.hook_duration_sec??0);
  if(!hook)pushUnique(issues,'NARRATIVE_HOOK_REQUIRED');
  if(hookSeconds<=0||hookSeconds>2.5)pushUnique(issues,'NARRATIVE_HOOK_MUST_LAND_WITHIN_2_5S');
  if(hook.length>90)pushUnique(issues,'NARRATIVE_HOOK_TOO_LONG');

  // Every human/live asset needs contextual relevance metadata. Do not use appearance/ethnicity as a proxy.
  if(!assets.length)pushUnique(issues,'CONTEXTUAL_ASSETS_REQUIRED');
  for(const asset of assets){
    if(!text(asset.scene_role??asset.role)||!text(asset.business_context)||!text(asset.geographic_context)||!text(asset.source_rights)){
      pushUnique(issues,'ASSET_CONTEXT_METADATA_INCOMPLETE');break;
    }
    const fit=Number(asset.context_relevance_score??0);
    if(!Number.isFinite(fit)||fit<0.8){pushUnique(issues,'ASSET_CONTEXT_RELEVANCE_BELOW_0_80');break;}
    const composition=asset.composition??{};
    if(composition.target_aspect!=='9:16'||composition.subject_safe!==true||!text(composition.reframe_method)||upper(composition.reframe_method)==='CENTER_CROP'){
      pushUnique(issues,'ASSET_9_16_COMPOSITION_NOT_PROVEN');break;
    }
  }

  // Premium visual motion needs a real-motion provider. Still-derived zoom/pan may only support, never dominate.
  const visualMotion=capabilities.visual_motion??capability_registry.visual_motion??{};
  if(upper(visualMotion.status)!=='BOUND_AND_TESTED'||!['TRUE_VIDEO','GENERATIVE_VIDEO','LIVE_FOOTAGE','CHARACTER_ANIMATION','3D_ANIMATION'].includes(upper(visualMotion.class))){
    pushUnique(missing,'VISUAL_MOTION_BOUND_AND_TESTED');
  }
  const stillRatio=Number(payload.motion_plan?.still_derived_runtime_ratio??1);
  if(!Number.isFinite(stillRatio)||stillRatio>0.4)pushUnique(issues,'STILL_DERIVED_RUNTIME_EXCEEDS_40_PERCENT');
  const shotClasses=arr(payload.motion_plan?.shot_classes).map(upper).filter(Boolean);
  if(new Set(shotClasses).size<3)pushUnique(issues,'SHOT_VARIETY_MIN_3_REQUIRED');

  // Voice: Spain Spanish is necessary but not sufficient. Premium requires expressive/prosody-controlled binding.
  const voiceBinding=capabilities.voice??capability_registry.voice??{};
  const preferredProviders=arr(voice.provider_preference).map(upper);
  if(preferredProviders.some(x=>CANARY_VOICE_PROVIDERS.has(x))||CANARY_VOICE_PROVIDERS.has(upper(voiceBinding.provider)))pushUnique(issues,'CANARY_VOICE_FORBIDDEN_FOR_PREMIUM');
  if(upper(voiceBinding.status)!=='BOUND_AND_TESTED'||voiceBinding.expressive!==true||voiceBinding.prosody_control!==true||upper(voiceBinding.locale)!=='ES-ES'){
    pushUnique(missing,'EXPRESSIVE_ES_ES_VOICE_BOUND_AND_TESTED');
  }

  // Real music + sound design + ducking are mandatory for this premium social profile.
  if(audio.music_required!==true)pushUnique(issues,'MUSIC_REQUIRED_FOR_PREMIUM');
  const musicBinding=capabilities.music??capability_registry.music??{};
  if(upper(musicBinding.status)!=='BOUND_AND_TESTED'||!text(musicBinding.source_or_model)||musicBinding.rights_verified!==true)pushUnique(missing,'MUSIC_BOUND_RIGHTS_VERIFIED');
  if(audio.ducking!==true)pushUnique(issues,'VOICE_MUSIC_DUCKING_REQUIRED');
  if(!text(audio.sound_design)||upper(audio.sound_design)==='SUBTLE_CINEMATIC_TONAL_BED')pushUnique(issues,'REAL_SOUND_DESIGN_REQUIRED');

  // Subtitles need measured safe-area and styling, never plain drawtext with unmeasured line length.
  if(subtitles.enabled!==true)pushUnique(issues,'SUBTITLES_REQUIRED');
  if(Number(subtitles.horizontal_safe_margin_pct??0)<8)pushUnique(issues,'SUBTITLE_HORIZONTAL_SAFE_MARGIN_MIN_8_PERCENT');
  if(Number(subtitles.bottom_safe_margin_pct??0)<10)pushUnique(issues,'SUBTITLE_BOTTOM_SAFE_MARGIN_MIN_10_PERCENT');
  if(Number(subtitles.max_lines??99)>2)pushUnique(issues,'SUBTITLE_MAX_2_LINES');
  if(Number(subtitles.max_chars_per_line??99)>32)pushUnique(issues,'SUBTITLE_MAX_32_CHARS_PER_LINE');
  if(subtitles.measured_bbox_required!==true)pushUnique(issues,'SUBTITLE_MEASURED_BBOX_REQUIRED');
  if(!text(subtitles.style_profile)||upper(subtitles.style_profile)==='PLAIN')pushUnique(issues,'SUBTITLE_DYNAMIC_STYLE_REQUIRED');

  // Perceptual QA is required before owner review.
  const qa=payload.qa??{};
  if(qa.independent_perceptual_tribunal!==true)pushUnique(issues,'INDEPENDENT_PERCEPTUAL_TRIBUNAL_REQUIRED');
  if(Number(qa.min_sampled_frames??0)<8)pushUnique(issues,'QA_MIN_8_SAMPLED_FRAMES');
  if(qa.subtitle_bbox_validation!==true)pushUnique(issues,'QA_SUBTITLE_BBOX_VALIDATION_REQUIRED');
  if(qa.composition_validation!==true)pushUnique(issues,'QA_COMPOSITION_VALIDATION_REQUIRED');
  if(qa.audio_mix_validation!==true)pushUnique(issues,'QA_AUDIO_MIX_VALIDATION_REQUIRED');

  const status=issues.length?'CREATIVE_REJECTED_PRE_FLIGHT':missing.length?'WAITING_FOR_CAPABILITY':'PASS';
  return Object.freeze({ok:status==='PASS',status,premium:true,issues:Object.freeze(issues),missing_capabilities:Object.freeze(missing),warnings:Object.freeze(warnings),policy:Object.freeze({protected_trait_casting:'FORBIDDEN',contextual_casting:'REQUIRED',still_derived_runtime_max_ratio:0.4})});
}

export const PREMIUM_CREATIVE_PREFLIGHT_GATE_CONTRACT=Object.freeze({
  schema_version:'1.0.0',engine_id:'UMS-001',environment:'PREPROD',fail_closed:true,
  premium_primary_canary_forbidden:true,protected_trait_casting_forbidden:true,
  required_gates:Object.freeze(['NARRATIVE_HOOK','CONTEXTUAL_CASTING','TRUE_MOTION','ASPECT_SAFE_COMPOSITION','EXPRESSIVE_VOICE','MUSIC_SOUND_DUCKING','SUBTITLE_SAFE_AREA','PERCEPTUAL_QA'])
});
