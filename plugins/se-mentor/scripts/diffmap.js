#!/usr/bin/env node
// se-mentor diff map helper: extracts facts from a git diff and renders Mermaid maps.
//
// Commands:
//   facts [target] [-- <path>...]
//                      JSON facts about a diff. target: empty (uncommitted changes),
//                      staged, <branch>, <commit>, <a>..<b> or <a>...<b>. Paths after --
//                      narrow it to those files or folders.
//   facts --stdin      the same, for a unified diff piped in (e.g. from `gh pr diff`)
//   render <file.mmd>  Wraps Mermaid sections in a self-contained HTML page next to the
//                      file and opens it in the browser (unless SE_MENTOR_NO_OPEN is set)
//
// Like mentor.js, this script must never throw or exit non-zero, and uses Node
// built-ins only. Maps go to the OS temp dir, never the learner state dir: they
// name files and functions from work repos.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

// Per user on shared-/tmp systems, so other accounts can't list client file names.
const MAPS_DIR = path.join(os.tmpdir(),
  typeof process.getuid === 'function' ? `se-mentor-maps-${process.getuid()}` : 'se-mentor-maps');
const MAX_FILES = 200;
const COLLAPSE_OVER = 25;
const MERMAID_URL = 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs';

const fwd = p => p.split(path.sep).join('/');

// quotePath=false keeps non-ASCII paths readable instead of C-quoted.
function git(args) {
  return execFileSync('git', ['-c', 'core.quotePath=false', ...args],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}
const gitOk = args => { try { git(args); return true; } catch { return false; } };

// ---- Classification -------------------------------------------------------

const EXCLUDED = [
  /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|go\.sum|poetry\.lock|uv\.lock|Pipfile\.lock|Cargo\.lock|composer\.lock|Gemfile\.lock|packages\.lock\.json|gradle\.lockfile)$/,
  /(^|\/)(dist|build|out|target|vendor|node_modules|\.next|coverage)\//,
  /\.min\.(js|css)$/, /\.(map|snap)$/, /(^|\/)__snapshots__\//,
  /\.(g|generated|designer)\.\w+$/i, /\.generated\./i,
];
const TEST = [
  /(^|\/)(tests?|__tests__|spec|specs|e2e|testing)\//i, /\.(test|spec)\.[cm]?[jt]sx?$/,
  /_test\.go$/, /(^|\/)test_[^/]*\.py$/, /_test\.py$/, /Tests?\.(cs|java|kt)$/, /(^|\/)Test[A-Z][^/]*\.(java|kt)$/,
];
const TAGS = {
  data: [/(^|\/)(migrations?|alembic\/versions|db\/migrate|Migrations)\//, /\.sql$/i, /(^|\/)changelog[^/]*\.(xml|ya?ml)$/i],
  dependency: [/(^|\/)(package\.json|go\.mod|pom\.xml|build\.gradle(\.kts)?|settings\.gradle(\.kts)?|requirements[^/]*\.txt|pyproject\.toml|Pipfile|Gemfile|Cargo\.toml|composer\.json|Directory\.Packages\.props|[^/]+\.csproj)$/],
  config: [/(^|\/)(appsettings[^/]*\.json|application[^/]*\.(ya?ml|properties)|settings\.py|\.env[^/]*|docker-compose[^/]*\.ya?ml|Dockerfile[^/]*|[^/]*\.config\.[cm]?[jt]s|tsconfig[^/]*\.json|vite\.config\.\w+|next\.config\.\w+)$/i],
  contract: [/\.(proto|graphql|gql)$/i, /(^|\/)(openapi|swagger)[^/]*\.(ya?ml|json)$/i, /(^|\/)(dto|dtos|contracts?|schemas?)\//i],
  // Case-sensitive on purpose: a word must end at a separator or a capital letter, so
  // AuthService.cs matches and author.ts doesn't.
  security: [/(^|[/_.-])([Oo]?[Aa]uth(entication|orization|[nz])?|[Ss]ecurity|[Pp]ermissions?|[Pp]olic(y|ies)|[Cc]rypto|[Tt]okens?|[Ss]essions?|[Ll]ogin|[Pp]asswords?|[Ss]ecrets?)(?=[/_.-]|[A-Z]|$)/],
};
const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|java|kt|kts|cs|go|rb|php|rs|swift|scala|vue|svelte)$/;

const tagsFor = p => Object.entries(TAGS).filter(([, res]) => res.some(re => re.test(p))).map(([t]) => t);

// Groups a file under the last two segments of its directory, after dropping
// common source roots, which works for both shallow layouts (src/orders/api) and
// deep Java ones (src/main/java/com/acme/orders/api).
const SOURCE_ROOTS = new Set(['src', 'app', 'lib', 'internal', 'pkg', 'source', 'main', 'java', 'kotlin', 'python']);
function moduleOf(p) {
  const segs = path.posix.dirname(p).split('/').filter(s => s !== '.');
  while (segs.length && SOURCE_ROOTS.has(segs[0])) segs.shift();
  return segs.length ? segs.slice(-2).join('/') : '(root)';
}

// The name a test file is about: handler.test.ts, test_handler.py, handler_test.go,
// HandlerTests.cs and TestHandler.java all give "handler".
const testSubject = p => path.posix.basename(p).replace(/\.[^.]+$/, '')
  .replace(/(\.(test|spec)|_test|Tests?)$/i, '').replace(/^(test_|Test(?=[A-Z]))/, '').toLowerCase();
const codeName = p => path.posix.basename(p).replace(/\.[^.]+$/, '').toLowerCase();

// Import statements across common languages. A heuristic, reported as such.
const IMPORT_RES = [
  /^\s*import\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/, // JS/TS
  /^\s*}\s*from\s+['"]([^'"]+)['"]/, // last line of a multi-line JS/TS import
  /\brequire\(\s*['"]([^'"]+)['"]\s*\)/, // CommonJS
  /^\s*from\s+([\w.]+)\s+import\b/, // Python
  /^\s*import\s+(?:static\s+)?([\w.]+(?:\.\*)?)(?:\s+as\s+\w+)?\s*;?\s*$/, // Python, Java, Kotlin
  /^\s*using\s+(?:static\s+)?([\w.]+)\s*;/, // C#
];
// Go: `import "x"` anywhere, or a bare `"x"` line only inside an import block.
const GO_SINGLE = /^\s*import\s+(?:[\w.]+\s+)?"([\w./-]+)"\s*$/;
const GO_BLOCK_LINE = /^\s*(?:[\w.]+\s+)?"([\w./-]+)"\s*$/;

