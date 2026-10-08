#!/usr/bin/env python3
import argparse
import email
import imaplib
import json
import os
import smtplib
import ssl
from email.header import decode_header
from email.message import EmailMessage
from email.utils import parseaddr


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

    msg = EmailMessage()
    msg["From"] = from_addr
    msg["To"] = to_addr
    msg["Subject"] = payload["subject"]
    msg.set_content(payload["text"], charset="utf-8")

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
    print(json.dumps({"sent": True, "recipient": "OWNER_PRIVATE_IDENTITY"}))


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
            messages.append({
                "message_id": msg.get("Message-ID") or f"imap:{msg_id.decode()}",
                "from_identity": "OWNER_PRIVATE_IDENTITY",
                "subject": decode_header_text(msg.get("Subject")),
                "date": msg.get("Date") or "",
                "text": extract_text(msg),
            })
        with open(output_path, "w", encoding="utf-8") as fh:
            json.dump(messages, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
        print(json.dumps({"polled": len(messages), "sender": "OWNER_PRIVATE_IDENTITY"}))
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
