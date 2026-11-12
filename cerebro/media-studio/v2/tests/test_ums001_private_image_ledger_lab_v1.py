#!/usr/bin/env python3
"""Offline adversarial LAB tests. Synthetic signed bridge identity, never real billing."""
import concurrent.futures
import hashlib
import hmac
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest

SCRIPT=Path(__file__).resolve().parents[1]/"runtime/ums001_private_image_ledger_lab_v1.py"
MASTER="UMS001-MULTICHANNEL-IMAGE-11-20261111-V1"
KEY="LAB_ONLY_SYNTHETIC_RANDOM_HMAC_KEY_FOR_TESTS_0123456789"
BASE={"company_id":"fenix","engine_id":"UMS-001","environment":"LAB",
      "source_request_id":MASTER,"item_id":"SEO-BODY-01"}
def canonical(x):
    return json.dumps(x,sort_keys=True,separators=(",",":"),ensure_ascii=False)
def authorized(x):
    x=dict(x)
    x["authorization_hmac"]=hmac.new(KEY.encode(),canonical(x).encode(),hashlib.sha256).hexdigest()
    return x
def register(order_id="UMS001-LAB-SEO-BODY-20261111-01",history=0,**extras):
    return {**BASE,"action":"register","order_id":order_id,
            "order_sha256":hashlib.sha256(order_id.encode()).hexdigest(),
            "historical_attempts":history,**extras}
