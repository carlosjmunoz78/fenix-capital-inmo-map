#!/usr/bin/env python3
"""Fail-closed BM-01 VIDEO_IDENTITY_PROOF gate for Nova-01."""
from __future__ import annotations
import argparse, hashlib, json, os
from pathlib import Path

CANONICAL_FRONT='e0f5968b9919f87c420f3c7ba4127bc1d48c01ddab2505f93f93d858958d04ec'

def sha(p:Path)->str: return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--candidate',required=True)
    ap.add_argument('--metrics',required=True,nargs=3)
    ap.add_argument('--video',required=True)
    ap.add_argument('--root',required=True)
    ap.add_argument('--out',required=True)
    a=ap.parse_args()
    candidate=json.loads(Path(a.candidate).read_text())
    metric_docs=[json.loads(Path(p).read_text()) for p in a.metrics]
    root=Path(a.root); video=Path(a.video); out=Path(a.out)
    frame_by_index={int(x['index']):x for x in candidate.get('frames',[])}
    tribunal=[1,6,12]
    checks={
      'candidate_status':candidate.get('status')=='VIDEO_IDENTITY_CANDIDATE_GENERATED',
      'synthetic_identity':candidate.get('identity_type')=='SYNTHETIC_ORIGINAL' and candidate.get('real_person_reference') is False,
      'same_character':candidate.get('character_id')=='UMS-SYNTH-CHAR-001',
      'frame_count':candidate.get('frame_count')==12,
      'tribunal_declared':candidate.get('tribunal_frames')==tribunal,
      'all_cross_modal_pass':len(metric_docs)==3 and all(m.get('status')=='CROSS_MODAL_PASS' for m in metric_docs),
      'metrics_same_identity':all(m.get('character_id')=='UMS-SYNTH-CHAR-001' for m in metric_docs),
      'metrics_canonical_reference':all(m.get('reference',{}).get('sha256')==CANONICAL_FRONT for m in metric_docs),
      'zero_cost':candidate.get('additional_cost_eur')==0 and all(m.get('additional_cost_eur')==0 for m in metric_docs),
      'no_prod_authority':candidate.get('prod_authorized') is False and all(m.get('prod_authorized') is False for m in metric_docs),
      'video_exists':video.is_file() and video.stat().st_size>1000,
    }
    evidence={}
    for idx in tribunal:
      meta=frame_by_index.get(idx); p=root/meta['path'] if meta else root/'__missing__'
      ok=bool(meta) and p.is_file() and p.stat().st_size==meta.get('bytes') and sha(p)==meta.get('sha256')
      checks[f'frame_{idx}_artifact']=ok
      evidence[f'frame_{idx}']={'path':str(p),'sha256':sha(p) if p.is_file() else None,'bytes':p.stat().st_size if p.is_file() else 0}
    passed=all(checks.values())
    report={
      'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM01_VIDEO_IDENTITY_PROOF_V1','benchmark_id':'BM-01','proof_type':'VIDEO_IDENTITY_PROOF',
      'character_id':'UMS-SYNTH-CHAR-001','environment':'PREPROD','status':'PASS_WITH_EVIDENCE' if passed else 'FAIL_CLOSED',
      'checks':checks,'evidence':evidence,
      'video':{'path':str(video),'sha256':sha(video) if video.is_file() else None,'bytes':video.stat().st_size if video.is_file() else 0},
      'candidate_manifest_sha256':sha(Path(a.candidate)),'metrics_sha256':[sha(Path(p)) for p in a.metrics],
      'github_run_id':os.environ.get('GITHUB_RUN_ID'),'github_sha':os.environ.get('GITHUB_SHA'),
      'readiness_mutation_authorized':False,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'additional_cost_eur':0
    }
    out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(report,indent=2),encoding='utf-8'); print(json.dumps(report,indent=2))
    raise SystemExit(0 if passed else 5)

if __name__=='__main__': main()
