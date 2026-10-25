#!/usr/bin/env python3
"""Fail-closed proof gate for BM-05 dialogue/Foley/SFX/music scene mix and sync."""
from __future__ import annotations
import argparse, hashlib, json, os
from pathlib import Path

def sha(p:Path): return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p): return json.loads(Path(p).read_text())

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--timeline',required=True); ap.add_argument('--runtime',required=True); ap.add_argument('--root',required=True); ap.add_argument('--out',required=True); a=ap.parse_args()
    tl=read(a.timeline); rt=read(a.runtime); root=Path(a.root); audio=rt.get('audio',{}); final=rt.get('final_scene',{})
    comp=audio.get('components',{})
    required={'dialogue','foley','sfx','music'}
    checks={
      'timeline_contract':tl.get('state_type')=='CEREBRO_UMS_BM05_TIMELINE_CONTRACT_V1' and tl.get('benchmark_id')=='BM-05',
      'four_component_mix':set(comp.keys())==required and all(x.get('valid_audio') is True for x in comp.values()),
      'synthetic_dialogue':tl.get('dialogue',{}).get('source')=='QWEN3_TTS_SYNTHETIC_BUILTIN_VOICE' and tl.get('dialogue',{}).get('real_person_voice') is False,
      'qwen_physical':rt.get('dialogue_runtime',{}).get('status')=='PASSED_CPU_REAL_INFERENCE',
      'foley_original':comp.get('foley',{}).get('origin')=='DETERMINISTIC_LOCAL_SYNTHESIS',
      'sfx_original':comp.get('sfx',{}).get('origin')=='DETERMINISTIC_LOCAL_SYNTHESIS',
      'music_from_bm04':comp.get('music',{}).get('source_benchmark')=='BM-04' and comp.get('music',{}).get('source_proof_status')=='PASS_WITH_EVIDENCE',
      'video_from_bm01':final.get('source_video_benchmark')=='BM-01' and final.get('source_video_proof_status')=='PASS_WITH_EVIDENCE',
      'timeline_events_declared':len(tl.get('foley_events',[]))>=4 and len(tl.get('sfx_events',[]))>=3,
      'dialogue_delay_applied':abs(float(rt.get('mix',{}).get('dialogue_delay_seconds',-9))-float(tl.get('dialogue',{}).get('start_seconds',-8)))<0.001,
      'sample_rate':all(x.get('sample_rate_hz')==48000 for x in comp.values()) and audio.get('mix',{}).get('sample_rate_hz')==48000,
      'stereo_mix':audio.get('mix',{}).get('channels')==2,
      'scene_duration':5.8<=float(final.get('duration_seconds',0))<=6.2,
      'audio_video_present':final.get('video_codec')=='h264' and final.get('audio_codec')=='aac',
      'video_geometry':final.get('width')==256 and final.get('height')==256,
      'loudness_window':-18.0<=float(rt.get('loudness',{}).get('integrated_lufs',999))<=-14.0,
      'true_peak_safe':float(rt.get('loudness',{}).get('true_peak_dbfs',999))<=-1.0,
      'sync_contract_applied':rt.get('mix',{}).get('timeline_contract_applied') is True,
      'zero_cost':rt.get('additional_cost_eur')==0 and tl.get('additional_cost_eur')==0,
      'no_prod_authority':rt.get('prod_authorized') is False and tl.get('prod_authorized') is False,
      'no_spend_authority':rt.get('spend_authorized') is False and tl.get('spend_authorized') is False,
    }
    for name,meta in comp.items():
        p=root/meta.get('path','__missing__'); checks[f'component_{name}_hash']=p.is_file() and p.stat().st_size==meta.get('bytes') and sha(p)==meta.get('sha256')
    mixp=root/audio.get('mix',{}).get('path','__missing__'); scenep=root/final.get('path','__missing__')
    checks['mix_hash']=mixp.is_file() and mixp.stat().st_size==audio.get('mix',{}).get('bytes') and sha(mixp)==audio.get('mix',{}).get('sha256')
    checks['scene_hash']=scenep.is_file() and scenep.stat().st_size==final.get('bytes') and sha(scenep)==final.get('sha256')
    passed=all(checks.values())
    report={
      'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM05_SCENE_MIX_PROOF_V1','company_id':'GLOBAL','engine_id':'UMS-001','environment':'PREPROD','benchmark_id':'BM-05',
      'status':'PASS_WITH_EVIDENCE' if passed else 'FAIL_CLOSED','benchmark_credit':bool(passed),'checks':checks,
      'timeline_sha256':sha(Path(a.timeline)),'runtime_evidence_sha256':sha(Path(a.runtime)),
      'scene':{'path':str(scenep),'sha256':sha(scenep) if scenep.is_file() else None,'bytes':scenep.stat().st_size if scenep.is_file() else 0},
      'github_run_id':os.environ.get('GITHUB_RUN_ID'),'github_sha':os.environ.get('GITHUB_SHA'),
      'readiness_mutation_authorized':False,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'additional_cost_eur':0
    }
    out=Path(a.out); out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(report,indent=2),encoding='utf-8'); print(json.dumps(report,indent=2)); raise SystemExit(0 if passed else 9)
if __name__=='__main__': main()
