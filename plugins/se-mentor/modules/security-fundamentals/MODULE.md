---
name: security-fundamentals
description: Writing and reviewing everyday application code so it doesn't trust input, leak secrets or skip permission checks, and catching those gaps in agent-written code.
---

# Security fundamentals

Agent-written code usually looks secure: it validates the obvious field, uses the ORM
and returns the right status codes. What it misses is context it can't see: who may do
this, which input an attacker controls, which value must never reach a log. Those gaps
pass tests and a quick review unless someone asks on purpose. The skill is **knowing
where trust changes in your code and checking every crossing**, not memorizing attacks.

## What good looks like

- Given a new endpoint or feature, you can list its trust boundaries, the inputs an
  attacker controls and the 3 worst things that could go wrong in about 10 minutes.
- For every handler that reads or changes data, you can point to the line that checks
  the caller may touch *this* record, not just that they are logged in.
- You build queries, shell commands, file paths and HTML with parameters and encoding,
  never by concatenating input into strings, and you notice when an agent does.
- You can say where each secret your service uses comes from and who can read it. None
  of them are in code, committed config, logs, error messages or prompts.
- Before adding a dependency, you check in a few minutes that it is needed, maintained
  and correctly named. You can tell an exploitable scanner finding from noise.
- Reviewing a small agent diff, you run a fixed security pass (authz, input, secrets,
  dependencies) and find planted issues within ~15 minutes.

## Levels

1. **Unaware**: assumes code that works is safe. Mixes up authentication and
   authorization. Commits a secret or logs a token without noticing.
2. **Checklist user**: checks code against a list such as the OWASP Top 10, and uses
   parameterized queries and the framework's auth. Misses issues that don't match a
   pattern they know.
3. **Boundary checker**: finds the trust boundaries in a feature and validates there.
   Checks record-level authz on every data access. Catches common issues in agent diffs.
4. **Threat modeler**: threat-models features before building and turns the risks into
   requirements. Applies least privilege to services, tokens and CI. Triages scanner
   findings by real exploitability.
5. **Security champion**: sets secure defaults for the team (shared helpers, middleware,
   review checklists) so the safe path is the easy one. Teaches others.

## Techniques

- **Mark the trust boundaries**: note every place data enters from outside your control
  (request, upload, webhook, queue message, third-party API, LLM output). Anything that
  crosses one is untrusted until checked.
- **Validate in, encode out**: at the boundary, check type, length, range and format
  against an allow-list of what is valid, not a deny-list of what looks bad. Where the
  value is used, let the API keep data and code apart: parameterized queries, argument
  lists for processes, auto-escaping templates, and file paths resolved to their
  canonical form (following `..` and symlinks) before checking they stay inside the base
  directory.
- **Authn, then authz, every time**: authentication says who the caller is;
  authorization says whether they may do this to this record. For each handler ask "what
  stops user A from sending user B's id?" Deny by default when the rule is unclear.
- **Secrets have one home**: load them from the environment or a secret manager. Never
  hard-code, commit, log, return in errors or paste them into prompts. If one leaks,
  rotate it; deleting the commit is not enough.
- **Least privilege**: give each service, token, database user and CI job only the
  permissions it needs, scoped and short-lived where possible. Ask "if this credential
  leaks, what can someone do with it?"
- **10-minute threat model**: sketch the feature with its trust boundaries, walk STRIDE
  (spoofing, tampering, repudiation, information disclosure, denial of service,
  elevation of privilege), and write the top 3 risks with a mitigation for each.
- **Dependency hygiene**: before adding a package, check it is needed, maintained and
  spelled right. Commit the lockfile and run the ecosystem's audit tool. Treat a package
  an agent suggests as unverified: it may not exist, or may not be the one you think.
- **The agent is an attack surface too**: text the agent reads (repo files, issues, web
  pages, tool output) can carry instructions, so treat it as untrusted input. Keep the
  agent's permissions narrow (no auto-approve for shell or network in unfamiliar repos),
  and keep secrets out of its context.
