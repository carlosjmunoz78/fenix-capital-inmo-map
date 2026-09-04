#!/usr/bin/env node

/**
 * Read-only physical QA fixture downloader.
 *
 * Uses the existing NOTION_TOKEN to refresh temporary attachment URLs from
 * audited legacy expediente pages, then downloads only the small allowlist of
 * PDFs needed by the private physical document gate. Files stay on the runner
 * and are never committed or uploaded as artifacts.
 */

import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const NOTION_VERSION='2026-03-11';
const FILES_PROPERTY='📎 Documentación adjunta';
const token=process.env.NOTION_TOKEN;
const outputDir=process.env.REAL_PRIVATE_DOC_DIR||'/tmp/fenix-private-docs';
if(!token)throw new Error('NOTION_TOKEN is required for the private physical QA gate');

const targets=[
 {page:'38381b1a756d80f5b7b0ddcaefe64061',name:'NOTA SIMPLE CRISTINA.pdf',out:'nota-simple-cristina.pdf'},
 {page:'38381b1a756d802a82a0de029f42a854',name:'NOTA SIMPLE CALLE PALOMAR.pdf',out:'nota-simple-palomar.pdf'},
 {page:'37581b1a756d81d2ac17da857349f56f',name:'NOTA_SIMPLE.pdf',out:'nota-simple-roncero.pdf'},
 {page:'37581b1a756d81d2ac17da857349f56f',name:'RECIBO_PRESTAMO__PERSONAL_1.pdf',out:'prestamo-personal.pdf'},
 {page:'37581b1a756d8186ae20e107323996f3',name:'CERTIFICADO_DEUDA_PENDIENTE.pdf',out:'certificado-deuda.pdf'},
 {page:'37581b1a756d81d2ac17da857349f56f',name:'DNI_MARI_Y_FRANCISCO.pdf',out:'dni-mari-francisco.pdf'},
 {page:'37581b1a756d81d78520eb8d7d615ced',name:'Nmina_NCS_11579_Ene_2026.pdf',out:'nomina-real.pdf'},
 {page:'37581b1a756d81c38996db1eca19cb93',name:'23.-Vida_Laboral.pdf',out:'vida-laboral-real.pdf'},
];

const cache=new Map();
async function notionPage(id){
 if(cache.has(id))return cache.get(id);
 const r=await fetch(`https://api.notion.com/v1/pages/${id}`,{headers:{Authorization:`Bearer ${token}`,'Notion-Version':NOTION_VERSION,Accept:'application/json'}});
 if(!r.ok)throw new Error(`Notion page read failed (${r.status})`);
 const page=await r.json();cache.set(id,page);return page;
}

function findFile(page,name){
 const prop=page?.properties?.[FILES_PROPERTY];
 if(!prop||prop.type!=='files')throw new Error('Audited legacy files property is unavailable');
 const wanted=(prop.files||[]).find(f=>String(f?.name||'').trim().toLocaleLowerCase('es')===name.toLocaleLowerCase('es'));
 if(!wanted)throw new Error(`Required private QA attachment not found: ${name}`);
 if(wanted.type==='file'&&wanted.file?.url)return wanted.file.url;
 if(wanted.type==='external'&&wanted.external?.url)return wanted.external.url;
 throw new Error(`Required private QA attachment has no readable URL: ${name}`);
}

await mkdir(outputDir,{recursive:true});
for(const target of targets){
 const page=await notionPage(target.page);
 const url=findFile(page,target.name);
 const r=await fetch(url,{redirect:'follow'});
 if(!r.ok)throw new Error(`Private QA attachment download failed (${r.status}): ${target.name}`);
 const bytes=new Uint8Array(await r.arrayBuffer());
 if(bytes.length<1000)throw new Error(`Private QA attachment is unexpectedly small: ${target.name}`);
 const signature=String.fromCharCode(...bytes.slice(0,5));
 if(signature!=='%PDF-')throw new Error(`Private QA attachment is not a PDF: ${target.name}`);
 await writeFile(join(outputDir,target.out),bytes);
 console.log(`PRIVATE_PHYSICAL_FIXTURE_READY=${target.out} bytes=${bytes.length}`);
}
console.log(`PRIVATE_PHYSICAL_FIXTURES=PASS count=${targets.length}`);
