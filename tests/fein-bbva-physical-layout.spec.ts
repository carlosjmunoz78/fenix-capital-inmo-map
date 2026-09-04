import {expect,test} from '@playwright/test';
import {extractDocumentData} from '../src/operationalDocumentExtraction';

const raw=`FICHA EUROPEA DE INFORMACIÓN NORMALIZADA (FEIN) Fecha de emisión: 10-02-2026
El presente documento se extiende, a fecha 10-02-2026 para
NIF/NIE:
T PERSONA UNO 50627740W
T PERSONA DOS 32078694L
T PERSONA TRES 50608301K
T - Titular (en adelante, el Cliente o Parte Prestataria)
1. Entidad de crédito
- Identidad / Nombre Comercial: Banco Bilbao Vizcaya Argentaria, S.A. (en adelante, "BBVA" o el "Banco")
3. Características principales del Préstamo
• Importe y moneda del préstamo por conceder: 82.287,06 euros.
• Finalidad: COMPRA de VIVIENDA HABITUAL
• Duración del préstamo
- La duración del préstamo es 359 meses, más un período de ajuste si procede.
Clase de tipo de interés nominal aplicable
• A tipo fijo del 3,7000% nominal anual durante todo el plazo de la operación.
La bonificación máxima sobre el "tipo de interés" aplicable será equivalente a 1,0000 punto porcentual.
Importe total a reembolsar con productos combinados 137.942,34 euros. (Capital Concedido 82.287,06 + Costes Totales 55.655,28)
Importe máximo de préstamo disponible en relación con el valor del bien inmueble. Un 41,7435% sobre el valor de inmueble según tasación.
4. Tipo de interés y otros gastos
- La TAE aplicable a su préstamo es 4,74%.
5. Periodicidad y número de pagos
• Número de Pagos en Periodo de ajuste: 1
• Periodicidad de reembolso en amortización: Mensual
o Número de pagos: 359
6. Importe de cada cuota
• Importe cuota: 379,33 euros.`;

test('FEIN BBVA física rellena los campos financieros principales sin confundir porcentajes',()=>{
 const r=extractDocumentData(raw,99,'FEIN / FIAE');
 expect(r.documentType).toBe('FEIN / FIAE');
 expect(String(r.fields.entidad)).toMatch(/Banco Bilbao Vizcaya|BBVA/i);
 expect(String(r.fields.titulares)).toContain('PERSONA UNO');
 expect(r.fields.fecha_emision).toBe('2026-02-10');
 expect(r.fields.importe_prestamo).toBe(82287.06);
 expect(String(r.fields.plazo)).toContain('359');
 expect(r.fields.numero_cuotas).toBe(359);
 expect(r.fields.tin).toBe(3.7);
 expect(r.fields.tae).toBe(4.74);
 expect(r.fields.cuota).toBe(379.33);
 expect(r.fields.porcentaje_financiacion).toBe(41.7435);
});
