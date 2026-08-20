#!/usr/bin/env python3
"""
AI Follow-Up Automation — Leads & Quotes
==========================================
Tracks leads and quotes in a local SQLite DB, figures out who's due for a
follow-up based on a configurable cadence, uses Claude to draft a
personalized email for each one, and sends it (or just shows the draft).

Run modes:
    python followup_automation.py add-lead --name ... --email ...
    python followup_automation.py add-quote --name ... --email ...
    python followup_automation.py run              # draft + preview only
    python followup_automation.py run --send       # draft + actually send
    python followup_automation.py list             # see everything in the pipeline
    python followup_automation.py status --id 3 --set responded

Designed to be run on a schedule (cron / Task Scheduler) with `run --send`.

SETUP
-----
1. pip install -r requirements.txt
2. Set environment variables:
     ANTHROPIC_API_KEY   - your Claude API key
     SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL   - only for --send
3. Edit the CADENCE and BUSINESS_CONTEXT sections below to match your business.
"""

import os
import sys
import sqlite3
import smtplib
import argparse
from datetime import datetime, timedelta
from email.mime.text import MIMEText

# ── CONFIG ──────────────────────────────────────────────────────────────

DB_PATH = os.environ.get("FOLLOWUP_DB", "followups.db")

# Which Claude model drafts the emails. Short emails don't need a big model,
# so Sonnet is the default; set FOLLOWUP_MODEL=claude-opus-5 for the strongest
# writing, or claude-haiku-4-5 for the cheapest.
MODEL = os.environ.get("FOLLOWUP_MODEL", "claude-sonnet-4-6")

# How many days after the LAST contact each stage should fire.
# Add/remove stages freely. Stage index = number of follow-ups already sent.
CADENCE = {
    "lead":  [1, 3, 7, 14],     # e.g. day 1, day 3, day 7, day 14 after no response
    "quote": [2, 5, 10],        # quotes tend to need fewer, tighter nudges
}

BUSINESS_CONTEXT = """
You are writing short, warm, non-pushy follow-up emails on behalf of a
small AI consulting business that helps companies implement AI into their
daily operations (training workshops, project-based implementation, and
retainers). Tone: helpful expert, not salesy. Keep emails under 120 words.
No corporate fluff, no excessive exclamation points, no "just circling back"
clichés.
"""

# Appended verbatim to every email. Claude is told not to write a sign-off,
# so put your name / phone / booking link here.
SIGNATURE = os.environ.get("FOLLOWUP_SIGNATURE", "")

VALID_STATUSES = ("active", "responded", "closed", "dead")

# How the tone should shift as the sequence progresses.
TONE_BY_POSITION = [
    "gentle, low-friction check-in — assume they're just busy",
    "add one concrete piece of value or a specific next step",
    "shorter and lighter; make it easy to say 'not now'",
    "final touch — offer to close the loop and stop following up",
]

# ── DB SETUP ────────────────────────────────────────────────────────────

SCHEMA = """
CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,              -- 'lead' or 'quote'
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    notes TEXT,                      -- context: what they asked about, quote amount, etc.
    stage INTEGER DEFAULT 0,         -- how many follow-ups already sent
    status TEXT DEFAULT 'active',    -- active / responded / closed / dead
    last_contact TEXT NOT NULL,      -- ISO date of last touch
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
"""


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row      # access columns by name, not position
    conn.executescript(SCHEMA)
    conn.commit()
    return conn


def now_iso():
    return datetime.now().isoformat(timespec="seconds")


def add_contact(ctype, name, email, company, notes):
    conn = get_db()
    try:
        dup = conn.execute(
            "SELECT id FROM contacts WHERE email = ? AND type = ? AND status = 'active'",
            (email, ctype),
        ).fetchone()
        if dup:
            print(f"Heads up: {email} already has an active {ctype} (id {dup['id']}). "
                  f"Adding anyway — mark the old one closed if it's stale.")
        stamp = now_iso()
        cur = conn.execute(
            "INSERT INTO contacts (type, name, email, company, notes, stage, status, last_contact, created_at) "
            "VALUES (?,?,?,?,?,0,'active',?,?)",
            (ctype, name, email, company, notes, stamp, stamp),
        )
        conn.commit()
        print(f"Added {ctype} #{cur.lastrowid}: {name} <{email}>")
    finally:
        conn.close()


