# software-engineering-learning

This repo is a Claude Code plugin marketplace containing **se-mentor**, a
learning workflow that keeps a junior engineer in the driver's seat while coding with
agents. Work in this repo means building and maintaining that plugin. The learning
itself happens wherever the plugin is installed.

## Layout

```
.claude-plugin/marketplace.json     marketplace "se-learning"
scripts/check.js                    contributor check: module and stack contracts
plugins/se-mentor/
  .claude-plugin/plugin.json
  config/friction.json              checks, levels, params (data, not code)
  hooks/hooks.json                  SessionStart -> scripts/mentor.js session-start
  scripts/mentor.js                 state/catalog/friction/review-queue helper (Node built-ins only)
  reference/skill-rules.md          rules every skill follows (profile check, opt-out, confidentiality)
  reference/state-formats.md        journal, review-queue, skills-matrix and drill-file formats
  skills/<name>/SKILL.md            the engine: setup, extend, drill, plan-with-me,
                                    understand-diff, review, retro (/se-mentor:<name>)
  modules/<name>/MODULE.md          focus modules (content); _template/ is the contract
  stacks/<name>/STACK.md            stack packs (content); _template/ is the contract
```

Learner state lives **outside** the plugin, in `~/.se-mentor/` (override with
`SE_MENTOR_HOME`): `profile.json`, `skills-matrix.md`, `journal/`, `review-queue.json`,
`gym/` (drill scratch projects and `.keys/`, git-ignored), plus custom `modules/` and
`stacks/` that shadow built-ins of the same name. Never store state in
the plugin directory: it is replaced on update, and `${CLAUDE_PLUGIN_DATA}` is deleted
on uninstall.

## Design rules

- **Engine vs. content vs. config.** Skills are generic and read the profile. Anything
  about a specific weakness goes in a module; anything about a specific stack goes in a
  stack pack; anything the learner chooses goes in `profile.json`. Adding a module or a
  stack must never require editing a skill.
- **Section headings in the templates are a contract.** Skills look up sections like
  "On-the-job prompts" and "Practice repos" by name. Changing a heading means updating
  every skill that reads it.
- **Friction is data.** New checks are added to `config/friction.json` (summary +
  instruction + per-level mode). `mentor.js` turns them into session context, so
  they need no code changes.
- **The learner decides.** Skills recommend and explain; they don't pick for the
  learner. Every check can be skipped (nudge) or overridden (require), and overrides
  are logged rather than blocked.
- **Confidentiality.** Users work on client code. Nothing written to the learner state
  may contain client code, names or identifiers unless `confidentiality.logCodeSnippets`
  is true.
- **Determinism lives in the script.** Anything that needs exact arithmetic or dates
  (review scheduling, drill timing) is a `mentor.js` command, not skill prose. Skills
  never edit review `step`/`due` by hand.
- **Shared skill behavior lives in `reference/skill-rules.md`.** Skills point to it rather
  than repeating it. Reference files are read by the model, so `${CLAUDE_PLUGIN_ROOT}` is
  not substituted there: refer to sibling files by name instead.
- **Skills don't explain first.** Every learning skill makes the learner predict, plan or
  answer before the agent explains. A change that makes a skill summarize up front breaks
  its purpose.
- `mentor.js` must never throw or exit non-zero: skills inject its output with
  `!` commands, and a failure aborts the skill. Keep it dependency-free.

## Developing

- Try it without installing: `claude --plugin-dir ./plugins/se-mentor`, then
  `/reload-plugins` after edits.
- Test against a throwaway state dir: set `SE_MENTOR_HOME` to a temp folder.
- Check the helper: `node plugins/se-mentor/scripts/mentor.js status` and `session-start`.
- Check module and stack contracts: `node scripts/check.js`.
- Validate: `claude plugin validate ./plugins/se-mentor` and `claude plugin validate .`.
- Bump `version` in `plugin.json` and add a CHANGELOG.md entry when shipping a change to
  installed copies. The contributor guide is CONTRIBUTING.md.
