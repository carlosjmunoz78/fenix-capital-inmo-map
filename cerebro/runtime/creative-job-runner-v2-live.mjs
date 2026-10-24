import { chromium } from '@playwright/test';
import { execFile, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fsSync, { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import { assertCreativePlanV2 } from './creative-quality-tribunal-v2.mjs';
import { resolveGovernedVideoSourceV2, sourceProvenanceV2 } from './creative-media-sources-v2.mjs';

const execFileAsync=promisify(execFile);
const PRESETS=Object.freeze({
  STATIC_POST:{w:1080,h:1350,kind:'IMAGE'},SQUARE_POST:{w:1080,h:1080,kind:'IMAGE'},CAROUSEL:{w:1080,h:1350,kind:'CAROUSEL'},
  STORY_VIDEO:{w:1080,h:1920,kind:'VIDEO',max:60},REEL:{w:1080,h:1920,kind:'VIDEO',max:60},SHORT_VIDEO:{w:1080,h:1920,kind:'VIDEO',max:60},
  LANDSCAPE_VIDEO:{w:1920,h:1080,kind:'VIDEO',max:60},LONG_VIDEO:{w:1920,h:1080,kind:'VIDEO',max:180},SEO_IMAGE:{w:1200,h:630,kind:'IMAGE'}
});
const HOSTS=new Set(['fenixcapital.es','www.fenixcapital.es','staging.fenixcapital.es']);
const MOTIONS=['KEN_BURNS_IN','PAN_RIGHT','PUSH_IN','PAN_LEFT'];
const TRANSITIONS=['CROSSFADE','DIP_TO_BLACK','PUSH','WIPE'];
const LAYOUTS=['FULL_BLEED','SPLIT_EDITORIAL','GLASS_CARD','METRIC_HERO','FRAME_MINIMAL'];
const VOICES=new Map([['ES_MALE',0],['ES_FEMALE',1]]);
const SAFE_COLOR=/^#[0-9a-fA-F]{6}$/;

function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function arr(v){return Array.isArray(v)?v:[]}
function txt(v,max=300){const s=String(v??'').trim();if(s.length>max)throw new Error('CREATIVE_TEXT_TOO_LONG');return s}
function req(v,n){if(v===undefined||v===null||String(v).trim()==='')throw new Error(`MISSING_${n}`);return v}
function esc(v){return txt(v,3000).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function color(v,f){const s=String(v||f);return SAFE_COLOR.test(s)?s:f}
function sha256(b){return crypto.createHash('sha256').update(b).digest('hex')}
function allowedImage(v){const u=new URL(String(v));if(u.protocol!=='https:'||!HOSTS.has(u.hostname))throw new Error('CREATIVE_IMAGE_SOURCE_DENIED');return u.toString()}
function refValue(v){return typeof v==='string'?v:(obj(v).ref||obj(v).source_ref||'')}
function ffColor(hex){return `0x${String(hex).replace('#','')}`}

function normalize(job){
  const r=obj(job.request),p=obj(r.creative_payload),b=obj(p.brand),a=obj(p.audio);
  const output=String(job.output_type||p.output_type||'').toUpperCase(),preset=PRESETS[output];if(!preset)throw new Error('OUTPUT_TYPE_UNSUPPORTED');
  const visual_sources=arr(p.visual_sources).map(x=>allowedImage(typeof x==='string'?x:obj(x).url));
  const video_sources=arr(p.video_sources).map(refValue).filter(Boolean);
  for(const ref of video_sources)resolveGovernedVideoSourceV2(ref);
  const plan={
    output_type:output,channel:String(job.channel||p.channel||'REVIEW_ONLY').toUpperCase(),publish_authorized:false,additional_cost_eur:0,
    video_mode:String(p.video_mode|| (preset.kind==='VIDEO'?'LIVE_ACTION_MIXED':'')).toUpperCase(),
    creative_concept:txt(p.creative_concept||'Fénix Capital · creatividad gobernada',300),channel_fit:p.channel_fit!==false,accessibility_checked:p.accessibility_checked!==false,
    visual_style:String(p.visual_style||'PHOTO').toUpperCase(),layer_count:Number(p.layer_count||9),
    brand:{logo_url:allowedImage(b.logo_url||'https://fenixcapital.es/wp-content/uploads/2026/10/Logo-Fenix-Capital-oficial-color-completo-scaled-1.png'),primary:color(b.primary,'#ffffff'),accent:color(b.accent,'#f47b20'),background:color(b.background,'#111111')},
    visual_sources,video_sources,pages:arr(p.pages),scenes:arr(p.scenes||p.timeline),
    motion_profiles:arr(p.motion_profiles).length?arr(p.motion_profiles).map(x=>String(x).toUpperCase()):MOTIONS,
    transitions:arr(p.transitions).length?arr(p.transitions).map(x=>String(x).toUpperCase()):TRANSITIONS,
    motion_design:p.motion_design!==false,broll_required:p.broll_required!==false,scene_text_only_ratio:Number(p.scene_text_only_ratio??0),text_only_page_ratio:Number(p.text_only_page_ratio??.2),layout_variants:Number(p.layout_variants||5),
    motion_graphics_layers:Number(p.motion_graphics_layers||4),allow_photo_motion:p.allow_photo_motion===true,
    audio:{voice_enabled:a.voice_enabled===true,voice_id:String(a.voice_id||'ES_FEMALE').toUpperCase(),music_enabled:a.music_enabled===true,ducking:a.ducking!==false,captions:a.captions!==false}
  };
  if(plan.audio.voice_enabled&&!VOICES.has(plan.audio.voice_id))throw new Error('CREATIVE_VOICE_ID_DENIED');
  return {preset,plan,payload:p};
}

async function fetchImage(url,fetch_impl=fetch){
  const response=await fetch_impl(allowedImage(url),{redirect:'error'});if(!response.ok)throw new Error(`CREATIVE_IMAGE_FETCH_FAILED:${response.status}`);
  const mime=String(response.headers.get('content-type')||'').split(';')[0].toLowerCase();if(!['image/jpeg','image/png','image/webp'].includes(mime))throw new Error('CREATIVE_IMAGE_MIME_DENIED');
  const b=Buffer.from(await response.arrayBuffer());if(b.length>14*1024*1024)throw new Error('CREATIVE_IMAGE_TOO_LARGE');return {buffer:b,mime,data:`data:${mime};base64,${b.toString('base64')}`};
}

async function materializeVideo(ref,temp,fetch_impl=fetch){
  const source=resolveGovernedVideoSourceV2(ref);const out=path.join(temp,`source-${source.provider.toLowerCase()}-${source.asset_id}.mp4`);
  if(!fsSync.existsSync(out)){
    const headers=source.provider==='PEXELS'?{'user-agent':'Mozilla/5.0 CEREBRO-Creative-QA/2.1','referer':'https://www.pexels.com/'}:{'user-agent':'CEREBRO-Creative-QA/2.1'};
    const res=await fetch_impl(source.download_url,{headers,redirect:'follow'});if(!res.ok||!res.body)throw new Error(`VIDEO_SOURCE_DOWNLOAD_FAILED:${ref}:${res.status}`);
    const len=Number(res.headers.get('content-length')||0);if(len>180*1024*1024)throw new Error(`VIDEO_SOURCE_TOO_LARGE:${ref}`);
    await pipeline(Readable.fromWeb(res.body),createWriteStream(out));
  }
  const {stdout}=await execFileAsync('ffprobe',['-v','error','-show_entries','format=duration,size','-show_entries','stream=codec_type,codec_name,width,height','-of','json',out]);
  const probe=JSON.parse(stdout),v=arr(probe.streams).find(x=>x.codec_type==='video');if(!v||v.codec_name!=='h264')throw new Error(`VIDEO_SOURCE_CODEC_DENIED:${ref}`);
  const duration=Number(probe.format?.duration||0);if(duration<=0)throw new Error(`VIDEO_SOURCE_DURATION_INVALID:${ref}`);
  return {ref,source,local_path:out,duration,width:v.width,height:v.height,provenance:sourceProvenanceV2(ref)};
}

function logoPlate(logo,w,h,side='right'){
  const pos=side==='right'?`right:${Math.round(w*.045)}px`:`left:${Math.round(w*.045)}px`;
  return `<div class="logoPlate" style="${pos}"><img src="${logo}"/></div>`;
}

function layoutHtml({w,h,source,logo,brand,headline,subheadline,cta,metric,metric_label,index,count,layout}){
  const accent=brand.accent;const base=`*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;font-family:Arial,Helvetica,sans-serif}body{background:#111}.root{position:relative;width:${w}px;height:${h}px;overflow:hidden;color:#fff}.photo{position:absolute;inset:0;background:url('${source}') center/cover no-repeat}.logoPlate{position:absolute;z-index:8;top:${Math.round(h*.04)}px;background:rgba(255,255,255,.91);border:1px solid rgba(255,255,255,.55);border-radius:${Math.round(w*.018)}px;padding:${Math.round(w*.011)}px ${Math.round(w*.016)}px;box-shadow:0 12px 40px rgba(0,0,0,.22)}.logoPlate img{display:block;width:${Math.round(w*.15)}px;max-height:${Math.round(h*.12)}px;object-fit:contain}.eyebrow{font-weight:900;letter-spacing:.13em;text-transform:uppercase;color:${accent};font-size:${Math.max(18,Math.round(w*.019))}px}.headline{font-weight:950;letter-spacing:-.045em;line-height:.99}.sub{line-height:1.3;font-weight:500}.cta{display:inline-block;background:${accent};color:#fff;border-radius:999px;padding:${Math.round(w*.012)}px ${Math.round(w*.024)}px;font-weight:900}.metric{font-weight:950;color:${accent};letter-spacing:-.06em}.counter{position:absolute;z-index:8;bottom:${Math.round(h*.035)}px;font-size:${Math.round(w*.014)}px;font-weight:800;letter-spacing:.12em;opacity:.7}`;
  const L=String(layout||'FULL_BLEED').toUpperCase();
  if(L==='SPLIT_EDITORIAL')return `<!doctype html><html><head><meta charset="utf-8"><style>${base}.photo{left:44%;}.panel{position:absolute;z-index:3;left:0;top:0;width:48%;height:100%;background:linear-gradient(145deg,#0b0b0d 0%,#202126 62%,${accent} 160%);padding:${Math.round(h*.12)}px ${Math.round(w*.055)}px}.headline{font-size:${Math.round(w*.059)}px;margin-top:${Math.round(h*.04)}px}.sub{font-size:${Math.round(w*.027)}px;margin-top:${Math.round(h*.032)}px;opacity:.9}.cta{font-size:${Math.round(w*.019)}px;margin-top:${Math.round(h*.045)}px}.counter{left:${Math.round(w*.055)}px}</style></head><body><main class="root"><div class="photo"></div><section class="panel"><div class="eyebrow">FÉNIX CAPITAL · ${String(index).padStart(2,'0')}</div>${metric?`<div class="metric" style="font-size:${Math.round(w*.08)}px;margin-top:${Math.round(h*.05)}px">${esc(metric)}</div><div>${esc(metric_label)}</div>`:''}<div class="headline">${esc(headline)}</div>${subheadline?`<div class="sub">${esc(subheadline)}</div>`:''}${cta?`<div class="cta">${esc(cta)}</div>`:''}</section>${logoPlate(logo,w,h,'right')}<div class="counter">${index} / ${count}</div></main></body></html>`;
  if(L==='GLASS_CARD')return `<!doctype html><html><head><meta charset="utf-8"><style>${base}.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.56))}.card{position:absolute;z-index:4;left:${Math.round(w*.07)}px;right:${Math.round(w*.07)}px;bottom:${Math.round(h*.09)}px;background:rgba(12,12,14,.74);border:1px solid rgba(255,255,255,.25);border-radius:${Math.round(w*.035)}px;padding:${Math.round(w*.045)}px;box-shadow:0 24px 70px rgba(0,0,0,.38);backdrop-filter:blur(20px)}.headline{font-size:${Math.round(w*.06)}px;margin-top:${Math.round(h*.018)}px}.sub{font-size:${Math.round(w*.027)}px;margin-top:${Math.round(h*.022)}px}.cta{font-size:${Math.round(w*.019)}px;margin-top:${Math.round(h*.028)}px}.counter{right:${Math.round(w*.08)}px}</style></head><body><main class="root"><div class="photo"></div><div class="shade"></div><section class="card"><div class="eyebrow">FÉNIX CAPITAL</div>${metric?`<div class="metric" style="font-size:${Math.round(w*.075)}px">${esc(metric)}</div><div>${esc(metric_label)}</div>`:''}<div class="headline">${esc(headline)}</div>${subheadline?`<div class="sub">${esc(subheadline)}</div>`:''}${cta?`<div class="cta">${esc(cta)}</div>`:''}</section>${logoPlate(logo,w,h,'right')}<div class="counter">${index} / ${count}</div></main></body></html>`;
  if(L==='METRIC_HERO')return `<!doctype html><html><head><meta charset="utf-8"><style>${base}.shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(6,6,7,.88),rgba(6,6,7,.38),rgba(6,6,7,.14))}.copy{position:absolute;z-index:4;left:${Math.round(w*.065)}px;top:${Math.round(h*.16)}px;width:62%}.metric{font-size:${Math.round(w*.14)}px}.headline{font-size:${Math.round(w*.055)}px;margin-top:${Math.round(h*.025)}px}.sub{font-size:${Math.round(w*.026)}px;margin-top:${Math.round(h*.025)}px}.cta{font-size:${Math.round(w*.019)}px;margin-top:${Math.round(h*.035)}px}.counter{left:${Math.round(w*.065)}px}</style></head><body><main class="root"><div class="photo"></div><div class="shade"></div><section class="copy"><div class="eyebrow">${esc(metric_label||'FÉNIX CAPITAL')}</div><div class="metric">${esc(metric||String(index).padStart(2,'0'))}</div><div class="headline">${esc(headline)}</div>${subheadline?`<div class="sub">${esc(subheadline)}</div>`:''}${cta?`<div class="cta">${esc(cta)}</div>`:''}</section>${logoPlate(logo,w,h,'right')}<div class="counter">${index} / ${count}</div></main></body></html>`;
  if(L==='FRAME_MINIMAL')return `<!doctype html><html><head><meta charset="utf-8"><style>${base}.photo{inset:${Math.round(w*.045)}px;border-radius:${Math.round(w*.03)}px}.frame{position:absolute;inset:0;background:#f7f5f0}.copy{position:absolute;z-index:5;left:${Math.round(w*.09)}px;right:${Math.round(w*.09)}px;bottom:${Math.round(h*.07)}px;background:#fff;color:#141414;border-radius:${Math.round(w*.025)}px;padding:${Math.round(w*.038)}px;box-shadow:0 18px 60px rgba(0,0,0,.16)}.headline{font-size:${Math.round(w*.047)}px}.sub{font-size:${Math.round(w*.023)}px;margin-top:${Math.round(h*.018)}px}.cta{font-size:${Math.round(w*.018)}px;margin-top:${Math.round(h*.024)}px}.counter{right:${Math.round(w*.06)}px;color:#222}</style></head><body><main class="root"><div class="frame"></div><div class="photo"></div><section class="copy"><div class="eyebrow">FÉNIX CAPITAL</div><div class="headline">${esc(headline)}</div>${subheadline?`<div class="sub">${esc(subheadline)}</div>`:''}${cta?`<div class="cta">${esc(cta)}</div>`:''}</section>${logoPlate(logo,w,h,'right')}<div class="counter">${index} / ${count}</div></main></body></html>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${base}.shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,5,6,.88),rgba(5,5,6,.28) 64%,rgba(5,5,6,.08))}.copy{position:absolute;z-index:4;left:${Math.round(w*.065)}px;top:${Math.round(h*.18)}px;width:61%}.headline{font-size:${Math.round(w*.062)}px;margin-top:${Math.round(h*.025)}px}.sub{font-size:${Math.round(w*.027)}px;margin-top:${Math.round(h*.025)}px}.cta{font-size:${Math.round(w*.019)}px;margin-top:${Math.round(h*.035)}px}.counter{left:${Math.round(w*.065)}px}.accent{position:absolute;z-index:3;left:0;top:0;width:${Math.max(10,Math.round(w*.012))}px;height:100%;background:${accent}}</style></head><body><main class="root"><div class="photo"></div><div class="shade"></div><div class="accent"></div><section class="copy"><div class="eyebrow">FÉNIX CAPITAL · ${String(index).padStart(2,'0')}</div>${metric?`<div class="metric" style="font-size:${Math.round(w*.09)}px;margin-top:${Math.round(h*.035)}px">${esc(metric)}</div><div>${esc(metric_label)}</div>`:''}<div class="headline">${esc(headline)}</div>${subheadline?`<div class="sub">${esc(subheadline)}</div>`:''}${cta?`<div class="cta">${esc(cta)}</div>`:''}</section>${logoPlate(logo,w,h,'right')}<div class="counter">${index} / ${count}</div></main></body></html>`;
}

function overlayHtml({w,h,logo,brand,headline,subheadline,metric,metric_label,index,count,layout='FULL_BLEED'}){
  const accent=brand.accent;const side=index%2===0?'right':'left';const xpos=side==='left'?`left:${Math.round(w*.055)}px`:`right:${Math.round(w*.055)}px`;const align=side==='left'?'left':'right';
  return `<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent;font-family:Arial,Helvetica,sans-serif}.veil{position:absolute;inset:0;background:linear-gradient(${side==='left'?'90deg':'270deg'},rgba(4,4,5,.66),rgba(4,4,5,.07) 66%,rgba(4,4,5,0))}.copy{position:absolute;z-index:4;${xpos};top:${Math.round(h*.15)}px;width:${Math.round(w*.58)}px;text-align:${align};color:#fff;text-shadow:0 3px 22px rgba(0,0,0,.55)}.eyebrow{font-size:${Math.max(18,Math.round(w*.017))}px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:${accent}}.metric{font-size:${Math.round(w*.075)}px;font-weight:950;color:${accent};letter-spacing:-.05em;margin-top:${Math.round(h*.02)}px}.headline{font-size:${Math.round(w*.052)}px;font-weight:950;line-height:1.02;letter-spacing:-.04em;margin-top:${Math.round(h*.025)}px}.sub{font-size:${Math.round(w*.024)}px;line-height:1.28;margin-top:${Math.round(h*.022)}px}.logoPlate{position:absolute;z-index:8;top:${Math.round(h*.035)}px;${side==='left'?`right:${Math.round(w*.04)}px`:`left:${Math.round(w*.04)}px`};background:rgba(255,255,255,.91);border-radius:${Math.round(w*.016)}px;padding:${Math.round(w*.008)}px ${Math.round(w*.013)}px;box-shadow:0 10px 32px rgba(0,0,0,.2)}.logoPlate img{width:${Math.round(w*.14)}px;max-height:${Math.round(h*.11)}px;object-fit:contain;display:block}.progress{position:absolute;left:0;bottom:0;width:100%;height:${Math.max(7,Math.round(h*.007))}px;background:rgba(255,255,255,.16)}.progress span{display:block;height:100%;width:${Math.round(index/count*100)}%;background:${accent}}</style></head><body><div class="veil"></div><section class="copy"><div class="eyebrow">FÉNIX CAPITAL · ${String(index).padStart(2,'0')}</div>${metric?`<div class="metric">${esc(metric)}</div><div class="sub">${esc(metric_label)}</div>`:''}<div class="headline">${esc(headline)}</div>${subheadline?`<div class="sub">${esc(subheadline)}</div>`:''}</section>${logoPlate(logo,w,h,side==='left'?'right':'left')}<div class="progress"><span></span></div></body></html>`;
}

async function screenshotHtml(browser,html,w,h,out,{transparent=false}={}){const p=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});try{await p.setContent(html,{waitUntil:'load'});await p.screenshot({path:out,type:'png',omitBackground:transparent})}finally{await p.close()}}
function runInput(cmd,args,input){return new Promise((res,rej)=>{const c=spawn(cmd,args,{stdio:['pipe','pipe','pipe']});let e='';c.stderr.on('data',d=>e+=d);c.on('error',rej);c.on('close',code=>code===0?res():rej(new Error(`PROCESS_FAILED:${path.basename(cmd)}:${code}:${e.slice(-1200)}`)));c.stdin.end(input)})}

async function piper(text,temp,id){const bin=req(process.env.CEREBRO_PIPER_BIN,'CEREBRO_PIPER_BIN'),model=req(process.env.CEREBRO_PIPER_MODEL,'CEREBRO_PIPER_MODEL'),config=req(process.env.CEREBRO_PIPER_CONFIG,'CEREBRO_PIPER_CONFIG');const out=path.join(temp,'voice.wav');await runInput(bin,['--model',model,'--config',config,'--speaker',String(VOICES.get(id)),'--output_file',out],`${text}\n`);return out}
async function music(total,temp){const out=path.join(temp,'music.wav'),fade=Math.max(0,total-3);await execFileAsync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i',`sine=frequency=174.61:sample_rate=44100:duration=${total}`,'-f','lavfi','-i',`sine=frequency=261.63:sample_rate=44100:duration=${total}`,'-f','lavfi','-i',`sine=frequency=392:sample_rate=44100:duration=${total}`,'-filter_complex',`[0:a]volume=.023[a0];[1:a]volume=.016[a1];[2:a]volume=.01[a2];[a0][a1][a2]amix=inputs=3:normalize=0,lowpass=f=1750,tremolo=f=.16:d=.14,afade=t=in:st=0:d=2,afade=t=out:st=${fade}:d=3[m]`,'-map','[m]','-c:a','pcm_s16le','-y',out]);return out}
function assTime(sec){const cs=Math.max(0,Math.round(sec*100)),h=Math.floor(cs/360000),m=Math.floor(cs%360000/6000),s=Math.floor(cs%6000/100),c=cs%100;return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(c).padStart(2,'0')}`}
async function captions(scenes,w,h,temp){const p=path.join(temp,'captions.ass');let cursor=0,body='';for(const s of scenes){const t=txt(s.voiceover||s.subheadline||s.headline||'',900).replace(/[{}]/g,'');body+=`Dialogue: 0,${assTime(cursor)},${assTime(cursor+s.duration)},Default,,0,0,0,,${t}\n`;cursor+=s.duration}const fsiz=Math.max(34,Math.round(w*.027));const header=`[Script Info]\nScriptType: v4.00+\nPlayResX: ${w}\nPlayResY: ${h}\n[V4+ Styles]\nFormat: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\nStyle: Default,DejaVu Sans,${fsiz},&H00FFFFFF,&H000000FF,&HAA000000,&H66000000,-1,0,0,0,100,100,0,0,1,3,1,2,${Math.round(w*.06)},${Math.round(w*.06)},${Math.round(h*.055)},1\n[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n`;await fs.writeFile(p,header+body,'utf8');return p}

function photoMotion(profile,w,h,frames){const d=Math.max(2,frames),cx="iw/2-(iw/zoom/2)",cy="ih/2-(ih/zoom/2)";if(profile==='PAN_RIGHT')return `zoompan=z='1.075':x='(iw-iw/zoom)*on/${d}':y='${cy}':d=1:s=${w}x${h}:fps=30`;if(profile==='PAN_LEFT')return `zoompan=z='1.075':x='(iw-iw/zoom)*(1-on/${d})':y='${cy}':d=1:s=${w}x${h}:fps=30`;if(profile==='PULL_OUT')return `zoompan=z='max(1.0,1.10-on*.001)':x='${cx}':y='${cy}':d=1:s=${w}x${h}:fps=30`;return `zoompan=z='min(1.0+on*.001,1.11)':x='${cx}':y='${cy}':d=1:s=${w}x${h}:fps=30`}
function xfade(t){return ({CROSSFADE:'fade',DIP_TO_BLACK:'fadeblack',PUSH:'slideleft',WIPE:'wipeleft',ZOOM_CUT:'zoomin',MATCH_CUT:'fade'})[t]||'fade'}

async function photoClip({browser,photo,overlay,preset,duration,motion,out}){
  const bg=path.join(path.dirname(out),`bg-${crypto.randomUUID()}.jpg`);await fs.writeFile(bg,photo.buffer);const ov=path.join(path.dirname(out),`ov-${crypto.randomUUID()}.png`);await screenshotHtml(browser,overlay,preset.w,preset.h,ov,{transparent:true});
  await execFileAsync('ffmpeg',['-hide_banner','-loglevel','error','-loop','1','-framerate','30','-t',String(duration),'-i',bg,'-loop','1','-framerate','30','-t',String(duration),'-i',ov,'-filter_complex',`${photoMotion(motion,preset.w,preset.h,Math.round(duration*30))},format=rgba[bgm];[1:v]format=rgba[ov];[bgm][ov]overlay=x='if(lt(t,.55),-55+100*t,0)':y=0:eval=frame:shortest=1,format=yuv420p[v]`,'-map','[v]','-an','-r','30','-c:v','libx264','-preset','veryfast','-crf','22','-y',out],{maxBuffer:20*1024*1024});
}

async function liveClip({video,overlay,preset,duration,start,out,browser,accent}){
  if(start<0||start+duration>video.duration+.1)start=Math.max(0,Math.min(start,Math.max(0,video.duration-duration)));
  const ov=path.join(path.dirname(out),`ov-${crypto.randomUUID()}.png`);await screenshotHtml(browser,overlay,preset.w,preset.h,ov,{transparent:true});
  const sc=`scale=${preset.w}:${preset.h}:force_original_aspect_ratio=increase,crop=${preset.w}:${preset.h},setsar=1,eq=contrast=1.035:saturation=.94:brightness=-.015,format=rgba[base];[1:v]format=rgba[ov];[base][ov]overlay=x='if(lt(t,.55),-55+100*t,0)':y=0:eval=frame:shortest=1,drawbox=x=0:y=ih-10:w='iw*min(t/${duration},1)':h=10:color=${ffColor(accent)}@.92:t=fill,format=yuv420p[v]`;
  await execFileAsync('ffmpeg',['-hide_banner','-loglevel','error','-ss',String(start),'-t',String(duration),'-i',video.local_path,'-loop','1','-framerate','30','-t',String(duration),'-i',ov,'-filter_complex',sc,'-map','[v]','-an','-r','30','-c:v','libx264','-preset','veryfast','-crf','21','-y',out],{maxBuffer:20*1024*1024});
}

async function renderVideo(browser,plan,preset,payload,temp,images,videos,logoData){
  let total=0,liveSeconds=0;const clips=[],sceneMeta=[];const usedVideoRefs=new Set();
  for(let i=0;i<plan.scenes.length;i++){
    const s=obj(plan.scenes[i]),duration=Math.min(15,Math.max(2,Number(s.duration_sec||s.duration||6)));total+=duration;if(total>preset.max)throw new Error(`VIDEO_DURATION_OVER_${preset.max}_SECONDS`);
    const kind=String(s.source_kind||'PHOTO').toUpperCase(),clip=path.join(temp,`clip-${String(i+1).padStart(2,'0')}.mp4`),overlay=overlayHtml({w:preset.w,h:preset.h,logo:logoData,brand:plan.brand,headline:txt(s.headline||payload.headline||'Fénix Capital',130),subheadline:txt(s.subheadline||'',260),metric:txt(s.metric||'',40),metric_label:txt(s.metric_label||'',100),index:i+1,count:plan.scenes.length,layout:s.layout_style});
    if(kind==='VIDEO'){
      const ref=String(s.video_source||plan.video_sources[i%plan.video_sources.length]||'');const vid=videos.get(ref);if(!vid)throw new Error(`VIDEO_SCENE_SOURCE_MISSING:${ref}`);await liveClip({video:vid,overlay,preset,duration,start:Number(s.source_start_sec||0),out:clip,browser,accent:plan.brand.accent});liveSeconds+=duration;usedVideoRefs.add(ref);
    }else{
      const photo=images[i%images.length];if(!photo)throw new Error('PHOTO_SCENE_SOURCE_MISSING');await photoClip({browser,photo,overlay,preset,duration,motion:plan.motion_profiles[i%plan.motion_profiles.length],out:clip});
    }
    clips.push({clip,duration});sceneMeta.push({duration,headline:s.headline||'',subheadline:s.subheadline||'',voiceover:s.voiceover||s.subheadline||s.headline||'',source_kind:kind});
  }
  const td=.55,inputs=clips.flatMap(x=>['-i',x.clip]);let prev='0:v',elapsed=clips[0].duration,fc='';for(let i=1;i<clips.length;i++){const out=`v${i}`,off=Math.max(.1,elapsed-td*i),tr=xfade(plan.transitions[(i-1)%plan.transitions.length]);fc+=`[${prev}][${i}:v]xfade=transition=${tr}:duration=${td}:offset=${off}[${out}];`;prev=out;elapsed+=clips[i].duration}
  const visual=path.join(temp,'visual.mp4');if(clips.length===1)await fs.copyFile(clips[0].clip,visual);else await execFileAsync('ffmpeg',['-hide_banner','-loglevel','error',...inputs,'-filter_complex',fc.slice(0,-1),'-map',`[${prev}]`,'-r','30','-c:v','libx264','-preset','veryfast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart','-y',visual],{maxBuffer:30*1024*1024});
  const finalDuration=Math.max(1,total-td*(clips.length-1)),narration=sceneMeta.map(x=>x.voiceover).filter(Boolean).join(' '),voice=plan.audio.voice_enabled?await piper(req(narration,'CREATIVE_VOICE_TEXT'),temp,plan.audio.voice_id):null,mus=plan.audio.music_enabled?await music(finalDuration,temp):null,ass=plan.audio.captions?await captions(sceneMeta,preset.w,preset.h,temp):null;
  const out=path.join(temp,`${plan.output_type.toLowerCase()}-${crypto.randomUUID()}.mp4`),args=['-hide_banner','-loglevel','error','-i',visual];if(voice)args.push('-i',voice);if(mus)args.push('-i',mus);let af='',amap='';if(voice&&mus){af='[2:a][1:a]sidechaincompress=threshold=.015:ratio=10:attack=20:release=420[duck];[1:a]volume=1.05[v];[duck]volume=.70[m];[v][m]amix=inputs=2:duration=longest:normalize=0[a]';amap='[a]'}else if(voice){af='[1:a]volume=1.05,apad[a]';amap='[a]'}else if(mus){af='[1:a]volume=.7[a]';amap='[a]'}if(af)args.push('-filter_complex',af);args.push('-map','0:v:0');if(amap)args.push('-map',amap);if(ass)args.push('-vf',`ass=${ass}`);args.push('-c:v','libx264','-preset','veryfast','-crf','21','-c:a','aac','-b:a','160k','-t',String(finalDuration),'-movflags','+faststart','-y',out);await execFileAsync('ffmpeg',args,{maxBuffer:30*1024*1024});
  return {out,duration:finalDuration,sceneMeta,live_action_seconds_ratio:Number((liveSeconds/Math.max(total,1)).toFixed(3)),live_action_source_count:usedVideoRefs.size,usedVideoRefs:[...usedVideoRefs]};
}

async function analyzeVideo(file,temp){const {stdout}=await execFileAsync('ffprobe',['-v','error','-show_entries','stream=codec_type,codec_name,width,height','-of','json',file]);const probe=JSON.parse(stdout),audio=arr(probe.streams).some(x=>x.codec_type==='audio');const dir=path.join(temp,'samples');await fs.mkdir(dir,{recursive:true});await execFileAsync('ffmpeg',['-hide_banner','-loglevel','error','-i',file,'-vf','fps=1/2','-frames:v','40',path.join(dir,'s-%03d.png')]);const names=await fs.readdir(dir),hashes=[];for(const n of names)hashes.push(sha256(await fs.readFile(path.join(dir,n))));const ratio=names.length?new Set(hashes).size/names.length:0;return {audio_stream_present:audio,unique_frame_ratio:Number(ratio.toFixed(3)),motion_score:Number(ratio.toFixed(3))}}

async function renderStatic(browser,plan,preset,payload,temp,images,logoData){const photo=images[0];if(!photo)throw new Error('STATIC_VISUAL_SOURCE_REQUIRED');const layout=String(payload.layout_style||'FULL_BLEED').toUpperCase(),out=path.join(temp,`${plan.output_type.toLowerCase()}-${crypto.randomUUID()}.png`);await screenshotHtml(browser,layoutHtml({w:preset.w,h:preset.h,source:photo.data,logo:logoData,brand:plan.brand,headline:txt(payload.headline||'Fénix Capital',130),subheadline:txt(payload.subheadline||'',280),cta:txt(payload.cta||'',90),metric:txt(payload.metric||'',50),metric_label:txt(payload.metric_label||'',120),index:1,count:1,layout}),preset.w,preset.h,out);return [{local_path:out,mime:'image/png',width:preset.w,height:preset.h,layout_style:layout}]}
async function renderCarousel(browser,plan,preset,payload,temp,images,logoData){const outs=[];for(let i=0;i<plan.pages.length;i++){const p=obj(plan.pages[i]),photo=images[i%images.length];if(!photo)throw new Error('CAROUSEL_VISUAL_SOURCE_REQUIRED');const layout=String(p.layout_style||LAYOUTS[i%LAYOUTS.length]).toUpperCase(),out=path.join(temp,`carousel-${String(i+1).padStart(2,'0')}.png`);await screenshotHtml(browser,layoutHtml({w:preset.w,h:preset.h,source:photo.data,logo:logoData,brand:plan.brand,headline:txt(p.headline||payload.headline||'',130),subheadline:txt(p.subheadline||'',280),cta:txt(p.cta||'',90),metric:txt(p.metric||'',50),metric_label:txt(p.metric_label||'',120),index:i+1,count:plan.pages.length,layout}),preset.w,preset.h,out);outs.push({local_path:out,mime:'image/png',width:preset.w,height:preset.h,page:i+1,layout_style:layout})}return outs}

export async function renderCreativeJobV2Live(job,{browserFactory=()=>chromium.launch({headless:true}),fetch_impl=fetch}={}){
  if(!['PREPROD','PROD'].includes(String(job.environment||'').toUpperCase()))throw new Error('ENVIRONMENT_DENIED');const {preset,plan,payload}=normalize(job);assertCreativePlanV2({plan});const temp=await fs.mkdtemp(path.join(os.tmpdir(),'cerebro-creative-v2-live-')),browser=await browserFactory();
  try{
    const [logo,...images]=await Promise.all([fetchImage(plan.brand.logo_url,fetch_impl),...plan.visual_sources.map(x=>fetchImage(x,fetch_impl))]);const videoPairs=await Promise.all(plan.video_sources.map(async ref=>[ref,await materializeVideo(ref,temp,fetch_impl)]));const videos=new Map(videoPairs);let artifacts,quality,provenance=[];
    if(preset.kind==='VIDEO'){
      const r=await renderVideo(browser,plan,preset,payload,temp,images,videos,logo.data),physical=await analyzeVideo(r.out,temp);Object.assign(physical,{scene_change_count:Math.max(0,r.sceneMeta.length-1),live_action_seconds_ratio:r.live_action_seconds_ratio,live_action_source_count:r.live_action_source_count,animated_overlay_ratio:1});quality=assertCreativePlanV2({plan,physical_evidence:physical});provenance=r.usedVideoRefs.map(sourceProvenanceV2);artifacts=[{local_path:r.out,mime:'video/mp4',width:preset.w,height:preset.h,duration_sec:r.duration,audio:{voice:plan.audio.voice_enabled?'PIPER':null,music:plan.audio.music_enabled?'FFMPEG_PROCEDURAL':null,ducking:plan.audio.ducking,captions:plan.audio.captions},physical_evidence:physical,video_source_provenance:provenance}];
    }else if(preset.kind==='CAROUSEL'){artifacts=await renderCarousel(browser,plan,preset,payload,temp,images,logo.data);quality=assertCreativePlanV2({plan})}else{artifacts=await renderStatic(browser,plan,preset,payload,temp,images,logo.data);quality=assertCreativePlanV2({plan})}
    for(const a of artifacts){const b=await fs.readFile(a.local_path);Object.assign(a,{bytes:b.length,sha256:sha256(b),filename:path.basename(a.local_path),quality_verdict:quality.verdict,quality_score:quality.score,visual_sources:plan.visual_sources,logo_url:plan.brand.logo_url})}
    return {temp,artifacts,quality,plan,video_source_provenance:provenance};
  }catch(e){await fs.rm(temp,{recursive:true,force:true}).catch(()=>{});throw e}finally{await browser.close()}
}

export const CREATIVE_JOB_RUNNER_V2_LIVE_CONTRACT=Object.freeze({schema_version:'2.2.1',owner_engine:'FACT-001',status:'PREPROD_CANDIDATE',runtime:'PLAYWRIGHT_FFMPEG_PIPER',mandatory_creative_tribunal:'CREATIVE_QUALITY_TRIBUNAL_V2',governed_live_action_sources:true,pexels_license_provenance:true,transparent_logo:true,multiple_layout_system:true,real_live_action:true,photo_motion:true,animated_overlay:true,transitions:true,neural_voice:true,procedural_music:true,audio_ducking:true,captions:true,physical_motion_analysis:true,live_action_ratio_analysis:true,rollback_runtime:'creative-job-runner-v1.mjs',publish_authorized:false,additional_cost_eur:0});
