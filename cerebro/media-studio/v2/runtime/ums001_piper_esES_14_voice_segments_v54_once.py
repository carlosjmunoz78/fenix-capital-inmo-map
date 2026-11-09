#!/usr/bin/env python3
"""UMS-001 es_ES Piper Sharvard full voice drafts. LAB ONLY.
Reuses documented CC BY 3.0 training dataset; preserve attribution and review rights.
No secrets, no external paid API, no publishing.
"""
from pathlib import Path
from piper import PiperVoice
from piper.config import SynthesisConfig
import json, wave, hashlib

root=Path("/tmp/ums001_esES_full_14")
root.mkdir(parents=True,exist_ok=True)
model=root/"es_ES-sharvard-medium.onnx"
model_config=json.loads((root/"es_ES-sharvard-medium.onnx.json").read_text(encoding="utf-8"))
assert model.stat().st_size>70_000_000
assert model_config["language"]["code"]=="es_ES"
assert model_config["speaker_id_map"]["F"]==1
assert model_config["speaker_id_map"]["M"]==0
tts=PiperVoice.load(str(model))
projects={
 "INSTAGRAM":{"speaker":1,"texts":[
    "¿Y si tu primera vivienda está más cerca de lo que crees?",
    "No empieces a ciegas.",
    "Descubre qué puedes comprar.",
    "Cuánto puedes financiar y qué pasos dar.",
    "En Fénix Capital estudiamos tu caso y buscamos opciones reales.",
    "Tu nueva etapa empieza con un plan.",
    "Solicita tu preestudio."
 ]},
 "FACEBOOK":{"speaker":0,"texts":[
    "¿Te han dicho que tu hipoteca es imposible?",
    "Un no no siempre es el final.",
    "Cada caso es distinto.",
    "Ingresos, ahorro, trabajo y vivienda.",
    "En Fénix Capital estudiamos las opciones que encajan contigo.",
    "No te quedes con la primera respuesta.",
    "Solicita tu preestudio."
 ]}
}
manifest={"company_id":"fenix","engine_id":"UMS-001","environment":"LAB","version":"V5.4_ES_ES_VOICE_CANDIDATE","model":"rhasspy/piper-voices/es/es_ES/sharvard/medium","locale":"es_ES","model_card":"https://huggingface.co/rhasspy/piper-voices/blob/main/es/es_ES/sharvard/medium/MODEL_CARD","dataset_license":"CC BY 3.0 - attribution required","publish":False,"approved":False,"api_paid_calls":0,"model_downloaded_open_source":True,"projects":{}}
for net,config in projects.items():
 output=root/net;output.mkdir(exist_ok=True)
 rows=[]
 for i,txt in enumerate(config["texts"],1):
  path=output/f"{net}_SEG_{i:02d}_PIPER_ES_ES.wav"
  with wave.open(str(path),"wb") as o:
   tts.synthesize_wav(txt,o,syn_config=SynthesisConfig(speaker_id=config["speaker"],length_scale=0.92,noise_scale=0.55,noise_w_scale=0.65))
  with wave.open(str(path),"rb") as z:
   duration=z.getnframes()/z.getframerate();rate=z.getframerate()
  assert 0.45<duration<10 and rate>=16000 and path.stat().st_size>10000, (net,i,duration)
  rows.append({"index":i,"text":txt,"file":str(path.relative_to(root)),"duration_s":round(duration,4),"rate":rate,"bytes":path.stat().st_size,"sha256":hashlib.sha256(path.read_bytes()).hexdigest()})
  print(net,i,round(duration,3),flush=True)
 manifest["projects"][net]={"speaker_id":config["speaker"],"segments":rows}
# delete large weights, never archive model unless permitted by its licensing terms.
for f in root.glob("*.onnx*"): f.unlink()
(root/"UMS001_PIPER_ES_ES_V54_14_SEGMENT_MANIFEST.json").write_text(json.dumps(manifest,indent=2,ensure_ascii=False),encoding="utf-8")
print("UMS001_PIPER_ES_ES_14_SEGS_CREATED_ONE_SHOT",flush=True)
