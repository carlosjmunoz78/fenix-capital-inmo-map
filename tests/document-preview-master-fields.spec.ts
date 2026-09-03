import {expect,test} from '@playwright/test';
import {DOCUMENT_PREVIEW_FAMILY_COUNT,getDocumentPreviewFields,getDocumentPreviewSchema} from '../src/documentPreviewMasterSchema';

const labels=(type:string)=>getDocumentPreviewFields({tipo:type}).map(x=>x.label);

test('contrato maestro cubre un catálogo amplio de familias documentales',()=>{
 expect(DOCUMENT_PREVIEW_FAMILY_COUNT).toBeGreaterThanOrEqual(50);
});

test('vida laboral mantiene visibles todos sus puntos operativos aunque falten datos',()=>{
 const l=labels('Vida laboral');
 for(const x of ['Titular','Fecha del informe','Situación actual','Régimen','Empresa actual','Fecha de alta actual','Antigüedad','Empresas anteriores','Periodos trabajados','Días totales cotizados','Incidencias / solapamientos'])expect(l).toContain(x);
 expect(getDocumentPreviewFields({tipo:'Vida laboral',titular:'Persona'}).find(x=>x.label==='Empresa actual')?.value).toBeNull();
});

test('tasación muestra superficie valoración condicionantes observaciones y excepciones',()=>{
 const l=labels('Tasación');
 for(const x of ['Tasadora','Tasador / técnico','Superficie útil','Superficie construida','Valor de tasación','Valor hipotecario','Comparables utilizados','Condicionantes','Advertencias','Observaciones del tasador','Excepciones / salvedades','Documentación pendiente','Vigencia'])expect(l).toContain(x);
});

test('nota simple expone titularidad y todas las cargas relevantes',()=>{
 const l=labels('Nota simple');
 for(const x of ['Registro','Número de finca','CRU / IDUFIR','Referencia catastral','Superficie','Titular/es','Porcentaje titularidad','Cargas','Hipotecas','Embargos','Limitaciones','Servidumbres','Anotaciones preventivas'])expect(l).toContain(x);
});

test('FEIN y oferta bancaria mantienen el detalle financiero completo',()=>{
 const fein=labels('FEIN'); for(const x of ['Importe','TIN','TAE','Cuota','Número de cuotas','Sistema de amortización','Coste total','Comisiones','Gastos','Productos vinculados / combinados','Consecuencias de impago','Amortización anticipada','Condiciones de revisión','Vigencia'])expect(fein).toContain(x);
 const oferta=labels('Oferta bancaria'); for(const x of ['% financiación','Precio compra','Tasación considerada','Tipo fijo / variable / mixto','Diferencial','Índice','Vinculaciones','Bonificaciones','Comisiones','Productos','Condiciones'])expect(oferta).toContain(x);
});

test('herencias divorcios obras nuevas escrituras hipotecas y tarjetas tienen esquema propio',()=>{
 expect(getDocumentPreviewSchema({tipo:'Herencia'})?.family).toBe('Herencia');
 expect(labels('Herencia')).toEqual(expect.arrayContaining(['Causante','Herederos','Bienes','Inmuebles','Porcentajes','Adjudicación','Impuestos / liquidación','Incidencias']));
 expect(getDocumentPreviewSchema({tipo:'Divorcio sentencia'})?.family).toBe('Divorcio / liquidación');
 expect(labels('Divorcio sentencia')).toEqual(expect.arrayContaining(['Partes','Hijos','Custodia','Pensión de alimentos','Vivienda familiar','Préstamos / deudas','Obligaciones económicas']));
 expect(getDocumentPreviewSchema({tipo:'Obra nueva'})?.family).toBe('Obra nueva');
 expect(labels('Obra nueva')).toEqual(expect.arrayContaining(['Promoción','Promotor','Licencia','Proyecto','Superficies','Presupuesto','Fases','Estado de ejecución','Certificaciones','Coste pendiente']));
 expect(getDocumentPreviewSchema({tipo:'Escritura compraventa'})?.family).toBe('Escritura');
 expect(labels('Escritura compraventa')).toEqual(expect.arrayContaining(['Otorgantes','Comprador/es','Vendedor/es','Inmueble / bien','Precio / valor','Cargas','Notario','Protocolo','Cláusulas relevantes']));
 expect(getDocumentPreviewSchema({tipo:'Hipoteca novación'})?.family).toBe('Hipoteca');
 expect(labels('Hipoteca novación')).toEqual(expect.arrayContaining(['Banco','Prestatario/s','Capital inicial','Saldo pendiente','Cuota','TIN','TAE','Diferencial','Índice','Garantías','Responsabilidad hipotecaria','Vinculaciones']));
 expect(getDocumentPreviewSchema({tipo:'Tarjeta de visita'})?.family).toBe('Tarjeta de visita');
 expect(labels('Tarjeta de visita')).toEqual(expect.arrayContaining(['Nombre','Apellidos','Empresa / inmobiliaria','Cargo','Teléfono','Email','Web','Redes / QR']));
});

test('documento no clasificado no inventa campos maestros',()=>{
 const fields=getDocumentPreviewFields({tipo:'Documento desconocido',dato_real:'Sí'});
 expect(fields).toEqual([{label:'Dato Real',value:'Sí',expected:false}]);
});
