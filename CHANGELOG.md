# Changelog

All notable changes to se-mentor are listed here. Versions follow
`plugins/se-mentor/.claude-plugin/plugin.json`.

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
- Stack pack template, and a built-in `dotnet` stack pack (C#, ASP.NET Core, EF Core).
- Plugin icon.
