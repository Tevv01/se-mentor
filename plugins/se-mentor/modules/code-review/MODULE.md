---
name: code-review
description: Reviewing pull requests from colleagues and agents. Check the right things in the right order, write comments the author can act on, review at speed, and take review well.
---

# Code review

Agents multiply the code waiting for review, and the reviewer is often the only person
who reads a change carefully. Review is not only for seniors: it is the fastest way to
learn a codebase and the team's bar. The skill is **checking that a change does what it
should, safely and maintainably, and saying so in comments the author can act on**.
Taking review well is the other half.

## What good looks like

- Before reading the diff, you read the description and linked issue and can say in
  one sentence what the change should do. If you can't, that is your first comment.
- You review in a fixed order: intent → shape and placement → correctness on the risky
  spots → tests → readability. Your first 10 minutes don't go to naming.
- A 400-line PR takes you about an hour (much faster than that and review finds fewer
  defects), and you can say what you read closely and what you skimmed.
- Each comment says what, where and why, has a label (blocking, suggestion, nit,
  question), and the author can act on it without a follow-up.
- You check out the branch and run it or its tests when the risk warrants it.
- On agent-written PRs you check the typical failures: subtly not what was asked, APIs
  that don't exist, swallowed errors, tests that mirror the code, unrequested changes.
- When reviewed, you answer every comment (fixed, disagree with a reason, or ticket).

## Levels

1. **Approver**: skims the diff and leaves "LGTM" or a style nit. Doesn't know what to
   look for and avoids commenting on a senior's code.
2. **Line commenter**: reads every line in file order. Finds local bugs and style issues
   but misses design problems and missing pieces. Comments are often vague.
3. **Checker**: reviews in order (intent, shape, correctness, tests), runs the code when
   needed, and writes actionable comments with a severity. Catches missing cases.
4. **Assessor**: sees design and system problems (wrong boundary, broken invariant,
   rollback risk). Matches depth to risk and stays fast. Knows agent failure modes.
5. **Bar setter**: shapes the team's review norms (PR size, what blocks, checklists).
   Uses review to teach, and others seek out their reviews.

## Techniques

- **Intent first**: read the description, the ticket and the tests before the code.
  Write "this PR should ..." and review against that, not against what the code does.
- **Review in passes**: (1) shape: which files changed, is it in the right place, is
  anything missing? (2) correctness on the risky spots. (3) tests. (4) readability. If
  pass 1 fails, comment and stop. Don't polish a design that is about to change.
- **Hunt for what's missing**: costly bugs are often not in the diff. The unhandled
  error, the caller that wasn't updated, the second place needing the same change, the
  missing test. Search for other callers of every changed signature.
- **Risk checklist**: outside input (validation, injection, auth), data changes
  (migrations, compatibility), concurrency, error handling, queries inside loops,
  secrets and personal data in logs.
- **Observation, reason, ask**: "This retries forever on a 500 (line 42), which can
  block the worker. Could we cap it at 3?" Prefix the severity. When unsure, ask a
  question instead of asserting.
- **Run it when it matters**: check out the branch, run the tests, try the edge case you
  suspect. One run settles what ten minutes of reading can't.
- **Agent-diff checks**: does it do what was asked, and only that? Do the APIs it calls
  exist? Are errors caught and ignored? Do the tests assert behavior or mirror the code?
- **Set the depth, then declare it**: pick depth from risk (a config tweak vs. a payment
  flow) and time-box. When approving, say what you checked and what you didn't.
- **Receive like an engineer**: answer every comment, separate the point from the tone,
  ask why when unclear, and push back with reasons. Turn repeat comments into habits.

## On-the-job prompts

Scale to the learner's level from the skills matrix. Levels 1-2 get a concrete thing to
check ("what happens here when the list is empty?"). Levels 3+ get open questions
("which file in this PR carries the most risk, and why?").

- **When** the learner asks the agent to review a PR for them → ask for their own
  time-boxed pass first, with written comments. Then compare with the agent's findings
  and discuss what each missed. Post nothing they didn't write or agree to.
- **When** the learner opens a PR to review → ask for the one-line intent before they
  read code. At level 1-2, give them the pass order as a short checklist.
- **When** the learner drafts a vague comment ("this looks off") → ask what the problem
  is, why it matters, what they'd suggest and how severe it is. At level 3+, don't
  rewrite it for them.
- **When** the learner is about to approve an agent-written diff → ask which agent-diff
  checks they ran, and for one thing they verified by running or searching.
- **When** the learner receives review comments → before they ask the agent to "fix all
  comments", ask them to sort each into agree, disagree or unclear and draft replies
  for the last two. They decide what changes.
- **When** a review has only nits, or no comments on a senior's PR → ask whether they
  checked intent, missing pieces and tests, and what question came up while reading.
  Questions are valid review comments.

## Gym drills

Use a practice repo from the learner's stack pack, or a small scratch project if none
is set. Time-box every drill. The agent prepares each PR as a branch with a
description, keeps a private answer key, and grades findings and comment quality.

- **Rewrite the comment** (levels 1-3, 10 min): the agent shows a small diff with 6 weak
  comments (a bare "why?", "this is wrong", "use X" with no reason, a harsh one, a nit
  marked blocking, a vague worry). The learner rewrites each as observation, reason and
  ask, with a severity. The agent scores location, reason, actionability and tone.
- **Intent mismatch** (levels 1-3, 15 min): the agent writes a ticket and a clean,
  well-tested PR that does something slightly different (wrong case, wrong scope, an
  unrequested extra). The learner writes the intent line, then reviews. Score whether
  the mismatch was caught and in which pass.
- **What's missing** (levels 2-4, 20 min): every changed line is correct, but something
  is absent (a caller not updated, a second code path needing the same fix, no test for
  the error path). The learner lists what's missing. The agent checks against the key
  and notes whether they searched the codebase or only read the diff.
- **Triage at speed** (levels 3-5, 15 min): a 400-600 line PR that is mostly mechanical
  (renames, moved files, formatting) with 2 real issues inside ~30 risky lines. In the
  first 2 minutes the learner writes which parts they'll read closely and why, then
  reviews. Grade the risk picks, issues found and time taken.
- **Receive the review** (levels 1-4, 15 min): the agent leaves 6-8 comments on a small
  change it writes (or one of the learner's from a personal project, never work code): some correct, one wrong, one unclear,
  one matter of taste, one harsh. The learner replies to each (fix, push back, ask, or
  ticket). Grade whether they rejected the wrong one, accepted the right ones and kept
  the tone constructive.

## Signals to log

- Planted issues found out of total, by kind (intent, missing piece, correctness,
  tests, security), and minutes per 100 changed lines.
- Comment quality: share with location, reason and ask; severity matching the key.
- Review order: intent written before reading code, and whether the first comments
  were about design and correctness or about nits.
- Verification: reviews where they ran the code or searched for callers vs. read only.
- Receiving review: comments answered, wrong comments pushed back on, right ones taken.
- Own pass first: reviews done before asking the agent, and agent findings they missed.
