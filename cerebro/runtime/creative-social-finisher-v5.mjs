import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
const execFileAsync=promisify(execFile);
function arr(v){return Array.isArray(v)?v:[]}
function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function f(v){return Number(v).toFixed(4).replace(/0+$/,'').replace(/\.$/,'')}
async function probe(file){const {stdout}=await execFileAsync('ffprobe',['-v','error','-show_entries','format=duration','-show_entries','stream=codec_type,width,height','-of','json',file]);const p=JSON.parse(stdout),v=arr(p.streams).find(x=>x.codec_type==='video');if(!v)throw new Error('CINEMATIC_FINISHER_VIDEO_REQUIRED');const duration=Number(p.format?.duration||0);if(!(duration>0))throw new Error('CINEMATIC_FINISHER_DURATION_INVALID');return {duration,width:Number(v.width),height:Number(v.height),audio:arr(p.streams).some(x=>x.codec_type==='audio')}}
function starts(scenes,overlap){let c=0;const out=[];for(let i=0;i<scenes.length;i++){out.push(c);c+=Math.max(.9,Number(obj(scenes[i]).duration_sec||2));if(i<scenes.length-1)c-=overlap}return out}
function zoomExpr(motion,frames){const N=Math.max(2,frames-1),cx="iw/2-(iw/zoom/2)",cy="ih/2-(ih/zoom/2)";switch(String(motion||'PUSH_IN').toUpperCase()){
  case 'PULL_OUT':return `z='1.08-0.075*on/${N}':x='${cx}':y='${cy}'`;
  case 'PAN_LEFT':return `z='1.075':x='(iw-iw/zoom)*(1-on/${N})':y='${cy}'`;
  case 'PAN_RIGHT':return `z='1.075':x='(iw-iw/zoom)*on/${N}':y='${cy}'`;
  case 'TILT_UP':return `z='1.075':x='${cx}':y='(ih-ih/zoom)*(1-on/${N})'`;
  case 'TILT_DOWN':return `z='1.075':x='${cx}':y='(ih-ih/zoom)*on/${N}'`;
  case 'ORBIT_LEFT':return `z='1.085':x='${cx}+(iw-iw/zoom)*0.25*sin(on/${N}*PI)':y='${cy}-(ih-ih/zoom)*0.18*sin(on/${N}*PI)'`;
  case 'ORBIT_RIGHT':return `z='1.085':x='${cx}-(iw-iw/zoom)*0.25*sin(on/${N}*PI)':y='${cy}+(ih-ih/zoom)*0.18*sin(on/${N}*PI)'`;
  case 'HANDHELD_MICRO':return `z='1.06':x='${cx}+(iw-iw/zoom)*0.10*sin(on*.31)':y='${cy}+(ih-ih/zoom)*0.08*cos(on*.27)'`;
  case 'LOCKED_PUNCH':return `z='1.055+0.025*sin(min(on,${N})/${N}*PI)':x='${cx}':y='${cy}'`;
  default:return `z='1.0+0.08*on/${N}':x='${cx}':y='${cy}'`;
}}
function vfxFilter(accent){switch(String(accent||'NONE').toUpperCase()){
  case 'WHIP_BLUR':return ",gblur=sigma=9:steps=2:enable='lt(t,.085)'";
  case 'MATCH_FLASH':return ",eq=brightness=.16:saturation=1.35:enable='lt(t,.06)'";
  case 'LIGHT_LEAK':return ",colorbalance=rs=.13:gs=.035:bs=-.035:enable='between(t,0,.14)'";
  case 'FOCUS_PULL':return ",gblur=sigma=5:steps=2:enable='between(t,0,.055)'";
  case 'IMPACT_ZOOM':return ",eq=contrast=1.12:saturation=1.18:enable='lt(t,.11)'";
  case 'PARALLAX_PUNCH':return ",unsharp=7:7:.65:7:7:0:enable='lt(t,.14)'";
  case 'SPEED_RAMP':return ",eq=contrast=1.08:saturation=1.12:enable='lt(t,.12)'";
  default:return '';
}}

