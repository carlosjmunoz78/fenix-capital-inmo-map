#!/usr/bin/env python3
"""UMS-001 · API-first zero-cost scout for Poly Haven CC0, LAB.
Only catalogues asset metadata. No downloads, no billable calls, no writes to production.
"""
import argparse, json, re, sys, time
from pathlib import Path
from urllib.request import Request, urlopen

API = "https://api.polyhaven.com/assets"
UA = "CEREBRO-UMS001-AssetScout/0.1 (research, internal production)"
LICENSE = "https://polyhaven.com/license"
API_TERMS = "https://polyhaven.com/our-api"

def rank(assets, query, limit=12):
    tokens=[s.lower() for s in query.split() if len(s)>2]
    out=[]
    for ident,info in assets.items():
        if not isinstance(info,dict) or not re.fullmatch(r"[A-Za-z0-9_-]{1,120}",ident):
            continue
        name=str(info.get("name",""))
        description=" ".join([name,str(info.get("description","")),str(info.get("category",""))," ".join(map(str,info.get("tags",[]))) ]).lower()
        score=sum((3 if t in name.lower() else 1) for t in tokens if t in description)
        if score<=0:continue
        out.append({"asset_id":ident,"name":name,"asset_url":"https://polyhaven.com/a/"+ident,
           "asset_type":{0:"hdri",1:"texture",2:"model"}.get(info.get("type"),"unknown"),
           "relevance_score":score,"source":"Poly Haven","license":"CC0-1.0","license_url":LICENSE,
           "api_attribution_required":"Powered by Poly Haven",
           "status":"DISCOVERED_NOT_DOWNLOADED",
           "commercial_licence_metadata":"CC0; third-party rights still require review",
           "third_party_rights_qa":"PENDING",
           "approved_for_model_training":False})
    return sorted(out,key=lambda x:(-x["relevance_score"],x["asset_id"]))[:limit]

def discover(cache):
    if cache.exists() and time.time()-cache.stat().st_mtime<24*3600:
        return json.loads(cache.read_text())
    req=Request(API,headers={"User-Agent":UA,"Accept":"application/json"})
    with urlopen(req,timeout=20) as r:
        if r.status!=200:raise RuntimeError("Poly Haven API HTTP error")
        raw=r.read(12_000_001)
        if len(raw)>12_000_000:raise RuntimeError("Catalog exceeds 12 MB maximum")
    obj=json.loads(raw)
    if not isinstance(obj,dict):raise RuntimeError("Unexpected API schema")
    cache.parent.mkdir(parents=True,exist_ok=True)
    cache.write_text(json.dumps(obj,ensure_ascii=False))
    return obj

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--query",default="sunset city street natural outdoor sky stone courtyard house")
    p.add_argument("--limit",type=int,default=12)
    p.add_argument("--live",action="store_true",help="Use provider API: metadata only")
    p.add_argument("--fixture",type=Path)
    p.add_argument("--cache",type=Path,default=Path(".cache/polyhaven-index.json"))
    p.add_argument("--output",type=Path,default=Path("ums001-polyhaven-candidates.json"))
    x=p.parse_args()
    if not 1<=x.limit<=25:raise ValueError("limit must be 1..25")
    if x.fixture:catalog=json.loads(x.fixture.read_text())
    elif x.live:catalog=discover(x.cache)
    else:
        print("NO_GO: must provide --live or --fixture",file=sys.stderr)
        return 2
    rec={"company_id":"fenix","engine_id":"UMS-001","environment":"LAB",
      "version":"asset-scout-v0","source_url":API,"api_terms":API_TERMS,
      "source_license":LICENSE,"cost_eur":0,"downloads":0,"billable_calls":0,
      "autonomous_production_enabled":False,"candidates":rank(catalog,x.query,x.limit)}
    x.output.parent.mkdir(parents=True,exist_ok=True)
    x.output.write_text(json.dumps(rec,ensure_ascii=False,indent=2))
    print(json.dumps({"status":"METADATA_ONLY","candidates":len(rec["candidates"]),
      "downloads":0,"billable_calls":0,"output":str(x.output)}))
    return 0
if __name__=="__main__":sys.exit(main())
