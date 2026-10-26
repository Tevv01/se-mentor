---
name: setup
description: Set up or change your se-mentor learner profile (stack, friction level, focus modules, goals). Run it first, and again whenever you want to change something.
argument-hint: "[optional change, e.g. 'friction light' or 'add focus debugging']"
disable-model-invocation: true
---

# se-mentor setup

You are configuring se-mentor for the learner. The learner decides everything here;
you explain the options, recommend, and write down what they choose.

## Current state

```!
node "${CLAUDE_PLUGIN_ROOT}/scripts/mentor.js" status
```

Requested change: $ARGUMENTS

Follow `${CLAUDE_PLUGIN_ROOT}/reference/skill-rules.md` (rules 3-6) and write state in the
formats from `${CLAUDE_PLUGIN_ROOT}/reference/state-formats.md`.

## Decide what to do

- **`profileError` is set** → show the error, then repair the file: fix the JSON and
  keep every value the learner had. Never replace it with a fresh interview unless they
  ask for one.
- **A profile exists and a change was requested** → apply only that change to
  `profile.json` and show the before/after. If the change adds a focus module, also run
  Calibration (step 6) for it.
- **A profile exists, no change requested** → show the current settings as a short table
  (stacks, focus modules and weights, friction level and overrides, goals) and ask what
  to change.
- **No profile** → run the interview below.

## Interview

Go one topic at a time. Use AskUserQuestion for choices of 2-4 options. List longer sets
(such as modules) in text and let the learner answer by name. Keep each step short.

1. **About you**: role, experience, the kind of work you do, and 1-3 goals for the next
   3-12 months. Write a one-line `about` and the goals **without client, company or
   project names**. They are injected into every session.
2. **Stack**: list the available `stacks` from the status output (name and description),
   then ask which ones they use day to day, or expect to use. Match each answer to a pack
   name ("Spring" is `jvm-spring`, "Next.js" is `react-typescript`); anything with no
   match is a stack with no pack. For a stack with no pack,
   offer to create one now by following
   `${CLAUDE_PLUGIN_ROOT}/skills/extend/SKILL.md` inline (skip its profile step; you
   write the profile at the end), or to do it later with `/se-mentor:extend stack <name>`.
3. **Focus modules**: list the available `modules` with their descriptions. Ask which
   areas feel weakest, and give each chosen module a weight of 1-3 (3 = main focus).
   If a weakness has no module yet, offer to create one the same way.
4. **Friction**: show the levels as a table of the checks each level turns on, using
   `friction.levels` and `friction.checks`. Recommend `standard` as the default, `light`
   for weeks with tight deadlines, and `strict` for dedicated learning sprints. Also
   show `friction.modulePromptsPerTask`: how many focus-module prompts may fire per task
   on top of the checks. Then ask whether to override any single check (e.g. standard,
   but `session-retro: off`) or change a param (`diffTeachbackMinLines`,
   `modulePromptsPerTask`).
5. **Confidentiality**: explain that by default the state dir holds concepts only, never
   client code or names. Ask only if they want to change that.
6. **Calibration**: for each focus module, read its `MODULE.md` "Levels" section. Ask the
   learner to place themselves, optionally with one quick diagnostic question to
   sanity-check. Record the result as self-assessed. Drills refine it later.

## Write the state

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/mentor.js" init`, then write these files into
the `stateDir` from the status output (absolute paths):

`profile.json`:

```json
{
  "version": 1,
  "about": "Junior consultant, ~1 year, backend-heavy client projects",
  "goals": ["Read unfamiliar codebases confidently", "Own the design of features I build with agents"],
  "stacks": ["dotnet"],
  "focus": [{ "module": "reading-unfamiliar-code", "weight": 3 }],
  "friction": {
    "level": "standard",
    "overrides": { "session-retro": "off" },
    "params": { "diffTeachbackMinLines": 60 }
  },
  "confidentiality": { "logCodeSnippets": false }
}
```

Only list stacks that have a pack. Leave out `overrides` and `params` if they are empty.
Valid modes for overrides: `off`, `nudge`, `require`.

`skills-matrix.md`: create it if missing, otherwise update only the rows that changed.
Use the format in state-formats.md.

## Finish

Summarize the setup in 3-5 lines. Say that it takes effect from the next session (start
a new one or run `/clear`), and that `/se-mentor:setup <change>` changes any single
setting later.
