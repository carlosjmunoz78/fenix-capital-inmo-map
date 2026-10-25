#!/usr/bin/env python3
"""BM-03 OpenVoice V2 CPU voice-conversion capability preflight using synthetic voices only.
This proves runtime conversion without using or granting credit for real-person biometric media.
"""
from __future__ import annotations
import hashlib,json,os,time
from pathlib import Path
import numpy as np
import soundfile as sf
import torch
from openvoice.api import ToneColorConverter

SRC=Path(os.environ['BM03_OV_SOURCE']).resolve(); TGT=Path(os.environ['BM03_OV_TARGET']).resolve()
CFG=Path(os.environ['BM03_OV_CONFIG']).resolve(); CKPT=Path(os.environ['BM03_OV_CHECKPOINT']).resolve()
OUT=Path(os.environ.get('BM03_OV_OUT','ums-bm03-openvoice-v2-preflight')).resolve(); OUT.mkdir(parents=True,exist_ok=True)
EXPECTED=os.environ.get('BM03_OV_CHECKPOINT_SHA256','').lower(); START=time.time()

def sha(p:Path): return hashlib.sha256(p.read_bytes()).hexdigest()
if os.environ.get('CEREBRO_ENVIRONMENT','PREPROD').upper()!='PREPROD': raise SystemExit('BM03_OV_PREPROD_ONLY')
if os.environ.get('CEREBRO_SPEND_AUTHORIZED','false').lower()=='true': raise SystemExit('BM03_OV_SPEND_NOT_ALLOWED')
for p in (SRC,TGT,CFG,CKPT):
    if not p.is_file() or p.stat().st_size==0: raise SystemExit(f'BM03_OV_MISSING:{p}')
if EXPECTED and sha(CKPT)!=EXPECTED: raise SystemExit(f'BM03_OV_CHECKPOINT_HASH_MISMATCH:{sha(CKPT)}')
if torch.cuda.is_available(): raise SystemExit('BM03_OV_CPU_PREFLIGHT_EXPECTED')
converter=ToneColorConverter(str(CFG),device='cpu',enable_watermark=False); converter.load_ckpt(str(CKPT))
src_se=converter.extract_se([str(SRC)]); tgt_se=converter.extract_se([str(TGT)])
emb_dist=float(torch.linalg.vector_norm(src_se-tgt_se).item())
if emb_dist<=1e-5: raise SystemExit('BM03_OV_SYNTHETIC_EMBEDDINGS_NOT_DISTINCT')
out=OUT/'openvoice-v2-converted.wav'; t=time.time(); converter.convert(str(SRC),src_se,tgt_se,output_path=str(out),tau=0.3,message='CEREBRO_SYNTHETIC_PREFLIGHT')
if not out.is_file() or out.stat().st_size<1000: raise SystemExit('BM03_OV_OUTPUT_MISSING')
info=sf.info(str(out)); data,_=sf.read(str(out),always_2d=True); peak=float(np.max(np.abs(data))); rms=float(np.sqrt(np.mean(np.square(data))))
if info.duration<1.0 or rms<=0.001 or peak<=0.005: raise SystemExit('BM03_OV_OUTPUT_INVALID')
if sha(out)==sha(SRC): raise SystemExit('BM03_OV_NO_CONVERSION_OBSERVED')
manifest={
 'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM03_OPENVOICE_V2_SYNTHETIC_PREFLIGHT_V1','benchmark_id':'BM-03','environment':'PREPROD','status':'OPENVOICE_V2_VOICE_CONVERSION_RUNTIME_PROVEN_SYNTHETIC_ONLY','benchmark_credit':False,
 'source':{'identity_type':'SYNTHETIC_TTS','real_person_media':False,'engine':'espeak-ng','sha256':sha(SRC),'bytes':SRC.stat().st_size},
 'target':{'identity_type':'SYNTHETIC_TTS','real_person_media':False,'engine':'espeak-ng','sha256':sha(TGT),'bytes':TGT.stat().st_size},
 'runtime':{'engine':'OpenVoice-V2','device':'cpu','code_license':'MIT','checkpoint_license':'MIT','checkpoint_sha256':sha(CKPT),'embedding_distance':emb_dist,'tau':0.3,'watermark_enabled':False},
 'output':{'path':out.name,'sha256':sha(out),'bytes':out.stat().st_size,'sample_rate_hz':info.samplerate,'duration_seconds':round(info.duration,3),'peak_linear':round(peak,6),'rms_linear':round(rms,6),'conversion_seconds':round(time.time()-t,3)},
 'human_required':True,'human_required_reason':'LEGAL_REQUIRED','next_requirement':'AUTHORIZED_REAL_PERSON_VOICE_AND_CONSENT_FOR_BM03_CREDIT','elapsed_seconds':round(time.time()-START,3),
 'additional_cost_eur':0,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'readiness_mutation_authorized':False
}
(OUT/'bm03-openvoice-v2-preflight.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8'); print(json.dumps(manifest,indent=2))
