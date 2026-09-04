import {getDocumentPreviewSchema,type PreviewField,type PreviewSchema} from './documentPreviewMasterSchema';

export type DocumentInputKind='pdf'|'scan'|'document_photo'|'contextual_photo';
export type DocumentFieldContract={
 canonicalField:string;
 label:string;
 aliases:string[];
 required:boolean;
 valueType:'text'|'money'|'percent'|'date'|'number'|'boolean';
 destinations:string[];
};
export type DocumentContract={
 id:string;
 version:2;
 family:string;
 inputKinds:DocumentInputKind[];
 fields:DocumentFieldContract[];
 summaryFields:string[];
};

const CONTRACT_VERSION=2 as const;
const moneyKeys=/^(salario_base|complementos|pagas_extra|bruto|total_devengado|base_cotizacion|deducciones|neto|liquido|rendimientos_|base_imponible|base_liquidable|resultado|saldo_|ingresos_|nominas|cuotas_|alquileres|pensiones|recibos|descubiertos|comisiones|transferencias|importe|capital|cuota|precio|valor|prima)/i;
const percentKeys=/^(irpf|tin|tae|porcentaje|ltv|diferencial|tipo_impositivo)$/i;
const dateKeys=/^(fecha|vencimiento|vigencia|periodo)$/i;
const numberKeys=/^(total_dias|dias_|numero_|superficie|anio_)/i;
const important:Record<string,Set<string>>={
 'Vida laboral':new Set(['titular','fecha_informe','situacion_actual','regimen','empresa_actual','fecha_alta_actual','antiguedad','periodos_trabajados','total_dias']),
 'Nómina':new Set(['trabajador','titular','empresa','cif_empresa','periodo','antiguedad','categoria_profesional','salario_base','bruto','base_cotizacion','irpf','deducciones','neto','embargos']),
 'Declaración de la Renta / IRPF':new Set(['titulares','titular','ejercicio','rendimientos_trabajo','rendimientos_actividad','rendimientos_capital','base_imponible','base_liquidable','resultado']),
 'Movimientos bancarios':new Set(['titulares','titular','banco','entidad','iban','periodo','saldo_inicial','saldo_final','ingresos_recurrentes','nominas','cuotas_prestamos','descubiertos','comisiones','saldo_disponible'])
};
const summary:Record<string,string[]>={
 'Vida laboral':['titular','situacion_actual','regimen','empresa_actual','fecha_alta_actual','antiguedad','total_dias','incidencias'],
 'Nómina':['trabajador','titular','empresa','cif_empresa','periodo','antiguedad','categoria_profesional','bruto','neto','irpf','embargos','anticipos'],
 'Declaración de la Renta / IRPF':['titulares','titular','ejercicio','modalidad','rendimientos_trabajo','rendimientos_actividad','rendimientos_capital','base_imponible','base_liquidable','resultado'],
 'Movimientos bancarios':['titulares','titular','banco','entidad','iban','periodo','saldo_inicial','saldo_final','ingresos_recurrentes','nominas','cuotas_prestamos','descubiertos','comisiones','saldo_disponible']
};
function valueType(key:string):DocumentFieldContract['valueType']{if(percentKeys.test(key))return'percent';if(moneyKeys.test(key))return'money';if(dateKeys.test(key))return'date';if(numberKeys.test(key))return'number';return'text';}
function fieldContract(schema:PreviewSchema,field:PreviewField):DocumentFieldContract{const canonicalField=field.keys[0];return{canonicalField,label:field.label,aliases:field.keys.slice(1),required:Boolean(important[schema.family]?.has(canonicalField)||field.keys.some(k=>important[schema.family]?.has(k))),valueType:valueType(canonicalField),destinations:['document']};}
function slug(v:string){return v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
export function resolveDocumentContract(typeOrRow:string|Record<string,unknown>):DocumentContract|null{const row=typeof typeOrRow==='string'?{tipo:typeOrRow}:typeOrRow;const schema=getDocumentPreviewSchema(row);if(!schema)return null;return{id:`fenix:${slug(schema.family)}`,version:CONTRACT_VERSION,family:schema.family,inputKinds:schema.family==='Fotografía documental'?['contextual_photo','document_photo']:['pdf','scan','document_photo'],fields:schema.fields.map(field=>fieldContract(schema,field)),summaryFields:summary[schema.family]||schema.fields.slice(0,10).map(x=>x.keys[0])};}
export const DOCUMENT_CONTRACT_VERSION=CONTRACT_VERSION;