class LedgerLab(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(prefix="ums001-ledger-private-lab-")
        self.db=str(Path(self.tmp.name)/"private-ledger.sqlite3")
    def tearDown(self):self.tmp.cleanup()
    def call(self,doc,db=None,privileged=True):
        env=os.environ.copy()
        if privileged:env["UMS001_LEDGER_BRIDGE_HMAC_KEY"]=KEY
        else:env.pop("UMS001_LEDGER_BRIDGE_HMAC_KEY",None)
        out=subprocess.run([sys.executable,str(SCRIPT),"--db",db or self.db],
            input=canonical(doc),text=True,capture_output=True,env=env,timeout=8)
        try:obj=json.loads(out.stdout)
        except json.JSONDecodeError:raise AssertionError(out.stderr+" "+out.stdout)
        return out.returncode,obj
    def create(self,history=0):return self.call(register(history=history))
    def record(self,pred="abc1234567",raw=None,evidence=None):
        return authorized({**BASE,"action":"record_existing_prediction",
            "provider_call_authorized":False,"prediction_id":pred,
            "raw_sha256":raw or "a"*64,"signed_evidence_sha256":evidence or "b"*64})
    def test_register_and_reopen_persistent(self):
        rc,a=self.create();self.assertEqual(rc,0)
        self.assertEqual(a["total_attempts"],0)
        rc,b=self.call({**BASE,"action":"inspect"});self.assertEqual(rc,0)
        self.assertEqual(a["attempts_remaining"],b["attempts_remaining"])
        self.assertFalse(a["paid_execution_enabled"])
    def test_register_exact_replay_one_order(self):
        self.create()
        self.assertEqual(self.call(register())[0],0)
        with sqlite3.connect(self.db) as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM orders").fetchone()[0],1)
    def test_new_order_same_piece_does_not_reset_attempts(self):
        self.create()
        self.call(self.record())
        second=register(order_id="UMS001-LAB-SEO-BODY-20261111-02")
        rc,r=self.call(second);self.assertEqual(rc,0);self.assertEqual(r["total_attempts"],1)
    def test_zero_new_attempts_after_historical_two(self):
        self.create(history=2)
        self.assertEqual(self.call(self.record())[0],2)
        rc,r=self.call({**BASE,"action":"inspect"})
        self.assertEqual(rc,0);self.assertEqual(r["attempts_remaining"],0)
    def test_history_cannot_be_rewritten(self):
        self.create(history=1)
        self.assertEqual(self.call(register(history=0))[1]["status"],"DENIED")
    def test_reused_order_id_with_different_hash_denied(self):
        self.create()
        self.assertEqual(self.call(register(order_sha256="a"*64))[1]["status"],"DENIED")
    def test_cross_tenant_denied(self):
        self.assertEqual(self.call(register(company_id="evil"))[1]["status"],"DENIED")
    def test_prod_denied(self):
        self.assertEqual(self.call(register(environment="PROD"))[1]["status"],"DENIED")
    def test_attempt_one_and_two_are_all_available(self):
        self.create()
        self.assertEqual(self.call(self.record("abc1234567"))[1]["total_attempts"],1)
        self.assertEqual(self.call(self.record("abc1234568"))[1]["total_attempts"],2)
        self.assertEqual(self.call(self.record("abc1234569"))[1]["status"],"DENIED")
    def test_idempotent_replay_at_max_attempts(self):
        self.create()
        self.call(self.record("abc1234567"))
        self.call(self.record("abc1234568"))
        rc,r=self.call(self.record("abc1234568"))
        self.assertEqual(rc,0);self.assertEqual(r["total_attempts"],2)
    def test_prediction_id_cannot_change_bytes(self):
        self.create()
        self.call(self.record())
        rc,r=self.call(self.record(raw="f"*64))
        self.assertEqual(rc,2);self.assertIn("PREDICTION_IDEMPOTENCY_CONFLICT",r["reason"])
    def test_missing_hmac_even_with_true_boolean_denied(self):
        self.create()
        x=self.record();x.pop("authorization_hmac")
        self.assertEqual(self.call(x)[1]["status"],"DENIED")
    def test_tampered_hmac_denied(self):
        self.create()
        x=self.record();x["raw_sha256"]="c"*64
        self.assertEqual(self.call(x)[1]["status"],"DENIED")
    def test_unconfigured_bridge_secret_denied(self):
        self.create()
        self.assertEqual(self.call(self.record(),privileged=False)[1]["status"],"DENIED")
    def test_uncertain_post_freezes_future_attempts(self):
        self.create()
        x=authorized({**BASE,"action":"freeze_unknown","reason":"PROVIDER_POST_UNCERTAIN"})
        self.assertEqual(self.call(x)[1]["piece_status"],"HUMAN_REQUIRED")
        self.assertEqual(self.call(self.record())[1]["status"],"DENIED")
    def test_public_repository_storage_forbidden(self):
        bad=SCRIPT.parents[4]/"ums001-forbidden.sqlite"
        self.assertEqual(self.call(register(),db=str(bad))[1]["status"],"DENIED")
        self.assertFalse(bad.exists())
    def test_independent_orders_concurrent_transactional(self):
        requests=[register(order_id=f"UMS001-LAB-SEO-BODY-20261111-{i:02d}") for i in range(10,14)]
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
            results=list(ex.map(lambda d:self.call(d),requests))
        self.assertTrue(all(rc==0 for rc,_ in results),results)
        with sqlite3.connect(self.db) as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM orders").fetchone()[0],4)
    def test_ack_requires_trusted_hmac_and_explicit_receipt(self):
        self.create()
        req={**BASE,"action":"acknowledge_private","order_id":register()["order_id"],
             "idempotency_key":"a"*64,"output_sha256":"b"*64,
             "signed_receipt_sha256":"c"*64,"destination_id":"SEO-001",
             "signed_receipt_cryptographically_verified":True}
        self.assertEqual(self.call(req)[1]["status"],"DENIED")
        self.assertEqual(self.call(authorized(req))[1]["status"],"LAB_LEDGER_OK")
        self.assertEqual(self.call(authorized(req))[1]["status"],"LAB_LEDGER_OK")
    def test_no_delivery_on_unsigned_receipt_even_with_hmac(self):
        self.create()
        req=authorized({**BASE,"action":"acknowledge_private","order_id":register()["order_id"],
             "idempotency_key":"a"*64,"output_sha256":"b"*64,
             "signed_receipt_sha256":"c"*64,"destination_id":"SEO-001",
             "signed_receipt_cryptographically_verified":False})
        self.assertEqual(self.call(req)[1]["status"],"DENIED")
    def test_no_pub_video_paid_flags_on_inspection(self):
        self.create()
        rc,r=self.call({**BASE,"action":"inspect"})
        self.assertEqual(rc,0)
        self.assertFalse(r["paid_execution_enabled"])
        self.assertFalse(r["automatic_publication"])
        self.assertFalse(r["video_enabled"])
if __name__=="__main__":
    unittest.main(verbosity=2)
