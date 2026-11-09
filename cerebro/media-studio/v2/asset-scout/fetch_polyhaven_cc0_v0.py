#!/usr/bin/env python3
"""UMS-001 LAB: selectively fetch ONE CC0 Poly Haven media asset, no browser, no payments.
Requires a previously discovered candidate manifest. Default dry run only.
"""
import argparse, hashlib, json, os, re, sys
from pathlib import Path
from urllib.parse import urlsplit, quote
from urllib.request import Request,urlopen
UA="CEREBRO-UMS001-CC0-Fetch/0.1 (internal production)"
MAX=25_000_000

def valid_url(url):
    try:
        p=urlsplit(url)
        return p.scheme=="https" and p.hostname=="dl.polyhaven.org" and p.port in (None,443) and p.username is None and p.password is None and p.path.startswith("/file/ph-assets/") and p.path.lower().endswith((".jpg",".jpeg",".png",".hdr",".exr"))
    except Exception:return False

def select(file_map):
    possible=[]
    def walk(v):
        if isinstance(v,dict):
            if isinstance(v.get("url"),str) and isinstance(v.get("size"),int) and isinstance(v.get("md5"),str):
                if valid_url(v["url"]) and 1_000<=v["size"]<=MAX and re.fullmatch("[0-9a-f]{32}",v["md5"]):
                    typ=0 if v["url"].lower().endswith((".jpg",".jpeg",".png")) else 1
                    possible.append(((typ,v["size"]),{"url":v["url"],"size":v["size"],"md5":v["md5"]}))
            for x in v.values():walk(x)
        elif isinstance(v,list):
            for x in v:walk(x)
    walk(file_map)
    return sorted(possible,key=lambda e:e[0])[0][1] if possible else None

def metadata(asset_id):
    req=Request("https://api.polyhaven.com/files/"+quote(asset_id),headers={"User-Agent":UA,"Accept":"application/json"})
    with urlopen(req,timeout=20) as r:
        if r.status!=200:raise RuntimeError("Metadata API failed")
        raw=r.read(300001)
        if len(raw)>300000:raise RuntimeError("Metadata exceeds limit")
        return json.loads(raw)

def download(asset_id, chosen, dest):
    if not valid_url(chosen["url"]):raise ValueError("Unapproved URL")
    dest.mkdir(parents=True,exist_ok=True)
    name=re.sub("[^A-Za-z0-9_.-]","_",asset_id+"_"+chosen["url"].rsplit("/",1)[-1].split("?")[0])
    dst=dest/name;tmp=dest/(name+".part")
    md5=hashlib.md5();sha=hashlib.sha256();n=0
    req=Request(chosen["url"],headers={"User-Agent":UA})
    try:
        with urlopen(req,timeout=40) as r, open(tmp,"wb") as fp:
            if not valid_url(r.geturl()) or r.status!=200:raise RuntimeError("Redirect/error")
            if r.headers.get("content-type","").startswith("text/html"):raise RuntimeError("HTML not media")
            while True:
                buf=r.read(65536)
                if not buf:break
                n+=len(buf)
                if n>MAX or n>chosen["size"]+2048:raise RuntimeError("Size exceeded")
                md5.update(buf);sha.update(buf);fp.write(buf)
        if n!=chosen["size"] or md5.hexdigest()!=chosen["md5"]:raise RuntimeError("Checksum mismatch")
        os.replace(tmp,dst)
    finally:
        if tmp.exists():tmp.unlink()
    receipt={"company_id":"fenix","engine_id":"UMS-001","environment":"LAB","asset_id":asset_id,
      "source":"Poly Haven","source_url":"https://polyhaven.com/a/"+asset_id,
      "license":"CC0-1.0","source_license_url":"https://polyhaven.com/license",
      "api_credit":"Powered by Poly Haven","sha256":sha.hexdigest(),"size_bytes":n,
      "state":"HASH_VERIFIED_IN_LAB","rights_review":"PENDING","production_approved":False}
    (dest/(name+".manifest.json")).write_text(json.dumps(receipt,indent=2))
    return receipt

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--candidate-manifest",type=Path,required=True)
    p.add_argument("--asset-id",required=True)
    p.add_argument("--dest",type=Path,default=Path("assets_cc0_lab"))
    p.add_argument("--live",action="store_true")
    p.add_argument("--metadata-fixture",type=Path)
    x=p.parse_args()
    if not re.fullmatch("[A-Za-z0-9_-]{1,120}",x.asset_id):return 2
    m=json.loads(x.candidate_manifest.read_text())
    if m.get("environment")!="LAB" or m.get("source") not in ("Poly Haven public API","Poly Haven") or not any(y.get("asset_id")==x.asset_id and y.get("status")=="DISCOVERED_NOT_DOWNLOADED" for y in m.get("candidates",[])):
        print("NO_GO: unverified candidate manifest",file=sys.stderr);return 2
    if not x.live and not x.metadata_fixture:
        print("NO_GO: no live or fixture flag",file=sys.stderr);return 2
    files=json.loads(x.metadata_fixture.read_text()) if x.metadata_fixture else metadata(x.asset_id)
    chosen=select(files)
    if chosen is None:
        print("NO_GO: no allowlisted file below 25MB",file=sys.stderr);return 2
    if not x.live:
        print(json.dumps({"decision":"DRY_RUN","selection":chosen,"downloaded":False}));return 0
    print(json.dumps(download(x.asset_id,chosen,x.dest),indent=2));return 0
if __name__=="__main__":sys.exit(main())
