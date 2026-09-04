import {expect,test} from '@playwright/test';
import {extractDocumentData} from '../src/operationalDocumentExtraction';
import {projectDocumentIntelligence} from '../src/documentIntelligenceProjection';
import {getDocumentPreviewFields} from '../src/documentPreviewMasterSchema';

test('Vida Laboral enseña años cotizados, antigüedad y últimos trabajos en casillas',()=>{
 const projected=projectDocumentIntelligence({
  tipo:'Vida laboral',titular:'CRISTINA EJEMPLO',fecha_informe:'2026-06-10',fecha_alta_actual:'2022-05-01',
  total_dias:7025,periodos_trabajados:'GENERAL · EMPRESA ACTUAL · 01/05/2022 · --- | GENERAL · EMPRESA ANTERIOR · 01/01/2020 · 30/04/2022'
 })!;
 const fields=getDocumentPreviewFields(projected);const by=Object.fromEntries(fields.map(x=>[x.label,x.value]));
 expect(by['Años totales cotizados']).toBe('19,2 años');
 expect(by['Antigüedad actual']).toBe('4,1 años');
 expect(by['Años seguidos actuales']).toBe('4,1 años');
 expect(String(by['Últimos trabajos / periodos'])).toContain('EMPRESA ACTUAL');
 expect(by['Días totales cotizados']).toBe(7025);
});

test('autofill universal rellena casillas explícitas de Catastro sin inventar',()=>{
 const raw=`CATASTRO\nReferencia catastral: 5214729UG5651S0001KO\nDirección: CL PALOMAR 21, 14550 MONTILLA\nUso: Residencial\nSuperficie construida: 106 m2\nSuperficie parcela: 83 m2\nAño construcción: 1975`;
 const r=extractDocumentData(raw,98,'Catastro');
 expect(r.fields.referencia_catastral).toBe('5214729UG5651S0001KO');
 expect(r.fields.direccion).toContain('PALOMAR 21');
 expect(r.fields.uso).toBe('Residencial');
 expect(String(r.fields.superficie_construida)).toContain('106');
 expect(String(r.fields.superficie_parcela)).toContain('83');
 expect(String(r.fields.anio_construccion)).toContain('1975');
});

test('autofill universal rellena ficha de Empadronamiento por etiquetas exactas',()=>{
 const raw=`CERTIFICADO DE EMPADRONAMIENTO\nTitular/es: CRISTINA EJEMPLO APELLIDO\nDomicilio: CALLE REAL 12\nMunicipio: CÓRDOBA\nProvincia: CÓRDOBA\nFecha de alta: 03/02/2020\nFecha de expedición: 04/09/2026\nPersonas empadronadas: 2`;
 const r=extractDocumentData(raw,99,'Empadronamiento');
 expect(r.fields.titulares).toBe('CRISTINA EJEMPLO APELLIDO');
 expect(r.fields.domicilio).toBe('CALLE REAL 12');
 expect(r.fields.municipio).toBe('CÓRDOBA');
 expect(r.fields.fecha_alta).toBe('2020-02-03');
 expect(r.fields.fecha_expedicion).toBe('2026-09-04');
});

test('autofill universal no convierte prosa narrativa en campos de ficha',()=>{
 const raw=`CERTIFICADO DE EMPADRONAMIENTO\nSe hace constar que la persona reside desde hace años en Córdoba. El domicilio histórico podría haber sido Calle Real. No consta fecha de alta certificada.`;
 const r=extractDocumentData(raw,90,'Empadronamiento');
 expect(r.fields.fecha_alta).toBeUndefined();
 expect(r.fields.domicilio).toBeUndefined();
});

test('extractor fuerte prevalece frente al fallback de etiqueta maestra',()=>{
 const raw=`RECIBO DE SALARIOS NÓMINA\nTRABAJADOR: CRISTINA EJEMPLO\nSALARIO BASE: 1.200,00 EUR\nNeto: 2.100,00 EUR`;
 const r=extractDocumentData(raw,99,'Nómina');
 expect(r.fields.salario_base).toBe(1200);
 expect(r.fields.neto).toBe(2100);
});
