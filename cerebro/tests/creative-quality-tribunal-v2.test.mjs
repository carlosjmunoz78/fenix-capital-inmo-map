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
const vids=['PEXELS:7817205','PEXELS:7816382','PEXELS:7646690','PEXELS:7735853'];

function richVideo(output='REEL'){
  const long=output==='LONG_VIDEO';
  const sceneCount=long?6:4;
  return {
    output_type:output,channel:'INSTAGRAM',publish_authorized:false,additional_cost_eur:0,
    video_mode:'LIVE_ACTION_MIXED',
    creative_concept:'De la duda a la decisión: compra con método y claridad.',
    channel_fit:true,accessibility_checked:true,visual_style:'PHOTO',layer_count:9,
    brand:{logo_url:logo,primary:'#ffffff',accent:'#f47b20'},
    visual_sources:long?photos:photos.slice(0,2),
    video_sources:long?vids.slice(0,3):vids.slice(0,2),
    scenes:Array.from({length:sceneCount},(_,i)=>({id:i+1,source_kind:i%2===0?'VIDEO':'PHOTO',video_source:vids[i%Math.min(3,vids.length)]})),
    motion_profiles:['KEN_BURNS_IN','PAN_RIGHT','PUSH_IN'],
    transitions:['CROSSFADE','DIP_TO_BLACK','ZOOM_CUT'],
    motion_design:true,broll_required:true,scene_text_only_ratio:0,
    audio:{voice_enabled:true,music_enabled:true,ducking:true,captions:true},
    physical_evidence:{audio_stream_present:true,scene_change_count:long?8:5,motion_score:.72,unique_frame_ratio:.86,live_action_seconds_ratio:long?.51:.58,live_action_source_count:long?3:2}
  };
}

test('quality contract is fail-closed and distinguishes live action from photo motion',()=>{
  assert.equal(CREATIVE_QUALITY_TRIBUNAL_V2_CONTRACT.hard_fail_closed,true);
  assert.equal(CREATIVE_QUALITY_TRIBUNAL_V2_CONTRACT.rejects_powerpoint_like_video,true);
  assert.equal(CREATIVE_QUALITY_TRIBUNAL_V2_CONTRACT.unique_frames_alone_are_not_sufficient,true);
  assert.equal(CREATIVE_QUALITY_TRIBUNAL_V2_CONTRACT.requires_governed_video_sources,true);
  assert.equal(CREATIVE_QUALITY_TRIBUNAL_V2_CONTRACT.publication_authority,false);
  assert.equal(CREATIVE_QUALITY_TRIBUNAL_V2_CONTRACT.additional_cost_eur,0);
});

test('previous flat reel pattern is rejected even if frames differ',()=>{
  const r=evaluateCreativePlanV2({
    output_type:'REEL',channel:'INSTAGRAM',publish_authorized:false,additional_cost_eur:0,
    video_mode:'LIVE_ACTION_MIXED',brand:{logo_url:logo,primary:'#fff',accent:'#f47b20'},visual_sources:[photos[0]],video_sources:[],
    scenes:[{source_kind:'PHOTO'},{source_kind:'PHOTO'},{source_kind:'PHOTO'}],motion_profiles:['KEN_BURNS_IN','PAN_RIGHT'],transitions:['CROSSFADE','WIPE'],motion_design:true,broll_required:true,
    scene_text_only_ratio:0,audio:{voice_enabled:true,music_enabled:true,ducking:true,captions:true},creative_concept:'x',channel_fit:true,accessibility_checked:true,
    physical_evidence:{audio_stream_present:true,scene_change_count:4,motion_score:.9,unique_frame_ratio:1}
  });
  assert.equal(r.passed,false);
  const codes=r.failures.map(x=>x.code);
  assert.ok(codes.includes('LIVE_ACTION_SOURCE_DIVERSITY_TOO_LOW'));
  assert.ok(codes.includes('LIVE_ACTION_SCENE_COUNT_TOO_LOW'));
});

test('professional live-action reel passes',()=>{
  const r=assertCreativePlanV2(richVideo('REEL'));
  assert.equal(r.verdict,'CREATIVE_QA_GREEN');
  assert.ok(r.score>=82);
});

test('professional long video requires three governed live-action sources',()=>{
  const p=richVideo('LONG_VIDEO');
  assert.equal(assertCreativePlanV2(p).passed,true);
  const bad={...p,video_sources:p.video_sources.slice(0,2),physical_evidence:{...p.physical_evidence,live_action_source_count:2}};
  assert.throws(()=>assertCreativePlanV2(bad),/LIVE_ACTION_SOURCE_DIVERSITY_TOO_LOW/);
});

test('physical live-action ratio is mandatory once measured',()=>{
  const p=richVideo('REEL');
  const bad={...p,physical_evidence:{...p.physical_evidence,live_action_seconds_ratio:.2}};
  assert.throws(()=>assertCreativePlanV2(bad),/LIVE_ACTION_RATIO_TOO_LOW/);
});

test('photo motion must be declared as constrained format',()=>{
  const p=richVideo('REEL');
  p.video_mode='PHOTO_MOTION';p.video_sources=[];p.scenes=p.scenes.map(s=>({...s,source_kind:'PHOTO'}));p.allow_photo_motion=true;
  const r=evaluateCreativePlanV2(p);
  assert.equal(r.passed,true);
  assert.ok(r.warnings.some(x=>x.code==='PHOTO_MOTION_LIMITED_FORMAT'));
});

test('carousel rejects text-only deck and accepts visual deck',()=>{
  const bad=evaluateCreativePlanV2({output_type:'CAROUSEL',channel:'INSTAGRAM',publish_authorized:false,additional_cost_eur:0,brand:{logo_url:logo,primary:'#fff',accent:'#f47b20'},pages:[{},{},{},{}],visual_sources:[photos[0]],layout_variants:1,text_only_page_ratio:1,creative_concept:'x',channel_fit:true,accessibility_checked:true});
  assert.equal(bad.passed,false);
  const good=assertCreativePlanV2({output_type:'CAROUSEL',channel:'INSTAGRAM',publish_authorized:false,additional_cost_eur:0,brand:{logo_url:logo,primary:'#fff',accent:'#f47b20'},pages:[{},{},{},{},{}],visual_sources:photos.slice(0,3),layout_variants:4,text_only_page_ratio:.2,creative_concept:'Carrusel editorial con alternancia foto/dato/CTA',channel_fit:true,accessibility_checked:true,layer_count:6});
  assert.equal(good.passed,true);
});

test('arbitrary remote video source is rejected',()=>{
  const p=richVideo();p.video_sources=['https://example.com/video.mp4','PEXELS:7816382'];
  const r=evaluateCreativePlanV2(p);
  assert.equal(r.passed,false);
  assert.ok(r.failures.some(x=>x.code==='VIDEO_SOURCE_NOT_GOVERNED'));
});
