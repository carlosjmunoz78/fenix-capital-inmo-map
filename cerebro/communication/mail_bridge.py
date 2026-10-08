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
from email.header import decode_header
from email.message import EmailMessage
from email.utils import parseaddr

COMMAND_RE = re.compile(r"^(AUTORIZO|NO AUTORIZO|EXPLICAME)\s+(APR-\d{8}-[A-F0-9]{8})$", re.IGNORECASE)
QUOTED_BOUNDARY_RE = re.compile(r"^(on .+wrote:|el .+escribi[oó]:|from:\s+.+|de:\s+.+|-{2,}\s*(original message|mensaje original)\s*-{2,})$", re.IGNORECASE)


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
        if isinstance(part, bytes):
            out.append(part.decode(charset or "utf-8", errors="replace"))
        else:
            out.append(part)
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
    return "\n".join(out)


def exact_commands(text):
    commands = []
    for raw in extract_unquoted_reply_text(text).splitlines():
        line = raw.strip()
        match = COMMAND_RE.match(line)
        if not match:
            continue
        commands.append(f"{match.group(1).upper()} {match.group(2).upper()}")
    return commands


def deterministic_message_id(delivery_keys):
    canonical = "|".join(sorted(set(delivery_keys)))
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:32]
    return f"<cerebro-{digest}@owner-communication.local>"


def existing_delivery_keys(keys):
    keys = list(dict.fromkeys(k for k in keys if k))
    if not keys:
        return set()
    host = env("CEREBRO_MAIL_IMAP_HOST")
    port = int(env("CEREBRO_MAIL_IMAP_PORT", required=False, default="993"))
    username = env("CEREBRO_MAIL_USERNAME")
    password = env("CEREBRO_MAIL_PASSWORD")
    conn = imaplib.IMAP4_SSL(host, port, ssl_context=ssl.create_default_context())
    found = set()
    try:
        conn.login(username, password)
        status, _ = conn.select("INBOX", readonly=True)
        if status != "OK":
            raise RuntimeError("unable to select INBOX for idempotency check")
        for key in keys:
            status, data = conn.search(None, "HEADER", "X-CEREBRO-Delivery-Key", f'"{key}"')
            if status != "OK":
                raise RuntimeError("unable to search logical delivery key")
            if (data[0] or b"").split():
                found.add(key)
        return found
    finally:
        try:
            conn.logout()
        except Exception:
            pass


def prepare_delivery(payload):
    kind = payload.get("kind")
    if kind == "approval_batch":
        raw_items = payload.get("items") or []
        already = existing_delivery_keys([item.get("delivery_key") for item in raw_items])
        remaining = [item for item in raw_items if item.get("delivery_key") and item.get("delivery_key") not in already]
        if not remaining:
            return None, already
        count = len(remaining)
        if payload.get("night_batch"):
            intro = f"Te necesito. Durante la noche he agrupado {count} decisión{'es' if count != 1 else ''} pendiente{'s' if count != 1 else ''}. Puedes responder a este mismo correo con varias líneas de autorización."
        else:
            intro = f"Te necesito. Tengo {count} decisión{'es' if count != 1 else ''} pendiente{'s' if count != 1 else ''}. Puedes responder a este mismo correo con una o varias líneas."
        body_items = [item.get("text", "") for item in remaining]
        text = f"{intro}\n\n" + "\n\n------------------------------\n\n".join(body_items) + "\n\nIMPORTANTE: “sí”, “vale”, “ok” o “procede” no autorizan nada. Solo cuentan las frases exactas con APR.\n"
        subject = payload.get("subject") if count == len(raw_items) else f"CEREBRO · {count} AUTORIZACIÓN{'ES' if count != 1 else ''} PENDIENTE{'S' if count != 1 else ''}"
        keys = [item["delivery_key"] for item in remaining]
        return {"subject": subject, "text": text, "delivery_keys": keys}, already

    key = payload.get("delivery_key") or (f"DIGEST:{payload.get('digest_date')}" if payload.get("digest_date") else None)
    if not key:
        raise RuntimeError("logical delivery key missing")
    already = existing_delivery_keys([key])
    if key in already:
        return None, already
    return {"subject": payload["subject"], "text": payload["text"], "delivery_keys": [key]}, already


