import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const execFileAsync=promisify(execFile);
export const PRODUCTORA_FACEBOOK_VERSION='2.8.0';
const ORANGE='#FF5F00',CHARCOAL='#222222',WHITE='#FFFFFF',AMBER='#FFB71B';

const SOURCE_SETS=Object.freeze({
  FAST_YOUNG_VERTICAL:['8293019','3944018','30353173','6780089','4307346','7581281','31568471','3769951','9056542'],
  WARM_FAMILY_DOCUMENTARY:['3769951','4307346','8293019','27860328','7581281','31568471','6187216','9056542','7821811'],
  EDITORIAL_DATA_DARK:['6187216','9056542','27860328','7581281','31568471','3944018','7821811','5466764','4307346'],
});
const MUSIC_FILES=Object.freeze({
  BLIPPY_TRANCE:'02-kevin-macleod-blippy-trance.mp3',
  STARCourt_MALL:'01-bryan-teoh-starcourt-mall.mp3',
  BASS_MEANT_JAZZ:'05-kevin-macleod-bass-meant-jazz.mp3',
});

function slug(v){return String(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function escFilter(v){return String(v).replace(/\\/g,'\\\\').replace(/:/g,'\\:').replace(/'/g,"\\'").replace(/%/g,'\\%')}
function assEsc(v){return String(v).replace(/\\/g,'\\\\').replace(/{/g,'\\{').replace(/}/g,'\\}').replace(/\n/g,'\\N')}
function words(v){return String(v||'').trim().split(/\s+/).filter(Boolean)}
function sha256(file){const h=crypto.createHash('sha256');return fs.readFile(file).then(b=>{h.update(b);return h.digest('hex')})}
async function probe(file){const {stdout}=await execFileAsync('ffprobe',['-v','error','-show_entries','format=duration,size:stream=codec_type,width,height,sample_rate,channels','-of','json',file]);return JSON.parse(stdout)}

function formatSpec(format){
  if(format==='story')return {w:1080,h:1920,min:15,max:28,tail:1.6,orientation:'VERTICAL'};
  if(format==='reel')return {w:1080,h:1920,min:48,max:59.5,tail:1.9,orientation:'VERTICAL'};
  if(format==='long')return {w:1280,h:720,min:180,max:null,tail:3.0,orientation:'LANDSCAPE'};
  throw new Error(`FORMAT_UNKNOWN:${format}`);
}
function durationGate(format,voiceDuration){
  const s=formatSpec(format); let duration=Math.max(s.min,voiceDuration+s.tail);
  if(s.max&&duration>s.max)throw new Error(`VOICE_TOO_LONG:${format}:${voiceDuration.toFixed(2)}>${s.max}`);
  if(format==='reel'&&voiceDuration<43)throw new Error(`REEL_VOICE_TOO_SHORT:${voiceDuration.toFixed(2)}`);
  if(format==='long'&&voiceDuration<174)throw new Error(`LONG_VOICE_TOO_SHORT:${voiceDuration.toFixed(2)}`);
  return Number(duration.toFixed(3));
}
function profileSettings(id){
  if(id==='FAST_YOUNG_VERTICAL')return {clip:2.35,transition:'HARD',videoFilter:'eq=saturation=1.18:contrast=1.07:brightness=0.015,unsharp=5:5:0.35:5:5:0',musicGain:0.66,caption:'YOUNG'};
  if(id==='WARM_FAMILY_DOCUMENTARY')return {clip:4.8,transition:'XFADE',overlap:0.55,videoFilter:'eq=saturation=1.06:contrast=0.98:gamma=1.04',musicGain:0.50,caption:'FAMILY'};
  if(id==='EDITORIAL_DATA_DARK')return {clip:6.2,transition:'DIP',videoFilter:'eq=saturation=0.80:contrast=1.14:brightness=-0.02,unsharp=5:5:0.45:5:5:0',musicGain:0.40,caption:'EDITORIAL'};
  throw new Error(`VISUAL_PROFILE_UNKNOWN:${id}`);
}

function splitCaptionText(text){
  const clean=String(text||'').replace(/\s+/g,' ').trim();
  const sentences=clean.split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
  const blocks=[];
  for(const sentence of sentences){
    const ws=words(sentence);
    const max=8;
    for(let i=0;i<ws.length;i+=max)blocks.push(ws.slice(i,i+max).join(' '));
  }
  return blocks;
}
function assTime(sec){const cs=Math.max(0,Math.round(Number(sec)*100));const h=Math.floor(cs/360000),m=Math.floor((cs%360000)/6000),s=Math.floor((cs%6000)/100),c=cs%100;return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(c).padStart(2,'0')}`}
async function writeAss({text,voiceDuration,w,h,style,out}){
  const blocks=splitCaptionText(text);const counts=blocks.map(x=>Math.max(1,words(x).length));const total=counts.reduce((a,b)=>a+b,0);let cursor=0.10;
  const cfg=style==='YOUNG'
    ?{size:Math.round(Math.min(w,h)*0.060),align:2,marginV:Math.round(h*0.13),primary:'&H00FFFFFF',outline:'&H00222222',bold:-1}
    :style==='FAMILY'
      ?{size:Math.round(Math.min(w,h)*0.050),align:2,marginV:Math.round(h*0.10),primary:'&H00FFFFFF',outline:'&H00222222',bold:-1}
      :{size:Math.round(Math.min(w,h)*0.046),align:1,marginV:Math.round(h*0.09),primary:'&H00FFFFFF',outline:'&H00222222',bold:0};
  const header=`[Script Info]\nScriptType: v4.00+\nPlayResX: ${w}\nPlayResY: ${h}\nWrapStyle: 2\n\n[V4+ Styles]\nFormat: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\nStyle: Default,Inter,${cfg.size},${cfg.primary},&H0000B7FF,${cfg.outline},&H80000000,${cfg.bold},0,0,0,100,100,0,0,1,3,1,${cfg.align},${Math.round(w*0.08)},${Math.round(w*0.08)},${cfg.marginV},1\n\n[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n`;
  const lines=[];
  for(let i=0;i<blocks.length;i++){
    const share=(voiceDuration-0.2)*(counts[i]/total);const start=cursor,end=i===blocks.length-1?voiceDuration-0.08:Math.min(voiceDuration-0.08,cursor+share);cursor=end;
    const emphasis=style==='YOUNG'&&i%4===0?'{\\c&H00005FFF&}':'';
    lines.push(`Dialogue: 0,${assTime(start)},${assTime(end)},Default,,0,0,0,,${emphasis}${assEsc(blocks[i])}`);
  }
  await fs.writeFile(out,header+lines.join('\n')+'\n','utf8');
  return {events:lines.length,style};
}

async function renderAct({sources,profile,w,h,actIndex,temp}){
  const ps=profileSettings(profile);const order=[...sources];
  const shift=actIndex%sources.length;for(let i=0;i<shift;i++)order.push(order.shift());if(actIndex%2===1)order.reverse();
  const args=['-hide_banner','-loglevel','error'];
  const starts=[];
  for(let i=0;i<order.length;i++){
    const start=((actIndex*0.83+i*0.61)%2.8).toFixed(2);starts.push(Number(start));
    args.push('-stream_loop','-1','-ss',start,'-t',String(ps.clip+0.8),'-i',order[i]);
  }
  const filters=[];const labels=[];
  for(let i=0;i<order.length;i++){
    let vf=`[${i}:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},fps=30,${ps.videoFilter},trim=duration=${ps.clip},setpts=PTS-STARTPTS`;
    if(ps.transition==='DIP')vf+=`,fade=t=in:st=0:d=0.18,fade=t=out:st=${Math.max(0.1,ps.clip-0.22)}:d=0.22`;
    vf+=`[v${i}]`;filters.push(vf);labels.push(`[v${i}]`);
  }
  let outLabel='vout';let actDuration;
  if(ps.transition==='XFADE'){
    let prev='v0';let accumulated=ps.clip;
    for(let i=1;i<labels.length;i++){
      const next=`xf${i}`;const offset=accumulated-ps.overlap;
      filters.push(`[${prev}][v${i}]xfade=transition=fade:duration=${ps.overlap}:offset=${offset.toFixed(3)}[${next}]`);
      prev=next;accumulated+=ps.clip-ps.overlap;
    }
    filters.push(`[${prev}]null[${outLabel}]`);actDuration=accumulated;
  }else{
    filters.push(`${labels.join('')}concat=n=${labels.length}:v=1:a=0[${outLabel}]`);actDuration=ps.clip*labels.length;
  }
  const out=path.join(temp,`act-${actIndex}.mp4`);
  args.push('-filter_complex',filters.join(';'),'-map',`[${outLabel}]`,'-an','-c:v','libx264','-preset','veryfast','-crf','25','-pix_fmt','yuv420p','-movflags','+faststart','-y',out);
  await execFileAsync('ffmpeg',args,{maxBuffer:64*1024*1024});
  return {file:out,duration:actDuration,order:order.map(x=>path.basename(x)),starts};
}

async function makeMontage({profile,assetDir,duration,w,h,temp}){
  const ids=SOURCE_SETS[profile];const sourceFiles=ids.map(id=>path.join(assetDir,`${id}.mp4`));
  for(const f of sourceFiles)if(!fsSync.existsSync(f))throw new Error(`ASSET_MISSING:${f}`);
  const ps=profileSettings(profile);const approxAct=ps.transition==='XFADE'?ps.clip*ids.length-ps.overlap*(ids.length-1):ps.clip*ids.length;
  const actsNeeded=Math.max(1,Math.ceil(duration/approxAct));const acts=[];
  for(let i=0;i<actsNeeded;i++)acts.push(await renderAct({sources:sourceFiles,profile,w,h,actIndex:i,temp}));
  const list=path.join(temp,'acts.txt');await fs.writeFile(list,acts.map(a=>`file '${a.file.replace(/'/g,"'\\''")}'`).join('\n')+'\n');
  const out=path.join(temp,'montage.mp4');
  await execFileAsync('ffmpeg',['-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',list,'-t',String(duration),'-c:v','libx264','-preset','veryfast','-crf','24','-pix_fmt','yuv420p','-an','-movflags','+faststart','-y',out],{maxBuffer:32*1024*1024});
  return {file:out,acts:acts.map(a=>({duration:a.duration,order:a.order,starts:a.starts})),source_ids:ids};
}

function visualOverlay(profile,w,h,duration,voiceDuration,hook,cta){
  const tagY=Math.round(h*0.045),tagX=Math.round(w*0.045);
  const filters=[];
  if(profile==='FAST_YOUNG_VERTICAL'){
    filters.push(`drawbox=x=0:y=0:w=iw:h=${Math.round(h*0.095)}:color=0xFF5F00@0.96:t=fill:enable='lt(t,1.4)'`);
    filters.push(`drawtext=font='Inter':text='${escFilter(hook)}':fontcolor=white:fontsize=${Math.round(w*0.050)}:x=${Math.round(w*0.05)}:y=${Math.round(h*0.025)}:enable='lt(t,1.4)'`);
    filters.push(`drawbox=x=0:y=${Math.round(h*0.012)}:w=${Math.round(w*0.22)}:h=9:color=0xFF5F00@1:t=fill`);
  }else if(profile==='WARM_FAMILY_DOCUMENTARY'){
    filters.push(`drawbox=x=${tagX}:y=${tagY}:w=${Math.round(w*0.30)}:h=${Math.round(h*0.055)}:color=0x222222@0.72:t=fill`);
    filters.push(`drawtext=font='Inter':text='FÉNIX CAPITAL':fontcolor=white:fontsize=${Math.round(Math.min(w,h)*0.026)}:x=${tagX+18}:y=${tagY+12}`);
    filters.push(`drawbox=x=${tagX}:y=${tagY+Math.round(h*0.055)}:w=${Math.round(w*0.16)}:h=7:color=0xFF5F00@1:t=fill`);
  }else{
    filters.push(`drawbox=x=0:y=0:w=${Math.round(w*0.018)}:h=ih:color=0xFF5F00@0.96:t=fill`);
    filters.push(`drawtext=font='Inter':text='FÉNIX CAPITAL  ·  FINANCIACIÓN':fontcolor=white:fontsize=${Math.round(Math.min(w,h)*0.030)}:x=${Math.round(w*0.045)}:y=${tagY}:box=1:boxcolor=0x222222@0.70:boxborderw=14`);
  }
  const ctaStart=Math.max(0,voiceDuration);filters.push(`drawbox=x=0:y=0:w=iw:h=ih:color=0xFF5F00@0.985:t=fill:enable='between(t,${ctaStart.toFixed(3)},${duration.toFixed(3)})'`);
  filters.push(`drawtext=font='Inter':text='FÉNIX CAPITAL':fontcolor=white:fontsize=${Math.round(Math.min(w,h)*0.074)}:x=(w-text_w)/2:y=(h-text_h)/2-${Math.round(h*0.06)}:enable='between(t,${ctaStart.toFixed(3)},${duration.toFixed(3)})'`);
  filters.push(`drawtext=font='Inter':text='${escFilter(cta)}':fontcolor=0x222222:fontsize=${Math.round(Math.min(w,h)*0.032)}:x=(w-text_w)/2:y=(h-text_h)/2+${Math.round(h*0.055)}:enable='between(t,${ctaStart.toFixed(3)},${duration.toFixed(3)})'`);
  return filters;
}

async function finalize({campaign,format,audioFile,assetDir,musicDir,outDir}){
  const spec=formatSpec(format);const ap=await probe(audioFile);const voiceDuration=Number(ap.format?.duration||0);if(!voiceDuration)throw new Error(`VOICE_INVALID:${campaign.id}:${format}`);
  const duration=durationGate(format,voiceDuration);const temp=path.join(outDir,'.tmp',`${slug(campaign.id)}-${format}`);await fs.rm(temp,{recursive:true,force:true});await fs.mkdir(temp,{recursive:true});
  const montage=await makeMontage({profile:campaign.visual_profile.id,assetDir,duration,w:spec.w,h:spec.h,temp});
  const ass=path.join(temp,'captions.ass');const captions=await writeAss({text:campaign.formats[format].text,voiceDuration,w:spec.w,h:spec.h,style:profileSettings(campaign.visual_profile.id).caption,out:ass});
  const overlays=visualOverlay(campaign.visual_profile.id,spec.w,spec.h,duration,voiceDuration,campaign.hook,campaign.cta);overlays.push(`ass=${ass}`);
  const music=path.join(musicDir,MUSIC_FILES[campaign.visual_profile.music]);if(!fsSync.existsSync(music))throw new Error(`MUSIC_MISSING:${music}`);
  const gain=profileSettings(campaign.visual_profile.id).musicGain;const fade=Math.max(0,duration-1.2);
  const fc=`[0:v]${overlays.join(',')}[v];`+
    `[1:a]highpass=f=80,lowpass=f=12000,loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000,aformat=channel_layouts=stereo,apad,atrim=duration=${duration}[voice];`+
    `[voice]asplit=2[vsc][vmix];`+
    `[2:a]highpass=f=45,lowpass=f=15500,loudnorm=I=-24:TP=-2:LRA=8,volume=${gain},afade=t=in:st=0:d=0.25,afade=t=out:st=${fade}:d=1.2,aresample=48000,aformat=channel_layouts=stereo,apad,atrim=duration=${duration}[music];`+
    `[music][vsc]sidechaincompress=threshold=0.012:ratio=7:attack=8:release=240[duck];[vmix][duck]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.94,atrim=duration=${duration}[a]`;
  const filename=`${slug(campaign.id)}-${format}-v28.mp4`;const out=path.join(outDir,filename);
  await execFileAsync('ffmpeg',['-hide_banner','-loglevel','error','-i',montage.file,'-i',audioFile,'-stream_loop','-1','-i',music,'-filter_complex',fc,'-map','[v]','-map','[a]','-c:v','libx264','-preset','fast','-crf',format==='long'?'25':'22','-maxrate',format==='long'?'1600k':'4200k','-bufsize',format==='long'?'3200k':'8400k','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-ar','48000','-ac','2','-t',String(duration),'-movflags','+faststart','-y',out],{maxBuffer:64*1024*1024});
  const op=await probe(out);const bytes=Number(op.format?.size||0);
  return {campaign_id:campaign.id,target:campaign.target,concept:campaign.concept,hook:campaign.hook,cta:campaign.cta,format,artifact:filename,sha256:await sha256(out),duration_sec:Number(Number(op.format?.duration||0).toFixed(3)),voice_duration_sec:Number(voiceDuration.toFixed(3)),width:spec.w,height:spec.h,bytes,voice:campaign.voice,visual_profile:campaign.visual_profile,captions,montage:{source_ids:montage.source_ids,act_count:montage.acts.length,acts:montage.acts},music:{id:campaign.visual_profile.music,file:path.basename(music),license:'CC0'},publish_authorized:false,promotion_eligible:false};
}

export async function buildFacebookProductoraV28({briefFile,audioDir,assetDir,musicDir,outDir}){
  const brief=JSON.parse(await fs.readFile(briefFile,'utf8'));if(brief.engine_id!=='SOCIAL-FACEBOOK-VIDEO-DIRECTOR-001'||brief.environment!=='PREPROD')throw new Error('FACEBOOK_BRIEF_CONTRACT_INVALID');
  await fs.mkdir(outDir,{recursive:true});const productions=[];
  for(const campaign of brief.campaigns){
    for(const format of ['story','reel','long']){
      const audio=path.join(audioDir,`${slug(campaign.id)}-${format}.wav`);if(!fsSync.existsSync(audio))throw new Error(`AUDIO_MISSING:${audio}`);
      productions.push(await finalize({campaign,format,audioFile:audio,assetDir,musicDir,outDir}));
    }
  }
  const reels=productions.filter(p=>p.format==='reel'),longs=productions.filter(p=>p.format==='long'),stories=productions.filter(p=>p.format==='story');
  const diversity={targets:new Set(productions.map(p=>p.target.age_band)).size,voices:new Set(productions.map(p=>p.voice.id)).size,visual_profiles:new Set(productions.map(p=>p.visual_profile.id)).size,camera_profiles:new Set(productions.map(p=>p.visual_profile.camera)).size,lighting_profiles:new Set(productions.map(p=>p.visual_profile.lighting)).size,transition_profiles:new Set(productions.map(p=>p.visual_profile.transition)).size,music_profiles:new Set(productions.map(p=>p.music.id)).size,concepts:new Set(productions.map(p=>p.concept)).size,hooks:new Set(productions.map(p=>p.hook)).size,ctas:new Set(productions.map(p=>p.cta)).size};
  const gates={production_count:productions.length===9,three_stories:stories.length===3,three_reels:reels.length===3,three_longs:longs.length===3,reel_duration:reels.every(p=>p.duration_sec>=48&&p.duration_sec<60),long_duration:longs.every(p=>p.duration_sec>=180),story_duration:stories.every(p=>p.duration_sec>=15&&p.duration_sec<=28),three_real_voice_identities:diversity.voices===3,creative_diversity:['visual_profiles','camera_profiles','lighting_profiles','transition_profiles','music_profiles','concepts','hooks','ctas'].every(k=>diversity[k]===3),spanish_spain:productions.every(p=>p.voice.locale==='es-ES'),zero_additional_cost:true,no_publish:productions.every(p=>p.publish_authorized===false&&p.promotion_eligible===false)};
  if(!Object.values(gates).every(Boolean))throw new Error(`PRODUCTORA_V28_GATE_RED:${JSON.stringify({gates,diversity,reels:reels.map(x=>x.duration_sec),longs:longs.map(x=>x.duration_sec),stories:stories.map(x=>x.duration_sec)})}`);
  const manifest={schema_version:'2.8.0',engine_id:'CREATIVE-STUDIO-001',upstream_decision_engine:brief.engine_id,company_id:'fenix',environment:'PREPROD',channel:'FACEBOOK',business_family:'FINANCIAL_REAL_ESTATE',separation_of_concerns:'FACEBOOK_DECIDES_WHAT_PRODUCTORA_DECIDES_HOW',productions,diversity,gates,publish_authorized:false,promotion_eligible:false,human_creative_review_required:true,human_voice_quality_review:'PENDING_USER_TRIBUNAL',additional_recurring_cost_eur:0,rollback:'V2.7.5_PREPROD_AND_V2.6.2_BASELINE_PRESERVED'};
  const manifestFile=path.join(outDir,'FACEBOOK_PRODUCTORA_V28_MANIFEST.json');await fs.writeFile(manifestFile,JSON.stringify(manifest,null,2)+'\n');
  await fs.rm(path.join(outDir,'.tmp'),{recursive:true,force:true});
  return manifest;
}

if(import.meta.url===`file://${process.argv[1]}`){
  const [briefFile,audioDir,assetDir,musicDir,outDir]=process.argv.slice(2);if(!outDir)throw new Error('USAGE: node creative-facebook-productora-v28.mjs <brief> <audioDir> <assetDir> <musicDir> <outDir>');
  const m=await buildFacebookProductoraV28({briefFile,audioDir,assetDir,musicDir,outDir});
  console.log(JSON.stringify({ok:true,version:PRODUCTORA_FACEBOOK_VERSION,productions:m.productions.map(p=>({campaign:p.campaign_id,format:p.format,duration:p.duration_sec,voice:p.voice.id,visual:p.visual_profile.id,artifact:p.artifact})),diversity:m.diversity,gates:m.gates}));
}
