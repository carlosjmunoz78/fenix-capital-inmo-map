#!/usr/bin/env python3
"""UMS001 Piper native Castilian voices audition: es_ES sharvard 2 speakers.
No ads, no publishing, no paid API. Model training corpus CC BY 3.0 requires attribution.
"""
from pathlib import Path
import json,hashlib,wave
from piper import PiperVoice
from piper.config import SynthesisConfig
P=Path('/tmp/ums001_piper_sharvard_ES')
P.mkdir(exist_ok=True,parents=True)
model=P/'es_ES-sharvard-medium.onnx'
assert model.exists() and model.stat().st_size>70_000_000,'Missing real Spanish model'
model_json=json.loads((P/'es_ES-sharvard-medium.onnx.json').read_text())
assert model_json['language']['code']=='es_ES'
assert model_json['speaker_id_map']['F']==1 and model_json['speaker_id_map']['M']==0
tts=PiperVoice.load(str(model))
samples=[
 ('IG_ESPAÑA_VOZ_FEMENINA_SHARVARD_CC_BY3.wav',1,'¿Y si tu primera vivienda está más cerca de lo que crees? En Fénix Capital estudiamos tu caso. Solicita tu preestudio.'),
 ('FB_ESPAÑA_VOZ_MASCULINA_SHARVARD_CC_BY3.wav',0,'¿Te han dicho que tu hipoteca es imposible? En Fénix Capital estudiamos opciones reales. Solicita tu preestudio.')
]
items=[]
for name,speaker,script in samples:
 path=P/name
 with wave.open(str(path),'wb') as output:
  tts.synthesize_wav(script,output,syn_config=SynthesisConfig(speaker_id=speaker,length_scale=.92,noise_scale=.6,noise_w_scale=.7))
 with wave.open(str(path),'rb') as audio:
  sr=audio.getframerate();seconds=audio.getnframes()/sr
 assert 5<seconds<35 and sr>=16000 and path.stat().st_size>100000, (name,seconds,sr)
 items.append({'name':name,'speaker_id':speaker,'speaker_gender_model_label':'F' if speaker==1 else 'M','script':script,'duration':round(seconds,3),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'file_bytes':path.stat().st_size})
 print('VOICE_TEST',name,round(seconds,3),flush=True)
manifest={'company_id':'fenix','engine_id':'UMS-001','environment':'LAB','model':'rhasspy/piper-voices/es/es_ES/sharvard/medium','voice_locale':'es_ES','dataset_license':'CC BY 3.0, attribution required','model_card':'https://huggingface.co/rhasspy/piper-voices/blob/main/es/es_ES/sharvard/medium/MODEL_CARD','paid_api_calls':0,'new_subscriptions':0,'PUBLISH':False,'accent_verified_by_human':False,'audio_naturalness_approved':False,'use_as_alternative_only':True,'samples':items}
(P/'UMS001_ES_ES_SHARVARD_AUDITION_LICENSE_QA.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
# Copyright/commercial constraints: use voice model only with CC BY 3.0 attribution, do not export 76MB weights.
for a in P.glob('*.onnx*'):a.unlink()
print('UMS001_PIPER_NATIVE_ES_ES_SHARVARD_TWO_VOICES_AUDITION_DONE',flush=True)
