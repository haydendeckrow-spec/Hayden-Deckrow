#!/usr/bin/env python3
"""Tests for the cadence / state logic. No API key or SMTP needed.

Run with:  python -m unittest -v
"""

import os
import tempfile
import unittest
from datetime import datetime, timedelta

import followup_automation as fa


class BaseDBTest(unittest.TestCase):
    def setUp(self):
        fd, self.db_path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        self._orig_db = fa.DB_PATH
        fa.DB_PATH = self.db_path

    def tearDown(self):
        fa.DB_PATH = self._orig_db
        os.unlink(self.db_path)

    def backdate(self, contact_id, days):
        """Pretend the last touch happened `days` ago."""
        conn = fa.get_db()
        conn.execute(
            "UPDATE contacts SET last_contact = ? WHERE id = ?",
            ((datetime.now() - timedelta(days=days)).isoformat(timespec="seconds"), contact_id),
        )
        conn.commit()
        conn.close()


class DueLogicTests(BaseDBTest):
    def test_new_lead_is_not_due_immediately(self):
        fa.add_contact("lead", "Ada", "ada@example.com", "Acme", "wants a workshop")
        self.assertEqual(fa.get_due_contacts(), [])

    def test_lead_becomes_due_after_first_cadence_day(self):
        fa.add_contact("lead", "Ada", "ada@example.com", "Acme", "")
        self.backdate(1, days=2)  # cadence["lead"][0] == 1
        due = fa.get_due_contacts()
        self.assertEqual([c["email"] for c in due], ["ada@example.com"])

    def test_quote_waits_longer_than_a_lead(self):
        fa.add_contact("quote", "Grace", "grace@example.com", "Navy", "$8k proposal")
        self.backdate(1, days=1)  # cadence["quote"][0] == 2
        self.assertEqual(fa.get_due_contacts(), [])
        self.backdate(1, days=3)
        self.assertEqual(len(fa.get_due_contacts()), 1)

    def test_responded_contacts_are_never_due(self):
        fa.add_contact("lead", "Ada", "ada@example.com", "Acme", "")
        self.backdate(1, days=30)
        fa.set_status(1, "responded")
        self.assertEqual(fa.get_due_contacts(), [])

    def test_exhausted_sequence_stops_firing(self):
        fa.add_contact("quote", "Grace", "grace@example.com", "Navy", "")
        for _ in range(len(fa.CADENCE["quote"])):
            fa.mark_followed_up(1)
        self.backdate(1, days=365)
        self.assertEqual(fa.get_due_contacts(), [])

    def test_unreadable_last_contact_is_skipped_not_fatal(self):
        fa.add_contact("lead", "Ada", "ada@example.com", "Acme", "")
        conn = fa.get_db()
        conn.execute("UPDATE contacts SET last_contact = 'not-a-date' WHERE id = 1")
        conn.commit()
        conn.close()
        self.assertEqual(fa.get_due_contacts(), [])


class StateTests(BaseDBTest):
    def test_mark_followed_up_advances_stage_and_resets_clock(self):
        fa.add_contact("lead", "Ada", "ada@example.com", "Acme", "")
        self.backdate(1, days=10)
        fa.mark_followed_up(1)

        conn = fa.get_db()
        row = conn.execute("SELECT stage, last_contact FROM contacts WHERE id = 1").fetchone()
        conn.close()

        self.assertEqual(row["stage"], 1)
        self.assertLess(datetime.now() - datetime.fromisoformat(row["last_contact"]),
                        timedelta(minutes=1))
        # Freshly touched, so the next stage isn't due yet.
        self.assertEqual(fa.get_due_contacts(), [])

    def test_set_status_rejects_unknown_values(self):
        fa.add_contact("lead", "Ada", "ada@example.com", "Acme", "")
        self.assertFalse(fa.set_status(1, "maybe-later"))
        self.assertFalse(fa.set_status(999, "closed"))

    def test_run_without_send_does_not_touch_state(self):
        """Preview mode must not burn a cadence step."""
        fa.add_contact("lead", "Ada", "ada@example.com", "Acme", "")
        self.backdate(1, days=5)

        calls = []
        orig = fa.draft_email
        fa.draft_email = lambda c: calls.append(c["id"]) or "drafted body"
        try:
            self.assertEqual(fa.run(send=False), 0)
        finally:
            fa.draft_email = orig

        self.assertEqual(calls, [1])
        conn = fa.get_db()
        stage = conn.execute("SELECT stage FROM contacts WHERE id = 1").fetchone()["stage"]
        conn.close()
        self.assertEqual(stage, 0)
        self.assertEqual(len(fa.get_due_contacts()), 1)  # still due


class SubjectTests(unittest.TestCase):
    def test_subject_differs_by_type(self):
        lead = fa.draft_subject({"type": "lead", "stage": 0})
        quote = fa.draft_subject({"type": "quote", "stage": 0})
        self.assertNotEqual(lead, quote)

    def test_subject_does_not_overrun_the_list(self):
        self.assertIsInstance(fa.draft_subject({"type": "quote", "stage": 99}), str)


if __name__ == "__main__":
    unittest.main()
