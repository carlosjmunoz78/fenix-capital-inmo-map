function arr(v){return Array.isArray(v)?v:[]}
function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function n(v,f=0){const x=Number(v);return Number.isFinite(x)?x:f}
function fail(code,detail){return {code,detail}}
function fingerprint(plan){return new Set(arr(plan.scenes).map(s=>`${String(s.video_source||'')}@${Math.floor(n(s.source_start_sec)*2)/2}`))}
function overlapRatio(a,b){const A=fingerprint(a),B=fingerprint(b);if(!A.size||!B.size)return 1;let same=0;for(const x of A)if(B.has(x))same++;return same/Math.min(A.size,B.size)}

export function evaluateCreativeCinematicV1({plan,physical_evidence,sibling_plan}={}){
  const p=obj(plan),e=obj(physical_evidence),scenes=arr(p.scenes),output=String(p.output_type||'').toUpperCase(),fails=[];
  const minCuts=output==='STORY_VIDEO'?10:output==='REEL'?16:output==='LONG_VIDEO'?26:0,maxAvg=output==='LONG_VIDEO'?2.5:1.8,maxShot=output==='LONG_VIDEO'?3.4:2.4;
  if(minCuts&&scenes.length<minCuts)fails.push(fail('CINEMATIC_CUT_DENSITY_TOO_LOW',`${scenes.length}<${minCuts}`));
  if(n(p.hook_within_sec,99)>.8)fails.push(fail('CINEMATIC_HOOK_TOO_LATE',String(p.hook_within_sec)));
  if(p.cta_dramatized!==true)fails.push(fail('CINEMATIC_CTA_NOT_DRAMATIZED','CTA must be part of narrative progression'));
  if(p.multi_voice_required!==true||n(e.distinct_voice_count)<2)fails.push(fail('CINEMATIC_MULTI_VOICE_REQUIRED',String(e.distinct_voice_count||0)));
  if(e.music_real_track!==true)fails.push(fail('CINEMATIC_REAL_MUSIC_REQUIRED','Synthetic placeholder beds are rejected'));
  if(String(e.music_license||'')!=='CC0-1.0')fails.push(fail('CINEMATIC_MUSIC_LICENSE_REQUIRED',String(e.music_license||'')));
  if(n(e.music_peak_db,-99)<-8)fails.push(fail('CINEMATIC_MUSIC_TOO_QUIET',String(e.music_peak_db)));
  if(e.per_shot_camera_motion!==true||n(e.camera_motion_profile_count)<5)fails.push(fail('CINEMATIC_CAMERA_LANGUAGE_TOO_FLAT',String(e.camera_motion_profile_count||0)));
  if(n(e.vfx_profile_count)<4||n(e.vfx_event_count)<Math.ceil(scenes.length*.55))fails.push(fail('CINEMATIC_VFX_LANGUAGE_TOO_THIN',`${e.vfx_profile_count||0}/${e.vfx_event_count||0}`));
  if(n(e.avg_shot_sec,99)>maxAvg)fails.push(fail('CINEMATIC_AVG_SHOT_TOO_LONG',`${e.avg_shot_sec}>${maxAvg}`));
  if(n(e.max_shot_sec,99)>maxShot)fails.push(fail('CINEMATIC_MAX_SHOT_TOO_LONG',`${e.max_shot_sec}>${maxShot}`));
  if(n(e.scene_change_count)<Math.max(0,minCuts-1))fails.push(fail('CINEMATIC_PHYSICAL_SCENE_CHANGES_TOO_LOW',String(e.scene_change_count||0)));
  if(sibling_plan){const r=overlapRatio(p,obj(sibling_plan));if(r>.55)fails.push(fail('CINEMATIC_FORMATS_TOO_SIMILAR',r.toFixed(3)))}
  if(p.story_reel_same_cut_forbidden!==true)fails.push(fail('CINEMATIC_NATIVE_FORMAT_CONTRACT_MISSING','Story/Reel duplicate cuts forbidden'));
  const passed=fails.length===0;
  return Object.freeze({schema_version:'1.0.0',technical_passed:passed,hard_fail:!passed,promotion_eligible:false,human_creative_review_required:true,human_creative_gate:'PENDING_REVIEW',failures:fails,verdict:passed?'TECHNICAL_CINEMATIC_CANDIDATE_HUMAN_PENDING':'CINEMATIC_REJECTED'});
}
export function assertCreativeCinematicV1(input){const r=evaluateCreativeCinematicV1(input);if(!r.technical_passed){const e=new Error(`CINEMATIC_QA_REJECTED:${r.failures.map(x=>x.code).join(',')}`);e.tribunal=r;throw e}return r}
export const CREATIVE_CINEMATIC_QUALITY_V1_CONTRACT=Object.freeze({schema_version:'1.0.0',owner_engine:'CREATIVE-STUDIO-001',min_story_cuts:10,min_reel_cuts:16,min_long_cuts:26,max_short_avg_shot_sec:1.8,max_long_avg_shot_sec:2.5,requires_real_cc0_music:true,requires_multi_voice:true,requires_per_shot_camera_motion:true,min_camera_profiles:5,min_vfx_profiles:4,story_reel_duplicate_cut_rejected:true,human_review_required:true,promotion_eligible_without_human_review:false,publication_authority:false,additional_cost_eur:0});