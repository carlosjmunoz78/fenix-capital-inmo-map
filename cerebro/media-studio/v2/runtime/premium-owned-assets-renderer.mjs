import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync=promisify(execFile);
const OWNED_HOSTS=new Set(['fenixcapital.es','www.fenixcapital.es','staging.fenixcapital.es']);
const WIDTH=1080;
const HEIGHT=1920;
const FPS=30;
const TRANSITION=0.35;

function hash(buffer){return crypto.createHash('sha256').update(buffer).digest('hex');}
function required(value,name){if(value===undefined||value===null||String(value).trim()==='')throw new Error(`MISSING_${name}`);return value;}
function drawText(value){return String(value??'').replaceAll('\\','\\\\').replaceAll("'","\\'").replaceAll(':','\\:').replaceAll('%','\\%').replace(/[\r\n]+/g,' ').slice(0,180);}
function ownedUrl(raw){const u=new URL(String(raw));if(u.protocol!=='https:'||!OWNED_HOSTS.has(u.hostname))throw new Error('UMS_ASSET_SOURCE_NOT_OWNED');return u;}
async function run(bin,args){return execFileAsync(bin,args,{maxBuffer:20*1024*1024});}

async function downloadAsset(url,temp,index,fetch_impl=fetch){
  const parsed=ownedUrl(url);
  const response=await fetch_impl(parsed,{redirect:'error'});
  if(!response.ok)throw new Error(`UMS_ASSET_FETCH_FAILED:${response.status}`);
  const mime=String(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
  if(!['image/jpeg','image/png','image/webp'].includes(mime))throw new Error(`UMS_ASSET_MIME_DENIED:${mime}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length<4096||bytes.length>12*1024*1024)throw new Error('UMS_ASSET_SIZE_DENIED');
  const ext=mime==='image/png'?'.png':mime==='image/webp'?'.webp':'.jpg';
  const file=path.join(temp,`asset-${String(index).padStart(2,'0')}${ext}`);
  await fs.writeFile(file,bytes);
  return {url:parsed.toString(),mime,local_path:file,bytes:bytes.length,sha256:hash(bytes)};
}

async function createPhotoSegment({asset,caption,index,duration,font,temp}){
  const out=path.join(temp,`segment-${String(index+1).padStart(2,'0')}.mp4`);
  const zoom=index%2===0?"min(zoom+0.00075,1.075)":"min(zoom+0.00055,1.06)";
  const x=index%3===0?"iw/2-(iw/zoom/2)":"iw/2-(iw/zoom/2)+(iw-iw/zoom)*0.08";
  const y=index%2===0?"ih/2-(ih/zoom/2)":"ih/2-(ih/zoom/2)-(ih-ih/zoom)*0.06";
  const vf=[
    `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase`,
    `crop=${WIDTH}:${HEIGHT}`,
    `zoompan=z='${zoom}':x='${x}':y='${y}':d=1:s=${WIDTH}x${HEIGHT}:fps=${FPS}`,
    'eq=contrast=1.035:saturation=1.06:brightness=-0.015',
    'vignette=PI/5',
    'drawbox=x=0:y=0:w=12:h=ih:color=0xFF5F00@0.95:t=fill',
    `drawtext=fontfile='${font}':text='FÉNIX CAPITAL':fontcolor=white@0.92:fontsize=31:x=64:y=72:shadowcolor=black@0.55:shadowx=2:shadowy=2`,
    `drawtext=fontfile='${font}':text='${drawText(caption)}':fontcolor=white:fontsize=48:line_spacing=10:x=64:y=h-235:box=1:boxcolor=0x111111@0.52:boxborderw=22:shadowcolor=black@0.55:shadowx=2:shadowy=2`,
    'format=yuv420p'
  ].join(',');
  await run('ffmpeg',['-hide_banner','-loglevel','error','-loop','1','-framerate',String(FPS),'-i',asset.local_path,'-t',String(duration),'-vf',vf,'-r',String(FPS),'-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-an','-movflags','+faststart','-y',out]);
  return out;
}

async function createEndCard({logo,duration,font,temp}){
  const out=path.join(temp,'segment-end.mp4');
  const filter=[
    `[1:v]scale=760:-2[logo]`,
    `[0:v]drawbox=x=0:y=0:w=iw:h=18:color=0xFF5F00:t=fill,drawbox=x=0:y=18:w=iw:h=10:color=0xFFB71B:t=fill[base]`,
    `[base][logo]overlay=(W-w)/2:(H-h)/2-210:format=auto[v1]`,
    `[v1]drawtext=fontfile='${font}':text='Hipotecas en Córdoba':fontcolor=white:fontsize=54:x=(w-text_w)/2:y=h-430,drawtext=fontfile='${font}':text='Financiación preparada con criterio':fontcolor=white@0.82:fontsize=34:x=(w-text_w)/2:y=h-345,format=yuv420p[v]`
  ].join(';');
  await run('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i',`color=c=0x222222:s=${WIDTH}x${HEIGHT}:r=${FPS}:d=${duration}`,'-loop','1','-i',logo.local_path,'-filter_complex',filter,'-map','[v]','-t',String(duration),'-r',String(FPS),'-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-an','-movflags','+faststart','-y',out]);
  return out;
}

async function joinWithTransitions(segments,durations,temp){
  const out=path.join(temp,'picture-lock.mp4');
  const args=['-hide_banner','-loglevel','error'];
  for(const segment of segments)args.push('-i',segment);
  const filters=[];
  let previous='0:v';
  let offset=durations[0]-TRANSITION;
  for(let i=1;i<segments.length;i++){
    const target=`vx${i}`;
    filters.push(`[${previous}][${i}:v]xfade=transition=fade:duration=${TRANSITION}:offset=${offset.toFixed(2)}[${target}]`);
    previous=target;
    if(i<segments.length-1)offset+=durations[i]-TRANSITION;
  }
  const total=durations.reduce((a,b)=>a+b,0)-TRANSITION*(durations.length-1);
  args.push('-filter_complex',filters.join(';'),'-map',`[${previous}]`,'-t',total.toFixed(2),'-r',String(FPS),'-c:v','libx264','-preset','medium','-crf','19','-pix_fmt','yuv420p','-an','-movflags','+faststart','-y',out);
  await run('ffmpeg',args);
  return {path:out,duration_sec:Number(total.toFixed(2))};
}

async function synthesizeVoice(text,temp){
  const bin=required(process.env.CEREBRO_PIPER_BIN,'CEREBRO_PIPER_BIN');
  const model=required(process.env.CEREBRO_PIPER_MODEL,'CEREBRO_PIPER_MODEL');
  const config=required(process.env.CEREBRO_PIPER_CONFIG,'CEREBRO_PIPER_CONFIG');
  const out=path.join(temp,'voice.wav');
  await new Promise((resolve,reject)=>{
    const child=execFile(bin,['--model',model,'--config',config,'--speaker','1','--output_file',out],{maxBuffer:10*1024*1024},error=>error?reject(error):resolve());
    child.stdin?.end(`${String(text).trim()}\n`);
  });
  const stat=await fs.stat(out);if(stat.size<2048)throw new Error('UMS_VOICE_OUTPUT_INVALID');
  return out;
}

async function createTonalBed(duration,temp){
  const out=path.join(temp,'tonal-bed.wav');
  const fadeOut=Math.max(0,duration-2.0);
  await run('ffmpeg',['-hide_banner','-loglevel','error',
    '-f','lavfi','-i',`sine=frequency=110:sample_rate=44100:duration=${duration}`,
    '-f','lavfi','-i',`sine=frequency=164.81:sample_rate=44100:duration=${duration}`,
    '-f','lavfi','-i',`anoisesrc=color=pink:amplitude=0.02:sample_rate=44100:duration=${duration}`,
    '-filter_complex',`[0:a]volume=0.014[a0];[1:a]volume=0.007[a1];[2:a]lowpass=f=550,volume=0.004[a2];[a0][a1][a2]amix=inputs=3:normalize=0,afade=t=in:st=0:d=1.2,afade=t=out:st=${fadeOut}:d=2[bed]`,
    '-map','[bed]','-c:a','pcm_s16le','-y',out]);
  return out;
}

async function mixAudio({video,voice,bed,duration,temp}){
  const out=path.join(temp,'fenix-premium-trial.mp4');
  await run('ffmpeg',['-hide_banner','-loglevel','error','-i',video,'-i',voice,'-i',bed,
    '-filter_complex','[1:a]volume=1.10,apad[v];[2:a]volume=0.72[b];[v][b]amix=inputs=2:duration=first:dropout_transition=2,alimiter=limit=0.94[a]',
    '-map','0:v:0','-map','[a]','-t',String(duration),'-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart','-y',out]);
  return out;
}

async function extractQaSheet(video,temp){
  const out=path.join(temp,'qa-frames-8.png');
  await run('ffmpeg',['-hide_banner','-loglevel','error','-i',video,'-vf','fps=0.54,scale=270:480:force_original_aspect_ratio=decrease,pad=270:480:(ow-iw)/2:(oh-ih)/2:color=black,tile=4x2','-frames:v','1','-y',out]);
  return out;
}

async function probeVideo(video){
  const {stdout}=await run('ffprobe',['-v','error','-show_entries','stream=index,codec_type,codec_name,width,height:format=duration','-of','json',video]);
  const parsed=JSON.parse(stdout);const videoStream=parsed.streams?.find(x=>x.codec_type==='video');const audioStream=parsed.streams?.find(x=>x.codec_type==='audio');
  if(videoStream?.codec_name!=='h264'||videoStream?.width!==WIDTH||videoStream?.height!==HEIGHT||audioStream?.codec_name!=='aac')throw new Error('UMS_TECHNICAL_QA_FAILED');
  return {duration_sec:Number(Number(parsed.format?.duration??0).toFixed(2)),video_codec:videoStream.codec_name,audio_codec:audioStream.codec_name,width:videoStream.width,height:videoStream.height};
}

async function artifact(file,mime,extra={}){const buffer=await fs.readFile(file);return {filename:path.basename(file),mime,local_path:file,bytes:buffer.length,sha256:hash(buffer),...extra};}

export async function renderOwnedAssetsPremiumVideo(job,{fetch_impl=fetch}={}){
  const request=job?.request??{};const payload=request.creative_payload??{};
  if(job.engine_id!=='UMS-001'||job.environment!=='PREPROD'||request.kind!=='cerebro.ums.production_order.v1')throw new Error('UMS_RENDER_SCOPE_DENIED');
  if(request.publish_requested===true||Number(request.expected_cost_eur??0)!==0)throw new Error('UMS_RENDER_AUTHORITY_DENIED');
  if(payload.legacy_programmatic_renderer_allowed!==false)throw new Error('UMS_LEGACY_RENDERER_MUST_BE_FALSE');
  const assets=Array.isArray(payload.assets)?payload.assets:[];if(assets.length<4)throw new Error('UMS_REAL_ASSETS_MIN_4');
  const font=required(process.env.CEREBRO_MONTSERRAT_FONT,'CEREBRO_MONTSERRAT_FONT');
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'cerebro-ums-premium-'));
  try{
    const downloaded=[];
    for(let i=0;i<assets.length;i++)downloaded.push({...await downloadAsset(assets[i].url,temp,i,fetch_impl),asset_class:String(assets[i].asset_class??''),role:String(assets[i].role??'')});
    const logo=await downloadAsset(required(payload.logo_url,'UMS_LOGO_URL'),temp,99,fetch_impl);
    const photoDuration=3.4;const endDuration=2.6;
    const segments=[];const durations=[];
    for(let i=0;i<4;i++){segments.push(await createPhotoSegment({asset:downloaded[i],caption:assets[i].caption??'',index:i,duration:photoDuration,font,temp}));durations.push(photoDuration);}
    segments.push(await createEndCard({logo,duration:endDuration,font,temp}));durations.push(endDuration);
    const picture=await joinWithTransitions(segments,durations,temp);
    const voice=await synthesizeVoice(required(payload.voice?.text,'UMS_VOICE_TEXT'),temp);
    const bed=await createTonalBed(picture.duration_sec,temp);
    const finalVideo=await mixAudio({video:picture.path,voice,bed,duration:picture.duration_sec,temp});
    const technical=await probeVideo(finalVideo);
    const qaSheet=await extractQaSheet(finalVideo,temp);
    const videoArtifact=await artifact(finalVideo,'video/mp4',{width:WIDTH,height:HEIGHT,duration_sec:technical.duration_sec});
    const qaArtifact=await artifact(qaSheet,'image/png',{review_frame_count:8});
    return {
      temp,
      artifacts:[videoArtifact,qaArtifact],
      technical,
      provenance:{
        renderer:'UMS_OWNED_ASSETS_CINEMATIC_V1',
        legacy_programmatic_renderer:false,
        asset_sources:downloaded.map(x=>({url:x.url,sha256:x.sha256,bytes:x.bytes,asset_class:x.asset_class,role:x.role})),
        logo:{url:logo.url,sha256:logo.sha256},
        execution:[
          {discipline:'creative_direction',role:'Creative Direction',evidence:'governed production order + premium brief'},
          {discipline:'visual_generation',role:'Asset Production',tool:'owned Fénix real photography',evidence:'source URL + SHA256 per asset'},
          {discipline:'camera_or_animation',role:'Camera Language',tool:'FFmpeg zoom/pan/full-bleed cinematic framing',evidence:'physical MP4'},
          {discipline:'edit',role:'Editing',tool:'FFmpeg xfade/picture lock',evidence:'physical MP4'},
          {discipline:'sound',role:'Audio Post',tool:'Pinned Piper voice + FFmpeg original tonal bed',evidence:'AAC audio track'},
          {discipline:'independent_qa',role:'Technical QA',tool:'ffprobe + 8-frame review sheet',evidence:'qa-frames-8.png'}
        ],
        voice:{provider:'PIPER_PINNED_FALLBACK',model:'es_ES-sharvard-medium'},
        sound_design:{provider:'FFMPEG_ORIGINAL_TONAL_BED',music_claim:false},
        creative_acceptance:'OWNER_REVIEW_REQUIRED',
        human_exception_reason:'CUSTOMER_HUMAN_REQUEST',
        additional_cost_eur:0,
        publish_authorized:false
      }
    };
  }catch(error){await fs.rm(temp,{recursive:true,force:true});throw error;}
}

export const UMS_OWNED_ASSETS_RENDERER_CONTRACT=Object.freeze({
  schema_version:'1.0.0',engine_id:'UMS-001',environment:'PREPROD',output:'REEL',
  owned_hosts:[...OWNED_HOSTS],real_assets_min:4,legacy_programmatic_renderer_allowed:false,
  additional_cost_eur:0,publish_authorized:false,creative_acceptance:'OWNER_REVIEW_REQUIRED'
});
