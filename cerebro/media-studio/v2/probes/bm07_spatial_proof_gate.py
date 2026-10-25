#!/usr/bin/env python3
"""Fail-closed proof gate for BM-07 volumetric/spatial asset."""
from __future__ import annotations
import argparse,hashlib,json,os
from pathlib import Path
import numpy as np

def sha(p:Path): return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--source',required=True); ap.add_argument('--render',required=True); ap.add_argument('--root',required=True); ap.add_argument('--out',required=True); a=ap.parse_args()
    root=Path(a.root); src=json.loads(Path(a.source).read_text()); ren=json.loads(Path(a.render).read_text())
    vol=root/src['artifacts']['volume']['path']; ply=root/src['artifacts']['ply']['path']
    data=np.load(vol); field=data['density']; axis=data['axis']; iso=float(data['iso']); occ=field>=iso
    checks={
      'source_contract':src.get('state_type')=='CEREBRO_UMS_BM07_VOLUME_SOURCE_V1' and src.get('benchmark_id')=='BM-07',
      'render_contract':ren.get('state_type')=='CEREBRO_UMS_BM07_SPATIAL_RENDER_EVIDENCE_V1' and ren.get('status')=='SPATIAL_ASSET_PHYSICALLY_RENDERED',
      'internal_original':src.get('origin')=='INTERNAL_ORIGINAL_PROCEDURAL' and src.get('external_assets')==0,
      'volume_64_cubed':list(field.shape)==[64,64,64] and field.size==262144,
      'density_nontrivial':float(field.max())>0.9 and float(field.mean())>0.01 and int(occ.sum())>1000,
      'volume_has_xyz_extent':all(float(x)>1.0 for x in src.get('mesh',{}).get('extents',[])),
      'mesh_complexity':int(src.get('mesh',{}).get('vertices',0))>=1000 and int(src.get('mesh',{}).get('faces',0))>=1000,
      'physical_import_complexity':int(ren.get('mesh',{}).get('vertices',0))>=1000 and int(ren.get('mesh',{}).get('polygons',0))>=1000,
      'import_xyz_extent':all(float(x)>1.0 for x in ren.get('mesh',{}).get('extents',[])),
      'source_ply_identity':ren.get('source',{}).get('ply_sha256')==src.get('artifacts',{}).get('ply',{}).get('sha256'),
      'blender_52':str(ren.get('runtime',{}).get('blender_version','')).startswith('5.2.3'),
      'cpu_render':ren.get('runtime',{}).get('device')=='CPU',
      'three_views':len(ren.get('artifacts',{}).get('renders',{}))==3,
      'glb_export':ren.get('artifacts',{}).get('glb',{}).get('bytes',0)>1000,
      'usd_export':ren.get('usd_status')=='EXPORTED' and ren.get('artifacts',{}).get('usdc',{}).get('bytes',0)>1000,
      'zero_cost':src.get('additional_cost_eur')==0 and ren.get('additional_cost_eur')==0,
      'no_prod_authority':src.get('prod_authorized') is False and ren.get('prod_authorized') is False,
      'no_spend_authority':src.get('spend_authorized') is False and ren.get('spend_authorized') is False,
    }
    for meta in [src['artifacts']['volume'],src['artifacts']['ply']]:
        p=root/meta['path']; checks[f"hash_{Path(meta['path']).stem}"]=p.is_file() and p.stat().st_size==meta['bytes'] and sha(p)==meta['sha256']
    for key in ('glb','usdc','blend'):
        meta=ren['artifacts'].get(key,{}); p=root/meta.get('path','__missing__'); checks[f'hash_{key}']=p.is_file() and p.stat().st_size==meta.get('bytes') and sha(p)==meta.get('sha256')
    for key,meta in ren['artifacts']['renders'].items():
        p=root/meta['path']; checks[f'hash_render_{key}']=p.is_file() and p.stat().st_size==meta['bytes'] and sha(p)==meta['sha256']
    passed=all(checks.values())
    report={
      'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM07_SPATIAL_PROOF_V1','company_id':'GLOBAL','engine_id':'UMS-001','environment':'PREPROD','benchmark_id':'BM-07','proof_type':'VOLUMETRIC_OR_SPATIAL_ASSET_PROOF',
      'status':'PASS_WITH_EVIDENCE' if passed else 'FAIL_CLOSED','benchmark_credit':bool(passed),'checks':checks,
      'volume_metrics':{'shape':list(field.shape),'occupied_voxels':int(occ.sum()),'occupied_fraction':float(occ.mean()),'density_min':float(field.min()),'density_max':float(field.max()),'density_mean':float(field.mean()),'axis_min':float(axis.min()),'axis_max':float(axis.max()),'iso':iso},
      'source_sha256':sha(Path(a.source)),'render_evidence_sha256':sha(Path(a.render)),'github_run_id':os.environ.get('GITHUB_RUN_ID'),'github_sha':os.environ.get('GITHUB_SHA'),
      'readiness_mutation_authorized':False,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'additional_cost_eur':0
    }
    out=Path(a.out); out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(report,indent=2),encoding='utf-8'); print(json.dumps(report,indent=2)); raise SystemExit(0 if passed else 13)
if __name__=='__main__': main()
