import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=process.cwd();
const baselinePath=path.join(root,'supabase/functions/fenix-document-extract/index.ts');
const candidatePath=path.join(root,'supabase/functions/fenix-document-extract-candidate/index.ts');
const baseline=fs.readFileSync(baselinePath,'utf8');
const candidate=fs.readFileSync(candidatePath,'utf8');

const EXPECTED_SOURCE_SHA='c8ccc623be364dcfc67b8be8f6b5320476909f4c1af77bf2e3339723b8a0b1c9';
const baselineSha=crypto.createHash('sha256').update(baseline).digest('hex');
if(baselineSha!==EXPECTED_SOURCE_SHA) throw new Error(`baseline drift: expected ${EXPECTED_SOURCE_SHA}, got ${baselineSha}`);

const requiredAdditions=[
  'modalidad_contrato',
  'numero_pagas',
  'fecha_inicio_contrato',
  'fecha_fin_contrato',
  'jornada',
  'categoria_profesional'
];
for(const token of requiredAdditions){
  if(!candidate.includes(token)) throw new Error(`candidate missing required labor token: ${token}`);
}

const preserved=[
  'https://api.openai.com/v1/responses',
  'model:"gpt-4.1-mini"',
  "p_policy_key:'document_auto_ingest_min_confidence'",
  "human_reason:'POLICY_CONFLICT'",
  "human_reason:'LOW_CONFIDENCE'",
  'fenix_prod_document_extract_resolve_server',
  'body.mode==="legacy_status"',
  'body.mode==="legacy_batch"'
];
for(const token of preserved){
  if(!baseline.includes(token) || !candidate.includes(token)) throw new Error(`preservation failure: ${token}`);
}

const normalize=(s)=>s.replace(/\s+/g,'');
const b=normalize(baseline);
const c=normalize(candidate);
const allowedFragments=[
  ',"numero_pagas"',
  ',"modalidad_contrato"',
  ',"fecha_inicio_contrato"',
  ',"fecha_fin_contrato"',
  ',"jornada"',
  ',"categoria_profesional"'
];
let reduced=c;
for(const fragment of allowedFragments){
  reduced=reduced.split(fragment).join('');
}
if(reduced!==b) throw new Error('candidate contains changes outside the permitted labor-field additions');

const candidateSha=crypto.createHash('sha256').update(candidate).digest('hex');
console.log(JSON.stringify({ok:true,baseline_sha256:baselineSha,candidate_sha256:candidateSha,allowed_additions:requiredAdditions}));
