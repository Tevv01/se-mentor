---
name: owning-agent-features
description: Staying the owner of a feature an agent helps build. You break the work down, can explain and defend every part of the result, and can fix it when it breaks.
---

# Owning agent-built features

An agent can write a feature faster than you can. That doesn't make it the agent's
feature. You still have to explain it in review, change it next month, and fix it when
it breaks in production. Ownership means **you set the plan, you understand what came
back, and you can work on it without the agent**. The danger is code that works but
that nobody on the team actually understands.

## What good looks like

- Before the agent writes any code, you can split a feature into 3-7 small steps, each
  with a clear "done" check (a test passes, an endpoint returns X), in about 10 minutes.
- You give the agent one step at a time, with constraints (where the code goes, what it
  must not touch, how it should be tested), not the whole feature in one prompt.
- For every diff you accept, you can explain in your own words what each changed file
  does and why it is shaped that way, and name one alternative design and why it wasn't
  chosen.
- In a code review, you can answer "why did you do it this way?" about agent-written
  code without asking the agent.
- When agent-written code fails, you form a hypothesis and narrow it down (reproduce it,
  read the error, isolate the step) before you paste the error back to the agent.
- You can say which parts of the feature you are confident in and which you'd want a
  senior to look at.

## Levels

1. **Passenger**: describes the goal and accepts whatever comes back if it seems to
   work. Can't explain the structure of the result. When it breaks, pastes the error
   back to the agent.
2. **Reviewer**: reads the diff before accepting it and can describe roughly what it
   does. Still lets the agent choose the breakdown and the design. Debugging is mostly
   asking the agent.
3. **Planner**: breaks the feature into steps before prompting and drives the agent
   step by step. Writes the parts they need to own by hand. Can explain and defend the
   result in review, and debugs most failures alone by reproducing and isolating them.
4. **Architect**: decides the design up front (boundaries, data flow, error handling)
   and gives it to the agent as constraints. Rejects or reshapes agent output that
   doesn't fit. Predicts where failures will come from.
5. **Lead**: knows which tasks to delegate to an agent and which to write by hand.
   Helps others plan agent work and reviews their agent-built features for hidden
   design debt.

## Techniques

- **Plan on paper first**: before prompting, write the steps, the files you expect to
  touch, and the "done" check for each. If you can't write the steps, you don't
  understand the feature yet. Ask a question about the requirements, not the code.
- **One step per prompt**: give the agent one step with its constraints and done check.
  Read and accept it before moving on. Small diffs are diffs you can own.
- **Explain it back**: after each accepted step, say or write two sentences about what
  changed and why. If you can't, don't accept it yet: ask, read, or simplify.
- **Ask "why this and not that?"**: for each non-obvious choice, ask the agent for the
  alternative it rejected, then decide yourself which one fits.
- **Debug before you delegate**: when something fails, reproduce it and form a
  hypothesis before bringing in the agent (the debugging module goes deeper).
- **Own the tests**: decide what the tests should check before the agent writes the
  implementation. Tests are your spec (the testing module goes deeper).
- **Leave a map**: at the end of a feature, write 3-5 lines on how it fits together
  (entry point → main pieces → storage). If you can't write it, you don't own it yet.

## On-the-job prompts

Scale to the learner's level from the skills matrix. Levels 1-2 get the concrete next
step ("write the 3 steps you'd split this into"). Levels 3+ get open questions ("what's
the riskiest part of this design?").

- **When** the learner asks for a whole feature in one prompt → don't start coding. If
  it's bigger than one 1-3 day slice, ask them to slice it first (see
  requirements-and-estimation). Then ask for the steps of the first slice, each with a
  done check. At level 1-2, offer a skeleton of the first slice's steps for them to
  correct. Then implement one step at a time.
- **When** you have finished a step and the learner moves on without comment → ask
  them to explain the change in two sentences before continuing. Point out where they
  were vague.
- **When** you are about to make a design choice the learner didn't specify (a new
  class, a library, a pattern, a schema change) → stop before writing it, name it, give
  one alternative, and ask the learner to choose.
- **When** the learner pastes an error with no comment → ask for their hypothesis and
  what they've already tried. At level 1-2, guide them through it: "What does the error
  message say? Which of your own files appears in the trace?" Help only after they have
  tried.
- **When** a feature is wrapping up → ask the learner to write the 3-5 line map of how
  it fits together, and which part they'd want reviewed most. Correct the map against
  the code.
- **When** the learner says "it works" → ask how they know: which test or manual check
  showed it, and which case they haven't tried.

## Gym drills

Use a practice repo from the learner's stack pack, or a small scratch project if none
is set. Time-box every drill. The agent grades against the actual code.

- **Break it down** (levels 1-3, 15 min): the agent gives a realistic feature request
  ("users can export their orders as CSV"). The learner writes the steps, the files
  each will touch and a done check per step. The agent grades against the key's
  must-have steps and points out missing steps, steps that are too big, and unclear done
  checks. A different but workable order gets full credit.
- **Defend the diff** (levels 1-4, 15 min): the agent implements a small feature in a
  scratch branch. The learner gets 10 minutes to read it, then the agent plays reviewer
  and asks 5 "why" questions. Score answers that are correct and in the learner's own
  words.
- **Fix it without me** (levels 1-4, 25 min): before the timer starts, the learner
  directs the agent through a small feature (10-15 min, untimed). The agent then
  introduces one bug and reports only the symptom. The learner fixes it in code they directed but didn't type,
  without asking the agent. Grade independence: found (yes/no), time, and questions
  asked of the agent. (The debugging module's drills train the method itself.)
- **Constrained build** (levels 3-5, 45 min): the learner writes a short design note
  (boundaries, data flow, error handling, tests) and then drives the agent to build it
  step by step. Before the build, the key names 2-3 drifts the agent will propose or slip
  in at specific steps (logic in the wrong layer, an extra dependency, a swallowed
  error). Score drifts caught or rejected out of planted. (For spotting drift in someone else's diff, see the
  system-design module's Spot the drift.)

## Signals to log

- Breakdown quality: number of steps, missing or oversized steps, clear done checks
  (yes/no).
- Explain-back hit rate: accepted diffs the learner could explain correctly out of
  total.
- Design choices: made by the learner vs. accepted from the agent without discussion.
- Debugging independence: failures where the learner formed a hypothesis before asking
  vs. pasted the error straight back to the agent.
- "Why" questions answered correctly in Defend the diff.
- Bug-fix drill results: found (yes/no), time taken, hypotheses tried.
