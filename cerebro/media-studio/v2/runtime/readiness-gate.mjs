import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const defaultPath=path.resolve(here,'../benchmarks/required-benchmarks.json');

export function loadReadinessBenchmarks(file=defaultPath){return JSON.parse(fs.readFileSync(file,'utf8'));}

export function evaluateUniversalMediaStudioReadiness(doc=loadReadinessBenchmarks()){
  const required=(doc.benchmarks||[]).filter(b=>b.required!==false);
  const passed=required.filter(b=>b.state==='PASS_WITH_EVIDENCE'&&b.evidence_ref);
  const failed=required.filter(b=>b.state==='FAIL');
  const incomplete=required.filter(b=>b.state!=='PASS_WITH_EVIDENCE'||!b.evidence_ref);
  return {
    gate:'UNIVERSAL_MEDIA_STUDIO_READY',
    ready:required.length>0&&incomplete.length===0,
    total_required:required.length,
    passed_with_evidence:passed.length,
    failed:failed.map(b=>b.id),
    incomplete:incomplete.map(b=>b.id)
  };
}

export function assertUniversalMediaStudioReady(doc=loadReadinessBenchmarks()){
  const result=evaluateUniversalMediaStudioReadiness(doc);
  if(!result.ready) throw new Error(`UNIVERSAL_MEDIA_STUDIO_NOT_READY:${result.incomplete.join(',')}`);
  return result;
}
