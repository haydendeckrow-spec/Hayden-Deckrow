# AI Follow-Up Automation — Leads & Quotes

Tracks leads and quotes in a local SQLite database, works out who is due for a
follow-up based on a configurable cadence, uses Claude to draft a personalised
email for each one, and sends it.

Built to run unattended on a schedule (cron / Task Scheduler).

## Setup

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
```

For sending (only needed with `--send`):

```bash
export SMTP_HOST=smtp.example.com
export SMTP_PORT=587          # optional, defaults to 587
export SMTP_USER=you@example.com
export SMTP_PASS=...
export FROM_EMAIL=you@example.com   # optional, defaults to SMTP_USER
```

Optional:

| Variable | Default | Purpose |
| --- | --- | --- |
| `FOLLOWUP_DB` | `followups.db` | Where the pipeline database lives |
| `FOLLOWUP_MODEL` | `claude-sonnet-4-6` | Model that writes the emails |
| `FOLLOWUP_SIGNATURE` | *(empty)* | Sign-off appended verbatim to every email |

Then edit `CADENCE` and `BUSINESS_CONTEXT` at the top of
`followup_automation.py` to match your business.

## Usage

```bash
# Add to the pipeline
python followup_automation.py add-lead  --name "Ada Lovelace" --email ada@acme.com \
    --company Acme --notes "asked about a team workshop"
python followup_automation.py add-quote --name "Grace Hopper" --email grace@navy.mil \
    --company Navy --notes "\$8k implementation quote, sent 12 Aug"

# See everything
python followup_automation.py list

# Preview what would go out — drafts only, changes nothing
python followup_automation.py run

# Draft and actually send
python followup_automation.py run --send

# Someone replied? Take them out of the sequence
python followup_automation.py status --id 3 --set responded
```

`status` accepts `active`, `responded`, `closed`, `dead`. **Marking replies is
the one manual step that matters** — the script has no inbox access, so anyone
left `active` keeps getting follow-ups until their cadence runs out.

## How the cadence works

`CADENCE` maps each contact type to the days after the *last contact* that each
follow-up should fire:

```python
CADENCE = {
    "lead":  [1, 3, 7, 14],
    "quote": [2, 5, 10],
}
```

`stage` counts how many follow-ups have already been sent, so it doubles as the
index into that list. Every send bumps `stage` and resets `last_contact`, which
restarts the clock for the next entry. Once `stage` runs off the end of the
list, the contact stops appearing in `run` — the sequence is finished and it's
yours to handle manually.

### Sending is what advances the cadence

`run` on its own drafts and prints; it does not email anyone and does not touch
the database, so you can preview freely without burning a step. Only `--send`
advances `stage`, and only after the message is actually accepted by the SMTP
server — a send that fails is retried on the next run rather than silently
skipped. (`run --advance` advances without emailing, for testing a cadence.)

## Scheduling

Once a day is plenty — the cadence is measured in days:

```cron
0 9 * * 1-5 cd /path/to/repo && /usr/bin/python3 followup_automation.py run --send >> followup.log 2>&1
```

The script exits `1` if any draft or send failed, so cron will surface problems.

## Tests

```bash
python -m unittest -v
```

Covers the cadence and state logic — due-date calculation, stage advancement,
status handling, and that preview mode leaves the database alone. No API key or
SMTP server needed; the drafting call is stubbed.
