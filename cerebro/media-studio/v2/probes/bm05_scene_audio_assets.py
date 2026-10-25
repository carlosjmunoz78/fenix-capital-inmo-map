#!/usr/bin/env python3
"""Generate deterministic original Foley/SFX stems and timing contract for BM-05.

Everything is synthesized locally from mathematical envelopes/noise with a fixed seed.
No sample library, paid API, or external copyrighted audio is used.
"""
from __future__ import annotations
import hashlib, json, os, wave
from pathlib import Path
import numpy as np

OUT=Path(os.environ.get('BM05_OUT','ums-bm05-scene')).resolve(); OUT.mkdir(parents=True,exist_ok=True)
SR=48000; DURATION=6.0; N=int(SR*DURATION); RNG=np.random.default_rng(20261025)

def sha(p:Path): return hashlib.sha256(p.read_bytes()).hexdigest()
def stereo(x):
    x=np.clip(x,-0.98,0.98); return np.stack([x,x],axis=1)
def write_wav(path:Path,x):
    pcm=(stereo(x)*32767.0).astype('<i2')
    with wave.open(str(path),'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
def burst(center,dur,freq,amp,noise=0.0):
    x=np.zeros(N,dtype=np.float64); start=max(0,int((center-dur/2)*SR)); end=min(N,start+int(dur*SR)); m=end-start
    if m<=0:return x
    t=np.arange(m)/SR; env=np.sin(np.linspace(0,np.pi,m))**2
    sig=np.sin(2*np.pi*freq*t)
    if noise: sig=(1-noise)*sig+noise*RNG.normal(0,0.55,m)
    x[start:end]+=amp*env*sig; return x

def whoosh(start,dur,amp):
    x=np.zeros(N,dtype=np.float64); s=int(start*SR); m=min(int(dur*SR),N-s); t=np.arange(m)/SR
    f0,f1=180,1450; phase=2*np.pi*(f0*t+(f1-f0)/(2*dur)*t*t); env=np.sin(np.pi*np.arange(m)/max(m-1,1))**1.5
    noise=RNG.normal(0,0.25,m); x[s:s+m]+=amp*env*(0.72*np.sin(phase)+0.28*noise); return x

# Foley: four stylized footsteps/cloth contacts in the temporal scene.
foley=np.zeros(N)
for c,a in [(0.55,0.42),(1.55,0.34),(3.25,0.40),(4.85,0.30)]:
    foley+=burst(c,0.18,78,a,noise=0.48)
    foley+=burst(c+0.04,0.26,210,a*0.28,noise=0.75)
# SFX: interface activation + cinematic whoosh + low impact.
sfx=np.zeros(N)
sfx+=burst(0.25,0.22,880,0.23,noise=0.05)
sfx+=burst(0.36,0.18,1320,0.18,noise=0.02)
sfx+=whoosh(3.75,1.15,0.32)
sfx+=burst(4.72,0.42,52,0.48,noise=0.10)
# Gentle tail resonance.
sfx+=burst(5.05,0.55,104,0.15,noise=0.06)

foley_path=OUT/'bm05-foley.wav'; sfx_path=OUT/'bm05-sfx.wav'; write_wav(foley_path,foley); write_wav(sfx_path,sfx)
timeline={
  'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM05_TIMELINE_CONTRACT_V1','company_id':'GLOBAL','engine_id':'UMS-001','environment':'PREPROD','benchmark_id':'BM-05',
  'duration_seconds':DURATION,'sample_rate_hz':SR,'timebase':'SECONDS_FROM_SCENE_START',
  'dialogue':{'start_seconds':0.85,'source':'QWEN3_TTS_SYNTHETIC_BUILTIN_VOICE','real_person_voice':False,'text':'Nova, sistema listo. Comenzamos la secuencia.'},
  'foley_events':[{'type':'FOOTSTEP_OR_CONTACT','time_seconds':x} for x in [0.55,1.55,3.25,4.85]],
  'sfx_events':[{'type':'INTERFACE_CHIME','time_seconds':0.25},{'type':'CINEMATIC_WHOOSH','time_seconds':3.75},{'type':'LOW_IMPACT','time_seconds':4.72}],
  'music':{'start_seconds':0.0,'source_benchmark':'BM-04','expected_source_title':'Nova-01: First Light'},
  'mix_contract':{'dialogue_gain_db':-1.0,'foley_gain_db':-7.0,'sfx_gain_db':-5.0,'music_gain_db':-13.0,'target_lufs_i':-16.0,'true_peak_dbfs_max':-1.0},
  'original_assets':{
    'foley':{'path':foley_path.name,'sha256':sha(foley_path),'bytes':foley_path.stat().st_size,'origin':'DETERMINISTIC_LOCAL_SYNTHESIS'},
    'sfx':{'path':sfx_path.name,'sha256':sha(sfx_path),'bytes':sfx_path.stat().st_size,'origin':'DETERMINISTIC_LOCAL_SYNTHESIS'}
  },
  'additional_cost_eur':0,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'readiness_mutation_authorized':False
}
(OUT/'bm05-timeline.json').write_text(json.dumps(timeline,indent=2,ensure_ascii=False),encoding='utf-8'); print(json.dumps(timeline,indent=2,ensure_ascii=False))
