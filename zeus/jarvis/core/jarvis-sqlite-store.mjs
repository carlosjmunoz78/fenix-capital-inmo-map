/** LAB-only durable store; needs Node.js 22+ built-in sqlite. Not connected to PROD. */
import {DatabaseSync} from 'node:sqlite';
function clean(s){if(typeof s!=='string'||!s||s.length>240)throw new TypeError('INVALID_KEY');return s;}
export class SqliteMissionStore {
  constructor(filename){this.db=new DatabaseSync(filename);this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS missions (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(owner_id, company_id, idempotency_key)
  ); CREATE INDEX IF NOT EXISTS missions_owner_idx ON missions(owner_id);`);
  }
  close(){this.db.close();}
  async get(id){const row=this.db.prepare('SELECT payload FROM missions WHERE id=?').get(clean(id));return row?JSON.parse(row.payload):null;}
  async findByIdempotency(scope,key){const p=clean(scope).split(':');if(p.length!==2)throw new Error('INVALID_SCOPE');const row=this.db.prepare('SELECT payload FROM missions WHERE owner_id=? AND company_id=? AND idempotency_key=?').get(p[0],p[1],clean(key));return row?JSON.parse(row.payload):null;}
  async put(m){if(!m?.id||!m?.ownerId||!m?.companyId||!m?.idempotencyKey)throw new Error('INVALID_MISSION');
    const before=this.db.prepare('SELECT payload FROM missions WHERE id=?').get(clean(m.id));
    if(!before){ // atomic unique key prevents duplicate mission writes across independent processes
      const insert=this.db.prepare('INSERT OR IGNORE INTO missions(id, owner_id, company_id, idempotency_key,payload,updated_at) VALUES(?,?,?,?,?,?)');
      const res=insert.run(m.id,m.ownerId,m.companyId,m.idempotencyKey,JSON.stringify(m),m.updatedAt);
      if(!res.changes)throw new Error('MISSION_KEY_CONFLICT');
    }else{
      const prev=JSON.parse(before.payload);
      if(prev.ownerId!==m.ownerId||prev.companyId!==m.companyId||prev.idempotencyKey!==m.idempotencyKey)throw new Error('MISSION_SCOPE_MUTATION_DENIED');
      this.db.prepare('UPDATE missions SET payload=?,updated_at=? WHERE id=?').run(JSON.stringify(m),m.updatedAt,m.id);
    }
    return structuredClone(m);
  }
  async list(ownerId){return this.db.prepare('SELECT payload FROM missions WHERE owner_id=? ORDER BY updated_at DESC').all(clean(ownerId)).map(x=>JSON.parse(x.payload));}
}