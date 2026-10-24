function arr(v){return Array.isArray(v)?v:[]}
function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function clone(v){return JSON.parse(JSON.stringify(v))}

const CAMERA=['PUSH_IN','PULL_OUT','PAN_LEFT','PAN_RIGHT','TILT_DOWN','TILT_UP','ORBIT_LEFT','ORBIT_RIGHT','HANDHELD_MICRO','LOCKED_PUNCH'];
const VFX=['NONE','SPEED_RAMP','LIGHT_LEAK','WHIP_BLUR','PARALLAX_PUNCH','MATCH_FLASH','FOCUS_PULL','IMPACT_ZOOM'];
const LAYOUT=['FULL_BLEED','FRAME_MINIMAL','GLASS_CARD','FULL_BLEED','SPLIT_EDITORIAL','FULL_BLEED'];
const XFADE_SEC=.55;

function heroRef(campaign){
  for(const key of ['story','reel','long']){
    for(const s of arr(obj(obj(campaign.video_productions)[key]).selected_plan?.scenes)){
      if(String(s.video_source||''))return String(s.video_source);
    }
  }
  throw new Error('NATIVE_CUT_HERO_SOURCE_REQUIRED');
}
function sources(campaign){
  const out=[];
  for(const key of ['story','reel','long'])for(const s of arr(obj(obj(campaign.video_productions)[key]).selected_plan?.scenes)){
    const r=String(s.video_source||'');if(r&&!out.includes(r))out.push(r);
  }
  if(out.length<3)throw new Error('NATIVE_CUT_VIDEO_DIVERSITY_REQUIRED');
  return out;
}
function makeScenes({count,finalDuration,sourcePool,hero,format,characterBible}){
  const rawTotal=finalDuration+XFADE_SEC*(count-1),heroSlots=format==='STORY_VIDEO'?[0,4,count-2]:format==='REEL'?[0,5,10,count-2]:[0,6,12,18,count-2];
  const cuts=[];let used=0;
  for(let i=0;i<count;i++){
    const left=count-i,remain=rawTotal-used,base=remain/left,pulse=(i%4===0?-.14:(i%4===1?.09:(i%4===2?-.04:.12)));
    const maxDur=format==='LONG_VIDEO'?3.25:2.45,d=i===count-1?remain:Math.max(1.15,Math.min(maxDur,base+pulse)),isHero=heroSlots.includes(i);
    const ref=isHero?hero:sourcePool[(i*2+(format==='STORY_VIDEO'?1:format==='REEL'?2:3))%sourcePool.length];
    const beat=i===0?'HOOK':i===count-1?'END_FRAME':i>=count-3?'CTA':i<Math.ceil(count*.35)?'TENSION':i<Math.ceil(count*.68)?'TURN':'PAYOFF';
    const headline=beat==='HOOK'?'PARA.':beat==='CTA'&&i===count-2?'QUE ENCAJE CONTIGO.':' ';
    cuts.push({source_kind:'VIDEO',video_source:ref,source_start_sec:Number((((i*1.37)+(format==='STORY_VIDEO'?1.1:format==='REEL'?2.8:4.2))%6).toFixed(2)),duration_sec:Number(d.toFixed(2)),headline,subheadline:' ',layout_style:LAYOUT[i%LAYOUT.length],camera_motion:CAMERA[i%CAMERA.length],vfx_accent:VFX[(i+(format==='STORY_VIDEO'?1:format==='REEL'?3:5))%VFX.length],beat,continuity:{character_intent:isHero?'PRIMARY_CAST':'CONTEXT_BROLL',primary_character_id:characterBible?.characters?.[0]?.character_id||null,identity_must_match_when_human_primary:true}});
    used+=d;
  }
  return cuts;
}
function storyNarration(cta){return [
  {start_sec:.05,voice_id:'ES_FEMALE',role:'HERO',text:'Para. Si una casa te encanta, lo último que necesitas es que la prisa decida por ti.'},
  {start_sec:2.9,voice_id:'ES_MALE',role:'BUYER',text:'¿Y si la pierdo por no reservar hoy?'},
  {start_sec:5.0,voice_id:'ES_FEMALE',role:'HERO',text:'Primero mira si la operación encaja contigo. Si encaja, entonces sí: acelera.'},
  {start_sec:9.0,voice_id:'ES_MALE',role:'BUYER',text:'O sea: ilusión sí. A ciegas, no.'},
  {start_sec:11.0,voice_id:'ES_FEMALE',role:'CTA',text:cta}
]}
function reelNarration(cta){return [
  {start_sec:.05,voice_id:'ES_FEMALE',role:'HERO',text:'No reserves una casa solo porque te están metiendo prisa.'},
  {start_sec:2.6,voice_id:'ES_MALE',role:'BUYER',text:'Pero me han dicho que hoy hay que decidir.'},
  {start_sec:4.7,voice_id:'ES_FEMALE',role:'HERO',text:'Perfecto. Entonces hoy comprobamos una cosa: si de verdad encaja contigo.'},
  {start_sec:8.0,voice_id:'ES_MALE',role:'BUYER',text:'¿Y si sí encaja?'},
  {start_sec:9.3,voice_id:'ES_FEMALE',role:'HERO',text:'Entonces dejamos de frenar y empezamos a correr contigo.'},
  {start_sec:14.3,voice_id:'ES_MALE',role:'BUYER',text:'Eso ya suena bastante mejor.'},
  {start_sec:17.2,voice_id:'ES_FEMALE',role:'CTA',text:`${cta}. Antes de reservar, que la operación también te guste por dentro.`}
]}
function longNarration(cta){return [
  {start_sec:.05,voice_id:'ES_FEMALE',role:'HERO',text:'Hay una frase que aparece justo cuando una vivienda te encanta: hay que reservar hoy.'},
  {start_sec:5.2,voice_id:'ES_MALE',role:'BUYER',text:'Y en ese momento sientes que si preguntas demasiado, la pierdes.'},
  {start_sec:9.0,voice_id:'ES_FEMALE',role:'HERO',text:'El problema no es la ilusión. El problema es confundir velocidad con ir a ciegas.'},
  {start_sec:15.0,voice_id:'ES_MALE',role:'BUYER',text:'Entonces, ¿paramos la compra?'},
  {start_sec:17.2,voice_id:'ES_FEMALE',role:'HERO',text:'No. Comprobamos lo importante. Y si encaja, usamos la velocidad a tu favor.'},
  {start_sec:24.5,voice_id:'ES_MALE',role:'BUYER',text:'Que la prisa no mande. Que mande la operación.'},
  {start_sec:29.2,voice_id:'ES_FEMALE',role:'HERO',text:'Exacto. La casa puede seguir encantándote mientras tú decides con claridad.'},
  {start_sec:36.0,voice_id:'ES_MALE',role:'BUYER',text:'Y cuando está claro, ya no parece un salto al vacío.'},
  {start_sec:41.5,voice_id:'ES_FEMALE',role:'HERO',text:'Parece lo que debería parecer: una decisión importante que también puede ilusionarte.'},
  {start_sec:48.0,voice_id:'ES_FEMALE',role:'CTA',text:`${cta}. Y si hay que correr, corremos después de saber por qué.`}
]}
function upgradeProduction(production,{format,count,finalDuration,sourcePool,hero,cta}){
  const p=clone(production),old=obj(p.selected_plan),characterBible=old.character_bible||p.character_bible,narration=format==='STORY_VIDEO'?storyNarration(cta):format==='REEL'?reelNarration(cta):longNarration(cta);
  p.selected_plan={...old,scenes:makeScenes({count,finalDuration,sourcePool,hero,format,characterBible}),narration_blocks:narration,hook_within_sec:.05,voice_style:'SOCIAL_ENERGETIC',native_cut_version:'V2.5',native_format_signature:format==='STORY_VIDEO'?'FAST_DIALOGUE_VERTICAL':format==='REEL'?'RETENTION_DRIVEN_VERTICAL':'CINEMATIC_EXPLAINER',camera_language:['PUSH_PULL','PAN_TILT','ORBIT','PUNCH_IN','HANDHELD_MICRO'],vfx_language:['SPEED_RAMP','WHIP_BLUR','LIGHT_LEAK','PARALLAX_PUNCH','MATCH_FLASH','FOCUS_PULL'],music_required:true,multi_voice_required:true,min_distinct_voices:2,cta_dramatized:true,story_reel_same_cut_forbidden:true,expected_final_duration_sec:finalDuration,transition_overlap_sec:XFADE_SEC};
  return p;
}