function importOf(line, file, inGoImportBlock = false) {
  if (file.endsWith('.go')) {
    const m = line.match(GO_SINGLE) || (inGoImportBlock ? line.match(GO_BLOCK_LINE) : null);
    return m ? m[1] : null;
  }
  for (const re of IMPORT_RES) { const m = line.match(re); if (m) return m[1]; }
  return null;
}

// ---- Diff parsing ---------------------------------------------------------

function parseDiff(text) {
  const files = [];
  let f = null;
  let inHunk = false; // header lines (---, +++, rename, mode) only come before the first @@
  let goBlock = false; // inside a Go `import ( ... )` block
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('diff --git ')) {
      const m = line.match(/^diff --git a\/(.+) b\/(.+)$/);
      f = { path: m ? m[2] : line.slice(11), oldPath: m ? m[1] : null, status: 'M', added: 0, deleted: 0,
        binary: false, symbols: new Set(), importsAdded: new Set(), importsRemoved: new Set() };
      files.push(f);
      inHunk = false;
    } else if (!f) {
      continue;
    } else if (line.startsWith('@@')) {
      inHunk = true;
      // git's hunk header: often the enclosing function, but only a nearby line
      // for languages it has no rules for. Import lines are never useful here.
      const ctx = line.replace(/^@@[^@]*@@\s?/, '').trim();
      goBlock = /^import\s*\($/.test(ctx);
      if (ctx && !goBlock && !importOf(ctx, f.path) && f.symbols.size < 8) f.symbols.add(ctx.slice(0, 100));
    } else if (!inHunk) {
      if (line.startsWith('new file mode')) f.status = 'A';
      else if (line.startsWith('deleted file mode')) f.status = 'D';
      else if (line.startsWith('rename from ')) { f.status = 'R'; f.oldPath = line.slice(12); }
      else if (line.startsWith('rename to ')) f.path = line.slice(10);
      else if (line.startsWith('Binary files ')) f.binary = true;
    } else if (line.startsWith('+') || line.startsWith('-')) {
      const content = line.slice(1);
      if (/^\s*import\s*\($/.test(content)) goBlock = true;
      else if (goBlock && /^\s*\)\s*$/.test(content)) goBlock = false;
      const imp = importOf(content, f.path, goBlock);
      if (line[0] === '+') { f.added++; if (imp) f.importsAdded.add(imp); }
      else { f.deleted++; if (imp) f.importsRemoved.add(imp); }
    }
  }
  for (const x of files) {
    // An import moved within a file is not a dependency change.
    for (const i of [...x.importsAdded]) if (x.importsRemoved.has(i)) { x.importsAdded.delete(i); x.importsRemoved.delete(i); }
    if (x.oldPath === x.path) x.oldPath = null;
  }
  return files;
}

