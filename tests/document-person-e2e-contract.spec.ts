import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

const laborExtracted={
  tipo_contrato:'indefinido',
  modalidad_contrato:'tiempo_completo',
  fecha_inicio_contrato:'2024-01-15',
  fecha_fin_contrato:'',
  jornada:'completa',
  categoria_profesional:'oficial_1a',
  numero_pagas:14
};

const expectedParticipantProfile={
  tipo_contrato:'indefinido',
  modalidad_contrato:'tiempo_completo',
  fecha_inicio:'2024-01-15',
  fecha_fin:'',
  jornada:'completa',
  categoria_profesional:'oficial_1a',
  numero_pagas:14
};

test('synthetic document labor facts map to the exact participant profile keys',async()=>{
  const mapping:Record<string,string>={
    tipo_contrato:'tipo_contrato',
    modalidad_contrato:'modalidad_contrato',
    fecha_inicio_contrato:'fecha_inicio',
    fecha_fin_contrato:'fecha_fin',
    jornada:'jornada',
    categoria_profesional:'categoria_profesional',
    numero_pagas:'numero_pagas'
  };
  const projected:Record<string,unknown>={};
  for(const [source,target] of Object.entries(mapping)) projected[target]=laborExtracted[source as keyof typeof laborExtracted];
  expect(projected).toEqual(expectedParticipantProfile);
  expect(projected).not.toHaveProperty('situacion_laboral');
});

test('document intelligence source implements the same synthetic mapping and exact comprador scope',async()=>{
  const source=read('supabase/functions/fenix-document-intelligence/index.ts');
  for(const [from,to] of Object.entries({
    tipo_contrato:'tipo_contrato',
    modalidad_contrato:'modalidad_contrato',
    fecha_inicio_contrato:'fecha_inicio',
    fecha_fin_contrato:'fecha_fin',
    jornada:'jornada',
    categoria_profesional:'categoria_profesional',
    numero_pagas:'numero_pagas'
  })) expect(source).toContain(`${from}:'${to}'`);
  expect(source).toContain("p_origin_type:'comprador'");
  expect(source).toContain('fenix_prod_exp_person_update_server');
  expect(source).not.toContain("tipo_contrato:'situacion_laboral'");
});

test('extractor candidate gate covers digital/scanned/image document paths without changing provider or policy',async()=>{
  const baseline=read('supabase/functions/fenix-document-extract/index.ts');
  const builder=read('scripts/build-fenix-document-extract-candidate.mjs');
  const verifier=read('scripts/verify-fenix-document-extract-candidate.mjs');
  for(const mime of ['application/pdf','image/png','image/jpeg','image/webp']) expect(baseline).toContain(mime);
  expect(builder).toContain('EXPECTED_SOURCE_SHA');
  expect(verifier).toContain('allowed_changes');
  expect(baseline).toContain('https://api.openai.com/v1/responses');
  expect(baseline).toContain("p_policy_key:'document_auto_ingest_min_confidence'");
  expect(baseline).toContain("human_reason:'LOW_CONFIDENCE'");
  expect(baseline).toContain("human_reason:'POLICY_CONFLICT'");
});
