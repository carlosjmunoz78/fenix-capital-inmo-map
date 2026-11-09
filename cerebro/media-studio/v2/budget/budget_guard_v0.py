#!/usr/bin/env python3
"""UMS-001 prepaid dollar budget guard, LAB ONLY, no Replicate API calls.
Separates virtual image reserve from video/outro budget. Fails closed.
"""
from decimal import Decimal
from pathlib import Path
import argparse, json, sys

def usd(value):
    x=Decimal(str(value))
    if not x.is_finite() or x<0:raise ValueError("Invalid amount")
    return x

def assess(policy, category, price, wallet, spent_images, spent_videos, pending=0):
    if policy.get("environment")!="LAB":
        return {"decision":"NO_GO","reason":"Not LAB"}
    if category not in ("images","videos_outros"):
        return {"decision":"NO_GO","reason":"Invalid category"}
    if wallet is None:return {"decision":"NO_GO","reason":"Fresh wallet balance mandatory"}
    cur=policy["current_period"]
    reserve=usd(cur["images_reserve_usd_equivalent"])
    video_budget=usd(cur["videos_outros_pool_usd_equivalent"])
    image_spent=usd(spent_images);video_spent=usd(spent_videos)
    wallet=usd(wallet);pending=usd(pending)
    buffered=usd(price)*(1+usd(policy["policy"]["preflight_buffer_fraction"]))
    if wallet+Decimal(".01")<usd(cur["opening_current_balance_usd"])-image_spent-video_spent-pending:
        return {"decision":"NO_GO","reason":"Unreconciled external spend or wallet discrepancy"}
    available=(reserve-image_spent) if category=="images" else (video_budget-video_spent)
    if buffered>available:
        return {"decision":"NO_GO","reason":"Category budget insufficient including overhead buffer"}
    if category=="videos_outros" and wallet-pending-buffered < max(usd(0),reserve-image_spent):
        return {"decision":"NO_GO","reason":"Image reserve would be invaded"}
    if wallet-pending-buffered<0:
        return {"decision":"NO_GO","reason":"Wallet insufficient"}
    return {"decision":"BUDGET_ELIGIBLE_ONLY","buffered_estimate_usd":str(buffered.quantize(Decimal(".01"))),
      "notice":"Not authorization to spend; pricing, contract, rights and publication gates still apply"}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--policy",type=Path,required=True)
    p.add_argument("--category",choices=["images","videos_outros"],required=True)
    p.add_argument("--price-usd",required=True)
    p.add_argument("--live-wallet-usd")
    p.add_argument("--spent-images-usd",default="0")
    p.add_argument("--spent-videos-usd",default="0")
    p.add_argument("--pending-usd",default="0")
    x=p.parse_args()
    r=assess(json.loads(x.policy.read_text()),x.category,x.price_usd,
      x.live_wallet_usd,x.spent_images_usd,x.spent_videos_usd,x.pending_usd)
    print(json.dumps(r,ensure_ascii=False,indent=2))
    return 0 if r["decision"]=="BUDGET_ELIGIBLE_ONLY" else 2
if __name__=="__main__":sys.exit(main())
