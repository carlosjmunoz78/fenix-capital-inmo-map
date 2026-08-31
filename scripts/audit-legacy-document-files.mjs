#!/usr/bin/env node

/**
 * Read-only extractor for legacy Notion file metadata.
 *
 * Purpose:
 * - Retrieve the 31 audited legacy expediente pages that contain 118 files.
 * - Resolve current temporary signed download URLs, original filenames and sizes/content-types when exposed.
 * - Produce a JSON manifest for a later controlled migration.
 *
 * Safety:
 * - GET requests only.
 * - No page/database mutation endpoints.
 * - No file upload endpoints.
 * - No download of binary bodies; this script inventories metadata only.
 */

import { writeFile } from 'node:fs/promises';

const NOTION_VERSION = '2026-03-11';
const LEGACY_FILES_PROPERTY = '📎 Documentación adjunta';

const audited = [
  ['37581b1a756d8101842afbd4d873b08c', 'JESUS EGEA Y SARA', 2],
  ['37581b1a756d8108bcabc11edeeb48fc', 'GABRIELA LUCICA IORGA', 9],
  ['37581b1a756d810aa24ad23507969817', 'CARMELO', 2],
  ['37581b1a756d811db7e3cc28c129de43', 'ISABEL', 10],
  ['37581b1a756d81278599ee7b8dc11454', 'PACO Y TAMARA', 1],
  ['37581b1a756d8132af35e28220976474', 'MARCOS', 2],
  ['37581b1a756d8140b71bc9ce9b1d4f96', 'FRANCISCA DURAN TABARES', 2],
  ['37581b1a756d814f8bc0facf0bfdc14f', 'JORGE Y ALEX', 2],
  ['37581b1a756d8152afabe290d9da5ff4', 'FRANCISCO VALDERRAMA Y GEMA LLAMAS', 1],
  ['37581b1a756d815ba6e5dc7f1b11c3d6', 'ROSELIS Y RODERICK', 1],
  ['37581b1a756d8163a6bfd82f292fe9d3', 'JONATAN, MACARENA Y JOSE ANTONIO', 2],
  ['37581b1a756d8164b31bdb7c5ee1ab09', 'YESICA Y RUBEN', 6],
  ['37581b1a756d8165a236cb177492b0de', 'FRANCISCO Y ESTHER', 1],
  ['37581b1a756d8167ac62ce8d0de3878c', 'JAVIER', 1],
  ['37581b1a756d8167b353c5aa214f60f2', 'ANA LUQUE ROMERO MESA', 2],
  ['37581b1a756d816ba93df930212e7938', 'SERGIO GAITAN Y GEMA VELASCO', 2],
  ['37581b1a756d817babaaf9633cae00a9', 'KARLA', 2],
  ['37581b1a756d8186ae20e107323996f3', 'MARIA BENILDE GOMEZ DE ARANDA PEREA', 1],
  ['37581b1a756d81a1a31bf012adee3e8b', 'JAVIER VILLA GUZMAN', 2],
  ['37581b1a756d81c38996db1eca19cb93', 'JAVIER NAVARRO (MAÑO)', 8],
  ['37581b1a756d81cea734cf0bcd01666a', 'NURIA', 1],
  ['37581b1a756d81d2ac17da857349f56f', 'MARIA RONCERO Y FRANCISCO', 11],
  ['37581b1a756d81d78520eb8d7d615ced', 'CARLOS Y MARIA', 1],
  ['37581b1a756d81dd8951e1c312b03fee', 'MARIA JESUS', 1],
  ['37581b1a756d81f58d9ce4f7dd847505', 'Mª CARMEN VELA ORTIZ', 1],
  ['37581b1a756d81f894bbe75983518567', 'THAILAN Y ANGELA', 1],
  ['37581b1a756d81f989c3f0b8b82a4edd', 'FELISA Y MAGDALENA', 1],
  ['38081b1a756d80e985e7c5c2f07a3abf', 'KIKO LOPERA', 12],
  ['38181b1a756d8055a2c2fc1e6c39390a', 'LOLA FONSECA PABLO', 13],
  ['38381b1a756d802a82a0de029f42a854', 'SAMRA IMRAN', 10],
  ['38381b1a756d80f5b7b0ddcaefe64061', 'CRISTINA GRACIA', 7],
];

const expectedTotal = audited.reduce((sum, [, , count]) => sum + count, 0);
if (audited.length !== 31 || expectedTotal !== 118) {
  throw new Error(`Embedded audit manifest invalid: ${audited.length} pages / ${expectedTotal} files`);
}

const token = process.env.NOTION_TOKEN;
if (!token) {
  console.error('NOTION_TOKEN is required. This script performs read-only GET requests.');
  process.exit(2);
}

const outputPath = process.argv[2] || 'legacy-document-files-manifest.json';

function notionHeaders() {
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    Accept: 'application/json',
  };
}

async function notionGet(path) {
  const response = await fetch(`https://api.notion.com${path}`, { headers: notionHeaders() });
  if (!response.ok) {
    throw new Error(`Notion GET ${path} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

function normalizeFile(file) {
  const object = {
    name: file.name || null,
    type: file.type || null,
    signed_url: null,
    expiry_time: null,
    external_url: null,
  };
  if (file.type === 'file' && file.file) {
    object.signed_url = file.file.url || null;
    object.expiry_time = file.file.expiry_time || null;
  } else if (file.type === 'external' && file.external) {
    object.external_url = file.external.url || null;
  }
  return object;
}

const rows = [];
for (const [legacyPageId, expediente, expectedCount] of audited) {
  const page = await notionGet(`/v1/pages/${legacyPageId}`);
  const prop = page.properties?.[LEGACY_FILES_PROPERTY];
  if (!prop || prop.type !== 'files') {
    throw new Error(`${expediente}: missing files property ${LEGACY_FILES_PROPERTY}`);
  }
  const files = (prop.files || []).map(normalizeFile);
  if (files.length !== expectedCount) {
    throw new Error(`${expediente}: expected ${expectedCount} files, received ${files.length}`);
  }
  rows.push({
    expediente,
    legacy_page_id: legacyPageId,
    dedupe_key: `exp-legado-${legacyPageId}`,
    expected_count: expectedCount,
    files,
  });
}

const resolvedTotal = rows.reduce((sum, row) => sum + row.files.length, 0);
if (resolvedTotal !== 118) throw new Error(`Resolved total mismatch: ${resolvedTotal}`);

const manifest = {
  generated_at: new Date().toISOString(),
  notion_version: NOTION_VERSION,
  mode: 'READ_ONLY_METADATA',
  source_property: LEGACY_FILES_PROPERTY,
  expediente_count: rows.length,
  file_count: resolvedTotal,
  warning: 'Signed URLs are temporary. Re-run immediately before any authorized binary transfer.',
  expedientes: rows,
};

await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`OK: ${rows.length} expedientes / ${resolvedTotal} files -> ${outputPath}`);
