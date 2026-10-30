import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(MODULE_DIR, '../data');
const TARGET = path.join(DATA_DIR, 'neuronal-superparallel-v1.json.gz.b64');
const EXPECTED_LENGTH = 19868;
const EXPECTED_SHA256 = 'cae799ed67c9f2e3bad4e9fe640667acaf38a0ad3b2212ddc4d46c90157c3933';

const parts = Array.from({ length: 8 }, (_, index) =>
  path.join(DATA_DIR, `neuronal-superparallel-v1.part${String(index + 1).padStart(2, '0')}.b64`));

const encoded = parts.map(file => fs.readFileSync(file, 'utf8').trim()).join('');
if (encoded.length !== EXPECTED_LENGTH) throw new Error(`NEURONAL_SOURCE_LENGTH_MISMATCH:${encoded.length}`);
const digest = createHash('sha256').update(encoded).digest('hex');
if (digest !== EXPECTED_SHA256) throw new Error(`NEURONAL_SOURCE_SHA256_MISMATCH:${digest}`);
fs.writeFileSync(TARGET, `${encoded}\n`, 'utf8');
console.log(JSON.stringify({ok:true,target:TARGET,parts:parts.length,length:encoded.length,sha256:digest}));
