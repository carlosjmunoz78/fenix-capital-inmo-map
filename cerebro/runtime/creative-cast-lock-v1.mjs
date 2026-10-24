import { resolveGovernedVideoSourceV2 } from './creative-media-sources-v2.mjs';

function arr(v){return Array.isArray(v)?v:[]}
function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function ref(scene){return String(obj(scene).video_source||'').toUpperCase()}
function clampStart(source,duration,index,primary){
  const max=Math.max(0,Number(source.duration_sec||0)-Number(duration||3)-.25);
  if(max<=0)return 0;
  const target=primary?(index*3.65+.8):(index*1.85+.6);
  return Number(Math.min(max,target%Math.max(.01,max)).toFixed(2));
}
function requiredSourceCount(sceneCount){return sceneCount>=12?5:3}
function distributedBrollOrdinals(videoCount,brollNeeded){
  if(videoCount<brollNeeded+1)throw new Error(`CAST_LOCK_VIDEO_SCENES_TOO_LOW:${videoCount}<${brollNeeded+1}`);
  const slots=new Set();
  for(let k=1;k<=brollNeeded;k++){
    let ordinal=Math.floor((k*videoCount)/(brollNeeded+1));
    ordinal=Math.max(1,Math.min(videoCount-2,ordinal));
    while(slots.has(ordinal)&&ordinal<videoCount-2)ordinal++;
    while(slots.has(ordinal)&&ordinal>1)ordinal--;
    slots.add(ordinal);
  }
  if(slots.size!==brollNeeded)throw new Error(`CAST_LOCK_BROLL_SLOT_DISTRIBUTION_FAILED:${slots.size}<${brollNeeded}`);
  return slots;
}

export function lockCreativeCastV1({scenes,character_bible}={}){
  const list=arr(scenes).map(x=>({...obj(x),continuity:{...obj(obj(x).continuity)}}));
  if(!list.length)throw new Error('CAST_LOCK_SCENES_REQUIRED');
  const requiredSources=requiredSourceCount(list.length),videoRefs=[...new Set(list.filter(x=>String(x.source_kind||'').toUpperCase()==='VIDEO').map(ref).filter(Boolean))];
  if(videoRefs.length<requiredSources)throw new Error(`CAST_LOCK_SOURCE_DIVERSITY_REQUIRED:${videoRefs.length}<${requiredSources}`);
  const governed=videoRefs.map(r=>[r,resolveGovernedVideoSourceV2(r)]);
  const primaryPair=governed.find(([,s])=>s.continuity_use==='PRIMARY_CAST_CANDIDATE'&&s.human_content===true&&s.cast_identity_key&&s.wardrobe_timeline_key);
  if(!primaryPair)throw new Error('STUDIO_PRIMARY_CAST_SOURCE_REQUIRED');
  const [primaryRef,primarySource]=primaryPair,broll=governed.filter(([r])=>r!==primaryRef),brollNeeded=requiredSources-1;
  if(broll.length<brollNeeded)throw new Error(`CAST_LOCK_BROLL_SOURCES_REQUIRED:${broll.length}<${brollNeeded}`);
  const videoSceneIndexes=list.map((s,i)=>String(s.source_kind||'').toUpperCase()==='VIDEO'?i:-1).filter(i=>i>=0);
  const brollSlots=distributedBrollOrdinals(videoSceneIndexes.length,brollNeeded),primaryCharacterId=obj(character_bible).characters?.[0]?.character_id||null;
  let brollIndex=0,primaryCount=0,brollCount=0,videoOrdinal=0;
  for(let i=0;i<list.length;i++){
    const scene=list[i],kind=String(scene.source_kind||'PHOTO').toUpperCase();
    if(kind!=='VIDEO'){
      scene.continuity={...scene.continuity,character_intent:'BRAND_OR_CONTEXT',primary_character_id:primaryCharacterId,identity_must_match_when_human_primary:false};
      continue;
    }
    const useBroll=brollSlots.has(videoOrdinal++);
    if(!useBroll){
      scene.video_source=primaryRef;
      scene.source_start_sec=clampStart(primarySource,scene.duration_sec,i,true);
      scene.continuity={...scene.continuity,character_intent:'PRIMARY_CAST',primary_character_id:primaryCharacterId,cast_identity_key:primarySource.cast_identity_key,wardrobe_timeline_key:primarySource.wardrobe_timeline_key,identity_must_match_when_human_primary:true};
      primaryCount++;
    }else{
      const [bref,source]=broll[brollIndex++];
      scene.video_source=bref;
      scene.source_start_sec=clampStart(source,scene.duration_sec,i,false);
      scene.continuity={...scene.continuity,character_intent:'BROLL_CONTEXT',primary_character_id:primaryCharacterId,cast_identity_key:source.cast_identity_key||null,wardrobe_timeline_key:source.wardrobe_timeline_key||null,identity_must_match_when_human_primary:false};
      brollCount++;
    }
  }
  const sceneRatio=primaryCount/list.length,minimum=Number(obj(character_bible).physical_acceptance?.min_primary_character_scene_ratio||.42);
  if(sceneRatio<minimum)throw new Error(`CAST_LOCK_PRIMARY_RATIO_LOW:${sceneRatio.toFixed(3)}<${minimum}`);
  const usedVideoRefs=[...new Set(list.filter(x=>String(x.source_kind||'').toUpperCase()==='VIDEO').map(ref).filter(Boolean))];
  if(usedVideoRefs.length<requiredSources)throw new Error(`CAST_LOCK_USED_SOURCE_DIVERSITY_LOW:${usedVideoRefs.length}<${requiredSources}`);
  return Object.freeze({
    schema_version:'1.2.0',
    scenes:list.map(x=>Object.freeze(x)),
    primary_cast_video_source:primaryRef,
    primary_cast_identity_key:primarySource.cast_identity_key,
    primary_wardrobe_timeline_key:primarySource.wardrobe_timeline_key,
    primary_scene_count:primaryCount,
    broll_scene_count:brollCount,
    video_scene_count:videoSceneIndexes.length,
    primary_character_scene_ratio:Number(sceneRatio.toFixed(3)),
    required_live_action_source_count:requiredSources,
    used_live_action_sources:usedVideoRefs,
    live_action_source_count:usedVideoRefs.length,
    method:'SAME_GOVERNED_TAKE_REUSED_ACROSS_PRIMARY_SHOTS_PLUS_FORMAT_SCALED_DISTINCT_BROLL',
    biometric_identity_claimed:false
  });
}

export const CREATIVE_CAST_LOCK_V1_CONTRACT=Object.freeze({schema_version:'1.2.0',owner_engine:'CREATIVE-STUDIO-001',same_governed_take_for_primary_cast:true,broll_separated_from_primary:true,short_form_min_distinct_live_action_sources:3,long_form_min_distinct_live_action_sources:5,short_form_min_distinct_broll_sources:2,long_form_min_distinct_broll_sources:4,asset_level_identity_keying:true,biometric_face_recognition:false,wardrobe_take_lock:true,publication_authority:false,additional_cost_eur:0});
