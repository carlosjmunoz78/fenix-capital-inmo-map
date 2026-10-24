import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCreativePlanV2, assertCreativePlanV2, CREATIVE_QUALITY_TRIBUNAL_V2_CONTRACT } from '../runtime/creative-quality-tribunal-v2.mjs';

const logo='https://fenixcapital.es/wp-content/uploads/2026/10/Logo-Fenix-Capital-oficial-color-completo-scaled-1.png';
const photos=[
  'https://fenixcapital.es/wp-content/uploads/2026/10/Fenix-C2B7-Pareja-haciendo-numeros-para-comprar-vivienda-cerebro.webp',
  'https://fenixcapital.es/wp-content/uploads/2026/10/cadiz-revision-vivienda-asesor-scaled-1-cerebro.webp',
  'https://fenixcapital.es/wp-content/uploads/2026/10/cadiz-firma-documentos-vivienda-scaled-1-cerebro.webp',
  'https://fenixcapital.es/wp-content/uploads/2026/10/huelva-llaves-compra-vivienda-scaled-1-cerebro.webp'
];
const vids=['PEXELS:7817205','PEXELS:7816382','PEXELS:7646690','PEXELS:7735853','PEXELS:7646396'];

function richVideo(output='REEL'){
  const long=output==='LONG_VIDEO';
  const sceneCount=long?12:6;
  const durations=long?4.5:3;
  const sceneChanges=sceneCount-1;
  const duration=long?49.95:15.25;
  return {
    output_type:output,channel:'INSTAGRAM',publish_authorized:false,additional_cost_eur:0,
    video_mode:'LIVE_ACTION_MIXED',creative_concept:'De la duda a la decisión: compra con método y claridad.',
    channel_fit:true,accessibility_checked:true,visual_style:'PHOTO',layer_count:10,
    brand:{logo_url:logo,primary:'#ffffff',accent:'#f47b20'},visual_sources:photos,
    video_sources:long?vids:vids.slice(0,4),
    scenes:Array.from({length:sceneCount},(_,i)=>({id:i+1,duration_sec:durations,source_kind:i%3===1?'PHOTO':'VIDEO',video_source:vids[i%vids.length]})),
    motion_profiles:['KEN_BURNS_IN','PAN_RIGHT','PUSH_IN','PAN_LEFT'],
    transitions:['CROSSFADE','DIP_TO_BLACK','ZOOM_CUT','WIPE'],motion_design:true,broll_required:true,scene_text_only_ratio:0,
    audio:{voice_enabled:true,music_enabled:true,ducking:true,captions:true},
    physical_evidence:{audio_stream_present:true,audio_coverage_ratio:1,voice_segment_count:sceneCount,max_voice_speedup:1.05,transition_sfx_count:sceneCount-1,scene_change_count:sceneChanges,video_duration_sec:duration,motion_score:.82,unique_frame_ratio:.94,live_action_seconds_ratio:long?.67:.72,live_action_source_count:long?5:4}
  };
}

test('quality contract is fail-closed and requires pacing/audio completeness',()=>{
  assert.equal(CREATIVE_QUALITY_TRIBUNAL_V2_CONTRACT.hard_fail_closed,true);
  assert.equal(CREATIVE_QUALITY_TRIBUNAL_V2_CONTRACT.rejects_powerpoint_like_video,true);
  assert.equal(CREATIVE_QUALITY_TRIBUNAL_V2_CONTRACT.requires_edit_density,true);
  assert.equal(CREATIVE_QUALITY_TRIBUNAL_V2_CONTRACT.requires_full_audio_coverage,true);
  assert.equal(CREATIVE_QUALITY_TRIBUNAL_V2_CONTRACT.requires_scene_synced_voice,true);
  assert.equal(CREATIVE_QUALITY_TRIBUNAL_V2_CONTRACT.publication_authority,false);
});

