"""
AI Email Reader & Responder
----------------------------
Reads unread emails from an IMAP inbox, uses Claude to draft replies,
and saves the drafts back to the mailbox (via IMAP APPEND to the
"Drafts" folder) for you to review and send manually.

It does NOT auto-send anything — that's intentional, so a bad AI
response can't go out without a human checking it first.

SETUP
-----
1. pip install anthropic

2. Set environment variables (don't hardcode credentials):
   EMAIL_ADDRESS      - your email address
   EMAIL_APP_PASSWORD - an app-specific password (Gmail: Google Account
                         > Security > 2-Step Verification > App Passwords)
   ANTHROPIC_API_KEY  - your Anthropic API key
   IMAP_SERVER        - e.g. imap.gmail.com
   SMTP_SERVER        - e.g. smtp.gmail.com (used only for drafts)

3. Run: python ai_email_reader.py

CUSTOMIZE
---------
- Edit SYSTEM_PROMPT below to match your tone/business context.
- Change MAX_EMAILS to control how many unread emails get processed per run.
- Set AUTO_SEND = True only if you're confident and want live sending
  (off by default for safety).
"""

import os
import imaplib
import smtplib
import email
from email.header import decode_header
from email.mime.text import MIMEText
from email.utils import formataddr, make_msgid
import anthropic

# ---------- CONFIG ----------
EMAIL_ADDRESS = os.environ["EMAIL_ADDRESS"]
EMAIL_APP_PASSWORD = os.environ["EMAIL_APP_PASSWORD"]
IMAP_SERVER = os.environ.get("IMAP_SERVER", "imap.gmail.com")
SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

MAX_EMAILS = 10          # how many unread emails to process per run
AUTO_SEND = False        # keep False until you trust the drafts
MODEL = "claude-sonnet-4-6"

SYSTEM_PROMPT = """You are an email assistant drafting replies on behalf of the user.
- Match a professional, friendly tone.
- Keep replies concise (3-6 sentences unless the email requires more detail).
- If the email requires info you don't have (dates, prices, decisions), draft
  the reply with a clear placeholder like [CONFIRM DATE] rather than guessing.
- Do not commit to anything on the user's behalf (meetings, payments, deadlines)
  without flagging it as a placeholder for the user to confirm.
"""

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


# ---------- HELPERS ----------
def decode_str(s):
    if s is None:
        return ""
    parts = decode_header(s)
    decoded = ""
    for text, enc in parts:
        if isinstance(text, bytes):
            decoded += text.decode(enc or "utf-8", errors="ignore")
        else:
            decoded += text
    return decoded


def get_email_body(msg):
    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            disp = str(part.get("Content-Disposition"))
            if ctype == "text/plain" and "attachment" not in disp:
                charset = part.get_content_charset() or "utf-8"
                return part.get_payload(decode=True).decode(charset, errors="ignore")
        # fallback to html if no plain text
        for part in msg.walk():
            if part.get_content_type() == "text/html":
                charset = part.get_content_charset() or "utf-8"
                return part.get_payload(decode=True).decode(charset, errors="ignore")
        return ""
    else:
        charset = msg.get_content_charset() or "utf-8"
        return msg.get_payload(decode=True).decode(charset, errors="ignore")


def fetch_unread_emails(limit=MAX_EMAILS):
    imap = imaplib.IMAP4_SSL(IMAP_SERVER)
    imap.login(EMAIL_ADDRESS, EMAIL_APP_PASSWORD)
    imap.select("INBOX")

    status, data = imap.search(None, "UNSEEN")
    ids = data[0].split()
    ids = ids[-limit:]  # most recent N unread

    emails = []
    for eid in ids:
        status, msg_data = imap.fetch(eid, "(RFC822)")
        raw = msg_data[0][1]
        msg = email.message_from_bytes(raw)
        emails.append({
            "id": eid,
            "from": decode_str(msg.get("From")),
            "subject": decode_str(msg.get("Subject")),
            "body": get_email_body(msg).strip(),
        })
    imap.logout()
    return emails


def draft_reply(email_item):
    user_msg = f"""Email received:
From: {email_item['from']}
Subject: {email_item['subject']}

{email_item['body']}

Write a reply to this email."""

    response = client.messages.create(
        model=MODEL,
        max_tokens=600,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )
    return response.content[0].text


def save_draft(to_addr, subject, body):
    msg = MIMEText(body)
    msg["From"] = formataddr((EMAIL_ADDRESS, EMAIL_ADDRESS))
    msg["To"] = to_addr
    msg["Subject"] = f"Re: {subject}"
    msg["Message-ID"] = make_msgid()

    imap = imaplib.IMAP4_SSL(IMAP_SERVER)
    imap.login(EMAIL_ADDRESS, EMAIL_APP_PASSWORD)
    imap.append('"[Gmail]/Drafts"', "", imaplib.Time2Internaldate(__import__("time").time()),
                msg.as_bytes())
    imap.logout()


def send_email(to_addr, subject, body):
    msg = MIMEText(body)
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = to_addr
    msg["Subject"] = f"Re: {subject}"

    with smtplib.SMTP_SSL(SMTP_SERVER, 465) as server:
        server.login(EMAIL_ADDRESS, EMAIL_APP_PASSWORD)
        server.send_message(msg)


# ---------- MAIN ----------
def main():
    print("Fetching unread emails...")
    emails = fetch_unread_emails()
    print(f"Found {len(emails)} unread email(s).\n")

    for item in emails:
        print(f"--- {item['subject']} (from {item['from']}) ---")
        reply = draft_reply(item)
        print("Draft reply:\n", reply, "\n")

        if AUTO_SEND:
            send_email(item["from"], item["subject"], reply)
            print("Sent.\n")
        else:
            save_draft(item["from"], item["subject"], reply)
            print("Saved to Drafts.\n")


if __name__ == "__main__":
    main()
