import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=process.cwd();
const baselinePath=path.join(root,'supabase/functions/fenix-document-extract/index.ts');
const candidatePath=path.join(root,'supabase/functions/fenix-document-extract-candidate/index.ts');
const baseline=fs.readFileSync(baselinePath,'utf8');
const candidate=fs.readFileSync(candidatePath,'utf8');

const EXPECTED_SOURCE_SHA='2f1bf1e8a0d1272135948e46b07e438ec89b10abf9804af1fde035e93446c063';
const baselineSha=crypto.createHash('sha256').update(baseline).digest('hex');
if(baselineSha!==EXPECTED_SOURCE_SHA) throw new Error(`baseline drift: expected ${EXPECTED_SOURCE_SHA}, got ${baselineSha}`);

const declaration=(source,name)=>{
  const startToken=`const ${name}=`;
  const start=source.indexOf(startToken);
  if(start<0)throw new Error(`missing declaration: ${name}`);
  const end=source.indexOf(';',start);
  if(end<0)throw new Error(`unterminated declaration: ${name}`);
  return {start,end:end+1,text:source.slice(start,end+1)};
};
const values=(text)=>[...text.matchAll(/\"([^\"]+)\"/g)].map(m=>m[1]);
const compareDeclaration=(name,allowedAdditions)=>{
  const b=declaration(baseline,name);
  const c=declaration(candidate,name);
  const bv=values(b.text);
  const cv=values(c.text);
  const stripped=cv.filter(v=>!allowedAdditions.includes(v));
  if(JSON.stringify(stripped)!==JSON.stringify(bv)) throw new Error(`${name} changed outside allowed additions`);
  for(const token of allowedAdditions){
    const before=bv.filter(v=>v===token).length;
    const after=cv.filter(v=>v===token).length;
    if(after!==before+1) throw new Error(`${name} expected exactly one added ${token}`);
  }
  return {b,c};
};

const numberDecl=compareDeclaration('NUMBER_FIELDS',['numero_pagas']);
const fieldDecl=compareDeclaration('FIELD_KEYS',['modalidad_contrato','numero_pagas']);
const canonicalDecl=compareDeclaration('CANONICAL_KEYS',['modalidad_contrato','fecha_inicio_contrato','fecha_fin_contrato','jornada','categoria_profesional','numero_pagas']);

const stripDeclarations=(source,decls)=>{
  const ordered=[...decls].sort((a,b)=>b.start-a.start);
  let out=source;
  for(const d of ordered) out=out.slice(0,d.start)+`<${d.text.slice(6,d.text.indexOf('='))}:DECLARATION>`+out.slice(d.end);
  return out;
};
const baselineRest=stripDeclarations(baseline,[numberDecl.b,fieldDecl.b,canonicalDecl.b]);
const candidateRest=stripDeclarations(candidate,[numberDecl.c,fieldDecl.c,canonicalDecl.c]);
if(candidateRest!==baselineRest) throw new Error('candidate contains changes outside the permitted labor-field additions');

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

const candidateSha=crypto.createHash('sha256').update(candidate).digest('hex');
console.log(JSON.stringify({ok:true,baseline_sha256:baselineSha,candidate_sha256:candidateSha,allowed_changes:{NUMBER_FIELDS:['numero_pagas'],FIELD_KEYS:['modalidad_contrato','numero_pagas'],CANONICAL_KEYS:['modalidad_contrato','fecha_inicio_contrato','fecha_fin_contrato','jornada','categoria_profesional','numero_pagas']}}));
