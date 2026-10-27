# Rules for every se-mentor skill

These apply to every `/se-mentor:*` skill unless the skill says otherwise.

1. **Profile first.** If the status output has a `profileError`, tell the learner what is
   wrong, suggest `/se-mentor:setup` to repair it, and stop. If there is no profile, suggest
   `/se-mentor:setup` and stop.
2. **The skill replaces the session checks.** While a skill runs, its steps replace the
   friction checks and module prompts from the session context. Focus modules come back
   in only where a skill says to use them (rule 7). In particular, never run
   diff-teachback on material you build for the learner (drill projects, example diffs).
3. **The learner thinks first.** Ask before you explain. When they are stuck, give the
   smallest useful hint: a question or a place to look, not the answer. One question at a
   time.
4. **Skipping is allowed, once explained.** If the learner asks to skip a step or to have
   you do it, say briefly why the step matters, and optionally offer a quicker version of
   it. If they still want to skip, do as they ask without arguing again, and add a
   one-line `override` journal entry.
5. **Confidentiality covers the whole state dir.** Everything under the state dir (journal,
   profile, skills matrix, review queue, custom modules and stacks, gym) holds concepts
   only: no client code, company or project names, work-repo file paths or identifiers,
   unless `profile.confidentiality.logCodeSnippets` is true. Never use, copy or paraphrase
   work-repo code as drill material.
6. **Write state in the shared formats** from `state-formats.md`, in the same folder as
   this file. If the state dir does not exist yet, first run
   `node "<pluginRoot>/scripts/mentor.js" init`, with `pluginRoot` from the status output.
7. **Using the focus modules.** When a skill says to use the focus modules, read the
   "On-the-job prompts" section of every module in `profile.focus` (file paths are in
   `modules` in the status output; skip any that is missing). Fold the prompts that fit
   the moment (a plan, a design choice, a diff, a test, an error) into the question the
   skill is already asking, rather than asking them separately. When several modules fit
   the same moment, use the highest-weight one. Separate extra questions are limited to
   `friction.effective.modulePromptsPerTask` per skill run, chosen by weight; folded-in
   ones don't count. Scale each prompt to the learner's level for that module in
   `skillsMatrix` (assume 2 if it is missing).
