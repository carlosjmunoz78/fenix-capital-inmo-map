import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluatePremiumCreativePreflight } from '../runtime/premium-creative-preflight-gate.mjs';

function rejectedTrialOrder(){return {
  quality_profile:'PREMIUM_SOCIAL',
  brief:{audience:'Compradores de vivienda'},
  creative_payload:{
    primary_renderer:'UMS_OWNED_ASSETS_CINEMATIC_V1',
    assets:[
      {role:'advisor_meeting',url:'https://fenixcapital.es/a.webp'},
      {role:'planning',url:'https://fenixcapital.es/b.webp'},
      {role:'signature',url:'https://fenixcapital.es/c.webp'},
      {role:'keys',url:'https://fenixcapital.es/d.webp'}
    ],
    voice:{provider_preference:['QWEN3_TTS_PHYSICAL_PREPROD','PIPER_PINNED_FALLBACK']},
    audio:{music_required:false,sound_design:'SUBTLE_CINEMATIC_TONAL_BED'},
    qa:{extract_review_frames:8}
  }
};}

function validPremiumOrder(){return {
  quality_profile:'PREMIUM_SOCIAL',
  brief:{hook:'Tu hipoteca puede estar mejor preparada de lo que crees.'},
  creative_payload:{
    primary_renderer:'UMS_PREMIUM_PIPELINE_V2',
    narrative:{hook:'Tu hipoteca puede estar mejor preparada de lo que crees.',hook_duration_sec:1.8},
    assets:[0,1,2,3].map(i=>({
      role:['advisor','planning','signature','keys'][i],scene_role:['advisor','planning','signature','keys'][i],
      business_context:'mortgage_advisory',geographic_context:'Cordoba, ES',source_rights:'FENIX_OWNED_OR_LICENSED',context_relevance_score:0.95,
      composition:{target_aspect:'9:16',subject_safe:true,reframe_method:'SUBJECT_AWARE_REFRAME'}
    })),
    motion_plan:{still_derived_runtime_ratio:0.2,shot_classes:['LIVE_FOOTAGE','GENERATIVE_VIDEO','CAMERA_MOVE']},
    voice:{provider_preference:['EXPRESSIVE_LOCAL_TTS']},
    audio:{music_required:true,sound_design:'CINEMATIC_SOUND_DESIGN',ducking:true},
    subtitles:{enabled:true,horizontal_safe_margin_pct:10,bottom_safe_margin_pct:12,max_lines:2,max_chars_per_line:28,measured_bbox_required:true,style_profile:'DYNAMIC_BRAND_CAPTIONS'},
    qa:{independent_perceptual_tribunal:true,min_sampled_frames:12,subtitle_bbox_validation:true,composition_validation:true,audio_mix_validation:true},
    required_capabilities:{
      visual_motion:{status:'BOUND_AND_TESTED',class:'GENERATIVE_VIDEO'},
      voice:{status:'BOUND_AND_TESTED',provider:'EXPRESSIVE_LOCAL_TTS',expressive:true,prosody_control:true,locale:'es-ES'},
      music:{status:'BOUND_AND_TESTED',source_or_model:'ORIGINAL_OR_LICENSED_TRACK',rights_verified:true}
    }
  }
};}

test('rejected PowerPoint-like owner trial can never pass premium preflight',()=>{
  const result=evaluatePremiumCreativePreflight(rejectedTrialOrder());
  assert.equal(result.ok,false);
  assert.equal(result.status,'CREATIVE_REJECTED_PRE_FLIGHT');
  for(const issue of ['PREMIUM_PRIMARY_RENDERER_IS_CANARY','NARRATIVE_HOOK_REQUIRED','ASSET_CONTEXT_METADATA_INCOMPLETE','STILL_DERIVED_RUNTIME_EXCEEDS_40_PERCENT','CANARY_VOICE_FORBIDDEN_FOR_PREMIUM','MUSIC_REQUIRED_FOR_PREMIUM','SUBTITLES_REQUIRED','INDEPENDENT_PERCEPTUAL_TRIBUNAL_REQUIRED'])assert.ok(result.issues.includes(issue),issue);
});

test('premium order waits rather than falling back when physical capabilities are missing',()=>{
  const order=validPremiumOrder();
  delete order.creative_payload.required_capabilities;
  const result=evaluatePremiumCreativePreflight(order);
  assert.equal(result.ok,false);
  assert.equal(result.status,'WAITING_FOR_CAPABILITY');
  assert.deepEqual(new Set(result.missing_capabilities),new Set(['VISUAL_MOTION_BOUND_AND_TESTED','EXPRESSIVE_ES_ES_VOICE_BOUND_AND_TESTED','MUSIC_BOUND_RIGHTS_VERIFIED']));
});

test('contextual casting rejects protected-trait filtering inputs',()=>{
  const order=validPremiumOrder();
  order.creative_payload.casting={race:'white',looks_spanish:true};
  const result=evaluatePremiumCreativePreflight(order);
  assert.equal(result.ok,false);
  assert.equal(result.status,'CREATIVE_REJECTED_PRE_FLIGHT');
  assert.ok(result.issues.includes('PROTECTED_TRAIT_CASTING_FIELDS_FORBIDDEN'));
});

test('fully evidenced premium contract may pass preflight',()=>{
  const result=evaluatePremiumCreativePreflight(validPremiumOrder());
  assert.equal(result.status,'PASS');
  assert.equal(result.ok,true);
});
