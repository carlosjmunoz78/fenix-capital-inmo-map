#!/usr/bin/env python3
"""CEREBRO UMS-001 Poly Haven CC0 LAB. Safe opt-in batch, not PROD."""
# LAB run trigger: 2026-11-10; no changes to download limits.
import argparse, hashlib, json, os, re, sys, tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

API="https://api.polyhaven.com"
UA="CEREBRO-UMS001-PolyHavenLAB/0.2 (+https://fenixcapital.es)"
MAX_FILE=15*1024*1024
MAX_BATCH=20*1024*1024
MAX_ITEMS=2

def safe_url(url, api=False):
    try:
        p=urlsplit(url)
        if p.scheme!="https" or p.port not in (None,443) or p.username or p.password:return False
        if api:return p.hostname=="api.polyhaven.com" and p.path.startswith(("/assets","/files/"))
        return p.hostname=="dl.polyhaven.org" and p.path.startswith("/file/ph-assets/") and p.path.lower().endswith((".jpg",".jpeg",".png",".hdr",".exr"))
    except Exception:return False

def api_json(url, cap=10000000):
    if not safe_url(url,True):raise ValueError("API_URL_DENIED")
    with urlopen(Request(url,headers={"User-Agent":UA,"Accept":"application/json"}),timeout=20) as r:
        if r.status!=200 or not safe_url(r.geturl(),True):raise RuntimeError("API_DENIED")
        raw=r.read(cap+1)
    if len(raw)>cap:raise RuntimeError("API_CAP")
    return json.loads(raw)

def shortlist(catalog,query,known):
    terms=[s.lower() for s in re.findall("[a-zA-Z0-9]+",query) if len(s)>2]
    scored=[]
    for ident,info in catalog.items():
        if ident in known or not re.fullmatch("[A-Za-z0-9_-]{1,120}",ident) or not isinstance(info,dict):continue
        name=str(info.get("name",""))
        blob=" ".join([name,str(info.get("description","")),str(info.get("category",""))," ".join(map(str,info.get("tags",[])))]).lower()
        score=sum(3 if s in name.lower() else 1 for s in terms if s in blob)
        if score>0:scored.append((-score,ident,name))
    return [{"id":i,"name":n} for _,i,n in sorted(scored)[:12]]

def choose(tree,limit=MAX_FILE):
    found=[]
    def walk(x):
        if isinstance(x,dict):
            if {"url","size","md5"}<=x.keys():
                u,s,h=x["url"],x["size"],x["md5"]
                if isinstance(u,str) and safe_url(u) and type(s) is int and 1000<=s<=limit and isinstance(h,str) and re.fullmatch("[0-9a-fA-F]{32}",h):
                    found.append({"url":u,"size":s,"md5":h.lower()})
            for v in x.values():walk(v)
        elif isinstance(x,list):
            for v in x:walk(v)
    walk(tree)
    return min(found,key=lambda x:(x["size"],x["url"])) if found else None

def download(ident,item,dest):
    if not re.fullmatch("[A-Za-z0-9_-]{1,120}",ident) or not safe_url(item["url"]):raise ValueError("FILE_URL_DENIED")
    name=ident+"__"+item["url"].split("/")[-1]
    if not re.fullmatch("[A-Za-z0-9_.-]{1,220}",name):raise ValueError("FILENAME_DENIED")
    dest.mkdir(parents=True,exist_ok=True)
    target=dest/name
    if target.exists():raise FileExistsError("OVERWRITE_DENIED")
    fd,temp=tempfile.mkstemp(prefix=".ph_",suffix=".part",dir=dest)
    md5=hashlib.md5();sha=hashlib.sha256();length=0
    try:
        with os.fdopen(fd,"wb") as sink:
            with urlopen(Request(item["url"],headers={"User-Agent":UA}),timeout=45) as r:
                if r.status!=200 or not safe_url(r.geturl()):raise RuntimeError("REDIRECT_DENIED")
                if r.headers.get("Content-Type","").lower().startswith("text/"):raise RuntimeError("NOT_MEDIA")
                while True:
                    block=r.read(65536)
                    if not block:break
                    length+=len(block)
                    if length>item["size"] or length>MAX_FILE:raise RuntimeError("SIZE_CAP")
                    md5.update(block);sha.update(block);sink.write(block)
        if length!=item["size"] or md5.hexdigest()!=item["md5"]:raise RuntimeError("HASH_MISMATCH")
        os.replace(temp,target)
    finally:
        if os.path.exists(temp):os.unlink(temp)
    return {"name":name,"bytes":length,"sha256":sha.hexdigest(),"md5_verified":True,"url":item["url"]}

