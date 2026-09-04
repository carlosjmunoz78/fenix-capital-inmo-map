import {expect,test} from '@playwright/test';
import {sanitizeCriticalDocumentFields} from '../src/criticalDocumentFieldSanitizer';
import type {ExtractedDocument} from '../src/browserDocumentOcr';

const doc=(documentType:string,rawText:string):ExtractedDocument=>({documentType,rawText,summary:'legacy summary must disappear',confidence:99,fields:{}});

test('vida laboral real layout returns the fixed financier scheme',()=>{
 const text=`INFORME DE VIDA LABORAL\nDe los antecedentes obrantes en la Tesorería General de la Seguridad Social al día 10 de junio de 2026 , resulta que D/Dª\nCRISTINA GRACIA RIVERA , nacido/a el 10 de abril de 1981 , con\nNúmero de la Seguridad Social 141027163379 , D.N.I. 030964687V\nha figurado en situación de alta en el Sistema de la Seguridad Social durante un total de\n19 Años\n7.036 días 3 meses\n7 días\nel total de días efectivamente computables para las prestaciones económicas del Sistema de la Seguridad Social es de\n19 Años\n7.025 días 2 meses\n27 días\nNOMBRE Y APELLIDOS Nº SEGURIDAD SOCIAL DOCUMENTO IDENTIFICATIVO\nCRISTINA GRACIA RIVERA 141027163379 D.N.I. 030964687V\nGENERAL 14103562247 SERVICIO ANDALUZ DE LA SALUD 01.05.2022 01.05.2022 --- 418 --- 02 1.502\nDurante los días indicados ha existido pluriempleo durante un total de 11 días`;
 const r=sanitizeCriticalDocumentFields(doc('Vida laboral',text),text);
 expect(r.summary).toBe('');
 expect(Object.keys(r.fields)).toEqual(expect.arrayContaining(['titular','nss','dni_nie','fecha_informe','situacion_actual','regimen','empresa_actual','fecha_alta_actual','antiguedad','total_dias','empresas_anteriores','periodos_trabajados','incidencias']));
 expect(r.fields.titular).toBe('CRISTINA GRACIA RIVERA');
 expect(r.fields.nss).toContain('141027163379');
 expect(r.fields.dni_nie).toContain('030964687V');
 expect(r.fields.fecha_informe).toBe('2026-06-10');
 expect(r.fields.empresa_actual).toBe('SERVICIO ANDALUZ DE LA SALUD');
 expect(r.fields.fecha_alta_actual).toBe('2022-05-01');
 expect(r.fields.total_dias).toBe(7025);
});

test('nomina real SAS layout returns only the fixed payroll scheme with values',()=>{
 const text=`Justificante de nómina\nDATOS DE LA EMPRESA DATOS DEL PERCEPTOR\nCentro nómina:\nD. Córdoba\nCIF:\nQ9150013B\nNombre:\nGracia Rivera, Cristina\nNIF/NIE:\n30964687V\nCategoría/puesto de desempeño:\n22301 - - (DIPLOMADO ENFERMERÍA DISPOSITIVO APOYO)\nFecha emisión: 2026-04\nPeriodo liquidación: 01/03/2026 al 31/03/2026\n001 SUELDO 1.199,52\n005 COMPLEMENTO DESTINO 592,11\n001 I.R.P.F. 3.066,56 24,25 743,64\n011 COTIZAC.REG.GRAL.S.S 3.421,50 4,85 165,94\nTotal devengos: 3.066,56 Total descuentos: 966,03\nLíquido a percibir: 2.100,53\n01 CONTINGENCIAS COMUNES 3.421,50 24,35 833,14\nDocumento obtenido de la dirección https://www.sspa.juntadeandalucia.es/servicioandaluzdesalud`;
 const r=sanitizeCriticalDocumentFields(doc('Nómina',text),text);
 expect(Object.keys(r.fields)).toEqual(expect.arrayContaining(['titular','nif_nie','empresa','cif','mes_anio','periodo','categoria_puesto','salario_base','complementos','pagas_extra_prorrata','bruto','base_cotizacion','irpf_porcentaje','irpf_importe','deducciones','neto','embargos_anticipos']));
 expect(r.fields.titular).toBe('Gracia Rivera, Cristina');
 expect(r.fields.nif_nie).toBe('30964687V');
 expect(r.fields.empresa).toBe('Servicio Andaluz de Salud');
 expect(r.fields.cif).toBe('Q9150013B');
 expect(r.fields.mes_anio).toBe('2026-04');
 expect(String(r.fields.periodo)).toContain('01/03/2026');
 expect(r.fields.salario_base).toBe(1199.52);
 expect(r.fields.bruto).toBe(3066.56);
 expect(r.fields.base_cotizacion).toBe(3421.5);
 expect(r.fields.irpf_porcentaje).toBe(24.25);
 expect(r.fields.irpf_importe).toBe(743.64);
 expect(r.fields.neto).toBe(2100.53);
});