def set_status(contact_id, status):
    """Stop (or resume) the sequence for one contact."""
    if status not in VALID_STATUSES:
        print(f"Unknown status {status!r}. Use one of: {', '.join(VALID_STATUSES)}", file=sys.stderr)
        return False
    conn = get_db()
    try:
        cur = conn.execute("UPDATE contacts SET status = ? WHERE id = ?", (status, contact_id))
        conn.commit()
        if cur.rowcount == 0:
            print(f"No contact with id {contact_id}.", file=sys.stderr)
            return False
        print(f"Contact {contact_id} marked '{status}'.")
        return True
    finally:
        conn.close()


def list_contacts():
    conn = get_db()
    rows = conn.execute(
        "SELECT id, type, name, email, stage, status, last_contact FROM contacts "
        "ORDER BY type, last_contact"
    ).fetchall()
    conn.close()
    if not rows:
        print("Pipeline is empty.")
        return
    print(f"{'ID':<4}{'Type':<7}{'Name':<20}{'Email':<28}{'Stage':<8}{'Status':<10}{'Last Contact'}")
    for r in rows:
        total = len(CADENCE.get(r["type"], []))
        stage = f"{r['stage']}/{total}"
        print(f"{r['id']:<4}{r['type']:<7}{r['name'][:19]:<20}{r['email'][:27]:<28}"
              f"{stage:<8}{r['status']:<10}{r['last_contact'][:10]}")


# ── DUE-CHECK LOGIC ─────────────────────────────────────────────────────

def get_due_contacts(now=None):
    """Return contacts whose next cadence day has passed and haven't responded/closed."""
    now = now or datetime.now()
    conn = get_db()
    rows = conn.execute("SELECT * FROM contacts WHERE status = 'active' ORDER BY id").fetchall()
    conn.close()

    due = []
    for row in rows:
        cadence = CADENCE.get(row["type"], [])
        if row["stage"] >= len(cadence):
            continue  # exhausted the sequence — leave it for manual follow-up
        try:
            last = datetime.fromisoformat(row["last_contact"])
        except ValueError:
            print(f"Skipping id {row['id']}: unreadable last_contact "
                  f"{row['last_contact']!r}", file=sys.stderr)
            continue
        if now >= last + timedelta(days=cadence[row["stage"]]):
            due.append(dict(row))
    return due


# ── AI DRAFTING ─────────────────────────────────────────────────────────

_client = None


def get_client():
    """Lazily build the Anthropic client so `list`/`add-*` work without an API key."""
    global _client
    if _client is None:
        from anthropic import Anthropic
        _client = Anthropic()  # reads ANTHROPIC_API_KEY from env
    return _client


def draft_email(contact):
    """Use Claude to draft a follow-up email tailored to this contact/stage."""
    attempt = contact["stage"] + 1
    total = len(CADENCE.get(contact["type"], []))
    tone = TONE_BY_POSITION[min(contact["stage"], len(TONE_BY_POSITION) - 1)]

    prompt = f"""Write follow-up email #{attempt} of {total} to this contact:
- Name: {contact['name']}
- Company: {contact.get('company') or 'N/A'}
- Type: {contact['type']} (lead = hasn't bought yet, quote = sent them a proposal/quote already)
- Context/notes: {contact.get('notes') or 'No additional notes.'}
- Days since last contact: {days_since(contact['last_contact'])}
- Tone for this attempt: {tone}

Return ONLY the email body text (no subject line, no preamble, no sign-off or
signature block — a signature is appended automatically)."""

    response = get_client().messages.create(
        model=MODEL,
        max_tokens=1000,
        system=BUSINESS_CONTEXT.strip(),
        messages=[{"role": "user", "content": prompt}],
    )
    # response.content is a list of blocks; only concatenate the text ones.
    body = "".join(b.text for b in response.content if b.type == "text").strip()
    if not body:
        raise RuntimeError("Claude returned no text content")
    if SIGNATURE:
        body += "\n\n" + SIGNATURE
    return body


def days_since(iso_timestamp):
    try:
        delta = datetime.now() - datetime.fromisoformat(iso_timestamp)
    except ValueError:
        return "unknown"
    return max(delta.days, 0)


def draft_subject(contact):
    stage = contact["stage"]
    if contact["type"] == "quote":
        subjects = ["Following up on your quote", "Any questions on the proposal?",
                    "Checking in before I close this out"]
    else:
        subjects = ["Quick follow-up", "Still thinking about AI in your workflow?",
                    "One last check-in"]
    return subjects[min(stage, len(subjects) - 1)]


# ── SENDING ─────────────────────────────────────────────────────────────

