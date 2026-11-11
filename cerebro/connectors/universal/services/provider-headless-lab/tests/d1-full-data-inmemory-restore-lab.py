# FACT-001 · full-data D1 LAB snapshot / restore E2E. No persistent backup or disclosed values.
import os
import json
import time
import sqlite3
import hashlib
from urllib.request import Request, urlopen
from urllib.parse import urlparse
from urllib.error import HTTPError, URLError

ACCOUNT = "e39a57e1ac42650ca5a6d5307cf0ac8e"
DATABASE = "1305f791-7c44-47f9-946b-f330a09c88aa"
TOKEN = os.environ.get("CEREBRO_CLOUDFLARE_API_TOKEN")
if not TOKEN:
    raise RuntimeError("MISSING_API_TOKEN")
ENDPOINT = "https://api.cloudflare.com/client/v4/accounts/" + ACCOUNT + "/d1/database/" + DATABASE
HEADERS = {"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json"}
CAP = 8_000_000

def call(path, body):
    req = Request(ENDPOINT + path, method="POST", data=json.dumps(body).encode(), headers=HEADERS)
    try:
        with urlopen(req, timeout=25) as resp:
            result = json.load(resp)
    except HTTPError as exc:
        raise RuntimeError("D1_API_HTTP_" + str(exc.code)) from None
    except URLError:
        raise RuntimeError("D1_API_CONNECTION_ERROR") from None
    if not result.get("success"):
        raise RuntimeError("D1_API_UNSUCCESSFUL")
    return result["result"]

base = {"output_format":"polling","dump_options":{"compatibility":"d1","no_data":False}}
state = call("/export", base)
for i in range(9):
    if state.get("status") == "complete":
        break
    bookmark = state.get("at_bookmark")
    if not bookmark:
        raise RuntimeError("D1_EXPORT_MISSING_BOOKMARK")
    time.sleep(1.2)
    state = call("/export", {**base, "current_bookmark":bookmark})
if state.get("status") != "complete":
    raise RuntimeError("D1_EXPORT_NOT_COMPLETE")
signed_url = state.get("result",{}).get("signed_url")
if not signed_url:
    raise RuntimeError("D1_EXPORT_NO_SIGNED_URL")
parsed = urlparse(signed_url)
if parsed.scheme != "https" or not parsed.hostname or not parsed.hostname.endswith(".eu.r2.cloudflarestorage.com"):
    raise RuntimeError("D1_EXPORT_URL_HOST_FORBIDDEN")
try:
    with urlopen(Request(signed_url, method="GET"), timeout=25) as resp:
        length = int(resp.headers.get("Content-Length") or 0)
        if length > CAP:
            raise RuntimeError("D1_EXPORT_OVER_CAP")
        payload = resp.read(CAP+1)
except HTTPError as exc:
    raise RuntimeError("D1_SIGNED_DOWNLOAD_HTTP_" + str(exc.code)) from None
except URLError:
    raise RuntimeError("D1_SIGNED_DOWNLOAD_TRANSPORT_ERROR") from None
if not payload or len(payload) > CAP:
    raise RuntimeError("D1_EXPORT_SIZE_INVALID")
print("D1_FULL_EXPORT_DOWNLOAD=HTTP_200")
print("D1_FULL_EXPORT_BYTES=" + str(len(payload)))
print("D1_FULL_EXPORT_SHA256=" + hashlib.sha256(payload).hexdigest())

connection = sqlite3.connect(":memory:")
connection.executescript(payload.decode("utf-8"))
if connection.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
    raise RuntimeError("D1_RESTORE_INTEGRITY_FAILED")
names = sorted(r[0] for r in connection.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"))
if len(names) != 23:
    raise RuntimeError("D1_RESTORE_USER_SCHEMA_COUNT_CHANGED")
def quote_identifier(s):
    return '"' + s.replace('"','""') + '"'
restored = {name: connection.execute("SELECT COUNT(*) FROM " + quote_identifier(name)).fetchone()[0] for name in names}
q = " UNION ALL ".join("SELECT " + json.dumps(name) + " AS name, COUNT(*) AS count FROM " + quote_identifier(name) for name in names)
records = call("/query",{"sql":q})
if not isinstance(records,list) or len(records) != 1 or not records[0].get("success"):
    raise RuntimeError("D1_LIVE_QUERY_ERROR")
live = {row["name"]: int(row["count"]) for row in records[0].get("results",[])}
if live != restored:
    raise RuntimeError("D1_DATA_RESTORE_ROW_PARITY_FAILED")
print("D1_IN_MEMORY_INTEGRITY=PASS")
print("D1_FULL_DATA_USER_TABLE_PARITY=23_OF_23_PASS")
print("D1_FULL_DATA_TOTAL_ROWS=" + str(sum(restored.values())))
print("D1_PERSISTED_DATA_ARTIFACTS=NONE")
print("D1_PRODUCTION_WRITES=NONE")
