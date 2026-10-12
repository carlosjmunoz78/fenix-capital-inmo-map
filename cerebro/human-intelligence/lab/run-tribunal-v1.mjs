import fs from 'node:fs';
import path from 'node:path';
import { judgeHumanIntelligenceGolden } from '../evaluation/tribunal-v1.mjs';

function arg(name,fallback=null){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:fallback;}
const input=arg('--input','artifacts/human-intelligence/full-golden-old-vs-new.v1.json');
const output=arg('--out','artifacts/human-intelligence/tribunal-decision.v1.json');
const artifact=JSON.parse(fs.readFileSync(input,'utf8'));
const decision=judgeHumanIntelligenceGolden(artifact);
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(decision,null,2)+'\n');
console.log(JSON.stringify({verdict:decision.verdict,improvements:decision.strict_quality_improvements,promotion:decision.promotion}));
if(decision.verdict!=='NEW_BETTER')process.exitCode=1;
