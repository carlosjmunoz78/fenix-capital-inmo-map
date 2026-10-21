#!/usr/bin/env python3
import argparse
import email
import hashlib
import imaplib
import json
import os
import re
import smtplib
import ssl
import urllib.error
import urllib.request
from email.header import decode_header
from email.message import EmailMessage
from email.utils import parseaddr

SUBJECT_RE = re.compile(r"^\s*(?:re\s*:\s*)?CEREBRO\s*·\s*Revisión de publicación\s*·\s*(Instagram|Facebook|LinkedIn)(?:\s*·?\s*(.*))?$", re.IGNORECASE)
QUOTED_BOUNDARY_RE = re.compile(r"^(on .+wrote:|el .+escribi[oó]:|from:\s+.+|de:\s+.+|-{2,}\s*(original message|mensaje original)\s*-{2,})$", re.IGNORECASE)
EXPLICIT_REVIEW_RE = re.compile(r"^\s*(?:OK\b|NO\s+OK\b)", re.IGNORECASE)
WORKER_URL = "https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-social-owner-review-worker-v1"
OIDC_AUDIENCE = "cerebro-social-owner-review-worker-v1"


def env(name, required=True, default=None):
    value = os.getenv(name, default)
    if required and not value:
        raise RuntimeError(f"missing required private environment variable: {name}")
    return value


def decode_header_text(value):
    if not value:
        return ""
    out = []
    for part, charset in decode_header(value):
        out.append(part.decode(charset or "utf-8", errors="replace") if isinstance(part, bytes) else part)
    return "".join(out)


def extract_text(msg):
    if msg.is_multipart():
        plain = []
        for part in msg.walk():
            ctype = part.get_content_type()
            dispo = (part.get("Content-Disposition") or "").lower()
            if ctype == "text/plain" and "attachment" not in dispo:
                payload = part.get_payload(decode=True) or b""
                plain.append(payload.decode(part.get_content_charset() or "utf-8", errors="replace"))
        return "\n".join(plain)
    payload = msg.get_payload(decode=True) or b""
    return payload.decode(msg.get_content_charset() or "utf-8", errors="replace")


def extract_unquoted_reply_text(text):
    out = []
    for raw in str(text or "").splitlines():
        trimmed = raw.strip()
        if QUOTED_BOUNDARY_RE.match(trimmed):
            break
        if trimmed.startswith(">"):
            continue
        out.append(raw)
    return "\n".join(out).strip()


def social_subject(subject):
    return bool(SUBJECT_RE.match(subject or ""))


def classify_reply(text):
    t = re.sub(r"[.!¡¿?]+$", "", str(text or "").strip(), flags=re.MULTILINE).strip().upper()
    if re.fullmatch(r"(OK|OK PERFECT[OA]?|PERFECT[OA]|APROBADO|PUBLICA|PUBLÍCALA|PUBLICALA)", t):
        return "OK"
    return "CORRECTION" if t else "EMPTY"


def accept_owner_reply(text, referenced_generated=False):
    return bool(EXPLICIT_REVIEW_RE.match(str(text or ""))) or bool(referenced_generated)


def fetch_message(conn, msg_id):
    status, rows = conn.fetch(msg_id, "(RFC822)")
    if status != "OK":
        return None
    for row in rows:
        if isinstance(row, tuple) and len(row) > 1:
            return email.message_from_bytes(row[1])
    return None


def referenced_review_meta(conn, in_reply_to):
    if not in_reply_to:
        return None, False
    status, data = conn.search(None, "HEADER", "Message-ID", f'"{in_reply_to}"')
    if status != "OK":
        return None, False
    ids = (data[0] or b"").split()
    if not ids:
        return None, False
    original = fetch_message(conn, ids[-1])
    if original is None:
        return None, False
    key = (original.get("X-CEREBRO-Social-Review-Key") or "").strip() or None
    generated = (original.get("X-CEREBRO-Generated") or "").strip().lower() == "social-review-v1"
    return key, generated


