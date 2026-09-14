import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const root=process.cwd();
const sourcePath=path.join(root,'supabase/functions/fenix-document-extract/index.ts');
const outputPath=path.join(root,'supabase/functions/fenix-document-extract-candidate/index.ts');
const source=fs.readFileSync(sourcePath,'utf8');
const EXPECTED_SOURCE_SHA='c8ccc623be364dcfc67b8be8f6b5320476909f4c1af77bf2e3339723b8a0b1c9';

const baselineSha=crypto.createHash('sha256').update(source).digest('hex');
if(baselineSha!==EXPECTED_SOURCE_SHA)throw new Error(`baseline drift: expected ${EXPECTED_SOURCE_SHA}, got ${baselineSha}`);

const mutateArrayDeclaration=(input,name,mutator)=>{
  const startToken=`const ${name}=`;
  const start=input.indexOf(startToken);
  if(start<0)throw new Error(`missing declaration: ${name}`);
  const end=input.indexOf(';',start);
  if(end<0)throw new Error(`unterminated declaration: ${name}`);
  const declaration=input.slice(start,end+1);
  const mutated=mutator(declaration);
  if(mutated===declaration)throw new Error(`no-op mutation: ${name}`);
  return input.slice(0,start)+mutated+input.slice(end+1);
};

const insertBefore=(declaration,anchor,addition,label)=>{
  const needle=`\"${anchor}\"`;
  const pos=declaration.indexOf(needle);
  if(pos<0)throw new Error(`missing anchor: ${label}`);
  if(declaration.indexOf(needle,pos+needle.length)>=0)throw new Error(`ambiguous anchor: ${label}`);
  if(declaration.includes(`\"${addition}\"`))throw new Error(`already present: ${label}`);
  return declaration.slice(0,pos)+`\"${addition}\",`+declaration.slice(pos);
};

let candidate=source;
candidate=mutateArrayDeclaration(candidate,'NUMBER_FIELDS',(d)=>insertBefore(d,'importe_principal','numero_pagas','NUMBER_FIELDS.numero_pagas'));
candidate=mutateArrayDeclaration(candidate,'FIELD_KEYS',(d)=>{
  let out=insertBefore(d,'antiguedad_laboral','modalidad_contrato','FIELD_KEYS.modalidad_contrato');
  out=insertBefore(out,'salario_base','numero_pagas','FIELD_KEYS.numero_pagas');
  return out;
});
candidate=mutateArrayDeclaration(candidate,'CANONICAL_KEYS',(d)=>{
  let out=insertBefore(d,'antiguedad_laboral','modalidad_contrato','CANONICAL_KEYS.modalidad_contrato');
  for(const field of ['fecha_inicio_contrato','fecha_fin_contrato','jornada','categoria_profesional','numero_pagas']){
    out=insertBefore(out,'ingresos_netos_mensuales',field,`CANONICAL_KEYS.${field}`);
  }
  return out;
});

const preserved=[
  ['https://api.openai.com/v1/responses','provider endpoint'],
  ['model:"gpt-4.1-mini"','model'],
  ["p_policy_key:'document_auto_ingest_min_confidence'",'confidence policy'],
  ["human_reason:'POLICY_CONFLICT'",'POLICY_CONFLICT'],
  ["human_reason:'LOW_CONFIDENCE'",'LOW_CONFIDENCE'],
  ['fenix_prod_document_extract_resolve_server','scope resolver'],
  ['body.mode==="legacy_status"','legacy_status'],
  ['body.mode==="legacy_batch"','legacy_batch']
];
for(const [needle,label] of preserved){if(!candidate.includes(needle))throw new Error(`preservation failure: ${label}`)}

const changedTokens=['modalidad_contrato','numero_pagas','fecha_inicio_contrato','fecha_fin_contrato','jornada','categoria_profesional'];
for(const token of changedTokens){if(!candidate.includes(token))throw new Error(`candidate missing ${token}`)}

const candidateSha=crypto.createHash('sha256').update(candidate).digest('hex');

if(process.argv.includes('--write')){
  fs.mkdirSync(path.dirname(outputPath),{recursive:true});
  fs.writeFileSync(outputPath,candidate);
}

console.log(JSON.stringify({ok:true,baseline_sha256:baselineSha,candidate_sha256:candidateSha,output:process.argv.includes('--write')?path.relative(root,outputPath):null}));
