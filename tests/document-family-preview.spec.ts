import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const families=fs.readFileSync(path.resolve('src/documentFamilySchemas.ts'),'utf8');
const viewer=fs.readFileSync(path.resolve('src/DocumentViewerShell.tsx'),'utf8');
const extractor=fs.readFileSync(path.resolve('supabase/functions/fenix-document-extract-prod/index.ts'),'utf8');

test('familias documentales muestran campos hipotecarios distintos',()=>{
 expect(families).toContain("identity:{label:'DNI / NIE / Pasaporte'");
 expect(families).toContain("payroll:{label:'Nómina'");
 expect(families).toContain("land_registry:{label:'Nota simple'");
 expect(families).toContain("work_history:{label:'Vida laboral'");
 expect(families).toContain("tax_return:{label:'IRPF / Declaración de la renta'");
 expect(families).toContain("fecha_caducidad_documento");
 expect(families).toContain("ingresos_netos_mensuales");
 expect(families).toContain("cargas_registrales");
 expect(families).toContain("dias_totales_alta");
});

test('vista persistente usa extracción y no metadatos genéricos',()=>{
 expect(viewer).toContain("inferFamily(extraction?.document_type||'',title)");
 expect(viewer).toContain('Datos que necesita el financiero');
 expect(viewer).toContain('No consta en este documento');
 expect(viewer).toContain("fetchEnvironmentApi<any>('fenix-document-extract'");
 expect(viewer).toContain('Analizar documento');
 expect(viewer).toContain('Reanalizar');
});

test('extractor clasifica familia y evita inventar datos',()=>{
 expect(extractor).toContain('document_family');
 expect(extractor).toContain('No deduzcas tipo de contrato desde una nómina si no aparece');
 expect(extractor).toContain('para nota simple titulares, finca/CRU y cargas');
 expect(extractor).toContain('para identidad incluye expedición y caducidad');
 expect(extractor).toContain('canonicalFields(extracted)');
});