def run(query,kind,dest,statefile,live=False,catalog=None,files_lookup=None):
    if kind not in ("textures","hdris","models"):raise ValueError("ASSET_TYPE_DENIED")
    state=json.loads(statefile.read_text()) if statefile.exists() else {"assets":{}}
    if not isinstance(state.get("assets"),dict):raise ValueError("STATE_INVALID")
    catalog=catalog if catalog is not None else api_json(API+"/assets?t="+kind)
    choices=shortlist(catalog,query,state["assets"])
    report={"company_id":"fenix","engine_id":"UMS-001","environment":"LAB","version":"polyhaven-auto-v0",
      "date":datetime.now(timezone.utc).isoformat(),"provider":"Poly Haven","api_credit":"Powered by Poly Haven",
      "license":"CC0-1.0","license_url":"https://polyhaven.com/license","mode":"LIVE" if live else "DRY_RUN",
      "candidates":choices,"downloads":[],"bytes":0,"errors":[],"production_approved":False,"extra_cost_eur":0}
    for choice in choices:
        if len(report["downloads"])>=MAX_ITEMS:break
        ident=choice["id"]
        try:
            tree=files_lookup(ident) if files_lookup is not None else api_json(API+"/files/"+ident,400000)
            selected=choose(tree,min(MAX_FILE,MAX_BATCH-report["bytes"]))
            if not selected:continue
            if not live:
                report["downloads"].append({"id":ident,"status":"DRY_RUN","planned_bytes":selected["size"]})
                break
            saved=download(ident,selected,dest)
            receipt={"id":ident,"name":choice["name"],"file":saved["name"],"bytes":saved["bytes"],"sha256":saved["sha256"],
              "source_url":saved["url"],"md5_verified":True,"license":"CC0-1.0","api_credit":"Powered by Poly Haven",
              "asset_page":"https://polyhaven.com/a/"+ident,"rights_review":"PENDING","production_approved":False}
            state["assets"][ident]=receipt
            statefile.parent.mkdir(parents=True,exist_ok=True)
            statefile.write_text(json.dumps(state,indent=2))
            report["downloads"].append(receipt);report["bytes"]+=receipt["bytes"]
        except Exception as exc:report["errors"].append({"asset":ident,"error":type(exc).__name__})
    return report

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--query",default="architecture urban courtyard brick floor")
    p.add_argument("--asset-type",default="textures",choices=["textures","hdris","models"])
    p.add_argument("--output",type=Path,default=Path("artifacts/polyhaven_cc0_lab"))
    p.add_argument("--state",type=Path,default=Path("artifacts/polyhaven_cc0_lab/_state.json"))
    p.add_argument("--live",action="store_true")
    p.add_argument("--catalog-fixture",type=Path)
    p.add_argument("--files-fixture",type=Path)
    a=p.parse_args()
    if not a.live and not(a.catalog_fixture and a.files_fixture):
        print("NO_GO: --live or both offline fixtures required",file=sys.stderr);return 2
    catalog=json.loads(a.catalog_fixture.read_text()) if a.catalog_fixture else None
    fm=json.loads(a.files_fixture.read_text()) if a.files_fixture else None
    result=run(a.query,a.asset_type,a.output,a.state,a.live,catalog,(lambda i:fm) if fm else None)
    a.output.mkdir(parents=True,exist_ok=True)
    (a.output/"report.json").write_text(json.dumps(result,indent=2,ensure_ascii=False))
    print(json.dumps({"mode":result["mode"],"downloads":len(result["downloads"]),"bytes":result["bytes"],"errors":result["errors"]}))
    return 1 if result["errors"] else 0

if __name__=="__main__":sys.exit(main())
