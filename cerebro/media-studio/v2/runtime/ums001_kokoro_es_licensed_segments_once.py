#!/usr/bin/env python3
"""Isolated Fénix UMS-001 free, Apache-licensed Spanish TTS pilot. No vendor tokens, no publishing."""
import json, hashlib, pathlib, sys
import numpy as np
import soundfile as sf
from kokoro import KPipeline

OUT=pathlib.Path("/tmp/ums001_kokoro_es_licensed")
OUT.mkdir(exist_ok=True,parents=True)
SCRIPT={
  "INSTAGRAM": {"voice":"ef_dora","segments":[
    (0.0,2.82,"¿Y si tu primera vivienda está más cerca de lo que crees?"),
    (3.13,4.53,"No empieces a ciegas."),
    (4.75,6.26,"Descubre qué puedes comprar."),
    (6.46,8.74,"Cuánto puedes financiar y qué pasos dar."),
    (8.86,12.81,"En Fénix Capital estudiamos tu caso y buscamos opciones reales."),
    (13.17,14.80,"Tu nueva etapa empieza con un plan."),
    (15.04,16.60,"Solicita tu preestudio.")
  ]},
  "FACEBOOK": {"voice":"em_alex","segments":[
    (0.0,2.48,"¿Te han dicho que tu hipoteca es imposible?"),
    (2.78,4.91,"Un no no siempre es el final."),
    (5.21,6.60,"Cada caso es distinto."),
    (6.81,9.99,"Ingresos, ahorro, trabajo y vivienda."),
    (10.09,14.64,"En Fénix Capital estudiamos las opciones que encajan contigo."),
    (14.85,16.66,"No te quedes con la primera respuesta."),
    (16.82,18.65,"Solicita tu preestudio.")
  ]}
}

pipeline=KPipeline(lang_code="e")
reports=[]
for network,config in SCRIPT.items():
    outdir=OUT/network
    outdir.mkdir(exist_ok=True)
    segments=[]
    for i,(start,end,txt) in enumerate(config["segments"],1):
        parts=[]
        for _,_,audio in pipeline(txt, voice=config["voice"], speed=1.02,split_pattern=r"\\n+"):
            if audio is not None:
                parts.append(np.asarray(audio,dtype=np.float32))
        assert parts, "No audio generated for "+network+str(i)
        audio=np.concatenate(parts)
        if not np.isfinite(audio).all():
            raise ValueError("Non finite PCM")
        duration=len(audio)/24000.0
        file=outdir/f"SEG_{i:02d}.wav"
        sf.write(str(file),audio,24000,subtype="PCM_16")
        segments.append({"index":i,"start_s":start,"end_s":end,"target_s":round(end-start,3),"raw_duration_s":round(duration,3),"text":txt,"file":str(file.relative_to(OUT)),"sha256":hashlib.sha256(file.read_bytes()).hexdigest()})
        print("SEGMENT",network,i,round(duration,2),flush=True)
    reports.append({"network":network,"voice":config["voice"],"language":"es","model":"hexgrad/Kokoro-82M v1.0","license":"Apache-2.0 as stated on model card; confirm production rights before publishing","segments":segments})
result={"schema_version":"1.0","company_id":"fenix","engine_id":"UMS-001","environment":"LAB","purpose":"REPLACE_HEYGEN_FREE_NONCOMMERCIAL_SPEECH","provider_api_calls":0,"new_subscriptions":0,"autopublish":False,"lang_code":"e","model_card":"https://huggingface.co/hexgrad/Kokoro-82M","model_license":"Apache-2.0","voice_quality":"PENDING_EDITORIAL_LISTENING","speaker_accent_es_ES":"PENDING_EAR_CHECK","reports":reports}
(OUT/"KOKORO_ES_SEGMENTS_QA_MANIFEST.json").write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding="utf-8")
print("KOKORO_TTS_14_SEGMENTS_CREATED_LAB",flush=True)
