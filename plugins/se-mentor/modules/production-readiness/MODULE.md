---
name: production-readiness
description: Writing code that survives production. It can be observed, it fails in known ways, it can be turned off or rolled back, and you stay calm when it breaks anyway.
---

# Production readiness

Agents write the happy path well. They are much weaker at what only matters later: what
gets logged, what happens when a dependency hangs, how to switch a change off. Code
that passes every test can still take a system down. The skill is **asking "how will
this fail, how will we know, and how do we undo it?" before you ship, and working
methodically when it fails anyway**.

## What good looks like

- Before shipping a change, you can say in about 5 minutes how it fails, how we'd know
  (which log, metric or alert), and how we undo it (flag, rollback, reverse migration).
- Every network call you add has a timeout and a deliberate retry decision, and you can
  say whether the operation is safe to run twice.
- Given a complaint and a request id, you find what happened to it in the logs in under
  5 minutes. Your logs are structured, carry a correlation id, and hold no secrets.
- You can name the 2-3 numbers that say whether your feature is healthy (rate, errors,
  latency) and where to find them.
- Config and secrets come from the environment, not the code. Risky behavior ships
  behind a flag that can be turned off without a deploy.
- In an incident, you read dashboards and logs, state a hypothesis, and push for a
  mitigation (rollback, flag off) within about 15 minutes, before chasing root cause.
  Afterwards you write a blameless postmortem with a timeline and 2-4 concrete actions.

## Levels

1. **Works on my machine**: ships the happy path. Errors are swallowed or logged as
   "error occurred". Has no idea how the code would be observed or undone.
2. **Logger**: adds logs and error handling when reminded. Follows the codebase's
   patterns for timeouts and config. Reads logs in an incident when pointed to them.
3. **Failure planner**: asks how a change fails, how we'd know and how to undo it before
   shipping. Sets timeouts, bounded retries and idempotency on their own.
4. **Operator**: designs for degradation (fallbacks, circuit breakers). Defines metrics
   and alerts, ships behind flags and staged rollouts. In an incident, mitigates first.
5. **Incident lead**: runs incidents calmly and assigns roles. Writes postmortems that
   change the system. Sets the team's readiness checklist and teaches it.

## Techniques

- **Three questions before merge**: how does it fail? How will we know? How do we undo
  it? Write one line for each in the PR description. A blank line is a finding.
- **Log for the reader at 3 a.m.**: structured fields (event, ids, duration, outcome),
  not prose, with a correlation id on every line. Log an error once, with context,
  where you handle it. Never log secrets or tokens.