def poll_owner(output_path, limit):
    host = env("CEREBRO_MAIL_IMAP_HOST")
    port = int(env("CEREBRO_MAIL_IMAP_PORT", required=False, default="993"))
    username = env("CEREBRO_MAIL_USERNAME")
    password = env("CEREBRO_MAIL_PASSWORD")
    owner = env("CEREBRO_OWNER_EMAIL")
    conn = imaplib.IMAP4_SSL(host, port, ssl_context=ssl.create_default_context())
    try:
        conn.login(username, password)
        status, _ = conn.select("INBOX", readonly=True)
        if status != "OK":
            raise RuntimeError("unable to select INBOX")
        status, data = conn.search(None, "FROM", f'"{owner}"')
        if status != "OK":
            raise RuntimeError("unable to search owner replies")
        ids = (data[0] or b"").split()[-limit:]
        messages = []
        for msg_id in ids:
            msg = fetch_message(conn, msg_id)
            if msg is None:
                continue
            sender = parseaddr(msg.get("From") or "")[1]
            if sender.lower() != owner.lower():
                continue
            if (msg.get("X-CEREBRO-Generated") or "").strip().lower() == "social-review-v1":
                continue
            subject = decode_header_text(msg.get("Subject"))
            if not social_subject(subject):
                continue
            text = extract_unquoted_reply_text(extract_text(msg))
            if not text:
                continue
            in_reply_to = msg.get("In-Reply-To") or None
            decision_key, referenced_generated = referenced_review_meta(conn, in_reply_to)
            if not accept_owner_reply(text, referenced_generated):
                continue
            messages.append({
                "message_id": msg.get("Message-ID") or f"imap:{msg_id.decode()}",
                "in_reply_to": in_reply_to,
                "decision_key": decision_key,
                "from_identity": "OWNER_PRIVATE_IDENTITY_FROM_MATCH",
                "subject": subject,
                "date": msg.get("Date") or "",
                "text": text,
                "classification": classify_reply(text),
            })
        with open(output_path, "w", encoding="utf-8") as fh:
            json.dump(messages, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
        print(json.dumps({"polled": len(messages), "kind": "SOCIAL_REVIEW", "owner_only": True}))
    finally:
        try:
            conn.logout()
        except Exception:
            pass


def oidc_token():
    request_url = env("ACTIONS_ID_TOKEN_REQUEST_URL")
    request_token = env("ACTIONS_ID_TOKEN_REQUEST_TOKEN")
    sep = "&" if "?" in request_url else "?"
    req = urllib.request.Request(f"{request_url}{sep}audience={OIDC_AUDIENCE}", headers={"Authorization": f"bearer {request_token}"})
    with urllib.request.urlopen(req, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))
    value = payload.get("value")
    if not value:
        raise RuntimeError("OIDC token missing")
    return value


def call_worker(messages):
    if not messages:
        return {"ok": True, "processed": 0, "results": [], "mails": []}
    data = json.dumps({"messages": messages}, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(WORKER_URL, data=data, method="POST", headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {oidc_token()}",
        "User-Agent": "cerebro-social-review-bridge/1.1",
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"social review worker HTTP {exc.code}: {body[:1200]}") from exc


def deterministic_message_id(delivery_key):
    digest = hashlib.sha256(delivery_key.encode("utf-8")).hexdigest()[:32]
    return f"<cerebro-social-{digest}@owner-communication.local>"


def send_one(payload):
    host = env("CEREBRO_MAIL_SMTP_HOST")
    port = int(env("CEREBRO_MAIL_SMTP_PORT", required=False, default="465"))
    username = env("CEREBRO_MAIL_USERNAME")
    password = env("CEREBRO_MAIL_PASSWORD")
    owner = env("CEREBRO_OWNER_EMAIL")
    from_addr = env("CEREBRO_MAIL_FROM", required=False, default=username)
    msg = EmailMessage()
    msg["From"] = from_addr
    msg["To"] = owner
    msg["Subject"] = payload["subject"]
    key = payload["delivery_key"]
    msg["Message-ID"] = deterministic_message_id(key)
    msg["X-CEREBRO-Delivery-Key"] = key
    msg["X-CEREBRO-Social-Review-Key"] = payload.get("decision_key", "")
    msg["X-CEREBRO-Generated"] = "social-review-v1"
    if payload.get("in_reply_to"):
        msg["In-Reply-To"] = payload["in_reply_to"]
        msg["References"] = payload["in_reply_to"]
    msg.set_content(payload.get("text") or "", charset="utf-8")
    if payload.get("html"):
        msg.add_alternative(payload["html"], subtype="html")
    context = ssl.create_default_context()
    if port == 465:
        with smtplib.SMTP_SSL(host, port, context=context, timeout=30) as smtp:
            smtp.login(username, password)
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=30) as smtp:
            smtp.ehlo(); smtp.starttls(context=context); smtp.ehlo(); smtp.login(username, password); smtp.send_message(msg)
    return {"sent": True, "delivery_key": key, "decision_key": payload.get("decision_key")}


def process(input_path, output_path):
    with open(input_path, "r", encoding="utf-8") as fh:
        messages = json.load(fh)
    result = call_worker(messages)
    sent = [send_one(mail) for mail in (result.get("mails") or [])]
    result["delivery"] = sent
    with open(output_path, "w", encoding="utf-8") as fh:
        json.dump(result, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    print(json.dumps({"processed": result.get("processed", 0), "sent": len(sent), "ok": result.get("ok", False)}))


def main():
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="command", required=True)
    a = sub.add_parser("poll"); a.add_argument("--output", required=True); a.add_argument("--limit", type=int, default=80)
    b = sub.add_parser("process"); b.add_argument("--input", required=True); b.add_argument("--output", required=True)
    args = p.parse_args()
    if args.command == "poll": poll_owner(args.output, args.limit)
    else: process(args.input, args.output)

if __name__ == "__main__":
    main()
