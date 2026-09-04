import {expect,test} from '@playwright/test';
import {extractDocumentData} from '../src/operationalDocumentExtraction';

test('pasaporte se clasifica como familia propia y rellena solo identidad explícita',()=>{
 const raw=`PASAPORTE / PASSPORT\nAPELLIDOS / SURNAME: EJEMPLO APELLIDO\nNOMBRE / GIVEN NAMES: CRISTINA\nNÚMERO DE PASAPORTE / PASSPORT NO: PAA123456\nNACIONALIDAD / NATIONALITY: ESPAÑOLA\nFECHA DE NACIMIENTO / DATE OF BIRTH: 12/04/1986\nFECHA DE EXPEDICIÓN / DATE OF ISSUE: 10/05/2024\nFECHA DE CADUCIDAD / DATE OF EXPIRY: 10/05/2034\nPAÍS EMISOR / ISSUING STATE: ESP`;
 const r=extractDocumentData(raw,99,'Pasaporte');
 expect(r.documentType).toBe('Pasaporte');
 expect(r.fields.numero_pasaporte).toBe('PAA123456');
 expect(r.fields.nombre).toBe('CRISTINA');
 expect(r.fields.apellidos).toBe('EJEMPLO APELLIDO');
 expect(r.fields.nacionalidad).toBe('ESPAÑOLA');
 expect(r.fields.fecha_nacimiento).toBe('1986-04-12');
 expect(r.fields.fecha_expedicion).toBe('2024-05-10');
 expect(r.fields.fecha_caducidad).toBe('2034-05-10');
 expect(r.fields.pais_emisor).toBe('ESP');
});
