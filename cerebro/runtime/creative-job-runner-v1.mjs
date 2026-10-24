import { chromium } from '@playwright/test';
import { execFile } from 'node:child_process';
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
  REEL:{width:1080,height:1920,kind:'VIDEO'},
  SHORT_VIDEO:{width:1080,height:1920,kind:'VIDEO'},
  LANDSCAPE_VIDEO:{width:1920,height:1080,kind:'VIDEO'},
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

function required(value,name){if(value===undefined||value===null||String(value).trim()==='')throw new Error(`MISSING_${name}`);return value;}
function plainObject(value){return Boolean(value)&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;}
function safeText(value,max=180){const s=String(value??'').trim();if(s.length>max)throw new Error('CREATIVE_TEXT_TOO_LONG');return s;}
function esc(value){return safeText(value,500).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function color(value,fallback){const s=String(value??fallback);return SAFE_COLOR.test(s)?s:fallback;}
function fileName(value){const s=String(value??'');if(!SAFE_FILE.test(s))throw new Error('ARTIFACT_FILENAME_DENIED');return s;}
function sha256(buffer){return crypto.createHash('sha256').update(buffer).digest('hex');}
function normalizePayload(job){const req=plainObject(job.request)?job.request:{};const payload=plainObject(req.creative_payload)?req.creative_payload:{};const brand=plainObject(payload.brand)?payload.brand:{};return {headline:safeText(payload.headline||'CEREBRO',120),subheadline:safeText(payload.subheadline||'',220),cta:safeText(payload.cta||'',80),brand:{background:color(brand.background,'#161616'),primary:color(brand.primary,'#ffffff'),accent:color(brand.accent,'#8a1d63')},pages:Array.isArray(payload.pages)?payload.pages:[],timeline:Array.isArray(payload.timeline)?payload.timeline:[]};}

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
  const data=await response.json().catch(()=>null);if(!response.ok)throw new Error(`CREATIVE_DISPATCH_${route.toUpperCase()}_FAILED:${response.status}:${data?.error||'UNKNOWN'}:${data?.detail||''}`);return data;
}

function compositionHtml({width,height,headline,subheadline,cta,brand,pageIndex=1,pageCount=1}){
  const eyebrow=pageCount>1?`${pageIndex} / ${pageCount}`:'';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:${brand.background};font-family:Arial,Helvetica,sans-serif}
  .frame{width:${width}px;height:${height}px;position:relative;display:flex;flex-direction:column;justify-content:center;padding:${Math.round(width*.085)}px;background:${brand.background};color:${brand.primary}}
  .bar{position:absolute;top:0;left:0;width:18px;height:100%;background:${brand.accent}}
  .eyebrow{font-size:${Math.max(22,Math.round(width*.024))}px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${brand.accent};margin-bottom:${Math.round(height*.035)}px}
  h1{font-size:${Math.max(58,Math.round(width*.075))}px;line-height:1.02;margin:0;max-width:94%;font-weight:800;letter-spacing:-.035em}
  p{font-size:${Math.max(26,Math.round(width*.031))}px;line-height:1.28;margin:${Math.round(height*.035)}px 0 0;max-width:86%;opacity:.9}
  .cta{display:inline-flex;align-self:flex-start;margin-top:${Math.round(height*.055)}px;padding:${Math.round(width*.018)}px ${Math.round(width*.03)}px;border:2px solid ${brand.accent};border-radius:999px;font-size:${Math.max(22,Math.round(width*.025))}px;font-weight:700;color:${brand.primary}}
  .brand{position:absolute;right:${Math.round(width*.06)}px;bottom:${Math.round(height*.05)}px;font-size:${Math.max(18,Math.round(width*.019))}px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${brand.accent}}
  </style></head><body><main class="frame"><div class="bar"></div>${eyebrow?`<div class="eyebrow">${esc(eyebrow)}</div>`:''}<h1>${esc(headline)}</h1>${subheadline?`<p>${esc(subheadline)}</p>`:''}${cta?`<div class="cta">${esc(cta)}</div>`:''}<div class="brand">Fénix Capital · CEREBRO</div></main></body></html>`;
}

async function screenshotHtml(browser,html,{width,height,outPath}){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  try{await page.setContent(html,{waitUntil:'load'});await page.screenshot({path:outPath,type:'png',fullPage:false});}finally{await page.close();}
}

async function renderImage(browser,job,temp,payload,preset){
  const name=fileName(`${job.output_type.toLowerCase()}-${job.job_id}.png`);const out=path.join(temp,name);
  await screenshotHtml(browser,compositionHtml({...preset,...payload}),{...preset,outPath:out});return [{filename:name,mime:'image/png',local_path:out,width:preset.width,height:preset.height}];
}

async function renderCarousel(browser,job,temp,payload,preset){
  if(payload.pages.length<2||payload.pages.length>20)throw new Error('CAROUSEL_PAGES_2_TO_20_REQUIRED');
  const artifacts=[];const pdfPage=await browser.newPage({viewport:{width:preset.width,height:preset.height},deviceScaleFactor:1});
  try{
    const printable=[];
    for(let i=0;i<payload.pages.length;i++){
      const p=plainObject(payload.pages[i])?payload.pages[i]:{};
      const slide={...payload,headline:safeText(p.headline??payload.headline,120),subheadline:safeText(p.subheadline??'',220),cta:safeText(p.cta??'',80),pageIndex:i+1,pageCount:payload.pages.length};
      const name=fileName(`carousel-${job.job_id}-${String(i+1).padStart(2,'0')}.png`);const out=path.join(temp,name);
      const html=compositionHtml({...preset,...slide});await screenshotHtml(browser,html,{...preset,outPath:out});
      artifacts.push({filename:name,mime:'image/png',local_path:out,width:preset.width,height:preset.height,page:i+1});
      printable.push(`<section style="break-after:page;width:${preset.width}px;height:${preset.height}px">${html.replace(/^.*?<body>|<\/body>.*$/gs,'')}</section>`);
    }
    await pdfPage.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>@page{size:${preset.width}px ${preset.height}px;margin:0}body{margin:0}.frame{page-break-inside:avoid}</style></head><body>${printable.join('')}</body></html>`,{waitUntil:'load'});
    const pdfName=fileName(`carousel-${job.job_id}.pdf`);const pdfOut=path.join(temp,pdfName);await pdfPage.pdf({path:pdfOut,width:`${preset.width}px`,height:`${preset.height}px`,printBackground:true,preferCSSPageSize:true});
    artifacts.push({filename:pdfName,mime:'application/pdf',local_path:pdfOut,pages:payload.pages.length});
  } finally {await pdfPage.close();}
  return artifacts;
}

