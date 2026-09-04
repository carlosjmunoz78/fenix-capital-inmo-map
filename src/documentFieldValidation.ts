export type DocumentFieldStatus='pending_validation'|'confirmed'|'conflict';
export type DocumentFieldQuality={confidence:number|null;status:DocumentFieldStatus;evidence:string[];source:string};
export type DocumentValidationSummary={status:DocumentFieldStatus;pending:number;confirmed:number;conflicts:number};

type Row=Record<string,unknown>;

type ValidationInput={
 fields:Record<string,unknown>;
 globalConfidence?:unknown;
 fieldConfidence?:Record<string,unknown>|null;
 evidence?:Record<string,unknown>|null;
 fieldStatus?:Record<string,unknown>|null;
 conflicts?:unknown;
 source?:string;
};

function clampConfidence(value:unknown){const n=typeof value==='number'?value:Number(value);if(!Number.isFinite(n))return null;return Math.max(0,Math.min(100,n));}
function normalizeStatus(value:unknown):DocumentFieldStatus|null{const s=String(value??'').trim().toLowerCase();if(['confirmed','confirmado','validated','validado'].includes(s))return'confirmed';if(['conflict','conflicto'].includes(s))return'conflict';if(['pending_validation','pending','pendiente','pendiente_validacion','pendiente_validación'].includes(s))return'pending_validation';return null;}
function normalizeEvidence(value:unknown){if(Array.isArray(value))return value.map(v=>String(v).trim()).filter(Boolean).slice(0,8);if(typeof value==='string'&&value.trim())return[value.trim()];if(value&&typeof value==='object')return Object.entries(value as Row).map(([k,v])=>`${k}: ${String(v)}`).slice(0,8);return[];}
function conflictKeys(value:unknown){const out=new Set<string>();if(Array.isArray(value)){for(const entry of value){if(typeof entry==='string')out.add(entry);else if(entry&&typeof entry==='object'){const r=entry as Row;for(const k of ['field','key','campo'])if(typeof r[k]==='string')out.add(String(r[k]));}}}else if(value&&typeof value==='object'){for(const [k,v] of Object.entries(value as Row))if(v)out.add(k);}return out;}

export function buildFieldValidation(input:ValidationInput){
 const global=clampConfidence(input.globalConfidence);const conflicts=conflictKeys(input.conflicts);const quality:Record<string,DocumentFieldQuality>={};
 for(const [key,value] of Object.entries(input.fields||{})){
  if(value===undefined||value===null||String(value).trim()==='')continue;
  const explicitStatus=normalizeStatus(input.fieldStatus?.[key]);
  const status:DocumentFieldStatus=conflicts.has(key)?'conflict':explicitStatus||'pending_validation';
  quality[key]={confidence:clampConfidence(input.fieldConfidence?.[key])??global,status,evidence:normalizeEvidence(input.evidence?.[key]),source:input.source||'document_intelligence'};
 }
 const values=Object.values(quality);const summary:DocumentValidationSummary={status:values.some(v=>v.status==='conflict')?'conflict':values.length>0&&values.every(v=>v.status==='confirmed')?'confirmed':'pending_validation',pending:values.filter(v=>v.status==='pending_validation').length,confirmed:values.filter(v=>v.status==='confirmed').length,conflicts:values.filter(v=>v.status==='conflict').length};
 return{quality,summary};
}

export function validationLabel(status:DocumentFieldStatus){return status==='confirmed'?'Confirmado':status==='conflict'?'Conflicto':'Pendiente de validación';}
