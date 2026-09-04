import {expect,test} from '@playwright/test';
import {getDocumentPreviewFields} from '../src/documentPreviewMasterSchema';

const field=(row:Record<string,unknown>,label:string)=>getDocumentPreviewFields(row).find(x=>x.label===label)?.value;

test('Nómina muestra empresa y CIF juntos cuando ambos constan',()=>{
 const row={tipo:'Nómina',empresa:'Servicio Andaluz de Salud',cif_empresa:'Q9150013B'};
 expect(field(row,'Empresa / CIF')).toBe('Servicio Andaluz de Salud · Q9150013B');
});

test('Nómina no inventa la parte ausente de Empresa / CIF',()=>{
 expect(field({tipo:'Nómina',empresa:'Servicio Andaluz de Salud'},'Empresa / CIF')).toBe('Servicio Andaluz de Salud');
 expect(field({tipo:'Nómina',cif_empresa:'Q9150013B'},'Empresa / CIF')).toBe('Q9150013B');
});
