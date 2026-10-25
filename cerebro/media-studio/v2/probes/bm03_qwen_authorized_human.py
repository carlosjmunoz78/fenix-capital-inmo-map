#!/usr/bin/env python3
"""Physical BM-03 Qwen3-TTS Base clone probe using one licensed real-human voice sample."""
from __future__ import annotations
import hashlib,json,os,time
from pathlib import Path
import numpy as np
import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel

REF=Path(os.environ['BM03_REAL_REF']).resolve()
ADMISSION=Path(os.environ['BM03_SOURCE_ADMISSION']).resolve()
OUT=Path(os.environ.get('BM03_QWEN_OUT','ums-bm03-qwen-authorized-human')).resolve(); OUT.mkdir(parents=True,exist_ok=True)
MODEL='Qwen/Qwen3-TTS-12Hz-0.6B-Base'
REF_TEXT='Kids are talking by the door'
CASES=[
 ('Spanish','Esta es una prueba multilingüe de CEREBRO con una voz humana de ensayo autorizada.'),
 ('English','This is a multilingual CEREBRO test using an authorized human test voice.')
]
START=time.time()

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def stats(path):
    info=sf.info(str(path)); data,_=sf.read(str(path),always_2d=True); x=data.astype(np.float64)
    return {'bytes':Path(path).stat().st_size,'sample_rate_hz':info.samplerate,'duration_seconds':round(info.duration,3),'rms_linear':round(float(np.sqrt(np.mean(x*x))),6),'peak_linear':round(float(np.max(np.abs(x))),6)}

if os.environ.get('CEREBRO_ENVIRONMENT','PREPROD').upper()!='PREPROD': raise SystemExit('BM03_QWEN_AUTHORIZED_TEST_PREPROD_ONLY')
if os.environ.get('CEREBRO_SPEND_AUTHORIZED','false').lower()=='true': raise SystemExit('BM03_SPEND_NOT_ALLOWED')
for p in (REF,ADMISSION):
    if not p.is_file() or p.stat().st_size==0: raise SystemExit(f'BM03_INPUT_MISSING:{p}')
adm=json.loads(ADMISSION.read_text(encoding='utf-8'))
if not (adm.get('admitted') is True and adm.get('benchmark_id')=='BM-03' and adm.get('human_required') is False): raise SystemExit('BM03_SOURCE_NOT_ADMITTED')
if torch.cuda.is_available(): raise SystemExit('BM03_QWEN_CPU_PROBE_EXPECTED')

model=Qwen3TTSModel.from_pretrained(MODEL,device_map='cpu',dtype=torch.float32,low_cpu_mem_usage=True)
outputs=[]
for language,text in CASES:
    t=time.time()
    wavs,sr=model.generate_voice_clone(text=text,language=language,ref_audio=str(REF),ref_text=REF_TEXT,max_new_tokens=224)
    if not wavs: raise RuntimeError(f'BM03_EMPTY_{language}')
    p=OUT/f'qwen-real-clone-{language.lower()}.wav'; sf.write(str(p),wavs[0],sr)
    st=stats(p)
    if st['duration_seconds']<2 or st['rms_linear']<=0.001: raise RuntimeError(f'BM03_INVALID_{language}:{st}')
    outputs.append({'language':language,'text':text,'path':p.name,'sha256':sha(p),'generation_seconds':round(time.time()-t,3),**st})
if len({o['sha256'] for o in outputs})!=len(outputs): raise SystemExit('BM03_QWEN_OUTPUTS_NOT_DISTINCT')
manifest={
 'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM03_QWEN_AUTHORIZED_HUMAN_PHYSICAL_V1','benchmark_id':'BM-03','environment':'PREPROD',
 'status':'QWEN_BASE_REAL_HUMAN_VOICE_CLONE_MULTILINGUAL_PROVEN','benchmark_credit_component':True,
 'source':{'identity_type':'REAL_AUTHORIZED','path':REF.name,'sha256':sha(REF),'ref_text':REF_TEXT,'admission_sha256':sha(ADMISSION)},
 'runtime':{'model':MODEL,'device':'cpu','torch_cuda_available':False,'code_license':'Apache-2.0','checkpoint_license':'Apache-2.0','voice_clone':True,'tts':True,'multilingual':True},
 'outputs':outputs,'elapsed_seconds':round(time.time()-START,3),'human_required':False,'additional_cost_eur':0,
 'prod_mutation_authorized':False,'publish_authorized':False,'spend_authorized':False
}
(OUT/'bm03-qwen-authorized-human.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps(manifest,indent=2))
