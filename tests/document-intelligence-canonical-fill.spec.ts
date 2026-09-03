import {expect,test} from '@playwright/test';
import {projectDocumentIntelligence} from '../src/documentIntelligenceProjection';
import {getDocumentPreviewFields,getDocumentPreviewSchema} from '../src/documentPreviewMasterSchema';
import {extractDocumentData} from '../src/operationalDocumentExtraction';

function field(row:Record<string,unknown>,label:string){return getDocumentPreviewFields(row).find(x=>x.label===label)?.value;}

test('vista previa proyecta los fields guardados por CEREBRO desde Notas',()=>{
 const payload={declared_document_type:'Tasación',detected_document_type:'Tasación',summary:'Vivienda tasada.',fields:{direccion_inmueble:'Calle Sol 4',metros_utiles:91.4,metros_construidos:112.8,importe_tasacion:178500,anotaciones_tasador:'Falta comprobación registral.'}};
 const row=projectDocumentIntelligence({tipo:'Documento',Notas:`[CEREBRO · LECTURA DOCUMENTAL]\n${JSON.stringify(payload)}`})!;
 expect(getDocumentPreviewSchema(row)?.family).toBe('Tasación');
 expect(field(row,'Dirección')).toBe('Calle Sol 4');
 expect(field(row,'Superficie útil')).toBe(91.4);
 expect(field(row,'Superficie construida')).toBe(112.8);
 expect(field(row,'Valor de tasación')).toBe(178500);
 expect(field(row,'Observaciones del tasador')).toBe('Falta comprobación registral.');
});

test('normalizador conserva claves originales y añade clave canónica',()=>{
 const payload={declared_document_type:'Oferta bancaria',fields:{capital:180000,tipo_de_interes:2.25,productos_vinculados:'Nómina y hogar'}};
 const row=projectDocumentIntelligence({Notas:`[CEREBRO · LECTURA DOCUMENTAL]\n${JSON.stringify(payload)}`})!;
 expect(field(row,'Importe')).toBe(180000);
 expect(field(row,'TIN')).toBe(2.25);
 expect(field(row,'Vinculaciones')).toBe('Nómina y hogar');
});

test('extractor de tasación rellena los puntos operativos críticos',()=>{
 const r=extractDocumentData(`INFORME DE TASACIÓN\nSOCIEDAD DE TASACIÓN: Valoraciones Sur SA\nTASADOR: Ana Pérez\nFECHA DE TASACIÓN: 02/09/2026\nDIRECCIÓN DEL INMUEBLE: Calle Real 20, Córdoba\nREFERENCIA CATASTRAL: 1234567UG4913S0001AB\nFINALIDAD: Garantía hipotecaria\nSUPERFICIE ÚTIL: 88,50 m2\nSUPERFICIE CONSTRUIDA: 104,20 m2\nVALOR DE TASACIÓN: 195.000,00 €\nCONDICIONANTES: Comprobar inscripción de ampliación\nOBSERVACIONES DEL TASADOR: Terraza cerrada no inscrita\nSALVEDADES: Valor condicionado a regularización`);
 expect(r.documentType).toBe('Tasación');
 expect(r.fields.superficie_util).toBe(88.5);
 expect(r.fields.superficie_construida).toBe(104.2);
 expect(r.fields.valor_tasacion).toBe(195000);
 expect(r.fields.condicionantes).toContain('Comprobar');
 expect(r.fields.observaciones_tasador).toContain('Terraza');
 expect(r.fields.salvedades).toContain('regularización');
});

test('extractor FEIN rellena detalle financiero y condiciones',()=>{
 const r=extractDocumentData(`FICHA EUROPEA DE INFORMACIÓN NORMALIZADA FEIN\nENTIDAD PRESTAMISTA: Banco Ejemplo\nPRESTATARIOS: Persona Uno y Persona Dos\nIMPORTE DEL PRÉSTAMO: 180.000,00 €\nPLAZO: 300 meses\nTIN: 2,50 %\nTAE: 2,91 %\nCUOTA MENSUAL: 807,45 €\nNÚMERO DE CUOTAS: 300\nSISTEMA DE AMORTIZACIÓN: Francés\nPRODUCTOS VINCULADOS: Nómina, seguro hogar y seguro vida\nCOMISIONES: Apertura 0 %\nAMORTIZACIÓN ANTICIPADA: Según Ley 5/2019\nVIGENCIA: 30 días`);
 expect(r.documentType).toBe('FEIN / FIAE');
 expect(r.fields.tin).toBe(2.5);
 expect(r.fields.tae).toBe(2.91);
 expect(r.fields.cuota).toBe(807.45);
 expect(r.fields.numero_cuotas).toBe(300);
 expect(r.fields.sistema_amortizacion).toContain('Francés');
 expect(r.fields.vinculaciones).toContain('Nómina');
});
