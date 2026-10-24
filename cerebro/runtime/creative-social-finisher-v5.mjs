import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
const execFileAsync=promisify(execFile);
function arr(v){return Array.isArray(v)?v:[]}
function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function f(v){return Number(v).toFixed(4).replace(/0+$/,'').replace(/\.$/,'')}
async function probe(file){const {stdout}=await execFileAsync('ffprobe',['-v','error','-show_entries','format=duration','-show_entries','stream=codec_type,width,height','-of','json',file]);const p=JSON.parse(stdout),v=arr(p.streams).find(x=>x.codec_type==='video');if(!v)throw new Error('CINEMATIC_FINISHER_VIDEO_REQUIRED');const duration=Number(p.format?.duration||0);if(!(duration>0))throw new Error('CINEMATIC_FINISHER_DURATION_INVALID');return {duration,width:Number(v.width),height:Number(v.height),audio:arr(p.streams).some(x=>x.codec_type==='audio')}}
function plannedDur(scene){return Math.max(0.9,Number(obj(scene).duration_sec||obj(scene).duration||2))}
function legacyDur(scene){return Math.min(15,Math.max(2,Number(obj(scene).duration_sec||obj(scene).duration||6)))}
function legacyStarts(scenes,overlap){let c=0;const out=[];for(let i=0;i<scenes.length;i++){out.push(c);c+=legacyDur(scenes[i]);if(i<scenes.length-1)c-=overlap}return out}
function nativeSegments(scenes,overlap,sourceDuration){const starts=legacyStarts(scenes,overlap),segments=[];for(let i=0;i<scenes.length;i++){const desired=Math.max(0.1,plannedDur(scenes[i])-(i<scenes.length-1?overlap:0)),start=starts[i],end=Math.min(sourceDuration,start+desired);if(end-start<=0.15)throw new Error(`CINEMATIC_NATIVE_SEGMENT_TOO_SHORT:${i}:${(end-start).toFixed(3)}`);segments.push({i,start,end,duration:end-start,scene:obj(scenes[i]),legacy_clip_duration:legacyDur(scenes[i]),planned_clip_duration:plannedDur(scenes[i])})}return segments}
function zoomExpr(motion,frames){const N=Math.max(2,frames-1),cx="iw/2-(iw/zoom/2)",cy="ih/2-(ih/zoom/2)";switch(String(motion||'PUSH_IN').toUpperCase()){
  case 'PULL_OUT':return `z='1.08-0.075*on/${N}':x='${cx}':y='${cy}'`;
  case 'PAN_LEFT':return `z='1.075':x='(iw-iw/zoom)*(1-on/${N})':y='${cy}'`;
  case 'PAN_RIGHT':return `z='1.075':x='(iw-iw/zoom)*on/${N}':y='${cy}'`;
  case 'TILT_UP':return `z='1.075':x='${cx}':y='(ih-ih/zoom)*(1-on/${N})'`;
  case 'TILT_DOWN':return `z='1.075':x='${cx}':y='(ih-ih/zoom)*on/${N}'`;
  case 'ORBIT_LEFT':return `z='1.085':x='${cx}+(iw-iw/zoom)*0.25*sin(on/${N}*PI)':y='${cy}-(ih-ih/zoom)*0.18*sin(on/${N}*PI)'`;
  case 'ORBIT_RIGHT':return `z='1.085':x='${cx}-(iw-iw/zoom)*0.25*sin(on/${N}*PI)':y='${cy}+(ih-ih/zoom)*0.18*sin(on/${N}*PI)'`;
  case 'HANDHELD_MICRO':return `z='1.06':x='${cx}+(iw-iw/zoom)*0.10*sin(on*0.31)':y='${cy}+(ih-ih/zoom)*0.08*cos(on*0.27)'`;
  case 'LOCKED_PUNCH':return `z='1.055+0.025*sin(min(on,${N})/${N}*PI)':x='${cx}':y='${cy}'`;
  default:return `z='1.0+0.08*on/${N}':x='${cx}':y='${cy}'`;
}}
const PHYSICAL_VFX=Object.freeze({
  NONE:'',
  CONTRAST_PULSE:",eq=contrast=1.14:saturation=1.16:brightness=0.015:enable='lt(t,0.12)'",
  WHIP_BLUR:",gblur=sigma=9:steps=2:enable='lt(t,0.085)'",
  MATCH_FLASH:",eq=brightness=0.16:saturation=1.35:enable='lt(t,0.06)'",
  LIGHT_LEAK:",colorbalance=rs=0.13:gs=0.035:bs=-0.035:enable='between(t,0,0.14)'",
  FOCUS_PULL:",gblur=sigma=5:steps=2:enable='between(t,0,0.055)'",
  IMPACT_ZOOM:",eq=contrast=1.12:saturation=1.18:enable='lt(t,0.11)'",
  SHARP_PUNCH:",unsharp=7:7:0.65:7:7:0:enable='lt(t,0.14)'"
});
function vfxFilter(accent){const key=String(accent||'NONE').toUpperCase();if(!(key in PHYSICAL_VFX))throw new Error(`CINEMATIC_VFX_NOT_PHYSICAL:${key}`);return PHYSICAL_VFX[key]}

