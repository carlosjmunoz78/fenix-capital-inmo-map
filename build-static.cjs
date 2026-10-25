const fs = require('fs');
const path = require('path');
const root = process.cwd();
const out = path.join(root, 'dist');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const skip = new Set(['dist', '.git', 'node_modules', 'package.json', 'package-lock.json', 'build-static.cjs', 'vercel.json']);
for (const name of fs.readdirSync(root)) {
  if (skip.has(name)) continue;
  fs.cpSync(path.join(root, name), path.join(out, name), { recursive: true });
}
