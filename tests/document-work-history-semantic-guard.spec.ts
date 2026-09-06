import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const migration=fs.readFileSync('supabase/migrations/20260906004000_document_work_history_semantic_guard_v1.sql','utf8');
const schemas=fs.readFileSync('src/documentFamilySchemas.ts','utf8');

test('work history guard strips ambiguous tenure and contract dates',()=>{
  expect(migration).toContain("v_family = 'work_history'");
  expect(migration).toContain("'{fields,antiguedad_laboral}'");
  expect(migration).toContain("'{fields,fecha_inicio_contrato}'");
  expect(migration).toContain("'{fields,fecha_fin_contrato}'");
  expect(migration).toContain("payload_operacion - 'antiguedad_laboral'");
  expect(schemas).toContain('Antigüedad en la situación actual si es calculable');
});
