#!/usr/bin/env python3
"""Fail-closed BM-09 proof for a declared-device adapter dry run."""
from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
import numpy as np
from PIL import Image

EXPECTED_SOURCE='cfbc386d1150d5d08babd176cc858156df9ced716c9e9fb5cd2921fc3fbad9d8'
EXPECTED_ANGLES=[-28,-20,-12,-4,4,12,20,28]
THRESHOLDS={'views':8,'unique_views':8,'adjacent_mean_abs_delta_min':1.0,'quilt_bytes_min':20000,'blend_bytes_min':100000}

def sha(p:Path): return hashlib.sha256(p.read_bytes()).hexdigest()
def arr(p): return np.asarray(Image.open(p).convert('RGB'),dtype=np.float32)

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--manifest',required=True); ap.add_argument('--root',required=True); ap.add_argument('--quilt',required=True); ap.add_argument('--out',required=True)
    a=ap.parse_args(); root=Path(a.root); mf=Path(a.manifest); quilt=Path(a.quilt); out=Path(a.out); m=json.loads(mf.read_text())
    views=m.get('views',[]); hashes=[]; view_checks=[]; arrays=[]
    for v in views:
        p=root/v.get('path','__missing__'); ok=p.is_file() and p.stat().st_size==v.get('bytes') and sha(p)==v.get('sha256')
        view_checks.append(ok)
        if p.is_file(): hashes.append(sha(p)); arrays.append(arr(p))
    deltas=[float(np.mean(np.abs(arrays[i]-arrays[i+1]))) for i in range(len(arrays)-1)] if len(arrays)==8 else []
    mean_adj=float(np.mean(deltas)) if deltas else 0.0
    profile=m.get('device_profile',{}); blend_meta=m.get('artifacts',{}).get('blend',{}); blend=root/blend_meta.get('path','__missing__')
    qsize=Image.open(quilt).size if quilt.is_file() else (0,0)
    checks={
      'benchmark_contract':m.get('benchmark_id')=='BM-09' and m.get('status')=='DECLARED_DEVICE_ADAPTER_DRY_RUN_GENERATED',
      'preprod_only':m.get('environment')=='PREPROD',
      'source_bm07_hash':m.get('source',{}).get('benchmark_id')=='BM-07' and m.get('source',{}).get('sha256')==EXPECTED_SOURCE,
      'declared_profile':profile.get('id')=='CEREBRO_DECLARED_LIGHTFIELD_8V_V1' and profile.get('synthetic_profile') is True,
      'hardware_claim_closed':profile.get('hardware_present') is False and profile.get('hardware_runtime_proven') is False and profile.get('dry_run_only') is True,
      'metric_units':profile.get('linear_unit')=='meter',
      'view_contract':profile.get('view_count')==8 and profile.get('quilt_layout')==[4,2] and profile.get('per_view_resolution')==[256,256] and profile.get('view_angles_degrees')==EXPECTED_ANGLES,
      'eight_views':len(views)==THRESHOLDS['views'] and len(view_checks)==8 and all(view_checks),
      'view_angles_match': [v.get('angle_degrees') for v in views]==EXPECTED_ANGLES,
      'unique_views':len(set(hashes))>=THRESHOLDS['unique_views'],
      'physical_parallax_metric':mean_adj>=THRESHOLDS['adjacent_mean_abs_delta_min'],
      'quilt_physical':quilt.is_file() and quilt.stat().st_size>=THRESHOLDS['quilt_bytes_min'] and qsize==(1024,512),
      'animated_source_blend':blend.is_file() and blend.stat().st_size>=THRESHOLDS['blend_bytes_min'] and sha(blend)==blend_meta.get('sha256'),
      'internal_original':m.get('rights',{}).get('status')=='INTERNAL_ORIGINAL' and m.get('rights',{}).get('external_assets')==0,
      'zero_cost':m.get('additional_cost_eur')==0,
      'authority_closed':m.get('prod_authorized') is False and m.get('publish_authorized') is False and m.get('spend_authorized') is False,
    }
    passed=all(checks.values())
    report={
      'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM09_DECLARED_DEVICE_DRY_RUN_PROOF_V1','benchmark_id':'BM-09','proof_type':'DECLARED_DEVICE_ADAPTER_DRY_RUN_PROOF','environment':'PREPROD','status':'PASS_WITH_EVIDENCE' if passed else 'FAIL_CLOSED','benchmark_credit':passed,
      'threshold_policy':'FIXED_BEFORE_CANDIDATE_OBSERVATION','thresholds':THRESHOLDS,'checks':checks,
      'metrics':{'unique_view_hashes':len(set(hashes)),'adjacent_mean_abs_deltas':deltas,'mean_adjacent_delta':mean_adj,'quilt_size':list(qsize)},
      'device_claim':{'profile_id':profile.get('id'),'hardware_present':False,'hardware_runtime_proven':False,'dry_run_only':True},
      'evidence':{'manifest_sha256':sha(mf),'quilt_sha256':sha(quilt) if quilt.is_file() else None,'quilt_bytes':quilt.stat().st_size if quilt.is_file() else 0,'blend_sha256':sha(blend) if blend.is_file() else None,'view_sha256':hashes},
      'additional_cost_eur':0,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'benchmark_registry_mutation_authorized':passed,'universal_media_studio_ready_authorized':False
    }
    out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(report,indent=2),encoding='utf-8'); print(json.dumps(report,indent=2)); raise SystemExit(0 if passed else 9)
if __name__=='__main__': main()