export function upgradeStudioCampaignNativeV2(campaign={}){
  const c=clone(campaign),pool=sources(c),hero=heroRef(c),cta=String(c.campaign_bible?.cta||'Cuéntanos tu caso y lo miramos contigo');
  c.schema_version='2.0.0';c.version='v2.5';c.studio_mode='CEREBRO_STUDIO_GRADE_NATIVE_CINEMATIC';c.human_creative_gate='PENDING_REVIEW';c.publish_authorized=false;c.additional_cost_eur=0;
  c.video_productions.story=upgradeProduction(c.video_productions.story,{format:'STORY_VIDEO',count:10,finalDuration:13.8,sourcePool:pool,hero,cta});
  c.video_productions.reel=upgradeProduction(c.video_productions.reel,{format:'REEL',count:16,finalDuration:22.8,sourcePool:pool,hero,cta});
  c.video_productions.long=upgradeProduction(c.video_productions.long,{format:'LONG_VIDEO',count:26,finalDuration:56.0,sourcePool:pool,hero,cta});
  c.slate.story=c.video_productions.story.selected_plan;c.slate.reel=c.video_productions.reel.selected_plan;c.slate.long_video=c.video_productions.long.selected_plan;
  c.native_cinematic_contract={story_reel_same_cut_forbidden:true,min_story_cuts:10,min_reel_cuts:16,min_long_cuts:26,multi_voice:true,min_distinct_voices:2,real_music_track_required:true,camera_motion_per_scene:true,vfx_pattern_interrupts:true,cta_dramatized:true,human_review_required:true};
  return Object.freeze(c);
}

export const CREATIVE_STUDIO_NATIVE_CUT_V2_CONTRACT=Object.freeze({schema_version:'2.0.0',owner_engine:'CREATIVE-STUDIO-001',story_reel_same_cut_forbidden:true,min_story_cuts:10,min_reel_cuts:16,min_long_cuts:26,multi_voice:true,min_distinct_voices:2,real_music_track_required:true,camera_motion_per_scene:true,vfx_pattern_interrupts:true,human_review_required:true,publication_authority:false,additional_cost_eur:0});