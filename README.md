# AI Email Reader & Responder

Reads unread emails from an IMAP inbox, uses Claude to draft replies, and
saves the drafts back to the mailbox (via IMAP APPEND to the "Drafts"
folder) for you to review and send manually.

It does **not** auto-send anything by default — a bad AI response can't go
out without a human checking it first.

## Setup

1. Install dependencies:

   ```
   pip install -r requirements.txt
   ```

2. Set environment variables (don't hardcode credentials):

   | Variable | Description |
   |---|---|
   | `EMAIL_ADDRESS` | Your email address |
   | `EMAIL_APP_PASSWORD` | An app-specific password (Gmail: Google Account > Security > 2-Step Verification > App Passwords) |
   | `ANTHROPIC_API_KEY` | Your Anthropic API key |
   | `IMAP_SERVER` | e.g. `imap.gmail.com` |
   | `SMTP_SERVER` | e.g. `smtp.gmail.com` (used only if `AUTO_SEND` is enabled) |

3. Run:

   ```
   python ai_email_reader.py
   ```

## Customize

- Edit `SYSTEM_PROMPT` in `ai_email_reader.py` to match your tone/business context.
- Change `MAX_EMAILS` to control how many unread emails get processed per run.
- Set `AUTO_SEND = True` only if you're confident and want live sending (off by default for safety).
