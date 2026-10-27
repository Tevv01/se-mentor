#!/usr/bin/env node
// Contributor check: every module and stack pack follows its template contract.
// Usage: node scripts/check.js   (exits 1 on any problem)
'use strict';
const fs = require('fs');
const path = require('path');

const PLUGIN = path.join(__dirname, '..', 'plugins', 'se-mentor');
const CONTRACTS = {
  modules: { file: 'MODULE.md', headings: ['What good looks like', 'Levels', 'Techniques', 'On-the-job prompts', 'Gym drills', 'Signals to log'] },
  stacks: { file: 'STACK.md', headings: ['Tooling and commands', 'Idioms and conventions', 'Where to start reading', 'Common pitfalls', 'Practice repos', 'Module notes'] },
};

const problems = [];
let checked = 0;
for (const [kind, { file, headings }] of Object.entries(CONTRACTS)) {
  const dir = path.join(PLUGIN, kind);
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('_') || !fs.statSync(path.join(dir, name)).isDirectory()) continue;
    const where = `${kind}/${name}/${file}`;
    let text;
    try { text = fs.readFileSync(path.join(dir, name, file), 'utf8'); } catch { problems.push(`${where}: missing`); continue; }
    checked++;
    const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!front || !new RegExp(`^name:\\s*${name}\\s*$`, 'm').test(front[1])) problems.push(`${where}: frontmatter name must be "${name}"`);
    if (!front || !/^description:\s*\S/m.test(front[1])) problems.push(`${where}: frontmatter needs a description`);
    if (kind === 'stacks' && (!front || !/^detect:\s*\S/m.test(front[1]))) problems.push(`${where}: frontmatter needs detect (files that mark a repo as this stack)`);
    const found = [...text.matchAll(/^## (.+?)\s*$/gm)].map(m => m[1]);
    if (found.join('|') !== headings.join('|')) problems.push(`${where}: sections must be exactly, in order: ${headings.join(', ')}`);
    if (kind === 'modules') {
      const levels = (text.split(/^## Levels/m)[1] || '').split(/^## /m)[0].match(/^\d\. \*\*/gm) || [];
      if (levels.length !== 5) problems.push(`${where}: needs exactly 5 levels, found ${levels.length}`);
      const drills = (text.split(/^## Gym drills/m)[1] || '').split(/^## /m)[0].match(/^- \*\*.+$/gm) || [];
      for (const d of drills) if (!/\(levels \d-\d, /.test(d)) problems.push(`${where}: drill needs "(levels X-Y, <time box>)": ${d.slice(0, 60)}`);
    }
  }
}

if (problems.length) {
  console.log(problems.map(p => `✘ ${p}`).join('\n'));
  process.exit(1);
}
console.log(`✔ ${checked} modules and stack packs follow their contracts`);
