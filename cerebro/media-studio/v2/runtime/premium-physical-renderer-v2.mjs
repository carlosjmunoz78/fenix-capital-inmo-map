import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RUNTIME_DIR = path.dirname(fileURLToPath(import.meta.url));

function text(v){ return String(v ?? '').trim(); }
function clamp(n,min,max){ return Math.min(max, Math.max(min,n)); }
function sha256(buffer){ return crypto.createHash('sha256').update(buffer).digest('hex'); }
async function sha256File(file){ return sha256(await fs.readFile(file)); }

function run(bin,args,{cwd,env,allowFailure=false}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(bin,args,{cwd,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});
    let stdout=''; let stderr='';
    child.stdout.on('data',d=>stdout+=d.toString());
    child.stderr.on('data',d=>stderr+=d.toString());
    child.on('error',reject);
    child.on('close',code=>{
      const result={code,stdout,stderr};
      if(code===0||allowFailure) return resolve(result);
      const err=new Error(`COMMAND_FAILED:${bin}:${code}`); err.result=result; reject(err);
    });
  });
}

async function exists(file){ try{ await fs.access(file); return true; } catch{ return false; } }

async function fetchToFile(url,file,fetchImpl=fetch){
  const response=await fetchImpl(url,{redirect:'follow'});
  if(!response.ok) throw new Error(`ASSET_FETCH_FAILED:${response.status}:${url}`);
  const buffer=Buffer.from(await response.arrayBuffer());
  if(buffer.length<512) throw new Error(`ASSET_FETCH_TOO_SMALL:${url}`);
  await fs.writeFile(file,buffer);
  return {bytes:buffer.length,sha256:sha256(buffer),source_url:url};
}

async function detectFont(){
  const r=await run('fc-match',['Montserrat','-f','%{file}']);
  const candidate=text(r.stdout);
  if(candidate && await exists(candidate)) return candidate;
  const fallbacks=['/usr/share/fonts/truetype/montserrat/Montserrat-SemiBold.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'];
  for(const file of fallbacks) if(await exists(file)) return file;
  throw new Error('FONT_NOT_FOUND');
}

