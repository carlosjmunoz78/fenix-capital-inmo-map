import {expect,test} from '@playwright/test';
import {extractDocumentData} from '../src/operationalDocumentExtraction';

test('DNI rellena identidad, expedición, caducidad, soporte y domicilio sin inventar',()=>{
 const raw=`DOCUMENTO NACIONAL DE IDENTIDAD\nNOMBRE: CRISTINA\nAPELLIDOS: EJEMPLO APELLIDO\nDNI: 12345678Z\nNACIONALIDAD: ESP\nSEXO: F\nFECHA DE NACIMIENTO: 12/04/1986\nFECHA DE EXPEDICIÓN: 20/03/2022\nFECHA DE CADUCIDAD: 20/03/2032\nNÚMERO DE SOPORTE: AAA123456\nDOMICILIO: Calle Real 12, Córdoba`;
 const r=extractDocumentData(raw,99,'DNI');
 expect(r.documentType).toBe('DNI/NIE');
 expect(r.fields.documento_identidad).toBe('12345678Z');
 expect(r.fields.nombre).toBe('CRISTINA');
 expect(r.fields.apellidos).toBe('EJEMPLO APELLIDO');
 expect(r.fields.fecha_nacimiento).toBe('1986-04-12');
 expect(r.fields.nacionalidad).toBe('ESP');
 expect(r.fields.sexo).toBe('F');
 expect(r.fields.fecha_expedicion).toBe('2022-03-20');
 expect(r.fields.fecha_caducidad).toBe('2032-03-20');
 expect(r.fields.numero_soporte).toBe('AAA123456');
 expect(r.fields.domicilio).toContain('Calle Real 12');
});

test('préstamo conserva capital, cuota, tipos, referencia y vencimiento explícitos',()=>{
 const raw=`RECIBO PRÉSTAMO PERSONAL\nTITULAR: CRISTINA EJEMPLO APELLIDO\nENTIDAD: BANCO EJEMPLO SA\nREFERENCIA: PREST-009988\nCAPITAL INICIAL: 25.000,00 EUR\nCAPITAL PENDIENTE: 8.450,25 EUR\nCUOTA: 325,40 EUR\nTIN: 6,25 %\nTAE: 6,89 %\nFECHA FORMALIZACIÓN: 15/06/2022\nVENCIMIENTO: 15/06/2028\nPERIODICIDAD: Mensual\nCOMISIONES: Sin comisión de amortización anticipada\nGARANTÍAS: Personal`;
 const r=extractDocumentData(raw,98,'Préstamo / deuda');
 expect(r.documentType).toBe('Préstamo / deuda');
 expect(r.fields.titular).toContain('CRISTINA EJEMPLO APELLIDO');
 expect(r.fields.entidad).toContain('BANCO EJEMPLO SA');
 expect(r.fields.referencia).toBe('PREST-009988');
 expect(r.fields.capital_inicial).toBe(25000);
 expect(r.fields.capital_pendiente).toBe(8450.25);
 expect(r.fields.cuota).toBe(325.4);
 expect(r.fields.tin).toBe(6.25);
 expect(r.fields.tae).toBe(6.89);
 expect(r.fields.fecha_formalizacion).toBe('2022-06-15');
 expect(r.fields.vencimiento).toBe('2028-06-15');
 expect(String(r.fields.periodicidad)).toMatch(/Mensual/i);
 expect(String(r.fields.comisiones)).toMatch(/Sin comisión/i);
 expect(String(r.fields.garantias)).toMatch(/Personal/i);
});
