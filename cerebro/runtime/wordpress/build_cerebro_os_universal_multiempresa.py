#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, pathlib, zipfile

ROOT=pathlib.Path(__file__).resolve().parents[2]
SOURCE=ROOT/"wordpress"/"plugins"/"cerebro-os-universal-multiempresa-0.2.0.php"
VERSION="0.2.0"
MEMBER="cerebro-os-universal-multiempresa/cerebro-os-universal-multiempresa.php"

def sha256(path:pathlib.Path)->str:
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(65536),b""): h.update(chunk)
    return h.hexdigest()

def build(out_dir:pathlib.Path)->dict:
    out_dir.mkdir(parents=True,exist_ok=True)
    zip_path=out_dir/f"CEREBRO_OS_UNIVERSAL_MULTIEMPRESA_{VERSION}.zip"
    data=SOURCE.read_bytes()
    info=zipfile.ZipInfo(MEMBER,date_time=(2026,9,29,0,0,0))
    info.compress_type=zipfile.ZIP_DEFLATED
    info.external_attr=0o644<<16
    with zipfile.ZipFile(zip_path,"w") as z:
        z.writestr(info,data)
    manifest={
        "artifact":zip_path.name,
        "engine_id":"PLUGIN-UNIVERSAL-001",
        "company_id":None,
        "environment":"PREPROD",
        "version":VERSION,
        "multiempresa":True,
        "provider_agnostic":True,
        "fail_closed":True,
        "prod_default_deny":True,
        "additional_cost_eur":0,
        "source":"runtime/wordpress/plugins/cerebro-os-universal-multiempresa-0.2.0.php",
        "source_sha256":hashlib.sha256(data).hexdigest(),
        "zip_sha256":sha256(zip_path),
        "zip_member":MEMBER,
        "prod_deploy_authorized":False
    }
    manifest_path=out_dir/f"CEREBRO_OS_UNIVERSAL_MULTIEMPRESA_{VERSION}.build.json"
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    return manifest

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--out",default="dist/wordpress")
    args=p.parse_args()
    print(json.dumps(build(pathlib.Path(args.out)),ensure_ascii=False))
if __name__=="__main__": main()
