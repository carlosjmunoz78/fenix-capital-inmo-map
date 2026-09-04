import {expect,test} from '@playwright/test';
import {projectDocumentIntelligence} from '../src/documentIntelligenceProjection';
import {getDocumentPreviewFields,getDocumentPreviewSchema} from '../src/documentPreviewMasterSchema';

test('Catastro declarado no se degrada a Documento en la ficha visible',()=>{
 const row={tipo:'Documento',document_intelligence:{declared_document_type:'Catastro',detected_document_type:'Documento',fields:{referencia_catastral:'5214729UG5651S0001KO',direccion:'CL PALOMAR 21',uso:'Residencial',superficie_construida:'106 m2'}}};
 const projected=projectDocumentIntelligence(row)!;
 expect(projected.tipo_canónico).toBe('Catastro');
 expect(getDocumentPreviewSchema(projected)?.family).toBe('Catastro');
 const by=Object.fromEntries(getDocumentPreviewFields(projected).map(x=>[x.label,x.value]));
 expect(by['Referencia catastral']).toBe('5214729UG5651S0001KO');
 expect(by['Dirección']).toContain('PALOMAR 21');
});

test('familia detectada específica prevalece sobre declaración cuando no es genérica',()=>{
 const row={tipo:'Documento',document_intelligence:{declared_document_type:'Otro',detected_document_type:'Tasación',fields:{valor_tasacion:150000}}};
 const projected=projectDocumentIntelligence(row)!;
 expect(projected.tipo_canónico).toBe('Tasación');
 expect(getDocumentPreviewSchema(projected)?.family).toBe('Tasación');
});
