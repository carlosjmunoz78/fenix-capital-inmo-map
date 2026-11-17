/**
 * NIA replay ledger — SQLite-backed Durable Object, isolated from D1/Supabase.
 * Only NIA dispatcher may call claim(); no HTTP route or application data.
 * Single object per company/engine/environment; SQLite unique key is atomic.
 */
import { DurableObject } from 'cloudflare:workers';

export class NiaNonceLedger extends DurableObject {
  constructor(ctx,env) {
    super(ctx,env);
    this.sql=ctx.storage.sql;
    this.sql.exec(
      'CREATE TABLE IF NOT EXISTS nia_nonce_claims ('+
      'nonce TEXT PRIMARY KEY NOT NULL, expires_at_ms INTEGER NOT NULL)'
    );
  }

  async claim(nonce,ttlSeconds) {
    if(typeof nonce!=='string'||!/^[a-f0-9-]{36}$/.test(nonce)||
      !Number.isSafeInteger(ttlSeconds)||ttlSeconds<1||ttlSeconds>60) return false;
    const now=Date.now();
    // The single-threaded Durable Object serializes these SQLite writes.
    // Expired nonces can be cleared, but a valid signed envelope has already expired too.
    this.sql.exec('DELETE FROM nia_nonce_claims WHERE expires_at_ms <= ?',now);
    this.sql.exec(
      'INSERT OR IGNORE INTO nia_nonce_claims(nonce,expires_at_ms) VALUES(?,?)',
      nonce,now+ttlSeconds*1000
    );
    return this.sql.exec('SELECT changes() AS changes').one().changes===1;
  }

  async health() {
    return {status:'READY',table:'nia_nonce_claims',scope:'fenix/ACTGW-001/PREPROD'};
  }
}

export function makeNiaNonceStoreV1(binding,companyId='fenix') {
  if(!binding||typeof binding.idFromName!=='function'||typeof binding.get!=='function')
    throw new Error('NIA_DURABLE_LEDGER_BINDING_REQUIRED');
  if(companyId!=='fenix') throw new Error('NIA_TENANT_OUT_OF_SCOPE');
  const name='fenix/ACTGW-001/PREPROD';
  const stub=binding.get(binding.idFromName(name));
  return Object.freeze({
    claim:(nonce,ttlSeconds)=>stub.claim(nonce,ttlSeconds)
  });
}
