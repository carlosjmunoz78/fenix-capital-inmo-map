import sqlite3, unittest
from pathlib import Path
SCHEMA=Path(__file__).resolve().parents[1].joinpath('schema.sql').read_text()
INDEX='205ca4905aafee82d1205c11b90685349b90e8c86062e4cca0dbb5edf4ca79ca'
FIRST_BATCH='50fc9fc1d7d6fd985dc58e238604fe534d3b536af9b86ccc77ad52fe2a1ea1c7'
FIRST_ZIP='e38acdbaea08a7e79ca7e74636fb2781b39b483db346f1bc3d6fa5509c7e2f65'
SCOPE=('fenix-capital','FACT-001','LAB','1.0.0',INDEX)
SEED='INSERT INTO fact001_notion_content_checkpoint_v1(company_id,engine_id,environment,engine_version,index_sha256,content_next_offset,cas_version,last_batch_ref,last_zip_sha256,last_drive_file_id) VALUES(?,?,?,?,?,25,1,?,?,?)'
CAS='UPDATE fact001_notion_content_checkpoint_v1 SET content_next_offset=?,cas_version=cas_version+1,last_batch_ref=?,last_zip_sha256=?,last_drive_file_id=?,updated_at=CURRENT_TIMESTAMP WHERE company_id=? AND engine_id=? AND environment=? AND engine_version=? AND index_sha256=? AND content_next_offset=? AND cas_version=? AND last_zip_sha256=? RETURNING content_next_offset,cas_version'
class CasTest(unittest.TestCase):
 def setUp(self):
  self.c=sqlite3.connect(':memory:')
  self.c.execute('CREATE TABLE legacy_sentinel(id INTEGER PRIMARY KEY, token TEXT)')
  self.c.execute("INSERT INTO legacy_sentinel VALUES(1,'UNCHANGED')")
  self.c.executescript(SCHEMA)
  self.c.execute(SEED,(*SCOPE,FIRST_BATCH,FIRST_ZIP,'1sGt2mXOLwK0AJCxfRNr8fY-dYVHjrR5p'))
 def row(self):return self.c.execute('SELECT content_next_offset,cas_version FROM fact001_notion_content_checkpoint_v1').fetchone()
 def advance(self,prev_offset=25,prev_ver=1,prev_sha=FIRST_ZIP,next_offset=50):
  return self.c.execute(CAS,(next_offset,'a'*64,'b'*64,'new-drive-abcdef',*SCOPE,prev_offset,prev_ver,prev_sha)).fetchone()
 def test_cas_single_winner_and_audit(self):
  self.assertEqual(self.advance(),(50,2));self.assertIsNone(self.advance());self.assertEqual(self.row(),(50,2));self.assertEqual(self.c.execute('SELECT count(*) FROM fact001_notion_content_checkpoint_audit_v1').fetchone()[0],1)
 def test_wrong_predecessor_denied(self):
  self.assertIsNone(self.advance(prev_offset=0));self.assertIsNone(self.advance(prev_ver=0));self.assertIsNone(self.advance(prev_sha='0'*64));self.assertEqual(self.row(),(25,1))
 def test_monotonic_checks(self):
  with self.assertRaises(sqlite3.IntegrityError):self.advance(next_offset=25)
  with self.assertRaises(sqlite3.IntegrityError):self.advance(next_offset=24)
  with self.assertRaises(sqlite3.IntegrityError):self.advance(next_offset=6633)
 def test_audit_append_only(self):
  self.advance()
  with self.assertRaises(sqlite3.IntegrityError):self.c.execute('DELETE FROM fact001_notion_content_checkpoint_audit_v1')
  with self.assertRaises(sqlite3.IntegrityError):self.c.execute("UPDATE fact001_notion_content_checkpoint_audit_v1 SET new_offset=40")
 def test_rollback_local_and_legacy_unchanged(self):
  self.c.commit();self.c.execute('BEGIN IMMEDIATE');self.advance();self.c.rollback();self.assertEqual(self.row(),(25,1));self.assertEqual(self.c.execute('SELECT token FROM legacy_sentinel').fetchone()[0],'UNCHANGED')
 def test_scope_and_insert_conflicts(self):
  with self.assertRaises(sqlite3.IntegrityError):self.c.execute(SEED,(*SCOPE,FIRST_BATCH,FIRST_ZIP,'same-drive-abcdef'))
  with self.assertRaises(sqlite3.IntegrityError):self.c.execute(SEED,('foreign-company','FACT-001','LAB','1.0.0',INDEX,FIRST_BATCH,FIRST_ZIP,'same-drive-abcdef'))
 def tearDown(self):self.c.close()
if __name__=='__main__':unittest.main()