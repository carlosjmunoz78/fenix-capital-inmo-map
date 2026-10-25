import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import crypto from 'node:crypto';
import { planKineticCaptionsV27, renderKineticAssV27 } from './creative-kinetic-captions-v27.mjs';
import { FENIX_BRAND_THEME, assertFenixPaletteColor } from './creative-brand-theme-fenix-v27.mjs';

const execFileAsync = promisify(execFile);
export const FINAL_CLOSEOUT_VERSION = '2.7.5';

const BANNED_ROLE_PATTERNS = [/CAFETER/i,/HELLO/i,/GENERIC_NOTEBOOK/i,/RANDOM_STOCK_HUMAN/i];
const BRAND = FENIX_BRAND_THEME.palette;
const MOTION_BRAND_POLICY = Object.freeze({
  source: FENIX_BRAND_THEME.source,
  dominant_large_surfaces: [BRAND.orange, BRAND.charcoal],
  support_colors: [BRAND.white, BRAND.amber],
  purple_large_surface_allowed: false,
  purple_hex: BRAND.purple,
  removed_legacy_unapproved_hex: '#3A163B',
});

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

function retimeBlocksToNaturalVoice(blocks,voiceDuration){
  if(!Array.isArray(blocks)||!blocks.length) throw new Error('CAPTION_BLOCKS_REQUIRED');
  const first=Number(blocks[0].start_sec||0),last=Math.max(...blocks.map(b=>Number(b.end_sec||0)));
  const sourceSpan=Math.max(0.1,last-first);
  const voiceStart=0.12,voiceEnd=Math.max(voiceStart+0.5,Number(voiceDuration)-0.08);
  const scale=(voiceEnd-voiceStart)/sourceSpan;
  return blocks.map((b)=>({
    ...b,
    start_sec:Number((voiceStart+(Number(b.start_sec||first)-first)*scale).toFixed(3)),
    end_sec:Number((voiceStart+(Number(b.end_sec||first)-first)*scale).toFixed(3)),
  }));
}

function narrationCaptionBlocks(text,voiceDuration){
  const clean=String(text||'').replace(/\s+/g,' ').trim();
  if(!clean) throw new Error('NARRATION_TEXT_REQUIRED');
  const clauses=clean.split(/(?<=[.!?])\s+|,\s+/).map(x=>x.trim()).filter(Boolean);
  const weighted=clauses.map(text=>({text,words:Math.max(1,text.split(/\s+/).filter(Boolean).length)}));
  const totalWords=weighted.reduce((sum,x)=>sum+x.words,0);
  const start=0.12,end=Math.max(start+0.6,Number(voiceDuration)-0.08),span=end-start;
  let cursor=start;
  return weighted.map((item,index)=>{
    const share=index===weighted.length-1?end-cursor:span*(item.words/totalWords);
    const block={start_sec:Number(cursor.toFixed(3)),end_sec:Number(Math.min(end,cursor+share).toFixed(3)),text:item.text,max_words_per_burst:3};
    cursor+=share;
    return block;
  });
}

