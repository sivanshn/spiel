#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.argv[2] || 'src';
const exts = new Set(['.css', '.scss', '.html', '.js', '.jsx', '.ts', '.tsx', '.vue', '.fxml']);
const hardcodedColor = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g;
let issues = 0;
function scan(file) {
  const text = fs.readFileSync(file, 'utf8');
  const matches = text.match(hardcodedColor) || [];
  if (matches.length) {
    issues += matches.length;
    console.log(`\n${file}`);
    console.log(`  Hardcoded color values: ${[...new Set(matches)].join(', ')}`);
  }
}
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) walk(file);
    else if (exts.has(path.extname(file))) scan(file);
  }
}
walk(root);
if (issues) {
  console.log(`\nFound ${issues} possible hardcoded design values. Prefer tokens/CSS variables.`);
  process.exitCode = 1;
} else {
  console.log('No hardcoded color values found.');
}
