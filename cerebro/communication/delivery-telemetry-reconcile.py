#!/usr/bin/env python3
import argparse
import email
import imaplib
import json
import os
import ssl
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime


def env(name, required=True, default=None):
    value = os.getenv(name, default)
    if required and not value:
        raise RuntimeError(f"missing required private environment variable: {name}")
    return value


def iso_utc(value=None):
    value = value or datetime.now(timezone.utc)
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def find_delivery(delivery_key):
    host = env("CEREBRO_MAIL_IMAP_HOST", required=False, default="imap.gmail.com")
    port = int(env("CEREBRO_MAIL_IMAP_PORT", required=False, default="993"))
    username = env("CEREBRO_MAIL_USERNAME")
    password = env("CEREBRO_MAIL_PASSWORD")
    conn = imaplib.IMAP4_SSL(host, port, ssl_context=ssl.create_default_context())
    try:
        conn.login(username, password)
        status, _ = conn.select("INBOX", readonly=True)
        if status != "OK":
            raise RuntimeError("unable to select INBOX for delivery telemetry")
        status, data = conn.search(None, "HEADER", "X-CEREBRO-Delivery-Key", f'"{delivery_key}"')
        if status != "OK":
            raise RuntimeError("unable to search CEREBRO delivery key")
        ids = (data[0] or b"").split()
        if not ids:
            return None
        msg_id = ids[-1]
        status, rows = conn.fetch(msg_id, "(BODY.PEEK[HEADER.FIELDS (DATE MESSAGE-ID X-CEREBRO-DELIVERY-KEY X-CEREBRO-GENERATED)])")
        if status != "OK":
            raise RuntimeError("unable to fetch delivery telemetry header")
        raw = next((row[1] for row in rows if isinstance(row, tuple) and len(row) > 1), None)
        delivered_at = None
        message_id = None
        if raw:
            msg = email.message_from_bytes(raw)
            message_id = msg.get("Message-ID") or None
            if msg.get("Date"):
                try:
                    delivered_at = iso_utc(parsedate_to_datetime(msg.get("Date")))
                except Exception:
                    delivered_at = None
        return {
            "verified_at": iso_utc(),
            "delivered_at": delivered_at or iso_utc(),
            "message_id": message_id,
        }
    finally:
        try:
            conn.logout()
        except Exception:
            pass


def reconcile_state(state, delivery_key, evidence):
    out = json.loads(json.dumps(state))
    if not evidence:
        return out, False
    delivered_at = evidence.get("delivered_at") or evidence.get("verified_at") or iso_utc()
    out["last_delivery_at"] = delivered_at
    out["mail_transport"] = {
        **(out.get("mail_transport") or {}),
        "status": "VERIFIED",
        "last_success_at": delivered_at,
        "last_error": None,
        "last_verified_delivery_key": delivery_key,
    }
    out["updated_at"] = evidence.get("verified_at") or iso_utc()
    return out, True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--state", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--evidence", required=True)
    args = parser.parse_args()

    with open(args.state, "r", encoding="utf-8") as fh:
        state = json.load(fh)
    digest_date = state.get("last_digest_date")
    if not digest_date:
        evidence = {"status": "NO_DIGEST_TO_VERIFY", "verified": False, "state_changed": False}
        updated = state
    else:
        delivery_key = f"DIGEST:{digest_date}"
        found = find_delivery(delivery_key)
        updated, changed = reconcile_state(state, delivery_key, found)
        evidence = {
            "status": "VERIFIED" if found else "NOT_FOUND",
            "verified": bool(found),
            "delivery_key": delivery_key,
            "delivery": found,
            "state_changed": changed,
            "prod_business_write": False,
            "trading": False,
            "additional_cost_eur": 0,
        }

    with open(args.output, "w", encoding="utf-8") as fh:
        json.dump(updated, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    with open(args.evidence, "w", encoding="utf-8") as fh:
        json.dump(evidence, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    print(json.dumps(evidence, ensure_ascii=False))


if __name__ == "__main__":
    main()
