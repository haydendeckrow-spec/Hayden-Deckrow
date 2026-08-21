"""
Personal & School AI Assistant
-------------------------------
An interactive command-line assistant for everyday tasks and schoolwork:
  - Tracks to-dos, class assignments (with due dates), and quick notes
    locally in JSON files (no account, no cloud sync).
  - Uses Claude for homework help, study plans, and explanations.

SETUP
-----
1. pip install -r requirements.txt
2. Set the ANTHROPIC_API_KEY environment variable.
3. Run: python assistant.py

COMMANDS
--------
  task add <text>            add a to-do
  task list                  list open to-dos
  task done <id>              mark a to-do complete
  task remove <id>            delete a to-do

  assign add <course> | <title> | <YYYY-MM-DD>   add a school assignment
  assign list                 list assignments, soonest due first
  assign done <id>             mark an assignment complete

  note add <text>             save a quick note
  note list                   list saved notes

  agenda                      today's date + due-soon assignments + open tasks

  ask <question>               ask Claude anything (general help)
  explain <concept>            get a clear, step-by-step explanation
  study <topic>                get a short study plan + practice questions

  help                         show this list
  quit / exit                  leave the assistant
"""

import os
import sys
import json
import uuid
from datetime import datetime, date

import anthropic

# ---------- CONFIG ----------
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
MODEL = os.environ.get("ASSISTANT_MODEL", "claude-sonnet-5")

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
TASKS_FILE = os.path.join(DATA_DIR, "tasks.json")
ASSIGNMENTS_FILE = os.path.join(DATA_DIR, "assignments.json")
NOTES_FILE = os.path.join(DATA_DIR, "notes.json")

TUTOR_SYSTEM_PROMPT = """You are a patient, encouraging study assistant helping a student \
with schoolwork and everyday questions.
- Explain concepts clearly and step by step; don't just give final answers to \
  problems that look like homework -- show the reasoning so the student learns it.
- Keep answers focused and readable (use short paragraphs or bullet points).
- If a question is ambiguous, ask a brief clarifying question instead of guessing.
- For study plans, break the topic into a short list of subtopics and include a \
  handful of practice questions (without answers) at the end.
"""

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


# ---------- STORAGE ----------
def _load(path):
    if not os.path.exists(path):
        return []
    with open(path, "r") as f:
        return json.load(f)


def _save(path, items):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(path, "w") as f:
        json.dump(items, f, indent=2)


def new_id():
    return uuid.uuid4().hex[:8]


# ---------- TASKS ----------
def task_add(text):
    tasks = _load(TASKS_FILE)
    tasks.append({"id": new_id(), "text": text, "done": False})
    _save(TASKS_FILE, tasks)
    print(f"Added task.")


def task_list():
    tasks = [t for t in _load(TASKS_FILE) if not t["done"]]
    if not tasks:
        print("No open tasks.")
        return
    for t in tasks:
        print(f"  [{t['id']}] {t['text']}")


def task_done(task_id):
    tasks = _load(TASKS_FILE)
    for t in tasks:
        if t["id"] == task_id:
            t["done"] = True
            _save(TASKS_FILE, tasks)
            print("Marked done.")
            return
    print("No task with that id.")


def task_remove(task_id):
    tasks = _load(TASKS_FILE)
    remaining = [t for t in tasks if t["id"] != task_id]
    if len(remaining) == len(tasks):
        print("No task with that id.")
        return
    _save(TASKS_FILE, remaining)
    print("Removed task.")


# ---------- ASSIGNMENTS ----------
def assign_add(course, title, due_str):
    try:
        datetime.strptime(due_str, "%Y-%m-%d")
    except ValueError:
        print("Due date must be in YYYY-MM-DD format.")
        return
    assignments = _load(ASSIGNMENTS_FILE)
    assignments.append({
        "id": new_id(),
        "course": course,
        "title": title,
        "due": due_str,
        "done": False,
    })
    _save(ASSIGNMENTS_FILE, assignments)
    print("Added assignment.")


def assign_list():
    assignments = [a for a in _load(ASSIGNMENTS_FILE) if not a["done"]]
    if not assignments:
        print("No open assignments.")
        return
    assignments.sort(key=lambda a: a["due"])
    today = date.today().isoformat()
    for a in assignments:
        flag = " (OVERDUE)" if a["due"] < today else ""
        print(f"  [{a['id']}] {a['due']}{flag} - {a['course']}: {a['title']}")


