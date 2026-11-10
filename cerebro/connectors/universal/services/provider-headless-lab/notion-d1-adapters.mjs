// FACT-001 · Additive, NOT APPLIED D1 schema and persistence adapters for LAB Notion.
// No network, DB creation, migrations or external writes on import.
// Deployment requires Recovery D1 backup/time-travel bookmark, scoped service token,
// old/new regression, separate E2E and rollback acceptance first.
export const NOTION_LAB_D1_SCHEMA=String.raw`
CREATE TABLE IF NOT EXISTS fact001_notion_owned_children_v1 (
 page_id TEXT PRIMARY KEY NOT NULL,
 parent_id TEXT NOT NULL CHECK(parent_id='1c481b1a-756d-8002-813d-f3efdd4ecd89'),
 company_id TEXT NOT NULL CHECK(company_id='fenix-capital'),
 environment TEXT NOT NULL CHECK(environment='LAB'),
 approved INTEGER NOT NULL CHECK(approved IN (0,1)),
 synthetic INTEGER NOT NULL CHECK(synthetic=1),
 origin TEXT NOT NULL CHECK(origin IN ('chatgpt_authorized_fixture','cerebro_signed_fixture')),
 registered_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS fact001_notion_snapshots_v1 (
 snapshot_ref TEXT PRIMARY KEY NOT NULL,
 key_hash TEXT UNIQUE NOT NULL CHECK(length(key_hash)=64),
 page_id TEXT NOT NULL REFERENCES fact001_notion_owned_children_v1(page_id),
 title_before TEXT NOT NULL CHECK(length(title_before)<=96),
 in_trash_before INTEGER NOT NULL CHECK(in_trash_before IN (0,1)),
 revision_before TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS fact001_notion_audit_v1 (
 event_id TEXT PRIMARY KEY NOT NULL,
 key_hash TEXT NOT NULL CHECK(length(key_hash)=64),
 event TEXT NOT NULL CHECK(event IN ('NOTION_MUTATION_PREPARED','NOTION_MUTATION_VERIFIED')),
 company_id TEXT NOT NULL CHECK(company_id='fenix-capital'),
 engine_id TEXT NOT NULL CHECK(engine_id='FACT-001'),
 environment TEXT NOT NULL CHECK(environment='LAB'),
 operation TEXT NOT NULL CHECK(operation IN ('notion.lab.child.restore','notion.lab.child.trash','notion.lab.child.rename')),
 page_id TEXT NOT NULL REFERENCES fact001_notion_owned_children_v1(page_id),
 snapshot_ref TEXT NOT NULL REFERENCES fact001_notion_snapshots_v1(snapshot_ref),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 UNIQUE(key_hash,event)
);
CREATE TRIGGER IF NOT EXISTS fact001_notion_audit_block_update BEFORE UPDATE ON fact001_notion_audit_v1
 BEGIN SELECT RAISE(ABORT,'AUDIT_IMMUTABLE'); END;
CREATE TRIGGER IF NOT EXISTS fact001_notion_audit_block_delete BEFORE DELETE ON fact001_notion_audit_v1
 BEGIN SELECT RAISE(ABORT,'AUDIT_IMMUTABLE'); END;
`;
const hash=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const title=x=>typeof x==='string'&&x.length<=96&&/^FACT001 CEREBRO Notion LAB [A-Za-z0-9 _-]+$/.test(x);
const scope=x=>x?.company_id==='fenix-capital'&&x?.engine_id==='FACT-001'&&x?.environment==='LAB';
export function createNotionD1Adapters({query}={}){
 if(typeof query!=='function')throw Error('D1_SCOPED_QUERY_REQUIRED');
 async function run(sql,params){
  const results=await query(sql,params);
  if(!Array.isArray(results)||results.length>1)throw Error('D1_RESPONSE_DENIED');
  return results[0]??null;
 }
 return Object.freeze({
  ownership:{durable:true,async get(page_id){
   if(!uuid(page_id))return null;
   const row=await run('SELECT page_id,parent_id,company_id,environment,approved,synthetic FROM fact001_notion_owned_children_v1 WHERE page_id=?1',[page_id]);
   return row?{...row,approved:Number(row.approved)===1,synthetic:Number(row.synthetic)===1}:null;
  }},
  snapshots:{durable:true,async save({key,scope:context,record}){
   if(!hash(key)||!scope(context)||!uuid(record?.page_id)||record.parent_id!=='1c481b1a-756d-8002-813d-f3efdd4ecd89'||
      !title(record.title)||typeof record.in_trash!=='boolean'||typeof record.last_edited_time!=='string')throw Error('SNAPSHOT_SCOPE_DENIED');
   const ref='notion-lab:'+key;
   const inserted=await run(`INSERT INTO fact001_notion_snapshots_v1(snapshot_ref,key_hash,page_id,title_before,in_trash_before,revision_before)
      VALUES(?1,?2,?3,?4,?5,?6) ON CONFLICT(key_hash) DO NOTHING RETURNING snapshot_ref`,
      [ref,key,record.page_id,record.title,record.in_trash?1:0,record.last_edited_time]);
   if(!inserted?.snapshot_ref)throw Error('SNAPSHOT_ALREADY_EXISTS_RECONCILE');
   return {ref};
  },async get(ref){
   if(typeof ref!=='string'||!/^notion-lab:[0-9a-f]{64}$/.test(ref))throw Error('SNAPSHOT_REF_INVALID');
   return run('SELECT page_id,title_before,in_trash_before,revision_before FROM fact001_notion_snapshots_v1 WHERE snapshot_ref=?1',[ref]);
  }},
  audit:{durable:true,async append(event){
   if(!hash(event?.key)||!scope(event)||!uuid(event.page_id)||
     !['NOTION_MUTATION_PREPARED','NOTION_MUTATION_VERIFIED'].includes(event.event)||
     !['notion.lab.child.restore','notion.lab.child.trash','notion.lab.child.rename'].includes(event.operation)||
     event.snapshot_ref!=='notion-lab:'+event.key)throw Error('AUDIT_SCOPE_DENIED');
   const eventId=event.key+':'+event.event;
   const x=await run(`INSERT INTO fact001_notion_audit_v1
     (event_id,key_hash,event,company_id,engine_id,environment,operation,page_id,snapshot_ref)
     VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9) RETURNING event_id`,
     [eventId,event.key,event.event,event.company_id,event.engine_id,event.environment,event.operation,event.page_id,event.snapshot_ref]);
   if(x?.event_id!==eventId)throw Error('AUDIT_APPEND_UNVERIFIED');
  }}
 });
}