test('previous slow reel pattern is rejected even with live action',()=>{
  const p=richVideo('REEL');
  p.scenes=p.scenes.slice(0,4).map(s=>({...s,duration_sec:5}));
  p.video_sources=p.video_sources.slice(0,3);
  p.physical_evidence={...p.physical_evidence,scene_change_count:3,video_duration_sec:18.35,voice_segment_count:4,transition_sfx_count:3};
  const r=evaluateCreativePlanV2(p);
  assert.equal(r.passed,false);
  const codes=r.failures.map(x=>x.code);
  assert.ok(codes.includes('VIDEO_SCENE_COUNT_TOO_LOW')||codes.includes('EDIT_PACING_TOO_SLOW'));
  assert.ok(codes.includes('EDIT_DENSITY_TOO_LOW'));
});

test('audio ending before video is a hard reject',()=>{
  const p=richVideo('LONG_VIDEO');
  p.physical_evidence={...p.physical_evidence,audio_coverage_ratio:.72};
  assert.throws(()=>assertCreativePlanV2(p),/AUDIO_COVERAGE_INCOMPLETE/);
});

test('scene-synced voice coverage is required',()=>{
  const p=richVideo('REEL');
  p.physical_evidence={...p.physical_evidence,voice_segment_count:2};
  assert.throws(()=>assertCreativePlanV2(p),/VOICE_SCENE_SYNC_TOO_LOW/);
});

test('professional live-action reel passes hardened gate',()=>{
  const r=assertCreativePlanV2(richVideo('REEL'));
  assert.equal(r.verdict,'CREATIVE_QA_GREEN');
  assert.ok(r.score>=88);
});

test('professional long video requires five governed live-action sources',()=>{
  const p=richVideo('LONG_VIDEO');
  assert.equal(assertCreativePlanV2(p).passed,true);
  const bad={...p,video_sources:p.video_sources.slice(0,4),physical_evidence:{...p.physical_evidence,live_action_source_count:4}};
  assert.throws(()=>assertCreativePlanV2(bad),/LIVE_ACTION_SOURCE_DIVERSITY_TOO_LOW/);
});

test('physical live-action ratio is stricter than V2.1',()=>{
  const p=richVideo('REEL');
  const bad={...p,physical_evidence:{...p.physical_evidence,live_action_seconds_ratio:.45}};
  assert.throws(()=>assertCreativePlanV2(bad),/LIVE_ACTION_RATIO_TOO_LOW/);
});

test('photo motion remains explicit constrained format',()=>{
  const p=richVideo('REEL');
  p.video_mode='PHOTO_MOTION';p.video_sources=[];p.visual_sources=photos;p.scenes=p.scenes.map(s=>({...s,source_kind:'PHOTO'}));p.allow_photo_motion=true;
  const r=evaluateCreativePlanV2(p);
  assert.equal(r.passed,true);
  assert.ok(r.warnings.some(x=>x.code==='PHOTO_MOTION_LIMITED_FORMAT'));
});

test('carousel needs five pages, three visuals and four layouts',()=>{
  const bad=evaluateCreativePlanV2({output_type:'CAROUSEL',channel:'INSTAGRAM',publish_authorized:false,additional_cost_eur:0,brand:{logo_url:logo,primary:'#fff',accent:'#f47b20'},pages:[{},{},{},{}],visual_sources:[photos[0]],layout_variants:1,text_only_page_ratio:1,creative_concept:'x',channel_fit:true,accessibility_checked:true});
  assert.equal(bad.passed,false);
  const good=assertCreativePlanV2({output_type:'CAROUSEL',channel:'INSTAGRAM',publish_authorized:false,additional_cost_eur:0,brand:{logo_url:logo,primary:'#fff',accent:'#f47b20'},pages:[{},{},{},{},{}],visual_sources:photos.slice(0,3),layout_variants:4,text_only_page_ratio:.2,creative_concept:'Carrusel editorial con alternancia foto/dato/CTA',channel_fit:true,accessibility_checked:true,layer_count:6});
  assert.equal(good.passed,true);
});

test('arbitrary remote video source is rejected',()=>{
  const p=richVideo();p.video_sources=['https://example.com/video.mp4','PEXELS:7816382','PEXELS:7646690'];
  const r=evaluateCreativePlanV2(p);
  assert.equal(r.passed,false);
  assert.ok(r.failures.some(x=>x.code==='VIDEO_SOURCE_NOT_GOVERNED'));
});
