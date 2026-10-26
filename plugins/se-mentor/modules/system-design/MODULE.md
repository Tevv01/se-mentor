---
name: system-design
description: Designing features and small services so they are easy to change. You draw the boundaries, choose trade-offs on purpose, write them down, and notice when an agent's design drifts.
---

# System design

Agents are good at code that works today and bad at noticing when it makes next month's
change hard. They add a layer here and a shared helper there, and the system drifts one
plausible diff at a time. At your scale, design is not cloud diagrams. It is **deciding
where each responsibility lives, what crosses each boundary, and which trade-off you
are making, before the code exists**.

## What good looks like

- Given a feature request, you can sketch the components, what each one owns (in one
  sentence without "and") and the data between them in about 15 minutes, before coding.
- You can name the 2-3 most likely next changes to a feature and point to where each
  would land. A small change that touches 5 files in 3 modules is a design smell to you,
  not bad luck.
- You define a contract (inputs, outputs, errors, who validates what) before building
  either side, and can say which changes to it would break callers.
- For each real choice (sync vs async, one table vs two, new service vs module), you can
  name the alternative, what you gave up, and what would make you switch.
- You write an ADR of under a page for decisions that are hard to reverse, and skip it
  for ones that aren't.
- Reading an agent's diff, you can tell in a few minutes whether it fits the existing
  design or quietly adds a new pattern, layer or dependency.

## Levels

1. **Implementer**: puts code wherever it compiles or wherever the agent put it. Can't
   say why the code is split the way it is. Design happens by accident.
2. **Follower**: puts new code where the existing structure says it goes. Gets stuck
   when no pattern exists. Accepts the agent's new abstractions without question.
3. **Designer**: sketches components and data flow before coding. Defines contracts and
   keeps responsibilities separate. Names the trade-offs when asked.
4. **Trade-off maker**: weighs options against likely changes and real constraints
   (load, team, deadline) and picks the simplest one that holds. Writes ADRs for
   hard-to-reverse calls. Catches design drift in agent diffs.
5. **Steward**: keeps a codebase's design coherent across many features and people.
   Knows when to fix a boundary and when to live with it. Helps others turn vague
   requirements into a design.

## Techniques

- **One-sentence responsibility**: write what each module, class or service is for in
  one sentence. If it needs "and", or describes how instead of what, it owns too much.
- **Boxes, arrows, data**: sketch the components and label each arrow with the data
  that crosses it and whether the call is sync or async. Ten minutes on paper beats an
  hour of refactoring.
- **Change-case test**: list 2-3 realistic future changes ("add a second payment
  provider", "also export to PDF") and walk each through the design. Count the places
  each one touches. A good design keeps a likely change local.
- **Contract first**: write the interface (signature, endpoint and payload, event
  schema) with its error cases before the implementation. Decide who validates the
  input and who owns the data.
- **Simplest thing that survives**: start with the plainest design that handles the
  known requirements and your change cases. Add flexibility (interfaces, queues,
  plugins, config) when a real second case shows up, not before.
- **Name the trade-off**: write "A over B because C; revisit if D". Common axes:
  simplicity vs flexibility, sync vs async, strong vs eventual consistency, duplication
  vs coupling. If it's hard to reverse, make it an ADR: context, decision, alternatives,
  consequences, stored next to the code.
- **Point dependencies inward**: core logic should not import the web framework, the
  database driver or another team's client. If it does, the arrow is backwards.
- **Drift check**: before accepting an agent's diff, look for a new layer, pattern,
  dependency or shared helper, or data now owned in two places. Each one needs a reason.

## On-the-job prompts

Scale to the learner's level from the skills matrix. Levels 1-2 get concrete hints
("this belongs next to the other handlers in `orders/`"). Levels 3+ get open questions
("what's the next change this design will have to absorb?").

- **When** the learner asks for a feature that adds a component, endpoint, table or
  integration → before writing code, ask for a quick sketch: the pieces, what each owns,
  and the data between them. At level 1-2, offer a partial sketch for them to correct.
  Build to their sketch and flag anywhere you'd deviate.
- **When** you are about to add an abstraction, layer, pattern or dependency the
  codebase doesn't already use → stop, name it, give the simpler alternative, and ask
  the learner to choose and say why. Never slip it into a diff.
- **When** the learner defines an API, event or schema → ask them to write the contract
  first, including error cases and which side validates. Then ask which change to it
  would break existing callers.
- **When** a choice has a real trade-off (sync vs async, service vs module, cache or
  not) → give 2 options with one-line pros and cons, and ask the learner to pick and say
  what would make them switch. At level 3+, ask them to come up with the options.
- **When** one small behavior change spreads across many files and modules → point out
  the spread and ask which boundary it suggests is in the wrong place. Refactor only if
  they decide to.
- **When** a decision is hard to reverse (data model, public API, messaging, splitting a
  service) → suggest a short ADR and ask the learner to draft it. Review it for a
  missing alternative or consequence.

## Gym drills

Use a practice repo from the learner's stack pack, or a small scratch project if none
is set. Time-box every drill. The agent grades against the actual code and asks the
learner to defend each choice.

- **Sketch before code** (levels 1-3, 15 min): the agent gives a realistic feature
  ("remind customers 24 hours before their booking"). The learner sketches components,
  responsibilities, the data on each arrow and sync vs async. The agent grades against
  the key's must-haves (components, data ownership, failure paths) rather than its own
  preferred design, and asks the learner to defend each choice.
- **Change-case walk** (levels 2-4, 20 min): the agent picks 3 realistic changes to a
  module in a practice repo, ideally real past commits. Before the drill it records in the
  key the files each change must touch, optional files, and accepted alternatives. The
  learner predicts where each change lands. Score the spread (how many modules each one
  touches) and must-touch files found, then discuss which boundary made a change
  expensive.
- **Write the contract** (levels 2-4, 20 min): for a feature spanning two components,
  the learner writes the contract (signatures or endpoint, payloads, error cases, who
  validates) without implementing it. The agent plays caller and maintainer and tries 5
  scenarios (missing field, new optional field, duplicate request, partial failure, slow
  dependency). Score the scenarios the contract handles.
- **Two options, one ADR** (levels 3-5, 30 min): the agent gives a decision with a real
  trade-off (polling vs webhooks, sync call vs queue, one service vs two). The learner
  writes an ADR with at least two alternatives and the condition that would reverse it.
  The agent grades it for a clear decision, honest consequences and missed options.
- **Spot the drift** (levels 3-5, 20 min): on a scratch branch, the agent builds a
  working feature that drifts from the existing design in 2-3 ways (a duplicate layer,
  business logic in a controller, a second owner for the same data, an unneeded
  dependency). The learner names each drift and a fix. Score found out of planted.

## Signals to log

- Sketch quality: must-have components, data ownership and failure paths covered /
  missed.
- Change-case predictions: must-touch files found, and spread predicted correctly.
- Contract robustness: scenarios handled out of tried in Write the contract.
- Trade-offs named: choices where the learner stated an alternative and a switch
  condition vs. took the first option offered.
- Drift caught: planted drifts found out of planted, plus drifts caught in real diffs.