def send_message(input_path):
    host = env("CEREBRO_MAIL_SMTP_HOST")
    port = int(env("CEREBRO_MAIL_SMTP_PORT", required=False, default="465"))
    username = env("CEREBRO_MAIL_USERNAME")
    password = env("CEREBRO_MAIL_PASSWORD")
    from_addr = env("CEREBRO_MAIL_FROM", required=False, default=username)
    owner = env("CEREBRO_OWNER_EMAIL")

    with open(input_path, "r", encoding="utf-8") as fh:
        payload = json.load(fh)
    to_addr = payload.get("to") or owner
    if to_addr.lower() != owner.lower():
        raise RuntimeError("mail bridge can only send to configured owner identity")

    prepared, already = prepare_delivery(payload)
    if prepared is None:
        print(json.dumps({"sent": False, "deduplicated": True, "delivery_keys": sorted(already), "recipient": "OWNER_PRIVATE_IDENTITY"}))
        return

    keys = prepared["delivery_keys"]
    msg = EmailMessage()
    msg["From"] = from_addr
    msg["To"] = to_addr
    msg["Subject"] = prepared["subject"]
    msg["Message-ID"] = deterministic_message_id(keys)
    for key in keys:
        msg["X-CEREBRO-Delivery-Key"] = key
    msg["X-CEREBRO-Generated"] = "owner-communication-v1"
    msg["Auto-Submitted"] = "auto-generated"
    msg.set_content(prepared["text"], charset="utf-8")

    context = ssl.create_default_context()
    if port == 465:
        with smtplib.SMTP_SSL(host, port, context=context, timeout=30) as smtp:
            smtp.login(username, password)
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=30) as smtp:
            smtp.ehlo()
            smtp.starttls(context=context)
            smtp.ehlo()
            smtp.login(username, password)
            smtp.send_message(msg)
    print(json.dumps({"sent": True, "deduplicated": bool(already), "delivery_keys": keys, "recipient": "OWNER_PRIVATE_IDENTITY"}))


def is_real_owner_reply(msg, subject):
    if (msg.get("X-CEREBRO-Generated") or "").strip().lower() == "owner-communication-v1":
        return False
    if msg.get("In-Reply-To"):
        return True
    return bool(re.match(r"^\s*(re|rv|fwd|fw)\s*:", subject or "", flags=re.IGNORECASE))


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
            status, rows = conn.fetch(msg_id, "(RFC822)")
            if status != "OK":
                continue
            raw = None
            for row in rows:
                if isinstance(row, tuple) and len(row) > 1:
                    raw = row[1]
                    break
            if not raw:
                continue
            msg = email.message_from_bytes(raw)
            sender = parseaddr(msg.get("From") or "")[1]
            if sender.lower() != owner.lower():
                continue
            subject = decode_header_text(msg.get("Subject"))
            if not is_real_owner_reply(msg, subject):
                continue
            commands = exact_commands(extract_text(msg))
            if not commands:
                continue
            messages.append({
                "message_id": msg.get("Message-ID") or f"imap:{msg_id.decode()}",
                "in_reply_to": msg.get("In-Reply-To") or None,
                "from_identity": "OWNER_PRIVATE_IDENTITY_FROM_MATCH",
                "subject": subject,
                "date": msg.get("Date") or "",
                "text": "\n".join(commands),
            })
        with open(output_path, "w", encoding="utf-8") as fh:
            json.dump(messages, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
        print(json.dumps({"polled": len(messages), "sender": "OWNER_PRIVATE_IDENTITY", "reply_only": True, "trust_mode": "EXACT_FROM_MATCH_OWNER_ACCEPTED_V0"}))
    finally:
        try:
            conn.logout()
        except Exception:
            pass


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    p_send = sub.add_parser("send")
    p_send.add_argument("--input", required=True)
    p_poll = sub.add_parser("poll")
    p_poll.add_argument("--output", required=True)
    p_poll.add_argument("--limit", type=int, default=50)
    args = parser.parse_args()
    if args.command == "send":
        send_message(args.input)
    else:
        poll_owner(args.output, args.limit)


if __name__ == "__main__":
    main()