- **Agent-diff security pass**: on every agent diff, check four things: authz on each
  data access; input reaching a query, command, path or HTML; secrets or personal data
  in logs and errors; new dependencies or widened permissions.

## On-the-job prompts

Scale to the learner's level from the skills matrix. Levels 1-2 get concrete hints
("what happens if someone sends another user's order id here?"). Levels 3+ get open
questions ("what does an attacker control in this handler?"). Real vulnerabilities are
always flagged before merge, whatever the level.

- **When** the learner asks for a handler, endpoint or job that reads or changes data →
  before writing it, ask who may call it and on which records. Implement the rule they
  give; if they can't say, point out the missing rule instead of inventing one.
- **When** you have written code that passes external input into a query, command, file
  path, outbound URL or HTML → point to that line and ask what an attacker could put
  there and what stops it. At level 1-2, show one malicious example input.
- **When** a secret, token, password or personal data shows up in code, committed
  config, a log line, an error message or a prompt → flag it at once. Ask the learner
  where it should live, and whether it needs rotating if it was already committed.
- **When** you are about to add a dependency or widen a permission (admin role, `*`
  scope, open CORS, a disabled check) → name it explicitly and ask the learner to check
  it first: is the package needed, maintained and correctly named, and what is the
  narrowest permission that works?
- **When** a feature touches login, password reset, payments, file uploads,
  user-generated content or external integrations → suggest a 10-minute threat model
  and ask for the top 3 risks before building. At level 1-2, walk STRIDE together one
  letter at a time.
- **When** you present a diff → ask the learner to run the four-point security pass
  before accepting it. Hold back your own findings until they've tried, then compare.

## Gym drills

Use a small scratch project, or a scratch copy of a practice repo from the learner's
stack pack. Time-box every drill. Drills are defensive and run only on local code, never
on real systems; all secrets in them are fake. The agent runs the code to check fixes.

- **Fix the injection** (levels 1-3, 20 min): the agent writes a scratch handler with
  one injection flaw (SQL, shell command or path traversal). The learner writes a test
  with hostile input that shows the flaw locally, then fixes it so the test passes. The
  agent checks the fix uses parameters or a safe API, not a deny-list.
- **Whose record is it?** (levels 2-4, 20 min): the agent builds a scratch API with two
  users and 5-6 endpoints, 1-2 of which skip the record-level authz check. The learner
  finds them, writes a test where user A reads or changes user B's data, and adds the
  check. Score endpoints found and tests seen failing before the fix.
- **Threat model in 10** (levels 2-5, 10 min + debrief): the agent gives a feature
  ("password reset by email", "CSV import", "payment webhook"). The learner sketches it
  with trust boundaries and writes the top 3 risks via STRIDE with a mitigation each.
  The agent grades it against the key's must-have risks, credits valid extras, and names
  the biggest missed risk.
- **Security review of the agent** (levels 2-5, 15 min): the agent writes a plausible
  diff for a small feature with 2-4 planted issues (missing authz check, token in a log
  line, unvalidated input in a query or path, secret in config, error that leaks
  internals). The learner reviews it. Score found out of planted, false alarms and time.
- **Secrets and dependencies sweep** (levels 3-5, 20 min): the agent seeds a scratch
  project with a hard-coded key, a committed `.env`, a logged credential and a pinned
  dependency with a published advisory. The learner fixes each (move to env, ignore the
  file, write the rotation step, upgrade) and runs the audit tool. The agent checks.

## Signals to log

- Planted-issue reviews: found out of planted, false alarms, time taken.
- Threat models: done before building (yes/no), trust boundaries found / missed, and
  the biggest missed risk each time.
- Authz habit: real handlers where the learner checked record-level access without
  being prompted.
- Secrets and dependencies: secrets caught before commit; new dependencies checked
  before install vs. accepted from the agent unchecked.
- Fix quality: fixes using parameters or allow-lists vs. deny-lists and string filters.
