#!/usr/bin/env python3
"""Local zero-euro comparison: es_ES regional voices vs Kokoro generic es. No publish."""
from pathlib import Path
import json, hashlib, wave, time
from piper import PiperVoice
from piper.config import SynthesisConfig
out=Path('/tmp/ums001_es_ES_audition')
out.mkdir(parents=True,exist_ok=True)
vox=[
  {'model':'es_ES-davefx-medium','voice':'MASCULINA_ES_ES','license':'Piper MIT model / training data CC0','text':'¿Te han dicho que tu hipoteca es imposible? Un no no siempre es el final. En Fénix Capital estudiamos cada caso.'},
  {'model':'es_ES-mls_9972-low','voice':'FEMENINA_ES_ES','license':'Piper MLS 9972 CC BY 4.0; attribution mandatory','text':'¿Y si tu primera vivienda está más cerca de lo que crees? Descubre qué puedes comprar. Solicita tu preestudio.'}
]
records=[]
for obj in vox:
 model=out/(obj['model']+'.onnx')
 assert model.exists() and model.stat().st_size>20_000_000,'Voice model not downloaded: '+obj['model']
 voice=PiperVoice.load(str(model))
 filename=obj['voice']+'_PRUEBA_LOCALE_ES_ES.wav'
 with wave.open(str(out/filename),'wb') as wav:
  voice.synthesize_wav(obj['text'],wav,syn_config=SynthesisConfig(length_scale=0.97))
 with wave.open(str(out/filename),'rb') as wav:
  duration=wav.getnframes()/wav.getframerate()
 assert duration>3 and duration<35 and (out/filename).stat().st_size>80000
 records.append({**obj,'file':filename,'sha256':hashlib.sha256((out/filename).read_bytes()).hexdigest(),'duration_s':round(duration,3),'bytes':(out/filename).stat().st_size})
 print(obj['model'],duration,flush=True)
report={'company_id':'fenix','engine_id':'UMS-001','environment':'LAB','version':'es_ES_voices_audition_only','PUBLISH':False,'new_paid_ai_calls':0,'sample_only':True,'locale':'es_ES','audio_quality':'PENDING_HUMAN_EAR','selected_for_commercial_use':False,'license_audit_required':True,'sources':'https://huggingface.co/rhasspy/piper-voices','records':records}
(out/'AUDITION_PIPER_ES_ES_LICENSE_QA.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
# Do not attach pretrained model binary; artifacts only contain raw test voices and metadata.
for model in out.glob('*.onnx*'): model.unlink()
print('PIPER_ES_ES_AUDITION_CREATED',len(records),flush=True)
