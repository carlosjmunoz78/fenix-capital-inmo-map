import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {extractDocumentData} from '../src/operationalDocumentExtraction';
import {sanitizeCriticalDocumentFields} from '../src/criticalDocumentFieldSanitizer';
import {getDocumentPreviewFields} from '../src/documentPreviewMasterSchema';

function visibleField(row:Record<string,unknown>,label:string){return getDocumentPreviewFields(row).find(x=>x.label===label)?.value;}

test('relectura histórica de vida laboral rellena la casilla Titular con el titular real',()=>{
 const raw=`INFORME DE VIDA LABORAL\nMODELO informativo. Tesorería General de la Seguridad Social.\nD./Dña. CRISTINA EJEMPLO APELLIDO\nNÚMERO DE SEGURIDAD SOCIAL 14/1234567890\nTOTAL DÍAS 2450`;
 const result=sanitizeCriticalDocumentFields(extractDocumentData(raw,95,'Vida laboral'),raw);
 const row={tipo:'Vida laboral',...result.fields};
 expect(visibleField(row,'Titular')).toBe('CRISTINA EJEMPLO APELLIDO');
});

test('relectura histórica de nómina rellena Trabajador sin tomar texto de modelo/cotización',()=>{
 const raw=`RECIBO INDIVIDUAL JUSTIFICATIVO DEL PAGO DE SALARIOS\nMODELO OFICIAL DE COTIZACIÓN\nTRABAJADOR: CRISTINA EJEMPLO APELLIDO\nEMPRESA: FENIX EMPRESA PRUEBA SL\nPERIODO: MAYO 2026\nLÍQUIDO A PERCIBIR: 1.850,40 €`;
 const result=sanitizeCriticalDocumentFields(extractDocumentData(raw,95,'Nómina'),raw);
 const row={tipo:'Nómina',...result.fields};
 expect(visibleField(row,'Trabajador')).toBe('CRISTINA EJEMPLO APELLIDO');
 expect(visibleField(row,'Empresa / CIF')).toContain('FENIX EMPRESA PRUEBA SL');
});

test('las dos rutas de relectura visibles pasan por el sanitizador crítico',()=>{
 const root=path.resolve(process.cwd(),'src');
 const viewer=fs.readFileSync(path.join(root,'DocumentViewerShell.tsx'),'utf8');
 const recovery=fs.readFileSync(path.join(root,'HistoricalDocumentRecoveryFixedGuard.tsx'),'utf8');
 for(const source of [viewer,recovery]){
  expect(source).toContain("import {sanitizeCriticalDocumentFields} from './criticalDocumentFieldSanitizer';");
  expect(source).toMatch(/sanitizeCriticalDocumentFields\(extractDocumentData\(o\.text,o\.confidence,hint\),o\.text\)/);
 }
});
