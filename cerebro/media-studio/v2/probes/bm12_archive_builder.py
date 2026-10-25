#!/usr/bin/env python3
from __future__ import annotations
import argparse,hashlib,json,shutil
from pathlib import Path

def sha(p:Path): return hashlib.sha256(p.read_bytes()).hexdigest()
def copy(src:Path,dst:Path): dst.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(src,dst); return dst

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--out',required=True); ap.add_argument('--audio',required=True); ap.add_argument('--video',required=True); ap.add_argument('--spatial',required=True); ap.add_argument('--evidence-dir',required=True); ap.add_argument('--bm07-proof',required=True); ap.add_argument('--main-sha',required=True); ap.add_argument('--branch-sha',required=True); a=ap.parse_args()
    out=Path(a.out).resolve(); out.mkdir(parents=True,exist_ok=True)
    audio=copy(Path(a.audio),out/'deliverables'/'bm04-master.flac'); video=copy(Path(a.video),out/'deliverables'/'bm05-final-scene.mp4'); spatial=copy(Path(a.spatial),out/'deliverables'/'bm07-spatial-asset.glb')
    evidence_src=Path(a.evidence_dir); prov_dir=out/'provenance'; prov_dir.mkdir(exist_ok=True)
    provenance=[]
    for p in sorted(evidence_src.glob('bm*-pass-with-evidence-*.json')):
        q=copy(p,prov_dir/p.name); d=json.loads(q.read_text()); provenance.append({'benchmark_id':d.get('benchmark_id'),'path':str(q.relative_to(out)),'sha256':sha(q),'bytes':q.stat().st_size,'status':d.get('status')})
    bm04=json.loads((evidence_src/'bm04-pass-with-evidence-2026-10-25.json').read_text()); bm05=json.loads((evidence_src/'bm05-pass-with-evidence-2026-10-25.json').read_text()); bm07p=json.loads(Path(a.bm07_proof).read_text())
    rights={
      'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM12_RIGHTS_LEDGER_V1','status':'RIGHTS_LEDGER_COMPLETE','all_rights_checks_pass':True,
      'entries':[
        {'deliverable':'bm04-master.flac','type':'AUDIO_MASTER','real_person_media':False,'origin':bm04['composition']['copyright_source'],'external_composition_used':bm04['composition']['external_composition_used'],'runtime_licenses':{'FluidR3':{'verified':bm04['runtime_and_licenses']['fluidr3_mit_verified'],'license':'MIT'},'FluidSynth':{'verified':bm04['runtime_and_licenses']['fluidsynth_lgpl_verified'],'license':'LGPL'}},'source_evidence':'bm04-pass-with-evidence-2026-10-25.json'},
        {'deliverable':'bm05-final-scene.mp4','type':'VIDEO_MASTER','real_person_media':False,'dialogue_engine':bm05['runtime']['dialogue_engine'],'dialogue_real_person_voice':bm05['runtime']['dialogue_real_person_voice'],'foley_origin':bm05['audio']['foley_origin'],'sfx_origin':bm05['audio']['sfx_origin'],'dependency_chain':bm05['dependency_chain'],'source_evidence':'bm05-pass-with-evidence-2026-10-25.json'},
        {'deliverable':'bm07-spatial-asset.glb','type':'SPATIAL_3D','real_person_media':False,'origin':'DETERMINISTIC_GENERATED_VOLUME_AND_MARCHING_CUBES','internal_original_rights_proven':bm07p.get('checks',{}).get('internal_original_rights') is True,'external_assets':0,'source_evidence':'bm07-pass-with-evidence-2026-10-25.json'}
      ]
    }
    rights['all_rights_checks_pass']=bool(rights['entries'][0]['external_composition_used'] is False and rights['entries'][0]['runtime_licenses']['FluidR3']['verified'] and rights['entries'][0]['runtime_licenses']['FluidSynth']['verified'] and rights['entries'][1]['dialogue_real_person_voice'] is False and rights['entries'][2]['internal_original_rights_proven'])
    rights_path=out/'rights-ledger.json'; rights_path.write_text(json.dumps(rights,indent=2),encoding='utf-8')
    deliverables=[
      {'type':'AUDIO_MASTER','path':str(audio.relative_to(out)),'sha256':sha(audio),'bytes':audio.stat().st_size,'source_benchmark':'BM-04'},
      {'type':'VIDEO_MASTER','path':str(video.relative_to(out)),'sha256':sha(video),'bytes':video.stat().st_size,'source_benchmark':'BM-05'},
      {'type':'SPATIAL_3D','path':str(spatial.relative_to(out)),'sha256':sha(spatial),'bytes':spatial.stat().st_size,'source_benchmark':'BM-07'},
    ]
    # Manifest hashes all package payload files except itself to avoid recursion.
    payload=[]
    for p in sorted(x for x in out.rglob('*') if x.is_file() and x.name!='manifest.json'):
        payload.append({'path':str(p.relative_to(out)),'sha256':sha(p),'bytes':p.stat().st_size})
    manifest={
      'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM12_ARCHIVE_MANIFEST_V1','benchmark_id':'BM-12','environment':'PREPROD','status':'ARCHIVE_MANIFEST_BUILT','main_baseline_sha':a.main_sha,'branch_head_sha':a.branch_sha,
      'deliverables':deliverables,'provenance':provenance,'files':payload,
      'rights_ledger':{'path':'rights-ledger.json','sha256':sha(rights_path),'all_rights_checks_pass':rights['all_rights_checks_pass']},
      'authority':{'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'additional_cost_eur':0}
    }
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    print(json.dumps({'status':'BUILT','files':len(payload),'provenance':len(provenance),'deliverables':deliverables,'rights_green':rights['all_rights_checks_pass']},indent=2))
    if not rights['all_rights_checks_pass']: raise SystemExit(4)
if __name__=='__main__': main()
