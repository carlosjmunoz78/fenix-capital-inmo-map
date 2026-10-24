import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync=promisify(execFile);
const SAFE_COLOR=/^#[0-9a-fA-F]{6}$/;
function arr(v){return Array.isArray(v)?v:[]}
function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function ffColor(v){const s=String(v||'#f47b20');if(!SAFE_COLOR.test(s))throw new Error('VISUAL_FINISHER_ACCENT_DENIED');return `0x${s.slice(1)}`}
async function probe(file){const {stdout}=await execFileAsync('ffprobe',['-v','error','-show_entries','format=duration','-show_entries','stream=codec_type,width,height','-of','json',file]);const p=JSON.parse(stdout),v=arr(p.streams).find(x=>x.codec_type==='video');if(!v)throw new Error('VISUAL_FINISHER_VIDEO_STREAM_REQUIRED');const duration=Number(p.format?.duration||0);if(!(duration>0))throw new Error('VISUAL_FINISHER_DURATION_INVALID');return {duration,width:Number(v.width),height:Number(v.height),audio:arr(p.streams).some(x=>x.codec_type==='audio')}}
function sceneStarts(scenes,overlap){let cursor=0;const starts=[];for(let i=0;i<scenes.length;i++){starts.push(cursor);cursor+=Math.max(1,Number(obj(scenes[i]).duration_sec||obj(scenes[i]).duration||3));if(i<scenes.length-1)cursor-=overlap}return starts}
function f(v){return Number(v).toFixed(3).replace(/0+$/,'').replace(/\.$/,'')}

export async function finishCreativeVideoV3({videoFile,scenes,temp,accent='#f47b20',transitionOverlapSec=.55}){
  const meta=await probe(videoFile),sceneList=arr(scenes);if(!sceneList.length)throw new Error('VISUAL_FINISHER_SCENES_REQUIRED');const starts=sceneStarts(sceneList,transitionOverlapSec),accentColor=ffColor(accent);
  const filters=[
    'eq=contrast=1.035:saturation=1.045:brightness=-0.006',
    'unsharp=5:5:0.28:5:5:0.0',
    'vignette=PI/6:eval=frame',
    'noise=alls=0.9:allf=t'
  ];
  for(let i=0;i<starts.length;i++){
    const s=starts[i],barEnd=Math.min(meta.duration,s+.42),sweepEnd=Math.min(meta.duration,s+.48);
    filters.push(`drawbox=x=0:y=0:w='iw*min(max((t-${f(s)})/0.22,0),1)':h=8:color=${accentColor}@0.92:t=fill:enable='between(t,${f(s)},${f(barEnd)})'`);
    filters.push(`drawbox=x=0:y=0:w=10:h='ih*min(max((t-${f(s)})/0.30,0),1)':color=${accentColor}@0.70:t=fill:enable='between(t,${f(s)},${f(barEnd)})'`);
    filters.push(`drawbox=x='-180+(iw+360)*min(max((t-${f(s)})/0.46,0),1)':y=0:w=180:h=ih:color=white@0.035:t=fill:enable='between(t,${f(s)},${f(sweepEnd)})'`);
    if(i>0){const flashEnd=Math.min(meta.duration,s+.075);filters.push(`drawbox=x=0:y=0:w=iw:h=ih:color=white@0.045:t=fill:enable='between(t,${f(s)},${f(flashEnd)})'`)}
  }
  const out=path.join(temp,`visual-finished-v3-${path.basename(videoFile)}`);
  const args=['-hide_banner','-loglevel','error','-i',videoFile,'-vf',filters.join(','),'-map','0:v:0'];if(meta.audio)args.push('-map','0:a:0');args.push('-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p');if(meta.audio)args.push('-c:a','copy');args.push('-movflags','+faststart','-y',out);await execFileAsync('ffmpeg',args,{maxBuffer:40*1024*1024});const after=await probe(out);if(Math.abs(after.duration-meta.duration)>.12)throw new Error(`VISUAL_FINISHER_DURATION_DRIFT:${meta.duration}->${after.duration}`);if(meta.audio&&!after.audio)throw new Error('VISUAL_FINISHER_AUDIO_LOST');
  return {file:out,evidence:{visual_finisher_version:'V3',visual_effect_layers:7,scene_synced_effect_events:starts.length,accent_sweep_events:starts.length,transition_flash_events:Math.max(0,starts.length-1),color_finish:true,vignette:true,micro_grain:true,audio_preserved:meta.audio===after.audio,duration_preserved:true,width:after.width,height:after.height}};
}

export const CREATIVE_VISUAL_FINISHER_V3_CONTRACT=Object.freeze({schema_version:'3.0.0',owner_engine:'FACT-001',deterministic:true,color_finish:true,scene_synced_accent_sweeps:true,transition_flashes:true,kinetic_brand_accents:true,micro_grain:true,vignette:true,audio_passthrough:true,duration_preserving:true,additional_cost_eur:0,publish_authorized:false});
