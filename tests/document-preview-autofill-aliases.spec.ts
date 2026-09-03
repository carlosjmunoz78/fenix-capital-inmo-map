import {expect,test} from '@playwright/test';
import {projectDocumentIntelligence} from '../src/documentIntelligenceProjection';
import {getDocumentPreviewFields} from '../src/documentPreviewMasterSchema';

function preview(tipo:string,fields:Record<string,unknown>){
 const row=projectDocumentIntelligence({tipo:'Documento',document_intelligence:{declared_document_type:tipo,detected_document_type:tipo,fields}})!;
 return getDocumentPreviewFields(row);
}
function value(fields:ReturnType<typeof getDocumentPreviewFields>,label:string){return fields.find(f=>f.label===label)?.value;}

test('Vida laboral proyecta aliases del extractor a casillas de vista previa',()=>{
 const fields=preview('Vida laboral',{titular:'Persona QA',empresa_actual:'Empresa QA SL',fecha_alta_actual:'2022-03-15',total_dias_cotizados:1627,numero_periodos:'3 periodos'});
 expect(value(fields,'Titular')).toBe('Persona QA');
 expect(value(fields,'Empresa actual')).toBe('Empresa QA SL');
 expect(value(fields,'Fecha de alta actual')).toBe('2022-03-15');
 expect(value(fields,'Días totales cotizados')).toBe(1627);
 expect(value(fields,'Periodos trabajados')).toBe('3 periodos');
});

test('FEIN proyecta aliases reales a entidad prestatario importe plazo y vinculaciones',()=>{
 const fields=preview('FEIN',{entidad_fein:'Banco QA',prestatario:'Persona QA',importe_financiado:180000,plazo_meses:360,tipo_de_interes:2.5,tae:2.91,cuota:711.22,productos_vinculados:'Nómina y hogar'});
 expect(value(fields,'Entidad')).toBe('Banco QA');
 expect(value(fields,'Prestatario/s')).toBe('Persona QA');
 expect(value(fields,'Importe')).toBe(180000);
 expect(value(fields,'Duración')).toBe(360);
 expect(value(fields,'TIN')).toBe(2.5);
 expect(value(fields,'TAE')).toBe(2.91);
 expect(value(fields,'Cuota')).toBe(711.22);
 expect(value(fields,'Productos vinculados / combinados')).toBe('Nómina y hogar');
});

test('Tasación proyecta aliases reales a superficies valor y observaciones',()=>{
 const fields=preview('Tasación',{direccion_inmueble:'Calle QA 1',metros_utiles:88.5,metros_construidos:104.2,importe_tasacion:195000,observaciones_salvedades:'Terraza cerrada no inscrita',condicionantes:'Comprobar ampliación'});
 expect(value(fields,'Dirección')).toBe('Calle QA 1');
 expect(value(fields,'Superficie útil')).toBe(88.5);
 expect(value(fields,'Superficie construida')).toBe(104.2);
 expect(value(fields,'Valor de tasación')).toBe(195000);
 expect(value(fields,'Observaciones del tasador')).toBe('Terraza cerrada no inscrita');
 expect(value(fields,'Condicionantes')).toBe('Comprobar ampliación');
});

test('también normaliza aliases ya presentes en fila sin payload estructurado',()=>{
 const row=projectDocumentIntelligence({tipo:'Vida laboral',total_dias_cotizados:900,numero_periodos:'2 periodos'})!;
 const fields=getDocumentPreviewFields(row);
 expect(value(fields,'Días totales cotizados')).toBe(900);
 expect(value(fields,'Periodos trabajados')).toBe('2 periodos');
});