def assign_done(assignment_id):
    assignments = _load(ASSIGNMENTS_FILE)
    for a in assignments:
        if a["id"] == assignment_id:
            a["done"] = True
            _save(ASSIGNMENTS_FILE, assignments)
            print("Marked done.")
            return
    print("No assignment with that id.")


# ---------- NOTES ----------
def note_add(text):
    notes = _load(NOTES_FILE)
    notes.append({"id": new_id(), "text": text, "created": datetime.now().isoformat(timespec="minutes")})
    _save(NOTES_FILE, notes)
    print("Saved note.")


def note_list():
    notes = _load(NOTES_FILE)
    if not notes:
        print("No notes yet.")
        return
    for n in notes:
        print(f"  [{n['id']}] ({n['created']}) {n['text']}")


# ---------- AGENDA ----------
def agenda():
    today = date.today()
    print(f"Today: {today.isoformat()}\n")

    assignments = [a for a in _load(ASSIGNMENTS_FILE) if not a["done"]]
    assignments.sort(key=lambda a: a["due"])
    due_soon = [a for a in assignments if (datetime.strptime(a["due"], "%Y-%m-%d").date() - today).days <= 7]

    print("Due this week:")
    if not due_soon:
        print("  Nothing due soon.")
    else:
        for a in due_soon:
            flag = " (OVERDUE)" if a["due"] < today.isoformat() else ""
            print(f"  [{a['id']}] {a['due']}{flag} - {a['course']}: {a['title']}")

    print("\nOpen tasks:")
    task_list()


# ---------- CLAUDE-POWERED HELP ----------
def ask_claude(system_prompt, user_message):
    response = client.messages.create(
        model=MODEL,
        max_tokens=800,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return response.content[0].text


def cmd_ask(question):
    print(ask_claude(TUTOR_SYSTEM_PROMPT, question))


def cmd_explain(concept):
    prompt = f"Explain this clearly, step by step, for a student who is learning it for the first time: {concept}"
    print(ask_claude(TUTOR_SYSTEM_PROMPT, prompt))


def cmd_study(topic):
    prompt = (
        f"Create a short study plan for the topic '{topic}': list the key subtopics "
        "in a sensible learning order, then give 4-6 practice questions (no answers) "
        "to test understanding."
    )
    print(ask_claude(TUTOR_SYSTEM_PROMPT, prompt))


# ---------- REPL ----------
def print_help():
    print(__doc__)


def dispatch(line):
    parts = line.strip().split(maxsplit=1)
    if not parts:
        return
    cmd = parts[0].lower()
    rest = parts[1] if len(parts) > 1 else ""

    if cmd in ("quit", "exit"):
        return False

    elif cmd == "help":
        print_help()

    elif cmd == "task":
        sub, _, arg = rest.partition(" ")
        if sub == "add" and arg:
            task_add(arg.strip())
        elif sub == "list":
            task_list()
        elif sub == "done" and arg:
            task_done(arg.strip())
        elif sub == "remove" and arg:
            task_remove(arg.strip())
        else:
            print("Usage: task add <text> | task list | task done <id> | task remove <id>")

    elif cmd == "assign":
        sub, _, arg = rest.partition(" ")
        if sub == "add" and arg:
            fields = [f.strip() for f in arg.split("|")]
            if len(fields) != 3:
                print("Usage: assign add <course> | <title> | <YYYY-MM-DD>")
            else:
                assign_add(*fields)
        elif sub == "list":
            assign_list()
        elif sub == "done" and arg:
            assign_done(arg.strip())
        else:
            print("Usage: assign add <course> | <title> | <YYYY-MM-DD> | assign list | assign done <id>")

    elif cmd == "note":
        sub, _, arg = rest.partition(" ")
        if sub == "add" and arg:
            note_add(arg.strip())
        elif sub == "list":
            note_list()
        else:
            print("Usage: note add <text> | note list")

    elif cmd == "agenda":
        agenda()

    elif cmd == "ask" and rest:
        cmd_ask(rest)

    elif cmd == "explain" and rest:
        cmd_explain(rest)

    elif cmd == "study" and rest:
        cmd_study(rest)

    else:
        print("Unrecognized command. Type 'help' for the command list.")

    return True


def main():
    print("Personal & School Assistant -- type 'help' for commands, 'quit' to exit.\n")
    while True:
        try:
            line = input("> ")
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not dispatch(line):
            break


if __name__ == "__main__":
    main()
