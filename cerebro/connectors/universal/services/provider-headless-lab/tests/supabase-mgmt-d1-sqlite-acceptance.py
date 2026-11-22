"""FACT-001: physical SQLite smoke for new, unapplied Supabase LAB D1 ledger.
Runs in an in-memory database; never connects to Supabase, D1 or production.
"""
import json
import sqlite3
import subprocess
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
SOURCE = BASE / "supabase-mgmt-edge-d1-ledger.mjs"
CMD = [
    "node", "--input-type=module", "-e",
    "const m=await import(process.argv[1]);process.stdout.write(JSON.stringify(m.SUPABASE_EDGE_LEDGER_SCHEMA));",
    str(SOURCE),
]
result = subprocess.run(CMD, capture_output=True, text=True, check=True, timeout=10)
schema = json.loads(result.stdout)
assert len(schema) == 6, "D1_SCHEMA_STATEMENT_COUNT_CHANGED"
db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys=ON")
for statement in schema:
    db.execute(statement)

row_id = "FACT001-SBMGT-20261111-SQLITE01"
digest = "a" * 64
insert = (
    "INSERT INTO fact001_supabase_edge_jobs_v1"
    "(request_id,command_sha256,company_id,engine_id,environment,"
    "project_ref,resource_slug,operation,status,attempts,expires_at_ms,before_sha256,max_cost_eur)"
    " VALUES(?1,?2,'fenix-capital','FACT-001','LAB',?3,?4,?5,'PREPARED',0,?6,?7,0)"
    " ON CONFLICT(request_id) DO NOTHING RETURNING request_id,status,attempts,command_sha256"
)
params = (
    row_id,digest,"cluhljgonannaafpmblx",
    "cerebro-fact001-sb-mgmt-canary-lab","edge.update",1794420000000,digest,
)
assert db.execute(insert, params).fetchone() is not None
assert db.execute(insert, params).fetchall() == [], "REPLAY_NOT_BLOCKED"
claim = (
    "UPDATE fact001_supabase_edge_jobs_v1 "
    "SET status='IN_FLIGHT',attempts=1,claimed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') "
    "WHERE request_id=?1 AND command_sha256=?2 AND status='PREPARED' AND attempts=0 "
    "AND expires_at_ms>?3 RETURNING request_id,status,attempts,command_sha256"
)
assert db.execute(claim, (row_id,digest,1794419300000)).fetchone() is not None
assert db.execute(claim, (row_id,digest,1794419300000)).fetchall() == [], "SECOND_CLAIM_ALLOWED"
settle = (
    "UPDATE fact001_supabase_edge_jobs_v1 "
    "SET status=?3,after_sha256=?4,settled_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') "
    "WHERE request_id=?1 AND command_sha256=?2 AND status='IN_FLIGHT' AND attempts=1 "
    "RETURNING request_id,status,attempts,command_sha256"
)
assert db.execute(settle,(row_id,digest,"COMPLETED","b"*64)).fetchone() is not None
assert db.execute(settle,(row_id,digest,"COMPLETED","b"*64)).fetchall() == []
events = [r[0] for r in db.execute(
    "SELECT event_type FROM fact001_supabase_edge_events_v1 ORDER BY event_id"
)]
assert events == ["PREPARED","IN_FLIGHT","COMPLETED"], "AUDIT_EVENTS_INCOMPLETE"
for statement in (
    "DELETE FROM fact001_supabase_edge_events_v1",
    "UPDATE fact001_supabase_edge_events_v1 SET event_type='PREPARED'",
):
    try:
        db.execute(statement)
    except sqlite3.IntegrityError as exc:
        assert "AUDIT_IMMUTABLE" in str(exc), "UNEXPECTED_AUDIT_ERROR"
    else:
        raise AssertionError("AUDIT_MUTATION_NOT_BLOCKED")

try:
    db.execute(insert,(
        "FACT001-SBMGT-20261111-FOREIGN01", digest, "other_project",
        "cerebro-fact001-sb-mgmt-canary-lab", "edge.update", 1794420000000, digest
    ))
except sqlite3.IntegrityError:
    pass
else:
    raise AssertionError("FOREIGN_PROJECT_ACCEPTED")

assert len(list(db.execute("SELECT * FROM fact001_supabase_edge_jobs_v1")))==1
db.close()
print("FACT001_SUPABASE_EDGE_D1_SQLITE_PHYSICAL_OFFLINE=PASS")
print("FACT001_NEW_D1_DATABASES=0")
print("FACT001_PRODUCTION_PROVIDER_WRITES=0")
