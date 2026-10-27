#!/usr/bin/env node
// se-mentor helper: resolves the learner's state, modules, stacks and friction rules.
//
// Commands:
//   status                      JSON snapshot for skills (state, catalog, friction, reviews, open drills)
//   session-start               SessionStart hook: injects the active profile as context
//   init                        Creates the learner state directory layout
//   now                         Prints the current time as ISO 8601 (start a drill timer)
//   elapsed <iso>               Prints minutes since <iso>, rounded
//   review-due [limit]          Lists due review items (fills in missing fields first)
//   review-grade <id> <again|good|easy>   Reschedules one review item
//
// This script must never throw or exit non-zero: skills inject its output via
// !`...` and a failing command aborts the skill. No dependencies, Node built-ins only.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const STATE_DIR = path.resolve(os.homedir(),
  (process.env.SE_MENTOR_HOME || '.se-mentor').replace(/^~(?=$|[\\/])/, os.homedir()));
const PROFILE_FILE = path.join(STATE_DIR, 'profile.json');
const REVIEW_FILE = path.join(STATE_DIR, 'review-queue.json');
const GYM_DIR = path.join(STATE_DIR, 'gym');
const FORMATS_FILE = path.join(PLUGIN_ROOT, 'reference', 'state-formats.md');
const MODES = ['off', 'nudge', 'require'];
// Days until the next review, indexed by how many times in a row the item was recalled.
const REVIEW_LADDER = [1, 3, 7, 16, 35, 90];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const fwd = p => p.split(path.sep).join('/');
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const toInt = v => Number.parseInt(v, 10);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// Strips a UTF-8 BOM, which Windows PowerShell writes and JSON.parse rejects.
function readText(file) {
  try { return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''); } catch { return null; }
}

// { value, error }: value is null when the file is missing or unparseable;
// error is set only when the file exists but is not valid JSON.
function parseJsonFile(file) {
  const text = readText(file);
  if (text === null) return { value: null, error: null };
  try { return { value: JSON.parse(text), error: null }; } catch (e) {
    return { value: null, error: `${path.basename(file)} is not valid JSON (${e.message})` };
  }
}

// Write to a temp file and rename, so an interrupted write never leaves half a file.
function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n');
    fs.renameSync(tmp, file);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch { /* never created */ }
    throw e;
  }
}

function listDirs(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()); } catch { return []; }
}

