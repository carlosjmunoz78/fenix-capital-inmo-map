import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('document upload stays linked to the exact buyer/person scope',async()=>{
 const ui=read('src/UniversalDocumentIntelligenceGuardV2.tsx');
 expect(ui).toContain("params.get('comprador')");
 expect(ui).toContain("type:'comprador'");
 expect(ui).toContain("origin_type:active.type");
 expect(ui).toContain("origin_code:active.code");
 expect(ui).toContain("declared_person:declaredPerson.trim()");
 expect(ui).toContain('Documento vinculado a esta persona');
});

test('participant labor aliases remain explicit and separate',async()=>{
 const source=read('src/operationalDocumentExtraction.ts');
 const mappings=[
  "['tipo_contrato',['tipo_contrato','tipo_de_contrato']]",
  "['modalidad_contrato',['modalidad_contrato','modalidad','modalidad_de_contrato']]",
  "['fecha_inicio_contrato',['fecha_inicio_contrato','fecha_inicio_laboral','fecha_alta_actual']]",
  "['fecha_fin_contrato',['fecha_fin_contrato','fecha_fin_laboral','fecha_vencimiento_contrato']]",
  "['jornada',['jornada','tipo_jornada','jornada_laboral']]",
  "['categoria_profesional',['categoria_profesional','categoria','grupo_profesional']]",
  "['numero_pagas',['numero_pagas','pagas_anuales']]"
 ];
 for(const mapping of mappings)expect(source).toContain(mapping);
 expect(source).not.toContain("['situacion_laboral',['tipo_contrato'");
});

test('document intelligence preserves v12 safety gates and projects labor facts through participant wrapper',async()=>{
 const source=read('supabase/functions/fenix-document-intelligence/index.ts');
 expect(source).toContain("'comprador'");
 expect(source).toContain("p_policy_key:'document_auto_ingest_min_confidence'");
 expect(source).toContain("human_reason:'POLICY_CONFLICT'");
 expect(source).toContain("human_reason:'LOW_CONFIDENCE'");
 expect(source).toContain("p_origin_type:'comprador'");
 expect(source).toContain("fenix_prod_exp_person_update_server");
 const mappings=[
  "tipo_contrato:'tipo_contrato'",
  "modalidad_contrato:'modalidad_contrato'",
  "fecha_inicio_contrato:'fecha_inicio'",
  "fecha_fin_contrato:'fecha_fin'",
  "jornada:'jornada'",
  "categoria_profesional:'categoria_profesional'",
  "numero_pagas:'numero_pagas'"
 ];
 for(const mapping of mappings)expect(source).toContain(mapping);
});
