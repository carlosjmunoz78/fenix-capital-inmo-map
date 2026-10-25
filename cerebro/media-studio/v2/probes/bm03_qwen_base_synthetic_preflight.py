#!/usr/bin/env python3
"""BM-03 capability preflight using a sealed synthetic reference voice only.
Proves Qwen3-TTS Base voice-clone/multilingual runtime; never grants BM-03 credit.
"""
from __future__ import annotations
import hashlib,json,os,time
from pathlib import Path
import torch,soundfile as sf
from qwen_tts import Qwen3TTSModel

REF=Path(os.environ['BM03_SYNTH_REF']).resolve(); OUT=Path(os.environ.get('BM03_PREFLIGHT_OUT','ums-bm03-qwen-base-preflight')).resolve(); OUT.mkdir(parents=True,exist_ok=True)
EXPECTED=os.environ.get('BM03_SYNTH_REF_SHA256','').lower(); MODEL='Qwen/Qwen3-TTS-12Hz-0.6B-Base'; START=time.time()
REF_TEXT='CEREBRO, prueba de voz en español.'
CASES=[('Spanish','Esta es una prueba multilingüe de clonación de voz sintética para CEREBRO.'),('English','This is a multilingual synthetic voice cloning test for CEREBRO.')]

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
if os.environ.get('CEREBRO_ENVIRONMENT','PREPROD').upper()!='PREPROD': raise SystemExit('BM03_PREFLIGHT_PREPROD_ONLY')
if os.environ.get('CEREBRO_SPEND_AUTHORIZED','false').lower()=='true': raise SystemExit('BM03_PREFLIGHT_SPEND_NOT_ALLOWED')
if not REF.is_file(): raise SystemExit('BM03_SYNTH_REF_MISSING')
actual=sha(REF)
if EXPECTED and actual!=EXPECTED: raise SystemExit(f'BM03_SYNTH_REF_HASH_MISMATCH:{actual}')
if torch.cuda.is_available(): raise SystemExit('BM03_QWEN_BASE_CPU_PREFLIGHT_EXPECTED')
model=Qwen3TTSModel.from_pretrained(MODEL,device_map='cpu',dtype=torch.float32,low_cpu_mem_usage=True)
outputs=[]
for language,text in CASES:
    t=time.time(); wavs,sr=model.generate_voice_clone(text=text,language=language,ref_audio=str(REF),ref_text=REF_TEXT,max_new_tokens=192)
    if not wavs: raise RuntimeError(f'BM03_EMPTY_{language}')
    p=OUT/f'qwen-base-clone-{language.lower()}.wav'; sf.write(str(p),wavs[0],sr); info=sf.info(str(p))
    if info.duration<2.0: raise RuntimeError(f'BM03_TOO_SHORT_{language}')
    outputs.append({'language':language,'text':text,'path':p.name,'sha256':sha(p),'bytes':p.stat().st_size,'sample_rate_hz':info.samplerate,'duration_seconds':round(info.duration,3),'generation_seconds':round(time.time()-t,3)})
manifest={
 'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM03_QWEN_BASE_SYNTHETIC_PREFLIGHT_V1','benchmark_id':'BM-03','environment':'PREPROD','status':'QWEN_BASE_VOICE_CLONE_RUNTIME_PROVEN_SYNTHETIC_ONLY',
 'benchmark_credit':False,'source':{'identity_type':'SYNTHETIC_ORIGINAL','real_person_media':False,'path':REF.name,'sha256':actual,'ref_text':REF_TEXT},
 'runtime':{'model':MODEL,'device':'cpu','torch_cuda_available':False,'license':'Apache-2.0','voice_clone':True,'languages':['Spanish','English']},'outputs':outputs,
 'elapsed_seconds':round(time.time()-START,3),'human_required':True,'human_required_reason':'LEGAL_REQUIRED','next_requirement':'AUTHORIZED_REAL_PERSON_VOICE_AND_CONSENT_FOR_BM03_CREDIT',
 'additional_cost_eur':0,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'readiness_mutation_authorized':False
}
(OUT/'bm03-qwen-base-preflight.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8'); print(json.dumps(manifest,indent=2))
