#!/usr/bin/env python3
"""Fail-closed BM-01 IMAGE_IDENTITY_PROOF gate for Nova-01 IP-Adapter output."""
from __future__ import annotations
import argparse, hashlib, json, os
from pathlib import Path

CANONICAL_FRONT='e0f5968b9919f87c420f3c7ba4127bc1d48c01ddab2505f93f93d858958d04ec'

def sha(p:Path)->str: return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--physical',required=True)
    ap.add_argument('--metrics',required=True)
    ap.add_argument('--image',required=True)
    ap.add_argument('--out',required=True)
    a=ap.parse_args()
    physical_path=Path(a.physical); metrics_path=Path(a.metrics); image=Path(a.image); out=Path(a.out)
    physical=json.loads(physical_path.read_text()); metrics=json.loads(metrics_path.read_text())
    checks={
      'physical_executed':physical.get('status')=='IP_ADAPTER_PHYSICAL_EXECUTED',
      'synthetic_identity':physical.get('reference',{}).get('identity_type')=='SYNTHETIC_ORIGINAL' and physical.get('reference',{}).get('real_person_reference') is False,
      'canonical_reference':physical.get('reference',{}).get('sha256')==CANONICAL_FRONT,
      'cross_modal_pass':metrics.get('status')=='CROSS_MODAL_PASS',
      'same_identity':metrics.get('character_id')=='UMS-SYNTH-CHAR-001',
      'metrics_canonical_reference':metrics.get('reference',{}).get('sha256')==CANONICAL_FRONT,
      'memory_fit':physical.get('resources',{}).get('memory_fit_verified') is True,
      'latency_fit':physical.get('resources',{}).get('latency_fit_verified') is True,
      'license_chain':physical.get('license_chain_verified_by_workflow') is True,
      'zero_cost':physical.get('additional_cost_eur')==0 and metrics.get('additional_cost_eur')==0,
      'no_paid_api':physical.get('paid_api_used') is False,
      'no_prod_authority':physical.get('prod_authorized') is False and metrics.get('prod_authorized') is False,
      'image_exists':image.is_file() and image.stat().st_size>1000,
      'image_hash_matches':image.is_file() and physical.get('output',{}).get('sha256')==sha(image),
      'image_size_matches':image.is_file() and physical.get('output',{}).get('bytes')==image.stat().st_size,
    }
    passed=all(checks.values())
    report={
      'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM01_IMAGE_IDENTITY_PROOF_V1','benchmark_id':'BM-01','proof_type':'IMAGE_IDENTITY_PROOF',
      'character_id':'UMS-SYNTH-CHAR-001','environment':'PREPROD','status':'PASS_WITH_EVIDENCE' if passed else 'FAIL_CLOSED',
      'checks':checks,
      'evidence':{
        'image':{'path':str(image),'sha256':sha(image) if image.is_file() else None,'bytes':image.stat().st_size if image.is_file() else 0},
        'physical_report_sha256':sha(physical_path),'cross_modal_metrics_sha256':sha(metrics_path),
        'adapter':physical.get('adapter'),'base_model':physical.get('base_model'),'device':physical.get('device'),
        'timing':physical.get('timing'),'resources':physical.get('resources')
      },
      'github_run_id':os.environ.get('GITHUB_RUN_ID'),'github_sha':os.environ.get('GITHUB_SHA'),
      'readiness_mutation_authorized':False,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'additional_cost_eur':0
    }
    out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(report,indent=2),encoding='utf-8'); print(json.dumps(report,indent=2))
    raise SystemExit(0 if passed else 5)

if __name__=='__main__': main()