function untrackedAsDiff(pathspec) {
  let out = '';
  for (const p of git(['ls-files', '--others', '--exclude-standard', '-z', ...pathspec]).split('\0').filter(Boolean)) {
    let body = '';
    try {
      const text = fs.readFileSync(p, 'utf8');
      const lines = text.split(/\r?\n/).filter((l, i, a) => i < a.length - 1 || l);
      body = text.includes('\0') ? 'Binary files /dev/null and b/' + p + ' differ\n'
        : lines.length ? `@@ -0,0 +1,${lines.length} @@\n` + lines.map(l => '+' + l).join('\n') + '\n' : '';
    } catch { body = ''; }
    out += `diff --git a/${p} b/${p}\nnew file mode 100644\n${body}`;
  }
  return out;
}

function defaultBranch() {
  try { return git(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']).trim(); } catch { /* no remote HEAD */ }
  for (const b of ['main', 'master']) if (gitOk(['rev-parse', '--verify', '--quiet', b])) return b;
  return null;
}

// Explicit prefixes override diff.noprefix / diff.mnemonicPrefix in the user's config.
const DIFF_FLAGS = ['--no-color', '--no-ext-diff', '-U0', '--find-renames', '--src-prefix=a/', '--dst-prefix=b/'];

// Returns { label, text } for a target, or { error }.
function diffFor(target, paths) {
  if (!gitOk(['rev-parse', '--is-inside-work-tree'])) return { error: 'not a git repository' };
  // Paths are given relative to where the learner is; make them absolute before moving
  // to the repo root (git accepts absolute paths inside the work tree).
  const ps = paths.length ? ['--', ...paths.map(p => path.resolve(p))] : [];
  // Run from the repo root so untracked paths are root-relative like git diff's.
  process.chdir(git(['rev-parse', '--show-toplevel']).trim());
  if (target.startsWith('-')) return { error: `invalid target "${target}"` };
  const scope = paths.length ? ` in ${paths.join(', ')}` : '';
  const hasHead = gitOk(['rev-parse', '--verify', '--quiet', 'HEAD']);
  if (!target) {
    const tracked = hasHead ? git(['diff', ...DIFF_FLAGS, 'HEAD', ...ps]) : git(['diff', ...DIFF_FLAGS, '--cached', ...ps]);
    return { label: 'uncommitted changes' + scope, text: tracked + untrackedAsDiff(ps) };
  }
  if (target === 'staged') return { label: 'staged changes' + scope, text: git(['diff', ...DIFF_FLAGS, '--cached', ...ps]) };
  if (target.includes('..')) return { label: target + scope, text: git(['diff', ...DIFF_FLAGS, target, ...ps]) };
  if (gitOk(['show-ref', '--verify', '--quiet', `refs/heads/${target}`]) ||
      gitOk(['show-ref', '--verify', '--quiet', `refs/remotes/${target}`])) {
    const base = defaultBranch();
    if (!base) return { error: `no default branch found to compare ${target} against; pass <base>...${target}` };
    return { label: `${base}...${target}` + scope, text: git(['diff', ...DIFF_FLAGS, `${base}...${target}`, ...ps]) };
  }
  if (gitOk(['rev-parse', '--verify', '--quiet', `${target}^{commit}`])) {
    // A merge commit's own changes are its diff against the first parent.
    return { label: `commit ${target}` + scope, text: git(['show', '--format=', '--diff-merges=first-parent', ...DIFF_FLAGS, target, ...ps]) };
  }
  return { error: `unknown target "${target}": use staged, a branch, a commit, or <a>..<b>` };
}

function facts(label, text) {
  const all = parseDiff(text).map(f => {
    const excluded = EXCLUDED.some(re => re.test(f.path));
    return {
      path: f.path, ...(f.oldPath ? { oldPath: f.oldPath } : {}), status: f.status,
      added: f.added, deleted: f.deleted, ...(f.binary ? { binary: true } : {}),
      module: moduleOf(f.path), excluded, test: !excluded && TEST.some(re => re.test(f.path)),
      tags: excluded ? [] : tagsFor(f.path),
      context: [...f.symbols], importsAdded: [...f.importsAdded], importsRemoved: [...f.importsRemoved],
    };
  });
  const included = all.filter(f => !f.excluded);
  // A code file counts as having a test change when a changed (not deleted) test has the
  // same name and sits in the same folder, or its path contains the code file's parent
  // folder (tests/orders/service.test.ts for src/orders/service.ts). Strict on purpose:
  // a missed pairing only leads to a question, a wrong one to false comfort.
  const tests = included.filter(f => f.test && f.status !== 'D');
  for (const f of included.filter(x => !x.test)) {
    const dir = path.posix.dirname(f.path);
    const parent = path.posix.basename(dir);
    const shallow = dir === '.' || SOURCE_ROOTS.has(parent);
    f.testChanged = tests.some(t => testSubject(t.path) === codeName(f.path) &&
      (shallow || path.posix.dirname(t.path) === dir || t.path.split('/').includes(parent)));
  }
  const modules = {};
  for (const f of included) {
    const m = modules[f.module] || (modules[f.module] = { name: f.module, files: 0, added: 0, deleted: 0, tests: 0, tags: new Set() });
    m.files++; m.added += f.added; m.deleted += f.deleted; if (f.test) m.tests++;
    f.tags.forEach(t => m.tags.add(t));
  }
  const dependencyChanges = included.filter(f => !f.test && (f.importsAdded.length || f.importsRemoved.length)).length;
  return {
    target: label,
    mapsDir: fwd(MAPS_DIR),
    totals: {
      files: all.length, included: included.length, excluded: all.length - included.length,
      added: included.reduce((n, f) => n + f.added, 0), deleted: included.reduce((n, f) => n + f.deleted, 0),
    },
    hints: {
      collapseToModules: included.length > COLLAPSE_OVER,
      structureView: dependencyChanges > 0 || included.some(f => f.tags.includes('dependency')),
      dependencyChanges,
      // Code files with no changed test of the same name. A name match is a hint,
      // not proof of coverage: the learner should check.
      codeWithoutTestChange: included.filter(f => !f.test && f.status !== 'D' && !f.testChanged && CODE_EXT.test(f.path) &&
        !f.tags.some(t => ['config', 'dependency', 'data'].includes(t))).map(f => f.path),
      importsAreHeuristic: true,
    },
    modules: Object.values(modules).map(m => ({ ...m, tags: [...m.tags] })).sort((a, b) => (b.added + b.deleted) - (a.added + a.deleted)),
    files: all.slice(0, MAX_FILES),
    ...(all.length > MAX_FILES ? { truncated: all.length - MAX_FILES } : {}),
  };
}

// ---- Rendering ------------------------------------------------------------

// Fixed palette so a learner sees the same colour mean the same thing every time.
const CLASSES = {
  code: ['#e2e8f0', '#475569', 'Changed code'],
  test: ['#bbf7d0', '#15803d', 'Tests'],
  contract: ['#fde68a', '#b45309', 'Contract: API, schema, DTO, signature'],
  data: ['#fecdd3', '#be123c', 'Data: migration, query, persistence'],
  security: ['#fca5a5', '#991b1b', 'Security: auth, permissions, secrets'],
  dependency: ['#ddd6fe', '#6d28d9', 'New or changed dependency'],
  config: ['#bae6fd', '#0369a1', 'Config and infrastructure'],
};
const classDefs = Object.entries(CLASSES)
  .map(([name, [fill, stroke]]) => `  classDef ${name} fill:${fill},stroke:${stroke},color:#111,stroke-width:1.5px`).join('\n');

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// A .mmd file holds one or more sections, each starting with `%% view: <title>`.
function sectionsOf(src) {
  const parts = [];
  let cur = null;
  for (const line of src.replace(/^﻿/, '').split(/\r?\n/)) {
    const m = line.match(/^%%\s*view:\s*(.+)$/);
    if (m) { cur = { title: m[1].trim(), lines: [] }; parts.push(cur); continue; }
    if (!cur) { cur = { title: 'Change map', lines: [] }; parts.push(cur); }
    cur.lines.push(line);
  }
  return parts.map(p => {
    let body = p.lines.join('\n').trim();
    // Flowcharts get the shared class definitions appended.
    if (/^(flowchart|graph)\b/.test(body) && !/classDef\s+code\b/.test(body)) body += '\n' + classDefs;
    return { title: p.title, body };
  }).filter(p => p.body);
}

function page(title, sections, sourceName) {
  const legend = Object.values(CLASSES)
    .map(([fill, stroke, label]) => `<span><i style="background:${fill};border-color:${stroke}"></i>${esc(label)}</span>`).join('');
  const blocks = sections.map(s => `<section><h2>${esc(s.title)}</h2><pre class="mermaid">${esc(s.body)}</pre></section>`).join('\n');
  const source = sections.map(s => '```mermaid\n' + s.body + '\n```').join('\n\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
:root{--bg:#ffffff;--fg:#1b1f24;--muted:#5b6470;--card:#f6f8fa;--line:#d0d7de}
@media (prefers-color-scheme: dark){:root{--bg:#0d1117;--fg:#e6edf3;--muted:#9da7b3;--card:#161b22;--line:#30363d}}
body{margin:0;padding:24px 16px;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1200px;margin:0 auto}
h1{font-size:20px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 8px}
.sub{color:var(--muted);margin:0 0 16px}
.legend{display:flex;flex-wrap:wrap;gap:8px 16px;padding:10px 12px;background:var(--card);border:1px solid var(--line);border-radius:8px;font-size:13px}
.legend i{display:inline-block;width:12px;height:12px;border:2px solid;border-radius:3px;margin-right:6px;vertical-align:-2px}
.mermaid{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:16px;overflow-x:auto;margin:0}
details{margin-top:28px}summary{cursor:pointer;color:var(--muted)}
details pre{white-space:pre-wrap;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px;font-size:12px}
#fallback{display:none;margin-top:16px;padding:12px;border:1px solid #b45309;border-radius:8px}
</style></head>
<body><main>
<h1>${esc(title)}</h1>
<p class="sub">Generated by se-mentor from ${esc(sourceName)} on ${esc(new Date().toLocaleString())}. Arrows are only drawn where the diff shows them.</p>
<div class="legend">${legend}<span><b>==&gt;</b>&nbsp;new connection</span><span><b>-.-&gt;</b>&nbsp;removed connection</span></div>
<p id="fallback"></p>
${blocks}
<details><summary>Mermaid source (paste into a GitHub PR description to render it there)</summary><pre>${esc(source)}</pre></details>
</main>
<script type="module">
const fallback = msg => { const el = document.getElementById('fallback'); el.textContent = msg; el.style.display = 'block'; };
let mermaid;
try {
  ({ default: mermaid } = await import('${MERMAID_URL}'));
} catch (e) {
  fallback('The diagram renderer could not load (offline, or blocked by the network). The Mermaid source below still describes the map. Ask Claude for a terminal version.');
}
if (mermaid) {
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: dark ? 'dark' : 'default', flowchart: { htmlLabels: false } });
  try { await mermaid.run(); } catch (e) {
    fallback('A diagram has a syntax error, so it could not be drawn. Tell Claude, which can fix the map: ' + (e && e.message ? e.message : e));
  }
}
</script>
</body></html>
`;
}

function openInBrowser(file) {
  if (process.env.SE_MENTOR_NO_OPEN) return false;
  try {
    // rundll32 avoids cmd.exe, which would interpret & and %VAR% in the path.
    const [cmd, args] = process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', file]]
      : process.platform === 'darwin' ? ['open', [file]] : ['xdg-open', [file]];
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true });
    // A missing opener (no xdg-open on a headless box) is reported asynchronously;
    // without a listener it would crash the script after the JSON was printed.
    child.on('error', () => {});
    child.unref();
    return true;
  } catch { return false; }
}

function render(mmdFile) {
  let src;
  try { src = fs.readFileSync(mmdFile, 'utf8'); } catch { return { error: `cannot read ${mmdFile}` }; }
  const sections = sectionsOf(src);
  if (!sections.length) return { error: 'no Mermaid content found' };
  // Branch names can contain characters a shell or opener would interpret.
  const safeBase = path.basename(mmdFile).replace(/\.mmd$/i, '').replace(/[^\w.-]/g, '_') || 'map';
  const html = path.join(path.dirname(mmdFile), safeBase + '.html');
  const title = sections.length === 1 ? sections[0].title : 'Diff map';
  fs.writeFileSync(html, page(title, sections, path.basename(mmdFile)));
  return { html: fwd(html), views: sections.map(s => s.title), opened: openInBrowser(html) };
}

// ---- CLI ------------------------------------------------------------------

// Maps name client files, so on systems with a shared /tmp the folder must be a real
// directory owned by this user and closed to others. mkdir's mode does nothing if
// someone else created the folder (or a symlink) first, so check it afterwards.
function mapsDirProblem() {
  fs.mkdirSync(MAPS_DIR, { recursive: true, mode: 0o700 });
  if (typeof process.getuid !== 'function') return null; // Windows: %TEMP% is per-user
  const st = fs.lstatSync(MAPS_DIR);
  if (!st.isDirectory() || st.isSymbolicLink() || st.uid !== process.getuid() || (st.mode & 0o077) !== 0) {
    return `${fwd(MAPS_DIR)} is not a private directory owned by you; remove it and try again`;
  }
  return null;
}

const out = v => process.stdout.write(JSON.stringify(v, null, 2) + '\n');
const [cmd, ...rest] = process.argv.slice(2);
try {
  const problem = mapsDirProblem();
  if (problem) {
    out({ error: problem });
  } else if (cmd === 'facts' && rest[0] === '--stdin') {
    out(facts(rest[1] || 'piped diff', fs.readFileSync(0, 'utf8')));
  } else if (cmd === 'facts') {
    const sep = rest.indexOf('--');
    const d = diffFor((sep < 0 ? rest : rest.slice(0, sep)).join(' ').trim(), sep < 0 ? [] : rest.slice(sep + 1));
    out(d.error ? { error: d.error, mapsDir: fwd(MAPS_DIR) } : facts(d.label, d.text));
  } else if (cmd === 'render' && rest[0]) {
    out(render(rest[0]));
  } else {
    out({ usage: 'diffmap.js facts [target] [-- <path>...] | facts --stdin [label] | render <file.mmd>' });
  }
} catch (err) {
  out({ error: `diffmap helper error: ${err && err.message}` });
}
