#!/usr/bin/env node
const fs = require('fs');
const input = process.argv[2];
const output = process.argv[3] || 'tokens.css';
if (!input) {
  console.error('Usage: node generate-tokens.cjs <tokens.json> [output.css]');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(input, 'utf8'));
const flat = {};
function walk(obj, path = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') walk(v, [...path, k]);
    else flat[path.concat(k).join('-').replace(/[A-Z]/g, m => '-' + m.toLowerCase())] = String(v);
  }
}
walk(data);
const lines = [':root {'];
for (const [key, value] of Object.entries(flat)) {
  const cssValue = value.replace(/\{([^}]+)\}/g, (_, p) => `var(--${p.replace(/\./g, '-').replace(/[A-Z]/g, m => '-' + m.toLowerCase())})`);
  lines.push(`  --${key}: ${cssValue};`);
}
lines.push('}');
fs.writeFileSync(output, lines.join('\n') + '\n');
console.log(`Generated ${output}`);
