import { resolveGovernedVideoSourceV2 } from './creative-media-sources-v2.mjs';

function arr(v){return Array.isArray(v)?v:[]}
function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function ratio(a,b){return b?Number((a/b).toFixed(3)):0}

export function evaluatePhysicalCharacterContinuityV1({scenes,character_bible,voice_id}={}){
  const list=arr(scenes),bible=obj(character_bible),primary=[],human=[],unidentified=[],broll=[];
  for(let i=0;i<list.length;i++){
    const scene=obj(list[i]),continuity=obj(scene.continuity),kind=String(scene.source_kind||'PHOTO').toUpperCase();
    if(kind!=='VIDEO')continue;
    const ref=String(scene.video_source||'');
    if(!ref)continue;
    const source=resolveGovernedVideoSourceV2(ref);
    if(source.human_content===true){
      const row={scene_index:i,ref,cast_identity_key:source.cast_identity_key||null,wardrobe_timeline_key:source.wardrobe_timeline_key||null,continuity_use:source.continuity_use||null,character_intent:continuity.character_intent||null};
      human.push(row);
      if(!source.cast_identity_key)unidentified.push(row);
      if(String(continuity.character_intent||'').toUpperCase()==='PRIMARY_CAST')primary.push(row);else broll.push(row);
    }
  }
  const primaryCastKeys=new Set(primary.map(x=>x.cast_identity_key).filter(Boolean));
  const primaryWardrobeKeys=new Set(primary.map(x=>x.wardrobe_timeline_key).filter(Boolean));
  const expectedPrimary=bible.characters?.[0]?.character_id||null;
  const primaryCharacterIds=new Set(list.map(x=>obj(x).continuity?.primary_character_id).filter(Boolean));
  const identityKeyed=human.length>0&&unidentified.length===0&&primary.length>0&&primary.every(x=>x.cast_identity_key);
  const faceConsistent=primary.length>0&&primaryCastKeys.size===1&&(!expectedPrimary||primaryCharacterIds.has(expectedPrimary));
  const wardrobeConsistent=primary.length>0&&primaryWardrobeKeys.size===1;
  return Object.freeze({
    schema_version:'1.0.0',
    evidence_method:'GOVERNED_ASSET_IDENTITY_LOCK',
    identity_keyed_assets:identityKeyed,
    primary_character_scene_ratio:ratio(primary.length,list.length),
    unidentified_human_scene_ratio:ratio(unidentified.length,list.length),
    presenter_voice_consistent:bible.presenter_required?Boolean(voice_id):true,
    face_identity_consistent:faceConsistent,
    wardrobe_timeline_consistent:wardrobeConsistent,
    primary_character_id:expectedPrimary,
    primary_cast_identity_keys:[...primaryCastKeys],
    primary_wardrobe_timeline_keys:[...primaryWardrobeKeys],
    primary_asset_refs:[...new Set(primary.map(x=>x.ref))],
    broll_asset_refs:[...new Set(broll.map(x=>x.ref))],
    human_scene_count:human.length,
    primary_scene_count:primary.length,
    broll_human_scene_count:broll.length,
    unidentified_human_scene_count:unidentified.length,
    same_primary_source_locked:new Set(primary.map(x=>x.ref)).size===1,
    evidence_note:'Continuity is proven at governed source/take level: every PRIMARY_CAST scene reuses one identity-keyed source/take. This does not claim biometric face recognition.'
  });
}

export const CREATIVE_CHARACTER_CONTINUITY_PHYSICAL_V1_CONTRACT=Object.freeze({schema_version:'1.0.0',owner_engine:'CREATIVE-STUDIO-001',method:'GOVERNED_ASSET_IDENTITY_LOCK',biometric_face_recognition:false,requires_primary_source_reuse:true,requires_identity_keyed_human_assets:true,requires_wardrobe_take_lock:true,publication_authority:false,additional_cost_eur:0});
