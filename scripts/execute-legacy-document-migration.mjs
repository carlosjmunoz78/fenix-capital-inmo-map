#!/usr/bin/env node

/**
 * Controlled migration runner for the 118 audited legacy document files.
 *
 * Preconditions:
 * - legacy-document-files-manifest.json refreshed immediately before execution
 * - legacy-expediente-destination-map.json validated 31/31
 * - NOTION_TOKEN available to the operator
 * - EXECUTE_LEGACY_DOCUMENT_MIGRATION=YES
 *
 * Safety:
 * - never deletes or edits legacy expediente pages/files
 * - creates only new rows in Documentación · Fénix Capital
 * - deduplicates by Clave deduplicación before every create
 * - aborts on any mapping/count mismatch
 * - writes a local execution report for reconciliation
 */

import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const NOTION_VERSION = '2026-03-11';
const DOCUMENTATION_DATA_SOURCE_ID = '34037d5e-21e8-4221-b020-b0e6e1a5a14f';
const DOCUMENTATION_DATA_SOURCE_URL = `https://api.notion.com/v1/data_sources/${DOCUMENTATION_DATA_SOURCE_ID}`;

const manifestPath = process.argv[2] || 'legacy-document-files-manifest.json';
const mappingPath = process.argv[3] || 'legacy-expediente-destination-map.json';
const reportPath = process.argv[4] || 'legacy-document-migration-report.json';

const token = process.env.NOTION_TOKEN;
if (!token) throw new Error('NOTION_TOKEN is required.');
if (process.env.EXECUTE_LEGACY_DOCUMENT_MIGRATION !== 'YES') {
  throw new Error('Set EXECUTE_LEGACY_DOCUMENT_MIGRATION=YES to run the real migration.');
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const mapping = JSON.parse(await readFile(mappingPath, 'utf8'));

if (manifest.mode !== 'READ_ONLY_METADATA' || manifest.expediente_count !== 31 || manifest.file_count !== 118) {
  throw new Error(`Manifest invariant failed: mode=${manifest.mode} count=${manifest.expediente_count}/${manifest.file_count}`);
}
if (!Array.isArray(mapping.expedientes) || mapping.expedientes.length !== 31) {
  throw new Error(`Destination mapping must contain exactly 31 expedientes.`);
}

const destinationByKey = new Map(mapping.expedientes.map((row) => [row.dedupe_key, row]));
if (destinationByKey.size !== 31) throw new Error('Destination mapping contains duplicate dedupe keys.');

function headers(json = true) {
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function notionJson(path, init = {}) {
  const response = await fetch(`https://api.notion.com${path}`, {
    ...init,
    headers: { ...headers(true), ...(init.headers || {}) },
  });
  if (!response.ok) throw new Error(`${init.method || 'GET'} ${path} -> ${response.status}: ${await response.text()}`);
  return response.json();
}

function stableKey(dedupeKey, index, filename) {
  return createHash('sha256').update(`${dedupeKey}\u0000${index}\u0000${filename}`).digest('hex');
}

async function existingDocumentByKey(dedupeKey) {
  const payload = {
    filter: {
      property: 'Clave deduplicación',
      rich_text: { equals: dedupeKey },
    },
    page_size: 2,
  };
  const result = await notionJson(`/v1/data_sources/${DOCUMENTATION_DATA_SOURCE_ID}/query`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if ((result.results || []).length > 1) throw new Error(`Duplicate destination documentation rows for ${dedupeKey}`);
  return result.results?.[0] || null;
}

async function downloadSource(url, filename) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed ${filename}: ${response.status}`);
  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  if (!buffer.byteLength) throw new Error(`Empty source file: ${filename}`);
  return { buffer, contentType };
}

async function createFileUpload(filename, contentType) {
  return notionJson('/v1/file_uploads', {
    method: 'POST',
    body: JSON.stringify({ filename, content_type: contentType }),
  });
}

async function sendFileUpload(fileUploadId, filename, contentType, buffer) {
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: contentType }), filename);
  const response = await fetch(`https://api.notion.com/v1/file_uploads/${fileUploadId}/send`, {
    method: 'POST',
    headers: headers(false),
    body: form,
  });
  if (!response.ok) throw new Error(`Upload failed ${filename}: ${response.status} ${await response.text()}`);
  return response.json();
}

async function createDocumentationRow({ filename, dedupeKey, destinationPageId, fileUploadId }) {
  const body = {
    parent: { type: 'data_source_id', data_source_id: DOCUMENTATION_DATA_SOURCE_ID },
    properties: {
      Documento: { title: [{ type: 'text', text: { content: filename } }] },
      'Clave deduplicación': { rich_text: [{ type: 'text', text: { content: dedupeKey } }] },
      Expediente: { relation: [{ id: destinationPageId }] },
      'Archivo tratado': {
        files: [{ type: 'file_upload', name: filename, file_upload: { id: fileUploadId } }],
      },
    },
  };
  return notionJson('/v1/pages', { method: 'POST', body: JSON.stringify(body) });
}

const report = {
  generated_at: new Date().toISOString(),
  notion_version: NOTION_VERSION,
  destination_data_source: DOCUMENTATION_DATA_SOURCE_URL,
  expected_expedientes: 31,
  expected_files: 118,
  created: [],
  skipped_existing: [],
  failed: [],
};

let sourceCount = 0;
for (const expediente of manifest.expedientes) {
  const destination = destinationByKey.get(expediente.dedupe_key);
  if (!destination) throw new Error(`Missing destination for ${expediente.expediente}`);
  if (destination.expediente !== expediente.expediente) throw new Error(`Title mismatch for ${expediente.dedupe_key}`);

  for (let index = 0; index < expediente.files.length; index += 1) {
    sourceCount += 1;
    const file = expediente.files[index];
    if (!file.name) throw new Error(`${expediente.expediente}: unnamed file at index ${index}`);
    const sourceUrl = file.signed_url || file.external_url;
    if (!sourceUrl) throw new Error(`${expediente.expediente}: ${file.name} has no source URL`);

    const key = `legacy-doc-${stableKey(expediente.dedupe_key, index, file.name)}`;
    try {
      const existing = await existingDocumentByKey(key);
      if (existing) {
        report.skipped_existing.push({ key, expediente: expediente.expediente, filename: file.name, page_id: existing.id });
        continue;
      }

      const { buffer, contentType } = await downloadSource(sourceUrl, file.name);
      const upload = await createFileUpload(file.name, contentType);
      const sent = await sendFileUpload(upload.id, file.name, contentType, buffer);
      if (sent.status !== 'uploaded') throw new Error(`Unexpected upload status ${sent.status} for ${file.name}`);

      const page = await createDocumentationRow({
        filename: file.name,
        dedupeKey: key,
        destinationPageId: destination.destination_page_id,
        fileUploadId: upload.id,
      });
      report.created.push({ key, expediente: expediente.expediente, filename: file.name, page_id: page.id, file_upload_id: upload.id });
    } catch (error) {
      report.failed.push({ key, expediente: expediente.expediente, filename: file.name, error: String(error?.message || error) });
      await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      throw error;
    }
  }
}

if (sourceCount !== 118) throw new Error(`Source count mismatch: ${sourceCount}`);
if (report.created.length + report.skipped_existing.length !== 118) {
  throw new Error(`Reconciliation mismatch: created=${report.created.length} skipped=${report.skipped_existing.length}`);
}

report.completed_at = new Date().toISOString();
report.status = 'COMPLETE';
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`COMPLETE: ${report.created.length} created / ${report.skipped_existing.length} already present / 118 total`);
