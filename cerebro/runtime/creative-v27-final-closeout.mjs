import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import crypto from 'node:crypto';
import { planKineticCaptionsV27, renderKineticAssV27 } from './creative-kinetic-captions-v27.mjs';

const execFileAsync = promisify(execFile);
export const FINAL_CLOSEOUT_VERSION = '2.7.3';

const BANNED_ROLE_PATTERNS = [/CAFETER/i,/HELLO/i,/GENERIC_NOTEBOOK/i,/RANDOM_STOCK_HUMAN/i];

function stampToSec(v){
  const m=String(v).match(/(\d+):(\d+):(\d+)[,.](\d+)/); if(!m) throw new Error(`SRT_TIME_INVALID:${v}`);
  return Number(m[1])*3600+Number(m[2])*60+Number(m[3])+Number(m[4].padEnd(3,'0').slice(0,3))/1000;
}
export function parseSrt(raw){
  return String(raw).trim().split(/\r?\n\r?\n+/).map((chunk)=>{
    const lines=chunk.split(/\r?\n/).filter(Boolean); const timing=lines.find(x=>x.includes('-->')); if(!timing) return null;
    const [a,b]=timing.split('-->').map(x=>x.trim()); const i=lines.indexOf(timing);
    return {start_sec:stampToSec(a),end_sec:stampToSec(b),text:lines.slice(i+1).join(' ').trim()};
  }).filter(Boolean);
}
export function semanticBrollGate(roles=[]){
  const cleaned=roles.map(String); const hard=cleaned.filter(r=>BANNED_ROLE_PATTERNS.some(p=>p.test(r)));
  const calculatorCount=cleaned.filter(r=>/CALCULATOR/i.test(r)).length;
  return {passed:hard.length===0 && calculatorCount<=2,hard_rejections:hard,calculator_count:calculatorCount,max_calculator_count:2};
}
async function probe(file){
  const {stdout}=await execFileAsync('ffprobe',['-v','error','-show_entries','format=duration,size:stream=codec_type,width,height,sample_rate,channels','-of','json',file]);
  return JSON.parse(stdout);
}
async function sha(file){return crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex')}
function atempoChain(ratio){
  const out=[]; let r=ratio;
  while(r>2.0){out.push('atempo=2.0');r/=2.0} while(r<0.5){out.push('atempo=0.5');r/=0.5}
  out.push(`atempo=${r.toFixed(5)}`); return out.join(',');
}
async function makeAudio({voice,videoDuration,music,musicId,out}){
  const vp=await probe(voice); const vd=Number(vp.format.duration||0); if(!vd) throw new Error('VOICE_DURATION_INVALID');
  const speed=vd/videoDuration;
  if(speed>1.16) throw new Error(`CHATTERBOX_TOO_LONG_FOR_NATIVE_TIMELINE:${speed.toFixed(3)}`);
  const voiceFilter=speed>1.005?`${atempoChain(speed)},` : '';
  const fade=Math.max(0,videoDuration-1.15);
  const fc=`[0:a]${voiceFilter}highpass=f=80,lowpass=f=12000,loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000,aformat=channel_layouts=stereo,apad,atrim=duration=${videoDuration}[v];`+
    `[1:a]highpass=f=45,lowpass=f=15500,loudnorm=I=-22:TP=-2:LRA=8,volume=0.72,afade=t=in:st=0:d=0.18,afade=t=out:st=${fade}:d=1.15,aresample=48000,aformat=channel_layouts=stereo,apad,atrim=duration=${videoDuration}[m];`+
    `[m][v]sidechaincompress=threshold=0.012:ratio=7:attack=7:release=220[duck];[v][duck]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.94,atrim=duration=${videoDuration}[a]`;
  await execFileAsync('ffmpeg',['-hide_banner','-loglevel','error','-i',voice,'-stream_loop','-1','-i',music,'-filter_complex',fc,'-map','[a]','-c:a','pcm_s24le','-ar','48000','-ac','2','-y',out],{maxBuffer:32*1024*1024});
  return {voice_duration_sec:Number(vd.toFixed(3)),speedup:Number(speed.toFixed(4)),music_track_id:musicId};
}
function coverWindows(label,duration){
  const tail = label==='video-largo-v27' ? 4.2 : label==='reel-v27' ? 3.0 : 2.5;
  return [{start:0,end:Math.min(1.95,duration)},{start:Math.max(0,duration-tail),end:duration}];
}
function escDrawtext(s){return String(s).replace(/\\/g,'\\\\').replace(/:/g,'\\:').replace(/'/g,"\\'").replace(/%/g,'\\%')}
async function finalizeOne({base,srt,voice,music,musicId,label,outDir}){
  const baseProbe=await probe(base); const duration=Number(baseProbe.format.duration||0); const stream=(baseProbe.streams||[]).find(s=>s.codec_type==='video')||{};
  const width=Number(stream.width),height=Number(stream.height); if(!duration||!width||!height) throw new Error(`BASE_PROBE_INVALID:${label}`);
  const blocks=parseSrt(await fs.readFile(srt,'utf8'));
  const assPlan=planKineticCaptionsV27({blocks,width,height,font_name:'Inter'}); const ass=renderKineticAssV27(assPlan); const assFile=path.join(outDir,`${label}.ass`); await fs.writeFile(assFile,ass);
  const audioFile=path.join(outDir,`${label}-audio.wav`); const audio=await makeAudio({voice,videoDuration:duration,music,musicId,out:audioFile});
  const windows=coverWindows(label,duration); const panelFilters=[];
  windows.forEach((w,i)=>{
    const title=i===0?'PARA.':'FÉNIX CAPITAL'; const sub=i===0?'LA PRISA NO DECIDE POR TI':'PRIMERO COMPROBAMOS. DESPUÉS, CORREMOS CONTIGO.';
    const y=height<width?Math.round(height*0.37):Math.round(height*0.40);
    panelFilters.push(`drawbox=x=0:y=0:w=iw:h=ih:color=${i===0?'0x222222':'0x870064'}@0.98:t=fill:enable='between(t,${w.start},${w.end})'`);
    panelFilters.push(`drawbox=x=0:y=${Math.round(height*0.14)}:w=iw*0.22:h=${Math.max(10,Math.round(height*0.012))}:color=0xFF5F00@1:t=fill:enable='between(t,${w.start},${w.end})'`);
    panelFilters.push(`drawtext=font='Inter':text='${escDrawtext(title)}':fontcolor=white:fontsize=${Math.round(Math.min(width,height)*0.085)}:x=(w-text_w)/2:y=${y}:enable='between(t,${w.start},${w.end})'`);
    panelFilters.push(`drawtext=font='Inter':text='${escDrawtext(sub)}':fontcolor=0xFFB71B:fontsize=${Math.round(Math.min(width,height)*0.034)}:x=(w-text_w)/2:y=${y+Math.round(height*0.10)}:enable='between(t,${w.start},${w.end})'`);
  });
  panelFilters.push(`ass=${assFile}`);
  const out=path.join(outDir,`${label}.mp4`);
  await execFileAsync('ffmpeg',['-hide_banner','-loglevel','error','-i',base,'-i',audioFile,'-filter_complex',`[0:v]${panelFilters.join(',')}[v]`,'-map','[v]','-map','1:a:0','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','256k','-ar','48000','-ac','2','-t',String(duration),'-movflags','+faststart','-y',out],{maxBuffer:48*1024*1024});
  return {label,artifact:path.basename(out),sha256:await sha(out),base_sha256:await sha(base),duration_sec:duration,width,height,caption_events:assPlan.events.length,cover_windows:windows,audio,probe:await probe(out)};
}

export async function buildV27Closeout({v26Dir,voiceDir,musicFile,outDir}){
  await fs.mkdir(outDir,{recursive:true});
  const roles=['HOME_INTERIOR','EMPTY_HOME_INTERIOR','HANDS_CALCULATOR_TOPDOWN','EMPTY_KITCHEN','HANDS_SIGN_DOCUMENT','EURO_EXCHANGE_RED','HAND_KEY_DOOR','EURO_KEYS'];
  const semantic=semanticBrollGate(roles); if(!semantic.passed) throw new Error(`SEMANTIC_BROLL_RED:${JSON.stringify(semantic)}`);
  const specs=[
    {base:'story-v26.mp4',srt:'story-v26.srt',voice:'story-raw.wav',label:'story-v27',musicId:'ACTION_TECHNO'},
    {base:'reel-v26.mp4',srt:'reel-v26.srt',voice:'reel-raw.wav',label:'reel-v27',musicId:'NIGHT_DRIVING'},
    {base:'video-largo-v26.mp4',srt:'video-largo-v26.srt',voice:'long-raw.wav',label:'video-largo-v27',musicId:'ACTION_TECHNO'},
  ];
  const productions=[];
  for(const s of specs) productions.push(await finalizeOne({base:path.join(v26Dir,s.base),srt:path.join(v26Dir,s.srt),voice:path.join(voiceDir,s.voice),music:musicFile[s.musicId],musicId:s.musicId,label:s.label,outDir}));
  const manifest={schema_version:'2.7.3',engine_id:'CREATIVE-STUDIO-001',environment:'PREPROD',route:'CONTEXT_BROLL_PLUS_MOTION_GRAPHICS',presenter_lite:{technical_state:'PHYSICAL_SMOKE_GREEN',creative_state:'RED_DIRECT_FINAL_USE',promoted:false,fallback_preserved:true},wan:{state:'CAPABILITY_BLOCKED',purchase_required:false},musetalk:{evaluated:false,reason:'NO_COMPATIBLE_HARDWARE_EVIDENCE'},semantic_broll_gate:semantic,voice:{engine:'CHATTERBOX_MTL_V3',upstream_pin:'5de7a54aa4e5e2baadb0182dde554908b48b85c2',human_quality_review:'PENDING'},captions:{renderer:'KINETIC_CAPTIONS_V27',font:'Inter',burned_in:true,sidecar_only:false},baseline:'V2.6.2',old_vs_new:'V2.6.2 preserved; V2.7 wraps physical baseline and removes primary human anchor via governed motion panels',additional_recurring_cost_eur:0,publish_authorized:false,promotion_eligible:false,human_creative_review_required:true,productions};
  await fs.writeFile(path.join(outDir,'V27_FINAL_CLOSEOUT_MANIFEST.json'),JSON.stringify(manifest,null,2));
  return manifest;
}

if(import.meta.url===`file://${process.argv[1]}`){
  const [v26Dir,voiceDir,outDir,musicAction,musicNight]=process.argv.slice(2); if(!v26Dir||!voiceDir||!outDir||!musicAction||!musicNight) throw new Error('USAGE: v26Dir voiceDir outDir actionMusic nightMusic');
  const m=await buildV27Closeout({v26Dir,voiceDir,outDir,musicFile:{ACTION_TECHNO:musicAction,NIGHT_DRIVING:musicNight}}); console.log(JSON.stringify({ok:true,version:m.schema_version,route:m.route,productions:m.productions.map(p=>({label:p.label,sha256:p.sha256,duration_sec:p.duration_sec,caption_events:p.caption_events,audio:p.audio}))}));
}
