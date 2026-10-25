#!/usr/bin/env python3
"""Fail-closed BM-04 original-song proof gate."""
from __future__ import annotations
import argparse, hashlib, json, os
from pathlib import Path

def sha(p:Path)->str: return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--composition',required=True); ap.add_argument('--runtime',required=True); ap.add_argument('--root',required=True); ap.add_argument('--out',required=True); a=ap.parse_args()
    comp=json.loads(Path(a.composition).read_text()); run=json.loads(Path(a.runtime).read_text()); root=Path(a.root)
    required_stems={'strings','piano','bass','horn','drums'}
    audio=run.get('audio_assets',{}); stems=audio.get('stems',{})
    checks={
      'composition_contract':comp.get('state_type')=='CEREBRO_UMS_BM04_ORIGINAL_COMPOSITION_V1' and comp.get('benchmark_id')=='BM-04',
      'original_provenance':comp.get('pretrained_music_model_used') is False and comp.get('external_composition_used') is False and comp.get('copyright_source')=='ORIGINAL_GENERATED_FROM_DECLARED_NOTE_EVENTS',
      'structured_score':comp.get('bars')==12 and comp.get('tempo_bpm')==96 and len(comp.get('harmony',[]))==12 and len(comp.get('structure',[]))>=4,
      'five_stems_declared':set(comp.get('stems',{}).keys())==required_stems,
      'five_stems_rendered':set(stems.keys())==required_stems and all(x.get('valid_audio') is True for x in stems.values()),
      'sample_rate':all(x.get('sample_rate_hz')==48000 for x in stems.values()) and audio.get('master_wav',{}).get('sample_rate_hz')==48000,
      'stereo_master':audio.get('master_wav',{}).get('channels')==2,
      'duration':29.0<=float(audio.get('master_wav',{}).get('duration_seconds',0))<=30.5,
      'premaster_exists':audio.get('premaster',{}).get('valid_audio') is True,
      'master_wav_exists':audio.get('master_wav',{}).get('valid_audio') is True,
      'master_flac_exists':audio.get('master_flac',{}).get('valid_audio') is True,
      'master_distinct_from_premaster':audio.get('master_wav',{}).get('sha256')!=audio.get('premaster',{}).get('sha256'),
      'loudness_window':-17.5<=float(run.get('loudness',{}).get('integrated_lufs',999))<=-14.5,
      'true_peak_safe':float(run.get('loudness',{}).get('true_peak_dbfs',999))<=-1.0,
      'fluidsynth_runtime':run.get('tools',{}).get('fluidsynth_verified') is True,
      'ffmpeg_runtime':run.get('tools',{}).get('ffmpeg_verified') is True,
      'soundfont_mit':run.get('licenses',{}).get('fluidr3_mit_verified') is True,
      'fluidsynth_lgpl':run.get('licenses',{}).get('fluidsynth_lgpl_verified') is True,
      'zero_cost':run.get('additional_cost_eur')==0 and comp.get('additional_cost_eur')==0,
      'no_prod_authority':run.get('prod_authorized') is False and comp.get('prod_authorized') is False,
      'no_spend_authority':run.get('spend_authorized') is False and comp.get('spend_authorized') is False,
    }
    evidence={}
    for key,meta in {'premaster':audio.get('premaster',{}),'master_wav':audio.get('master_wav',{}),'master_flac':audio.get('master_flac',{})}.items():
        p=root/meta.get('path','__missing__')
        ok=p.is_file() and p.stat().st_size==meta.get('bytes') and sha(p)==meta.get('sha256')
        checks[f'{key}_hash']=ok
        evidence[key]={'path':str(p),'sha256':sha(p) if p.is_file() else None,'bytes':p.stat().st_size if p.is_file() else 0}
    for name,meta in stems.items():
        p=root/meta.get('path','__missing__'); checks[f'stem_{name}_hash']=p.is_file() and p.stat().st_size==meta.get('bytes') and sha(p)==meta.get('sha256')
    passed=all(checks.values())
    report={
      'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM04_ORIGINAL_SONG_PROOF_V1','company_id':'GLOBAL','engine_id':'UMS-001','environment':'PREPROD','benchmark_id':'BM-04',
      'status':'PASS_WITH_EVIDENCE' if passed else 'FAIL_CLOSED','benchmark_credit':bool(passed),'checks':checks,'evidence':evidence,
      'composition_sha256':sha(Path(a.composition)),'runtime_evidence_sha256':sha(Path(a.runtime)),
      'github_run_id':os.environ.get('GITHUB_RUN_ID'),'github_sha':os.environ.get('GITHUB_SHA'),
      'readiness_mutation_authorized':False,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'additional_cost_eur':0
    }
    out=Path(a.out); out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(report,indent=2),encoding='utf-8'); print(json.dumps(report,indent=2)); raise SystemExit(0 if passed else 8)
if __name__=='__main__': main()
