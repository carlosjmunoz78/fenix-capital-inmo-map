#!/usr/bin/env python3
"""Offline structural preflight of owner-supplied Hostinger WordPress files+SQL.
NO extraction, SQL execution, network, raw backup uploading, or publication.
Run only inside an encrypted, private workspace with restrictive permissions.
"""
import argparse, gzip, hashlib, json, os, re, stat, sys, tarfile, zipfile
from pathlib import Path, PurePosixPath

MAX_FILES, MAX_BYTES, MAX_SQL = 250000, 20*1024**3, 8*1024**3
CORE = frozenset(('posts','postmeta','options','users','usermeta',
                  'terms','term_taxonomy','term_relationships','comments','commentmeta'))
TABLE = re.compile(rb'^[ \t]*CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[\x60\"]?([A-Za-z0-9_]{2,128})[\x60\"]?\s*\(',re.I)

class UnsafeBackup(ValueError): pass

def fail(code): raise UnsafeBackup('SEO_PRIVATE_BACKUP_'+code)

def digest(file):
    h=hashlib.sha256()
    with file.open('rb') as stream:
        for chunk in iter(lambda:stream.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()

def private_root():
    if os.environ.get('CI','').lower()=='true' or os.environ.get('GITHUB_ACTIONS','').lower()=='true':
        fail('CI_FORBIDDEN')
    root_env=os.environ.get('CEREBRO_PRIVATE_BACKUP_ROOT','')
    if not root_env or not Path(root_env).is_absolute() or Path(root_env).is_symlink():
        fail('PRIVATE_ROOT_REQUIRED')
    root=Path(root_env).resolve(strict=True)
    if not root.is_dir() or stat.S_IMODE(root.stat().st_mode)&0o077:
        fail('PRIVATE_ROOT_NOT_RESTRICTED')
    return root

def source_file(root,file):
    source=Path(file)
    if not source.is_absolute() or source.is_symlink(): fail('PRIVATE_ABSOLUTE_SOURCE_REQUIRED')
    p=source.resolve(strict=True)
    if not p.is_relative_to(root) or not p.is_file() or p.stat().st_size<64:
        fail('PRIVATE_FILE_INVALID')
    return p

def safe_entry(name,length,typ,packed):
    if not isinstance(name,str) or any(c in name for c in ('\\',':','\0')):
        fail('ARCHIVE_UNSAFE_NAME')
    part=PurePosixPath(name)
    if part.is_absolute() or '..' in part.parts or typ not in ('file','dir'):
        fail('ARCHIVE_UNSAFE_MEMBER')
    if length<0 or length>4*1024**3: fail('ARCHIVE_MEMBER_TOO_LARGE')
    if packed is not None and length>2_000_000 and packed*2000<length:
        fail('ARCHIVE_SUSPICIOUS_RATIO')
    return part.parts

def file_inventory(rows):
    roots,n,total={},0,0
    seen_files,seen_dirs=set(),set()
    for name,length,typ,packed in rows:
        parts=safe_entry(name,length,typ,packed)
        if not parts: fail('ARCHIVE_UNSAFE_MEMBER')
        # Never accept an archive where a path is both a file and a directory,
        # or where a file is an ancestor of another entry. Extraction behavior differs.
        if parts in seen_files and typ=='dir':
            fail('ARCHIVE_FILE_DIRECTORY_CONFLICT')
        if parts in seen_dirs and typ=='file':
            fail('ARCHIVE_FILE_DIRECTORY_CONFLICT')
        if any(parts[:i] in seen_files for i in range(1,len(parts))):
            fail('ARCHIVE_FILE_DIRECTORY_CONFLICT')
        if typ=='dir':
            seen_dirs.add(parts)
            continue
        # Check canonical logical paths, not raw spelling.
        if parts in seen_files: fail('ARCHIVE_DUPLICATE_FILE_PATH')
        seen_files.add(parts)
        for i in range(1,len(parts)): seen_dirs.add(parts[:i])
        n,total=n+1,total+length
        if n>MAX_FILES or total>MAX_BYTES: fail('ARCHIVE_TOTAL_LIMIT')
        for marker in ('wp-admin','wp-content','wp-includes'):
            if marker in parts and parts.index(marker)+1<len(parts):
                base=parts[:parts.index(marker)]
                roots.setdefault(base,set()).add(marker)
        if parts[-1]=='wp-config.php':
            roots.setdefault(parts[:-1],set()).add('wp-config.php')
        if len(parts)>1 and parts[-2:]==('wp-admin','index.php'):
            roots.setdefault(parts[:-2],set()).add('admin-index')
    required={'wp-admin','wp-content','wp-includes','wp-config.php','admin-index'}
    if sum(flags.issuperset(required) for flags in roots.values())!=1:
        fail('WP_ROOT_MISSING_OR_AMBIGUOUS')
    return {'files':n,'uncompressed_bytes_declared':total,'wordpress_files_shape':True}

def examine_files(p):
    name=p.name.lower()
    if name.endswith(('.tar.gz','.tgz')):
        try:
            # tarfile's gzip streaming adapter may stop at TAR's end markers
            # before checking the GZIP CRC/ISIZE trailer. Drain through the
            # stdlib gzip reader to verify physical compressed-stream integrity.
            with gzip.open(p,'rb') as stream:
                with tarfile.open(fileobj=stream,mode='r|') as tar:
                    def entries():
                        for x in tar:
                            typ='file' if x.isfile() else 'dir' if x.isdir() else 'unsafe'
                            yield x.name,x.size,typ,None
                    report=file_inventory(entries())
                # Prevent a valid TAR with an enormous appended GZIP payload
                # from bypassing the archive's declared expansion limits.
                limit=MAX_BYTES+MAX_FILES*4096+128*1024**2
                while stream.read(1024*1024):
                    if stream.tell()>limit: fail('ARCHIVE_TRAILING_EXPANSION')
        except (tarfile.TarError,OSError,EOFError): fail('TAR_INVALID')
        fmt='tar.gz'
    elif name.endswith('.zip'):
        try:
            with zipfile.ZipFile(p) as z:
                entries=z.infolist()
                if len(entries)>MAX_FILES: fail('ARCHIVE_TOTAL_LIMIT')
                def items():
                    for x in entries:
                        mode=(x.external_attr>>16)&0xffff
                        typ='unsafe' if mode and stat.S_ISLNK(mode) else 'dir' if x.is_dir() else 'file'
                        yield x.filename,x.file_size,typ,x.compress_size
                report=file_inventory(items())
                for x in entries:
                    if not x.is_dir():
                        with z.open(x) as stream:
                            while stream.read(1024*1024): pass
        except (zipfile.BadZipFile,OSError,EOFError,RuntimeError): fail('ZIP_INVALID')
        fmt='zip'
    else: fail('UNSUPPORTED_FILES_FORMAT')
    return dict(report,format=fmt,archive_bytes=p.stat().st_size,archive_sha256=digest(p))

def uncomment_sql_line(line, in_block):
    """Remove SQL comments before matching schema DDL (not a SQL parser)."""
    out, i = [], 0
    while i < len(line):
        if in_block:
            end = line.find(b'*/', i)
            if end < 0: return b''.join(out), True
            i, in_block = end + 2, False
            continue
        block = line.find(b'/*', i)
        hashmark = line.find(b'#', i)
        dash = line.find(b'--', i)
        # MySQL '--' only starts a comment when followed by whitespace/control.
        while dash >= 0 and dash + 2 < len(line) and line[dash+2] not in b' \t\r\n\v\f':
            dash = line.find(b'--', dash + 2)
        candidates = [(j, kind) for j, kind in ((block, 'block'), (hashmark, 'line'), (dash, 'line')) if j >= 0]
        if not candidates:
            out.append(line[i:]); break
        pos, kind = min(candidates)
        out.append(line[i:pos])
        if kind == 'line': break
        out.append(b' ')  # A block comment separates SQL tokens.
        i, in_block = pos + 2, True
    return b''.join(out), in_block

def examine_sql(p):
    if not p.name.lower().endswith(('.sql','.sql.gz')): fail('UNSUPPORTED_DATABASE_FORMAT')
    opener=gzip.open if p.name.lower().endswith('.gz') else open
    groups, carry, size, in_block = {}, b'', 0, False
    def check(line):
        nonlocal in_block
        clean, in_block = uncomment_sql_line(line, in_block)
        matched = TABLE.match(clean)
        if matched:
            table=matched.group(1).decode('ascii').lower()
            for core in CORE:
                if table.endswith('_'+core) and len(table)>len(core)+1:
                    groups.setdefault(table[:-len(core)],set()).add(core)
    try:
        with opener(p,'rb') as stream:
            for chunk in iter(lambda:stream.read(1024*1024),b''):
                size+=len(chunk)
                if size>MAX_SQL: fail('SQL_TOO_LARGE')
                lines=(carry+chunk).split(b'\n')
                carry=lines.pop()
                if len(carry)>128*1024**2: fail('SQL_LINE_TOO_LARGE')
                for line in lines: check(line)
            if carry: check(carry)
    except (OSError,EOFError,gzip.BadGzipFile): fail('SQL_ARCHIVE_INVALID')
    if in_block: fail('SQL_UNCLOSED_BLOCK_COMMENT')
    if sum(found==CORE for found in groups.values())!=1:
        fail('WP_CORE_TABLE_SET_INCOMPLETE_OR_AMBIGUOUS')
    return {'core_tables_observed':len(CORE),'uncompressed_bytes':size,
            'archive_bytes':p.stat().st_size,'archive_sha256':digest(p),
            'database_restore_executed':False,'table_prefix_not_logged':True}

def inspect(files_path,database_path,output):
    root=private_root()
    files,sql=source_file(root,files_path),source_file(root,database_path)
    if files==sql: fail('SAME_FILE_FOR_BOTH_BACKUPS')
    out=Path(output)
    if not out.is_absolute() or out.is_symlink() or out.exists() or not out.parent.resolve(strict=True).is_relative_to(root):
        fail('UNSAFE_REPORT_PATH')
    report={'schema_version':'1.0.0','company_id':'fenix','engine_id':'SEO-001',
            'environment':'PRIVATE_BACKUP_PREFLIGHT',
            'status':'STRUCTURAL_ARCHIVE_AND_SQL_PREFLIGHT_PASS_RESTORE_HOLD',
            'files':examine_files(files),'database':examine_sql(sql),
            'owner_supplied_backup_not_authenticity_attested':True,
            'database_schema_runtime_not_verified':True,
            'site_restore_executed':False,'private_restore_signed':False,
            'wordpress_prod_modified':False,'publish_authorized':False}
    out.mkdir(mode=0o700)
    fd=os.open(out/'preflight.json',os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    with os.fdopen(fd,'w',encoding='utf-8') as f:
        json.dump(report,f,indent=2)
        f.write('\n')
    return report

def main():
    cli=argparse.ArgumentParser(description='Private WordPress backup validation; NO restore')
    cli.add_argument('--files',required=True)
    cli.add_argument('--database',required=True)
    cli.add_argument('--out',required=True)
    a=cli.parse_args()
    try:
        result=inspect(a.files,a.database,a.out)
        print(json.dumps({'status':result['status'],'prod_writes':0,'site_restore_executed':False}))
        return 0
    except (UnsafeBackup,FileNotFoundError,PermissionError) as e:
        print(str(e) if isinstance(e,UnsafeBackup) else 'SEO_PRIVATE_BACKUP_IO_DENIED',file=sys.stderr)
        return 2

if __name__=='__main__': raise SystemExit(main())
