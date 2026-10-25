#!/usr/bin/env python3
"""Fail-closed BM-03 aggregate proof tribunal."""
from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def load(p): return json.loads(Path(p).read_text(encoding='utf-8'))

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--source-manifest',required=True); ap.add_argument('--admission',required=True); ap.add_argument('--qwen',required=True); ap.add_argument('--openvoice',required=True); ap.add_argument('--out',required=True); a=ap.parse_args()
    sm=load(a.source_manifest); adm=load(a.admission); q=load(a.qwen); ov=load(a.openvoice)
    checks={
      'licensed_real_human_source':sm.get('status')=='SEALED_LICENSED_REAL_HUMAN_SOURCE' and sm.get('commercial_use') is False,
      'source_admitted':adm.get('admitted') is True and adm.get('benchmark_id')=='BM-03' and adm.get('human_required') is False,
      'source_not_published':adm.get('publish_authorized') is False,
      'qwen_clone_proven':q.get('status')=='QWEN_BASE_REAL_HUMAN_VOICE_CLONE_MULTILINGUAL_PROVEN' and (q.get('runtime') or {}).get('voice_clone') is True,
      'tts_proven':(q.get('runtime') or {}).get('tts') is True,
      'multilingual_proven':{x.get('language') for x in q.get('outputs',[])}=={'Spanish','English'},
      'qwen_outputs_physical':len(q.get('outputs',[]))==2 and all(x.get('bytes',0)>1000 and x.get('duration_seconds',0)>=2 and x.get('rms_linear',0)>0.001 for x in q.get('outputs',[])),
      'openvoice_conversion_proven':ov.get('status')=='OPENVOICE_V2_REAL_HUMAN_TARGET_CONVERSION_AND_PROSODY_PROVEN' and (ov.get('runtime') or {}).get('voice_conversion') is True,
      'prosody_proven':(ov.get('prosody') or {}).get('criterion_pass') is True and (ov.get('prosody') or {}).get('duration_ratio',0)>=1.15,
      'openvoice_outputs_physical':len(ov.get('outputs',[]))==2 and all(x.get('bytes',0)>1000 and x.get('duration_seconds',0)>=1 and x.get('rms_linear',0)>0.001 for x in ov.get('outputs',[])),
      'qwen_license_chain':(q.get('runtime') or {}).get('code_license')=='Apache-2.0' and (q.get('runtime') or {}).get('checkpoint_license')=='Apache-2.0',
      'openvoice_license_chain':(ov.get('runtime') or {}).get('code_license')=='MIT' and (ov.get('runtime') or {}).get('checkpoint_license')=='MIT',
      'zero_added_cost':q.get('additional_cost_eur')==0 and ov.get('additional_cost_eur')==0,
      'no_local_prod_mutation':q.get('prod_mutation_authorized') is False and ov.get('prod_mutation_authorized') is False,
      'no_publish':q.get('publish_authorized') is False and ov.get('publish_authorized') is False,
    }
    passed=all(checks.values())
    doc={
      'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM03_AUTHORIZED_VOICE_PROOF_TRIBUNAL_V1','benchmark_id':'BM-03','environment':'PREPROD',
      'status':'PASS_WITH_PHYSICAL_EVIDENCE' if passed else 'FAIL','benchmark_credit_eligible':passed,
      'checks':checks,'check_count':len(checks),'passed_check_count':sum(bool(x) for x in checks.values()),
      'evidence':{
        'source_manifest':{'sha256':sha(a.source_manifest),'status':sm.get('status'),'source_ref':sm.get('source_ref'),'dataset_license':sm.get('dataset_license')},
        'source_admission':{'sha256':sha(a.admission),'status':adm.get('status')},
        'qwen_manifest':{'sha256':sha(a.qwen),'status':q.get('status'),'outputs':[{'path':x.get('path'),'sha256':x.get('sha256')} for x in q.get('outputs',[])]},
        'openvoice_manifest':{'sha256':sha(a.openvoice),'status':ov.get('status'),'outputs':[{'path':x.get('path'),'sha256':x.get('sha256')} for x in ov.get('outputs',[])]}
      },
      'capabilities_proven':['VOICE_CLONE','VOICE_CONVERSION','TTS','PROSODY','MULTILINGUAL'],
      'human_required':False,'additional_cost_eur':0,'prod_mutation_authorized':False,'publish_authorized':False,'spend_authorized':False,
      'note':'Benchmark media is CC BY-NC-SA 4.0 internal validation material. The Qwen/OpenVoice runtime license chain is evaluated independently; this tribunal does not publish or commercially use the test actor.'
    }
    Path(a.out).write_text(json.dumps(doc,indent=2),encoding='utf-8'); print(json.dumps(doc,indent=2))
    if not passed: raise SystemExit(13)

if __name__=='__main__': main()
