import {test,expect} from '@playwright/test';
import {extractDocumentData} from '../src/operationalDocumentExtraction';

test('tipo declarado rescata un OCR ambiguo sin inventar valores',()=>{
 const r=extractDocumentData('Trabajador: Emilia Garcia\nTOTAL DEVENGADO 2.350,00 EUR\nLIQUIDO A PERCIBIR 1.850,25 EUR',62,'Nómina');
 expect(r.documentType).toBe('Nómina');
 expect(r.fields.bruto).toBe(2350);
 expect(r.fields.neto).toBe(1850.25);
 expect(r.rawText).not.toContain('RECIBO DE SALARIOS NÓMINA');
});

test('contenido claro prevalece sobre una declaración equivocada',()=>{
 const r=extractDocumentData('NOTA SIMPLE\nREGISTRO DE LA PROPIEDAD DE CÓRDOBA\nFinca: 12345\nTitular: Emilia Garcia',90,'Nómina');
 expect(r.documentType).toBe('Nota simple');
 expect(r.documentType).not.toBe('Nómina');
});

test('familias operativas admiten respaldo por declaración',()=>{
 const cases:[string,string,string][]=[
  ['Préstamo / deuda','Entidad: BBVA\nCUOTA 243,10 EUR\nCAPITAL PENDIENTE 8.450,00 EUR','Préstamo / deuda'],
  ['IRPF','Ejercicio: 2025\nBASE IMPONIBLE 28.500,00 EUR','IRPF'],
  ['FEIN / FIAE','Entidad: Banco Ejemplo\nTIN 2,50 %\nTAE 2,91 %','FEIN / FIAE'],
  ['Tasación','VALOR DE TASACIÓN 245.000,00 EUR\nFecha: 01/09/2026','Tasación'],
  ['Documento notarial / registral','Protocolo: 458\nOtorgantes: Emilia Garcia','Documento notarial / registral']
 ];
 for(const [declared,text,expected] of cases)expect(extractDocumentData(text,70,declared).documentType).toBe(expected);
});
