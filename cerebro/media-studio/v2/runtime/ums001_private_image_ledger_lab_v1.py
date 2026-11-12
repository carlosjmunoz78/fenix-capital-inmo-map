#!/usr/bin/env python3
"""UMS-001 LAB: transactional private order/attempt/receipt ledger. No paid/provider calls.

Backing SQLite file is outside the public Git checkout. This is a durable ledger
ONLY for one persistent mounted host; ephemeral CI runners are not durable stores.
An authorized, private, trusted gateway must invoke this program. A client-supplied
'prepaid=true' is intentionally not accepted as authority to make model calls.
"""
from __future__ import annotations
import argparse
import hashlib
import hmac
import json
import os
import sqlite3
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
VALID_ITEMS = frozenset({
    "IG-FEED-01", "IG-CAROUSEL-01", "IG-CAROUSEL-02", "IG-CAROUSEL-03",
    "IG-CAROUSEL-04", "IG-CAROUSEL-05", "IG-STORY-01", "FB-FEED-01",
    "LI-FEED-01", "SEO-HERO-01", "SEO-BODY-01",
})
MASTER_ID = "UMS001-MULTICHANNEL-IMAGE-11-20261111-V1"
SCHEMA = """
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS pieces (
 company_id TEXT NOT NULL,
 engine_id TEXT NOT NULL,
 environment TEXT NOT NULL,
 source_request_id TEXT NOT NULL,
 item_id TEXT NOT NULL,
 historical_attempts INTEGER NOT NULL CHECK (historical_attempts BETWEEN 0 AND 2),
 attempts_recorded INTEGER NOT NULL DEFAULT 0 CHECK (attempts_recorded BETWEEN 0 AND 2),
 frozen INTEGER NOT NULL DEFAULT 0 CHECK (frozen IN (0,1)),
 status TEXT NOT NULL,
 PRIMARY KEY (company_id,engine_id,environment,source_request_id,item_id)
);
CREATE TABLE IF NOT EXISTS orders (
 order_id TEXT PRIMARY KEY,
 order_sha256 TEXT NOT NULL,
 company_id TEXT NOT NULL,
 engine_id TEXT NOT NULL,
 environment TEXT NOT NULL,
 source_request_id TEXT NOT NULL,
 item_id TEXT NOT NULL,
 status TEXT NOT NULL,
 FOREIGN KEY (company_id,engine_id,environment,source_request_id,item_id)
  REFERENCES pieces (company_id,engine_id,environment,source_request_id,item_id)
);
CREATE TABLE IF NOT EXISTS predictions (
 prediction_id TEXT PRIMARY KEY,
 company_id TEXT NOT NULL,
 engine_id TEXT NOT NULL,
 environment TEXT NOT NULL,
 source_request_id TEXT NOT NULL,
 item_id TEXT NOT NULL,
 attempt_number INTEGER NOT NULL CHECK (attempt_number BETWEEN 1 AND 2),
 evidence_sha256 TEXT NOT NULL,
 raw_sha256 TEXT NOT NULL,
 status TEXT NOT NULL,
 UNIQUE(company_id,engine_id,environment,source_request_id,item_id,attempt_number),
 FOREIGN KEY(company_id,engine_id,environment,source_request_id,item_id)
  REFERENCES pieces(company_id,engine_id,environment,source_request_id,item_id)
);
CREATE TABLE IF NOT EXISTS deliveries (
 idempotency_key TEXT PRIMARY KEY,
 order_id TEXT NOT NULL,
 output_sha256 TEXT NOT NULL,
 destination_id TEXT NOT NULL,
 signed_receipt_sha256 TEXT NOT NULL,
 status TEXT NOT NULL CHECK (status='PRIVATE_ACK_VERIFIED'),
 FOREIGN KEY(order_id) REFERENCES orders(order_id)
);
CREATE TABLE IF NOT EXISTS audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 action TEXT NOT NULL,
 event_sha256 TEXT NOT NULL UNIQUE,
 payload_json TEXT NOT NULL
);
"""
def canonical(doc):
    return json.dumps(doc, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
def digest(doc):
    return hashlib.sha256(canonical(doc).encode("utf8")).hexdigest()
def require(cond, code):
    if not cond:
        raise ValueError("UMS001_LEDGER_" + code)
def connect(path):
    p = Path(path).expanduser().resolve()
    # Prevent accidental creation inside public git repositories; .db/-wal/-shm are sensitive.
    require(p.is_absolute() and not (ROOT == p or ROOT in p.parents), "PUBLIC_REPO_STORAGE_FORBIDDEN")
    p.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    if os.name == "posix":
        os.chmod(p.parent, 0o700)
    conn = sqlite3.connect(p, timeout=5, isolation_level=None)
    conn.execute("PRAGMA busy_timeout=5000")
    conn.execute("PRAGMA foreign_keys=ON")
    # Concurrent cold starts can race during the first WAL/schema initialization.
    # Recheck after a bounded retry; never run writes without a transaction.
    for attempt in range(10):
        try:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.executescript(SCHEMA)
            break
        except sqlite3.OperationalError as exc:
            if "locked" not in str(exc).lower() or attempt==9:
                conn.close()
                raise
            time.sleep(0.04*(attempt+1))
    if os.name == "posix":
        os.chmod(p, 0o600)
    return conn
def verify_key(x):
    require(x.get("company_id") == "fenix" and x.get("engine_id") == "UMS-001"
            and x.get("environment") == "LAB"
            and x.get("source_request_id") == MASTER_ID
            and x.get("item_id") in VALID_ITEMS, "SCOPE")
    return tuple(x[k] for k in ("company_id","engine_id","environment","source_request_id","item_id"))
def audit(conn, action, payload):
    doc = {"action": action, "payload": payload}
    conn.execute("INSERT OR IGNORE INTO audit(action,event_sha256,payload_json) VALUES(?,?,?)",
                 (action,digest(doc),canonical(doc)))
def view(conn,key):
    row = conn.execute("""SELECT historical_attempts,attempts_recorded,frozen,status FROM pieces
        WHERE company_id=? AND engine_id=? AND environment=? AND source_request_id=? AND item_id=?""",key).fetchone()
    require(row is not None,"UNKNOWN_PIECE")
    total = row[0]+row[1]
    return {"historical_attempts":row[0],"new_predictions":row[1],"total_attempts":total,
            "attempts_remaining":max(0,2-total),"frozen":bool(row[2]),"status":row[3],
            "paid_execution_enabled":False,"automatic_publication":False,"video_enabled":False}
def authenticate_privileged(request):
    """Internal trusted bridge only; never authorize a payment/provider call."""
    secret=os.environ.get("UMS001_LEDGER_BRIDGE_HMAC_KEY","")
    require(len(secret)>=32,"TRUSTED_BRIDGE_KEY_NOT_CONFIGURED")
    provided=request.get("authorization_hmac")
    require(isinstance(provided,str) and len(provided)==64,"TRUSTED_BRIDGE_MAC_REQUIRED")
    payload={k:v for k,v in request.items() if k!="authorization_hmac"}
    expected=hmac.new(secret.encode("utf8"),canonical(payload).encode("utf8"),hashlib.sha256).hexdigest()
    require(hmac.compare_digest(provided,expected),"TRUSTED_BRIDGE_MAC_INVALID")
def run(conn, request):
    action = request.get("action")
    require(action in ("register","record_existing_prediction","freeze_unknown","acknowledge_private","inspect"),
            "ACTION_NOT_ALLOWED")
    key=verify_key(request)
    if action in ("record_existing_prediction","freeze_unknown","acknowledge_private"):
        authenticate_privileged(request)
    conn.execute("BEGIN IMMEDIATE")
    try:
        if action=="register":
            order_id=request.get("order_id")
            order_sha=request.get("order_sha256")
            baseline=request.get("historical_attempts")
            require(isinstance(order_id,str) and order_id.startswith("UMS001-LAB-")
                    and isinstance(order_sha,str) and len(order_sha)==64
                    and all(c in "0123456789abcdef" for c in order_sha), "ORDER_ID_HASH")
            require(type(baseline) is int and 0<=baseline<=2, "HISTORY_INVALID")
            existing=conn.execute("""SELECT historical_attempts FROM pieces
                 WHERE company_id=? AND engine_id=? AND environment=? AND source_request_id=? AND item_id=?""",key).fetchone()
            if existing is None:
                conn.execute("""INSERT INTO pieces(company_id,engine_id,environment,source_request_id,item_id,
                    historical_attempts,status) VALUES(?,?,?,?,?,?,?)""",(*key,baseline,
                    "HUMAN_REQUIRED" if baseline==2 else "AWAITING_VERIFIED_PREPAID_GATE"))
            else:
                require(existing[0]==baseline,"HISTORY_REWRITE_FORBIDDEN")
            other=conn.execute("SELECT order_sha256 FROM orders WHERE order_id=?",(order_id,)).fetchone()
            if other is not None:
                require(other[0]==order_sha,"IDEMPOTENCY_CONFLICT")
            else:
                conn.execute("""INSERT INTO orders(order_id,order_sha256,company_id,engine_id,environment,
                    source_request_id,item_id,status) VALUES(?,?,?,?,?,?,?,?)""",
                    (order_id,order_sha,*key,"REGISTERED_NO_PAYMENT"))
            audit(conn,"REGISTER",{"order_id":order_id,"order_sha256":order_sha,"key":key})
        else:
            v=view(conn,key)
            if action=="record_existing_prediction":
                # Only an already-occurred prediction. This does NOT authorize a future POST.
                require(request.get("provider_call_authorized") is False,"MODEL_POST_DISABLED")
                require(not v["frozen"],"NO_ATTEMPTS")
                pid=request.get("prediction_id","")
                raw=request.get("raw_sha256","")
                ev=request.get("signed_evidence_sha256","")
                require(isinstance(pid,str) and 8<=len(pid)<=80 and
                        all(c.islower() or c.isdigit() for c in pid), "PREDICTION_ID")
                require(all(isinstance(x,str) and len(x)==64 and
                        all(c in "0123456789abcdef" for c in x) for x in (raw,ev)), "EVIDENCE")
                existing=conn.execute("SELECT evidence_sha256,raw_sha256 FROM predictions WHERE prediction_id=?",(pid,)).fetchone()
                if existing:
                    require(existing==(ev,raw),"PREDICTION_IDEMPOTENCY_CONFLICT")
                else:
                    require(v["attempts_remaining"]>0,"NO_ATTEMPTS")
                    next_attempt=v["total_attempts"]+1
                    conn.execute("""INSERT INTO predictions(prediction_id,company_id,engine_id,environment,
                        source_request_id,item_id,attempt_number,evidence_sha256,raw_sha256,status)
                        VALUES(?,?,?,?,?,?,?,?,?,?)""",(pid,*key,next_attempt,ev,raw,"UNVERIFIED_PHYSICAL_QA_PENDING"))
                    conn.execute("""UPDATE pieces SET attempts_recorded=attempts_recorded+1,status='QA_PENDING'
                        WHERE company_id=? AND engine_id=? AND environment=? AND source_request_id=? AND item_id=?""",key)
                audit(conn,"RECORD_EXISTING_PREDICTION",{"id":pid,"key":key,"raw_sha256":raw,"evidence_sha256":ev})
            elif action=="freeze_unknown":
                require(request.get("reason") in ("PROVIDER_POST_UNCERTAIN","AUTH_COMPROMISE","RECONCILIATION_REQUIRED"),
                        "FREEZE_REASON")
                conn.execute("""UPDATE pieces SET frozen=1,status='HUMAN_REQUIRED'
                    WHERE company_id=? AND engine_id=? AND environment=? AND source_request_id=? AND item_id=?""",key)
                audit(conn,"FREEZE",{"key":key,"reason":request["reason"]})
            elif action=="acknowledge_private":
                # The controller MUST have verified a cryptographically signed receiving receipt already.
                # This local process is NOT a public API; caller-side trusted signatures still mandatory.
                require(request.get("signed_receipt_cryptographically_verified") is True,"SIGNED_GATE_MISSING")
                idem=request.get("idempotency_key")
                sha=request.get("output_sha256")
                receipt=request.get("signed_receipt_sha256")
                dest=request.get("destination_id")
                order_id=request.get("order_id")
                require(all(isinstance(x,str) and len(x)==64 and
                    all(c in "0123456789abcdef" for c in x) for x in (idem,sha,receipt)),"RECEIPT_HASH")
                require(isinstance(dest,str) and (dest.startswith("SOC-") or dest=="SEO-001"),"DESTINATION_ID")
                o=conn.execute("""SELECT item_id FROM orders WHERE order_id=? AND company_id=? AND engine_id=?
                  AND environment=? AND source_request_id=?""",(order_id,*key[:4])).fetchone()
                require(o is not None and o[0]==key[4],"ORDER_BINDING")
                existing=conn.execute("SELECT order_id,output_sha256,destination_id,signed_receipt_sha256 FROM deliveries WHERE idempotency_key=?",(idem,)).fetchone()
                record=(order_id,sha,dest,receipt)
                if existing: require(existing==record,"DELIVERY_IDEMPOTENCY_CONFLICT")
                else:
                    conn.execute("""INSERT INTO deliveries(idempotency_key,order_id,output_sha256,destination_id,
                        signed_receipt_sha256,status) VALUES(?,?,?,?,?,'PRIVATE_ACK_VERIFIED')""",
                        (idem,*record))
                audit(conn,"PRIVATE_ACK",{"key":key,"order_id":order_id,"output_sha256":sha,"destination_id":dest,"idempotency_key":idem})
        result=view(conn,key)
        conn.execute("COMMIT")
        return {"status":"LAB_LEDGER_OK","action":action,
                **{k:v for k,v in result.items() if k!="status"},
                "piece_status":result["status"]}
    except Exception:
        conn.execute("ROLLBACK")
        raise
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--db",required=True)
    args=parser.parse_args()
    try:
        request=json.load(__import__("sys").stdin)
        with connect(args.db) as conn:
            output=run(conn,request)
        print(canonical(output))
    except (ValueError,KeyError,sqlite3.Error) as exc:
        print(canonical({"status":"DENIED","reason":str(exc)}))
        raise SystemExit(2)
if __name__=="__main__":
    main()