async function renderVideo(browser,job,temp,payload,preset){
  const timeline=payload.timeline.length?payload.timeline:[{headline:payload.headline,subheadline:payload.subheadline,cta:payload.cta,duration_sec:Math.min(Math.max(Number(job.request?.duration_sec??4),3),15)}];
  if(timeline.length>12)throw new Error('VIDEO_TIMELINE_TOO_LONG');
  const list=[];let total=0;
  for(let i=0;i<timeline.length;i++){
    const item=plainObject(timeline[i])?timeline[i]:{};const duration=Math.min(Math.max(Number(item.duration_sec??3),1),15);total+=duration;if(total>60)throw new Error('VIDEO_DURATION_OVER_60_SECONDS');
    const frame={...payload,headline:safeText(item.headline??payload.headline,120),subheadline:safeText(item.subheadline??'',220),cta:safeText(item.cta??'',80),pageIndex:i+1,pageCount:timeline.length};
    const frameName=fileName(`frame-${String(i+1).padStart(2,'0')}.png`);const frameOut=path.join(temp,frameName);await screenshotHtml(browser,compositionHtml({...preset,...frame}),{...preset,outPath:frameOut});list.push({frameOut,duration});
  }
  const concatPath=path.join(temp,'concat.txt');await fs.writeFile(concatPath,list.flatMap(x=>[`file '${x.frameOut.replaceAll("'","'\\''")}'`,`duration ${x.duration}`]).concat([`file '${list.at(-1).frameOut.replaceAll("'","'\\''")}'`]).join('\n'));
  const name=fileName(`${job.output_type.toLowerCase()}-${job.job_id}.mp4`);const out=path.join(temp,name);
  await execFileAsync('ffmpeg',['-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',concatPath,'-f','lavfi','-i',`anullsrc=channel_layout=stereo:sample_rate=44100`,'-t',String(total),'-r','30','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest','-movflags','+faststart','-y',out],{maxBuffer:10*1024*1024});
  return [{filename:name,mime:'video/mp4',local_path:out,width:preset.width,height:preset.height,duration_sec:total,audio:'silent_compatibility_track'}];
}

export async function renderCreativeJob(job,{browserFactory=()=>chromium.launch({headless:true})}={}){
  const preset=OUTPUTS[String(job.output_type||'').toUpperCase()];if(!preset)throw new Error('OUTPUT_TYPE_UNSUPPORTED');
  if(!['PREPROD','PROD'].includes(String(job.environment||'').toUpperCase()))throw new Error('ENVIRONMENT_DENIED');
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'cerebro-creative-'));const browser=await browserFactory();
  try{const payload=normalizePayload(job);const artifacts=preset.kind==='CAROUSEL'?await renderCarousel(browser,job,temp,payload,preset):preset.kind==='VIDEO'?await renderVideo(browser,job,temp,payload,preset):await renderImage(browser,job,temp,payload,preset);for(const artifact of artifacts){const buf=await fs.readFile(artifact.local_path);artifact.bytes=buf.length;artifact.sha256=sha256(buf);}return {temp,artifacts,preset};}catch(e){await fs.rm(temp,{recursive:true,force:true});throw e;}finally{await browser.close();}
}

