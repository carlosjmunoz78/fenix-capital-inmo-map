export type DocumentValidationState='pending'|'confirmed'|'conflict'|'rejected';

export type DocumentEvidence={
 sourceFileId?:string;
 page?:number;
 imageIndex?:number;
 block?:number;
 boundingBox?:{x:number;y:number;width:number;height:number};
 quote?:string;
 visualObservation?:string;
 extractor?:string;
};

export type DocumentFieldResult={
 canonicalField:string;
 value:unknown;
 evidence:DocumentEvidence[];
 confidence:number|null;
 validationState:DocumentValidationState;
 conflict?:{existingValue?:unknown;proposedValue?:unknown;reason:string}|null;
 contractVersion:number;
};

export type DocumentIntelligenceV2={
 version:2;
 contractId:string;
 contractVersion:number;
 family:string;
 subtype?:string;
 fields:Record<string,DocumentFieldResult>;
 alerts:string[];
 summary:string;
};

export function isConfirmedField(field:DocumentFieldResult|undefined){return field?.validationState==='confirmed'&&field.value!==null&&field.value!==undefined&&String(field.value).trim()!=='';}
