import importlib.util, io, gzip, os, stat, tarfile, tempfile, unittest, zipfile
from pathlib import Path
module_path=Path(__file__).resolve().parents[1]/'runtime'/'seo-hostinger-private-backup-preflight-v0.py'
spec=importlib.util.spec_from_file_location('cerebro_hostinger_preflight',module_path)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
FIXTURE={
 'public_html/wp-config.php':b'<?php // synthetic, no passwords ?>',
 'public_html/wp-admin/index.php':b'<?php',
 'public_html/wp-includes/version.php':b'<?php',
 'public_html/wp-content/plugins/test/plugin.php':b'<?php',
 'public_html/wp-content/uploads/test.webp':b'RIFF HEADER WEBP',
}
SQL=('-- Synthetic SQL, never customer data\n'+'\n'.join(
 f'CREATE TABLE wp_{name} (id INT);' for name in mod.CORE)).encode()*3
class TestOfflinePreflight(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory()
  self.root=Path(self.tmp.name)/'private';self.root.mkdir(mode=0o700)
  self.previous={x:os.environ.pop(x,None) for x in ('CI','GITHUB_ACTIONS','CEREBRO_PRIVATE_BACKUP_ROOT')}
  os.environ['CEREBRO_PRIVATE_BACKUP_ROOT']=str(self.root)
  self.db=self.root/'database.sql.gz'
  with gzip.open(self.db,'wb') as s:s.write(SQL)
  self.archive=self.root/'website.tar.gz'
  with tarfile.open(self.archive,'w:gz') as t:
   for name,body in FIXTURE.items():
    x=tarfile.TarInfo(name);x.size=len(body);t.addfile(x,io.BytesIO(body))
 def tearDown(self):
  for key in self.previous:os.environ.pop(key,None)
  for key,value in self.previous.items():
   if value is not None:os.environ[key]=value
  self.tmp.cleanup()
 def evaluate(self,files=None,db=None,report='result'):
  return mod.inspect(str(files or self.archive),str(db or self.db),str(self.root/report))
 def test_real_tar_streaming_and_sql_core_shapes(self):
  result=self.evaluate()
  self.assertEqual(result['files']['files'],5)
  self.assertEqual(result['database']['core_tables_observed'],10)
  self.assertEqual(result['status'],'STRUCTURAL_ARCHIVE_AND_SQL_PREFLIGHT_PASS_RESTORE_HOLD')
  self.assertFalse(result['site_restore_executed'])
  self.assertFalse(result['publish_authorized'])
  self.assertEqual(stat.S_IMODE((self.root/'result'/'preflight.json').stat().st_mode),0o600)
 def test_reject_tar_gzip_corrupt_crc_even_when_tar_headers_are_valid(self):
  # GNU tar streaming iteration can stop at the end-of-archive markers and
  # accept a gzip stream whose CRC trailer is corrupt. This is a physical
  # integrity rejection test, not a real Hostinger snapshot or restore.
  p=self.root/'corrupt-crc.tar.gz'
  tampered=bytearray(self.archive.read_bytes())
  tampered[-8]^=1
  p.write_bytes(tampered)
  with self.assertRaisesRegex(mod.UnsafeBackup,'TAR_INVALID'):
   self.evaluate(files=p)
 def test_zip_archive_full_crc_read_without_unpacking(self):
  p=self.root/'website.zip'
  with zipfile.ZipFile(p,'w') as z:
   for name,body in FIXTURE.items():z.writestr(name,body)
  self.assertEqual(self.evaluate(files=p)['files']['format'],'zip')
 def test_reject_duplicate_file_member_in_tar(self):
  p=self.root/'duplicate.tar.gz'
  with tarfile.open(p,'w:gz') as tar:
   for name,body in list(FIXTURE.items())+[('public_html/wp-content/uploads/test.webp',b'different')]:
    x=tarfile.TarInfo(name);x.size=len(body);tar.addfile(x,io.BytesIO(body))
  with self.assertRaisesRegex(mod.UnsafeBackup,'ARCHIVE_DUPLICATE_FILE_PATH'):self.evaluate(files=p)
 def test_reject_duplicate_file_member_in_zip(self):
  p=self.root/'duplicate.zip'
  import warnings
  with warnings.catch_warnings():
   warnings.simplefilter('ignore',UserWarning)
   with zipfile.ZipFile(p,'w') as z:
    for name,body in list(FIXTURE.items())+[('public_html/wp-content/uploads/test.webp',b'different')]:
     z.writestr(name,body)
  with self.assertRaisesRegex(mod.UnsafeBackup,'ARCHIVE_DUPLICATE_FILE_PATH'):self.evaluate(files=p)
 def test_reject_file_directory_conflict_in_tar(self):
  p=self.root/'file-dir-conflict.tar.gz'
  with tarfile.open(p,'w:gz') as archive:
   for name,body in FIXTURE.items():
    x=tarfile.TarInfo(name);x.size=len(body);archive.addfile(x,io.BytesIO(body))
   x=tarfile.TarInfo('public_html/wp-content/uploads/test.webp/child')
   x.size=6;archive.addfile(x,io.BytesIO(b'unsafe'))
  with self.assertRaisesRegex(mod.UnsafeBackup,'ARCHIVE_FILE_DIRECTORY_CONFLICT'):
   self.evaluate(files=p)
 def test_reject_directory_file_conflict_in_zip(self):
  p=self.root/'dir-file-conflict.zip'
  with zipfile.ZipFile(p,'w') as archive:
   for name,body in FIXTURE.items():archive.writestr(name,body)
   archive.writestr('public_html/wp-content/uploads/',b'')
   archive.writestr('public_html/wp-content/uploads/test.webp/',b'')
  with self.assertRaisesRegex(mod.UnsafeBackup,'ARCHIVE_FILE_DIRECTORY_CONFLICT'):
   self.evaluate(files=p)
 def test_reject_parent_traversal_in_tar(self):
  p=self.root/'unsafe.tar.gz'
  with tarfile.open(p,'w:gz') as t:
   for name,body in {**FIXTURE,'../outside.txt':b'danger'}.items():
    x=tarfile.TarInfo(name);x.size=len(body);t.addfile(x,io.BytesIO(body))
  with self.assertRaisesRegex(mod.UnsafeBackup,'ARCHIVE_UNSAFE_MEMBER'):self.evaluate(files=p)
 def test_reject_missing_wp_config(self):
  p=self.root/'missing.tar.gz'
  with tarfile.open(p,'w:gz') as t:
   for name,body in FIXTURE.items():
    if name.endswith('wp-config.php'):continue
    x=tarfile.TarInfo(name);x.size=len(body);t.addfile(x,io.BytesIO(body))
  with self.assertRaisesRegex(mod.UnsafeBackup,'WP_ROOT_MISSING_OR_AMBIGUOUS'):self.evaluate(files=p)
 def test_reject_comment_only_sql_masquerading_as_schema(self):
  p=self.root/'comment-only.sql'
  p.write_bytes(b'-- '+b'\n-- '.join(f'CREATE TABLE wp_{name} (id INT);'.encode() for name in mod.CORE))
  with self.assertRaisesRegex(mod.UnsafeBackup,'WP_CORE_TABLE_SET_INCOMPLETE'):
   self.evaluate(db=p)
 def test_reject_multiline_block_comments_masquerading_as_schema(self):
  p=self.root/'comment-block.sql'
  p.write_bytes(b'/* SQL backup with no actual tables\n'+b'\n'.join(
   f'CREATE TABLE wp_{name} (id INT);'.encode() for name in mod.CORE)+b'\n*/')
  with self.assertRaisesRegex(mod.UnsafeBackup,'WP_CORE_TABLE_SET_INCOMPLETE'):
   self.evaluate(db=p)
 def test_accept_authentic_ddl_with_comments_and_mysql_backticks(self):
  p=self.root/'schema.sql.gz'
  data=b'-- MySQL dump\n/* comment\n CREATE TABLE wp_fake (id INT);\n*/\n'
  data+=b'\n'.join(f'CREATE TABLE IF NOT EXISTS {chr(96)}wp_{name}{chr(96)} (id INT);'.encode() for name in mod.CORE)
  with gzip.open(p,'wb') as stream: stream.write(data)
  self.assertEqual(self.evaluate(db=p)['database']['core_tables_observed'],10)
 def test_reject_incomplete_wordpress_sql(self):
  p=self.root/'incomplete.sql.gz'
  with gzip.open(p,'wb') as s:s.write(b'CREATE TABLE wp_posts (id INT);'*50)
  with self.assertRaisesRegex(mod.UnsafeBackup,'WP_CORE_TABLE_SET_INCOMPLETE'):self.evaluate(db=p)
 def test_refuse_real_backup_path_in_github_actions(self):
  os.environ['GITHUB_ACTIONS']='true'
  with self.assertRaisesRegex(mod.UnsafeBackup,'CI_FORBIDDEN'):self.evaluate()
 def test_block_relative_or_nonprivate_paths(self):
  with self.assertRaisesRegex(mod.UnsafeBackup,'PRIVATE_ABSOLUTE_SOURCE_REQUIRED'):
   mod.inspect('website.tar.gz',str(self.db),str(self.root/'result'))
  self.root.chmod(0o755)
  with self.assertRaisesRegex(mod.UnsafeBackup,'PRIVATE_ROOT_NOT_RESTRICTED'):self.evaluate()
 def test_never_overwrite_existing_report(self):
  self.evaluate()
  with self.assertRaisesRegex(mod.UnsafeBackup,'UNSAFE_REPORT_PATH'):self.evaluate()
if __name__=='__main__':unittest.main()
