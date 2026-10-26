---
name: refactoring-legacy-code
description: Changing old or messy code safely. You pin down what it does today, move in small behavior-preserving steps, and keep every change small enough to review.
---

# Refactoring legacy code

Agents make rewriting cheap, which makes it tempting: ask for "clean this up" and you
get back 900 changed lines nobody can review. In old code the current behavior is the
spec, including the odd parts someone depends on. The skill is **changing code in small
steps that each keep behavior the same, backed by tests that pin down what it does
today, so every step can be checked and undone**.

## What good looks like

- Before changing untested code, you write characterization tests that pin its current
  behavior (odd outputs included) in about 20-30 minutes, and see them fail when you
  break the code on purpose.
- You keep refactoring and behavior change apart: in a refactor commit no expected
  value in any test changes. A behavior change is its own commit with its own test.
- Your refactors land as small commits (roughly under 200 changed lines, tests green
  after each) that a reviewer can check in a few minutes each.
- You can name the smell in front of you (long function, duplication, feature envy,
  primitive obsession) and the refactoring that addresses it.
- Given code that is hard to test (it creates its own dependencies, reads the clock,
  uses global state), you find or add a seam to test it without changing what it does.
- You can say when not to refactor and leave a note instead, and when an agent proposes
  a big rewrite, you split it into steps or reject it.

## Levels

1. **Rewriter**: wants to rewrite messy code from scratch, or asks the agent to "clean
   it up". Mixes cleanup with behavior changes and can't tell whether behavior changed.
2. **Tidier**: does safe local refactors (rename, extract) with IDE tools. Relies on
   whatever tests exist. Still makes large diffs that change behavior by accident.
3. **Safe changer**: writes characterization tests before touching untested code. Works
   in small green steps, keeps refactor and behavior commits apart, names common smells.
4. **Seam finder**: breaks dependencies to get hard code under test. Plans multi-step
   refactors and strangler replacements. Judges when a refactor is worth it and splits
   agent rewrites into reviewable steps.
5. **Legacy steward**: plans incremental migrations of whole subsystems with the team.
   Knows where the landmines are. Teaches others to change old code without fear.

## Techniques

- **Characterize before you change**: write tests that assert what the code does now,
  not what it should do. Call it, record the output, assert on that. Odd results go in
  too, with a comment. Snapshot tests work well for large outputs.
- **One hat at a time**: refactor or change behavior, never both at once. Found a bug
  mid-refactor? Note it, finish the step, then fix it in its own commit with a test.
- **Small green steps**: one refactoring at a time (rename, extract, inline, move), run
  the tests, commit. If tests go red and the cause isn't obvious in a few minutes,
  revert instead of debugging. Prefer the IDE's automated refactorings to hand edits.
- **Find the seam**: a place where you can swap behavior without editing the code there
  (a parameter, constructor argument, interface or config value). Pass in the clock,
  database or HTTP client instead of creating them inside. Add the smallest seam that
  works.
- **Sprout and wrap**: to add behavior to code you can't test yet, write the new logic
  in a new, tested function and call it from the old code (sprout), or wrap the old
  function with the new behavior around it. Don't grow the mess.
- **Strangler replacement**: put a routing point (facade, proxy or flag) in front of the
  old code. Move one case at a time to the new implementation, compare old and new
  outputs where you can, and delete the old path once nothing uses it.
- **Name the smell, pick the move**: long function → extract function; duplication →
  extract and reuse (on the third copy); long parameter list → parameter object;
  feature envy → move function; deep nesting → guard clauses.
- **Refactor where you work**: "make the change easy, then make the easy change". Skip
  code that is stable and rarely touched, about to be deleted, or untestable in the
  time you have. Leave a note instead.
- **Steer the agent to steps**: ask for a plan of small behavior-preserving steps, then
  one step per prompt, tests run each time. Reject diffs that mix renames, moves and
  logic changes.

## On-the-job prompts

Scale to the learner's level from the skills matrix. Levels 1-2 get concrete hints
("write a test that calls this with an empty cart and asserts today's output"). Levels
3+ get open questions ("how would you know this refactor didn't change behavior?").

- **When** the learner asks you to "clean up", "refactor" or "rewrite" something →
  don't produce one big diff. Ask what behavior must not change and which tests cover
  it, then ask for 3-6 small steps. At level 1-2, propose a list for them to reorder.
- **When** the code to change has no tests → before any edit, ask the learner for 2-4
  characterization tests. At level 1-2, show how to record today's output and assert it.
- **When** a diff mixes refactoring with a behavior change, or a bug turns up
  mid-refactor → point out which lines change behavior and ask the learner to split
  them out. The fix gets its own commit and test.
- **When** the code is hard to test (creates its own dependencies, reads the clock,
  uses global state) → ask where the seam is. At level 1-2, name the dependency and ask
  how it could be passed in instead.
- **When** the learner wants to refactor code the task doesn't need → ask how often it
  changes, whether it blocks the current work, and what it costs the reviewer. If it
  doesn't pay off, suggest a note or ticket.
- **When** your own refactor diff grows past about 200 lines or spreads over many files
  → stop, say so, and propose splitting it. Ask the learner which step to do first.

## Gym drills

Use a practice repo from the learner's stack pack, or a small scratch project if none
is set. Time-box every drill. The agent writes the legacy code, runs the tests, and
checks that behavior is unchanged by comparing outputs before and after.

- **Pin it down** (levels 1-3, 20 min): the agent writes a 100-150 line messy function
  with no tests (pricing or report formatting) that has a few odd edge cases and one
  hidden bug. The learner writes characterization tests. The agent then introduces 3-5
  mutations one at a time. Score mutations caught, and whether the odd behaviors (the
  bug included) were pinned rather than silently "fixed".
- **Name the smell** (levels 1-3, 10 min): the agent shows 4-5 short snippets, each with
  one dominant smell. The learner names the smell and the refactoring they'd apply. The
  agent accepts reasonable alternatives that come with a reason.
- **Small steps** (levels 2-4, 30 min): the agent provides a messy function with
  characterization tests already in place (or reuses one from Pin it down). The learner
  refactors toward a target shape the agent describes, one commit per step. The agent
  checks out every commit and runs the tests. Grade step size, red commits, commits
  that sneak in a behavior change, and the final readability.
- **Break the dependency** (levels 3-5, 30 min): the agent writes a class whose main
  method opens its own database connection, reads the current time and calls an HTTP
  API. The learner adds the minimum seams to test it with fakes. The agent checks that
  existing callers work unchanged and that the new tests would catch a planted bug.
- **Split the rewrite** (levels 2-5, 20 min): the agent produces a 400+ line "cleanup"
  diff that mixes renames, moves, a logic change and one subtle behavior break. The
  learner finds the break and turns the diff into an ordered list of reviewable steps.
  Score: break found (yes/no), time, and whether each step is safe on its own.
- **Strangle it** (levels 4-5, 45 min): the agent sets up a legacy module with 3-4
  operations behind one entry point. The learner adds a routing point, moves one
  operation to a new implementation, and runs old and new side by side on recorded
  inputs. Grade on whether the switch is reversible and planted differences were found.

## Signals to log

- Characterization quality: mutations caught out of introduced; odd behaviors pinned
  vs. "fixed" without a test.
- Step discipline: changed lines per refactor commit, and commits that were red or
  mixed refactoring with behavior change.
- Drill results: smells named correctly out of shown; behavior break found in Split the
  rewrite (yes/no) and time taken.
- Habits on real work: tests written before touching untested code; large agent
  rewrites split or rejected vs. accepted whole; reasoned decisions not to refactor.
