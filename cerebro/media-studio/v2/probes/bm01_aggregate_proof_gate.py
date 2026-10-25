#!/usr/bin/env python3
"""Fail-closed aggregate gate for BM-01 persistent synthetic character proof.

Consumes immutable Stage0, THREE_D_REFERENCE_PROOF and VIDEO_IDENTITY_PROOF evidence.
It emits benchmark credit only; it does not mutate the UMS readiness registry or PROD.
"""
from __future__ import annotations
import argparse, hashlib, json, os
from pathlib import Path

CHARACTER='UMS-SYNTH-CHAR-001'
CANONICAL_FRONT='e0f5968b9919f87c420f3c7ba4127bc1d48c01ddab2505f93f93d858958d04ec'
REQUIRED_2D_HASHES={
 'e0f5968b9919f87c420f3c7ba4127bc1d48c01ddab2505f93f93d858958d04ec',
 'fd18b29d82a0de3acbd178210938c5ab021aa25fde260285f5bddd741ba0b172',
 '97fb7b322508f995378d7d3dfd01baa7511d91d3b78b69a05518f40a4a63b651',
}

def sha(p:Path)->str: return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p:str): return json.loads(Path(p).read_text())

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--stage0-evidence',required=True)
    ap.add_argument('--stage0-report',required=True)
    ap.add_argument('--three-d-proof',required=True)
    ap.add_argument('--three-d-metrics',required=True)
    ap.add_argument('--video-proof',required=True)
    ap.add_argument('--out',required=True)
    a=ap.parse_args()
    s0=read(a.stage0_evidence); s0r=read(a.stage0_report); d3=read(a.three_d_proof); d3m=read(a.three_d_metrics); vid=read(a.video_proof)

    checks={
      'stage0_green':s0.get('status')=='BM01_STAGE0_REFERENCE_GREEN',
      'stage0_synthetic':s0.get('character_id')==CHARACTER and s0r.get('identity_type')=='SYNTHETIC_ORIGINAL' and s0r.get('real_person_reference') is False,
      'three_distinct_2d_refs':set(s0.get('reference_hashes',[]))==REQUIRED_2D_HASHES and len(s0r.get('reference_assets',[]))==3,
      'canonical_front_present':CANONICAL_FRONT in set(s0.get('reference_hashes',[])),
      'three_d_pass':d3.get('status')=='PASS_WITH_EVIDENCE' and d3.get('proof_type')=='THREE_D_REFERENCE_PROOF',
      'three_d_same_character':d3.get('character_id')==CHARACTER,
      'cross_modal_pass':d3m.get('status')=='CROSS_MODAL_PASS' and d3m.get('character_id')==CHARACTER,
      'cross_modal_thresholds_frozen':d3m.get('threshold_policy')=='FIXED_BEFORE_CANDIDATE_OBSERVATION',
      'video_pass':vid.get('status')=='PASS_WITH_EVIDENCE' and vid.get('proof_type')=='VIDEO_IDENTITY_PROOF',
      'video_same_character':vid.get('character_id')==CHARACTER,
      'child_checks_all_green':all(d3.get('checks',{}).values()) and all(vid.get('checks',{}).values()),
      'zero_cost':all(x.get('additional_cost_eur')==0 for x in (s0,d3,d3m,vid)),
      'no_prod_authority':all(x.get('prod_authorized') is False for x in (s0,d3,d3m,vid)),
      'no_spend_authority':s0.get('spend_authorized') is False and d3.get('spend_authorized') is False and vid.get('spend_authorized') is False,
      'no_readiness_self_mutation':s0.get('readiness_mutation') is False and d3.get('readiness_mutation_authorized') is False and d3m.get('readiness_mutation_authorized') is False and vid.get('readiness_mutation_authorized') is False,
    }
    passed=all(checks.values())
    files={
      'stage0_evidence':a.stage0_evidence,
      'stage0_report':a.stage0_report,
      'three_d_proof':a.three_d_proof,
      'three_d_metrics':a.three_d_metrics,
      'video_proof':a.video_proof,
    }
    evidence={k:{'path':v,'sha256':sha(Path(v)),'bytes':Path(v).stat().st_size} for k,v in files.items()}
    report={
      'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM01_AGGREGATE_PROOF_V1',
      'company_id':'GLOBAL','engine_id':'UMS-001','environment':'PREPROD','version':'1.0.0',
      'benchmark_id':'BM-01','benchmark_name':'Persistent synthetic character across image video and 3D references',
      'character_id':CHARACTER,'identity_type':'SYNTHETIC_ORIGINAL','real_person_reference':False,
      'status':'PASS_WITH_EVIDENCE' if passed else 'FAIL_CLOSED','benchmark_credit':bool(passed),
      'checks':checks,'evidence':evidence,
      'proven_modalities':['IMAGE_2D','THREE_D','VIDEO'] if passed else [],
      'cross_modal_consistency_proven':bool(passed),
      'github_run_id':os.environ.get('GITHUB_RUN_ID'),'github_sha':os.environ.get('GITHUB_SHA'),
      'readiness_mutation_authorized':False,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'additional_cost_eur':0,
      'next_action':'REGISTER_BM01_PASS_IN_PREPROD_BENCHMARK_REGISTRY' if passed else 'KEEP_BM01_NOT_RUN_AND_REPAIR_FAILED_CHILD_GATE'
    }
    out=Path(a.out); out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(report,indent=2),encoding='utf-8'); print(json.dumps(report,indent=2))
    raise SystemExit(0 if passed else 7)
if __name__=='__main__': main()
