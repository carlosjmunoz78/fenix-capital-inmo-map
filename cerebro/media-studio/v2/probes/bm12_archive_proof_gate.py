#!/usr/bin/env python3
"""Fail-closed BM-12 backup/rebuild/rollback/provenance/rights proof."""
from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path

REQUIRED_TYPES={'AUDIO_MASTER','VIDEO_MASTER','SPATIAL_3D'}

def sha(p:Path): return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--package',required=True); ap.add_argument('--archive',required=True); ap.add_argument('--archive-sha',required=True); ap.add_argument('--rebuild',required=True); ap.add_argument('--rollback',required=True); ap.add_argument('--out',required=True)
    a=ap.parse_args(); package=Path(a.package); archive=Path(a.archive); archive_sha=Path(a.archive_sha); rebuild=Path(a.rebuild); rollback=Path(a.rollback); out=Path(a.out)
    manifest=json.loads((package/'manifest.json').read_text()); rights=json.loads((package/'rights-ledger.json').read_text()); reb=json.loads(rebuild.read_text()); rb=json.loads(rollback.read_text())
    deliverables=manifest.get('deliverables',[]); provenance=manifest.get('provenance',[])
    file_checks=[]
    for f in manifest.get('files',[]):
        p=package/f['path']; file_checks.append(p.is_file() and p.stat().st_size==f['bytes'] and sha(p)==f['sha256'])
    declared_archive_sha=archive_sha.read_text().strip().split()[0] if archive_sha.is_file() else ''
    checks={
      'benchmark_contract':manifest.get('benchmark_id')=='BM-12' and manifest.get('environment')=='PREPROD',
      'deterministic_archive_present':archive.is_file() and archive.stat().st_size>1_000_000 and declared_archive_sha==sha(archive),
      'manifest_file_integrity':len(file_checks)>=6 and all(file_checks),
      'three_deliverable_classes':set(d.get('type') for d in deliverables)==REQUIRED_TYPES and len(deliverables)==3,
      'deliverable_hashes_in_manifest':all(d.get('sha256') and len(d['sha256'])==64 and d.get('bytes',0)>1000 for d in deliverables),
      'provenance_archive':len(provenance)>=6 and all(p.get('sha256') and len(p['sha256'])==64 for p in provenance),
      'rights_ledger':rights.get('status')=='RIGHTS_LEDGER_COMPLETE' and rights.get('all_rights_checks_pass') is True and len(rights.get('entries',[]))==3,
      'no_real_person_rights_dependency':all(e.get('real_person_media') is False for e in rights.get('entries',[])),
      'rebuild_pass':reb.get('status')=='PASS_WITH_EVIDENCE' and reb.get('all_manifest_hashes_match') is True and reb.get('deliverables_restored')==3,
      'rollback_pass':rb.get('status')=='PASS_WITH_EVIDENCE' and rb.get('baseline_tree_digest')==rb.get('restored_tree_digest') and rb.get('mutation_tree_digest')!=rb.get('baseline_tree_digest'),
      'rollback_sandbox_only':rb.get('sandbox_only') is True and rb.get('repo_mutated') is False,
      'main_baseline_bound':isinstance(manifest.get('main_baseline_sha'),str) and len(manifest['main_baseline_sha'])==40,
      'zero_cost':manifest.get('authority',{}).get('additional_cost_eur')==0,
      'authority_closed':all(manifest.get('authority',{}).get(k) is False for k in ('prod_authorized','publish_authorized','spend_authorized')),
    }
    passed=all(checks.values())
    report={
      'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM12_REBUILD_ROLLBACK_ARCHIVE_PROOF_V1','benchmark_id':'BM-12','proof_type':'REBUILD_ROLLBACK_PROVENANCE_RIGHTS_ARCHIVE_MULTI_DELIVERABLE_PROOF','environment':'PREPROD','status':'PASS_WITH_EVIDENCE' if passed else 'FAIL_CLOSED','benchmark_credit':passed,'checks':checks,
      'evidence':{'archive_sha256':sha(archive) if archive.is_file() else None,'archive_bytes':archive.stat().st_size if archive.is_file() else 0,'manifest_sha256':sha(package/'manifest.json'),'rights_ledger_sha256':sha(package/'rights-ledger.json'),'rebuild_report_sha256':sha(rebuild),'rollback_report_sha256':sha(rollback)},
      'deliverable_types':sorted(REQUIRED_TYPES),'provenance_entries':len(provenance),'main_baseline_sha':manifest.get('main_baseline_sha'),'branch_head_sha':manifest.get('branch_head_sha'),
      'additional_cost_eur':0,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'benchmark_registry_mutation_authorized':passed,'universal_media_studio_ready_authorized':False
    }
    out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(report,indent=2),encoding='utf-8'); print(json.dumps(report,indent=2)); raise SystemExit(0 if passed else 12)
if __name__=='__main__': main()
