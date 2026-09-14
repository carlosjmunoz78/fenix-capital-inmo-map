import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const root=process.cwd();
const sourcePath=path.join(root,'supabase/functions/fenix-document-extract/index.ts');
const outputPath=path.join(root,'supabase/functions/fenix-document-extract-candidate/index.ts');
const source=fs.readFileSync(sourcePath,'utf8');
const EXPECTED_LIVE_SHA='54b2a282be040ceeef3564cc6c7d7653c59b96e25ce3db9e7af27c9634b531d2';

const replaceOnce=(input,from,to,label)=>{
  const first=input.indexOf(from);
  if(first<0)throw new Error(`missing anchor: ${label}`);
  if(input.indexOf(from,first+from.length)>=0)throw new Error(`ambiguous anchor: ${label}`);
  return input.replace(from,to);
};

const baselineSha=crypto.createHash('sha256').update(source).digest('hex');
if(baselineSha!==EXPECTED_LIVE_SHA)throw new Error(`baseline drift: expected ${EXPECTED_LIVE_SHA}, got ${baselineSha}`);

let candidate=source;
candidate=replaceOnce(candidate,
  '"fianza","importe_solicitado","importe_principal"]);',
  '"fianza","importe_solicitado","importe_principal","numero_pagas"]);',
  'NUMBER_FIELDS.numero_pagas');
candidate=replaceOnce(candidate,
  '"empresa","tipo_contrato","antiguedad_laboral"',
  '"empresa","tipo_contrato","modalidad_contrato","antiguedad_laboral"',
  'FIELD_KEYS.modalidad_contrato');
candidate=replaceOnce(candidate,
  '"periodo_nomina","categoria_profesional","salario_base"',
  '"periodo_nomina","categoria_profesional","numero_pagas","salario_base"',
  'FIELD_KEYS.numero_pagas');
candidate=replaceOnce(candidate,
  '"empresa","tipo_contrato","antiguedad_laboral","ingresos_netos_mensuales"',
  '"empresa","tipo_contrato","modalidad_contrato","antiguedad_laboral","fecha_inicio_contrato","fecha_fin_contrato","jornada","categoria_profesional","numero_pagas","ingresos_netos_mensuales"',
  'CANONICAL_KEYS.labor_fields');

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
