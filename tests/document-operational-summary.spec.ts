import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import {buildDocumentOperationalSummary} from '../src/documentOperationalSummary';

const viewer=fs.readFileSync('src/DocumentViewerShell.tsx','utf8');

test('vista rápida inteligente siempre incluye resumen antes de datos exactos',()=>{
 expect(viewer).toContain('Resumen del documento');
 expect(viewer).toContain('data-testid="document-operational-summary"');
 expect(viewer.indexOf('Resumen del documento')).toBeLessThan(viewer.indexOf('Datos exactos del documento'));
});

test('usa primero el resumen guardado por CEREBRO',()=>{
 const row={tipo:'Tasación',Notas:'[CEREBRO · LECTURA DOCUMENTAL]\n{"summary":"Tasación de vivienda de 95 m² por 245.000 €, con condicionante de reparación de cubierta."}'};
 expect(buildDocumentOperationalSummary(row)).toBe('Tasación de vivienda de 95 m² por 245.000 €, con condicionante de reparación de cubierta.');
});

test('tasación antigua resume superficie valor observaciones y excepciones sin inventar',()=>{
 const s=buildDocumentOperationalSummary({tipo:'Tasación',direccion:'Calle Fénix 1',superficie:'95 m²',valor_tasacion:'245.000 €',observaciones_tasador:'Humedad en cubierta',excepciones:'Valor condicionado a subsanación'});
 expect(s).toContain('Superficie: 95 m²');
 expect(s).toContain('Valor de tasación: 245.000 €');
 expect(s).toContain('Observaciones del tasador: Humedad en cubierta');
 expect(s).toContain('Excepciones: Valor condicionado a subsanación');
});

test('vida laboral antigua resume situación antigüedad y días visibles',()=>{
 const s=buildDocumentOperationalSummary({tipo:'Vida laboral',titular:'Emilia García',situacion_actual:'Alta',empresa_actual:'Fénix SL',antiguedad:'01/02/2022',total_dias:'1675'});
 expect(s).toContain('Titular: Emilia García');
 expect(s).toContain('Situación: Alta');
 expect(s).toContain('Antigüedad: 01/02/2022');
 expect(s).toContain('Días en alta: 1675');
});

test('sin datos no inventa resumen',()=>{
 expect(buildDocumentOperationalSummary({tipo:'Documento'})).toContain('sin datos suficientes');
});
