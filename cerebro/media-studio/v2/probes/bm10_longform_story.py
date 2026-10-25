#!/usr/bin/env python3
"""BM-10 PREPROD long-form multi-sequence continuity build.
Uses only sealed synthetic Nova-01 media, sealed original BM-04 music and Qwen3-TTS CPU.
"""
from __future__ import annotations
import hashlib,json,os,subprocess,time
from pathlib import Path

OUT=Path(os.environ.get('BM10_OUT','ums-bm10-longform')).resolve(); OUT.mkdir(parents=True,exist_ok=True)
SRC=Path(os.environ['BM10_SOURCE_VIDEO']).resolve(); MUSIC=Path(os.environ['BM10_MUSIC']).resolve()
EXPECTED_VIDEO=os.environ.get('BM10_SOURCE_VIDEO_SHA256','').lower(); EXPECTED_MUSIC=os.environ.get('BM10_MUSIC_SHA256','').lower()
MODEL='Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice'; SPEAKER='Aiden'; LANGUAGE='Spanish'; SEQ_DUR=15.0
TEXTS=[
 'Nova despierta en el umbral de una ciudad silenciosa. La primera luz dibuja una ruta y ella decide avanzar.',
 'En la segunda secuencia, Nova descubre señales entre la niebla. Mantiene el rumbo, observa y aprende sin perder su identidad.',
 'La tercera etapa eleva la tensión. La música crece, el entorno cambia, y Nova continúa con la misma voz, color y presencia visual.',
 'Al final, Nova regresa al punto de partida con una nueva lectura del mundo. La historia cierra el círculo sin romper continuidad.'
]
TITLES=['SECUENCIA 1 · DESPERTAR','SECUENCIA 2 · DESCUBRIMIENTO','SECUENCIA 3 · ASCENSO','SECUENCIA 4 · REGRESO']
START=time.time()

def sha(p:Path): return hashlib.sha256(p.read_bytes()).hexdigest()
def run(cmd): subprocess.run(cmd,check=True)
def probe(p:Path): return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]))

if os.environ.get('CEREBRO_ENVIRONMENT','PREPROD').upper()!='PREPROD': raise SystemExit('BM10_PREPROD_ONLY')
if os.environ.get('CEREBRO_SPEND_AUTHORIZED','false').lower()=='true': raise SystemExit('BM10_SPEND_NOT_ALLOWED')
if not SRC.is_file() or not MUSIC.is_file(): raise SystemExit('BM10_SOURCE_MISSING')
if EXPECTED_VIDEO and sha(SRC)!=EXPECTED_VIDEO: raise SystemExit('BM10_VIDEO_HASH_MISMATCH')
if EXPECTED_MUSIC and sha(MUSIC)!=EXPECTED_MUSIC: raise SystemExit('BM10_MUSIC_HASH_MISMATCH')

import torch,soundfile as sf
from qwen_tts import Qwen3TTSModel
if torch.cuda.is_available(): raise SystemExit('BM10_CPU_ROUTE_EXPECTED')
model=Qwen3TTSModel.from_pretrained(MODEL,device_map='cpu',dtype=torch.float32,low_cpu_mem_usage=True)
voice=[]
for i,text in enumerate(TEXTS,1):
    t=time.time(); wavs,sr=model.generate_custom_voice(text=text,language=LANGUAGE,speaker=SPEAKER,max_new_tokens=192)
    if not wavs: raise RuntimeError(f'BM10_VOICE_EMPTY_{i}')
    p=OUT/f'narration-{i:02d}.wav'; sf.write(str(p),wavs[0],sr); info=sf.info(str(p))
    if info.duration<2.0: raise RuntimeError(f'BM10_VOICE_TOO_SHORT_{i}')
    voice.append({'sequence':i,'text':text,'path':p.name,'sha256':sha(p),'bytes':p.stat().st_size,'duration_seconds':round(float(info.duration),3),'sample_rate_hz':int(info.samplerate),'speaker':SPEAKER,'language':LANGUAGE,'model':MODEL,'generation_seconds':round(time.time()-t,3)})

