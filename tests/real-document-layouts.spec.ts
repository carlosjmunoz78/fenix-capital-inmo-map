import {test,expect} from '@playwright/test';
import {extractDocumentData} from '../src/operationalDocumentExtraction';

test('vida laboral realista multilinea rellena titular, fecha y datos útiles',()=>{
 const raw=`INFORME DE VIDA LABORAL\nD./Dña.\nEMILIA GARCIA LOPEZ\nNúmero de Seguridad Social\n14 1234567890\nA fecha de\n28 de agosto de 2026\nRégimen actual\nRÉGIMEN GENERAL\nEmpresa actual\nFENIX SERVICIOS SL\nFecha de alta\n15/03/2022\nTOTAL DE DÍAS\n1627\nObservaciones\nSin incidencias relevantes`;
 const r=extractDocumentData(raw,96,'Vida laboral');
 expect(r.documentType).toBe('Vida laboral');
 expect(String(r.fields.titular)).toContain('EMILIA GARCIA LOPEZ');
 expect(r.fields.fecha_informe).toBe('2026-08-28');
 expect(String(r.fields.nss)).toContain('14 1234567890');
 expect(String(r.fields.empresa_actual)).toContain('FENIX SERVICIOS SL');
 expect(r.fields.fecha_alta_actual).toBe('2022-03-15');
 expect(String(r.fields.total_dias)).toBe('1627');
});

test('FEIN realista multilinea rellena prestatario, fecha, importe y tipos',()=>{
 const raw=`FICHA EUROPEA DE INFORMACIÓN NORMALIZADA (FEIN)\nEntidad prestamista\nBANCO EJEMPLO SA\nNombre del prestatario\nEMILIA GARCIA LOPEZ\nFecha de emisión de la FEIN\n02/09/2026\nImporte del préstamo\n180.000,00 EUR\nPlazo del préstamo\n360 meses\nTipo de interés nominal (TIN)\n2,50 %\nTasa anual equivalente (TAE)\n2,91 %\nCuota mensual\n711,22 EUR\nProductos vinculados\nNómina y seguro de hogar\nVálida hasta\n30/09/2026`;
 const r=extractDocumentData(raw,98,'FEIN');
 expect(r.documentType).toBe('FEIN / FIAE');
 expect(String(r.fields.titulares)).toContain('EMILIA GARCIA LOPEZ');
 expect(r.fields.fecha_emision).toBe('2026-09-02');
 expect(r.fields.importe_prestamo).toBe(180000);
 expect(r.fields.tin).toBe(2.5);
 expect(r.fields.tae).toBe(2.91);
 expect(r.fields.cuota).toBe(711.22);
 expect(String(r.fields.plazo)).toContain('360 meses');
});
