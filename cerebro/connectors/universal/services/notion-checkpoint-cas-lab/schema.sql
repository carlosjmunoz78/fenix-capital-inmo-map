-- FACT-001 Notion only · ADDITIVE LAB CANDIDATE, NOT APPLIED TO CLOUDFLARE.
-- company_id, engine_id, environment, version are explicit multiempresa scope.
-- After physical offsite backup, apply only with compare-old-vs-new and rollback gates.
CREATE TABLE IF NOT EXISTS fact001_notion_content_checkpoint_v1 (
 company_id TEXT NOT NULL,
 engine_id TEXT NOT NULL,
 environment TEXT NOT NULL,
 engine_version TEXT NOT NULL,
 index_sha256 TEXT NOT NULL,
 content_next_offset INTEGER NOT NULL CHECK (content_next_offset BETWEEN 0 AND 6632),
 cas_version INTEGER NOT NULL CHECK (cas_version >= 1),
 last_batch_ref TEXT NOT NULL,
 last_zip_sha256 TEXT NOT NULL,
 last_drive_file_id TEXT NOT NULL,
 updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
 PRIMARY KEY(company_id,engine_id,environment,engine_version,index_sha256),
 CHECK (company_id='fenix-capital' AND engine_id='FACT-001' AND environment='LAB' AND engine_version='1.0.0'),
 CHECK (length(index_sha256)=64 AND length(last_batch_ref)=64 AND length(last_zip_sha256)=64),
 CHECK (length(last_drive_file_id) BETWEEN 12 AND 128)
);
CREATE TABLE IF NOT EXISTS fact001_notion_content_checkpoint_audit_v1 (
 seq INTEGER PRIMARY KEY AUTOINCREMENT,
 company_id TEXT NOT NULL,
 engine_id TEXT NOT NULL,
 environment TEXT NOT NULL,
 index_sha256 TEXT NOT NULL,
 old_offset INTEGER NOT NULL,
 new_offset INTEGER NOT NULL,
 old_version INTEGER NOT NULL,
 new_version INTEGER NOT NULL,
 batch_ref TEXT NOT NULL,
 zip_sha256 TEXT NOT NULL,
 drive_file_id TEXT NOT NULL,
 ts TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE TRIGGER IF NOT EXISTS fact001_notion_content_checkpoint_validate_v1
BEFORE UPDATE ON fact001_notion_content_checkpoint_v1
BEGIN
 SELECT CASE WHEN NEW.content_next_offset<=OLD.content_next_offset OR NEW.cas_version!=OLD.cas_version+1 THEN RAISE(ABORT,'FACT001_CAS_MONOTONICITY_DENIED') END;
END;
CREATE TRIGGER IF NOT EXISTS fact001_notion_content_checkpoint_audit_insert_v1
AFTER UPDATE ON fact001_notion_content_checkpoint_v1
BEGIN
 INSERT INTO fact001_notion_content_checkpoint_audit_v1(company_id,engine_id,environment,index_sha256,old_offset,new_offset,old_version,new_version,batch_ref,zip_sha256,drive_file_id)
 VALUES(OLD.company_id,OLD.engine_id,OLD.environment,OLD.index_sha256,OLD.content_next_offset,NEW.content_next_offset,OLD.cas_version,NEW.cas_version,NEW.last_batch_ref,NEW.last_zip_sha256,NEW.last_drive_file_id);
END;
CREATE TRIGGER IF NOT EXISTS fact001_notion_content_checkpoint_audit_no_delete_v1
BEFORE DELETE ON fact001_notion_content_checkpoint_audit_v1
BEGIN SELECT RAISE(ABORT,'FACT001_AUDIT_APPEND_ONLY'); END;
CREATE TRIGGER IF NOT EXISTS fact001_notion_content_checkpoint_audit_no_update_v1
BEFORE UPDATE ON fact001_notion_content_checkpoint_audit_v1
BEGIN SELECT RAISE(ABORT,'FACT001_AUDIT_APPEND_ONLY'); END;