export async function finishCreativeSocialV5({videoFile,scenes,temp,transitionOverlapSec=.55}){
  const meta=await probe(videoFile),list=arr(scenes).map(obj);if(list.length<5)throw new Error('CINEMATIC_FINISHER_SCENES_REQUIRED');const ss=starts(list,transitionOverlapSec),ends=ss.map((s,i)=>i<ss.length-1?Math.min(meta.duration,ss[i+1]):meta.duration);
  const segments=[];for(let i=0;i<ss.length;i++){const d=Math.max(.1,ends[i]-ss[i]);if(d>.15)segments.push({i,start:ss[i],end:ends[i],duration:d,scene:list[i]})}
  if(segments.length<5)throw new Error('CINEMATIC_FINISHER_SEGMENTS_TOO_FEW');
  const splitLabels=segments.map((_,i)=>`[src${i}]`).join(''),parts=[`[0:v]split=${segments.length}${splitLabels}`];
  for(let j=0;j<segments.length;j++){const s=segments[j],frames=Math.max(2,Math.round(s.duration*30)),motion=String(s.scene.camera_motion||'PUSH_IN'),vfx=String(s.scene.vfx_accent||'NONE');parts.push(`[src${j}]trim=start=${f(s.start)}:end=${f(s.end)},setpts=PTS-STARTPTS,fps=30,zoompan=${zoomExpr(motion,frames)}:d=1:s=${meta.width}x${meta.height}:fps=30${vfxFilter(vfx)},eq=contrast=1.045:saturation=1.075:brightness=-.006,vignette=PI/5,format=yuv420p[v${j}]`)}
  parts.push(`${segments.map((_,j)=>`[v${j}]`).join('')}concat=n=${segments.length}:v=1:a=0[v]`);
  const out=path.join(temp,`social-finished-v5-${path.basename(videoFile)}`),args=['-hide_banner','-loglevel','error','-i',videoFile,'-filter_complex',parts.join(';'),'-map','[v]'];if(meta.audio)args.push('-map','0:a:0');args.push('-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p');if(meta.audio)args.push('-c:a','copy');args.push('-t',String(meta.duration),'-movflags','+faststart','-y',out);await execFileAsync('ffmpeg',args,{maxBuffer:64*1024*1024});
  const after=await probe(out);if(Math.abs(after.duration-meta.duration)>.35)throw new Error(`CINEMATIC_FINISHER_DURATION_DRIFT:${meta.duration}->${after.duration}`);if(meta.audio&&!after.audio)throw new Error('CINEMATIC_FINISHER_AUDIO_LOST');
  const durations=segments.map(x=>x.duration),motions=[...new Set(segments.map(x=>String(x.scene.camera_motion||'PUSH_IN').toUpperCase()))],vfx=[...new Set(segments.map(x=>String(x.scene.vfx_accent||'NONE').toUpperCase()).filter(x=>x!=='NONE'))];
  return {file:out,evidence:{visual_finisher_version:'V5_PER_SHOT_CINEMATIC',per_shot_camera_motion:true,camera_motion_event_count:segments.length,camera_motion_profiles:motions,camera_motion_profile_count:motions.length,vfx_event_count:segments.filter(x=>String(x.scene.vfx_accent||'NONE').toUpperCase()!=='NONE').length,vfx_profiles:vfx,vfx_profile_count:vfx.length,scene_change_count:Math.max(0,segments.length-1),avg_shot_sec:Number((durations.reduce((a,b)=>a+b,0)/durations.length).toFixed(3)),max_shot_sec:Number(Math.max(...durations).toFixed(3)),min_shot_sec:Number(Math.min(...durations).toFixed(3)),color_finish:true,vignette:true,audio_preserved:meta.audio===after.audio,duration_preserved:true,width:after.width,height:after.height}};
}

export const CREATIVE_SOCIAL_FINISHER_V5_CONTRACT=Object.freeze({schema_version:'5.0.0',owner_engine:'SOC-001',per_shot_camera_motion:true,camera_profiles:['PUSH_IN','PULL_OUT','PAN_LEFT','PAN_RIGHT','TILT_DOWN','TILT_UP','ORBIT_LEFT','ORBIT_RIGHT','HANDHELD_MICRO','LOCKED_PUNCH'],vfx_profiles:['SPEED_RAMP','LIGHT_LEAK','WHIP_BLUR','PARALLAX_PUNCH','MATCH_FLASH','FOCUS_PULL','IMPACT_ZOOM'],rejects_repetitive_single_transition_language:true,duration_preserving:true,audio_passthrough:true,publication_authority:false,additional_cost_eur:0});