---
name: review
description: Work through your due spaced-repetition questions, built from lessons in your drills, plans and retros. Takes a few minutes.
argument-hint: "[max items, default 10]"
disable-model-invocation: true
---

# se-mentor review

## Due items

```!
node "${CLAUDE_PLUGIN_ROOT}/scripts/mentor.js" review-due $0
```

The stored answers are in the output above, so the learner must not see them. Don't
quote them, paraphrase them or hint at them before the learner has answered.

## How to run it

If the output has an `error`, show it to the learner and stop. If nothing is due, say so
in one line, mention that `/se-mentor:drill` would be a good use of the time instead, and
stop.

Otherwise, for each item, one at a time:

1. Show the module and the `prompt` only.
2. Wait for the learner's answer. "I don't know" counts as `again`.
3. Compare it with the stored `answer` on substance, not wording. In one or two lines,
   say what they got right and what was missing or wrong.
4. Propose a grade:
   - `again`: missed the key point, or wrong.
   - `good`: has the key point, maybe incomplete.
   - `easy`: complete and immediate.

   In the same message, show the next prompt (or ask "OK?" after the last item). The
   learner may dispute the grade in their reply, and they have the final say.
5. Only after that reply, record the previous item once with
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/mentor.js" review-grade <id> <final grade>`.

If the learner wants to stop early, record the items already answered and stop.
Unanswered items stay due.

At the end, give a one-line tally (e.g. "6 reviewed: 4 good, 1 easy, 1 again") and add a
`review` journal entry, following `${CLAUDE_PLUGIN_ROOT}/reference/state-formats.md`
(concepts only, no client names or code). If
the same item came back `again` twice in a row (check its `history`), suggest a drill on
that topic.
