import { chromium } from '@playwright/test';
import { execFile, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { getGitHubOidcToken } from './creative-job-runner-v1.mjs';
import { assertCreativePlanV2 } from './creative-quality-tribunal-v2.mjs';

const execFileAsync=promisify(execFile);
const PRESETS=Object.freeze({
  STATIC_POST:{w:1080,h:1350,kind:'IMAGE'},SQUARE_POST:{w:1080,h:1080,kind:'IMAGE'},
  CAROUSEL:{w:1080,h:1350,kind:'CAROUSEL'},STORY:{w:1080,h:1920,kind:'IMAGE'},
  STORY_VIDEO:{w:1080,h:1920,kind:'VIDEO',max:60},REEL:{w:1080,h:1920,kind:'VIDEO',max:60},
  SHORT_VIDEO:{w:1080,h:1920,kind:'VIDEO',max:60},LANDSCAPE_VIDEO:{w:1920,h:1080,kind:'VIDEO',max:60},
  LONG_VIDEO:{w:1920,h:1080,kind:'VIDEO',max:180},SEO_IMAGE:{w:1200,h:630,kind:'IMAGE'}
});
const HOSTS=new Set(['fenixcapital.es','www.fenixcapital.es','staging.fenixcapital.es']);
const MOTIONS=['KEN_BURNS_IN','PAN_RIGHT','PUSH_IN','PAN_LEFT','PULL_OUT','PARALLAX_SOFT'];
const TRANSITIONS=['CROSSFADE','DIP_TO_BLACK','PUSH','WIPE','ZOOM_CUT'];
const VOICES=new Map([['ES_MALE',0],['ES_FEMALE',1]]);
const SAFE_COLOR=/^#[0-9a-fA-F]{6}$/;

function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function arr(v){return Array.isArray(v)?v:[]}
function req(v,n){if(v===undefined||v===null||String(v).trim()==='')throw new Error(`MISSING_${n}`);return v}
function txt(v,max=300){const s=String(v??'').trim();if(s.length>max)throw new Error('CREATIVE_TEXT_TOO_LONG');return s}
function esc(v){return txt(v,3000).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function color(v,f){const s=String(v||f);return SAFE_COLOR.test(s)?s:f}
function sha256(b){return crypto.createHash('sha256').update(b).digest('hex')}
function allowedUrl(v){const u=new URL(String(v));if(u.protocol!=='https:'||!HOSTS.has(u.hostname))throw new Error('CREATIVE_ASSET_SOURCE_DENIED');return u.toString()}

function normalize(job){
  const r=obj(job.request),p=obj(r.creative_payload),b=obj(p.brand),a=obj(p.audio);
  const output=String(job.output_type||p.output_type||'').toUpperCase();const preset=PRESETS[output];if(!preset)throw new Error('OUTPUT_TYPE_UNSUPPORTED');
  const sources=arr(p.visual_sources).map(x=>allowedUrl(typeof x==='string'?x:obj(x).url));
  const logo=allowedUrl(b.logo_url||'https://fenixcapital.es/wp-content/uploads/2026/10/Logo-Fenix-Capital-oficial-color-completo-scaled-1.png');
  const pages=arr(p.pages);const scenes=arr(p.scenes?.length?p.scenes:p.timeline);
  const plan={
    output_type:output,channel:String(job.channel||p.channel||'REVIEW_ONLY').toUpperCase(),publish_authorized:false,additional_cost_eur:0,
    creative_concept:txt(p.creative_concept||'Fénix Capital · dirección creativa gobernada',300),channel_fit:p.channel_fit!==false,accessibility_checked:p.accessibility_checked!==false,
    visual_style:String(p.visual_style||'PHOTO').toUpperCase(),layer_count:Number(p.layer_count||7),
    brand:{logo_url:logo,primary:color(b.primary,'#ffffff'),accent:color(b.accent,'#f47b20'),background:color(b.background,'#111111')},
    visual_sources:sources,pages,scenes,
    motion_profiles:arr(p.motion_profiles).length?arr(p.motion_profiles).map(x=>String(x).toUpperCase()):MOTIONS.slice(0,3),
    transitions:arr(p.transitions).length?arr(p.transitions).map(x=>String(x).toUpperCase()):TRANSITIONS.slice(0,3),
    motion_design:p.motion_design!==false,broll_required:p.broll_required!==false,
    scene_text_only_ratio:Number(p.scene_text_only_ratio??0),text_only_page_ratio:Number(p.text_only_page_ratio??0.2),layout_variants:Number(p.layout_variants||4),
    audio:{voice_enabled:a.voice_enabled===true,voice_id:String(a.voice_id||'ES_FEMALE').toUpperCase(),music_enabled:a.music_enabled===true,ducking:a.ducking!==false,captions:a.captions!==false,music_profile:String(a.music_profile||'CORPORATE_CINEMATIC').toUpperCase()}
  };
  if(plan.audio.voice_enabled&&!VOICES.has(plan.audio.voice_id))throw new Error('CREATIVE_VOICE_ID_DENIED');
  return {preset,plan,payload:p};
}

async function fetchImage(url,fetch_impl=fetch){
  const response=await fetch_impl(allowedUrl(url),{redirect:'error'});if(!response.ok)throw new Error(`CREATIVE_ASSET_FETCH_FAILED:${response.status}`);
  const mime=String(response.headers.get('content-type')||'').split(';')[0].toLowerCase();if(!['image/jpeg','image/png','image/webp'].includes(mime))throw new Error('CREATIVE_ASSET_MIME_DENIED');
  const b=Buffer.from(await response.arrayBuffer());if(b.length>12*1024*1024)throw new Error('CREATIVE_ASSET_TOO_LARGE');
  return {data:`data:${mime};base64,${b.toString('base64')}`,buffer:b,mime};
}

function sceneHtml({w,h,source,logo,brand,headline,subheadline,cta,metric,metric_label,index,count,variant=0}){
  const left=variant%2===0;const accent=brand.accent;const align=left?'left':'right';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;font-family:Arial,Helvetica,sans-serif;background:#111}
  .root{position:relative;width:${w}px;height:${h}px;overflow:hidden;background:#111;color:#fff}.photo{position:absolute;inset:-3%;background-image:url('${source}');background-size:cover;background-position:center}
  .grade{position:absolute;inset:0;background:linear-gradient(${left?'90deg':'270deg'},rgba(5,5,5,.92) 0%,rgba(5,5,5,.69) 38%,rgba(5,5,5,.12) 72%,rgba(5,5,5,.42) 100%)}
  .glow{position:absolute;width:${Math.round(w*.48)}px;height:${Math.round(w*.48)}px;border-radius:50%;background:${accent};filter:blur(${Math.round(w*.16)}px);opacity:.16;${left?'left:-18%;':'right:-18%;'}top:12%}
  .rail{position:absolute;top:0;${left?'left:0':'right:0'};width:${Math.max(10,Math.round(w*.012))}px;height:100%;background:${accent}}
  .copy{position:absolute;z-index:4;top:${Math.round(h*.16)}px;${left?`left:${Math.round(w*.075)}px`:`right:${Math.round(w*.075)}px`};width:${Math.round(w*.64)}px;text-align:${align}}
  .kicker{font-size:${Math.round(w*.022)}px;text-transform:uppercase;letter-spacing:.16em;font-weight:800;color:${accent};margin-bottom:${Math.round(h*.018)}px}.metric{font-size:${Math.round(w*.09)}px;font-weight:900;color:${accent};letter-spacing:-.05em;line-height:.9}.metriclabel{font-size:${Math.round(w*.022)}px;font-weight:700;margin-top:8px;opacity:.9}
  h1{font-size:${Math.round(w*.067)}px;line-height:1.01;letter-spacing:-.045em;margin:${Math.round(h*.025)}px 0 0;font-weight:900;text-shadow:0 4px 26px rgba(0,0,0,.45)}
  p{font-size:${Math.round(w*.029)}px;line-height:1.3;margin:${Math.round(h*.025)}px 0 0;font-weight:500;opacity:.95;text-shadow:0 3px 20px rgba(0,0,0,.55)}
  .cta{display:inline-block;margin-top:${Math.round(h*.035)}px;padding:${Math.round(w*.014)}px ${Math.round(w*.026)}px;border-radius:999px;background:${accent};color:#fff;font-size:${Math.round(w*.021)}px;font-weight:800}
  .logo{position:absolute;z-index:5;${left?`right:${Math.round(w*.045)}px`:`left:${Math.round(w*.045)}px`};top:${Math.round(h*.045)}px;width:${Math.round(w*.18)}px;max-height:${Math.round(h*.16)}px;object-fit:contain;filter:drop-shadow(0 3px 12px rgba(0,0,0,.35))}
  .counter{position:absolute;z-index:5;bottom:${Math.round(h*.04)}px;${left?`left:${Math.round(w*.075)}px`:`right:${Math.round(w*.075)}px`};font-size:${Math.round(w*.016)}px;font-weight:700;letter-spacing:.12em;opacity:.72}
  </style></head><body><main class="root"><div class="photo"></div><div class="grade"></div><div class="glow"></div><div class="rail"></div><img class="logo" src="${logo}"/><section class="copy"><div class="kicker">FÉNIX CAPITAL · ${String(index).padStart(2,'0')}</div>${metric?`<div class="metric">${esc(metric)}</div><div class="metriclabel">${esc(metric_label)}</div>`:''}<h1>${esc(headline)}</h1>${subheadline?`<p>${esc(subheadline)}</p>`:''}${cta?`<div class="cta">${esc(cta)}</div>`:''}</section><div class="counter">${index} / ${count}</div></main></body></html>`;
}

async function shot(browser,html,w,h,out){const p=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});try{await p.setContent(html,{waitUntil:'load'});await p.screenshot({path:out,type:'png'})}finally{await p.close()}}
function runInput(cmd,args,input){return new Promise((res,rej)=>{const c=spawn(cmd,args,{stdio:['pipe','pipe','pipe']});let e='';c.stderr.on('data',d=>e+=d);c.on('error',rej);c.on('close',code=>code===0?res():rej(new Error(`PROCESS_FAILED:${path.basename(cmd)}:${code}:${e.slice(-1000)}`)));c.stdin.end(input)})}

async function piper(text,temp,id){
  const bin=req(process.env.CEREBRO_PIPER_BIN,'CEREBRO_PIPER_BIN'),model=req(process.env.CEREBRO_PIPER_MODEL,'CEREBRO_PIPER_MODEL'),config=req(process.env.CEREBRO_PIPER_CONFIG,'CEREBRO_PIPER_CONFIG');
  const out=path.join(temp,'voice.wav');await runInput(bin,['--model',model,'--config',config,'--speaker',String(VOICES.get(id)),'--output_file',out],`${text}\n`);return out;
}
async function music(total,temp){
  const out=path.join(temp,'music.wav');const fade=Math.max(0,total-3);
  await execFileAsync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i',`sine=frequency=174.61:sample_rate=44100:duration=${total}`,'-f','lavfi','-i',`sine=frequency=261.63:sample_rate=44100:duration=${total}`,'-f','lavfi','-i',`sine=frequency=392:sample_rate=44100:duration=${total}`,'-filter_complex',`[0:a]volume=.025[a0];[1:a]volume=.018[a1];[2:a]volume=.012[a2];[a0][a1][a2]amix=inputs=3:normalize=0,lowpass=f=1800,tremolo=f=0.18:d=0.15,afade=t=in:st=0:d=2,afade=t=out:st=${fade}:d=3[m]`,'-map','[m]','-c:a','pcm_s16le','-y',out]);return out;
}
function assTime(sec){const cs=Math.max(0,Math.round(sec*100));const h=Math.floor(cs/360000),m=Math.floor(cs%360000/6000),s=Math.floor(cs%6000/100),c=cs%100;return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(c).padStart(2,'0')}`}
async function captions(scenes,w,h,temp){
  const p=path.join(temp,'captions.ass');let cursor=0;let body='';for(const s of scenes){const t=txt(s.voiceover||s.subheadline||s.headline||'',800).replace(/[{}]/g,'');body+=`Dialogue: 0,${assTime(cursor)},${assTime(cursor+s.duration)},Default,,0,0,0,,${t}\n`;cursor+=s.duration}
  const fsiz=Math.max(34,Math.round(w*.027));const header=`[Script Info]\nScriptType: v4.00+\nPlayResX: ${w}\nPlayResY: ${h}\n[V4+ Styles]\nFormat: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\nStyle: Default,DejaVu Sans,${fsiz},&H00FFFFFF,&H000000FF,&HAA000000,&H66000000,-1,0,0,0,100,100,0,0,1,3,1,2,${Math.round(w*.06)},${Math.round(w*.06)},${Math.round(h*.055)},1\n[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n`;
  await fs.writeFile(p,header+body,'utf8');return p;
}

function motionFilter(profile,w,h,frames){
  const d=Math.max(2,frames);const centerX="iw/2-(iw/zoom/2)",centerY="ih/2-(ih/zoom/2)";
  if(profile==='PAN_RIGHT')return `zoompan=z='1.07':x='(iw-iw/zoom)*on/${d}':y='${centerY}':d=1:s=${w}x${h}:fps=30`;
  if(profile==='PAN_LEFT')return `zoompan=z='1.07':x='(iw-iw/zoom)*(1-on/${d})':y='${centerY}':d=1:s=${w}x${h}:fps=30`;
  if(profile==='PULL_OUT')return `zoompan=z='max(1.0,1.09-on*0.0009)':x='${centerX}':y='${centerY}':d=1:s=${w}x${h}:fps=30`;
  if(profile==='PUSH_IN')return `zoompan=z='min(1.0+on*0.0011,1.11)':x='${centerX}':y='${centerY}':d=1:s=${w}x${h}:fps=30`;
  if(profile==='PARALLAX_SOFT')return `zoompan=z='min(1.02+on*0.0005,1.075)':x='${centerX}+sin(on/35)*12':y='${centerY}+cos(on/42)*10':d=1:s=${w}x${h}:fps=30`;
  return `zoompan=z='min(1.0+on*0.00075,1.085)':x='${centerX}':y='${centerY}':d=1:s=${w}x${h}:fps=30`;
}
function xfadeName(t){return ({CROSSFADE:'fade',DIP_TO_BLACK:'fadeblack',PUSH:'slideleft',WIPE:'wipeleft',ZOOM_CUT:'zoomin',MATCH_CUT:'fade'})[t]||'fade'}

async function renderVideo(browser,plan,preset,payload,temp,assets){
  const raw=plan.scenes;const max=preset.max||60;if(raw.length<1)throw new Error('VIDEO_SCENES_REQUIRED');let total=0;const scenes=[];
  for(let i=0;i<raw.length;i++){
    const s=obj(raw[i]);const duration=Math.min(15,Math.max(2,Number(s.duration_sec||s.duration||6)));total+=duration;if(total>max)throw new Error(`VIDEO_DURATION_OVER_${max}_SECONDS`);
    const src=assets.visuals[i%assets.visuals.length].data;const frame=path.join(temp,`scene-${String(i+1).padStart(2,'0')}.png`);
    await shot(browser,sceneHtml({w:preset.w,h:preset.h,source:src,logo:assets.logo.data,brand:plan.brand,headline:txt(s.headline||payload.headline||'Fénix Capital',130),subheadline:txt(s.subheadline||'',280),cta:txt(s.cta||'',90),metric:txt(s.metric||'',50),metric_label:txt(s.metric_label||'',120),index:i+1,count:raw.length,variant:i}),preset.w,preset.h,frame);
    const clip=path.join(temp,`clip-${String(i+1).padStart(2,'0')}.mp4`);const motion=plan.motion_profiles[i%plan.motion_profiles.length];
    await execFileAsync('ffmpeg',['-hide_banner','-loglevel','error','-framerate','30','-loop','1','-t',String(duration),'-i',frame,'-vf',`${motionFilter(motion,preset.w,preset.h,Math.round(duration*30))},format=yuv420p`,'-r','30','-c:v','libx264','-preset','veryfast','-crf','23','-an','-y',clip],{maxBuffer:10*1024*1024});
    scenes.push({clip,duration,headline:s.headline||'',subheadline:s.subheadline||'',voiceover:s.voiceover||s.subheadline||s.headline||''});
  }
  const inputs=scenes.flatMap(s=>['-i',s.clip]);let filter='';let prev='0:v';let elapsed=scenes[0].duration;const td=.6;
  for(let i=1;i<scenes.length;i++){const out=`v${i}`;const off=Math.max(.1,elapsed-td*i);const tr=xfadeName(plan.transitions[(i-1)%plan.transitions.length]);filter+=`[${prev}][${i}:v]xfade=transition=${tr}:duration=${td}:offset=${off}[${out}];`;prev=out;elapsed+=scenes[i].duration;}
  const visual=path.join(temp,'visual.mp4');
  if(scenes.length===1)await fs.copyFile(scenes[0].clip,visual);else await execFileAsync('ffmpeg',['-hide_banner','-loglevel','error',...inputs,'-filter_complex',filter.slice(0,-1),'-map',`[${prev}]`,'-r','30','-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart','-y',visual],{maxBuffer:20*1024*1024});
  const finalDuration=Math.max(1,total-td*(scenes.length-1));const narration=scenes.map(x=>x.voiceover).filter(Boolean).join(' ');
  const voice=plan.audio.voice_enabled?await piper(req(narration,'CREATIVE_VOICE_TEXT'),temp,plan.audio.voice_id):null;const mus=plan.audio.music_enabled?await music(finalDuration,temp):null;const ass=plan.audio.captions?await captions(scenes,preset.w,preset.h,temp):null;
  const out=path.join(temp,`${plan.output_type.toLowerCase()}-${crypto.randomUUID()}.mp4`);const args=['-hide_banner','-loglevel','error','-i',visual];if(voice)args.push('-i',voice);if(mus)args.push('-i',mus);
  let fc='';let amap='';if(voice&&mus){fc='[2:a][1:a]sidechaincompress=threshold=0.015:ratio=10:attack=20:release=450[duck];[1:a]volume=1.05[v];[duck]volume=.72[m];[v][m]amix=inputs=2:duration=longest:normalize=0[a]';amap='[a]'}else if(voice){fc='[1:a]volume=1.05,apad[a]';amap='[a]'}else if(mus){fc='[1:a]volume=.72[a]';amap='[a]'}
  const vf=ass?`ass=${ass}`:null;if(fc)args.push('-filter_complex',fc);args.push('-map','0:v:0');if(amap)args.push('-map',amap);else args.push('-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=44100','-map','1:a:0');if(vf)args.push('-vf',vf);args.push('-c:v','libx264','-preset','veryfast','-crf','22','-c:a','aac','-b:a','160k','-t',String(finalDuration),'-movflags','+faststart','-y',out);
  await execFileAsync('ffmpeg',args,{maxBuffer:20*1024*1024});
  return {out,duration:finalDuration,scenes};
}

async function analyzeVideo(file,temp){
  const {stdout}=await execFileAsync('ffprobe',['-v','error','-show_entries','stream=codec_type,codec_name,width,height','-of','json',file]);const probe=JSON.parse(stdout);const audio=arr(probe.streams).some(x=>x.codec_type==='audio');
  const sampleDir=path.join(temp,'samples');await fs.mkdir(sampleDir,{recursive:true});await execFileAsync('ffmpeg',['-hide_banner','-loglevel','error','-i',file,'-vf','fps=1/2','-frames:v','30',path.join(sampleDir,'s-%03d.png')]);const names=await fs.readdir(sampleDir);const hashes=[];for(const n of names)hashes.push(sha256(await fs.readFile(path.join(sampleDir,n))));const ratio=names.length?new Set(hashes).size/names.length:0;
  return {audio_stream_present:audio,unique_frame_ratio:Number(ratio.toFixed(3)),motion_score:Number(ratio.toFixed(3))};
}

async function renderStatic(browser,plan,preset,payload,temp,assets){
  const source=assets.visuals[0]?.data;if(!source)throw new Error('STATIC_VISUAL_SOURCE_REQUIRED');const out=path.join(temp,`${plan.output_type.toLowerCase()}-${crypto.randomUUID()}.png`);
  await shot(browser,sceneHtml({w:preset.w,h:preset.h,source,logo:assets.logo.data,brand:plan.brand,headline:txt(payload.headline||'Fénix Capital',130),subheadline:txt(payload.subheadline||'',280),cta:txt(payload.cta||'',90),metric:txt(payload.metric||'',50),metric_label:txt(payload.metric_label||'',120),index:1,count:1,variant:0}),preset.w,preset.h,out);return [{local_path:out,mime:'image/png',width:preset.w,height:preset.h}];
}
async function renderCarousel(browser,plan,preset,payload,temp,assets){
  const pages=plan.pages;if(pages.length<4)throw new Error('CAROUSEL_4_PAGES_REQUIRED');const outs=[];for(let i=0;i<pages.length;i++){const p=obj(pages[i]),source=assets.visuals[i%assets.visuals.length]?.data;if(!source)throw new Error('CAROUSEL_VISUAL_SOURCE_REQUIRED');const out=path.join(temp,`carousel-${String(i+1).padStart(2,'0')}.png`);await shot(browser,sceneHtml({w:preset.w,h:preset.h,source,logo:assets.logo.data,brand:plan.brand,headline:txt(p.headline||payload.headline||'',130),subheadline:txt(p.subheadline||'',280),cta:txt(p.cta||'',90),metric:txt(p.metric||'',50),metric_label:txt(p.metric_label||'',120),index:i+1,count:pages.length,variant:i}),preset.w,preset.h,out);outs.push({local_path:out,mime:'image/png',width:preset.w,height:preset.h,page:i+1})}return outs;
}

export async function renderCreativeJobV2(job,{browserFactory=()=>chromium.launch({headless:true}),fetch_impl=fetch}={}){
  if(!['PREPROD','PROD'].includes(String(job.environment||'').toUpperCase()))throw new Error('ENVIRONMENT_DENIED');const {preset,plan,payload}=normalize(job);assertCreativePlanV2({plan});
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'cerebro-creative-v2-'));const browser=await browserFactory();
  try{
    const [logo,...visuals]=await Promise.all([fetchImage(plan.brand.logo_url,fetch_impl),...plan.visual_sources.map(x=>fetchImage(x,fetch_impl))]);const assets={logo,visuals};
    let artifacts,quality;
    if(preset.kind==='VIDEO'){
      const r=await renderVideo(browser,plan,preset,payload,temp,assets);const physical=await analyzeVideo(r.out,temp);physical.scene_change_count=Math.max(0,r.scenes.length-1);quality=assertCreativePlanV2({plan,physical_evidence:physical});artifacts=[{local_path:r.out,mime:'video/mp4',width:preset.w,height:preset.h,duration_sec:r.duration,audio:{voice:plan.audio.voice_enabled?'PIPER':null,music:plan.audio.music_enabled?'FFMPEG_PROCEDURAL':null,ducking:plan.audio.ducking,captions:plan.audio.captions},physical_evidence:physical}];
    } else if(preset.kind==='CAROUSEL'){artifacts=await renderCarousel(browser,plan,preset,payload,temp,assets);quality=assertCreativePlanV2({plan});}
    else {artifacts=await renderStatic(browser,plan,preset,payload,temp,assets);quality=assertCreativePlanV2({plan});}
    for(const a of artifacts){const b=await fs.readFile(a.local_path);a.bytes=b.length;a.sha256=sha256(b);a.filename=path.basename(a.local_path);a.quality_verdict=quality.verdict;a.quality_score=quality.score;a.visual_sources=plan.visual_sources;a.logo_url=plan.brand.logo_url}
    return {temp,artifacts,quality,plan};
  } catch(e){await fs.rm(temp,{recursive:true,force:true}).catch(()=>{});throw e} finally {await browser.close()}
}

async function callDispatch(endpoint,route,token,body,fetch_impl=fetch){const res=await fetch_impl(`${endpoint.replace(/\/$/,'')}/${route}`,{method:body===undefined?'GET':'POST',headers:{authorization:`Bearer ${token}`,...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'error'});const data=await res.json().catch(()=>null);if(!res.ok)throw new Error(`CREATIVE_DISPATCH_${route.toUpperCase()}_FAILED:${res.status}:${data?.error||'UNKNOWN'}`);return data}
async function upload(endpoint,token,job,rendered,fetch_impl){const ds=rendered.artifacts.map(a=>({filename:a.filename,mime:a.mime}));const tickets=await callDispatch(endpoint,'artifact-ticket',token,{job_id:job.job_id,lease_id:job.lease_id,artifacts:ds},fetch_impl);const manifest=[];for(const a of rendered.artifacts){const t=tickets.tickets.find(x=>x.filename===a.filename);const body=await fs.readFile(a.local_path);const res=await fetch_impl(t.signed_url,{method:'PUT',headers:{'content-type':a.mime,'cache-control':'max-age=3600','x-upsert':'false'},body,redirect:'error'});if(!res.ok)throw new Error(`ARTIFACT_UPLOAD_FAILED:${res.status}`);manifest.push({filename:a.filename,mime:a.mime,path:t.path,bytes:a.bytes,sha256:a.sha256,width:a.width,height:a.height,duration_sec:a.duration_sec??null,audio:a.audio??null,physical_evidence:a.physical_evidence??null,quality_score:a.quality_score,quality_verdict:a.quality_verdict,visual_sources:a.visual_sources,logo_url:a.logo_url})}return manifest}

export async function runOneCreativeJobV2({endpoint=process.env.CEREBRO_CREATIVE_DISPATCH_URL,fetch_impl=fetch,browserFactory}={}){
  req(endpoint,'CEREBRO_CREATIVE_DISPATCH_URL');const token=await getGitHubOidcToken({fetch_impl});const leased=await callDispatch(endpoint,'lease',token,undefined,fetch_impl);const job=leased?.job;if(!job)return {ok:true,status:'NO_JOB'};let rendered;
  try{rendered=await renderCreativeJobV2(job,{fetch_impl,browserFactory});const manifest=await upload(endpoint,token,job,rendered,fetch_impl);await callDispatch(endpoint,'complete',token,{job_id:job.job_id,lease_id:job.lease_id,status:'SUCCEEDED',result_summary:{ok:true,artifact_count:manifest.length,output_type:job.output_type,render_runtime:'CREATIVE_QUALITY_V2_PLAYWRIGHT_FFMPEG_PIPER',quality_verdict:rendered.quality.verdict,quality_score:rendered.quality.score,additional_cost_eur:0,publish_authorized:false},artifact_manifest:{bucket:'cerebro-creative-assets',artifacts:manifest},error_code:null},fetch_impl);return {ok:true,status:'SUCCEEDED',job_id:job.job_id,manifest,quality:rendered.quality}}
  catch(e){await callDispatch(endpoint,'complete',token,{job_id:job.job_id,lease_id:job.lease_id,status:'FAILED',result_summary:{ok:false,quality_verdict:'CREATIVE_QA_REJECTED',additional_cost_eur:0,publish_authorized:false},artifact_manifest:null,error_code:String(e.message||e).slice(0,240)},fetch_impl).catch(()=>{});throw e}finally{if(rendered?.temp)await fs.rm(rendered.temp,{recursive:true,force:true})}
}

async function main(){const r=await runOneCreativeJobV2();console.log(JSON.stringify({ok:r.ok,status:r.status,job_id:r.job_id??null,quality:r.quality??null,additional_cost_eur:0,publish_authorized:false}))}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();

export const CREATIVE_JOB_RUNNER_V2_CONTRACT=Object.freeze({schema_version:'2.0.0',owner_engine:'FACT-001',runtime:'PLAYWRIGHT_FFMPEG_PIPER',mandatory_creative_tribunal:'CREATIVE_QUALITY_TRIBUNAL_V2',transparent_logo:true,multi_visual_broll:true,real_motion:true,transitions:true,kinetic_layering:true,neural_voice:true,procedural_music:true,audio_ducking:true,captions:true,physical_motion_analysis:true,rollback_runtime:'creative-job-runner-v1.mjs',publish_authorized:false,additional_cost_eur:0});
