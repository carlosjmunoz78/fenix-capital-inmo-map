import {test,expect} from '@playwright/test';
import {buildFieldValidation} from '../src/documentFieldValidation';
import {projectDocumentIntelligence} from '../src/documentIntelligenceProjection';

test('datos extraídos nunca se consideran confirmados por defecto',()=>{
 const r=buildFieldValidation({fields:{empresa:'FENIX SL',neto:1850.25},globalConfidence:92});
 expect(r.quality.empresa.status).toBe('pending_validation');
 expect(r.quality.empresa.confidence).toBe(92);
 expect(r.summary.status).toBe('pending_validation');
 expect(r.summary.pending).toBe(2);
});

test('conflicto documental prevalece y queda trazado por campo',()=>{
 const r=buildFieldValidation({fields:{empresa:'FENIX SL',neto:1850.25},fieldStatus:{empresa:'confirmed',neto:'confirmed'},conflicts:[{field:'empresa'}],evidence:{empresa:['Página 1 · Empresa: FENIX SL']}});
 expect(r.quality.empresa.status).toBe('conflict');
 expect(r.quality.empresa.evidence).toEqual(['Página 1 · Empresa: FENIX SL']);
 expect(r.quality.neto.status).toBe('confirmed');
 expect(r.summary.status).toBe('conflict');
 expect(r.summary.conflicts).toBe(1);
});

test('proyección canónica conserva confianza evidencia y estado por campo',()=>{
 const row=projectDocumentIntelligence({tipo:'Nómina',document_intelligence:{detected_document_type:'Nómina',confidence:88,fields:{empresa_pagador:'FENIX SL',neto:1850.25},field_confidence:{empresa_pagador:96,neto:91},field_status:{empresa_pagador:'confirmed'},evidence:{empresa_pagador:'Página 1 · Empresa: FENIX SL'}}}) as any;
 expect(row.empresa).toBe('FENIX SL');
 expect(row.field_quality.empresa.confidence).toBe(96);
 expect(row.field_quality.empresa.status).toBe('confirmed');
 expect(row.field_quality.empresa.evidence).toEqual(['Página 1 · Empresa: FENIX SL']);
 expect(row.field_quality.neto.status).toBe('pending_validation');
 expect(row.estado_validacion_documental).toBe('pending_validation');
});

test('aliases de metadatos siguen la misma clave canónica que el valor',()=>{
 const row=projectDocumentIntelligence({document_intelligence:{detected_document_type:'FEIN / FIAE',fields:{importe_financiado:180000},field_confidence:{importe_financiado:94},field_status:{importe_financiado:'confirmed'}}}) as any;
 expect(row.importe_prestamo).toBe(180000);
 expect(row.field_quality.importe_prestamo.confidence).toBe(94);
 expect(row.field_quality.importe_prestamo.status).toBe('confirmed');
});