function targetDurationForVoice(baseDuration,voiceDuration,label){
  const tail=label==='video-largo-v27'?3.0:label==='reel-v27'?2.5:2.2;
  const target=Math.min(Number(baseDuration),Number(voiceDuration)+tail);
  if(target<Number(voiceDuration)+0.75) throw new Error(`VOICE_HAS_NO_CTA_ROOM:${label}:${voiceDuration}:${baseDuration}`);
  return Number(target.toFixed(3));
}
async function makeAudio({voice,videoDuration,music,musicId,out}){
  const vp=await probe(voice); const vd=Number(vp.format.duration||0); if(!vd) throw new Error('VOICE_DURATION_INVALID');
  if(vd>videoDuration-0.65) throw new Error(`CHATTERBOX_TOO_LONG_FOR_CTA:${vd.toFixed(3)}:${videoDuration.toFixed(3)}`);
  const fade=Math.max(0,videoDuration-1.15);
  const fc=`[0:a]highpass=f=80,lowpass=f=12000,loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000,aformat=channel_layouts=stereo,apad,atrim=duration=${videoDuration}[vbase];`+
    `[vbase]asplit=2[vsc][vmix];`+
    `[1:a]highpass=f=45,lowpass=f=15500,loudnorm=I=-22:TP=-2:LRA=8,volume=0.72,afade=t=in:st=0:d=0.18,afade=t=out:st=${fade}:d=1.15,aresample=48000,aformat=channel_layouts=stereo,apad,atrim=duration=${videoDuration}[m];`+
    `[m][vsc]sidechaincompress=threshold=0.012:ratio=7:attack=7:release=220[duck];[vmix][duck]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.94,atrim=duration=${videoDuration}[a]`;
  await execFileAsync('ffmpeg',['-hide_banner','-loglevel','error','-i',voice,'-stream_loop','-1','-i',music,'-filter_complex',fc,'-map','[a]','-c:a','pcm_s24le','-ar','48000','-ac','2','-y',out],{maxBuffer:32*1024*1024});
  return {voice_duration_sec:Number(vd.toFixed(3)),voice_playback_rate:1,voice_coverage_ratio:Number((vd/videoDuration).toFixed(4)),music_track_id:musicId};
}
function brandWindow({start,end,kind,title,sub,background,titleColor=BRAND.white,subColor=BRAND.charcoal,accentColor=BRAND.charcoal}){
  [background,titleColor,subColor,accentColor].forEach(assertFenixPaletteColor);
  if(background===BRAND.purple) throw new Error(`FENIX_PURPLE_LARGE_SURFACE_FORBIDDEN:${kind}`);
  return {start,end,kind,title,sub,background_hex:background,title_color_hex:titleColor,sub_color_hex:subColor,accent_color_hex:accentColor};
}
function coverWindows(label,duration,voiceDuration){
  const opener=brandWindow({
    start:0,end:Math.min(1.65,duration),kind:'OPENING',title:'PARA UN SEGUNDO',sub:'QUE LA PRISA NO DECIDA POR TI',
    background:BRAND.charcoal,titleColor:BRAND.white,subColor:BRAND.amber,accentColor:BRAND.orange,
  });
  const cta=brandWindow({
    start:Math.max(0,Number(voiceDuration)),end:duration,kind:'CTA',title:'FÉNIX CAPITAL',sub:'PRIMERO COMPROBAMOS. DESPUÉS, ACELERAMOS CONTIGO.',
    background:BRAND.orange,titleColor:BRAND.white,subColor:BRAND.charcoal,accentColor:BRAND.charcoal,
  });
  const repairByLabel={
    'story-v27':[brandWindow({start:5.7,end:Math.min(7.25,duration),kind:'PHYSICAL_REPAIR',title:'DECIDE CON DATOS',sub:'COMPROBAMOS ANTES DE CORRER',background:BRAND.orange,titleColor:BRAND.white,subColor:BRAND.charcoal,accentColor:BRAND.charcoal})],
    'reel-v27':[brandWindow({start:6.65,end:Math.min(9.25,duration),kind:'PHYSICAL_REPAIR',title:'SIN IR A CIEGAS',sub:'PRIMERO NÚMEROS. DESPUÉS, VELOCIDAD.',background:BRAND.orange,titleColor:BRAND.white,subColor:BRAND.charcoal,accentColor:BRAND.charcoal})],
    'video-largo-v27':[brandWindow({start:10.55,end:Math.min(15.35,duration),kind:'PHYSICAL_REPAIR',title:'LA PRISA NO MANDA',sub:'COMPROBAMOS ANTES DE RESERVAR',background:BRAND.orange,titleColor:BRAND.white,subColor:BRAND.charcoal,accentColor:BRAND.charcoal})],
  };
  return [opener,...(repairByLabel[label]||[]).filter(w=>w.start<duration&&w.end>w.start),cta];
}
function ffColor(hex){return `0x${String(assertFenixPaletteColor(hex)).replace('#','')}`}
function escDrawtext(s){return String(s).replace(/\\/g,'\\\\').replace(/:/g,'\\:').replace(/'/g,"\\'").replace(/%/g,'\\%')}
async function finalizeOne({base,voice,narrationText,music,musicId,label,outDir}){
  const baseProbe=await probe(base); const baseDuration=Number(baseProbe.format.duration||0); const stream=(baseProbe.streams||[]).find(s=>s.codec_type==='video')||{};
  const width=Number(stream.width),height=Number(stream.height); if(!baseDuration||!width||!height) throw new Error(`BASE_PROBE_INVALID:${label}`);
  const vp=await probe(voice); const voiceDuration=Number(vp.format.duration||0); if(!voiceDuration) throw new Error(`VOICE_PROBE_INVALID:${label}`);
  const duration=targetDurationForVoice(baseDuration,voiceDuration,label);
  const blocks=narrationCaptionBlocks(narrationText,voiceDuration);
  const assPlan=planKineticCaptionsV27({blocks,width,height,font_name:'Inter'}); const ass=renderKineticAssV27(assPlan); const assFile=path.join(outDir,`${label}.ass`); await fs.writeFile(assFile,ass);
  const audioFile=path.join(outDir,`${label}-audio.wav`); const audio=await makeAudio({voice,videoDuration:duration,music,musicId,out:audioFile});
  const windows=coverWindows(label,duration,voiceDuration); const panelFilters=[];
  for(const w of windows){
    const y=height<width?Math.round(height*0.37):Math.round(height*0.40);
    panelFilters.push(`drawbox=x=0:y=0:w=iw:h=ih:color=${ffColor(w.background_hex)}@0.985:t=fill:enable='between(t,${w.start},${w.end})'`);
    panelFilters.push(`drawbox=x=0:y=${Math.round(height*0.14)}:w=iw*0.22:h=${Math.max(10,Math.round(height*0.012))}:color=${ffColor(w.accent_color_hex)}@1:t=fill:enable='between(t,${w.start},${w.end})'`);
    panelFilters.push(`drawtext=font='Inter':text='${escDrawtext(w.title)}':fontcolor=${ffColor(w.title_color_hex)}:fontsize=${Math.round(Math.min(width,height)*0.085)}:x=(w-text_w)/2:y=${y}:enable='between(t,${w.start},${w.end})'`);
    panelFilters.push(`drawtext=font='Inter':text='${escDrawtext(w.sub)}':fontcolor=${ffColor(w.sub_color_hex)}:fontsize=${Math.round(Math.min(width,height)*0.032)}:x=(w-text_w)/2:y=${y+Math.round(height*0.10)}:enable='between(t,${w.start},${w.end})'`);
  }
  panelFilters.push(`ass=${assFile}`);
  const out=path.join(outDir,`${label}.mp4`);
  await execFileAsync('ffmpeg',['-hide_banner','-loglevel','error','-i',base,'-i',audioFile,'-filter_complex',`[0:v]trim=duration=${duration},setpts=PTS-STARTPTS,${panelFilters.join(',')}[v]`,'-map','[v]','-map','1:a:0','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','256k','-ar','48000','-ac','2','-t',String(duration),'-movflags','+faststart','-y',out],{maxBuffer:48*1024*1024});
  return {label,artifact:path.basename(out),sha256:await sha(out),base_sha256:await sha(base),base_duration_sec:baseDuration,duration_sec:duration,width,height,caption_events:assPlan.events.length,caption_timing:'GENERATED_FROM_ES_ES_NARRATION_TEXT',caption_source:'CHATTERBOX_BATCH_TEXT',cover_windows:windows,audio,probe:await probe(out)};
}

export async function buildV27Closeout({v26Dir,voiceDir,musicFile,outDir}){
  await fs.mkdir(outDir,{recursive:true});
  const roles=['HOME_INTERIOR','EMPTY_HOME_INTERIOR','HANDS_CALCULATOR_TOPDOWN','EMPTY_KITCHEN','HANDS_SIGN_DOCUMENT','EURO_EXCHANGE_RED','HAND_KEY_DOOR','EURO_KEYS'];
  const semantic=semanticBrollGate(roles); if(!semantic.passed) throw new Error(`SEMANTIC_BROLL_RED:${JSON.stringify(semantic)}`);
  const voiceManifest=JSON.parse(await fs.readFile(path.join(voiceDir,'batch-manifest.json'),'utf8'));
  if(voiceManifest.regional_target!=='es-ES'||voiceManifest.regional_profile_enforced!==true) throw new Error('VOICE_ES_ES_MANIFEST_REQUIRED');
  const voiceText=new Map((voiceManifest.items||[]).map(item=>[String(item.id),String(item.text||'').trim()]));
  const specs=[
    {base:'story-v26.mp4',voice:'story-raw.wav',voiceId:'story',label:'story-v27',musicId:'ACTION_TECHNO'},
    {base:'reel-v26.mp4',voice:'reel-raw.wav',voiceId:'reel',label:'reel-v27',musicId:'NIGHT_DRIVING'},
    {base:'video-largo-v26.mp4',voice:'long-raw.wav',voiceId:'long',label:'video-largo-v27',musicId:'ACTION_TECHNO'},
  ];
  const productions=[];
  for(const s of specs){
    const narrationText=voiceText.get(s.voiceId); if(!narrationText) throw new Error(`VOICE_TEXT_MISSING:${s.voiceId}`);
    productions.push(await finalizeOne({base:path.join(v26Dir,s.base),voice:path.join(voiceDir,s.voice),narrationText,music:musicFile[s.musicId],musicId:s.musicId,label:s.label,outDir}));
  }
  const brandVisualGate={
    ...MOTION_BRAND_POLICY,
    passed:productions.every(p=>p.cover_windows.every(w=>w.background_hex!==BRAND.purple&&w.background_hex!=='#3A163B')),
  };
  if(!brandVisualGate.passed) throw new Error('FENIX_BRAND_DOMINANCE_GATE_RED');
  const manifest={schema_version:'2.7.5',engine_id:'CREATIVE-STUDIO-001',environment:'PREPROD',route:'CONTEXT_BROLL_PLUS_MOTION_GRAPHICS',presenter_lite:{technical_state:'PHYSICAL_SMOKE_GREEN',creative_state:'RED_DIRECT_FINAL_USE',promoted:false,fallback_preserved:true},wan:{state:'CAPABILITY_BLOCKED',purchase_required:false},musetalk:{evaluated:false,reason:'NO_COMPATIBLE_HARDWARE_EVIDENCE'},semantic_broll_gate:semantic,physical_visual_repair:{trigger:'CONTACT_SHEET_REVIEW_V27_4_AND_USER_FEEDBACK',rejected_classes:['CAFETERIA_OR_BAR','GENERIC_HELLO_NOTEBOOK','PINK_PURPLE_DOMINANT_MOTION_PANELS'],policy:'COVER_REJECTED_WINDOWS_WITH_ORANGE_DOMINANT_FENIX_MOTION_GRAPHICS_AND_TRIM_EXCESS_POST_VOICE_METRAGE'},brand_visual_gate:brandVisualGate,voice:{engine:'CHATTERBOX_MTL_V3_ES_ES',regional_target:'es-ES',regional_profile_enforced:true,playback_policy:'NATURAL_RATE_NO_SLOWDOWN',human_quality_review:'PENDING_ES_ES_AUDIT'},captions:{renderer:'KINETIC_CAPTIONS_V27',font:'Inter',burned_in:true,sidecar_only:false,timing:'GENERATED_FROM_ES_ES_NARRATION_TEXT',source:'CHATTERBOX_BATCH_TEXT'},script_policy:{locale:'es-ES',style:'NATURAL_DIRECT_CLARITY_FIRST',caption_source:'CHATTERBOX_BATCH_TEXT',user_feedback_applied:true},baseline:'V2.6.2',old_vs_new:'V2.6.2 preserved; V2.7.5 keeps the successful V2.7.4 physical repair, switches TTS to the dedicated Spanish-Spain regional model, removes the unapproved #3A163B panel color, forbids purple on large motion surfaces, makes Fenix orange dominant and polishes narration copy',additional_recurring_cost_eur:0,publish_authorized:false,promotion_eligible:false,human_creative_review_required:true,productions};
  await fs.writeFile(path.join(outDir,'V27_FINAL_CLOSEOUT_MANIFEST.json'),JSON.stringify(manifest,null,2));
  return manifest;
}

if(import.meta.url===`file://${process.argv[1]}`){
  const [v26Dir,voiceDir,outDir,musicAction,musicNight]=process.argv.slice(2); if(!v26Dir||!voiceDir||!outDir||!musicAction||!musicNight) throw new Error('USAGE: v26Dir voiceDir outDir actionMusic nightMusic');
  const m=await buildV27Closeout({v26Dir,voiceDir,outDir,musicFile:{ACTION_TECHNO:musicAction,NIGHT_DRIVING:musicNight}}); console.log(JSON.stringify({ok:true,version:m.schema_version,route:m.route,brand_visual_gate:m.brand_visual_gate,voice:m.voice,productions:m.productions.map(p=>({label:p.label,sha256:p.sha256,duration_sec:p.duration_sec,caption_events:p.caption_events,audio:p.audio,cover_windows:p.cover_windows}))}));
}
