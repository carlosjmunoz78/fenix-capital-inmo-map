#!/usr/bin/env python3
"""Fail-closed UMS PROD readiness tribunal.
Computes readiness only; it never mutates PROD, the registry, or a branch.
"""
from __future__ import annotations
import argparse,json,re
from pathlib import Path

EVIDENCE_RE=re.compile(r'^git:([0-9a-f]{40}):(.+)$')
CANONICAL_HUMAN_REASONS={'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'}

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--registry',required=True); ap.add_argument('--repo-root',default='.'); ap.add_argument('--out',required=True); ap.add_argument('--require-ready',action='store_true'); a=ap.parse_args()
    reg_path=Path(a.registry).resolve(); root=Path(a.repo_root).resolve(); reg=json.loads(reg_path.read_text())
    benches=reg.get('benchmarks') or []; checks=[]; blockers=[]; evidence=[]
    ids=[b.get('id') for b in benches]
    checks.append(('gate_name',reg.get('gate')=='UNIVERSAL_MEDIA_STUDIO_READY'))
    checks.append(('benchmark_count',len(benches)==12 and len(set(ids))==12))
    checks.append(('required_all',len(benches)==12 and all(b.get('required') is True for b in benches)))
    for b in benches:
        bid=b.get('id'); state=b.get('state'); ref=b.get('evidence_ref')
        if state!='PASS_WITH_EVIDENCE':
            blockers.append({'benchmark_id':bid,'state':state,'reason':'LEGAL_REQUIRED' if bid in {'BM-02','BM-03'} else 'HIGH_RISK'})
            continue
        m=EVIDENCE_RE.match(str(ref or ''))
        if not m:
            blockers.append({'benchmark_id':bid,'state':state,'reason':'HIGH_RISK','detail':'INVALID_OR_MISSING_IMMUTABLE_EVIDENCE_REF'}); continue
        commit,path=m.groups(); p=(root/path).resolve(); inside=str(p).startswith(str(root))
        exists=inside and p.is_file()
        if not exists:
            blockers.append({'benchmark_id':bid,'state':state,'reason':'HIGH_RISK','detail':'EVIDENCE_FILE_NOT_PRESENT_AT_BRANCH_HEAD'})
            continue
        try: doc=json.loads(p.read_text())
        except Exception:
            blockers.append({'benchmark_id':bid,'state':state,'reason':'HIGH_RISK','detail':'EVIDENCE_NOT_VALID_JSON'}); continue
        valid=doc.get('benchmark_id')==bid and doc.get('status')=='PASS_WITH_EVIDENCE' and doc.get('benchmark_credit') is True
        if not valid:
            blockers.append({'benchmark_id':bid,'state':state,'reason':'HIGH_RISK','detail':'EVIDENCE_SEMANTICS_INVALID'}); continue
        authority=doc.get('authority') or {}
        if authority.get('additional_cost_eur',doc.get('additional_cost_eur',0)) not in (0,0.0):
            blockers.append({'benchmark_id':bid,'state':state,'reason':'MONEY_LIMIT','detail':'NONZERO_ADDITIONAL_COST'}); continue
        evidence.append({'benchmark_id':bid,'commit':commit,'path':path,'status':'VERIFIED_AT_BRANCH_HEAD'})
    checks.append(('all_pass_with_evidence',len(blockers)==0 and len(evidence)==12))
    invalid_reasons=[x['reason'] for x in blockers if x['reason'] not in CANONICAL_HUMAN_REASONS]
    checks.append(('canonical_blockers',not invalid_reasons))
    ready=all(v for _,v in checks) and len(blockers)==0
    human_required=bool(blockers)
    reasons=sorted(set(x['reason'] for x in blockers))
    status='READY_FOR_GOVERNED_PROD_PROMOTION' if ready else 'HOLD_PROD'
    report={
      'schema_version':'1.0.0','state_type':'CEREBRO_UMS_PROD_READINESS_TRIBUNAL_V1','engine_id':'UMS-001','company_id':'GLOBAL','environment':'PREPROD','status':status,'ready':ready,
      'summary':{'required_benchmarks':12,'pass_with_verified_evidence':len(evidence),'blocker_count':len(blockers),'blocker_benchmarks':[x['benchmark_id'] for x in blockers]},
      'checks':{k:v for k,v in checks},'verified_evidence':evidence,'blockers':blockers,
      'human_required':human_required,'human_required_reasons':reasons,
      'authority':{'prod_mutation_authorized':False,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'additional_cost_eur':0,'next_action':'GOVERNED_PROMOTION_PIPELINE' if ready else 'RESOLVE_BLOCKERS_AND_RERUN'},
      'safety':'This tribunal computes eligibility only. It cannot merge, deploy, publish, spend, or mutate PROD.'
    }
    Path(a.out).write_text(json.dumps(report,indent=2),encoding='utf-8'); print(json.dumps(report,indent=2))
    if a.require_ready and not ready: raise SystemExit(20)
if __name__=='__main__': main()
