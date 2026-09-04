import {expect,test} from '@playwright/test';
import {sanitizeCriticalDocumentFields} from '../src/criticalDocumentFieldSanitizer';
import {getDocumentPreviewFields} from '../src/documentPreviewMasterSchema';
import type {ExtractedDocument} from '../src/browserDocumentOcr';

const doc=(documentType:string,rawText:string):ExtractedDocument=>({documentType,rawText,summary:'resumen secundario',confidence:99,fields:{}});
const preview=(tipo:string,fields:Record<string,unknown>)=>getDocumentPreviewFields({tipo,...fields});
const value=(tipo:string,fields:Record<string,unknown>,label:string)=>preview(tipo,fields).find(x=>x.label===label)?.value;
const labels=(tipo:string,fields:Record<string,unknown>)=>preview(tipo,fields).map(x=>x.label);

test('vida laboral real layout fills the fixed financier card',()=>{
 const text=`INFORME DE VIDA LABORAL\nDe los antecedentes obrantes en la Tesorería General de la Seguridad Social al día 10 de junio de 2026 , resulta que D/Dª\nCRISTINA GRACIA RIVERA , nacido/a el 10 de abril de 1981 , con\nNúmero de la Seguridad Social 141027163379 , D.N.I. 030964687V\nha figurado en situación de alta en el Sistema de la Seguridad Social durante un total de\n19 Años\n7.036 días 3 meses\n7 días\nel total de días efectivamente computables para las prestaciones económicas del Sistema de la Seguridad Social es de\n19 Años\n7.025 días 2 meses\n27 días\nNOMBRE Y APELLIDOS Nº SEGURIDAD SOCIAL DOCUMENTO IDENTIFICATIVO\nCRISTINA GRACIA RIVERA 141027163379 D.N.I. 030964687V\nGENERAL 14103562247 SERVICIO ANDALUZ DE LA SALUD 01.05.2022 01.05.2022 --- 418 --- 02 1.502\nDurante los días indicados ha existido pluriempleo durante un total de 11 días`;
 const r=sanitizeCriticalDocumentFields(doc('Vida laboral',text),text);
 expect(labels('Vida laboral',r.fields)).toEqual(expect.arrayContaining(['Titular','Fecha del informe','Situación actual','Régimen','Empresa actual','Fecha de alta actual','Antigüedad','Empresas anteriores','Periodos trabajados','Días totales cotizados','Incidencias / solapamientos']));
 expect(value('Vida laboral',r.fields,'Titular')).toBe('CRISTINA GRACIA RIVERA');
 expect(r.fields.nss).toContain('141027163379');
 expect(r.fields.dni_nie).toContain('030964687V');
 expect(value('Vida laboral',r.fields,'Fecha del informe')).toBe('2026-06-10');
 expect(value('Vida laboral',r.fields,'Empresa actual')).toBe('SERVICIO ANDALUZ DE LA SALUD');
 expect(value('Vida laboral',r.fields,'Fecha de alta actual')).toBe('2022-05-01');
 expect(value('Vida laboral',r.fields,'Días totales cotizados')).toBe(7025);
});

test('nomina real SAS layout fills the fixed payroll card',()=>{
 const text=`Justificante de nómina\nDATOS DE LA EMPRESA DATOS DEL PERCEPTOR\nCentro nómina:\nD. Córdoba\nCIF:\nQ9150013B\nNombre:\nGracia Rivera, Cristina\nNIF/NIE:\n30964687V\nCategoría/puesto de desempeño:\n22301 - - (DIPLOMADO ENFERMERÍA DISPOSITIVO APOYO)\nFecha emisión: 2026-04\nPeriodo liquidación: 01/03/2026 al 31/03/2026\n001 SUELDO 1.199,52\n005 COMPLEMENTO DESTINO 592,11\n001 I.R.P.F. 3.066,56 24,25 743,64\n011 COTIZAC.REG.GRAL.S.S 3.421,50 4,85 165,94\nTotal devengos: 3.066,56\nTotal descuentos: 966,03\nLíquido a percibir: 2.100,53\n01 CONTINGENCIAS COMUNES 3.421,50 24,35 833,14\nDocumento obtenido de la dirección https://www.sspa.juntadeandalucia.es/servicioandaluzdesalud`;
 const r=sanitizeCriticalDocumentFields(doc('Nómina',text),text);
 expect(labels('Nómina',r.fields)).toEqual(expect.arrayContaining(['Trabajador','Empresa / CIF','Mes y año','Categoría','Salario base','Complementos','Bruto','Base de cotización','IRPF','Deducciones','Neto','Embargos / anticipos']));
 expect(value('Nómina',r.fields,'Trabajador')).toBe('Gracia Rivera, Cristina');
 expect(r.fields.nif_nie).toBe('30964687V');
 expect(r.fields.empresa).toBe('Servicio Andaluz de Salud');
 expect(r.fields.cif_empresa).toBe('Q9150013B');
 expect(value('Nómina',r.fields,'Mes y año')).toContain('01/03/2026');
 expect(value('Nómina',r.fields,'Categoría')).toContain('DIPLOMADO ENFERMERÍA');
 expect(value('Nómina',r.fields,'Salario base')).toBe(1199.52);
 expect(value('Nómina',r.fields,'Bruto')).toBe(3066.56);
 expect(value('Nómina',r.fields,'Base de cotización')).toBe(3421.5);
 expect(r.fields.irpf_porcentaje).toBe(24.25);
 expect(r.fields.irpf_importe).toBe(743.64);
 expect(value('Nómina',r.fields,'Neto')).toBe(2100.53);
});

