import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.argv[2] || 'cerebro/runtime/neuronal-superparallel-source-v1.mjs');
const apply = process.argv.includes('--apply');
let text = fs.readFileSync(file, 'utf8');
const before = text;

const oldBlock = `function gitFiles() {\n  return execFileSync('git',['ls-files'],{encoding:'utf8'}).split(/\\r?\\n/).filter(Boolean);\n}`;
const newBlock = `function filesystemFiles(root = process.cwd()) {\n  const roots = ['cerebro','src','docs','.github'].filter(name => fs.existsSync(path.join(root,name)));\n  const files = [];\n  const walk = (absolute, relative) => {\n    for (const entry of fs.readdirSync(absolute,{withFileTypes:true})) {\n      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'artifacts') continue;\n      const abs = path.join(absolute,entry.name);\n      const rel = path.join(relative,entry.name).replace(/\\\\/g,'/');\n      if (entry.isDirectory()) walk(abs,rel);\n      else if (entry.isFile()) files.push(rel);\n    }\n  };\n  for (const name of roots) walk(path.join(root,name),name);\n  return files.sort();\n}\n\nfunction gitFiles() {\n  if (process.env.CEREBRO_NEURONAL_FORCE_FS_INVENTORY !== 'YES') {\n    try {\n      return execFileSync('git',['ls-files'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).split(/\\r?\\n/).filter(Boolean);\n    } catch { }\n  }\n  return filesystemFiles();\n}`;

if (!text.includes('function filesystemFiles(')) {
  const count = text.split(oldBlock).length - 1;
  if (count !== 1) throw new Error(`NEURONAL_GITFILES_ANCHOR_COUNT:${count}`);
  text = text.replace(oldBlock,newBlock);
}
for (const marker of ['function filesystemFiles(', 'CEREBRO_NEURONAL_FORCE_FS_INVENTORY', 'return filesystemFiles();']) {
  if (!text.includes(marker)) throw new Error(`NEURONAL_FS_FALLBACK_MARKER_MISSING:${marker}`);
}
if (apply && text !== before) fs.writeFileSync(file,text,'utf8');
console.log(JSON.stringify({ok:true,file,changed:text!==before,applied:apply}));
