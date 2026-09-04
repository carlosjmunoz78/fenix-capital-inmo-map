import {expect,test} from '@playwright/test';
import {extractDocumentData} from '../src/operationalDocumentExtraction';

test('tasación separa condicionantes observaciones y salvedades sin arrastrar secciones',()=>{
 const raw=`INFORME DE TASACIÓN\nSOCIEDAD DE TASACIÓN: VALORACIONES DEL SUR SA\nTASADOR: Laura Pérez Martín\nFECHA DE TASACIÓN: 03/09/2026\nDIRECCIÓN DEL INMUEBLE: Avenida de América 12, Córdoba\nREFERENCIA CATASTRAL: 1234567UG4913S0001AB\nSUPERFICIE ÚTIL: 87,40 m2\nSUPERFICIE CONSTRUIDA: 103,80 m2\nVALOR DE TASACIÓN: 214.500,00 EUR\nVALOR HIPOTECARIO: 210.000,00 EUR\nFINALIDAD: Garantía hipotecaria\nCONDICIONANTES\nLa valoración queda condicionada a acreditar la inscripción registral de la ampliación de 12 m2.\nOBSERVACIONES DEL TASADOR\nExiste una terraza cerrada no reflejada en Catastro. El dato no altera por sí solo el valor adoptado.\nSALVEDADES\nNo se ha aportado licencia de primera ocupación.\nOTROS DATOS\nDNI del solicitante 12345678Z. Hipoteca solicitada 180.000,00 EUR.`;
 const r=extractDocumentData(raw,98,'Tasación');
 expect(r.documentType).toBe('Tasación');
 expect(r.fields.superficie_util).toBe(87.4);
 expect(r.fields.superficie_construida).toBe(103.8);
 expect(r.fields.valor_tasacion).toBe(214500);
 expect(r.fields.valor_hipotecario).toBe(210000);
 expect(String(r.fields.condicionantes)).toContain('inscripción registral');
 expect(String(r.fields.condicionantes)).not.toContain('OBSERVACIONES');
 expect(String(r.fields.observaciones_tasador)).toContain('terraza cerrada');
 expect(String(r.fields.observaciones_tasador)).not.toContain('SALVEDADES');
 expect(String(r.fields.salvedades)).toContain('licencia de primera ocupación');
 expect(String(r.fields.salvedades)).not.toContain('DNI del solicitante');
});
