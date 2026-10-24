const CHANNELS=new Set(['INSTAGRAM','FACEBOOK','LINKEDIN','SEO','WEB','APP','EMAIL','DOCUMENT','TRAINING','REVIEW_ONLY']);
const VIDEO_TYPES=new Set(['REEL','SHORT_VIDEO','LONG_VIDEO','LANDSCAPE_VIDEO','STORY_VIDEO']);
const STATIC_TYPES=new Set(['STATIC_POST','SQUARE_POST','SEO_IMAGE','WEB_HERO','EMAIL_BANNER','DOCUMENT_COVER','APP_ASSET','INFOGRAPHIC','STORY']);
const CAROUSEL_TYPES=new Set(['CAROUSEL']);
const MOTION_PROFILES=new Set(['KEN_BURNS_IN','KEN_BURNS_OUT','PAN_LEFT','PAN_RIGHT','PARALLAX_SOFT','PUSH_IN','PULL_OUT','ORBIT_FAKE']);
const TRANSITIONS=new Set(['CROSSFADE','DIP_TO_BLACK','PUSH','WIPE','ZOOM_CUT','MATCH_CUT']);
const OWNED_HOSTS=new Set(['fenixcapital.es','www.fenixcapital.es','staging.fenixcapital.es']);

function arr(v){return Array.isArray(v)?v:[];}
function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}
function n(v,f=0){const x=Number(v);return Number.isFinite(x)?x:f;}
function uniq(xs){return [...new Set(xs.filter(Boolean))];}
function safeHost(url){try{return new URL(String(url)).hostname}catch{return ''}}
function fail(code,detail){return {code,detail};}

