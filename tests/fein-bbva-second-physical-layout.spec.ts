import {expect,test} from '@playwright/test';
import {extractDocumentData} from '../src/operationalDocumentExtraction';

const raw=`FICHA EUROPEA DE INFORMACIÓN NORMALIZADA (FEIN) Fecha de emisión: 15-06-2026
El presente documento se extiende, a fecha 15-06-2026 para
NIF/NIE:
T PERSONA TITULAR 50627869Q
T - Titular (en adelante, el Cliente o Parte Prestataria)
1. Entidad de crédito
- Identidad / Nombre Comercial: Banco Bilbao Vizcaya Argentaria, S.A. (en adelante, "BBVA" o el "Banco")
3. Características principales del Préstamo
• Importe y moneda del préstamo por conceder: 50.187,45 euros.
• Finalidad: COMPRA de VIVIENDA HABITUAL
• Duración del préstamo
- La duración del préstamo es 240 meses , más un período de ajuste si procede.
Clase de tipo de interés nominal aplicable
• A tipo fijo del 3,5500% nominal anual durante todo el plazo de la operación.
Importe de la Bonificación máxima:
El Banco aplicará una bonificación máxima semestral de 1,0000 punto porcentual del tipo de interés ordinario nominal anual.
Importe máximo de préstamo disponible en relación con el valor del bien inmueble. Un 64,4101% sobre el valor de inmueble según tasación realizada por un profesional o sociedad de tasación homologada por el Banco de España.
4. Tipo de interés y otros gastos
- La TAE aplicable a su préstamo es 5,22%.
5. Periodicidad y número de pagos
• Número de Pagos en Periodo de ajuste: 1
• Periodicidad de reembolso en amortización: Mensual
o Número de pagos: 240
6. Importe de cada cuota
• Importe cuota: 292,36 euros.`;

test('segunda FEIN BBVA física mantiene extracción exacta con otros importes y plazo',()=>{
 const r=extractDocumentData(raw,99,'FEIN / FIAE');
 expect(String(r.fields.entidad)).toMatch(/Banco Bilbao Vizcaya|BBVA/i);
 expect(String(r.fields.titulares)).toContain('PERSONA TITULAR');
 expect(r.fields.fecha_emision).toBe('2026-06-15');
 expect(r.fields.importe_prestamo).toBe(50187.45);
 expect(r.fields.plazo_meses).toBe(240);
 expect(r.fields.numero_cuotas).toBe(240);
 expect(r.fields.tin).toBe(3.55);
 expect(r.fields.tae).toBe(5.22);
 expect(r.fields.cuota).toBe(292.36);
 expect(r.fields.porcentaje_financiacion).toBe(64.4101);
});