def smtp_config():
    """Read + validate SMTP settings up front so a run fails before spending API calls."""
    missing = [v for v in ("SMTP_HOST", "SMTP_USER", "SMTP_PASS") if not os.environ.get(v)]
    if missing:
        raise RuntimeError("Missing SMTP environment variables: " + ", ".join(missing))
    user = os.environ["SMTP_USER"]
    return {
        "host": os.environ["SMTP_HOST"],
        "port": int(os.environ.get("SMTP_PORT", 587)),
        "user": user,
        "password": os.environ["SMTP_PASS"],
        "from_email": os.environ.get("FROM_EMAIL", user),
    }


def send_email(to_email, subject, body, cfg=None):
    cfg = cfg or smtp_config()

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = cfg["from_email"]
    msg["To"] = to_email

    with smtplib.SMTP(cfg["host"], cfg["port"]) as server:
        server.starttls()
        server.login(cfg["user"], cfg["password"])
        server.sendmail(cfg["from_email"], [to_email], msg.as_string())


def mark_followed_up(contact_id):
    conn = get_db()
    try:
        conn.execute(
            "UPDATE contacts SET stage = stage + 1, last_contact = ? WHERE id = ?",
            (now_iso(), contact_id),
        )
        conn.commit()
    finally:
        conn.close()


# ── MAIN RUN ────────────────────────────────────────────────────────────

def run(send=False, advance=False):
    """Process everything due. Returns a process exit code."""
    due = get_due_contacts()
    if not due:
        print("Nothing due today.")
        return 0

    # Fail fast on bad SMTP config, before burning API calls on drafts.
    cfg = None
    if send:
        try:
            cfg = smtp_config()
        except RuntimeError as e:
            print(f"✗ {e}", file=sys.stderr)
            return 1

    print(f"{len(due)} contact(s) due for follow-up.\n")
    failures = 0
    for c in due:
        subject = draft_subject(c)
        try:
            body = draft_email(c)
        except Exception as e:
            print(f"✗ Could not draft for {c['email']}: {e}\n", file=sys.stderr)
            failures += 1
            continue

        print("=" * 60)
        print(f"To: {c['name']} <{c['email']}>  [{c['type']}, stage {c['stage'] + 1}]")
        print(f"Subject: {subject}")
        print("-" * 60)
        print(body)
        print("=" * 60)

        if send:
            try:
                send_email(c["email"], subject, body, cfg)
                mark_followed_up(c["id"])
                print("✓ Sent and logged.\n")
            except Exception as e:
                failures += 1
                print(f"✗ Failed to send to {c['email']}: {e}\n", file=sys.stderr)
        elif advance:
            mark_followed_up(c["id"])
            print("✓ Drafted; stage advanced (nothing emailed).\n")
        else:
            print("✓ Drafted — not sent, stage unchanged. Use --send to email it.\n")

    if failures:
        print(f"{failures} of {len(due)} follow-up(s) failed.", file=sys.stderr)
        return 1
    return 0


# ── CLI ─────────────────────────────────────────────────────────────────

def build_parser():
    parser = argparse.ArgumentParser(description="AI lead & quote follow-up automation")
    sub = parser.add_subparsers(dest="cmd")

    for cmd, label in (("add-lead", "lead"), ("add-quote", "quote")):
        p = sub.add_parser(cmd, help=f"Add a new {label} to the pipeline")
        p.add_argument("--name", required=True)
        p.add_argument("--email", required=True)
        p.add_argument("--company", default="")
        p.add_argument("--notes", default="", help="What they asked about, quote amount, etc.")

    p_run = sub.add_parser("run", help="Draft (and optionally send) everything that's due")
    p_run.add_argument("--send", action="store_true",
                       help="Actually send emails instead of just drafting")
    p_run.add_argument("--advance", action="store_true",
                       help="Without --send, still advance the stage (for testing the cadence)")

    sub.add_parser("list", help="Show the whole pipeline")

    p_status = sub.add_parser("status", help="Mark a contact responded/closed/dead")
    p_status.add_argument("--id", type=int, required=True)
    p_status.add_argument("--set", dest="new_status", required=True, choices=VALID_STATUSES)

    return parser


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.cmd == "add-lead":
        add_contact("lead", args.name, args.email, args.company, args.notes)
    elif args.cmd == "add-quote":
        add_contact("quote", args.name, args.email, args.company, args.notes)
    elif args.cmd == "run":
        return run(send=args.send, advance=args.advance)
    elif args.cmd == "list":
        list_contacts()
    elif args.cmd == "status":
        return 0 if set_status(args.id, args.new_status) else 1
    else:
        parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
