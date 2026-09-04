import {expect,test} from '@playwright/test';
import {extractDocumentData} from '../src/operationalDocumentExtraction';

test('nota simple conserva titularidad y cargas multilínea sin mezclar secciones',()=>{
 const raw=`NOTA SIMPLE INFORMATIVA\nREGISTRO DE LA PROPIEDAD DE CÓRDOBA Nº 3\nFINCA REGISTRAL\n12345\nCRU\n14012000123456\nREFERENCIA CATASTRAL: 1234567UG4913N0001AB\nTITULARIDAD\nDOÑA EMILIA GARCIA LOPEZ, con DNI 12345678Z, titular del 100% del pleno dominio.\nTítulo: compraventa otorgada ante notario.\nCARGAS\nHIPOTECA a favor de BANCO EJEMPLO SA por principal de 180.000,00 EUR.\nAFECCIÓN fiscal durante cinco años.\nASIENTOS PENDIENTES\nNinguno.\nFECHA DE EXPEDICIÓN\n04/09/2026`;
 const r=extractDocumentData(raw,98,'Nota simple');
 expect(r.documentType).toBe('Nota simple');
 expect(String(r.fields.numero_finca)).toContain('12345');
 expect(String(r.fields.cru)).toContain('14012000123456');
 expect(String(r.fields.titulares)).toContain('EMILIA GARCIA LOPEZ');
 expect(String(r.fields.titulares)).toContain('100%');
 expect(String(r.fields.cargas)).toContain('HIPOTECA');
 expect(String(r.fields.cargas)).toContain('AFECCIÓN fiscal');
 expect(String(r.fields.cargas)).not.toContain('ASIENTOS PENDIENTES');
 expect(r.fields.fecha_expedicion).toBe('2026-09-04');
});