- **A question per metric**: rate, errors and duration for every endpoint and job.
  Before adding a metric, write the question it answers ("are checkouts failing more
  than usual?"). Keep labels low-cardinality (no user ids).
- **Every remote call gets a budget**: always a timeout. Retry only transient errors,
  with a limit, backoff and jitter, and only if the operation is idempotent or has an
  idempotency key. Ask "what if this runs twice?" and "what if it hangs for 30 s?"
- **Fail loud or degrade on purpose**: per dependency, decide to fail, fall back, or
  queue the work. No empty catch blocks: handle the error or pass it up with context.
- **Config out, flags for risk**: read config and secrets from the environment and
  validate them at startup so a missing value fails fast. Put risky behavior behind a
  flag that defaults to off, with a plan to remove the flag.
- **Deploys you can undo**: small deploys. Schema changes as expand/contract, so the
  old version still runs (the data-modeling module covers the steps). Know the rollback
  command before you deploy and watch the dashboard for 10-15 min after.
- **Mitigate, then diagnose**: in an incident, ask in order: what is the impact, what
  changed recently, can we roll back or flag it off? Stop the damage first; root cause
  can wait. Note the time of everything you do.
- **Blameless postmortem**: timeline, impact in numbers, contributing factors ("why did
  the system allow this?"), 2-4 actions with owners. Never blame a person.

## On-the-job prompts

Scale to the learner's level from the skills matrix. Levels 1-2 get concrete hints
("what happens if this HTTP call never returns?"). Levels 3+ get open questions ("how
would you know this is broken in production?").

- **When** the learner asks for a call to another service, a database or a queue →
  before writing it, ask what timeout it needs, whether to retry, and what happens if it
  runs twice. At level 1-2, offer the choices (fail, fallback, retry) to pick from.
- **When** writing error handling or logs → ask what the caller should see, what the
  on-call engineer will search for, and which fields answer that. Flag swallowed errors
  and secrets in logs in your own diff, and let the learner decide the fix.
- **When** a feature is ready to merge → have the learner write one line each for the
  three questions in the PR description. At level 3+, also ask which number they'll
  watch after deploy and what value would make them roll back.
- **When** a change touches a schema, config or a public contract → ask whether the
  previous version can still run against it during the deploy, and how to roll back.
- **When** the learner faces an alert or a production bug → if users are affected right
  now, say what you see and the fastest mitigation, and coach afterwards. Otherwise ask
  for the impact, what changed recently and whether a mitigation exists, before reading
  code. Guide the order of questions; don't diagnose for them.
- **When** an incident or serious bug is resolved → suggest a short postmortem. The
  learner writes the timeline and contributing factors; you check for blame language
  and vague actions.

## Gym drills

Use a practice repo from the learner's stack pack, or a small scratch project if none
is set. Time-box every drill. The agent builds the scenario locally (a small service,
fake failing dependencies, generated logs and metrics) and grades what it planted.

- **Three questions** (levels 1-3, 15 min): the agent shows a diff (an endpoint that
  calls a payment API and writes to a database) with 3-4 planted gaps (no timeout,
  unsafe retry, swallowed error, no off switch). The learner answers the three
  questions and lists the changes they'd require. Score gaps found out of planted.
- **Find the request** (levels 1-3, 15 min): the agent generates a few thousand log
  lines with one failed request buried in them, and gives only the complaint ("order
  for customer 4411 at 14:02 failed"). The learner finds the request, its correlation
  id and the failing step with search tools, then rewrites the 2 log lines that slowed
  them down most. Grade on correct step and time taken.
- **Flaky dependency** (levels 2-4, 30 min): the agent writes a small service, a fake
  dependency that sometimes times out, returns 503 or is slow, and a load script. The
  learner adds timeouts, bounded retries and an idempotency key. The agent runs the
  load and checks: no hung requests, no duplicate side effects, bounded retries.
- **Incident simulation** (levels 2-5, 30 min): the agent plays the system. It fires an
  alert, then answers the learner's questions with fake dashboard tables, log excerpts
  and a deploy history. The learner states impact, hypothesis and mitigation against
  the clock. Grade time to mitigation, whether recent changes were checked first, and
  whether they mitigated before chasing root cause. Add red herrings at higher levels.
- **Write the postmortem** (levels 2-5, 20 min): the agent provides an incident timeline,
  log excerpts and chat notes (or reuses an Incident simulation the learner just ran).
  The learner writes a blameless postmortem. The agent checks for a full timeline, impact in
  numbers, factors beyond the trigger, no blame, and 2-4 specific, owned actions.
- **Safe migration** (levels 3-5, 30 min): the agent sets up a service and a schema
  change (rename a column or split a field). The learner implements it as
  expand/contract steps. The agent runs old and new code against each intermediate
  schema to check that every step can be deployed and rolled back on its own.

## Signals to log

- Readiness habit: PRs where the learner answered the three questions unprompted, and
  remote calls added with a timeout and a deliberate retry decision, out of total.
- Drill gaps: planted gaps found in Three questions; hangs, duplicates or unbounded
  retries left in Flaky dependency.
- Find the request: correct failing step (yes/no) and time taken.
- Incident drills: time to mitigation, recent changes checked first (yes/no).
- Postmortem checklist score: timeline, impact, factors, blame-free, specific actions.
