import { spawn } from 'node:child_process';

function run(bin,args){
  return new Promise((resolve,reject)=>{
    const child=spawn(bin,args,{stdio:['ignore','pipe','pipe']});
    let stdout=''; let stderr='';
    child.stdout.on('data',d=>stdout+=d.toString());
    child.stderr.on('data',d=>stderr+=d.toString());
    child.on('error',reject);
    child.on('close',code=>code===0?resolve({stdout,stderr}):reject(new Error(`${bin}_EXIT_${code}:${stderr.slice(-2000)}`)));
  });
}

function numberMatch(text,re){
  const m=String(text||'').match(re);
  return m ? Number(m[1]) : null;
}

async function probe(file){
  const r=await run('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file]);
  return JSON.parse(r.stdout);
}

async function volumeStats(file){
  const r=await run('ffmpeg',['-hide_banner','-i',file,'-map','0:a:0','-af','volumedetect','-f','null','-']);
  return {
    mean_dbfs:numberMatch(r.stderr,/mean_volume:\s*(-?[0-9.]+) dB/),
    peak_dbfs:numberMatch(r.stderr,/max_volume:\s*(-?[0-9.]+) dB/)
  };
}

export async function validatePremiumDeliverable({order,rendered}){
  const payload=order?.creative_payload||{};
  const brief=order?.brief||{};
  const reasons=[];
  const video=rendered?.artifacts?.find(a=>a?.mime==='video/mp4');
  if(!video?.local_path) return {status:'FAIL',reasons:['VIDEO_ARTIFACT_MISSING']};

  const p=await probe(video.local_path);
  const vs=p.streams?.find(s=>s.codec_type==='video');
  const as=p.streams?.find(s=>s.codec_type==='audio');
  const videoDuration=Number(p.format?.duration||vs?.duration||0);
  const audioDuration=Number(as?.duration||0);

  if(!as) reasons.push('AUDIO_STREAM_MISSING');
  if(as && videoDuration>0 && audioDuration/videoDuration<0.98) reasons.push(`AUDIO_TOO_SHORT:${audioDuration.toFixed(3)}/${videoDuration.toFixed(3)}`);

  let volume={mean_dbfs:null,peak_dbfs:null};
  if(as){
    volume=await volumeStats(video.local_path);
    if(volume.mean_dbfs===null || volume.mean_dbfs < -28) reasons.push(`AUDIO_MEAN_TOO_LOW:${volume.mean_dbfs}`);
    if(volume.peak_dbfs===null || volume.peak_dbfs < -12) reasons.push(`AUDIO_PEAK_TOO_LOW:${volume.peak_dbfs}`);
  }

  const voiceRequired=payload?.voice?.enabled===true;
  const musicRequired=payload?.audio?.music_required===true;
  const peopleRequired=payload?.showcase_coverage?.character_or_human===true || /humano/i.test(String(brief?.tone||''));

  if(voiceRequired && rendered?.provenance?.voice_rendered!==true) reasons.push('VOICE_REQUIRED_BUT_NOT_RENDERED');
  if(musicRequired && rendered?.provenance?.music_rendered!==true) reasons.push('MUSIC_REQUIRED_BUT_NOT_PROVEN');

  if(peopleRequired){
    const sources=Array.isArray(rendered?.provenance?.sources)?rendered.provenance.sources:[];
    const hasHumanSource=sources.some(s=>/human|advisor|documentation/i.test(String(s?.scene_role||'')));
    if(!hasHumanSource) reasons.push('PEOPLE_REQUIRED_BUT_NO_HUMAN_SOURCE_PROVEN');
  }

  const requiredCoverage=payload?.showcase_coverage||{};
  if(requiredCoverage.audio_voice_music===true && !voiceRequired) reasons.push('CONTRACT_CONTRADICTION_AUDIO_VOICE_MUSIC_WITH_VOICE_DISABLED');

  return {
    status:reasons.length?'FAIL':'PASS',
    reasons,
    metrics:{video_duration_sec:videoDuration,audio_duration_sec:audioDuration,audio_duration_ratio:videoDuration?audioDuration/videoDuration:0,...volume},
    requirements:{voice_required:voiceRequired,music_required:musicRequired,people_required:peopleRequired}
  };
}
