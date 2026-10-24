import { execFile, spawn } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { planCreativeVoiceTimelineV1 } from './creative-voice-timeline-planner-v1.mjs';

const execFileAsync=promisify(execFile);
const VOICES=new Map([['ES_MALE',0],['ES_FEMALE',1]]);
function arr(v){return Array.isArray(v)?v:[]}
function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function req(v,n){if(v===undefined||v===null||String(v).trim()==='')throw new Error(`MISSING_${n}`);return v}
function text(v,max=900){const s=String(v??'').trim();if(s.length>max)throw new Error('SOCIAL_AUDIO_TEXT_TOO_LONG');return s}
function runInput(cmd,args,input){return new Promise((resolve,reject)=>{const c=spawn(cmd,args,{stdio:['pipe','pipe','pipe']});let err='';c.stderr.on('data',d=>err+=d);c.on('error',reject);c.on('close',code=>code===0?resolve():reject(new Error(`PROCESS_FAILED:${path.basename(cmd)}:${code}:${err.slice(-1600)}`)));c.stdin.end(input)})}
async function probeDuration(file){const {stdout}=await execFileAsync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',file]);const d=Number(stdout.trim());if(!Number.isFinite(d)||d<=0)throw new Error(`SOCIAL_AUDIO_DURATION_INVALID:${path.basename(file)}`);return d}
async function probeAudioDuration(file){const {stdout}=await execFileAsync('ffprobe',['-v','error','-select_streams','a:0','-show_entries','stream=duration','-of','default=nw=1:nk=1',file]);const d=Number(stdout.trim());if(!Number.isFinite(d)||d<=0)throw new Error('SOCIAL_MASTER_AUDIO_DURATION_INVALID');return d}
async function peakDb(file){const {stderr}=await execFileAsync('ffmpeg',['-hide_banner','-i',file,'-af','volumedetect','-f','null','-'],{maxBuffer:8*1024*1024});const m=String(stderr).match(/max_volume:\s*(-?[0-9.]+)\s*dB/i);return m?Number(m[1]):-99}

async function piperBlock(value,temp,voiceId,index){
  const bin=req(process.env.CEREBRO_PIPER_BIN,'CEREBRO_PIPER_BIN'),model=req(process.env.CEREBRO_PIPER_MODEL,'CEREBRO_PIPER_MODEL'),config=req(process.env.CEREBRO_PIPER_CONFIG,'CEREBRO_PIPER_CONFIG');
  if(!VOICES.has(voiceId))throw new Error('CREATIVE_VOICE_ID_DENIED');
  const raw=path.join(temp,`social-voice-raw-${String(index+1).padStart(2,'0')}.wav`),out=path.join(temp,`social-voice-${String(index+1).padStart(2,'0')}.wav`);
  await runInput(bin,['--model',model,'--config',config,'--speaker',String(VOICES.get(voiceId)),'--noise_scale','0.78','--length_scale','0.98','--noise_w','0.90','--sentence_silence','0.07','--output_file',raw],`${value}\n`);
  await execFileAsync('ffmpeg',['-hide_banner','-loglevel','error','-i',raw,'-af','highpass=f=85,lowpass=f=11500,equalizer=f=3000:t=q:w=1:g=2.2,acompressor=threshold=-20dB:ratio=3:attack=8:release=110,volume=1.10,alimiter=limit=0.94','-c:a','pcm_s16le','-y',out]);
  return out;
}
async function compressBlock(file,ratio,temp,index){if(ratio<=1.0005)return {file,duration:await probeDuration(file),speedup:1};if(ratio>1.12)throw new Error(`SOCIAL_VOICE_SPEEDUP_LIMIT:${ratio.toFixed(3)}`);const out=path.join(temp,`social-voice-fit-${String(index+1).padStart(2,'0')}.wav`);await execFileAsync('ffmpeg',['-hide_banner','-loglevel','error','-i',file,'-filter:a',`atempo=${ratio.toFixed(5)}`,'-c:a','pcm_s16le','-y',out]);return {file:out,duration:await probeDuration(out),speedup:ratio}}

async function socialMusic(total,temp){
  const out=path.join(temp,'social-music-v4.wav'),fade=Math.max(0,total-1.8);
  await execFileAsync('ffmpeg',['-hide_banner','-loglevel','error',
    '-f','lavfi','-i',`sine=frequency=96:sample_rate=48000:duration=${total}`,
    '-f','lavfi','-i',`sine=frequency=192:sample_rate=48000:duration=${total}`,
    '-f','lavfi','-i',`sine=frequency=576:sample_rate=48000:duration=${total}`,
    '-f','lavfi','-i',`anoisesrc=color=pink:sample_rate=48000:duration=${total}`,
    '-filter_complex',`[0:a]volume=.042,tremolo=f=2:d=.72[b];[1:a]volume=.018,tremolo=f=4:d=.58[m];[2:a]volume=.007,tremolo=f=4:d=.88[p];[3:a]highpass=f=2800,lowpass=f=7200,volume=.010,tremolo=f=4:d=.92[h];[b][m][p][h]amix=inputs=4:normalize=0,highpass=f=45,acompressor=threshold=-20dB:ratio=2.4:attack=12:release=160,afade=t=in:st=0:d=0.35,afade=t=out:st=${fade}:d=1.8,alimiter=limit=.88[mix]`,
    '-map','[mix]','-c:a','pcm_s16le','-y',out],{maxBuffer:20*1024*1024});return out;
}
async function socialSfx(total,starts,temp){
  const out=path.join(temp,'social-sfx-v4.wav');if(!starts.length){await execFileAsync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i',`anullsrc=r=48000:cl=mono:d=${total}`,'-c:a','pcm_s16le','-y',out]);return out}
  const args=['-hide_banner','-loglevel','error'];for(const _ of starts){args.push('-f','lavfi','-i','anoisesrc=color=white:sample_rate=48000:duration=0.24','-f','lavfi','-i','sine=frequency=92:sample_rate=48000:duration=0.18')}
  let fc='';for(let i=0;i<starts.length;i++){const n=i*2,b=i*2+1,ms=Math.round(starts[i]*1000);fc+=`[${n}:a]highpass=f=950,lowpass=f=8500,afade=t=in:st=0:d=0.018,afade=t=out:st=0.045:d=0.18,volume=.18[wn${i}];[${b}:a]afade=t=out:st=0.02:d=0.16,volume=.14[bi${i}];[wn${i}][bi${i}]amix=inputs=2:normalize=0,adelay=${ms}:all=1[e${i}];`}
  fc+=`${starts.map((_,i)=>`[e${i}]`).join('')}amix=inputs=${starts.length}:duration=longest:normalize=0,apad=pad_dur=${total},atrim=duration=${total},alimiter=limit=.90[s]`;
  args.push('-filter_complex',fc,'-map','[s]','-c:a','pcm_s16le','-y',out);await execFileAsync('ffmpeg',args,{maxBuffer:24*1024*1024});return out;
}

function chooseSpeedupForTimeline(durations,total,preferredStarts){
  for(let i=0;i<=24;i++){
    const ratio=1+i*.005;
    try{planCreativeVoiceTimelineV1({durations_sec:durations.map(d=>d/ratio),total_sec:total,preferred_starts_sec:preferredStarts,max_gap_sec:2.4,hook_deadline_sec:1.2});return ratio}catch(e){if(!String(e?.message||'').startsWith('VOICE_TIMELINE_TOO_DENSE'))throw e}
  }
  throw new Error('SOCIAL_VOICE_TIMELINE_NO_FIT_WITHIN_SPEEDUP_LIMIT');
}

export async function masterCreativeSocialAudioV4({videoFile,narrationBlocks,scenes,temp,voiceId='ES_FEMALE',transitionOverlapSec=.55}){
  const blocks=arr(narrationBlocks).map(obj).filter(x=>text(x.text||'',900));if(blocks.length<2)throw new Error('SOCIAL_NARRATION_BLOCKS_REQUIRED');
  const sceneList=arr(scenes).map(obj),visualDuration=await probeDuration(videoFile),ordered=blocks.map((b,i)=>({preferred_start:Number(b.start_sec??0),text:text(b.text,900),i})).sort((a,b)=>a.preferred_start-b.preferred_start);
  if(ordered[0].preferred_start>1.2)throw new Error('SOCIAL_HOOK_TOO_LATE');
  const rawVoices=[];let words=0;for(let i=0;i<ordered.length;i++){const b=ordered[i];if(b.preferred_start<0||b.preferred_start>=visualDuration-.4)throw new Error(`SOCIAL_NARRATION_START_INVALID:${i+1}`);const file=await piperBlock(b.text,temp,voiceId,i),duration=await probeDuration(file);words+=b.text.split(/\s+/).filter(Boolean).length;rawVoices.push({...b,file,duration})}
  const preferredStarts=rawVoices.map(v=>v.preferred_start),rawDurations=rawVoices.map(v=>v.duration),speedup=chooseSpeedupForTimeline(rawDurations,visualDuration,preferredStarts),voices=[];let totalVoiceSec=0,maxSpeedup=1;
  for(let i=0;i<rawVoices.length;i++){const fit=await compressBlock(rawVoices[i].file,speedup,temp,i);maxSpeedup=Math.max(maxSpeedup,fit.speedup);totalVoiceSec+=fit.duration;voices.push({...rawVoices[i],file:fit.file,duration:fit.duration})}
  const timeline=planCreativeVoiceTimelineV1({durations_sec:voices.map(v=>v.duration),total_sec:visualDuration,preferred_starts_sec:preferredStarts,max_gap_sec:2.4,hook_deadline_sec:1.2});
  for(let i=0;i<voices.length;i++)voices[i].start=timeline.starts_sec[i];
  const maxGap=timeline.max_gap_sec;
  let cursor=0;const sceneStarts=[];for(let i=0;i<sceneList.length;i++){sceneStarts.push(cursor);cursor+=Math.max(1,Number(sceneList[i].duration_sec||sceneList[i].duration||3));if(i<sceneList.length-1)cursor-=transitionOverlapSec}
  const music=await socialMusic(visualDuration,temp),sfx=await socialSfx(visualDuration,sceneStarts,temp),sfxPeak=await peakDb(sfx),out=path.join(temp,`social-master-v4-${path.basename(videoFile)}`);
  const args=['-hide_banner','-loglevel','error','-i',videoFile];for(const v of voices)args.push('-i',v.file);const musicIndex=1+voices.length,sfxIndex=musicIndex+1;args.push('-i',music,'-i',sfx);
  let fc='';for(let i=0;i<voices.length;i++){const ms=Math.round(voices[i].start*1000);fc+=`[${i+1}:a]adelay=${ms}:all=1,apad=pad_dur=${visualDuration},atrim=duration=${visualDuration}[v${i}];`}
  fc+=`${voices.map((_,i)=>`[v${i}]`).join('')}amix=inputs=${voices.length}:duration=longest:normalize=0,volume=1.02,asplit=2[voice_sc][voice_mix];[${musicIndex}:a][voice_sc]sidechaincompress=threshold=.010:ratio=10:attack=8:release=180[duck];[duck]volume=.58[music];[${sfxIndex}:a]volume=1.0[sfx];[voice_mix][music][sfx]amix=inputs=3:duration=longest:normalize=0,alimiter=limit=.95,apad=pad_dur=${visualDuration},atrim=duration=${visualDuration}[a]`;
  args.push('-filter_complex',fc,'-map','0:v:0','-map','[a]','-c:v','copy','-c:a','aac','-b:a','192k','-t',String(visualDuration),'-movflags','+faststart','-y',out);await execFileAsync('ffmpeg',args,{maxBuffer:48*1024*1024});
  const audioDuration=await probeAudioDuration(out),coverage=Math.min(1,audioDuration/visualDuration),voiceCoverage=Math.min(1,totalVoiceSec/visualDuration),wpm=totalVoiceSec>0?words/totalVoiceSec*60:0;
  return {file:out,evidence:{audio_master_version:'V4_2_SOCIAL_CINEMATIC_TIMELINE',voice_timeline_planner_version:'V1',audio_duration_sec:Number(audioDuration.toFixed(3)),video_duration_sec:Number(visualDuration.toFixed(3)),audio_coverage_ratio:Number(coverage.toFixed(3)),voice_block_count:voices.length,voice_seconds_total:Number(totalVoiceSec.toFixed(3)),voice_coverage_ratio:Number(voiceCoverage.toFixed(3)),max_voice_gap_sec:Number(maxGap.toFixed(3)),voice_wpm:Number(wpm.toFixed(1)),max_voice_speedup:Number(maxSpeedup.toFixed(3)),voice_planned_starts_sec:timeline.starts_sec,voice_planned_gaps_sec:timeline.gaps_sec,cta_voice_start_sec:timeline.cta_start_sec,cta_voice_end_sec:timeline.cta_end_sec,sfx_event_count:sceneStarts.length,sfx_peak_db:Number(sfxPeak.toFixed(2)),music_full_length:true,continuous_narration:true,voice_style:'SOCIAL_CINEMATIC_CONVERSATIONAL',scene_locked_narration:false}};
}

export const CREATIVE_SOCIAL_AUDIO_V4_CONTRACT=Object.freeze({schema_version:'4.2.0',owner_engine:'SOC-001',continuous_narration:true,scene_locked_narration:false,cinematic_conversational_piper_profile:true,piper_length_scale:.98,measures_real_tts_before_timeline:true,voice_timeline_planner:'CREATIVE-VOICE-TIMELINE-PLANNER-V1',max_voice_gap_sec:2.4,max_voice_speedup:1.12,full_length_music:true,audible_transition_sfx:true,ducking:true,hook_deadline_sec:1.2,publish_authorized:false,additional_cost_eur:0});