test('renta 2025 real layout returns fixed tax scheme and exact labelled amounts',()=>{
 const text=`Modelo 100 Ejercicio 2025\nNIF 30964687V 0001\nApellidos y nombre GRACIA RIVERA CRISTINA 0002\nTributación individual X 0068\nTotal ingresos íntegros computables [(03)+(07)] 59.468,81 0012\nSuma de rendimientos netos reducidos del capital inmobiliario 50,72 0156\nReferencia catastral. 2330901UG4923S0075XK 0066\nDirección del inmueble MENENDEZ PIDAL 0069\nBase imponible general [(420)] 53.242,72 0435\nBase liquidable general [(435)] 53.242,72 0500\nCuota diferencial [(595)-(609)] -259,35 0610\nResultado de la declaración -259,35 0670`;
 const r=sanitizeCriticalDocumentFields(doc('IRPF',text),text);
 expect(Object.keys(r.fields)).toEqual(expect.arrayContaining(['titular','nif','ejercicio','modalidad','rendimientos_trabajo','actividades_economicas','capital','inmobiliarios','ganancias_perdidas','base_imponible','base_liquidable','resultado','inmuebles','prestamos_hipotecas']));
 expect(r.fields.titular).toContain('GRACIA RIVERA CRISTINA');
 expect(r.fields.nif).toContain('30964687V');
 expect(r.fields.ejercicio).toBe('2025');
 expect(r.fields.modalidad).toBe('Tributación individual');
 expect(r.fields.rendimientos_trabajo).toBe(59468.81);
 expect(r.fields.base_imponible).toBe(53242.72);
 expect(r.fields.base_liquidable).toBe(53242.72);
 expect(r.fields.resultado).toBe(-259.35);
});

test('movimientos real layout returns fixed bank scheme and never reclassifies NOMINA as payroll',()=>{
 const text=`Titular Cristina Gracia Rivera IBAN ES63 2100 8957 1513 0027 9536\nPeriodo 01/12/2025 - 01/06/2026 Saldo disponible\nNOMINA 27/05/2026 +2249,85€ 28.160,05€\nTRANSF. A SU FAVOR 30/04/2026 +646,68€ 28.504,24€\nFinanciacion Saba 01/06/2026 -46,58€ 26.982,74€\nENDESA ENERGIA S. 28/05/2026 -79,70€ 28.075,45€`;
 const r=sanitizeCriticalDocumentFields(doc('Movimientos bancarios',text),text);
 expect(Object.keys(r.fields)).toEqual(expect.arrayContaining(['titular','banco','iban','periodo','saldo_inicial','saldo_final','nominas','ingresos_recurrentes','prestamos','alquileres','pensiones','recibos','descubiertos','comisiones','transferencias_relevantes']));
 expect(r.fields.titular).toBe('Cristina Gracia Rivera IBAN ES63 2100 8957 1513 0027 9536');
 expect(r.fields.iban).toContain('9536');
 expect(r.fields.periodo).toContain('01/12/2025');
 expect(String(r.fields.nominas)).toContain('NOMINA 27/05/2026');
 expect(String(r.fields.prestamos)).toContain('Financiacion Saba');
 expect(String(r.fields.recibos)).toContain('ENDESA');
});
