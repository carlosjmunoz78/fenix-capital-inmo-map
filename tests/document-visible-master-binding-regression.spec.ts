import {expect,test} from '@playwright/test';
import {projectDocumentIntelligence} from '../src/documentIntelligenceProjection';
import {getDocumentPreviewFields} from '../src/documentPreviewMasterSchema';

test('pasaporte muestra nombre y apellidos en la casilla visible maestra',()=>{
 const row:any={
  'tipo_canónico':'Pasaporte',
  document_intelligence:{
   declared_document_type:'Pasaporte',
   detected_document_type:'Pasaporte',
   fields:{nombre:'CRISTINA',apellidos:'EJEMPLO APELLIDO',numero_pasaporte:'PAA123456'}
  }
 };
 const projected=projectDocumentIntelligence(row)!;
 const fields=getDocumentPreviewFields(projected);
 const fullName=fields.find(x=>x.label==='Nombre y apellidos');
 expect(fullName?.value).toBe('CRISTINA EJEMPLO APELLIDO');
});

test('DNI no degrada nombre completo visible a solo el nombre',()=>{
 const row:any={
  'tipo_canónico':'DNI / NIE',
  document_intelligence:{
   declared_document_type:'DNI / NIE',
   detected_document_type:'DNI/NIE',
   fields:{nombre:'CRISTINA',apellidos:'EJEMPLO APELLIDO',documento_identidad:'12345678Z'}
  }
 };
 const projected=projectDocumentIntelligence(row)!;
 const fields=getDocumentPreviewFields(projected);
 const fullName=fields.find(x=>x.label==='Nombre y apellidos');
 expect(fullName?.value).toBe('CRISTINA EJEMPLO APELLIDO');
});
