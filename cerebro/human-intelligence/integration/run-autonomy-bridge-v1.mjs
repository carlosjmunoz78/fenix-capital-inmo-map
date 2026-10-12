import fs from 'node:fs';
import path from 'node:path';
import { buildHumanIntelligenceLearningReport } from './learning-bridge-v1.mjs';
import { buildHumanIntelligencePromotionPackage } from './promotion-controller-v1.mjs';

function arg(name,fallback=null){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:fallback;}
const goldenPath=arg('--golden','artifacts/human-intelligence/full-golden-old-vs-new.v1.json');
const tribunalPath=arg('--tribunal','artifacts/human-intelligence/tribunal-decision.v1.json');
const outDir=arg('--out-dir','artifacts/human-intelligence');
const golden=JSON.parse(fs.readFileSync(goldenPath,'utf8'));
const decision=JSON.parse(fs.readFileSync(tribunalPath,'utf8'));
const learning=buildHumanIntelligenceLearningReport({decision,golden,version:'1.0.0'});
const promotion=buildHumanIntelligencePromotionPackage({decision,golden,learningReport:learning});
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'learning-report.v1.json'),JSON.stringify(learning,null,2)+'\n');
fs.writeFileSync(path.join(outDir,'promotion-package.v1.json'),JSON.stringify(promotion,null,2)+'\n');
console.log(JSON.stringify({learning_events:learning.events_total,learning_event_id:learning.events[0].event_id,promotion_status:promotion.status,next_gate:promotion.next_gate,prod_authorized:false}));
