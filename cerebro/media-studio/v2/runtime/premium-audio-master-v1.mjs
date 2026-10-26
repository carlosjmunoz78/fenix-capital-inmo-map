import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RUNTIME_DIR=path.dirname(fileURLToPath(import.meta.url));

function run(bin,args,{cwd}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(bin,args,{cwd,stdio:['ignore','pipe','pipe']});
    let stdout=''; let stderr='';
    child.stdout.on('data',d=>stdout+=d.toString());
    child.stderr.on('data',d=>stderr+=d.toString());
    child.on('error',reject);
    child.on('close',code=>{
      const result={code,stdout,stderr};
      if(code===0) return resolve(result);
      const error=new Error(`COMMAND_FAILED:${bin}:${code}`); error.result=result; reject(error);
    });
  });
}

async function sha256File(file){
  return crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
}

async function probe(file){
  const r=await run('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file]);
  return JSON.parse(r.stdout);
}

export async function applyPremiumAudioMaster({order,rendered,export_dir=''}){
  const payload=order?.creative_payload||{};
  const voice=payload?.voice||{};
  const audioSpec=payload?.audio||{};
  if(voice?.enabled!==true || voice?.required!==true) throw new Error('PREMIUM_VOICE_NOT_REQUIRED_BY_CONTRACT');
  if(audioSpec?.music_required!==true) throw new Error('PREMIUM_MUSIC_NOT_REQUIRED_BY_CONTRACT');

  const sourceVideo=rendered?.artifacts?.find(a=>a?.mime==='video/mp4' && a?.local_path);
  if(!sourceVideo) throw new Error('PREMIUM_SOURCE_VIDEO_MISSING');

  const workDir=rendered?.temp||path.dirname(sourceVideo.local_path);
  const voiceTextPath=path.join(workDir,'premium-voice.txt');
  const voiceWav=path.join(workDir,'premium-voice.wav');
  const voiceEvidencePath=path.join(workDir,'FENIX_CAPITAL_BM13_VOICE_EVIDENCE.json');
  const masteredTmp=path.join(workDir,'premium-mastered.tmp.mp4');
  const audioEvidencePath=path.join(workDir,'FENIX_CAPITAL_BM13_AUDIO_MASTER_EVIDENCE.json');
  await fs.writeFile(voiceTextPath,String(voice.text||''),'utf8');

  const voiceResult=await run('python3',[
    path.join(RUNTIME_DIR,'premium-voice-kokoro.py'),
    '--text-file',voiceTextPath,
    '--output',voiceWav,
    '--evidence',voiceEvidencePath,
    '--voice','ef_dora',
    '--speed','1.05'
  ],{cwd:workDir});
  if(!voiceResult.stdout.includes('CEREBRO_KOKORO_VOICE_RENDER_COMPLETE')) throw new Error('KOKORO_COMPLETION_MARKER_MISSING');

  // Original zero-cost cinematic bed + impacts. Dialogue is kept dominant and
  // the bed is automatically ducked under narration. Final program is EBU-style
  // loudness normalized for mobile review instead of merely containing an AAC stream.
  const filter=[
    '[1:a]aresample=48000,highpass=f=80,lowpass=f=13500,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=150,volume=1.12,apad,atrim=duration=15,asplit=2[voice_mix][voice_sc]',
    '[2:a]volume=0.34,lowpass=f=600[a0]',
    '[3:a]volume=0.23,lowpass=f=1200[a1]',
    '[4:a]volume=0.17,highpass=f=180,lowpass=f=6000[a2]',
    '[5:a]volume=0.42,afade=t=out:st=0.20:d=0.38,adelay=2800|2800[i1]',
    '[6:a]volume=0.38,afade=t=out:st=0.20:d=0.38,adelay=6100|6100[i2]',
    '[7:a]volume=0.46,afade=t=out:st=0.24:d=0.46,adelay=10100|10100[i3]',
    '[a0][a1][a2][i1][i2][i3]amix=inputs=6:normalize=0,acompressor=threshold=-16dB:ratio=2.2:attack=20:release=260,afade=t=in:st=0:d=0.55,afade=t=out:st=14.15:d=0.85[music]',
    '[music][voice_sc]sidechaincompress=threshold=0.025:ratio=10:attack=8:release=320[ducked]',
    '[voice_mix][ducked]amix=inputs=2:normalize=0,alimiter=limit=0.90,loudnorm=I=-16:LRA=9:TP=-1.5,apad,atrim=duration=15[aout]'
  ].join(';');

  await run('ffmpeg',[
    '-hide_banner','-loglevel','error','-y',
    '-i',sourceVideo.local_path,
    '-i',voiceWav,
    '-f','lavfi','-i','sine=frequency=110:sample_rate=48000:duration=15',
    '-f','lavfi','-i','sine=frequency=164.81:sample_rate=48000:duration=15',
    '-f','lavfi','-i','anoisesrc=color=pink:sample_rate=48000:duration=15:amplitude=0.10',
    '-f','lavfi','-i','sine=frequency=58:sample_rate=48000:duration=0.62',
    '-f','lavfi','-i','sine=frequency=52:sample_rate=48000:duration=0.62',
    '-f','lavfi','-i','sine=frequency=46:sample_rate=48000:duration=0.72',
    '-filter_complex',filter,
    '-map','0:v:0','-map','[aout]',
    '-c:v','copy','-c:a','aac','-b:a','256k','-ar','48000','-ac','2',
    '-t','15','-movflags','+faststart',masteredTmp
  ],{cwd:workDir});

  // Replace the renderer's pre-master artifact only after a complete successful render.
  await fs.rename(masteredTmp,sourceVideo.local_path);
  const p=await probe(sourceVideo.local_path);
  const v=p.streams?.find(s=>s.codec_type==='video');
  const a=p.streams?.find(s=>s.codec_type==='audio');
  const duration=Number(p.format?.duration||v?.duration||0);
  const stat=await fs.stat(sourceVideo.local_path);
  const sha=await sha256File(sourceVideo.local_path);
  const voiceEvidence=JSON.parse(await fs.readFile(voiceEvidencePath,'utf8'));
  const peopleRendered=(rendered?.provenance?.sources||[]).some(s=>/advisor_meeting|documentation_and_finance/i.test(String(s?.scene_role||'')));

  const audioEvidence={
    schema_version:'1.0.0',
    engine_id:'UMS-001',
    environment:'PREPROD',
    voice_rendered:true,
    voice_provider:voiceEvidence.provider,
    voice_language:'es',
    voice_id:voiceEvidence.voice,
    voice_duration_sec:voiceEvidence.duration_sec,
    music_rendered:true,
    music_source:'ORIGINAL_ZERO_COST_PROCEDURAL_CINEMATIC_BED',
    dialogue_ducking:true,
    loudness_target_lufs:Number(audioSpec.target_integrated_lufs??-16),
    true_peak_target_db:Number(audioSpec.target_true_peak_db??-1.5),
    output_audio_codec:a?.codec_name||null,
    output_audio_sample_rate:Number(a?.sample_rate||0),
    output_duration_sec:duration,
    output_sha256:sha,
    additional_cost_eur:0
  };
  await fs.writeFile(audioEvidencePath,JSON.stringify(audioEvidence,null,2));

  if(export_dir){
    await fs.mkdir(export_dir,{recursive:true});
    await fs.copyFile(sourceVideo.local_path,path.join(export_dir,sourceVideo.filename));
    await fs.copyFile(voiceEvidencePath,path.join(export_dir,path.basename(voiceEvidencePath)));
    await fs.copyFile(audioEvidencePath,path.join(export_dir,path.basename(audioEvidencePath)));
  }

  const newVideo={...sourceVideo,bytes:stat.size,sha256:sha,duration_sec:duration};
  const otherArtifacts=(rendered.artifacts||[]).filter(a=>a!==sourceVideo);
  const evidenceArtifacts=[
    {filename:path.basename(voiceEvidencePath),mime:'application/json',local_path:voiceEvidencePath,bytes:(await fs.stat(voiceEvidencePath)).size,sha256:await sha256File(voiceEvidencePath)},
    {filename:path.basename(audioEvidencePath),mime:'application/json',local_path:audioEvidencePath,bytes:(await fs.stat(audioEvidencePath)).size,sha256:await sha256File(audioEvidencePath)}
  ];

  return Object.freeze({
    ...rendered,
    provenance:{...rendered.provenance,voice_rendered:true,music_rendered:true,people_rendered:peopleRendered,audio_master:audioEvidence},
    artifacts:Object.freeze([newVideo,...otherArtifacts,...evidenceArtifacts])
  });
}
