#!/usr/bin/env python3
"""Fail-closed BM-01 THREE_D_REFERENCE_PROOF gate."""
from __future__ import annotations
import argparse, hashlib, json, os
from pathlib import Path

CANONICAL_FRONT='e0f5968b9919f87c420f3c7ba4127bc1d48c01ddab2505f93f93d858958d04ec'

def sha(p:Path)->str: return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--candidate',required=True); ap.add_argument('--metrics',required=True); ap.add_argument('--root',required=True); ap.add_argument('--out',required=True); a=ap.parse_args()
    candidate=json.loads(Path(a.candidate).read_text()); metrics=json.loads(Path(a.metrics).read_text()); root=Path(a.root); out=Path(a.out)
    checks={
      'candidate_status':candidate.get('status')=='THREE_D_REFERENCE_CANDIDATE_GENERATED',
      'synthetic_identity':candidate.get('identity_type')=='SYNTHETIC_ORIGINAL' and candidate.get('real_person_reference') is False,
      'canonical_reference':candidate.get('source_reference',{}).get('sha256')==CANONICAL_FRONT,
      'blender_lts':str(candidate.get('blender_version','')).startswith('5.2.3'),
      'cpu_physical':candidate.get('render_device')=='CPU',
      'cross_modal_pass':metrics.get('status')=='CROSS_MODAL_PASS',
      'same_identity':metrics.get('character_id')=='UMS-SYNTH-CHAR-001' and candidate.get('character_id')=='UMS-SYNTH-CHAR-001',
      'zero_cost':candidate.get('additional_cost_eur')==0 and metrics.get('additional_cost_eur')==0,
      'no_prod_authority':candidate.get('prod_authorized') is False and metrics.get('prod_authorized') is False,
    }
    evidence={}
    for key in ('blend','glb','usd'):
      meta=candidate.get('assets',{}).get(key)
      if not meta: checks[f'{key}_asset']=False; continue
      p=root/meta['path']; ok=p.is_file() and p.stat().st_size==meta.get('bytes') and sha(p)==meta.get('sha256')
      checks[f'{key}_asset']=ok; evidence[key]={'path':str(p),'sha256':sha(p) if p.is_file() else None,'bytes':p.stat().st_size if p.is_file() else 0}
    renders=candidate.get('assets',{}).get('renders',{})
    for label in ('FRONT','PROFILE_LEFT','THREE_QUARTER_RIGHT'):
      meta=renders.get(label,{}); p=root/meta.get('path','') if meta else root/'__missing__'
      ok=bool(meta) and p.is_file() and p.stat().st_size==meta.get('bytes') and sha(p)==meta.get('sha256')
      checks[f'render_{label}']=ok; evidence[f'render_{label}']={'path':str(p),'sha256':sha(p) if p.is_file() else None,'bytes':p.stat().st_size if p.is_file() else 0}
    passed=all(checks.values())
    report={
      'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM01_THREE_D_REFERENCE_PROOF_V1','benchmark_id':'BM-01','proof_type':'THREE_D_REFERENCE_PROOF','character_id':'UMS-SYNTH-CHAR-001','environment':'PREPROD',
      'status':'PASS_WITH_EVIDENCE' if passed else 'FAIL_CLOSED','checks':checks,'evidence':evidence,
      'cross_modal_metrics_sha256':sha(Path(a.metrics)),'candidate_manifest_sha256':sha(Path(a.candidate)),
      'github_run_id':os.environ.get('GITHUB_RUN_ID'),'github_sha':os.environ.get('GITHUB_SHA'),
      'readiness_mutation_authorized':False,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'additional_cost_eur':0
    }
    out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(report,indent=2),encoding='utf-8'); print(json.dumps(report,indent=2)); raise SystemExit(0 if passed else 4)
if __name__=='__main__': main()
