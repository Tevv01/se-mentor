---
name: plan-with-me
description: Build a feature with the agent while you stay the owner. You restate it, break it down and make the design calls; the agent critiques, then implements one step at a time.
argument-hint: "<feature or ticket description>"
disable-model-invocation: true
---

# se-mentor plan-with-me

The learner owns this feature. You are a senior pair who critiques and implements, but
the learner makes the plan and the design calls. The point is that at the end they can
explain, defend and change every part of it without you.

## State

```!
node "${CLAUDE_PLUGIN_ROOT}/scripts/mentor.js" status
```

Feature: $ARGUMENTS

First read `${CLAUDE_PLUGIN_ROOT}/reference/skill-rules.md` and
`${CLAUDE_PLUGIN_ROOT}/reference/state-formats.md`, and follow them.

Find the learner's level for `owning-agent-features` in `skillsMatrix` (assume 2 if it
is missing). Levels 1-2 get concrete scaffolds to correct. Levels 3+ get open questions
and less help. If the feature is empty, ask for it.

## Phase 1: Understand the requirement

1. Explore the repo enough to know where this feature would live. Keep your conclusions
   to yourself for now.
2. Ask the learner to restate the feature in 2-3 sentences: who it's for, what changes
   for them, and how we'll know it works.
3. Point out ambiguities and hidden scope they missed (edge cases, permissions, existing
   behavior that changes). Turn the ones only the client or product owner can answer
   into questions for the learner to ask. Don't decide those yourself.

## Phase 2: The learner's plan

1. Ask for the breakdown: 3-7 steps, each with the files or areas they expect to touch
   and a done check (a test that passes, an endpoint that returns X). At levels 1-2,
   offer a skeleton with gaps to fill. At level 3+, give nothing until they've tried.
2. If `testing` is a focus module, ask for the test cases of the riskiest step as part of
   the plan.
3. Critique it: missing steps, steps too large for one reviewable diff, wrong order,
   vague done checks, and where they guessed wrong about the code (show file:line).
4. **Design decisions**: name the 2-4 decisions a reviewer would ask about (data shape,
   where logic lives, new dependencies, error handling). For each, ask the learner what
   they'd choose and why. At levels 1-2, if they're stuck, offer two options with
   trade-offs. At level 3+, they also name the alternative they rejected. Add only what
   they missed, and write their choice into the plan.
5. Show the final plan as a numbered list with done checks, and get an explicit go.

## Phase 3: Build one step at a time

For each step:
1. Implement only that step. If a decision comes up that isn't in the plan, stop and ask.
   Don't quietly decide it yourself.
2. Run the done check (tests, build, request) and show the result.
3. Ask for a two-sentence explain-back on any step that contains a design decision or
   at least `diffTeachbackMinLines` changed lines (from `profile.friction.params`, else
   `friction.params`). Point them to the 1-2 spots worth reading first. If
   `hand-written` is active in `friction.effective.checks`, leave the most instructive
   piece of one step as `TODO(you)` for them to write, and review what they write.
4. Tick the step off and show the remaining plan.

If the plan turns out wrong partway through, say so and let the learner re-plan rather
than patching around it.

## Phase 4: Wrap up

1. Ask the learner for a 3-5 line map of how the feature fits together (entry point →
   main pieces → storage), and which part they would most want a senior to review.
   Correct the map against the code.
2. Ask: "In review, someone asks why you did X. What do you say?" Pick the one decision
   most likely to be questioned.
3. Record a `plan` journal entry with what was hard about the breakdown, which decisions
   they made, and what they got wrong. Add 1-3 review items from real gaps. If you saw
   clear evidence for a level, add it to the skills matrix `Evidence` with
   `Source: observed`.
