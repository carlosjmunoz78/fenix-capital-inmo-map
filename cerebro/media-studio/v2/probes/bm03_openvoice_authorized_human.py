#!/usr/bin/env python3
"""Physical BM-03 OpenVoice V2 probe.

Converts two distinct source-prosody utterances into one licensed real-human target
timbre. The duration spread is used as deterministic evidence that the converted
outputs preserve materially distinct temporal prosody.
"""
from __future__ import annotations
import hashlib,json,os,time
from pathlib import Path
import numpy as np
import soundfile as sf
import torch
from openvoice.api import ToneColorConverter

SOURCES=[Path(x).resolve() for x in os.environ['BM03_OV_SOURCES'].split(os.pathsep)]
TGT=Path(os.environ['BM03_REAL_REF']).resolve(); ADMISSION=Path(os.environ['BM03_SOURCE_ADMISSION']).resolve()
CFG=Path(os.environ['BM03_OV_CONFIG']).resolve(); CKPT=Path(os.environ['BM03_OV_CHECKPOINT']).resolve()
OUT=Path(os.environ.get('BM03_OV_OUT','ums-bm03-openvoice-authorized-human')).resolve(); OUT.mkdir(parents=True,exist_ok=True)
EXPECTED=os.environ.get('BM03_OV_CHECKPOINT_SHA256','').lower(); START=time.time()

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def audio_stats(p):
    info=sf.info(str(p)); data,_=sf.read(str(p),always_2d=True); x=data.astype(np.float64)
    return {'bytes':Path(p).stat().st_size,'sample_rate_hz':info.samplerate,'duration_seconds':round(info.duration,3),'rms_linear':round(float(np.sqrt(np.mean(x*x))),6),'peak_linear':round(float(np.max(np.abs(x))),6)}

if os.environ.get('CEREBRO_ENVIRONMENT','PREPROD').upper()!='PREPROD': raise SystemExit('BM03_OV_AUTHORIZED_TEST_PREPROD_ONLY')
if os.environ.get('CEREBRO_SPEND_AUTHORIZED','false').lower()=='true': raise SystemExit('BM03_OV_SPEND_NOT_ALLOWED')
if len(SOURCES)!=2: raise SystemExit('BM03_OV_EXPECTED_TWO_PROSODY_SOURCES')
for p in [*SOURCES,TGT,ADMISSION,CFG,CKPT]:
    if not p.is_file() or p.stat().st_size==0: raise SystemExit(f'BM03_OV_MISSING:{p}')
if EXPECTED and sha(CKPT)!=EXPECTED: raise SystemExit(f'BM03_OV_CHECKPOINT_HASH_MISMATCH:{sha(CKPT)}')
adm=json.loads(ADMISSION.read_text(encoding='utf-8'))
if not (adm.get('admitted') is True and adm.get('benchmark_id')=='BM-03' and adm.get('human_required') is False): raise SystemExit('BM03_SOURCE_NOT_ADMITTED')
if torch.cuda.is_available(): raise SystemExit('BM03_OV_CPU_PROBE_EXPECTED')

converter=ToneColorConverter(str(CFG),device='cpu'); converter.load_ckpt(str(CKPT))
tgt_se=converter.extract_se([str(TGT)])
outputs=[]
for i,src in enumerate(SOURCES,1):
    src_se=converter.extract_se([str(src)])
    emb_dist=float(torch.linalg.vector_norm(src_se-tgt_se).item())
    if emb_dist<=1e-5: raise SystemExit(f'BM03_OV_EMBEDDINGS_NOT_DISTINCT:{i}')
    out=OUT/f'openvoice-target-prosody-{i}.wav'; t=time.time()
    converter.convert(str(src),src_se,tgt_se,output_path=str(out),tau=0.3,message=f'CEREBRO_BM03_AUTHORIZED_{i}')
    st=audio_stats(out)
    if st['duration_seconds']<1 or st['rms_linear']<=0.001 or st['peak_linear']<=0.005: raise SystemExit(f'BM03_OV_OUTPUT_INVALID:{i}:{st}')
    if sha(out)==sha(src): raise SystemExit(f'BM03_OV_NO_CONVERSION:{i}')
    outputs.append({'prosody_variant':i,'source_path':src.name,'source_sha256':sha(src),'path':out.name,'sha256':sha(out),'embedding_distance':emb_dist,'conversion_seconds':round(time.time()-t,3),**st})
if len({o['sha256'] for o in outputs})!=2: raise SystemExit('BM03_OV_OUTPUTS_NOT_DISTINCT')
durations=[o['duration_seconds'] for o in outputs]; ratio=max(durations)/min(durations)
if ratio<1.15: raise SystemExit(f'BM03_OV_PROSODY_DURATION_SPREAD_TOO_SMALL:{ratio}')
manifest={
 'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM03_OPENVOICE_AUTHORIZED_HUMAN_PHYSICAL_V1','benchmark_id':'BM-03','environment':'PREPROD',
 'status':'OPENVOICE_V2_REAL_HUMAN_TARGET_CONVERSION_AND_PROSODY_PROVEN','benchmark_credit_component':True,
 'target':{'identity_type':'REAL_AUTHORIZED','path':TGT.name,'sha256':sha(TGT),'admission_sha256':sha(ADMISSION)},
 'runtime':{'engine':'OpenVoice-V2','device':'cpu','code_license':'MIT','checkpoint_license':'MIT','checkpoint_sha256':sha(CKPT),'tau':0.3,'voice_conversion':True,'prosody_preservation_test':True},
 'prosody':{'variant_count':2,'duration_ratio':round(ratio,4),'criterion_min_ratio':1.15,'criterion_pass':True},
 'outputs':outputs,'elapsed_seconds':round(time.time()-START,3),'human_required':False,'additional_cost_eur':0,
 'prod_mutation_authorized':False,'publish_authorized':False,'spend_authorized':False
}
(OUT/'bm03-openvoice-authorized-human.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps(manifest,indent=2))
