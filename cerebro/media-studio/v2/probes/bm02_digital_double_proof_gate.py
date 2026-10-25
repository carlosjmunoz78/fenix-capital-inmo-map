#!/usr/bin/env python3
"""Fail-closed BM-02 digital-double proof tribunal."""
from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def load(p): return json.loads(Path(p).read_text(encoding='utf-8'))

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--source-manifest',required=True); ap.add_argument('--admission',required=True); ap.add_argument('--digital-double',required=True); ap.add_argument('--license-evidence',required=True); ap.add_argument('--out',required=True); a=ap.parse_args()
    sm=load(a.source_manifest); adm=load(a.admission); dd=load(a.digital_double); lic=load(a.license_evidence)
    tr=dd.get('tracking') or {}; rt=dd.get('runtime') or {}; outputs=dd.get('outputs') or {}
    checks={
      'licensed_real_human_source':sm.get('status')=='SEALED_LICENSED_REAL_HUMAN_SOURCE' and sm.get('commercial_use') is False,
      'source_admitted':adm.get('admitted') is True and adm.get('benchmark_id')=='BM-02' and adm.get('human_required') is False,
      'physical_double_proven':dd.get('status')=='MEDIAPIPE_REAL_HUMAN_DIGITAL_DOUBLE_PHYSICAL_PROVEN',
      'geometry_only_render':(dd.get('source') or {}).get('source_pixels_in_render') is False,
      'tracking_coverage':tr.get('decoded_frames',0)>=10 and tr.get('tracked_frames',0)>=10 and tr.get('tracking_ratio',0)>=0.90,
      'dense_3d_face_geometry':tr.get('landmarks_per_tracked_frame',0)>=468 and tr.get('edge_count',0)>=800,
      'motion_observed':tr.get('motion_rms_normalized',0)>1e-5,
      'wireframe_video_physical':(outputs.get('wireframe_video') or {}).get('bytes',0)>1000,
      'wireframe_obj_physical':(outputs.get('wireframe_obj') or {}).get('bytes',0)>1000,
      'motion_track_physical':(outputs.get('motion_track') or {}).get('bytes',0)>1000,
      'mediapipe_code_apache2':rt.get('code_license')=='Apache-2.0' and rt.get('code_license_verified') is True and lic.get('code_license_verified') is True,
      'face_mesh_model_apache2':rt.get('model_license')=='Apache-2.0' and rt.get('model_license_verified') is True and lic.get('model_license_verified') is True,
      'prod_runtime_license_safe':rt.get('prod_runtime_license_safe') is True and lic.get('prod_runtime_license_safe') is True,
      'zero_added_cost':dd.get('additional_cost_eur')==0,
      'no_publish':dd.get('publish_authorized') is False,
      'no_local_prod_mutation':dd.get('prod_mutation_authorized') is False,
    }
    passed=all(checks.values())
    doc={
      'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM02_DIGITAL_DOUBLE_PROOF_TRIBUNAL_V1','benchmark_id':'BM-02','environment':'PREPROD',
      'status':'PASS_WITH_PHYSICAL_EVIDENCE' if passed else 'FAIL','benchmark_credit_eligible':passed,
      'checks':checks,'check_count':len(checks),'passed_check_count':sum(bool(x) for x in checks.values()),
      'evidence':{
        'source_manifest':{'sha256':sha(a.source_manifest),'source_ref':sm.get('source_ref'),'dataset_license':sm.get('dataset_license')},
        'source_admission':{'sha256':sha(a.admission),'status':adm.get('status')},
        'digital_double_manifest':{'sha256':sha(a.digital_double),'status':dd.get('status'),'outputs':outputs},
        'license_evidence':{'sha256':sha(a.license_evidence),**lic}
      },
      'capabilities_proven':['REAL_PERSON_MEDIA_INGEST','DENSE_3D_FACE_GEOMETRY','FACIAL_MOTION_TRACK','GEOMETRY_ONLY_DIGITAL_DOUBLE','PROD_SAFE_RUNTIME_LICENSE_CHAIN'],
      'human_required':False,'additional_cost_eur':0,'prod_mutation_authorized':False,'publish_authorized':False,'spend_authorized':False,
      'note':'RAVDESS is used only as CC BY-NC-SA internal benchmark material. The production digital-double runtime is the independently Apache-2.0 MediaPipe FaceMesh route.'
    }
    Path(a.out).write_text(json.dumps(doc,indent=2),encoding='utf-8'); print(json.dumps(doc,indent=2))
    if not passed: raise SystemExit(14)

if __name__=='__main__': main()
