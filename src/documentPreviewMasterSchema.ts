import {getDocumentPreviewSchema as getCoreSchema,getDocumentPreviewFields as getCoreFields,DOCUMENT_PREVIEW_FAMILY_COUNT} from './documentPreviewMasterSchemaCore';
import type {PreviewRow,PreviewField,PreviewSchema} from './documentPreviewMasterSchemaCore';

export type {PreviewRow,PreviewField,PreviewSchema};
export {DOCUMENT_PREVIEW_FAMILY_COUNT};

const vidaOperational:PreviewField[]=[
 {label:'Años totales cotizados',keys:['anos_cotizados']},
 {label:'Antigüedad actual',keys:['antiguedad_actual_anos','antiguedad']},
 {label:'Años seguidos actuales',keys:['anos_seguidos_actuales']},
 {label:'Últimos trabajos / periodos',keys:['ultimos_trabajos','periodos_trabajados']}
];

export function getDocumentPreviewSchema(row:PreviewRow|null):PreviewSchema|null{
 const schema=getCoreSchema(row);if(!schema)return null;
 if(schema.family!=='Vida laboral')return schema;
 const labels=new Set(schema.fields.map(x=>x.label));
 return {...schema,fields:[...schema.fields,...vidaOperational.filter(x=>!labels.has(x.label))]};
}
export function readPreviewValue(row:PreviewRow,field:PreviewField){
 if(field.label==='Empresa / CIF'){
  const empresa=row.empresa??row.empresa_pagador;
  const cif=row.cif_empresa??row.cif;
  const e=empresa!==undefined&&empresa!==null?String(empresa).trim():'';
  const c=cif!==undefined&&cif!==null?String(cif).trim():'';
  if(e&&c)return`${e} · ${c}`;
  if(e)return e;
  if(c)return c;
 }
 for(const key of field.keys){const v=row[key];if(v!==undefined&&v!==null&&String(v).trim()!=='')return v;}return null;
}
export function getDocumentPreviewFields(row:PreviewRow|null){if(!row)return[] as {label:string;value:unknown;expected:boolean}[];const schema=getDocumentPreviewSchema(row);if(schema)return schema.fields.map(field=>({label:field.label,value:readPreviewValue(row,field),expected:true}));return getCoreFields(row);}
