// FACT-001 OFFSITE TRANSPORT TEST ONLY: synthetic SQLite, PUBLIC test key, NOT a real backup.
// GitHub → encrypted ZIP artifact → private Drive → independent restore. No credentials/provider calls.
import {execFileSync} from 'node:child_process';
import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';

const PYMAKE=String.raw\`import sqlite3,sys
db=sqlite3.connect(':memory:')
db.executescript("CREATE TABLE fake_queue(id INTEGER PRIMARY KEY, state TEXT); INSERT INTO fake_queue VALUES (1,'COMPLETED'); INSERT INTO fake_queue VALUES (2,'PENDING'); CREATE TABLE fake_audit(id INTEGER PRIMARY KEY, event TEXT); INSERT INTO fake_audit VALUES (1,'TEST_ONLY');")
sys.stdout.write('\\n'.join(db.iterdump())+'\\n')
\`;
const PYRESTORE=String.raw\`import sqlite3,sys
payload=sys.stdin.read()
db=sqlite3.connect(':memory:')
db.executescript(payload)
assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
assert db.execute('SELECT COUNT(*) FROM fake_queue').fetchone()[0]==2
assert db.execute('SELECT COUNT(*) FROM fake_audit').fetchone()[0]==1
assert db.execute("SELECT state FROM fake_queue WHERE id=1").fetchone()[0]=='COMPLETED'
print('SYNTHETIC_SQLITE_RESTORE_PASS')
\`;
const sql=execFileSync('python3',['-c',PYMAKE],{encoding:'utf8',timeout:10000,maxBuffer:200000});
if(!sql.includes('fake_queue')||!sql.includes('fake_audit')||sql.length>100000)throw Error('FIXTURE_INVALID');
const plain=Buffer.from(sql,'utf8');
const hash=v=>createHash('sha256').update(v).digest('hex');
// Public, TEST-ONLY key embedded in test script. Never reuse for real data or represent it as escrow.
const TEST_KEY=Buffer.alloc(32,0x53),iv=randomBytes(12);
const FORMAT='FACT001-D1-SYNTHETIC-DRIVE-TRANSPORT-ONLY';
const aad=Buffer.from(FORMAT+':fixture-only:LAB','utf8');
const encrypt=createCipheriv('aes-256-gcm',TEST_KEY,iv);encrypt.setAAD(aad);
const ciphertext=Buffer.concat([encrypt.update(plain),encrypt.final()]),tag=encrypt.getAuthTag();
const envelope={
 format:FORMAT,fixture_only:true,real_provider_data:false,key_class:'PUBLIC_TEST_KEY_NOT_FOR_RECOVERY',
 company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',
 algorithm:'AES-256-GCM',iv_b64:iv.toString('base64'),tag_b64:tag.toString('base64'),
 ciphertext_b64:ciphertext.toString('base64'),plaintext_sha256:hash(plain),plaintext_bytes:plain.length,
 ciphertext_sha256:hash(ciphertext),source:'SYNTHETIC_IN_MEMORY_SQLITE',provider_reads:0,provider_writes:0
};
const decrypt=createDecipheriv('aes-256-gcm',TEST_KEY,iv);decrypt.setAAD(aad);decrypt.setAuthTag(tag);
const restored=Buffer.concat([decrypt.update(ciphertext),decrypt.final()]);
if(hash(restored)!==envelope.plaintext_sha256)throw Error('CRYPTO_ROUNDTRIP_FAILED');
const p=execFileSync('python3',['-c',PYRESTORE],{input:restored,encoding:'utf8',timeout:10000,maxBuffer:20000});
if(!p.includes('SYNTHETIC_SQLITE_RESTORE_PASS'))throw Error('SQLITE_RESTORE_DENIED');
const folder='fact001-d1-offsite-synthetic-transport-lab';
mkdirSync(folder,{recursive:true});
const envelopeBytes=Buffer.from(JSON.stringify(envelope)+'\n');
writeFileSync(folder+'/synthetic-fixture.aes256gcm.json',envelopeBytes,{flag:'wx',mode:0o600});
const proof={status:'SYNTHETIC_ONLY_LOCAL_RESTORE_PASS',format:FORMAT,
 artifact_sha256:hash(envelopeBytes),artifact_bytes:envelopeBytes.length,
 synthetic_tables:2,synthetic_rows:3,provider_reads:0,provider_writes:0,
 external_cloudflare_d1_export:false,private_drive_copy:false,private_drive_readback:false,
 independent_restoration_from_drive:false,real_backup:false,
 escrow_real_key:false,backup_and_rollback:'PENDING'};
writeFileSync(folder+'/synthetic-proof.json',JSON.stringify(proof,null,2)+'\n',{flag:'wx'});
console.log('FACT001_D1_SYNTHETIC_SQLITE_RESTORE=PASS');
console.log('FACT001_D1_SYNTHETIC_ENCRYPTED_FILE_SHA256='+proof.artifact_sha256);
console.log('FACT001_D1_SYNTHETIC_ARTIFACT_BYTES='+proof.artifact_bytes);
console.log('FACT001_D1_PROVIDER_READS=0');
console.log('FACT001_D1_REAL_BACKUP=false');