test('renta 2025 real layout fills the fixed tax card with exact labelled amounts',()=>{
 const text=`Modelo 100 Ejercicio 2025\nNIF 30964687V 0001\nApellidos y nombre GRACIA RIVERA CRISTINA 0002\nTributación individual X 0068\nTotal ingresos íntegros computables [(03)+(07)] 59.468,81 0012\nSuma de rendimientos netos reducidos del capital inmobiliario 50,72 0156\nReferencia catastral. 2330901UG4923S0075XK 0066\nDirección del inmueble MENENDEZ PIDAL 0069\nBase imponible general [(420)] 53.242,72 0435\nBase liquidable general [(435)] 53.242,72 0500\nCuota diferencial [(595)-(609)] -259,35 0610\nResultado de la declaración -259,35 0670`;
 const r=sanitizeCriticalDocumentFields(doc('IRPF',text),text);
 expect(labels('Declaración de la Renta / IRPF',r.fields)).toEqual(expect.arrayContaining(['Titular/es','Ejercicio','Modalidad','Rendimientos del trabajo','Rendimientos inmobiliarios','Ganancias / pérdidas','Base imponible','Base liquidable','Resultado','Inmuebles declarados','Préstamos / hipotecas']));
 expect(value('Declaración de la Renta / IRPF',r.fields,'Titular/es')).toBe('GRACIA RIVERA CRISTINA');
 expect(r.fields.nif).toBe('30964687V');
 expect(value('Declaración de la Renta / IRPF',r.fields,'Ejercicio')).toBe('2025');
 expect(value('Declaración de la Renta / IRPF',r.fields,'Modalidad')).toBe('Tributación individual');
 expect(value('Declaración de la Renta / IRPF',r.fields,'Rendimientos del trabajo')).toBe(59468.81);
 expect(value('Declaración de la Renta / IRPF',r.fields,'Base imponible')).toBe(53242.72);
 expect(value('Declaración de la Renta / IRPF',r.fields,'Base liquidable')).toBe(53242.72);
 expect(value('Declaración de la Renta / IRPF',r.fields,'Resultado')).toBe(-259.35);
 expect(r.fields.resultado_declaracion).toBe(-259.35);
});

test('movimientos real layout fills the fixed bank card and keeps NOMINA as a movement',()=>{
 const text=`Titular Cristina Gracia Rivera IBAN ES63 2100 8957 1513 0027 9536\nPeriodo 01/12/2025 - 01/06/2026 Saldo disponible\nNOMINA 27/05/2026 +2249,85€ 28.160,05€\nTRANSF. A SU FAVOR 30/04/2026 +646,68€ 28.504,24€\nFinanciacion Saba 01/06/2026 -46,58€ 26.982,74€\nENDESA ENERGIA S. 28/05/2026 -79,70€ 28.075,45€`;
 const r=sanitizeCriticalDocumentFields(doc('Movimientos bancarios',text),text);
 expect(labels('Movimientos bancarios',r.fields)).toEqual(expect.arrayContaining(['Titular/es','Banco','IBAN','Periodo','Saldo inicial','Saldo final','Ingresos recurrentes','Nóminas','Cuotas de préstamos','Alquileres','Pensiones','Recibos relevantes','Descubiertos','Comisiones','Transferencias relevantes','Saldo disponible']));
 expect(value('Movimientos bancarios',r.fields,'Titular/es')).toBe('Cristina Gracia Rivera');
 expect(value('Movimientos bancarios',r.fields,'IBAN')).toContain('9536');
 expect(value('Movimientos bancarios',r.fields,'Periodo')).toBe('2025-12-01 - 2026-06-01');
 expect(String(value('Movimientos bancarios',r.fields,'Nóminas'))).toContain('NOMINA 27/05/2026');
 expect(String(value('Movimientos bancarios',r.fields,'Cuotas de préstamos'))).toContain('Financiacion Saba');
 expect(String(value('Movimientos bancarios',r.fields,'Recibos relevantes'))).toContain('ENDESA');
});
