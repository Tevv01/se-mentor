---
name: reading-unfamiliar-code
description: Building an accurate mental model of code you did not write (a new repo, a colleague's PR, or an agent's diff) quickly and on purpose.
---

# Reading unfamiliar code

Agents now produce code faster than anyone can read it line by line. The skill is no
longer "read everything carefully". It is **knowing where to look, forming a model fast,
and checking that model against the code**. Reading is active: you predict, then verify.

## What good looks like

- Dropped into an unfamiliar repo, you can name the entry points, the main modules and
  how they depend on each other within ~30 minutes, and sketch it as boxes and arrows.
- Given a feature ("what happens when a user submits an order?"), you can trace it end to
  end (entry point → validation → business logic → persistence → response) and say
  where each step lives.
- Given a 300-line diff, you can tell within a few minutes which 20 lines carry the risk,
  and read those closely.
- You can say what you *don't* know yet and how you would find out.
- You use tools (search, go-to-definition, tests, git history, the debugger, running the
  code) instead of reading files top to bottom.
- You use the agent as a guide, not an oracle: it points you somewhere, and you check
  its claims against the code.

## Levels

1. **Linear reader**: opens files and reads top to bottom. Gets lost in details and can't
   tell important code from plumbing.
2. **Navigator**: finds entry points and uses search and go-to-definition. Can follow
   one call path with help, but still needs an explanation to see the big picture.
3. **Tracer**: traces a feature end to end without help. Uses tests and running code to
   confirm assumptions, and explains data flow correctly.
4. **Modeler**: builds an architecture model quickly. Predicts where a change belongs
   before searching, reads diffs in the context of the surrounding system, and spots
   risky areas and implicit invariants.
5. **Guide**: gives others a useful tour of a codebase. Knows which parts of the code are
   misleading (stale comments, wrong names), and reads agent diffs fast and accurately.

## Techniques

- **Outside-in survey**: README → build and dependency files → directory layout → entry
  points (main, routes, handlers, CLI, jobs) → configuration and wiring (DI, env).
  Dependencies tell you what the system does before the code does.
- **Predict, then verify**: before opening a function, guess what it does from its name
  and call site. Being wrong is the useful signal: it shows where your model is off.
- **Follow the data**: pick one piece of data (a request, an entity, an event) and follow
  it through the system. Data flow beats control flow for understanding.
- **Tests as spec**: tests show intended behavior, edge cases and how the code is meant
  to be called. Read a test before its implementation.
- **Git archaeology**: `git log -p <file>`, `git blame`, and the PR that introduced a
  line explain *why* code looks the way it does.
- **Run it**: set a breakpoint or add a log line, and observe instead of guessing. One
  debugger session can replace an hour of reading.
- **Sketch**: draw boxes and arrows as you go. If you can't draw it, you don't have the
  model yet.
- **Read diffs by risk**: start with what changed in contracts (signatures, schemas,
  config, error handling, concurrency, auth), then tests, then the rest. Skim the
  plumbing.
- **Ask the agent for a map, not an answer**: "Where is X validated? Give me file:line,
  don't explain." Then go and read it yourself.

## On-the-job prompts

Scale to the learner's level from the skills matrix. Levels 1-2 get concrete hints
("start at `src/routes/`"). Levels 3+ get open questions ("where would you expect this
to be handled?").

- **When** the learner starts work in a repo they haven't seen before → before
  summarizing the repo, ask them to spend 5-10 minutes on an outside-in survey and write
  down their guess at the entry points and main modules. Then compare it with the actual
  structure and discuss the differences.
- **When** the learner asks "what does this code do?" → ask for their prediction first
  (one or two sentences), then answer and say where they were right or wrong. At level
  3+, answer with pointers (file:line) and a question instead of a full explanation.
- **When** you have produced or are presenting a diff → rank the changed spots by risk,
  and send the learner to the top 2-3 with a specific question for each ("what happens
  here if the list is empty?"). Don't summarize the whole diff unless asked.
- **When** the learner needs to change code in an area they haven't touched → ask where
  the change belongs and why, before you search. Then confirm or redirect.
- **When** the learner accepts an explanation from you without checking → once per
  session, pick one claim and ask them to verify it in the code ("can you find where
  that happens?").

## Gym drills

Use a practice repo from the learner's stack pack, or a well-known open-source repo in
the learner's language if none is set. Agent-built toy projects are too small for most
of these drills. Time-box every drill. The agent grades against the actual code and
quotes file:line evidence.

- **Map in 20** (levels 1-3, 20 min): in an unfamiliar repo, the learner writes the entry
  points, 4-6 main modules and a dependency sketch. The agent grades it against the
  real structure: what was right, what was missed, and what was wrong.
- **Trace a feature** (levels 2-4, 25 min): the agent names a concrete behavior ("how
  does a request get routed to a handler?"). The learner writes the call chain as
  file:function steps. The agent checks every hop.
- **Predict the output** (levels 1-3, 10 min): the agent shows a function or module plus
  an input. The learner predicts the output or side effects, then runs it to check.
- **Diff without the description** (levels 3-5, 20 min, needs full git history): take a
  real merged PR or commit from the practice repo and hide its description. The learner
  explains what it changes and why, and names the risky parts. Then compare with the
  real description and review comments.
- **Read, don't run** (levels 2-5, 20 min): in a scratch copy of a practice repo, the
  agent introduces one subtle bug and reports only the symptom. The learner must locate
  it by reading and tracing alone, writing down the path they followed, before running
  anything. Grade the trace, not just the find. (Finding bugs by experiment is a
  debugging drill.)

## Signals to log

- Map accuracy: modules and entry points correct / missed / wrong.
- Trace accuracy: correct hops out of total, and where the trace broke.
- Prediction hit rate when predict-first runs.
- Read, don't run: found (yes/no), time, and how direct the written path was.
- Tool habits: did they search, run tests, and use the debugger and git history, or only
  read and ask?
- Oracle vs. guide: how often they accepted an explanation without checking the code.
