import {test,expect} from '@playwright/test';
import {sanitizeCriticalDocumentFields} from '../src/criticalDocumentFieldSanitizer';
import {buildDocumentOperationalSummary} from '../src/documentOperationalSummary';
import type {ExtractedDocument} from '../src/browserDocumentOcr';

function doc(type:ExtractedDocument['documentType'],fields:Record<string,string|number|boolean>):ExtractedDocument{return{documentType:type,rawText:'',confidence:90,fields,summary:''};}

test('Vida laboral no convierte boilerplate en titular',()=>{
 const text=`INFORME DE VIDA LABORAL\nSISTEMA DE LA SEGURIDAD SOCIAL\nTRABAJADORES DEL SISTEMA\nD./Dña.\nCRISTINA GARCIA LOPEZ\nNúmero de Seguridad Social\n14 1234567890`;
 const r=sanitizeCriticalDocumentFields(doc('Vida laboral',{titular:'TRABAJADORES DEL SISTEMA'}),text);
 expect(r.fields.titular).toBe('CRISTINA GARCIA LOPEZ');
});

test('Nómina toma trabajador y empresa solo de etiquetas semánticas',()=>{
 const text=`RECIBO DE SALARIOS NÓMINA\nMODELO TC BASE DE COTIZACIÓN\nNOMBRE MODELO 2026\nTRABAJADOR: CRISTINA GARCIA LOPEZ\nEMPRESA: FENIX SERVICIOS FINANCIEROS SL\nBASE DE COTIZACIÓN: 2.100,00 EUR`;
 const r=sanitizeCriticalDocumentFields(doc('Nómina',{titular:'MODELO TC BASE',empresa:'BASE DE COTIZACIÓN'}),text);
 expect(r.fields.titular).toBe('CRISTINA GARCIA LOPEZ');
 expect(r.fields.empresa).toBe('FENIX SERVICIOS FINANCIEROS SL');
 expect(r.fields.empresa_pagador).toBe('FENIX SERVICIOS FINANCIEROS SL');
});

test('IRPF no asigna números cercanos si no pertenecen al concepto',()=>{
 const text=`IMPUESTO SOBRE LA RENTA DE LAS PERSONAS FÍSICAS\nEJERCICIO 2025\nCódigo de casilla 0435\nBASE IMPONIBLE GENERAL\n25.430,18 EUR\nTexto informativo con referencia 999999\nRESULTADO DE LA DECLARACIÓN\n-850,40 EUR`;
 const r=sanitizeCriticalDocumentFields(doc('IRPF',{base_imponible:435,resultado_declaracion:999999}),text);
 expect(r.fields.base_imponible).toBe(25430.18);
 expect(r.fields.resultado_declaracion).toBe(-850.4);
});

test('IRPF deja vacío un importe ambiguo en vez de inventarlo',()=>{
 const text=`IMPUESTO SOBRE LA RENTA\nBASE LIQUIDABLE GENERAL\nTexto sin importe fiable\nReferencia 123456`;
 const r=sanitizeCriticalDocumentFields(doc('IRPF',{base_liquidable:123456}),text);
 expect(r.fields.base_liquidable).toBeUndefined();
});

test('Movimientos reduce periodo a dos fechas y no arrastra saldo ni operaciones',()=>{
 const text=`EXTRACTO DE MOVIMIENTOS\nPERIODO: 01/05/2026 - 31/05/2026 SALDO FINAL 3.450,22 EUR\n02/05/2026 NÓMINA 2.000,00 EUR`;
 const r=sanitizeCriticalDocumentFields(doc('Movimientos bancarios',{periodo:'01/05/2026 - 31/05/2026 SALDO FINAL 3.450,22 EUR'}),text);
 expect(r.fields.periodo).toBe('2026-05-01 - 2026-05-31');
});

test('Resumen genérico nunca expone metadatos técnicos',()=>{
 const summary=buildDocumentOperationalSummary({tipo:'Documento',title:'RENTA CRISTINA 2025.pdf',created_at:'2026-09-04T10:00:00Z',scope_code:'EXP-001',document_code:'DOC-001',source_url:'https://example.test/file'});
 expect(summary).toBe('Documento registrado sin datos suficientes para elaborar un resumen operativo. No se han inferido datos ausentes.');
 expect(summary).not.toContain('scope');
 expect(summary).not.toContain('document code');
 expect(summary).not.toContain('created');
});
