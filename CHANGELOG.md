# Changelog

All notable changes to se-mentor are listed here. Versions follow
`plugins/se-mentor/.claude-plugin/plugin.json`.

## 0.4.0 - 2026-10-27

- Stack detection per repo. Each stack pack declares the files that mark its stack
  (`detect:` in its frontmatter), and the session start picks the matching pack for the
  repo you're in, so working on several projects with different stacks no longer mixes
  their advice. When nothing matches, Claude infers the stack from your profile's list.
  Custom packs need a `detect:` line to be detected; `/se-mentor:extend stack` asks for it.
- New `/se-mentor:status` shows the settings that apply in the current repo: detected
  stack, friction level and checks, focus modules with levels, reviews due and open
  drills. Claude can also run it when you ask what se-mentor is set to.
- `mentor.js status` reports the detected stacks under `project`.

## 0.3.1 - 2026-10-27

- `/se-mentor:plan-with-me` and `/se-mentor:understand-diff` now use all your focus
  modules, not just testing, owning-agent-features and reading-unfamiliar-code. Their
  prompts are folded into the questions the skill already asks, within the module prompt
  budget (new rule 7 in `reference/skill-rules.md`).
- `understand-diff` now reads exactly the diff the map was drawn from. `diffmap.js facts`
  returns a `readWith` command (and `readAlso` for untracked files), so a merge commit
  shows its changes instead of nothing.
- A branch is compared against `origin/main` or `origin/master` before a local `main`
  that may be behind, so other people's commits no longer appear in your diff.
- `mentor.js` errors now come back as JSON, a failed write no longer leaves a `.tmp` file
  behind, and a very large journal no longer breaks `status`.

## 0.3.0 - 2026-10-26

- Visual diff maps in `/se-mentor:understand-diff`. After your prediction, a map of the
  change opens in your browser:
  - a change map: files grouped by module, coloured by risk, with test markers
  - a before/after structure view, when dependencies change
  - a flow view, on request
  You compare it with your prediction before Claude adds anything.
- `/se-mentor:understand-diff map [target]` gives just the map.
- New `scripts/diffmap.js` extracts diff facts deterministically (files, modules, risk
  tags, added or removed imports, matching test changes) and renders the HTML page.
  Claude draws an arrow only when it can cite file:line evidence for it.

## 0.2.0 - 2026-10-26

- Five new built-in stack packs: `jvm-spring` (Java and Kotlin with Spring Boot),
  `typescript-node`, `react-typescript`, `python-web` (FastAPI and Django) and `go`.
  Versions, support dates and practice repos were checked against official sources as of
  this date.
- `/se-mentor:setup` lists the available stack packs before asking which you use.

## 0.1.1 - 2026-10-26

- Built-in `dotnet` stack pack (C#, ASP.NET Core, EF Core), reviewed for accuracy.
- Plugin icon.
- Repository and homepage links in the plugin manifest.

## 0.1.0 - 2026-10-26

First release.

- Skills: `setup`, `extend`, `drill`, `plan-with-me`, `understand-diff`, `review`,
  `retro`.
- Eleven focus modules: owning-agent-features, reading-unfamiliar-code, testing,
  debugging, code-review, system-design, security-fundamentals, production-readiness,
  refactoring-legacy-code, data-modeling, requirements-and-estimation.
- Friction levels `off`, `light`, `standard` and `strict`, with per-check overrides and a
  budget for module prompts.
- A SessionStart hook that injects the learner's profile and friction checks.
- Learner state in `~/.se-mentor/`: profile, skills matrix, journal, spaced-repetition
  review queue, and drill scratch projects with answer keys.
- Stack pack template.
