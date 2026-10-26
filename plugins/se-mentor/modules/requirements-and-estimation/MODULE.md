---
name: requirements-and-estimation
description: Turning vague client or product requests into clear, testable, small pieces of work, and giving estimates and progress updates people can plan around.
---

# Requirements and estimation

Agents made writing code cheap, so building the wrong thing is now the most expensive
mistake, and it happens faster. The bottleneck has moved from typing to knowing what to
build, and that is what a consultant is paid for. The skill is **turning a vague request
into small, testable pieces of work the client agrees to, and giving estimates and
updates people can plan around**.

## What good looks like

- Given a one-line request ("add export to the reports page"), you can write the 5-10
  questions that would change what you build in ~15 minutes, and ask them before coding.
- You write acceptance criteria as checkable examples (Given/When/Then or input →
  outcome), including at least one error case, and the client or product owner
  confirms them.
- You split a feature into slices of about 1-3 days that each give a user something to
  see or use, and say which comes first and why.
- You write down what is out of scope, and find hidden scope (existing data,
  permissions, error states, notifications, volume) before estimating.
- Your estimates are ranges with a confidence level and assumptions ("3-5 days, fairly
  sure, if the API exists; if not, add 1-2 weeks"), and you track actual vs. estimate.
- When something will slip, the lead or client hears it from you within a day, with
  options, not on the deadline.

## Levels

1. **Ticket taker**: starts coding from the ticket text as written and asks only when
   blocked. Estimates are a single number or "should be quick".
2. **Questioner**: asks questions before starting, but mostly about implementation.
   Writes acceptance criteria when asked. Estimates are guesses without assumptions.
3. **Clarifier**: asks the questions that change scope, writes testable criteria and an
   out-of-scope list unprompted, and slices by user value. Gives ranges, reports slips.
4. **Shaper**: reframes a request around the real need and proposes a cheaper option
   that meets it. Finds hidden scope early. Estimates are calibrated against their own
   history. Presents risk to a client with options.
5. **Trusted advisor**: runs refinement with clients and the team; others rely on their
   slicing and estimates. Can say "not yet" to a client and keep the relationship.

## Techniques

- **Why, then one example**: ask "what problem does this solve, and for whom?", then
  "walk me through one real case". One concrete case uncovers more than abstract ones.
- **Question checklist**: who (roles, permissions), what data (source, volume, history),
  when (triggers, deadline), edges (empty, failure, duplicates), done (how we check it,
  who signs off), and not (out of scope). Ask the 3-5 that would change the build most.
- **Criteria as examples**: write each criterion so someone else can decide pass or fail
  without asking you. "Fast" becomes "results in under 1 second for 10k rows". The
  criteria become your test cases (the testing module goes deeper).
- **Slice by value, not by layer**: each slice cuts through every layer and gives a user
  something; not "database this week, UI next". Start with the simplest end-to-end path.
  Split by workflow step, rule, role or data type; happy path first, manual before
  automated. Breaking a slice into implementation steps is in owning-agent-features.
- **Hidden-scope sweep**: before estimating, check existing data to migrate,
  permissions, error and empty states, notifications, admin tools, audit logging,
  accessibility and languages, real volume, third-party integrations and their test
  environments. Each item goes into a slice or onto the out-of-scope list.
- **Range plus assumptions**: estimate each slice as best / likely / worst, state your
  confidence, and list what would move it. If the range is too wide, name what would
  narrow it (a 2-hour spike, one client answer). Count time for clarifying, reviewing
  and testing agent output, not just generating it.
- **Track actual vs. estimate**: log both per slice. After ~10 slices, compute your
  typical ratio and apply it to the next estimate.
- **Bad news early, with options**: a status update is three lines: done, next, risks.
  On a slip, say what happened, the new range, the options (cut scope, move the date,
  add help) and your recommendation. Send it the day you know.

## On-the-job prompts

Scale to the learner's level from the skills matrix. Levels 1-2 get concrete hints
("ask who is allowed to see this export"). Levels 3+ get open questions ("which answer
would change your design the most?").

- **When** the learner pastes a ticket or client message and asks to start building →
  don't start. Ask them to restate it in two sentences and write the 3 questions that
  would change the build most. At level 1-2, offer the checklist. If answers aren't
  available, have them write the assumption down and flag it to the requirement owner.
- **When** there are no acceptance criteria → ask for 3-5 as examples, including one
  error case, before any code. Point out any no one could check ("works well").
- **When** the learner plans by layer ("tables, then API, then UI") or as one big
  feature → ask for the smallest slice a user could try. At level 1-2, suggest a split
  (happy path only, one role). Then hand over to the owning-agent-features breakdown.
- **When** the learner is asked for an estimate → ask for their range and assumptions
  before offering yours. Run the hidden-scope sweep together, then compare with your
  view and their past actual/estimate ratio from the journal.
- **When** a new requirement shows up mid-task ("oh, and it should send an email") →
  name it as a scope change. Ask whether it fits this slice or becomes a new one, and
  whether the lead or client needs to hear about it.
- **When** work passes the likely estimate or a blocker appears → prompt the learner to
  draft the update now (what happened, new range, options). Review it for buried bad
  news. When a slice is done, have them check each criterion and log the actual.

## Gym drills

Use a practice repo from the learner's stack pack, or a small scratch project if none
is set. Time-box every drill. The agent plays the client or lead and writes a hidden
answer sheet before the drill starts, so grading compares against fixed facts.

- **Interview the client** (levels 1-4, 20 min): the hidden brief has the real need and
  3-4 facts that change the build (it's for an auditor, 2M rows, must hide salaries).
  The agent plays a busy client who answers only what is asked. After 10 minutes the
  learner writes a summary with acceptance criteria. Grade facts found out of hidden,
  questions that changed nothing, and assumptions stated.
- **Make it testable** (levels 1-3, 15 min): the agent gives 5 vague criteria ("search
  should be fast"). The learner rewrites each as checkable examples. The agent asks of
  each: could a tester decide pass or fail alone?
- **Slice it thin** (levels 2-4, 20 min): the agent describes a 3-4 week feature (online
  booking with payment and reminders). The learner writes 5-10 ordered slices and an
  out-of-scope list. The agent flags horizontal slices, slices with no user value, and
  slices over ~3 days.
- **Hidden-scope hunt** (levels 2-5, 15 min): the agent gives an innocent request ("let
  users delete their account") with 6-8 hidden items (data retention, shared data,
  billing, audit logs, re-signup with the same email). The learner lists what must be
  decided or built. Score found out of hidden; credit valid items the agent missed.
- **Estimate it** (levels 2-5, 15 min): the agent describes 3 small tasks in the practice
  repo, with hidden scope in the key. The learner estimates each as a range with
  confidence and assumptions. Grade against the key: hidden scope found, assumptions
  stated, and ranges that account for them. When the learner later builds similar work,
  log the actuals (see Signals to log).
- **Deliver bad news** (levels 2-5, 15 min): the agent sets a scene (two days before a
  demo, a third-party API blocks half the feature). The learner writes the message to
  the client; the agent replies in role, then grades: bad news in the first two lines,
  a new range, two or more options with a recommendation, no blame or jargon.

## Signals to log

- Interview coverage: hidden facts found out of total, and scope questions asked
  before starting real tasks.
- Acceptance criteria a tester could check without asking, out of total written.
- Slice quality: share of slices that are vertical, give user value and fit ~1-3 days.
- Hidden scope found out of planted; real scope changes found before vs. after starting.
- Estimate calibration: share of actuals inside the range, median actual/estimate ratio.
- Communication: slips reported before vs. at or after the deadline, and with options.
