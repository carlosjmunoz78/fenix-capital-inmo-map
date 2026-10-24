import { chromium } from '@playwright/test';
import { execFile, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
const DEFAULT_AUDIENCE = 'cerebro-creative-worker-v1';
const OUTPUTS = Object.freeze({
  STATIC_POST:{width:1080,height:1350,kind:'IMAGE'},
  SQUARE_POST:{width:1080,height:1080,kind:'IMAGE'},
  CAROUSEL:{width:1080,height:1350,kind:'CAROUSEL'},
  STORY:{width:1080,height:1920,kind:'IMAGE'},
  REEL:{width:1080,height:1920,kind:'VIDEO',max_duration_sec:60},
  SHORT_VIDEO:{width:1080,height:1920,kind:'VIDEO',max_duration_sec:60},
  LANDSCAPE_VIDEO:{width:1920,height:1080,kind:'VIDEO',max_duration_sec:60},
  LONG_VIDEO:{width:1920,height:1080,kind:'VIDEO',max_duration_sec:180},
  THUMBNAIL:{width:1280,height:720,kind:'IMAGE'},
  SEO_IMAGE:{width:1200,height:630,kind:'IMAGE'},
  WEB_HERO:{width:1920,height:1080,kind:'IMAGE'},
  EMAIL_BANNER:{width:1200,height:600,kind:'IMAGE'},
  DOCUMENT_COVER:{width:1240,height:1754,kind:'IMAGE'},
  APP_ASSET:{width:1080,height:1080,kind:'IMAGE'},
  INFOGRAPHIC:{width:1080,height:1920,kind:'IMAGE'}
});
const SAFE_COLOR=/^#[0-9a-fA-F]{6}$/;
const SAFE_FILE=/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;
const PHOTO_HOSTS=new Set(['fenixcapital.es','www.fenixcapital.es','staging.fenixcapital.es']);
const VISUAL_STYLES=new Set(['EDITORIAL','PHOTO','DATA']);
const VOICE_IDS=new Map([['ES_MALE',0],['ES_FEMALE',1]]);

function required(value,name){if(value===undefined||value===null||String(value).trim()==='')throw new Error(`MISSING_${name}`);return value;}
function plainObject(value){return Boolean(value)&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;}
function safeText(value,max=180){const s=String(value??'').trim();if(s.length>max)throw new Error('CREATIVE_TEXT_TOO_LONG');return s;}
function esc(value){return safeText(value,2000).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function color(value,fallback){const s=String(value??fallback);return SAFE_COLOR.test(s)?s:fallback;}
function fileName(value){const s=String(value??'');if(!SAFE_FILE.test(s))throw new Error('ARTIFACT_FILENAME_DENIED');return s;}
function sha256(buffer){return crypto.createHash('sha256').update(buffer).digest('hex');}
function finiteNumber(value,fallback){const n=Number(value);return Number.isFinite(n)?n:fallback;}
function safeUrl(value){
  if(!value)return null;
  const url=new URL(String(value));
  if(url.protocol!=='https:'||!PHOTO_HOSTS.has(url.hostname))throw new Error('CREATIVE_BACKGROUND_SOURCE_DENIED');
  return url.toString();
}
function normalizePayload(job){
  const req=plainObject(job.request)?job.request:{};
  const payload=plainObject(req.creative_payload)?req.creative_payload:{};
  const brand=plainObject(payload.brand)?payload.brand:{};
  const audio=plainObject(payload.audio)?payload.audio:{};
  const brandLabel=safeText(payload.brand_label||req.brand_label||job.company_id||'CEREBRO',80);
  const style=String(payload.visual_style||'EDITORIAL').toUpperCase();
  if(!VISUAL_STYLES.has(style))throw new Error('CREATIVE_VISUAL_STYLE_DENIED');
  const voiceId=String(audio.voice_id||'ES_FEMALE').toUpperCase();
  if(audio.voice_enabled===true&&!VOICE_IDS.has(voiceId))throw new Error('CREATIVE_VOICE_ID_DENIED');
  return {
    headline:safeText(payload.headline||'CEREBRO',120),
    subheadline:safeText(payload.subheadline||'',220),
    cta:safeText(payload.cta||'',80),
    metric:safeText(payload.metric||'',40),
    metric_label:safeText(payload.metric_label||'',100),
    brand_label:brandLabel,
    brand:{background:color(brand.background,'#161616'),primary:color(brand.primary,'#ffffff'),accent:color(brand.accent,'#8a1d63')},
    visual_style:style,
    background_image_url:safeUrl(payload.background_image_url),
    background_image_data_uri:null,
    pages:Array.isArray(payload.pages)?payload.pages:[],
    timeline:Array.isArray(payload.timeline)?payload.timeline:[],
    audio:{
      voice_enabled:audio.voice_enabled===true,
      voice_id:voiceId,
      voice_text:safeText(audio.voice_text||'',4000),
      music_enabled:audio.music_enabled===true,
      music_profile:String(audio.music_profile||'CORPORATE_AMBIENT').toUpperCase()
    }
  };
}

export async function getGitHubOidcToken({audience=process.env.CEREBRO_CREATIVE_OIDC_AUDIENCE||DEFAULT_AUDIENCE,request_url=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,request_token=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,fetch_impl=fetch}={}){
  required(request_url,'ACTIONS_ID_TOKEN_REQUEST_URL');required(request_token,'ACTIONS_ID_TOKEN_REQUEST_TOKEN');
  const url=new URL(request_url);url.searchParams.set('audience',audience);
  const response=await fetch_impl(url,{headers:{authorization:`Bearer ${request_token}`},redirect:'error'});
  if(!response.ok)throw new Error(`GITHUB_OIDC_TOKEN_REQUEST_FAILED:${response.status}`);
  const body=await response.json();if(!body?.value||typeof body.value!=='string')throw new Error('GITHUB_OIDC_TOKEN_MISSING');return body.value;
}

async function callDispatch(endpoint,route,token,body=undefined,fetch_impl=fetch){
  const url=`${endpoint.replace(/\/$/,'')}/${route}`;
  const response=await fetch_impl(url,{method:body===undefined?'GET':'POST',headers:{authorization:`Bearer ${token}`,...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'error'});
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(`CREATIVE_DISPATCH_${route.toUpperCase()}_FAILED:${response.status}:${data?.error||'UNKNOWN'}:${data?.detail||''}`);
  return data;
}

async function hydrateBackground(payload,fetch_impl=fetch){
  if(!payload.background_image_url)return payload;
  const response=await fetch_impl(payload.background_image_url,{redirect:'error'});
  if(!response.ok)throw new Error(`CREATIVE_BACKGROUND_FETCH_FAILED:${response.status}`);
  const mime=String(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
  if(!['image/jpeg','image/png','image/webp'].includes(mime))throw new Error('CREATIVE_BACKGROUND_MIME_DENIED');
  const buffer=Buffer.from(await response.arrayBuffer());
  if(buffer.length>10*1024*1024)throw new Error('CREATIVE_BACKGROUND_TOO_LARGE');
  return {...payload,background_image_data_uri:`data:${mime};base64,${buffer.toString('base64')}`};
}

function compositionHtml({width,height,headline,subheadline,cta,metric,metric_label,brand,brand_label,visual_style='EDITORIAL',background_image_data_uri=null,pageIndex=1,pageCount=1}){
  const eyebrow=pageCount>1?`${pageIndex} / ${pageCount}`:'';
  const bg=background_image_data_uri?`background-image:url('${background_image_data_uri}');`:'';
  const photo=visual_style==='PHOTO';
  const data=visual_style==='DATA';
  const frameBackground=photo?'transparent':data?`linear-gradient(145deg,${brand.background} 0%,#101820 62%,${brand.accent} 160%)`:brand.background;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:${brand.background};font-family:Arial,Helvetica,sans-serif}
  .photo{position:absolute;inset:0;${bg}background-size:cover;background-position:center;transform:scale(1.015)}
  .shade{position:absolute;inset:0;background:${photo?'linear-gradient(180deg,rgba(0,0,0,.10) 0%,rgba(0,0,0,.30) 42%,rgba(0,0,0,.86) 100%)':'transparent'}}
  .frame{width:${width}px;height:${height}px;position:relative;display:flex;flex-direction:column;justify-content:${photo?'flex-end':'center'};padding:${Math.round(width*.075)}px;background:${frameBackground};color:${brand.primary};overflow:hidden}
  .bar{position:absolute;top:0;left:0;width:${data?28:18}px;height:100%;background:${brand.accent}}
  .content{position:relative;z-index:2;max-width:${photo?'92%':'94%'}}
  .eyebrow{font-size:${Math.max(22,Math.round(width*.024))}px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${photo?'#ffffff':brand.accent};margin-bottom:${Math.round(height*.025)}px;text-shadow:${photo?'0 2px 20px rgba(0,0,0,.6)':'none'}}
  h1{font-size:${Math.max(58,Math.round(width*(data?0.068:0.075)))}px;line-height:1.02;margin:0;max-width:94%;font-weight:800;letter-spacing:-.035em;text-shadow:${photo?'0 3px 28px rgba(0,0,0,.72)':'none'}}
  p{font-size:${Math.max(26,Math.round(width*.031))}px;line-height:1.28;margin:${Math.round(height*.025)}px 0 0;max-width:86%;opacity:.94;text-shadow:${photo?'0 2px 18px rgba(0,0,0,.72)':'none'}}
  .metric{font-size:${Math.max(84,Math.round(width*.13))}px;line-height:.9;font-weight:900;letter-spacing:-.06em;color:${brand.accent};margin-bottom:${Math.round(height*.025)}px}.metric-label{font-size:${Math.max(25,Math.round(width*.027))}px;font-weight:700;max-width:70%;margin-bottom:${Math.round(height*.04)}px}
  .cta{display:inline-flex;align-self:flex-start;margin-top:${Math.round(height*.04)}px;padding:${Math.round(width*.017)}px ${Math.round(width*.029)}px;border:2px solid ${photo?'#ffffff':brand.accent};border-radius:999px;font-size:${Math.max(22,Math.round(width*.024))}px;font-weight:700;color:${brand.primary};background:${photo?'rgba(0,0,0,.22)':'transparent'}}
  .brand{position:absolute;z-index:3;right:${Math.round(width*.055)}px;bottom:${Math.round(height*.04)}px;font-size:${Math.max(18,Math.round(width*.019))}px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${photo?'#ffffff':brand.accent};text-shadow:${photo?'0 2px 16px rgba(0,0,0,.8)':'none'}}
  </style></head><body><main class="frame">${photo?'<div class="photo"></div><div class="shade"></div>':''}<div class="bar"></div><div class="content">${eyebrow?`<div class="eyebrow">${esc(eyebrow)}</div>`:''}${data&&metric?`<div class="metric">${esc(metric)}</div><div class="metric-label">${esc(metric_label)}</div>`:''}<h1>${esc(headline)}</h1>${subheadline?`<p>${esc(subheadline)}</p>`:''}${cta?`<div class="cta">${esc(cta)}</div>`:''}</div><div class="brand">${esc(brand_label)}</div></main></body></html>`;
}

async function screenshotHtml(browser,html,{width,height,outPath}){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  try{await page.setContent(html,{waitUntil:'load'});await page.screenshot({path:outPath,type:'png',fullPage:false});}
  finally{await page.close();}
}

async function renderImage(browser,job,temp,payload,preset){
  const name=fileName(`${job.output_type.toLowerCase()}-${job.job_id}.png`);const out=path.join(temp,name);
  await screenshotHtml(browser,compositionHtml({...preset,...payload}),{...preset,outPath:out});
  return [{filename:name,mime:'image/png',local_path:out,width:preset.width,height:preset.height,visual_style:payload.visual_style,source_attribution:payload.background_image_url?{type:'OWNED_WEB_ASSET',url:payload.background_image_url}:null}];
}

async function renderCarousel(browser,job,temp,payload,preset){
  if(payload.pages.length<2||payload.pages.length>20)throw new Error('CAROUSEL_PAGES_2_TO_20_REQUIRED');
  const artifacts=[];
  for(let i=0;i<payload.pages.length;i++){
    const p=plainObject(payload.pages[i])?payload.pages[i]:{};
    const slide={...payload,headline:safeText(p.headline??payload.headline,120),subheadline:safeText(p.subheadline??'',220),cta:safeText(p.cta??'',80),metric:safeText(p.metric??'',40),metric_label:safeText(p.metric_label??'',100),pageIndex:i+1,pageCount:payload.pages.length};
    const name=fileName(`carousel-${job.job_id}-${String(i+1).padStart(2,'0')}.png`);const out=path.join(temp,name);
    await screenshotHtml(browser,compositionHtml({...preset,...slide}),{...preset,outPath:out});
    artifacts.push({filename:name,mime:'image/png',local_path:out,width:preset.width,height:preset.height,page:i+1,visual_style:payload.visual_style,source_attribution:payload.background_image_url?{type:'OWNED_WEB_ASSET',url:payload.background_image_url}:null});
  }
  const pdfPage=await browser.newPage({viewport:{width:preset.width,height:preset.height},deviceScaleFactor:1});
  try{
    const images=[];
    for(const artifact of artifacts){const png=await fs.readFile(artifact.local_path);images.push(`<section><img src="data:image/png;base64,${png.toString('base64')}" /></section>`);}
    await pdfPage.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>@page{size:${preset.width}px ${preset.height}px;margin:0}html,body{margin:0;padding:0}section{width:${preset.width}px;height:${preset.height}px;break-after:page;page-break-after:always}section:last-child{break-after:auto;page-break-after:auto}img{display:block;width:100%;height:100%;object-fit:contain}</style></head><body>${images.join('')}</body></html>`,{waitUntil:'load'});
    const pdfName=fileName(`carousel-${job.job_id}.pdf`);const pdfOut=path.join(temp,pdfName);
    await pdfPage.pdf({path:pdfOut,width:`${preset.width}px`,height:`${preset.height}px`,printBackground:true,preferCSSPageSize:true});
    artifacts.push({filename:pdfName,mime:'application/pdf',local_path:pdfOut,pages:payload.pages.length,visual_style:payload.visual_style});
  } finally {await pdfPage.close();}
  return artifacts;
}

function runWithInput(command,args,input){
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{stdio:['pipe','pipe','pipe']});let stdout='';let stderr='';
    child.stdout.on('data',d=>{stdout+=d});child.stderr.on('data',d=>{stderr+=d});
    child.on('error',reject);child.on('close',code=>code===0?resolve({stdout,stderr}):reject(new Error(`PROCESS_FAILED:${path.basename(command)}:${code}:${stderr.slice(-1200)}`)));
    child.stdin.end(input);
  });
}

