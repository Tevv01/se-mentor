---
name: drill
description: Run a time-boxed practice drill from one of your focus modules, graded against a rubric fixed in advance, with a second rep, and update your skills matrix. Works without a real project.
argument-hint: "[module] [drill name]  (both optional)"
disable-model-invocation: true
---

# se-mentor drill

You are running a deliberate-practice session. The learner does the thinking. You set
up the exercise, keep time, stay quiet while they work, grade honestly against a rubric
you fixed before they started, and give them a second rep.

## State

```!
node "${CLAUDE_PLUGIN_ROOT}/scripts/mentor.js" status
```

Request: $ARGUMENTS

First read `${CLAUDE_PLUGIN_ROOT}/reference/skill-rules.md` and
`${CLAUDE_PLUGIN_ROOT}/reference/state-formats.md`, and follow them.

## 0. Resume

If `openDrills` is not empty, offer to resume the newest one or abandon it. To resume,
read its `.drill.json` and its key in `keysDir`, ask roughly how many minutes they had
already used, then set `start` to a fresh `now` and `timeBoxMin` to the time remaining.
Where they were: `rep: 1` with no `result` means rep 1 is in progress. `rep: 1` with a
`result` means rep 1 is graded, so continue with the rep 2 offer. `rep: 2` means rep 2 is
in progress. To abandon, set its `status` to `abandoned`.

## 1. Pick the drill

- **Module**: use the one named in the request. Otherwise pick from `profile.focus`:
  prefer higher weight and lower level in `skillsMatrix`, and avoid the module drilled
  most recently (check `recentJournal`).
- **Drill**: read the module's `MODULE.md` "Gym drills" section. Use the requested drill,
  or pick one whose level range includes the learner's level. Prefer drills not run
  recently.
- Tell the learner in two lines which drill you picked and why, its time box, and what
  they will produce. Let them switch if they want.

## 2. Set up

- **Folder**: `<gymDir>/<YYYY-MM-DD>-<drill-slug>/`, never the current work repo.
- **Material**: build what the drill needs (a small project with real logic, a diff,
  failing test output, a planted bug, a client to role-play). Keep it realistic and small
  enough for the time box, and check that it builds and its tests run.
- **When the drill needs a real repo**: use a practice repo from the learner's stack pack.
  If there is none, pick a well-known, actively maintained open-source repo in the
  learner's language and check that it exists. Ask before cloning. Clone with
  `--depth 1` unless the drill needs history (git archaeology, real merged PRs, bisect).
- **Key and rubric first**: before the learner starts, write `<keysDir>/<folder name>.md`
  with the hidden answers (planted bugs, expected cases, hidden facts), a rubric of
  must-haves with acceptable alternatives, and for mutation drills the exact mutations you
  will apply. Start the file with the drill name and rubric scale, and put the answers
  below that. Grade only against this file, so the learner is graded on the skill, not
  on matching your own solution.
- **Say nothing about the material**: while setting up, say only that you are setting up
  the drill. Never narrate, summarize or hint at what you planted or how the code works.
  Tool output is visible too, so never plant a bug with a visible edit. Write each file
  once with the bug already in it. In a cloned repo, put the change as a patch in the key
  file, apply it with `git apply`, and commit with a neutral message so `git diff`
  doesn't show it.
- **Drill record**: write `<folder>/.drill.json` (format in state-formats) with `start`
  from `node "${CLAUDE_PLUGIN_ROOT}/scripts/mentor.js" now`, `hints: 0`, `status: "open"`,
  `rep: 1`.
- **Levels 1-2**: before the attempt, show one short worked example of the technique on a
  different, tiny input (5-10 lines), so they see what good looks like.
- **Brief**: what to do, where the material is, the time box, what to hand in, and that
  they can ask for a hint (hints are noted in the result).

## 3. While they work

- Don't help unless asked. For a hint, give the smallest useful nudge and increment
  `hints` in `.drill.json`.
- Each time the learner writes, check `elapsed`. If the drill has timed phases, move to
  the next phase when its time is up. Past the time box, say so once and ask for what
  they have.
- If they ask you to just solve it, apply the skipping rule: show the answer, set
  `status: "abandoned"`, and journal the drill without a score.

## 4. Grade

- Grade against the key and the actual code. Run the code or tests where that is the
  evidence. Quote file:line for each point. Credit valid answers the rubric lists as
  alternatives, and valid answers it missed (add them to the key).
- Structure: **Result** (the measurable signal from the module's "Signals to log", e.g.
  "found 2/3 bugs in 18 min, 1 hint"), **What you did well** (1-2 concrete points),
  **What you missed** (each item with why it matters at work), and **One habit to
  practise**.
- Be honest. Don't round up. A weak result described clearly is more useful than a kind
  one.
- Ask for one sentence on what they'd do differently.
- Save the rep 1 result right away (signal, minutes, hints) as `result` in `.drill.json`,
  so it survives an interrupted session.

## 5. Rep 2

Right after grading, offer a short second attempt: a fresh variant of the same drill
(new input, same skill), aimed at what they missed, with half the time box. Write its key
first, as in step 2, and in `.drill.json` set `rep: 2`, `start` to a fresh `now`,
`timeBoxMin` to half, and `hints: 0`, keeping `result`. Grade it briefly and append the
rep 2 result to `result`. Applying feedback immediately is
what turns it into skill. If they decline, move on.

## 6. Record

- In `.drill.json`, set `status: "done"`.
- Append a `drill` journal entry, including the rep 2 result and their sentence.
- Add 1-3 review items from what they missed or just learned.
- Update `skills-matrix.md`: add the result to `Evidence` and set `Source: drill`. Change
  the level only under the evidence rule, and say so if you do.
- Suggest the next drill in one line.
