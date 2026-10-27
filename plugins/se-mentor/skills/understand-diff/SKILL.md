---
name: understand-diff
description: Understand a diff before you accept or approve it, whether it's the agent's, a colleague's or your own. You predict, compare with a visual map of the change, read the riskiest spots, and explain it back. "map" gives just the picture.
argument-hint: "[map] [staged | <branch> | <commit> | <commit>..<commit> | PR <number>]  (default: uncommitted changes)"
disable-model-invocation: true
---

# se-mentor understand-diff

The learner is about to accept, commit or approve a change. Get them to real
understanding fast by sending them to the parts that matter, not by summarizing
everything. Don't explain the diff up front: that is the backseat habit this skill exists
to break. The map is a tool for checking their own picture of the change, not a
replacement for forming one.

## State

```!
node "${CLAUDE_PLUGIN_ROOT}/scripts/mentor.js" status
```

Request: $ARGUMENTS

First read `${CLAUDE_PLUGIN_ROOT}/reference/skill-rules.md`,
`${CLAUDE_PLUGIN_ROOT}/reference/state-formats.md` and
`${CLAUDE_PLUGIN_ROOT}/reference/diff-map.md`, and follow them.

If the request starts with `map`, this is **map mode**: run steps 1-3 only, then stop
(see the end of step 3). The rest of the request is the target.

Find the learner's level for `reading-unfamiliar-code` in `skillsMatrix` (assume 2 if it
is missing). Levels 1-2 get specific questions with a pointer to the exact lines. Levels
3+ get the file and an open question.

Outside map mode, use the focus modules (skill-rules rule 7). The natural places are the
questions in step 4 and the explain-back in step 6.

## 1. Get the diff

Get the facts with `node "${CLAUDE_PLUGIN_ROOT}/scripts/diffmap.js" facts <target>`. The
target is empty for uncommitted changes, or `staged`, a branch, a commit, or a range.
For `PR <n>`, run `gh pr diff <n> | node "${CLAUDE_PLUGIN_ROOT}/scripts/diffmap.js" facts --stdin "PR <n>"`
and `gh pr view <n>`. If `gh` isn't available, ask for a branch instead.

If the facts report "not a git repository": in map mode, say a map needs a git diff and
stop; otherwise ask which files to look at, and run the remaining steps on those
without a map. For any other `error`, show it and ask for a valid target. If there are no
files, say so and stop.

The facts already leave out lockfiles and generated files (`excluded`). If more than
~1500 changed lines remain, ask the learner to narrow it down before going on: a commit,
a range, or paths (`facts <target> -- <path>...`). Read the diff by running the facts'
`readWith` command from the same folder, plus each file in `readAlso` (new untracked files)
in full; for a PR, read the `gh pr diff` output. This is the same diff the facts and the
map describe. Read enough surrounding code to judge it yourself.

## 2. Learner predicts (from the outline only)

Show only the file list with lines added and removed, grouped by module, plus the PR
title or task if known. Ask:
- What do you think this change does?
- Which file would you read first, and why?
- What's the one thing most likely to be wrong?

They can also sketch it in a line or two: "orders/api now calls payments".

In map mode, ask one line instead: what does this change do, and which part now talks to
which? Skipping follows skill-rules rule 4. If they skipped, after the map ask which box
they would read first and why.

## 3. Show the map

Build the change map, plus the structure view when `hints.structureView` is true, and
write and render it as described in `diff-map.md` (Rendering), using
`node "${CLAUDE_PLUGIN_ROOT}/scripts/diffmap.js" render`. Under it in the chat, list the
evidence for each arrow (file:line) in one short line each.

Then ask the learner first: **what does the map show that you didn't predict, and what
did you expect that isn't there?** Confirm or correct their answer before adding your
own observations. Offer the flow view once if the diff changes one request or job path
end to end.

After they answer, use `hints.codeWithoutTestChange` to point out changed code with no
matching test change, as a question ("is `<file>` covered elsewhere?"), not a verdict.

**Map mode stops here.** Offer the full review (`/se-mentor:understand-diff <target>`)
in one line, and write a two-bullet `diff` journal entry: map mode, and whether the
prediction was a hit, partly right, or skipped.

## 4. Rank and send them in

Rank the changed spots by risk: changed contracts (signatures, schemas, API shapes,
config), error handling and failure paths, security (input, authz, secrets),
concurrency and state, data migrations, then tests, then everything else. The map's
colours should already point the same way. Pick the top 2-3. For each, give a location
and one specific question ("in `<file>:<lines>`: what happens if the list is empty?").
Then wait while they read.

## 5. Check their answers

Confirm or correct each answer against the code, with file:line. When they're wrong,
point to the line that shows it and let them try once more. If the second try is still
wrong, explain it plainly.

## 6. Explain it back

Ask for the whole change in 3-4 sentences: what it does, why it's shaped that way, and
what could break. Compare it with their prediction from step 2 and name what changed in
their understanding.

Then be honest about coverage: list the parts they haven't read (including excluded
files), each with your one-line risk judgement (e.g. "`<file>`: rename only, low risk").
The learner decides whether that is enough.

## 7. Decide and record

- Ask for a verdict: accept, accept with changes (which?), or reject. If the agent wrote
  the diff, make the changes they ask for.
- If they found a real problem, say so plainly. That's the skill working.
- Record a `diff` journal entry with the prediction accuracy (including what the map
  showed that they missed, as a concept such as "missed a new auth dependency", with no
  file, module or function names) and the questions answered correctly out of asked. Add review
  items for real gaps (at most 2).
