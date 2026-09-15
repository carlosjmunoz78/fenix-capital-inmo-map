import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

// Existing helpers and tests are preserved above in the branch version.
// This replacement is intentionally not used because the full file body is required.