export async function finishCreativeSocialV5({videoFile,scenes,temp,transitionOverlapSec=0.55}){
  const meta=await probe(videoFile),list=arr(scenes).map(obj);if(list.length<5)throw new Error('CINEMATIC_FINISHER_SCENES_REQUIRED');
  const segments=nativeSegments(list,transitionOverlapSec,meta.duration);if(segments.length<5)throw new Error('CINEMATIC_FINISHER_SEGMENTS_TOO_FEW');
  const targetDuration=segments.reduce((a,x)=>a+x.duration,0),plannedTarget=list.reduce((a,x)=>a+plannedDur(x),0)-transitionOverlapSec*(list.length-1);
  if(Math.abs(targetDuration-plannedTarget)>0.08)throw new Error(`CINEMATIC_NATIVE_TIMELINE_DRIFT:${targetDuration.toFixed(3)}!=${plannedTarget.toFixed(3)}`);
  const splitLabels=segments.map((_,i)=>`[src${i}]`).join(''),parts=[`[0:v]split=${segments.length}${splitLabels}`];
  for(let j=0;j<segments.length;j++){const s=segments[j],frames=Math.max(2,Math.round(s.duration*30)),motion=String(s.scene.camera_motion||'PUSH_IN'),vfx=String(s.scene.vfx_accent||'NONE');parts.push(`[src${j}]trim=start=${f(s.start)}:end=${f(s.end)},setpts=PTS-STARTPTS,fps=30,zoompan=${zoomExpr(motion,frames)}:d=1:s=${meta.width}x${meta.height}:fps=30${vfxFilter(vfx)},eq=contrast=1.045:saturation=1.075:brightness=-0.006,vignette=PI/5,format=yuv420p[v${j}]`)}
  parts.push(`${segments.map((_,j)=>`[v${j}]`).join('')}concat=n=${segments.length}:v=1:a=0[v]`);
  const out=path.join(temp,`social-finished-v5-${path.basename(videoFile)}`),args=['-hide_banner','-loglevel','error','-i',videoFile,'-filter_complex',parts.join(';'),'-map','[v]'];if(meta.audio)args.push('-map','0:a:0');args.push('-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p');if(meta.audio)args.push('-c:a','copy');args.push('-t',String(targetDuration),'-movflags','+faststart','-y',out);await execFileAsync('ffmpeg',args,{maxBuffer:64*1024*1024});
  const after=await probe(out);if(Math.abs(after.duration-targetDuration)>0.35)throw new Error(`CINEMATIC_FINISHER_DURATION_DRIFT:${targetDuration}->${after.duration}`);if(meta.audio&&!after.audio)throw new Error('CINEMATIC_FINISHER_AUDIO_LOST');
  const durations=segments.map(x=>x.duration),motions=[...new Set(segments.map(x=>String(x.scene.camera_motion||'PUSH_IN').toUpperCase()))],vfx=[...new Set(segments.map(x=>String(x.scene.vfx_accent||'NONE').toUpperCase()).filter(x=>x!=='NONE'))];
  return {file:out,evidence:{visual_finisher_version:'V5.3_NATIVE_RECUT',legacy_prerender_min_scene_sec:2,legacy_prerender_recut:true,native_timeline_target_sec:Number(plannedTarget.toFixed(3)),native_timeline_output_sec:Number(after.duration.toFixed(3)),per_shot_camera_motion:true,camera_motion_event_count:segments.length,camera_motion_profiles:motions,camera_motion_profile_count:motions.length,vfx_event_count:segments.filter(x=>String(x.scene.vfx_accent||'NONE').toUpperCase()!=='NONE').length,vfx_profiles:vfx,vfx_profile_count:vfx.length,named_vfx_match_physical_filters:true,ffmpeg_portable_filter_literals:true,scene_change_count:Math.max(0,segments.length-1),avg_shot_sec:Number((durations.reduce((a,b)=>a+b,0)/durations.length).toFixed(3)),max_shot_sec:Number(Math.max(...durations).toFixed(3)),min_shot_sec:Number(Math.min(...durations).toFixed(3)),color_finish:true,vignette:true,audio_preserved:meta.audio===after.audio,duration_preserved:false,planned_duration_enforced:true,width:after.width,height:after.height}};
}

export const CREATIVE_SOCIAL_FINISHER_V5_CONTRACT=Object.freeze({schema_version:'5.3.0',owner_engine:'SOC-001',legacy_renderer_preserved:true,legacy_prerender_min_scene_sec:2,native_recut:true,planned_duration_enforced:true,per_shot_camera_motion:true,camera_profiles:['PUSH_IN','PULL_OUT','PAN_LEFT','PAN_RIGHT','TILT_DOWN','TILT_UP','ORBIT_LEFT','ORBIT_RIGHT','HANDHELD_MICRO','LOCKED_PUNCH'],vfx_profiles:Object.keys(PHYSICAL_VFX).filter(x=>x!=='NONE'),named_vfx_match_physical_filters:true,rejects_unknown_vfx:true,ffmpeg_portable_filter_literals:true,audio_passthrough:true,publication_authority:false,additional_cost_eur:0});