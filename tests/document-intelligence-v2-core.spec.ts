import {test,expect} from '@playwright/test';
import {extractDocumentData} from '../src/operationalDocumentExtraction';
import {buildDocumentOperationalSummary} from '../src/documentOperationalSummary';
import {resolveDocumentContract,DOCUMENT_CONTRACT_VERSION} from '../src/documentContracts';

test('declared Renta prevails over incidental insurance words',()=>{
 const raw=`DECLARACIÓN DE LA RENTA 2025\nPRIMER DECLARANTE: ANA GARCIA LOPEZ\nEJERCICIO 2025\nRENDIMIENTOS DEL TRABAJO 32.400,00 EUR\nBASE IMPONIBLE GENERAL 29.800,00 EUR\nRESULTADO DE LA DECLARACIÓN -425,10 EUR\nDeducción autonómica por prima de seguro 120,00 EUR`;
 const r=extractDocumentData(raw,98,'IRPF');
 expect(r.documentType).toBe('IRPF');
 expect(String(r.fields.titular)).toContain('ANA GARCIA LOPEZ');
 expect(r.fields.ejercicio).toBe('2025');
 expect(r.fields.rendimientos_trabajo).toBe(32400);
 expect(r.fields.base_imponible).toBe(29800);
});

test('vida laboral never promotes explanatory prose to titular',()=>{
 const raw=`INFORME DE VIDA LABORAL\nRégimen: es por Cuenta Propia o AUTÓNOMOS, Régimen Especial AGRARIO, Régimen Especial de los trabajadores del MAR\nNOMBRE Y APELLIDOS: ANA GARCIA LOPEZ\nNSS: 14 1234567890\nFECHA DEL INFORME: 04/09/2026\nEMPRESA ACTUAL: EMPRESA EJEMPLO SL\nFECHA DE ALTA ACTUAL: 15/03/2022\nTOTAL DE DÍAS 1630`;
 const r=extractDocumentData(raw,96,'Vida laboral');
 expect(r.documentType).toBe('Vida laboral');
 expect(r.fields.titular).toBe('ANA GARCIA LOPEZ');
 expect(String(r.fields.titular)).not.toContain('AUTÓNOMOS');
 expect(r.fields.fecha_informe).toBe('2026-09-04');
});

test('nomina extracts operational fields including period and embargo evidence',()=>{
 const raw=`RECIBO DE SALARIOS NÓMINA\nTRABAJADOR: ANA GARCIA LOPEZ\nEMPRESA: EMPRESA EJEMPLO SL\nCIF: B12345678\nPERÍODO: AGOSTO 2026\nANTIGÜEDAD: 15/03/2022\nCATEGORÍA PROFESIONAL: ADMINISTRATIVA\nSALARIO BASE 1.800,00 EUR\nTOTAL DEVENGADO 2.150,00 EUR\nBASE DE COTIZACIÓN 2.150,00 EUR\nIRPF 12,50 %\nTOTAL DEDUCCIONES 480,00 EUR\nLÍQUIDO A PERCIBIR 1.670,00 EUR\nEmbargo judicial 150,00 EUR`;
 const r=extractDocumentData(raw,97,'Nómina');
 expect(r.documentType).toBe('Nómina');
 expect(r.fields.periodo).toContain('AGOSTO 2026');
 expect(r.fields.bruto).toBe(2150);
 expect(r.fields.neto).toBe(1670);
 expect(r.fields.irpf).toBe(12.5);
 expect(String(r.fields.embargos)).toContain('Embargo');
 const summary=buildDocumentOperationalSummary({tipo:'Nómina',...r.fields,summary:'texto libre que no debe usarse'});
 expect(summary).toContain('Periodo: AGOSTO 2026');
 expect(summary).toContain('Embargo/anticipo: Sí');
 expect(summary).not.toContain('texto libre');
});

test('movimientos extracts period, balances and risk lines without inventing',()=>{
 const raw=`EXTRACTO DE MOVIMIENTOS CUENTA\nTITULAR: ANA GARCIA LOPEZ\nBANCO: BANCO EJEMPLO\nIBAN ES12 1234 5678 9012 3456 7890\nSALDO INICIAL 3.000,00 EUR\n01/06/2026 NÓMINA EMPRESA 2.000,00 EUR\n05/06/2026 CUOTA PRÉSTAMO -250,00 EUR\n07/06/2026 COMISIÓN -12,00 EUR\n30/06/2026 SALDO FINAL 4.738,00 EUR\nSALDO DISPONIBLE 4.738,00 EUR`;
 const r=extractDocumentData(raw,99,'Movimientos bancarios');
 expect(r.documentType).toBe('Movimientos bancarios');
 expect(r.fields.iban).toBe('ES12 1234 5678 9012 3456 7890');
 expect(String(r.fields.periodo)).toContain('2026-06-01');
 expect(r.fields.saldo_inicial).toBe(3000);
 expect(r.fields.saldo_final).toBe(4738);
 expect(String(r.fields.nominas)).toContain('NÓMINA');
 expect(String(r.fields.cuotas_prestamos)).toContain('PRÉSTAMO');
 expect(String(r.fields.comisiones)).toContain('COMISIÓN');
});

test('master preview schemas resolve to versioned contracts',()=>{
 const nomina=resolveDocumentContract('Nómina');
 const renta=resolveDocumentContract('Declaración de la Renta / IRPF');
 const movimientos=resolveDocumentContract('Movimientos bancarios');
 expect(DOCUMENT_CONTRACT_VERSION).toBe(2);
 expect(nomina?.fields.some(x=>x.canonicalField==='periodo'&&x.required)).toBeTruthy();
 expect(nomina?.fields.some(x=>x.canonicalField==='embargos')).toBeTruthy();
 expect(renta?.fields.some(x=>x.canonicalField==='ejercicio'&&x.required)).toBeTruthy();
 expect(movimientos?.fields.some(x=>x.canonicalField==='iban'&&x.required)).toBeTruthy();
});
