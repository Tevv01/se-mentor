---
name: debugging
description: Finding the cause of a bug on purpose. Reproduce it, read what the system tells you, form hypotheses and narrow down until one is left, instead of pasting the error to the agent.
---

# Debugging

Paste an error into an agent and it will often guess a fix. When the guess is wrong you
get a second guess stacked on the first, and soon nobody knows what the code does. Agent
code also fails in ways you didn't write and can't predict from memory. Debugging is
**turning "it's broken" into a cause you can point at, through small experiments that
each rule something out**. A fix without a known cause is a guess that happened to work.

## What good looks like

- Given a bug report, you turn it into a reliable reproduction (exact steps, input and
  environment) within ~15 minutes, or you can say what's missing to reproduce it.
- Given a stack trace, you name the error type, the message and the innermost frame in
  your own code within ~2 minutes, and say what was probably wrong there.
- Before changing code, you write down a hypothesis and the observation that would
  confirm or kill it. Each experiment takes minutes, not an hour.
- With no hypothesis, you narrow the search mechanically: shrink the input, bisect the
  code path, or run `git bisect` between a good and a bad commit.
- After the fix, you explain the cause in one or two sentences and show a test that
  failed before and passes after.
- When you bring in the agent, you give it the repro, what you've ruled out and your
  current hypothesis, not just the error.

## Levels

1. **Error paster**: copies the error to the agent or a search engine and applies the
   first suggested fix. Can't say what the stack trace points to.
2. **Guesser**: finds the failing line, then edits code on hunches until the symptom
   goes away. Changes several things at once and rarely reproduces first.
3. **Experimenter**: reproduces first, then tests one hypothesis at a time with one
   change or observation. Uses the debugger and targeted logs. Finds most bugs alone.
4. **Isolator**: narrows unknown bugs mechanically (minimal repro, bisecting, diffing
   environments). Handles intermittent bugs. Fixes causes and checks for siblings.
5. **Diagnostician**: debugs across services, queues, caches and threads from logs and
   metrics. Adds the observability that would have made the bug obvious. Teaches it.

## Techniques

- **Reproduce before anything**: make the bug happen on demand, ideally as a failing
  test or one command. If you can't, collect facts (logs, inputs, versions, timing)
  instead of changing code.
- **Read the error all the way**: error type → message (look at the values in it) →
  the innermost frame in your own code → the frames that called it. In chained errors,
  find the original exception. Which end of the trace it sits at depends on the language
  (Java prints it last as "Caused by", Python prints it first). Read before searching.
- **Hypothesis log**: write "expected X, got Y", then hypothesis → experiment → result
  for each idea. Kill hypotheses on purpose. The log stops you trying one idea twice.
- **One change at a time**: change or observe one thing per experiment, and revert the
  ones that didn't help. With two changes in play you can't tell which mattered.
- **Shrink the repro**: remove input, steps, config and code until removing anything
  more makes the bug disappear. The minimal case usually names the cause.
- **Bisect**: with a good state and a bad state, test the middle. Halfway along the
  code path, halfway through the input, or halfway through history with `git bisect`.
- **Debugger for state, logs for time**: a breakpoint shows everything at one moment.
  Logs show what happens over time, across threads or where you can't pause. Log
  values, not "got here".
- **Diff working vs. broken**: if it works somewhere (another machine, branch, config or
  input), list every difference and test them one by one.
- **Fix the cause, check the siblings**: ask why the bug was possible, add a regression
  test, and search for the same pattern elsewhere.

## On-the-job prompts

Scale to the learner's level from the skills matrix. Levels 1-2 get the next concrete
step ("which line in the trace is the first one in your code?"). Levels 3+ get open
questions ("what would you see if that hypothesis were true?").

- **When** the learner pastes an error with no comment → don't propose a fix. Ask them
  to read it back: error type, message, first frame in their code. At level 1-2, walk
  the trace together one frame at a time. Then ask for one hypothesis.
- **When** the learner wants to change something "to see if it helps" → ask what they
  expect and what each outcome would tell them. If several changes are in play, ask
  which one they're testing and suggest reverting the rest.
- **When** the bug isn't reproducible yet → don't suggest a fix. Help them write repro
  steps, or list what differs between runs (data, timing, environment, order).
- **When** the learner has tried 3+ hypotheses or ~20 minutes have passed → suggest
  narrowing instead of guessing: shrink the repro, bisect the code path, or
  `git bisect` if it used to work. At level 1-2, set up the first step with them.
- **When** you think you know the cause → don't say it. Ask a question that points
  where to look ("what is that field's value when it fails?"). Answer only after
  they've tried. In a real production incident, give the answer and debrief later.
- **When** the symptom disappears after a change → ask why that change fixes the cause,
  and for a test that failed before. If they can't explain it, it may only hide the bug.

## Gym drills

Use a practice repo from the learner's stack pack, or a small scratch project if none
is set. Time-box every drill. The agent plants the bugs, keeps the cause to itself and
grades the method as well as the result.

- **Stack trace triage** (levels 1-3, 10 min): the agent plants faults, runs the code
  and shows 3-4 runtime errors, including a chained one and one raised inside a
  library. For each, the learner writes the error type, the first frame in their code
  and a hypothesis without opening the code, then checks. Score frames and hypotheses.
- **Repro from a vague report** (levels 1-4, 20 min): the agent plants a bug that only
  shows under some conditions (an input shape, an ordering, a date or locale) and
  writes a vague report ("totals are sometimes wrong"). The learner writes exact repro
  steps and, at level 2+, a failing test. The agent checks it fails every time.
- **Five experiments** (levels 2-4, 25 min): the agent plants a bug and gives only the
  symptom. The learner gets at most 5 experiments (a run, a log line, a breakpoint) and
  writes the hypothesis and prediction before each. At level 2-3, one must use the
  debugger. The agent grades each: prediction written first? Did it rule something out?
- **Shrink it** (levels 2-4, 20 min): the agent gives a large failing case (a long input
  file, a 10-step scenario) for a planted bug. The learner cuts it to the smallest case
  that still fails. The agent compares its size with the known minimal case.
- **Bisect the history** (levels 2-5, 20 min): the agent builds a scratch repo with
  30-60 small commits, one of which causes a regression, plus a check script. The
  learner finds it with `git bisect` (`git bisect run` at level 3+) and explains the
  cause from the diff. Score the commit, steps taken (~log2 of commits), explanation.
- **Works here, not there** (levels 3-5, 25 min): the agent sets up two runs of one
  project that differ in several ways (config, environment variables, a dependency
  version, data), and only one fails. The learner isolates the difference that matters.
  Grade systematic elimination over lucky guessing.

## Signals to log

- Repro first: bugs with a reliable repro before any code change, out of total.
- Stack trace triage: correct error type and first own frame, out of total.
- Experiment quality: predictions written first, experiments used vs. budget, and how
  many ruled something out.
- Narrowing tools used: minimal repro, bisecting, debugger, environment diff, or only
  reading and guessing.
- Fix quality: cause explained in their own words, regression test, siblings checked.
- Independence: time to cause, and errors pasted to the agent without a hypothesis.
