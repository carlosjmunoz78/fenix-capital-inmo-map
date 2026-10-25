#!/usr/bin/env python3
"""Fail-closed BM-08 XR spatial output package proof.

This proves a device-independent XR deliverable physically loads/renders in Chromium.
It never claims an immersive hardware session when CI has no XR device.
"""
from __future__ import annotations
import argparse,hashlib,json,re
from pathlib import Path

EXPECTED_BM07_GLB='cfbc386d1150d5d08babd176cc858156df9ced716c9e9fb5cd2921fc3fbad9d8'

def sha(p:Path): return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--manifest',required=True); ap.add_argument('--html',required=True); ap.add_argument('--bundle',required=True)
    ap.add_argument('--asset',required=True); ap.add_argument('--dom',required=True); ap.add_argument('--screenshot',required=True); ap.add_argument('--out',required=True)
    a=ap.parse_args(); manifest=Path(a.manifest); html=Path(a.html); bundle=Path(a.bundle); asset=Path(a.asset); dom=Path(a.dom); screenshot=Path(a.screenshot); out=Path(a.out)
    m=json.loads(manifest.read_text()); d=dom.read_text(errors='replace'); js=bundle.read_text(errors='replace')
    checks={
      'benchmark_contract':m.get('benchmark_id')=='BM-08' and m.get('output_type')=='XR_SPATIAL_WEB_PACKAGE',
      'preprod_only':m.get('environment')=='PREPROD',
      'source_bm07_proven':m.get('source',{}).get('benchmark_id')=='BM-07' and m.get('source',{}).get('status')=='PASS_WITH_EVIDENCE',
      'source_glb_hash':asset.is_file() and sha(asset)==EXPECTED_BM07_GLB and m.get('asset',{}).get('sha256')==EXPECTED_BM07_GLB,
      'metric_units':m.get('spatial',{}).get('linear_unit')=='meter',
      'coordinate_system':m.get('spatial',{}).get('coordinate_system')=='RIGHT_HANDED_Y_UP',
      'placement_anchor':m.get('placement',{}).get('anchor')=='LOCAL_FLOOR_OR_HIT_TEST' and len(m.get('placement',{}).get('translation_m',[]))==3,
      'ar_route_declared':"immersive-ar" in js,
      'vr_route_declared':"immersive-vr" in js,
      'local_floor_declared':"local-floor" in js,
      'no_remote_runtime_dependency':not re.search(r'https?://',html.read_text()) and not re.search(r'<script[^>]+src=["\']https?://',d,re.I),
      'browser_asset_loaded':re.search(r'data-asset-loaded=["\']true["\']',d,re.I) is not None,
      'browser_meter_semantics':re.search(r'data-unit=["\']meter["\']',d,re.I) is not None,
      'browser_source_hash_bound':EXPECTED_BM07_GLB in d,
      'render_screenshot':screenshot.is_file() and screenshot.stat().st_size>=5000,
      'bundle_physical':bundle.is_file() and bundle.stat().st_size>=100000,
      'asset_physical':asset.is_file() and asset.stat().st_size>=80000,
      'hardware_claim_fail_closed':m.get('xr_hardware_session_proven') is False,
      'zero_cost':m.get('authority',{}).get('additional_cost_eur')==0,
      'authority_closed':all(m.get('authority',{}).get(k) is False for k in ('prod_authorized','publish_authorized','spend_authorized')),
    }
    passed=all(checks.values())
    report={
      'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM08_XR_SPATIAL_OUTPUT_PROOF_V1','benchmark_id':'BM-08','proof_type':'XR_SPATIAL_OUTPUT_PACKAGE_PROOF','environment':'PREPROD',
      'status':'PASS_WITH_EVIDENCE' if passed else 'FAIL_CLOSED','benchmark_credit':passed,'checks':checks,
      'evidence':{'manifest_sha256':sha(manifest),'html_sha256':sha(html),'bundle_sha256':sha(bundle),'asset_sha256':sha(asset) if asset.is_file() else None,'dom_sha256':sha(dom),'screenshot_sha256':sha(screenshot) if screenshot.is_file() else None,'screenshot_bytes':screenshot.stat().st_size if screenshot.is_file() else 0},
      'xr':{'immersive_ar_route':True,'immersive_vr_route':True,'reference_space':'local-floor','physical_browser_render_proven':checks['browser_asset_loaded'],'xr_hardware_session_proven':False},
      'additional_cost_eur':0,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'benchmark_registry_mutation_authorized':passed,'universal_media_studio_ready_authorized':False
    }
    out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(report,indent=2),encoding='utf-8'); print(json.dumps(report,indent=2)); raise SystemExit(0 if passed else 8)
if __name__=='__main__': main()
