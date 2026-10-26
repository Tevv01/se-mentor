# se-mentor

**A Claude Code plugin that keeps you learning real software engineering while an agent
writes much of your code.**

Agents now write code faster than you can read it. That makes it easy to slide into the
backseat: accepting diffs you don't understand, letting the agent make every design
decision, pasting errors straight back. se-mentor changes who does what. **You plan,
decide and verify. The agent critiques, implements in small steps, and checks that you
understood.** It works inside your real tasks and in short practice drills, and it
tracks your progress over time.

## What it looks like

You ask Claude to review a change before you commit it:

```
> /se-mentor:understand-diff

  You have uncommitted changes in one file. Before reading any code, predict from
  the outline alone:

   cart.js | 15 +++++++++++----

  1. What do you think this change does?
  2. Which part would you read first, and why?
  3. What is the one thing most likely to be wrong? (It handles money.)
```

After you answer, it sends you to the 2-3 riskiest lines with one question each. It
checks your answers against the code and asks you to explain the change back. Then it
tells you honestly which parts you haven't read. You decide whether to accept.

During normal work, the same idea runs in the background at the friction level you
choose. For example, it asks for your plan before writing a feature, or asks you to
explain a large diff back to it.

## Requirements

- [Claude Code](https://code.claude.com) with plugin support
- [Node.js](https://nodejs.org) 18 or newer on your `PATH`. The hook and the skills run a
  small dependency-free script. Claude Code's native installer doesn't include Node.

## Install

```sh
claude plugin marketplace add <owner>/<repo>
claude plugin install se-mentor@se-learning
```

`se-learning` is the name of the marketplace this repo provides, and `se-mentor` is the
plugin inside it. You can also run `/plugin marketplace add <owner>/<repo>` inside a
session. The plugin loads in your next session.

Then set it up, which takes about 5 minutes:

```
/se-mentor:setup
```

Setup asks about your role and goals, your stack, the skills you want to work on, and
how much friction you want. It writes your profile to `~/.se-mentor/`.

## Commands

| Command | What it does |
|---|---|
| `/se-mentor:setup [change]` | Create your profile, or change one setting: `friction light`, `add focus debugging` |
| `/se-mentor:drill [module] [drill]` | A time-boxed practice drill in a scratch project, graded against a rubric written before you start, with a second rep right after. Updates your skills matrix |
| `/se-mentor:plan-with-me <feature>` | Build a feature as its owner: you restate it, break it down and make the design calls; the agent implements one step at a time |
| `/se-mentor:understand-diff [target]` | Before you accept a diff: predict it, read the riskiest spots, explain it back |
| `/se-mentor:review [n]` | Spaced-repetition questions built from your own mistakes |
| `/se-mentor:retro [week]` | A session retro, or a weekly review against your goals |
| `/se-mentor:extend module\|stack <name>` | Write a new focus module or stack pack with you |

Every step can be skipped. se-mentor says once why the step matters, then does what you
ask and notes the skip in your journal.

## How it adapts to you

You configure three things. Everything else is shared engine.

**Focus modules** are the skills you want to build. Each module defines what good looks
like, five observable levels, techniques, prompts that fire during real work, practice
drills and what to measure. The plugin ships with eleven:

| Module | Trains |
|---|---|
| `owning-agent-features` | Staying the owner of what the agent builds: breakdown, design calls, explaining and debugging it |
| `reading-unfamiliar-code` | Building an accurate mental model of code you didn't write, quickly |
| `testing` | Choosing cases, writing tests that can fail, reading failures |
| `debugging` | Finding root causes on purpose: reproduce, hypothesize, isolate |
| `code-review` | Reviewing human and agent PRs well and at a sensible pace, and taking review well |
| `system-design` | Boundaries, contracts, trade-offs and design notes at feature-to-service scale |
| `security-fundamentals` | Everyday application security, including the agent as an attack surface |
| `production-readiness` | Observability, failure handling, safe deploys and incidents |
| `refactoring-legacy-code` | Changing old code safely, in small reviewable steps |
| `data-modeling` | Schemas, constraints, queries, indexes and safe migrations |
| `requirements-and-estimation` | Turning vague requests into clear, sliced, estimated work |

**Stack packs** describe your stack: tooling, idioms, common pitfalls (especially in
agent-written code) and good open-source repos for reading practice. None ship yet. Run
`/se-mentor:extend stack <name>` and it writes one with you, checking the practice repos
it suggests.

**Friction level** sets how much se-mentor slows you down during normal work:

| Check | off | light | standard | strict |
|---|---|---|---|---|
| plan-first: you outline the approach before non-trivial code | - | nudge | require | require |
| predict-first: you predict what code or a diff does before it's explained | - | nudge | nudge | require |
| diff-teachback: you explain large diffs back | - | nudge | require | require |
| hand-written: the key piece is left as `TODO(you)` | - | - | - | require |
| session-retro: a 3-question retro logged to your journal | - | - | nudge | require |
| Focus-module prompts per task, on top of the checks | 0 | 1 | 1 | 2 |

*nudge* means it's offered once. *require* means se-mentor won't move on until it's done,
unless you decline, which gets logged. You can override any single check, for example
`standard` but with `session-retro` turned off.

Custom modules and stack packs live in your own state folder and take priority over
built-in ones with the same name, so you can tailor anything without forking.

## What runs on your machine

- **A SessionStart hook** runs `node scripts/mentor.js session-start` when a session
  starts, resumes, clears or compacts, in every project. It reads your profile and adds
  1-3k characters of instructions to the session: your friction checks, your focus
  modules, and the paths to your state files. The only file it may write is
  `review-queue.json`, to fill in scheduling fields on new review items.
- **Once you're set up, it changes Claude's behavior in every repo**, according to your
  friction level. Turn that off with `/se-mentor:setup friction off`. To pause the plugin
  entirely, run `claude plugin disable se-mentor@se-learning`.
- **Skills write only to your state folder.** The exception is `plan-with-me` and
  `understand-diff`, which change code in your repo only when you ask them to implement
  something. Drills build scratch projects in `~/.se-mentor/gym/`, and ask before cloning
  any open-source practice repo there.
- The plugin's script makes no network calls. Claude uses the network only when a skill
  needs it: `understand-diff PR <n>` runs `gh pr diff`, a drill clones a practice repo
  (after asking), and `/se-mentor:extend` checks practice repos on the web.

## Your data and privacy

Everything se-mentor learns about you lives in `~/.se-mentor/` (set `SE_MENTOR_HOME` to
move it):

```
profile.json        your settings
skills-matrix.md    your level per module, with evidence
journal/            one file per month: drills, plans, retros, overrides
review-queue.json   spaced-repetition questions
gym/                drill scratch projects and answer keys (git-ignored)
modules/, stacks/   your custom modules and stack packs
```

It is designed for people who work on client code. By default the state folder holds
**concepts and lessons only**: no client code, company or project names, work-repo
paths or identifiers. Drills never use code from your work repos. You can make the
folder a private git repo to keep your history.

## Updating and uninstalling

```sh
claude plugin marketplace update se-learning
claude plugin update se-mentor@se-learning
```

Restart Claude Code afterwards. Your state folder isn't touched by updates.

```sh
claude plugin uninstall se-mentor@se-learning
```

Uninstalling leaves `~/.se-mentor/` in place. Delete it by hand if you want your data
gone.

## Limitations

- Checks are instructions to Claude, not hard blocks. Claude followed them in our
  testing, but it is still a model following instructions.
- Drills are built and graded by Claude. The answer key is fixed before you start, which
  keeps grading honest, but the quality of the material depends on the model.
- No stack packs ship yet (see above).

## Contributing

New modules, stack packs and fixes are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