async function ffmpeg(args,cwd){ return await run('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{cwd}); }

async function makeStillShot({input,output,duration,variant=0}){
  const xAmp=[34,-48,56][variant%3];
  const yAmp=[64,36,-54][variant%3];
  const vf=[
    'scale=1240:2204:force_original_aspect_ratio=increase',
    `crop=1080:1920:x='(iw-ow)/2+${xAmp}*sin(t*0.72+${variant})':y='(ih-oh)/2+${yAmp}*sin(t*0.43+${variant*0.6})'`,
    'eq=contrast=1.08:saturation=0.94:brightness=-0.015',
    'vignette=PI/5.2',
    `fade=t=in:st=0:d=0.24,fade=t=out:st=${Math.max(0.1,duration-0.24).toFixed(2)}:d=0.24`,
    'format=yuv420p'
  ].join(',');
  await ffmpeg(['-loop','1','-framerate','24','-i',input,'-t',String(duration),'-vf',vf,'-r','24','-an','-c:v','libx264','-preset','medium','-crf','17',output]);
}

async function makeEndCard({logo,output,duration}){
  const filter=[
    '[0:v]format=rgba,scale=720:-2[logo]',
    `[1:v][logo]overlay=(W-w)/2:(H-h)/2-80:format=auto,fade=t=in:st=0:d=0.35,fade=t=out:st=${Math.max(0.1,duration-0.35).toFixed(2)}:d=0.35,format=yuv420p[v]`
  ].join(';');
  await ffmpeg(['-loop','1','-framerate','24','-i',logo,'-f','lavfi','-i',`color=c=0x171717:s=1080x1920:r=24:d=${duration}`,'-filter_complex',filter,'-map','[v]','-t',String(duration),'-r','24','-an','-c:v','libx264','-preset','medium','-crf','16',output]);
}

async function makeBlenderShot({blenderBin,outputDir,output}){
  const frames=path.join(outputDir,'blender');
  await fs.mkdir(frames,{recursive:true});
  const script=path.join(RUNTIME_DIR,'bm13-fenix-cinematic-scene.py');
  const result=await run(blenderBin,['--background','--factory-startup','--python',script,'--',frames]);
  if(!result.stdout.includes('BM13_BLEND_RENDER_COMPLETE')) throw new Error('BLENDER_RENDER_COMPLETION_MARKER_MISSING');
  const pattern=path.join(frames,'frame_%04d.png');
  await ffmpeg(['-framerate','24','-start_number','1','-i',pattern,'-vf','scale=1080:1920:flags=lanczos,eq=contrast=1.04:saturation=1.02,format=yuv420p','-r','24','-an','-c:v','libx264','-preset','medium','-crf','16',output]);
  return {blend_path:path.join(frames,'bm13_fenix_scene.blend'),blender_stdout:result.stdout.slice(-4000)};
}

async function concatShots(shots,output){
  const list=shots.map(s=>`file '${s.replaceAll("'","'\\''")}'`).join('\n')+'\n';
  const listPath=path.join(path.dirname(output),'concat.txt');
  await fs.writeFile(listPath,list);
  await ffmpeg(['-f','concat','-safe','0','-i',listPath,'-c','copy',output]);
}

async function addTitles({input,output,font}){
  const escFont=font.replaceAll('\\','/').replaceAll(':','\\:').replaceAll("'","\\'");
  const common=`fontfile='${escFont}':fontcolor=white:shadowcolor=black@0.55:shadowx=0:shadowy=4`;
  const vf=[
    `drawtext=${common}:text='TU CASA NO DEBERÍA':fontsize=70:x=(w-text_w)/2:y=235:enable='between(t,0.45,2.75)'`,
    `drawtext=${common}:text='DEPENDER DE IMPROVISAR':fontsize=56:x=(w-text_w)/2:y=325:enable='between(t,0.72,2.75)'`,
    `drawtext=${common}:text='CRITERIO · DOCUMENTACIÓN · ACOMPAÑAMIENTO':fontsize=34:x=(w-text_w)/2:y=h-315:enable='between(t,10.25,12.45)'`,
    `drawtext=${common}:text='FÉNIX CAPITAL · HIPOTECAS EN CÓRDOBA':fontsize=38:x=(w-text_w)/2:y=h-310:enable='between(t,12.7,14.8)'`,
    'fade=t=out:st=14.72:d=0.28,format=yuv420p'
  ].join(',');
  await ffmpeg(['-i',input,'-vf',vf,'-an','-c:v','libx264','-preset','slow','-crf','16',output]);
}

async function makeAudio(output,duration=15){
  const d=Number(duration).toFixed(3);
  const fc=[
    '[0:a]volume=0.055,lowpass=f=180[a0]',
    '[1:a]volume=0.026,lowpass=f=680[a1]',
    '[2:a]highpass=f=160,lowpass=f=3800,volume=0.025[a2]',
    '[3:a]volume=0.14,afade=t=out:st=0.22:d=0.28,adelay=2800|2800[i1]',
    '[4:a]volume=0.13,afade=t=out:st=0.22:d=0.28,adelay=5850|5850[i2]',
    '[5:a]volume=0.16,afade=t=out:st=0.25:d=0.35,adelay=9850|9850[i3]',
    '[a0][a1][a2][i1][i2][i3]amix=inputs=6:normalize=0,acompressor=threshold=-18dB:ratio=3:attack=20:release=250,afade=t=in:st=0:d=0.75,afade=t=out:st=13.8:d=1.2,alimiter=limit=0.86[a]'
  ].join(';');
  await ffmpeg([
    '-f','lavfi','-i',`sine=frequency=55:sample_rate=48000:duration=${d}`,
    '-f','lavfi','-i',`sine=frequency=110:sample_rate=48000:duration=${d}`,
    '-f','lavfi','-i',`anoisesrc=color=pink:sample_rate=48000:duration=${d}:amplitude=0.07`,
    '-f','lavfi','-i','sine=frequency=62:sample_rate=48000:duration=0.5',
    '-f','lavfi','-i','sine=frequency=54:sample_rate=48000:duration=0.5',
    '-f','lavfi','-i','sine=frequency=46:sample_rate=48000:duration=0.6',
    '-filter_complex',fc,'-map','[a]','-c:a','aac','-b:a','192k',output
  ]);
}

async function mux({video,audio,output}){
  await ffmpeg(['-i',video,'-i',audio,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart',output]);
}

async function contactSheet({video,output}){
  await ffmpeg(['-i',video,'-vf',"fps=0.8,scale=270:480:force_original_aspect_ratio=decrease,pad=270:480:(ow-iw)/2:(oh-ih)/2:color=0x111111,tile=4x3",'-frames:v','1','-q:v','2',output]);
}

async function ffprobeJson(file){
  const r=await run('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file]);
  return JSON.parse(r.stdout);
}

async function technicalQa(video){
  const probe=await ffprobeJson(video);
  const v=probe.streams.find(s=>s.codec_type==='video');
  const a=probe.streams.find(s=>s.codec_type==='audio');
  const duration=Number(probe.format?.duration||v?.duration||0);
  const reasons=[];
  if(v?.codec_name!=='h264') reasons.push('VIDEO_CODEC_NOT_H264');
  if(Number(v?.width)!==1080||Number(v?.height)!==1920) reasons.push('VIDEO_GEOMETRY_NOT_1080X1920');
  if(!(duration>=14.6&&duration<=15.4)) reasons.push(`DURATION_OUT_OF_RANGE:${duration}`);
  if(!a) reasons.push('AUDIO_STREAM_MISSING');
  const black=await run('ffmpeg',['-hide_banner','-i',video,'-vf','blackdetect=d=0.45:pix_th=0.08','-an','-f','null','-'],{allowFailure:true});
  const blackSegments=(black.stderr.match(/black_start:/g)||[]).length;
  if(blackSegments>1) reasons.push(`BLACK_SEGMENTS:${blackSegments}`);
  return {status:reasons.length?'FAIL':'PASS',reasons,probe,black_segments:blackSegments,duration_sec:duration,width:Number(v?.width||0),height:Number(v?.height||0),video_codec:v?.codec_name||null,audio_codec:a?.codec_name||null};
}

export async function probePremiumPhysicalRenderer({blender_bin=process.env.BLENDER_BIN||'blender'}={}){
  const checks={};
  for(const [name,bin,args] of [['ffmpeg','ffmpeg',['-version']],['ffprobe','ffprobe',['-version']],['fontconfig','fc-match',['Montserrat']],['blender',blender_bin,['--version']]]){
    try{ const r=await run(bin,args); checks[name]={status:'PASS',detail:text(r.stdout.split('\n')[0]||r.stderr.split('\n')[0])}; }
    catch(error){ checks[name]={status:'FAIL',detail:String(error.message)}; }
  }
  return Object.freeze({status:Object.values(checks).every(x=>x.status==='PASS')?'PASS':'FAIL',checks});
}

export async function renderPremiumPhysicalVideo(job,{fetch_impl=fetch,blender_bin=process.env.BLENDER_BIN||'blender',work_dir='',export_dir=''}={}){
  const request=job?.request??job;
  if(String(request?.environment||job?.environment||'').toUpperCase()!=='PREPROD') throw new Error('PREMIUM_PHYSICAL_RENDERER_PREPROD_ONLY');
  if(String(request?.engine_id||job?.engine_id)!=='UMS-001') throw new Error('PREMIUM_PHYSICAL_RENDERER_ENGINE_SCOPE');
  const startedAt=new Date().toISOString();
  const payload=request?.creative_payload||{};
  const assets=Array.isArray(payload.assets)?payload.assets.filter(a=>text(a?.url)):[];
  if(assets.length<3) throw new Error('PREMIUM_PHYSICAL_RENDERER_REQUIRES_3_OWNED_ASSETS');
  const logoUrl=text(payload.brand?.logo_url);
  if(!logoUrl) throw new Error('PREMIUM_PHYSICAL_RENDERER_LOGO_REQUIRED');

  const temp=work_dir?path.resolve(work_dir):await fs.mkdtemp(path.join(os.tmpdir(),'cerebro-ums-premium-v2-'));
  await fs.mkdir(temp,{recursive:true});
  const sourceDir=path.join(temp,'sources'); const shotsDir=path.join(temp,'shots');
  await fs.mkdir(sourceDir,{recursive:true}); await fs.mkdir(shotsDir,{recursive:true});
  const sourceEvidence=[]; const sourceFiles=[];
  for(let i=0;i<3;i++){
    const ext=path.extname(new URL(assets[i].url).pathname)||'.img';
    const file=path.join(sourceDir,`source_${i+1}${ext}`);
    sourceEvidence.push({...await fetchToFile(assets[i].url,file,fetch_impl),scene_role:assets[i].scene_role||null,rights:assets[i].source_rights||null});
    sourceFiles.push(file);
  }
  const logoExt=path.extname(new URL(logoUrl).pathname)||'.png';
  const logo=path.join(sourceDir,`logo${logoExt}`);
  sourceEvidence.push({...await fetchToFile(logoUrl,logo,fetch_impl),scene_role:'brand_logo',rights:'FENIX_OWNED_OR_AUTHORIZED'});

  const probe=await probePremiumPhysicalRenderer({blender_bin});
  if(probe.status!=='PASS') throw new Error(`PREMIUM_PHYSICAL_RENDERER_PROBE_FAILED:${JSON.stringify(probe.checks)}`);
  const font=await detectFont();
  const shot1=path.join(shotsDir,'01-human.mp4'); const shot2=path.join(shotsDir,'02-docs.mp4');
  const shot3=path.join(shotsDir,'03-vfx.mp4'); const shot4=path.join(shotsDir,'04-home.mp4'); const shot5=path.join(shotsDir,'05-endcard.mp4');
  await makeStillShot({input:sourceFiles[0],output:shot1,duration:3.0,variant:0});
  await makeStillShot({input:sourceFiles[1],output:shot2,duration:3.0,variant:1});
  const blenderEvidence=await makeBlenderShot({blenderBin:blender_bin,outputDir:temp,output:shot3});
  await makeStillShot({input:sourceFiles[2],output:shot4,duration:2.5,variant:2});
  await makeEndCard({logo,output:shot5,duration:2.5});

  const picture=path.join(temp,'picture.mp4'); await concatShots([shot1,shot2,shot3,shot4,shot5],picture);
  const titled=path.join(temp,'picture-titled.mp4'); await addTitles({input:picture,output:titled,font});
  const audio=path.join(temp,'score.m4a'); await makeAudio(audio,15);
  const final=path.join(temp,'FENIX_CAPITAL_BM13_PREMIUM_PHYSICAL_V2.mp4'); await mux({video:titled,audio,output:final});
  const sheet=path.join(temp,'FENIX_CAPITAL_BM13_CONTACT_SHEET.jpg'); await contactSheet({video:final,output:sheet});
  const qa=await technicalQa(final);
  if(qa.status!=='PASS') throw new Error(`PREMIUM_TECHNICAL_QA_FAILED:${qa.reasons.join(',')}`);
  const finalStat=await fs.stat(final); const sheetStat=await fs.stat(sheet);
  const finalSha=await sha256File(final); const sheetSha=await sha256File(sheet);
  const evidencePath=path.join(temp,'FENIX_CAPITAL_BM13_EVIDENCE.json');
  const evidence={schema_version:'2.0.0',engine_id:'UMS-001',environment:'PREPROD',production_id:request.audit_id||request.idempotency_key,renderer:'PREMIUM_PHYSICAL_RENDERER_V2',renderer_version:'2.0.0',physical_execution:true,blender:{version:'5.2.3',binary:blender_bin,scene_blend:blenderEvidence.blend_path},ffmpeg:{mode:'physical_cli'},sources:sourceEvidence,technical_qa:qa,review_frame_count:12,artifact_sha256:finalSha,artifact_bytes:finalStat.size,duration_sec:qa.duration_sec,width:qa.width,height:qa.height,audio_present:true,additional_cost_eur:0,procedural_frame_ratio_estimate:4/15,rights_scope:'FENIX_OWNED_OR_AUTHORIZED_ASSETS_ONLY',publish_authorized:false,bm13_status:'NOT_PASSED_PENDING_INDEPENDENT_CREATIVE_TRIBUNAL',started_at:startedAt,ended_at:new Date().toISOString()};
  await fs.writeFile(evidencePath,JSON.stringify(evidence,null,2));
  if(export_dir){ await fs.mkdir(export_dir,{recursive:true}); for(const f of [final,sheet,evidencePath]) await fs.copyFile(f,path.join(export_dir,path.basename(f))); }
  return Object.freeze({temp,technical:qa,provenance:evidence,artifacts:Object.freeze([
    {filename:path.basename(final),mime:'video/mp4',local_path:final,bytes:finalStat.size,sha256:finalSha,width:qa.width,height:qa.height,duration_sec:qa.duration_sec,review_frame_count:12},
    {filename:path.basename(sheet),mime:'image/jpeg',local_path:sheet,bytes:sheetStat.size,sha256:sheetSha,width:1080,height:1440,review_frame_count:12},
    {filename:path.basename(evidencePath),mime:'application/json',local_path:evidencePath,bytes:(await fs.stat(evidencePath)).size,sha256:await sha256File(evidencePath)}
  ])});
}

export const PREMIUM_PHYSICAL_RENDERER_V2_CONTRACT=Object.freeze({schema_version:'2.0.0',engine_id:'UMS-001',environment:'PREPROD',renderer_id:'PREMIUM_PHYSICAL_RENDERER_V2',runtime:['Blender 5.2.3','FFmpeg','Node.js'],output:'1080x1920 H.264 + AAC',target_duration_sec:15,rights_policy:'OWNED_OR_AUTHORIZED_ASSETS_ONLY',additional_cost_eur:0,publish_authorized:false,fail_closed:true,bm13_acceptance:'PENDING_INDEPENDENT_CREATIVE_TRIBUNAL'});
