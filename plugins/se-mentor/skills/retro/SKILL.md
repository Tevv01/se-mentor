---
name: retro
description: A short retro at the end of a session, or "week" for a weekly review. It turns what happened into journal entries, review items and a next step.
argument-hint: "[week]"
disable-model-invocation: true
---

# se-mentor retro

## State

```!
node "${CLAUDE_PLUGIN_ROOT}/scripts/mentor.js" status
```

Mode: $ARGUMENTS (empty = session retro, `week` = weekly review)

First read `${CLAUDE_PLUGIN_ROOT}/reference/skill-rules.md` and
`${CLAUDE_PLUGIN_ROOT}/reference/state-formats.md`, and follow them.

## Session retro (default)

Keep it under 5 minutes.

1. Ask the three questions, one at a time:
   - What did you learn today?
   - What was confusing, or still is?
   - What would you do differently next time?
2. Then add 1-2 concrete moments from this conversation they didn't mention: something
   they got wrong, or a backseat moment (accepted code without reading it, pasted an error
   straight back, let you make a design call). Be specific and kind, but don't skip the
   backseat moments. If there's little work in this conversation, ask what they worked on
   today, and use that instead.
3. For anything still confusing, offer a quick explanation now or a drill for later.
4. Record a `retro` journal entry with their answers in their own words, but with client,
   company and project names, paths and identifiers replaced by the concept.
5. Turn their lessons and confusions into 1-3 review items.
6. If the session showed clear evidence about a focus module's level, add it to the
   skills matrix `Evidence` with `Source: observed`.

## Weekly review (`week`)

1. Read the journal entries from the last 14 days. Around the start of a month that
   means two journal files. Also read the skills matrix and `profile.goals`.
2. Ask the learner first: which lesson do they think came up most, and which goal got
   the least attention? Then summarize in 5-8 lines, confirming or correcting their
   answer:
   - what was practised, and results this week compared with the week before
   - recurring misses (the same lesson showing up twice is the main finding)
   - overrides of checks or steps
   - drill count and minutes, from the drill entries
3. Compare it with the goals: which goals got attention, and which got none.
4. Propose next week's plan, 2-3 drills plus one habit to practise on real work, and let
   the learner adjust it.
5. Check the settings: if they overrode things often, or the review queue keeps growing
   without being worked through, ask whether the friction level or the module weights
   should change (`/se-mentor:setup <change>`).
6. Record a `retro` journal entry headed `weekly`.
