import type {ExtractedFields} from './browserDocumentOcr';
import {getDocumentPreviewSchema} from './documentPreviewMasterSchema';

function clean(v:string,max=1200){return v.replace(/[ \t]+/g,' ').replace(/^[:\-–—\s]+/,'').trim().slice(0,max);}
function escapeRx(v:string){return v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+').replace(/\//g,'\\s*\\/\\s*');}
function labelValue(text:string,label:string,max=1200){const ls=text.replace(/\r/g,'\n').split(/\n+/).map(x=>clean(x,1800)).filter(Boolean);const rx=escapeRx(label);for(let i=0;i<ls.length;i++){const inline=ls[i].match(new RegExp(`^${rx}\\s*[:\\-–—]\\s*(.{1,${max}})$`,'i'));if(inline?.[1])return clean(inline[1],max);if(new RegExp(`^${rx}\\s*[:\\-–—]?\\s*$`,'i').test(ls[i])&&ls[i+1])return clean(ls[i+1],max);}return'';}
function parseDate(raw:string){const m=raw.match(/\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\b/);if(!m)return'';const y=m[3].length===2?`20${m[3]}`:m[3];return`${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;}
function parseMoney(raw:string){if(!/(?:€|EUR|\d[.,]\d{2}\b)/i.test(raw))return null;const m=raw.match(/(?:€|EUR)?\s*(-?\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})|-?\d+(?:[.,]\d{1,2})?)\s*(?:€|EUR)?/i);if(!m)return null;const n=Number(m[1].replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:null;}
function parsePercent(raw:string){const m=raw.match(/(-?\d{1,3}(?:[.,]\d{1,4})?)\s*%/);if(!m)return null;const n=Number(m[1].replace(',','.'));return Number.isFinite(n)?n:null;}
function parsed(label:string,key:string,raw:string):string|number|null{const semantic=`${label} ${key}`;if(/fecha|nacimiento|caducidad|expedici[oó]n|formalizaci[oó]n|vencimiento/i.test(semantic)){const d=parseDate(raw);return d||clean(raw,300);}if(/%|porcentaje|\btin\b|\btae\b|diferencial|ltv|tipo impositivo/i.test(semantic)){const p=parsePercent(raw);return p===null?clean(raw,300):p;}if(/importe|saldo|capital|cuota|precio|valor|prima|base|ingresos|gastos|coste|deuda|renta|presupuesto|retenciones|resultado|total/i.test(semantic)){const m=parseMoney(raw);return m===null?clean(raw,500):m;}return clean(raw,1200)||null;}
function present(v:unknown){return v!==undefined&&v!==null&&String(v).trim()!=='';}

/**
 * Fallback universal: solo completa huecos del esquema maestro cuando el propio
 * documento contiene una etiqueta exacta. Nunca pisa extractores específicos,
 * nunca busca números cercanos y nunca convierte prosa libre en un campo.
 */
export function autofillMasterSchemaFields(rawText:string,fields:ExtractedFields,typeHint:string){const schema=getDocumentPreviewSchema({tipo:typeHint});if(!schema)return fields;const out:ExtractedFields={...fields};for(const field of schema.fields){if(field.keys.some(k=>present(out[k])))continue;const raw=labelValue(rawText,field.label);if(!raw)continue;const key=field.keys[0];const value=parsed(field.label,key,raw);if(value!==null&&!present(out[key]))out[key]=value;}return out;}
