# Contributing to se-mentor

Thanks for helping. Most contributions are one of three kinds: a **focus module**, a
**stack pack**, or a change to the **engine** (script, hook, skills). Read
[CLAUDE.md](CLAUDE.md) first: it describes the architecture and the design rules, and
Claude Code loads it automatically when you work in this repo.

## Developer setup

Run the plugin from your clone without installing it, against a throwaway state folder so
your real `~/.se-mentor` stays untouched:

```sh
# macOS / Linux
export SE_MENTOR_HOME=/tmp/se-mentor-dev
claude --plugin-dir ./plugins/se-mentor

# Windows PowerShell
$env:SE_MENTOR_HOME = "$env:TEMP\se-mentor-dev"
claude --plugin-dir ./plugins/se-mentor
```

Run `/reload-plugins` after editing. In the same shell, so `SE_MENTOR_HOME` still points at
the throwaway folder, you can also run the helper script directly:

```sh
node plugins/se-mentor/scripts/mentor.js status
node plugins/se-mentor/scripts/mentor.js session-start
```

## Adding a focus module

1. Copy [`modules/_template/MODULE.md`](plugins/se-mentor/modules/_template/MODULE.md) to
   `plugins/se-mentor/modules/<name>/MODULE.md`, or run `/se-mentor:extend module <name>`
   and let Claude draft it with you. Then move the result from your state folder into the
   repo.
2. Keep the six section headings exactly as in the template. Skills look them up by name.
3. Meet the bar every built-in module meets:
   - **Observable**: "What good looks like" and "Levels" describe things you can see
     someone do ("given Y, does Z within N minutes"), never "understands X".
   - **Agent-era**: say how the skill changes when agents write much of the code.
   - **Learner first**: on-the-job prompts make the learner predict, plan or answer
     before the agent explains.
   - **Gradable drills**: every drill has a level range and a time box, can be set up
     locally by an agent, and is graded against a key written before the learner starts,
     never against the agent's own preferred solution.
   - **No duplication**: if another module already owns a drill or a trigger, point to
     it instead of repeating it.
   - **Stack-agnostic**: stack-specific advice belongs in stack packs.
   - **Defensive only** for anything security-related: local scratch code, fake secrets.

## Adding a stack pack

Copy [`stacks/_template/STACK.md`](plugins/se-mentor/stacks/_template/STACK.md) to
`plugins/se-mentor/stacks/<name>/STACK.md`, or run `/se-mentor:extend stack <name>`.
Practice repos must be real, actively maintained and well structured. Check that each one
exists, and give each 2-3 concrete features to trace. Keep it free of anything specific to
you or your employer. The `detect` frontmatter lists the files that mark a repo as this
stack, so se-mentor can pick the pack for the repo the learner is in. Keep it specific
enough not to match other stacks' repos: `package.json ~ "react"` requires the text, not
just the file.

## Changing the engine

- `scripts/mentor.js` must never throw or exit non-zero, and must stay dependency-free.
  Anything that needs exact dates or arithmetic belongs in the script, not in skill prose.
- Behavior shared across skills belongs in `reference/skill-rules.md`, and data formats
  in `reference/state-formats.md`.
- Test against broken input as well as good input: invalid JSON, a BOM, wrong types,
  missing files. Use a throwaway `SE_MENTOR_HOME`.
- For skill changes, run the skill in a real session and check the files it writes.

## Before opening a pull request

```sh
node scripts/check.js                       # modules and stack packs follow their contracts
claude plugin validate ./plugins/se-mentor  # plugin manifest and skills
claude plugin validate .                    # marketplace manifest
```

If your change affects people who already have the plugin installed, bump `version` in
`plugins/se-mentor/.claude-plugin/plugin.json` and add an entry to
[CHANGELOG.md](CHANGELOG.md).
