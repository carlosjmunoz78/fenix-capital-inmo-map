import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const now=()=>new Date().toISOString();
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
function required(v,n){if(typeof v!=='string'||!v.trim())throw new TypeError(`${n} required`);return v.trim();}
export class JarvisMemoryV1{
 constructor({file=process.env.JARVIS_MEMORY_FILE||'cerebro/jarvis/mission-001/runtime/memory.v1.jsonl'}={}){this.file=path.resolve(file);}
 append({company_id,project_id='default',kind='knowledge',content,provenance={},confidence=1,status='CURRENT_CANONICAL'}={}){const body={schema_version:'1.0',memory_id:`mem-${crypto.randomUUID()}`,company_id:required(company_id,'company_id'),project_id:required(project_id,'project_id'),kind:required(kind,'kind'),content,provenance,status,confidence:Math.max(0,Math.min(1,Number(confidence))),recorded_at:now()};const record={...body,record_hash:hash(body)};fs.mkdirSync(path.dirname(this.file),{recursive:true});fs.appendFileSync(this.file,JSON.stringify(record)+'\n','utf8');return record;}
 list({company_id,project_id=null,limit=100}={}){required(company_id,'company_id');if(!fs.existsSync(this.file))return[];return fs.readFileSync(this.file,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse).filter(x=>x.company_id===company_id&&(!project_id||x.project_id===project_id)).slice(-Math.max(1,Math.min(1000,Number(limit)||100)));}
 verify(){if(!fs.existsSync(this.file))return true;return fs.readFileSync(this.file,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse).every(({record_hash,...body})=>hash(body)===record_hash);}
}