// Local calendar date as YYYY-MM-DD, optionally shifted by whole days.
function localDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Pulls `description:` out of a Markdown file's frontmatter.
function describe(file) {
  const m = (readText(file) || '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const d = m && m[1].match(/^description:\s*(.+)$/m);
  return d ? d[1].trim().replace(/^["']|["']$/g, '') : '';
}

// Built-in entries live in the plugin; custom ones in the learner state dir.
// A custom entry shadows a built-in one with the same name. Names starting
// with "_" are templates and never listed.
function catalog(kind, fileName) {
  const out = {};
  for (const [origin, base] of [['built-in', PLUGIN_ROOT], ['custom', STATE_DIR]]) {
    for (const e of listDirs(path.join(base, kind))) {
      if (e.name.startsWith('_') || e.name.startsWith('.')) continue;
      const file = path.join(base, kind, e.name, fileName);
      if (fs.existsSync(file)) out[e.name] = { origin, file: fwd(file), description: describe(file) };
    }
  }
  return out;
}

// Coerces a hand-edited profile into the shape the rest of the script expects,
// so one wrong type never takes the whole session context down.
function normalizeProfile(raw) {
  const strList = v => (Array.isArray(v) ? v : v == null ? [] : [v])
    .filter(x => typeof x === 'string' && x.trim()).map(x => x.trim());
  const focus = [];
  for (const f of Array.isArray(raw.focus) ? raw.focus : []) {
    const module = typeof f === 'string' ? f : isObj(f) && typeof f.module === 'string' ? f.module : null;
    if (!module || focus.some(x => x.module === module)) continue;
    const w = isObj(f) ? toInt(f.weight) : 1;
    focus.push({ module, weight: Number.isNaN(w) ? 1 : clamp(w, 1, 3) });
  }
  return {
    ...raw,
    about: typeof raw.about === 'string' ? raw.about : '',
    goals: strList(raw.goals),
    stacks: [...new Set(strList(raw.stacks))],
    focus,
    friction: isObj(raw.friction) ? raw.friction : {},
    confidentiality: isObj(raw.confidentiality) ? raw.confidentiality : {},
  };
}

// { profile, error }: profile is null when missing or unreadable; error says why
// it is unreadable, so skills repair it instead of overwriting it.
function loadProfile() {
  const { value, error } = parseJsonFile(PROFILE_FILE);
  if (error) return { profile: null, error };
  if (value === null) return { profile: null, error: null };
  if (!isObj(value)) return { profile: null, error: 'profile.json is not a JSON object' };
  return { profile: normalizeProfile(value), error: null };
}

function frictionConfig() {
  const { value } = parseJsonFile(path.join(PLUGIN_ROOT, 'config', 'friction.json'));
  return isObj(value) ? value : { defaultLevel: 'off', params: {}, checks: {}, levels: { off: {} } };
}

function effectiveFriction(profile) {
  const cfg = frictionConfig();
  const f = profile.friction;
  const level = typeof f.level === 'string' && Object.hasOwn(cfg.levels, f.level) ? f.level : cfg.defaultLevel;
  // Invalid override modes or param values are ignored, so a typo never silently
  // switches a check off or leaks "[object Object]" into an instruction.
  const valid = (obj, ok) => Object.fromEntries(Object.entries(isObj(obj) ? obj : {}).filter(([, v]) => ok(v)));
  const modes = { ...cfg.levels[level], ...valid(f.overrides, m => MODES.includes(m)) };
  const params = { ...cfg.params, ...valid(f.params, v => ['number', 'string'].includes(typeof v)) };
  const checks = Object.entries(cfg.checks).map(([id, c]) => ({
    id,
    mode: MODES.includes(modes[id]) ? modes[id] : 'off',
    instruction: c.instruction.replace(/\{(\w+)\}/g, (_, k) => (k in params ? params[k] : `{${k}}`)),
  }));
  const custom = toInt(params.modulePromptsPerTask);
  const budget = Number.isNaN(custom) ? ((cfg.modulePromptsPerTask || {})[level] || 0) : Math.max(0, custom);
  return { level, checks, modulePromptsPerTask: budget };
}

// The last `maxLines` lines across the newest journal files (journal/YYYY-MM.md).
function recentJournal(maxLines) {
  const dir = path.join(STATE_DIR, 'journal');
  let files;
  try { files = fs.readdirSync(dir).filter(f => /^\d{4}-\d{2}\.md$/.test(f)).sort().reverse(); } catch { return ''; }
  let lines = [];
  for (const f of files) {
    // concat, not unshift(...): spreading a huge file overflows the call stack.
    lines = (readText(path.join(dir, f)) || '').trimEnd().split(/\r?\n/).slice(-maxLines).concat(lines);
    if (lines.length >= maxLines) break;
  }
  return lines.slice(-maxLines).join('\n');
}

// Skills append bare {module, prompt, answer} items to review-queue.json; this
// fills in and repairs id, dates and step so scheduling stays deterministic.
function loadReviews() {
  const { value, error } = parseJsonFile(REVIEW_FILE);
  if (error) return { items: [], changed: false, error };
  if (value !== null && !Array.isArray(value) && !(isObj(value) && Array.isArray(value.items))) {
    return { items: [], changed: false, error: 'review-queue.json must be {"version": 1, "items": [...]}' };
  }
  const raw = value === null ? [] : Array.isArray(value) ? value : value.items;
  const items = raw.filter(isObj);
  const today = localDate();
  let changed = Array.isArray(value) || items.length !== raw.length;
  for (const it of items) {
    if (it.id != null && typeof it.id !== 'string') { it.id = String(it.id); changed = true; }
  }
  // Existing ids are reserved up front, so a new item never takes an id that a
  // learner may already have been shown.
  const taken = new Set(items.map(it => it.id).filter(Boolean));
  const seen = new Set();
  let seq = 0;
  for (const it of items) {
    if (!it.id || seen.has(it.id)) {
      do { it.id = `r${today.replace(/-/g, '')}-${++seq}`; } while (taken.has(it.id));
      taken.add(it.id);
      changed = true;
    }
    seen.add(it.id);
    if (typeof it.added !== 'string' || !DATE_RE.test(it.added)) { it.added = today; changed = true; }
    const step = toInt(it.step);
    const fixedStep = Number.isNaN(step) ? 0 : clamp(step, 0, REVIEW_LADDER.length - 1);
    if (fixedStep !== it.step) { it.step = fixedStep; changed = true; }
    if (typeof it.due !== 'string' || !DATE_RE.test(it.due)) { it.due = localDate(REVIEW_LADDER[0]); changed = true; }
  }
  return { items, changed, error: null };
}

function saveReviews(items) {
  writeJsonAtomic(REVIEW_FILE, { version: 1, items });
}

// Loads the queue and persists any fill-ins, so a new item's due date is fixed
// the first time any command sees it.
function reviews() {
  const r = loadReviews();
  if (r.changed) { try { saveReviews(r.items); } catch { /* read-only use still works */ } }
  return r;
}

function reviewCounts() {
  const { items, error } = reviews();
  const today = localDate();
  return { total: items.length, due: items.filter(it => it.due <= today).length, error };
}

function reviewDue(limit) {
  const { items, error } = reviews();
  if (error) return { error };
  const today = localDate();
  const due = items.filter(it => it.due <= today).sort((a, b) => a.due.localeCompare(b.due));
  return { today, dueCount: due.length, items: due.slice(0, limit) };
}

function reviewGrade(id, grade) {
  const { items, error } = reviews();
  if (error) return { error };
  const it = items.find(x => x.id === id);
  if (!it) return { error: `no review item with id ${id}` };
  if (!['again', 'good', 'easy'].includes(grade)) return { error: 'grade must be again, good or easy' };
  it.step = grade === 'again' ? 0 : Math.min(it.step + (grade === 'easy' ? 2 : 1), REVIEW_LADDER.length - 1);
  it.due = localDate(REVIEW_LADDER[it.step]);
  it.history = [...(Array.isArray(it.history) ? it.history : []), { date: localDate(), grade }];
  saveReviews(items);
  return { id, grade, step: it.step, due: it.due };
}

// Drills record themselves in <gym>/<folder>/.drill.json; "open" ones can be resumed.
function openDrills() {
  return listDirs(GYM_DIR)
    .filter(e => !e.name.startsWith('.'))
    .map(e => {
      const { value } = parseJsonFile(path.join(GYM_DIR, e.name, '.drill.json'));
      return isObj(value) && value.status === 'open' ? { ...value, folder: fwd(path.join(GYM_DIR, e.name)) } : null;
    })
    .filter(Boolean);
}

function status() {
  const { profile, error } = loadProfile();
  const cfg = frictionConfig();
  return {
    today: localDate(),
    stateDir: fwd(STATE_DIR),
    gymDir: fwd(GYM_DIR),
    keysDir: fwd(path.join(GYM_DIR, '.keys')),
    pluginRoot: fwd(PLUGIN_ROOT),
    formatsFile: fwd(FORMATS_FILE),
    profileExists: profile !== null,
    profileError: error,
    profile,
    skillsMatrix: readText(path.join(STATE_DIR, 'skills-matrix.md')),
    recentJournal: recentJournal(60),
    review: reviewCounts(),
    openDrills: openDrills(),
    modules: catalog('modules', 'MODULE.md'),
    stacks: catalog('stacks', 'STACK.md'),
    templates: {
      module: fwd(path.join(PLUGIN_ROOT, 'modules', '_template', 'MODULE.md')),
      stack: fwd(path.join(PLUGIN_ROOT, 'stacks', '_template', 'STACK.md')),
    },
    friction: {
      levels: cfg.levels,
      checks: Object.fromEntries(Object.entries(cfg.checks).map(([id, c]) => [id, c.summary])),
      params: cfg.params,
      modulePromptsPerTask: cfg.modulePromptsPerTask,
      effective: profile ? effectiveFriction(profile) : null,
    },
  };
}

function sessionContext() {
  const { profile, error } = loadProfile();
  if (error) {
    return `se-mentor (a learning workflow plugin) cannot read the learner profile: ${error}. ` +
      `File: ${fwd(PROFILE_FILE)}. Tell the user once, and suggest fixing the file or running /se-mentor:setup, ` +
      'which repairs it without starting over. se-mentor checks are off until then.';
  }
  if (!profile) {
    return 'se-mentor (a learning workflow plugin) is installed but not set up yet. ' +
      'At a natural moment, mention once that the user can run /se-mentor:setup to configure it. Do not repeat it.';
  }

  const modules = catalog('modules', 'MODULE.md');
  const stacks = catalog('stacks', 'STACK.md');
  const { level, checks, modulePromptsPerTask } = effectiveFriction(profile);
  const lines = ['# se-mentor is active', ''];
  const section = (...ls) => lines.push(...ls, '');

  section(...[
    `Learner state dir: ${fwd(STATE_DIR)}. Anything written there follows ${fwd(FORMATS_FILE)}.`,
    profile.about && `Learner: ${profile.about}`,
    profile.goals.length && `Goals: ${profile.goals.join('; ')}`,
  ].filter(Boolean));

  const resolve = (names, cat, label, fix) => names.map(n =>
    cat[n] ? `- ${label(n)} -> ${cat[n].file}` : `- ${label(n)} -> MISSING (tell the user once; ${fix(n)} can fix it)`);

  if (profile.stacks.length) {
    section('Stacks (read the pack when stack-specific advice or practice repos are needed):',
      ...resolve(profile.stacks, stacks, n => n, n => `/se-mentor:extend stack ${n}`));
  } else {
    section('Stacks: none set. Infer the stack from the current repo. ' +
      'If it has no pack, mention once that /se-mentor:extend stack <name> can create one.');
  }

  const focus = profile.focus;
  if (focus.length && modulePromptsPerTask > 0) {
    section('Focus modules, weight 1-3. Before the first task, read the "On-the-job prompts" section of each, ' +
      `and scale to the learner's levels in ${fwd(path.join(STATE_DIR, 'skills-matrix.md'))}:`,
      ...resolve(focus.map(f => f.module), modules, n => `${n} (weight ${focus.find(f => f.module === n).weight})`,
        () => '/se-mentor:setup'));
    section(`Module prompt budget: at most ${modulePromptsPerTask} module on-the-job prompt(s) per task, on top of the active checks. ` +
      'When a module prompt overlaps an active check (e.g. a test case list during plan-first, an explain-back during diff-teachback), ' +
      'fold it into that check instead of asking separately; this does not use up budget. ' +
      'When several modules react to the same moment (an error pasted, "it works", a diff), that is one prompt: use the highest-weight module\'s version. ' +
      'When more prompts apply than the budget allows, pick by weight, then by which one fits the moment best.');
  } else if (focus.length) {
    section(`Focus modules: ${focus.map(f => f.module).join(', ')}. Module prompts are off at this friction level; ` +
      'use the modules only when a se-mentor skill is invoked.');
  }

  const active = checks.filter(c => c.mode !== 'off');
  if (active.length) {
    section(`Friction level: ${level}`, ...active.map(c => `- ${c.id} [${c.mode}]: ${c.instruction}`));
    section('Modes: "nudge" = offer it once, and drop it if the user declines. ' +
      '"require" = do not move on until it is done, unless the user declines or asks to skip it; then add an override entry to the journal.',
    'While a /se-mentor:* skill is running, its own steps replace these checks and the module prompts.');
  } else {
    section(`Friction level: ${level}. No checks active: behave like normal Claude Code; se-mentor skills run only when invoked.`);
  }

  const { due, error: reviewError } = reviewCounts();
  if (reviewError) {
    section(`Review queue: ${reviewError}. Tell the user once; don't add review items until it is fixed.`);
  } else if (due > 0) {
    section(`Review queue: ${due} item(s) due. Mention once, at a natural pause such as after finishing a task, ` +
      'that /se-mentor:review takes a few minutes. Never mention it while a se-mentor skill is running.');
  }

  lines.push(profile.confidentiality.logCodeSnippets === true
    ? 'Learner state: code snippets may be logged; still no secrets.'
    : 'Learner state: write concepts and lessons only. Never write client code, company or project names, ' +
      'work-repo file paths or identifiers into the learner state dir.');

  return lines.join('\n');
}

function init() {
  for (const sub of ['', 'journal', 'modules', 'stacks', 'gym']) fs.mkdirSync(path.join(STATE_DIR, sub), { recursive: true });
  // Learners may version the state dir; drill scratch projects don't belong in it.
  const ignore = path.join(STATE_DIR, '.gitignore');
  if (!fs.existsSync(ignore)) fs.writeFileSync(ignore, 'gym/\n');
  return { stateDir: fwd(STATE_DIR), created: true };
}

const out = v => process.stdout.write((typeof v === 'string' ? v : JSON.stringify(v, null, 2)) + '\n');
const hookOutput = context => process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context },
}));

const [cmd, a1, a2] = process.argv.slice(2);
try {
  if (cmd === 'status') {
    out(status());
  } else if (cmd === 'session-start') {
    hookOutput(sessionContext());
  } else if (cmd === 'init') {
    out(init());
  } else if (cmd === 'now') {
    out(new Date().toISOString());
  } else if (cmd === 'elapsed') {
    const start = Date.parse(a1);
    out(Number.isNaN(start) ? 'elapsed: pass the ISO time printed by `now`' : `${Math.max(0, Math.round((Date.now() - start) / 60000))} min`);
  } else if (cmd === 'review-due') {
    const limit = toInt(a1);
    out(reviewDue(Number.isNaN(limit) ? 10 : Math.max(1, limit)));
  } else if (cmd === 'review-grade') {
    out(reviewGrade(a1, a2));
  } else {
    out('usage: mentor.js status | session-start | init | now | elapsed <iso> | review-due [limit] | review-grade <id> <again|good|easy>');
  }
} catch (err) {
  const msg = `se-mentor helper error: ${err && err.message}`;
  if (cmd === 'session-start') hookOutput(`${msg}. Tell the user once; se-mentor checks are off for this session.`);
  else out({ error: msg });
}
