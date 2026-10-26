---
name: understand-diff
description: Understand a diff before you accept or approve it, whether it's the agent's, a colleague's or your own. You predict, read the riskiest spots, and explain it back.
argument-hint: "[staged | <branch> | <commit> | <commit>..<commit> | PR <number>]  (default: uncommitted changes)"
disable-model-invocation: true
---

# se-mentor understand-diff

The learner is about to accept, commit or approve a change. Get them to real
understanding fast by sending them to the parts that matter, not by summarizing
everything. Don't explain the diff up front: that is the backseat habit this skill exists
to break.

## State

```!
node "${CLAUDE_PLUGIN_ROOT}/scripts/mentor.js" status
```

Target: $ARGUMENTS

First read `${CLAUDE_PLUGIN_ROOT}/reference/skill-rules.md` and
`${CLAUDE_PLUGIN_ROOT}/reference/state-formats.md`, and follow them.

Find the learner's level for `reading-unfamiliar-code` in `skillsMatrix` (assume 2 if it
is missing). Levels 1-2 get specific questions with a pointer to the exact lines. Levels
3+ get the file and an open question.

## 1. Get the diff

Resolve the target:
- Empty → uncommitted changes (`git diff HEAD`, plus untracked files from
  `git status --porcelain`). In a repo with no commits yet, use `git diff --cached` and
  the untracked files.
- `staged` → `git diff --cached`.
- A branch → `git diff <default-branch>...<branch>`. The default branch is
  `git symbolic-ref --short refs/remotes/origin/HEAD`, falling back to `main` or `master`.
- A commit or range → `git show <commit>` / `git diff <range>`.
- `PR <n>` → `gh pr diff <n>` and `gh pr view <n>`. If `gh` isn't available, ask for a
  branch instead.

Without a git repo, ask the learner which files to look at, and run steps 2-6 on those.
If there's no diff, say so and stop.

Leave lockfiles and generated, vendored, minified or binary files out of the reading
(list them under coverage in step 5). If more than ~1500 changed lines remain, ask the
learner to narrow it down (a path or a commit) before going on. Read the remaining diff,
and enough surrounding code to judge it yourself.

## 2. Learner predicts (from the outline only)

Show only the file list with lines added and removed (`--stat`), plus the PR title or
task if known. Ask:
- What do you think this change does?
- Which file would you read first, and why?
- What's the one thing most likely to be wrong?

## 3. Rank and send them in

Rank the changed spots by risk: changed contracts (signatures, schemas, API shapes,
config), error handling and failure paths, security (input, authz, secrets),
concurrency and state, data migrations, then tests, then everything else. Pick the top
2-3. For each, give a location and one specific question ("in `<file>:<lines>`: what
happens if the list is empty?"). Then wait while they read.

## 4. Check their answers

Confirm or correct each answer against the code, with file:line. When they're wrong,
point to the line that shows it and let them try once more. If the second try is still
wrong, explain it plainly.

## 5. Explain it back

Ask for the whole change in 3-4 sentences: what it does, why it's shaped that way, and
what could break. Compare it with their prediction from step 2 and name what changed in
their understanding.

Then be honest about coverage: list the parts they haven't read (including excluded
files), each with your one-line risk judgement (e.g. "`<file>`: rename only, low risk").
The learner decides whether that is enough.

## 6. Decide and record

- Ask for a verdict: accept, accept with changes (which?), or reject. If the agent wrote
  the diff, make the changes they ask for.
- If they found a real problem, say so plainly. That's the skill working.
- Record a `diff` journal entry with the prediction accuracy and the questions answered
  correctly out of asked. Add review items for real gaps (at most 2).
