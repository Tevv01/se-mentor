# Learner state formats

Every se-mentor skill that writes learner state follows these formats. All files live in
the state dir reported by `mentor.js status` (`stateDir`).

**Confidentiality first** (rule 5 in `skill-rules.md`): write the concept, never client
code, names, paths or identifiers. For example: "missed that a retry can double-charge
without an idempotency key", not "PaymentService.charge() in acme-api".

## Journal: `journal/YYYY-MM.md`

Append-only, one file per month. Create the file with a `# Journal YYYY-MM` heading if it
doesn't exist. One entry per skill run:

```markdown
## 2026-10-26 · drill · testing / Make it red

- Result: caught 2/3 mutations in 14 min (time box 15); rep 2: 3/3
- Lesson: wrote no boundary case for the discount threshold
- Lesson: saw both new tests fail before trusting them
- Next: Case list drill on date ranges
```

Entry types: `drill`, `plan`, `diff`, `retro`, `review`, `override`. Most entries have 3-6
bullets. The `Result` line is for anything measurable from the module's "Signals to log".
`review` and `override` entries are a heading plus one bullet: the review tally, or which
check or step was skipped (and why, if the learner said).

## Review queue: `review-queue.json`

Questions for spaced repetition, built from lessons the learner actually got wrong or
just learned. To add items, read the file (create `{"version": 1, "items": []}` if
missing) and append objects with only these three fields:

```json
{ "module": "testing", "prompt": "You wrote a new test and it passed first time. What should you do before trusting it?", "answer": "Make it fail on purpose (break the code or write it before the fix) and check it goes red with a helpful message." }
```

`mentor.js` fills in `id`, `added`, `step` and `due` the next time any of its commands
runs, and handles all scheduling through `review-grade`. Never edit `step`, `due` or
`history` by hand.

Good review items:
- Ask for the reasoning or the next action ("what do you check first when...?"), not
  trivia.
- Are answerable in 1-3 sentences, without the original code.
- Come from a real mistake or gap, at most 3 per skill run.

## Skills matrix: `skills-matrix.md`

```markdown
| Module | Level | Source | Updated | Evidence |
|---|---|---|---|---|
| testing | 2 - Happy-path writer | drill | 2026-10-26 | Make it red 2/3; Case list 6/9 |
```

- `Level` is `<n> - <name>` using the module's "Levels" section.
- `Source` is `self-assessed` until a drill or real-work observation provides evidence,
  then `drill` or `observed`.
- `Evidence` keeps the 2-3 most recent short results, newest first.
- **Changing a level needs evidence.** Move up one level only after at least two results
  that clearly match the next level's description. Move down only after two clear
  results below the current level. Rep 1 and rep 2 of one drill count as a single result
  (record them as one `Evidence` entry). Always tell the learner when you change a level
  and why. A single result only goes into `Evidence`.

## Drill files: `gym/`

- `gym/<YYYY-MM-DD>-<drill-slug>/`: the drill's material (git-ignored).
- `gym/<folder>/.drill.json`: `{"module", "drill", "level", "timeBoxMin", "start", "hints", "status", "rep", "result"}`.
  `start` is the ISO time printed by `mentor.js now` (reset for rep 2 and on resume);
  `status` is `open`, `done` or `abandoned`; `result` holds the rep 1 result once it is
  graded, with the rep 2 result appended. `mentor.js status` lists open drills so they
  can be resumed.
- `gym/.keys/<folder>.md`: the answer key and rubric, written before the learner starts.
  It is kept outside the drill folder so it doesn't show up in the learner's file tree or
  searches.