export function evaluateCreativePlanV2(input={}){
  const plan=obj(input.plan||input);
  const output=String(plan.output_type||'').toUpperCase();
  const channel=String(plan.channel||'REVIEW_ONLY').toUpperCase();
  const scenes=arr(plan.scenes);
  const pages=arr(plan.pages);
  const sources=uniq(arr(plan.visual_sources).map(x=>typeof x==='string'?x:obj(x).url));
  const motions=uniq(arr(plan.motion_profiles).map(x=>String(x).toUpperCase()));
  const transitions=uniq(arr(plan.transitions).map(x=>String(x).toUpperCase()));
  const audio=obj(plan.audio);
  const brand=obj(plan.brand);
  const evidence=obj(input.physical_evidence||plan.physical_evidence);
  const failures=[];
  const warnings=[];

  if(!CHANNELS.has(channel))failures.push(fail('CHANNEL_UNSUPPORTED',channel));
  if(!VIDEO_TYPES.has(output)&&!STATIC_TYPES.has(output)&&!CAROUSEL_TYPES.has(output))failures.push(fail('OUTPUT_UNSUPPORTED',output));
  if(plan.publish_authorized!==false)failures.push(fail('PUBLISH_AUTHORITY_MUST_BE_FALSE','Creative capability cannot publish'));
  if(n(plan.additional_cost_eur,0)!==0)failures.push(fail('MONEY_LIMIT','Creative V2 default gate requires 0 EUR incremental cost'));

  const logo=String(brand.logo_url||'');
  if(!logo)failures.push(fail('BRAND_LOGO_REQUIRED','Transparent official logo asset is mandatory'));
  else {
    const host=safeHost(logo);
    if(!OWNED_HOSTS.has(host))failures.push(fail('BRAND_LOGO_HOST_DENIED',host));
    if(!/\.(png|webp)(\?|$)/i.test(logo))warnings.push(fail('BRAND_LOGO_ALPHA_NOT_PROVEN','Use transparent PNG/WebP and verify alpha in physical QA'));
  }
  if(!brand.primary||!brand.accent)failures.push(fail('BRAND_TOKENS_REQUIRED','primary/accent brand tokens missing'));

  for(const url of sources){const host=safeHost(url);if(!OWNED_HOSTS.has(host))failures.push(fail('VISUAL_SOURCE_HOST_DENIED',host||url));}

  if(VIDEO_TYPES.has(output)){
    const minScenes=output==='LONG_VIDEO'?6:3;
    const minSources=output==='LONG_VIDEO'?4:2;
    if(scenes.length<minScenes)failures.push(fail('VIDEO_SCENE_COUNT_TOO_LOW',`${scenes.length}<${minScenes}`));
    if(sources.length<minSources)failures.push(fail('VIDEO_VISUAL_DIVERSITY_TOO_LOW',`${sources.length}<${minSources}`));
    if(motions.length<2)failures.push(fail('VIDEO_MOTION_VARIETY_TOO_LOW','Need >=2 motion profiles'));
    if(transitions.length<2)failures.push(fail('VIDEO_TRANSITION_VARIETY_TOO_LOW','Need >=2 transition types'));
    if(motions.some(x=>!MOTION_PROFILES.has(x)))failures.push(fail('MOTION_PROFILE_DENIED',motions.filter(x=>!MOTION_PROFILES.has(x)).join(',')));
    if(transitions.some(x=>!TRANSITIONS.has(x)))failures.push(fail('TRANSITION_DENIED',transitions.filter(x=>!TRANSITIONS.has(x)).join(',')));
    if(audio.voice_enabled!==true)failures.push(fail('VIDEO_VOICE_REQUIRED','Professional showcase requires narrated voice'));
    if(audio.music_enabled!==true)failures.push(fail('VIDEO_MUSIC_REQUIRED','Professional showcase requires music bed'));
    if(audio.ducking!==true)failures.push(fail('AUDIO_DUCKING_REQUIRED','Music must duck under voice'));
    if(audio.captions!==true)failures.push(fail('CAPTIONS_REQUIRED','Burned or sidecar captions required'));
    if(plan.motion_design!==true)failures.push(fail('MOTION_DESIGN_REQUIRED','Kinetic typography/overlays/motion layer required'));
    if(plan.broll_required!==true)failures.push(fail('BROLL_REQUIRED','Video must include visual/B-roll sources, not slides only'));
    if(plan.scene_text_only_ratio!==undefined&&n(plan.scene_text_only_ratio,1)>.34)failures.push(fail('POWERPOINT_HEURISTIC_REJECTED','Too many text-only scenes'));
    if(evidence.audio_stream_present===false)failures.push(fail('PHYSICAL_AUDIO_MISSING','No physical audio stream'));
    if(evidence.scene_change_count!==undefined&&n(evidence.scene_change_count)<Math.max(2,minScenes-1))failures.push(fail('PHYSICAL_SCENE_CHANGES_TOO_LOW',String(evidence.scene_change_count)));
    if(evidence.motion_score!==undefined&&n(evidence.motion_score)<0.18)failures.push(fail('PHYSICAL_MOTION_TOO_LOW',String(evidence.motion_score)));
    if(evidence.unique_frame_ratio!==undefined&&n(evidence.unique_frame_ratio)<0.25)failures.push(fail('PHYSICAL_STATIC_VIDEO_REJECTED',String(evidence.unique_frame_ratio)));
  }

  if(CAROUSEL_TYPES.has(output)){
    if(pages.length<4)failures.push(fail('CAROUSEL_TOO_SHORT','Need >=4 pages'));
    if(sources.length<2)failures.push(fail('CAROUSEL_VISUAL_DIVERSITY_TOO_LOW','Need >=2 owned visual sources'));
    if(plan.layout_variants!==undefined&&n(plan.layout_variants)<3)failures.push(fail('CAROUSEL_LAYOUT_VARIETY_TOO_LOW','Need >=3 layout variants'));
    if(plan.text_only_page_ratio!==undefined&&n(plan.text_only_page_ratio,1)>.4)failures.push(fail('CAROUSEL_TOO_TEXT_HEAVY','Too many text-only pages'));
  }

  if(STATIC_TYPES.has(output)){
    if(sources.length<1&&plan.visual_style!=='DATA')warnings.push(fail('STATIC_VISUAL_SOURCE_RECOMMENDED','Use owned photo/illustration for non-data creative'));
  }

  const scores={
    technical:15,
    creative_direction:plan.creative_concept?15:4,
    visual_richness:Math.min(20,4+sources.length*3+(plan.layer_count?Math.min(6,n(plan.layer_count)):0)),
    motion:VIDEO_TYPES.has(output)?Math.min(15,motions.length*4+transitions.length*2+(plan.motion_design?3:0)):15,
    brand:logo&&brand.primary&&brand.accent?10:3,
    audio:VIDEO_TYPES.has(output)?((audio.voice_enabled?3:0)+(audio.music_enabled?3:0)+(audio.ducking?2:0)+(audio.captions?2:0)):10,
    channel_fit:plan.channel_fit===true?10:4,
    accessibility:plan.accessibility_checked===true?5:2
  };
  const score=Object.values(scores).reduce((a,b)=>a+b,0);
  const hard_fail=failures.length>0;
  const passed=!hard_fail&&score>=82;
  return Object.freeze({schema_version:'2.0.0',passed,hard_fail,score,scores,failures,warnings,verdict:passed?'CREATIVE_QA_GREEN':'CREATIVE_QA_REJECTED'});
}

export function assertCreativePlanV2(input){
  const result=evaluateCreativePlanV2(input);
  if(!result.passed){const err=new Error(`CREATIVE_QA_REJECTED:${result.failures.map(x=>x.code).join(',')||`SCORE_${result.score}`}`);err.tribunal=result;throw err;}
  return result;
}

export const CREATIVE_QUALITY_TRIBUNAL_V2_CONTRACT=Object.freeze({
  schema_version:'2.0.0',
  owner_engine:'FACT-001',
  minimum_score:82,
  hard_fail_closed:true,
  rejects_powerpoint_like_video:true,
  requires_real_motion_for_video:true,
  requires_owned_visual_sources:true,
  requires_transparent_brand_logo:true,
  requires_voice_music_ducking_captions_for_showcase_video:true,
  publication_authority:false,
  additional_cost_eur:0
});