async function uploadArtifacts(endpoint,token,job,rendered,fetch_impl=fetch){
  const descriptors=rendered.artifacts.map(a=>({filename:a.filename,mime:a.mime}));const tickets=await callDispatch(endpoint,'artifact-ticket',token,{job_id:job.job_id,lease_id:job.lease_id,artifacts:descriptors},fetch_impl);
  if(!Array.isArray(tickets?.tickets)||tickets.tickets.length!==rendered.artifacts.length)throw new Error('ARTIFACT_TICKETS_INVALID');
  const manifest=[];
  for(const artifact of rendered.artifacts){const ticket=tickets.tickets.find(t=>t.filename===artifact.filename);if(!ticket?.signed_url)throw new Error('ARTIFACT_TICKET_MISSING');const body=await fs.readFile(artifact.local_path);const response=await fetch_impl(ticket.signed_url,{method:'PUT',headers:{'content-type':artifact.mime,'cache-control':'max-age=3600','x-upsert':'false'},body,redirect:'error'});if(!response.ok)throw new Error(`ARTIFACT_UPLOAD_FAILED:${response.status}`);manifest.push({filename:artifact.filename,mime:artifact.mime,path:ticket.path,bytes:artifact.bytes,sha256:artifact.sha256,width:artifact.width??null,height:artifact.height??null,duration_sec:artifact.duration_sec??null,pages:artifact.pages??null});}
  return manifest;
}

export async function runOneCreativeJob({endpoint=process.env.CEREBRO_CREATIVE_DISPATCH_URL,seed_canary=process.env.CEREBRO_CREATIVE_SEED_CANARY==='true',fetch_impl=fetch,browserFactory}={}){
  required(endpoint,'CEREBRO_CREATIVE_DISPATCH_URL');const token=await getGitHubOidcToken({fetch_impl});
  if(seed_canary)await callDispatch(endpoint,'canary-seed',token,{},fetch_impl);
  const leased=await callDispatch(endpoint,'lease',token,{},fetch_impl);const job=leased?.job;if(!job)return Object.freeze({ok:true,status:'NO_JOB'});
  let rendered=null;
  try{rendered=await renderCreativeJob(job,{browserFactory});const manifest=await uploadArtifacts(endpoint,token,job,rendered,fetch_impl);await callDispatch(endpoint,'complete',token,{job_id:job.job_id,lease_id:job.lease_id,status:'SUCCEEDED',result_summary:{ok:true,artifact_count:manifest.length,output_type:job.output_type,channel:job.channel,render_runtime:'PLAYWRIGHT_FFMPEG',additional_cost_eur:0,publish_authorized:false},artifact_manifest:{bucket:'cerebro-creative-assets',artifacts:manifest},error_code:null},fetch_impl);return Object.freeze({ok:true,status:'SUCCEEDED',job_id:job.job_id,artifact_count:manifest.length,manifest});}
  catch(error){await callDispatch(endpoint,'complete',token,{job_id:job.job_id,lease_id:job.lease_id,status:'FAILED',result_summary:{ok:false,additional_cost_eur:0,publish_authorized:false},artifact_manifest:null,error_code:String(error?.message||error).slice(0,240)},fetch_impl).catch(()=>null);throw error;}
  finally{if(rendered?.temp)await fs.rm(rendered.temp,{recursive:true,force:true});}
}

async function main(){const result=await runOneCreativeJob();console.log(JSON.stringify({ok:result.ok,status:result.status,job_id:result.job_id??null,artifact_count:result.artifact_count??0,artifacts:result.manifest?.map(a=>({path:a.path,mime:a.mime,bytes:a.bytes,sha256:a.sha256}))??[],additional_cost_eur:0,publish_authorized:false}));if(result.status!=='NO_JOB'&&result.ok!==true)process.exitCode=1;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();

export const CREATIVE_JOB_RUNNER_V1_CONTRACT=Object.freeze({schema_version:'1.0.0',owner_engine:'FACT-001',authentication:'GITHUB_ACTIONS_OIDC',audience:DEFAULT_AUDIENCE,queue:'cerebro_creative_job_v1',artifact_bucket:'cerebro-creative-assets',heavy_render_outside_supabase:true,local_open_source_render:true,publish_authorized:false,additional_cost_eur:0});