async function synthesizePiperVoice(text,temp,voiceId){
  const bin=required(process.env.CEREBRO_PIPER_BIN,'CEREBRO_PIPER_BIN');
  const model=required(process.env.CEREBRO_PIPER_MODEL,'CEREBRO_PIPER_MODEL');
  const config=required(process.env.CEREBRO_PIPER_CONFIG,'CEREBRO_PIPER_CONFIG');
  await Promise.all([fs.access(bin),fs.access(model),fs.access(config)]).catch(()=>{throw new Error('PIPER_RUNTIME_NOT_AVAILABLE')});
  const out=path.join(temp,'voice.wav');
  await runWithInput(bin,['--model',model,'--config',config,'--speaker',String(VOICE_IDS.get(voiceId)),'--output_file',out],`${text.trim()}\n`);
  const stat=await fs.stat(out);if(stat.size<1024)throw new Error('PIPER_VOICE_OUTPUT_INVALID');
  return out;
}

async function createProceduralMusic(total,temp){
  const out=path.join(temp,'music.wav');
  const fadeOut=Math.max(0,total-3);
  await execFileAsync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i',`sine=frequency=196:sample_rate=44100:duration=${total}`,'-f','lavfi','-i',`sine=frequency=293.66:sample_rate=44100:duration=${total}`,'-filter_complex',`[0:a]volume=0.050[a0];[1:a]volume=0.022[a1];[a0][a1]amix=inputs=2:normalize=0,lowpass=f=1600,afade=t=in:st=0:d=2,afade=t=out:st=${fadeOut}:d=3[m]`,'-map','[m]','-c:a','pcm_s16le','-y',out],{maxBuffer:10*1024*1024});
  return out;
}

