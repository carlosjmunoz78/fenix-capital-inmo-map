const MODES=Object.freeze(['PRESENTER_LED','HERO_COUPLE','FAMILY_STORY','EXPERT_DIALOGUE','ENSEMBLE']);
function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function arr(v){return Array.isArray(v)?v:[]}
function clean(v,max=240){const s=String(v??'').replace(/\s+/g,' ').trim();if(!s)throw new Error('CHARACTER_TEXT_REQUIRED');if(s.length>max)throw new Error('CHARACTER_TEXT_TOO_LONG');return s}

export function buildCreativeCharacterBibleV1(input={}){
  const persona=obj(input.buyer_persona_visual),requested=String(input.presentation_mode||'').toUpperCase();
  const mode=MODES.includes(requested)?requested:'HERO_COUPLE';
  const presenter=mode==='PRESENTER_LED'||mode==='EXPERT_DIALOGUE';
  const heroCount=mode==='HERO_COUPLE'?2:mode==='FAMILY_STORY'?3:mode==='EXPERT_DIALOGUE'?2:1;
  const names=arr(input.character_names);
  const characters=Array.from({length:heroCount},(_,i)=>Object.freeze({
    character_id:`CHAR-${String(i+1).padStart(2,'0')}`,
    role:presenter&&i===0?'PRESENTER':mode==='EXPERT_DIALOGUE'&&i===1?'BUYER_PERSONA':'HERO',
    continuity_priority:i===0?'PRIMARY':'SECONDARY',
    display_name:names[i]||null,
    life_stage:persona.life_stage||'Buyer persona de la campaña',
    market_context:persona.market_context||'España',
    wardrobe_anchor:persona.wardrobe||'Vestuario cotidiano español contemporáneo',
    performance_direction:presenter&&i===0?'Natural, carismático, conversacional, con cambios de ritmo, intención, sonrisa y silencios; nunca locución corporativa plana.':'Reacciones humanas naturales, no pose publicitaria.',
    identity_locked:true,
    face_continuity_required:true,
    age_continuity_required:true,
    wardrobe_continuity_required:true
  }));
  return Object.freeze({
    schema_version:'1.0.0',
    mode,
    characters,
    presenter_required:presenter,
    same_character_across_scenes:true,
    same_core_cast_across_formats:true,
    broll_may_change:true,
    extras_may_change:true,
    visual_reference_required_for_physical_identity:true,
    continuity_rules:[
      'Primary character identity cannot change between relevant shots.',
      'Core cast remains stable across Story, Reel and long video unless the showrunner records an explicit narrative reason.',
      'Wardrobe/hair/location continuity must match the narrative timeline.',
      'B-roll can change, but it must not impersonate the primary character.',
      'Presenter-led formats keep the same presenter voice and on-camera identity through the piece.',
      'Images, video and voice should complement one another rather than literally duplicate every line.'
    ],
    casting_context:clean(persona.casting_guidance||'Casting local coherente con España y con el buyer persona; natural y creíble',320),
    physical_acceptance:Object.freeze({
      require_identity_keyed_assets:true,
      min_primary_character_scene_ratio:presenter?.55:.42,
      max_unidentified_human_scene_ratio:.20,
      require_presenter_voice_consistency:presenter,
      reject_random_stock_people:true
    }),
    protected_traits_policy:'Protected traits may inform broad creative representation only when lawful and appropriate; they must never determine mortgage eligibility, approval, pricing, exclusion or individualized financial treatment.'
  });
}

export function assertCharacterContinuityEvidenceV1({character_bible,evidence}={}){
  const bible=obj(character_bible),ev=obj(evidence),failures=[];
  if(!arr(bible.characters).length)failures.push('CHARACTER_BIBLE_EMPTY');
  if(ev.identity_keyed_assets!==true)failures.push('IDENTITY_KEYED_ASSETS_REQUIRED');
  if(Number(ev.primary_character_scene_ratio||0)<Number(bible.physical_acceptance?.min_primary_character_scene_ratio||.42))failures.push('PRIMARY_CHARACTER_TOO_SPARSE');
  if(Number(ev.unidentified_human_scene_ratio||1)>Number(bible.physical_acceptance?.max_unidentified_human_scene_ratio||.20))failures.push('RANDOM_HUMANS_TOO_HIGH');
  if(bible.presenter_required&&ev.presenter_voice_consistent!==true)failures.push('PRESENTER_VOICE_INCONSISTENT');
  if(ev.face_identity_consistent!==true)failures.push('FACE_IDENTITY_INCONSISTENT');
  if(ev.wardrobe_timeline_consistent!==true)failures.push('WARDROBE_CONTINUITY_INCONSISTENT');
  if(failures.length){const e=new Error(`CHARACTER_CONTINUITY_REJECTED:${failures.join(',')}`);e.failures=failures;throw e}
  return Object.freeze({passed:true,verdict:'CHARACTER_CONTINUITY_GREEN'});
}

export const CREATIVE_CHARACTER_BIBLE_V1_CONTRACT=Object.freeze({schema_version:'1.0.0',owner_engine:'CREATIVE-STUDIO-001',modes:MODES,identity_locked:true,same_core_cast_across_formats:true,random_stock_people_rejected:true,publication_authority:false,additional_cost_eur:0});