dejavu='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
seqs=[]
for i,(v,title) in enumerate(zip(voice,TITLES),1):
    out=OUT/f'sequence-{i:02d}.mp4'; vf=(f"scale=512:512:flags=lanczos,eq=contrast=1.03:saturation=1.02:brightness=-0.005,"
        f"fade=t=in:st=0:d=0.35,fade=t=out:st=14.65:d=0.35,"
        f"drawtext=fontfile={dejavu}:text='{title}':fontcolor=white:fontsize=20:box=1:boxcolor=black@0.35:boxborderw=8:x=24:y=24,format=yuv420p")
    fc=(f"[1:a]volume=0.20,atrim=duration={SEQ_DUR},asetpts=N/SR/TB,afade=t=in:st=0:d=0.4,afade=t=out:st=14.4:d=0.6[m];"
        f"[2:a]apad=pad_dur={SEQ_DUR},atrim=duration={SEQ_DUR},volume=1.0[n];"
        f"[m][n]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.95[a]")
    run(['ffmpeg','-hide_banner','-loglevel','error','-y','-stream_loop','-1','-i',str(SRC),'-stream_loop','-1','-i',str(MUSIC),'-i',str(OUT/v['path']),'-filter_complex',fc,'-map','0:v:0','-map','[a]','-t',str(SEQ_DUR),'-vf',vf,'-r','24','-c:v','libx264','-preset','medium','-crf','18','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',str(out)])
    pr=probe(out); seqs.append({'index':i,'title':title,'path':out.name,'sha256':sha(out),'bytes':out.stat().st_size,'duration_seconds':float(pr['format']['duration'])})

concat=OUT/'concat.txt'; concat.write_text(''.join(f"file '{(OUT/s['path']).as_posix()}'\n" for s in seqs),encoding='utf-8')
final=OUT/'bm10-nova01-longform-story.mp4'
run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(final)])
fp=probe(final)

from PIL import Image
import numpy as np
boundary=[]
for idx,t0 in enumerate((15.0,30.0,45.0),1):
    a=OUT/f'boundary-{idx:02d}-pre.png'; b=OUT/f'boundary-{idx:02d}-post.png'
    run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',f'{t0-0.05:.3f}','-i',str(final),'-frames:v','1',str(a)])
    run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',f'{t0+0.05:.3f}','-i',str(final),'-frames:v','1',str(b)])
    aa=np.asarray(Image.open(a).convert('RGB'),dtype=np.float32); bb=np.asarray(Image.open(b).convert('RGB'),dtype=np.float32)
    delta=float(np.abs(aa-bb).mean()); boundary.append({'boundary':idx,'time_seconds':t0,'pre_sha256':sha(a),'post_sha256':sha(b),'mean_abs_rgb_delta':round(delta,4)})

pcm=OUT/'bm10-final-audio.wav'; run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(final),'-vn','-c:a','pcm_s16le','-ar','48000','-ac','2',str(pcm)])
y,sr=sf.read(str(pcm),always_2d=True); peak=float(np.max(np.abs(y))); rms=float(np.sqrt(np.mean(np.square(y))))
video_stream=next(s for s in fp['streams'] if s.get('codec_type')=='video'); audio_stream=next(s for s in fp['streams'] if s.get('codec_type')=='audio')
manifest={
 'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM10_LONGFORM_STORY_V1','benchmark_id':'BM-10','environment':'PREPROD','status':'LONGFORM_MULTI_SEQUENCE_GENERATED',
 'character':{'id':'UMS-SYNTH-CHAR-001','identity_type':'SYNTHETIC_ORIGINAL','real_person_reference':False,'source_benchmark':'BM-01','source_video_sha256':sha(SRC)},
 'story':{'sequence_count':len(seqs),'sequence_duration_seconds':SEQ_DUR,'expected_total_seconds':SEQ_DUR*len(seqs),'sequences':seqs},
 'voice':{'engine':MODEL,'speaker':SPEAKER,'language':LANGUAGE,'real_person_voice':False,'clips':voice},
 'sound':{'music_source_benchmark':'BM-04','music_sha256':sha(MUSIC),'mix_sample_rate_hz':sr,'mix_channels':2,'peak_linear':round(peak,6),'rms_linear':round(rms,6),'limiter_peak_target':0.95},
 'color_continuity':{'metric':'MEAN_ABSOLUTE_RGB_DELTA_AT_SEQUENCE_BOUNDARIES','boundaries':boundary},
 'final':{'path':final.name,'sha256':sha(final),'bytes':final.stat().st_size,'duration_seconds':float(fp['format']['duration']),'video_codec':video_stream['codec_name'],'audio_codec':audio_stream['codec_name'],'width':int(video_stream['width']),'height':int(video_stream['height']),'fps':video_stream.get('r_frame_rate')},
 'provenance':{'visual_source':'BM-01_PASS_WITH_EVIDENCE','music_source':'BM-04_PASS_WITH_EVIDENCE','voice_runtime':'QWEN3_TTS_CPU_REAL_INFERENCE','external_real_person_media':False},
 'elapsed_seconds':round(time.time()-START,3),'additional_cost_eur':0,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'readiness_mutation_authorized':False
}
(OUT/'bm10-story-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8'); print(json.dumps(manifest,ensure_ascii=False,indent=2))