function subtitleText(timeline){
  function stamp(seconds){const ms=Math.max(0,Math.round(seconds*1000));const h=Math.floor(ms/3600000);const m=Math.floor((ms%3600000)/60000);const s=Math.floor((ms%60000)/1000);const n=ms%1000;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(n).padStart(3,'0')}`;}
  let cursor=0;const blocks=[];
  timeline.forEach((item,i)=>{const duration=item.duration;const text=safeText(item.voiceover||item.subheadline||item.headline||'',500);if(text){blocks.push(`${i+1}\n${stamp(cursor)} --> ${stamp(cursor+duration)}\n${text.replace(/\n+/g,' ')}\n`);}cursor+=duration;});
  return blocks.join('\n');
}

async function addAudioAndCaptions({baseVideo,out,total,payload,timeline,temp}){
  const voiceText=payload.audio.voice_text||timeline.map(x=>x.voiceover||'').filter(Boolean).join(' ');
  const voiceRequested=payload.audio.voice_enabled;
  const musicRequested=payload.audio.music_enabled;
  const voice=voiceRequested?await synthesizePiperVoice(required(voiceText,'CREATIVE_VOICE_TEXT'),temp,payload.audio.voice_id):null;
  const music=musicRequested?await createProceduralMusic(total,temp):null;
  const srt=subtitleText(timeline);const srtPath=path.join(temp,'captions.srt');if(srt)await fs.writeFile(srtPath,srt,'utf8');
  const inputs=['-i',baseVideo];if(voice)inputs.push('-i',voice);if(music)inputs.push('-i',music);
  let audioMap='';let filter='';
  if(voice&&music){filter='[1:a]volume=1.12,apad[v];[2:a]volume=0.55[m];[v][m]amix=inputs=2:duration=longest:dropout_transition=2[a]';audioMap='[a]';}
  else if(voice){filter='[1:a]volume=1.12,apad[a]';audioMap='[a]';}
  else if(music){filter='[1:a]volume=0.55[a]';audioMap='[a]';}
  const mixed=path.join(temp,'video-audio-mixed.mp4');
  const args=['-hide_banner','-loglevel','error',...inputs];
  if(filter)args.push('-filter_complex',filter,'-map','0:v:0','-map',audioMap,'-c:v','copy','-c:a','aac','-b:a','160k');
  else args.push('-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=44100','-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac');
  args.push('-t',String(total),'-shortest','-movflags','+faststart','-y',srt?mixed:out);
  await execFileAsync('ffmpeg',args,{maxBuffer:10*1024*1024});
  if(srt){
    await execFileAsync('ffmpeg',['-hide_banner','-loglevel','error','-i',mixed,'-vf',`subtitles=${srtPath}:force_style=FontName=DejaVu Sans,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=48`,'-c:v','libx264','-preset','veryfast','-crf','26','-c:a','copy','-movflags','+faststart','-y',out],{maxBuffer:10*1024*1024});
  }
  return {voice:voiceRequested?{provider:'PIPER',model:'es_ES-sharvard-medium',voice_id:payload.audio.voice_id,runtime_license:'MIT',dataset_license:'CC-BY-3.0'}:null,music:musicRequested?{provider:'FFMPEG_PROCEDURAL',profile:payload.audio.music_profile,license:'GENERATED_ORIGINAL'}:null,captions:srt?'BURNED_SRT_TIMELINE':'NONE'};
}

async function renderVideo(browser,job,temp,payload,preset){
  const maxDuration=preset.max_duration_sec??60;
  const defaultDuration=String(job.output_type||'').toUpperCase()==='LONG_VIDEO'?75:4;
  const timelineRaw=payload.timeline.length?payload.timeline:[{headline:payload.headline,subheadline:payload.subheadline,cta:payload.cta,duration_sec:Math.min(Math.max(finiteNumber(job.request?.duration_sec,defaultDuration),3),15)}];
  if(timelineRaw.length>24)throw new Error('VIDEO_TIMELINE_TOO_LONG');
  const list=[];let total=0;
  for(let i=0;i<timelineRaw.length;i++){
    const item=plainObject(timelineRaw[i])?timelineRaw[i]:{};
    const duration=Math.min(Math.max(finiteNumber(item.duration_sec,3),1),15);total+=duration;if(total>maxDuration)throw new Error(`VIDEO_DURATION_OVER_${maxDuration}_SECONDS`);
    const frame={...payload,headline:safeText(item.headline??payload.headline,120),subheadline:safeText(item.subheadline??'',220),cta:safeText(item.cta??'',80),metric:safeText(item.metric??'',40),metric_label:safeText(item.metric_label??'',100),pageIndex:i+1,pageCount:timelineRaw.length};
    const frameName=fileName(`frame-${String(i+1).padStart(2,'0')}.png`);const frameOut=path.join(temp,frameName);
    await screenshotHtml(browser,compositionHtml({...preset,...frame}),{...preset,outPath:frameOut});
    list.push({frameOut,duration,headline:frame.headline,subheadline:frame.subheadline,voiceover:safeText(item.voiceover??'',500)});
  }
  const concatPath=path.join(temp,'concat.txt');
  await fs.writeFile(concatPath,list.flatMap(x=>[`file '${x.frameOut.replaceAll("'","'\\''")}'`,`duration ${x.duration}`]).concat([`file '${list.at(-1).frameOut.replaceAll("'","'\\''")}'`]).join('\n'));
  const baseVideo=path.join(temp,'video-base.mp4');
  await execFileAsync('ffmpeg',['-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',concatPath,'-t',String(total),'-r','30','-c:v','libx264','-preset','veryfast','-crf','26','-pix_fmt','yuv420p','-movflags','+faststart','-an','-y',baseVideo],{maxBuffer:10*1024*1024});
  const name=fileName(`${job.output_type.toLowerCase()}-${job.job_id}.mp4`);const out=path.join(temp,name);
  const audioMeta=await addAudioAndCaptions({baseVideo,out,total,payload,timeline:list,temp});
  return [{filename:name,mime:'video/mp4',local_path:out,width:preset.width,height:preset.height,duration_sec:total,audio:audioMeta,visual_style:payload.visual_style,source_attribution:payload.background_image_url?{type:'OWNED_WEB_ASSET',url:payload.background_image_url}:null}];
}

export async function renderCreativeJob(job,{browserFactory=()=>chromium.launch({headless:true}),fetch_impl=fetch}={}){
  const preset=OUTPUTS[String(job.output_type||'').toUpperCase()];if(!preset)throw new Error('OUTPUT_TYPE_UNSUPPORTED');
  if(!['PREPROD','PROD'].includes(String(job.environment||'').toUpperCase()))throw new Error('ENVIRONMENT_DENIED');
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'cerebro-creative-'));const browser=await browserFactory();
  try{
    const payload=await hydrateBackground(normalizePayload(job),fetch_impl);
    const artifacts=preset.kind==='CAROUSEL'?await renderCarousel(browser,job,temp,payload,preset):preset.kind==='VIDEO'?await renderVideo(browser,job,temp,payload,preset):await renderImage(browser,job,temp,payload,preset);
    for(const artifact of artifacts){const buf=await fs.readFile(artifact.local_path);artifact.bytes=buf.length;artifact.sha256=sha256(buf);}
    return {temp,artifacts,preset};
  } catch(e){await fs.rm(temp,{recursive:true,force:true});throw e;}
  finally{await browser.close();}
}

async function uploadArtifacts(endpoint,token,job,rendered,fetch_impl=fetch){
  const descriptors=rendered.artifacts.map(a=>({filename:a.filename,mime:a.mime}));
  const tickets=await callDispatch(endpoint,'artifact-ticket',token,{job_id:job.job_id,lease_id:job.lease_id,artifacts:descriptors},fetch_impl);
  if(!Array.isArray(tickets?.tickets)||tickets.tickets.length!==rendered.artifacts.length)throw new Error('ARTIFACT_TICKETS_INVALID');
  const manifest=[];
  for(const artifact of rendered.artifacts){
    const ticket=tickets.tickets.find(t=>t.filename===artifact.filename);if(!ticket?.signed_url)throw new Error('ARTIFACT_TICKET_MISSING');
    const body=await fs.readFile(artifact.local_path);
    const response=await fetch_impl(ticket.signed_url,{method:'PUT',headers:{'content-type':artifact.mime,'cache-control':'max-age=3600','x-upsert':'false'},body,redirect:'error'});
    if(!response.ok)throw new Error(`ARTIFACT_UPLOAD_FAILED:${response.status}`);
    manifest.push({filename:artifact.filename,mime:artifact.mime,path:ticket.path,bytes:artifact.bytes,sha256:artifact.sha256,width:artifact.width??null,height:artifact.height??null,duration_sec:artifact.duration_sec??null,pages:artifact.pages??null,visual_style:artifact.visual_style??null,audio:artifact.audio??null,source_attribution:artifact.source_attribution??null});
  }
  return manifest;
}

export async function runOneCreativeJob({endpoint=process.env.CEREBRO_CREATIVE_DISPATCH_URL,seed_canary=process.env.CEREBRO_CREATIVE_SEED_CANARY==='true',fetch_impl=fetch,browserFactory}={}){
  required(endpoint,'CEREBRO_CREATIVE_DISPATCH_URL');
  const token=await getGitHubOidcToken({fetch_impl});
  if(seed_canary)await callDispatch(endpoint,'canary-seed',token,{},fetch_impl);
  const leased=await callDispatch(endpoint,'lease',token,{},fetch_impl);const job=leased?.job;
  if(!job)return Object.freeze({ok:true,status:'NO_JOB'});
  let rendered=null;
  try{
    rendered=await renderCreativeJob(job,{browserFactory,fetch_impl});
    const manifest=await uploadArtifacts(endpoint,token,job,rendered,fetch_impl);
    await callDispatch(endpoint,'complete',token,{job_id:job.job_id,lease_id:job.lease_id,status:'SUCCEEDED',result_summary:{ok:true,artifact_count:manifest.length,output_type:job.output_type,channel:job.channel,render_runtime:'PLAYWRIGHT_FFMPEG_PIPER',additional_cost_eur:0,publish_authorized:false},artifact_manifest:{bucket:'cerebro-creative-assets',artifacts:manifest},error_code:null},fetch_impl);
    return Object.freeze({ok:true,status:'SUCCEEDED',job_id:job.job_id,artifact_count:manifest.length,manifest});
  } catch(error){
    await callDispatch(endpoint,'complete',token,{job_id:job.job_id,lease_id:job.lease_id,status:'FAILED',result_summary:{ok:false,additional_cost_eur:0,publish_authorized:false},artifact_manifest:null,error_code:String(error?.message||error).slice(0,240)},fetch_impl).catch(()=>null);
    throw error;
  } finally {if(rendered?.temp)await fs.rm(rendered.temp,{recursive:true,force:true});}
}

async function main(){
  const result=await runOneCreativeJob();
  console.log(JSON.stringify({ok:result.ok,status:result.status,job_id:result.job_id??null,artifact_count:result.artifact_count??0,artifacts:result.manifest?.map(a=>({path:a.path,mime:a.mime,bytes:a.bytes,sha256:a.sha256,visual_style:a.visual_style,audio:a.audio}))??[],additional_cost_eur:0,publish_authorized:false}));
  if(result.status!=='NO_JOB'&&result.ok!==true)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();

export const CREATIVE_JOB_RUNNER_V1_CONTRACT=Object.freeze({schema_version:'1.1.0',owner_engine:'FACT-001',authentication:'GITHUB_ACTIONS_OIDC',audience:DEFAULT_AUDIENCE,queue:'cerebro_creative_job_v1',artifact_bucket:'cerebro-creative-assets',heavy_render_outside_supabase:true,local_open_source_render:true,neural_voice_provider:'PIPER',procedural_music:true,long_video_max_seconds:180,owned_photo_host_allowlist:[...PHOTO_HOSTS],publish_authorized:false,additional_cost_eur:0});
