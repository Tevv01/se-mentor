---
name: extend
description: Create a new se-mentor focus module or stack pack from the template, e.g. "/se-mentor:extend module performance" or "/se-mentor:extend stack rails".
argument-hint: "module <name> | stack <name>"
disable-model-invocation: true
---

# Extend se-mentor

Request: $ARGUMENTS

```!
node "${CLAUDE_PLUGIN_ROOT}/scripts/mentor.js" status
```

Follow `${CLAUDE_PLUGIN_ROOT}/reference/skill-rules.md` (rules 3-6).

## Steps

1. Parse the request as `module <name>` or `stack <name>`, and normalize the name to
   kebab-case. If it's unclear, ask.
2. If an entry with that name already exists in `modules` or `stacks`, say so and ask
   whether to refine it or pick another name. Refining a **built-in** entry means writing
   a custom copy that shadows it.
3. Read the template (`templates.module` or `templates.stack`). Its section headings are a
   contract other skills rely on: keep all of them, in order, unchanged.
4. Gather content. Keep it general: no client, company or project names.
   - **Module**: ask the learner what this weakness looks like in their daily work and
     what "good" would look like for them, then draft the six sections. Write "What good
     looks like" and "Levels" as observable behavior, never "understands X". Make
     on-the-job prompts concrete triggers with concrete agent actions, and give every
     drill a level range and a time box.
   - **Stack**: ask about their setup in general terms: versions, frameworks, test runner,
     usual project layout. For "Practice repos", suggest well-known, actively maintained
     open-source repos for the stack and verify that each exists (WebSearch or WebFetch).
     If you can't verify them, leave the section with a note saying so rather than
     guessing. Give each repo 2-3 concrete features to trace. In "Module notes", add a
     subsection for each of the learner's focus modules.
5. Show the learner the draft and refine it together until it matches how they work.
6. Write it to `<stateDir>/modules/<name>/MODULE.md` or
   `<stateDir>/stacks/<name>/STACK.md`, with `name` and `description` frontmatter as in
   the template.
7. Unless you were invoked from setup, offer to add it to `<stateDir>/profile.json`
   (`focus` with a weight, or `stacks`). A new focus module also needs a skills-matrix row:
   run the Calibration step from `${CLAUDE_PLUGIN_ROOT}/skills/setup/SKILL.md` for it.
8. If the entry could be useful to others, mention in one line that it can be contributed
   upstream as a pull request adding `modules/<name>/` or `stacks/<name>/` to the
   se-mentor repo, after removing anything personal. Only mention it: don't prepare a copy
   or open a pull request unless the learner explicitly asks. Never write into the
   installed plugin folder.
