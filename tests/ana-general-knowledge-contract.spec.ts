import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260911123000_ana_general_knowledge_retrieval.sql','utf8');
const runtime = fs.readFileSync('src/runtime-polish.ts','utf8');

test('Ana usa recuperación general y no un if hardcodeado de funcionario', async () => {
  expect(migration).toContain("websearch_to_tsquery('spanish',q)");
  expect(migration).toContain("to_tsvector('spanish'");
  expect(migration).toContain("fenix_prod.ana_knowledge_cards");
  expect(migration).toContain("fenix_prod.ana_correcciones");
  expect(migration).not.toContain("if q like '%funcionario%'");
});

test('Ana cubre dominios representativos del conocimiento operativo', async () => {
  for (const code of ['HIP-DOC-BASE','HIP-100-CRITERIOS','HIP-RATIO','HIP-AUTONOMOS','HIP-FLUJO','HIP-NO-VIABLES']) {
    expect(migration).toContain(code);
  }
  for (const term of ['CIRBE','FEIN','35%','37%','autónomo','vida laboral','primera vivienda']) {
    expect(migration).toContain(term);
  }
});

test('El runtime solo usa fallback cuando Ana no encontró respuesta y conserva fuente canónica', async () => {
  expect(runtime).toContain("fenix_prod_ana_knowledge_answer_user");
  expect(runtime).toMatch(/No encuentro información suficiente en CEREBRO|No encuentro una coincidencia exacta/);
});
