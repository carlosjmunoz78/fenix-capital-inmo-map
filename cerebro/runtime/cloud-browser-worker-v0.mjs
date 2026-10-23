import fs from 'node:fs/promises';
import path from 'node:path';
import { evaluateBrowserExecution } from './browser-transversal-autonomy-v1.mjs';

const ACTIONS = new Set([
  'NAVIGATE','BACK','FORWARD','RELOAD','OPEN_TAB','CLOSE_TAB','SWITCH_TAB',
  'CLICK','DOUBLE_CLICK','HOVER','FILL','TYPE','PRESS','CHECK','UNCHECK','SELECT',
  'UPLOAD','DRAG','SCROLL','WAIT','EXTRACT_TEXT','EXTRACT_HTML','SCREENSHOT','PDF',
  'DOWNLOAD_CLICK'
]);

let chromiumRuntime = null;

async function getChromiumRuntime() {
  if (chromiumRuntime) return chromiumRuntime;
  try {
    const playwright = await import('@playwright/test');
    chromiumRuntime = playwright.chromium;
    if (!chromiumRuntime) throw new Error('CHROMIUM_EXPORT_MISSING');
    return chromiumRuntime;
  } catch (cause) {
    const error = new Error('PLAYWRIGHT_CHROMIUM_RUNTIME_UNAVAILABLE');
    error.cause = cause;
    throw error;
  }
}

function required(value, name) {
  if (value === undefined || value === null || value === '') throw new Error(`MISSING_${name}`);
  return value;
}

function safeSegment(value, fallback = 'unknown') {
  return String(value ?? fallback).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

function locatorFor(page, target = {}) {
  if (target.test_id) return page.getByTestId(target.test_id);
  if (target.role) return page.getByRole(target.role, target.name ? { name: target.name, exact: target.exact === true } : undefined);
  if (target.label) return page.getByLabel(target.label, { exact: target.exact === true });
  if (target.placeholder) return page.getByPlaceholder(target.placeholder, { exact: target.exact === true });
  if (target.text) return page.getByText(target.text, { exact: target.exact === true });
  if (target.selector) return page.locator(target.selector);
  throw new Error('MISSING_TARGET');
}

function assertScope(job) {
  required(job.company_id, 'COMPANY_ID');
  required(job.identity_id, 'IDENTITY_ID');
  required(job.environment, 'ENVIRONMENT');
  if (job.profile_scope) {
    if (job.profile_scope.company_id !== job.company_id) throw new Error('CROSS_COMPANY_PROFILE_DENIED');
    if (job.profile_scope.identity_id !== job.identity_id) throw new Error('CROSS_IDENTITY_PROFILE_DENIED');
    if (job.profile_scope.environment !== job.environment) throw new Error('CROSS_ENVIRONMENT_PROFILE_DENIED');
  }
}

function assertAction(action = {}) {
  if (!ACTIONS.has(action.type)) throw new Error(`UNSUPPORTED_BROWSER_ACTION:${action.type ?? 'null'}`);
}

export function getCloudBrowserWorkerCapabilities() {
  return Object.freeze({
    schema_version: '0.1.0',
    backend: 'PLAYWRIGHT_CHROMIUM',
    persistent_profiles: true,
    dom_and_accessibility_locators: true,
    screenshots: true,
    pdf: true,
    uploads: true,
    downloads: true,
    multi_tab: true,
    popups: true,
    iframe_via_selector: true,
    shadow_dom_via_playwright: true,
    audit_events: true,
    restartable: true,
    arbitrary_page_javascript: false,
    captcha_bypass: false,
    mfa_bypass: false,
    actions: [...ACTIONS]
  });
}

export function createCloudBrowserWorker({
  profiles_root = process.env.CEREBRO_BROWSER_PROFILES_ROOT || '.cerebro/browser-profiles',
  artifacts_root = process.env.CEREBRO_BROWSER_ARTIFACTS_ROOT || '.cerebro/browser-artifacts',
  headless = process.env.CEREBRO_BROWSER_HEADLESS !== 'false',
  launch_options = {},
  audit_sink = async () => {}
} = {}) {
  let context = null;
  let activePage = null;
  let runningScope = null;

  async function emit(event) {
    await audit_sink(Object.freeze({ at: new Date().toISOString(), ...event }));
  }

  async function start(job) {
    assertScope(job);
    if (context) throw new Error('BROWSER_WORKER_ALREADY_STARTED');
    const profileId = safeSegment(job.browser_profile_id || `${job.company_id}-${job.identity_id}-${job.environment}`);
    const profileDir = path.resolve(profiles_root, profileId);
    await fs.mkdir(profileDir, { recursive: true });
    await fs.mkdir(path.resolve(artifacts_root), { recursive: true });

    const chromium = await getChromiumRuntime();
    context = await chromium.launchPersistentContext(profileDir, {
      headless,
      acceptDownloads: true,
      locale: job.locale || 'es-ES',
      timezoneId: job.timezone || 'Europe/Madrid',
      viewport: job.viewport || { width: 1440, height: 1000 },
      ...launch_options
    });
    activePage = context.pages()[0] || await context.newPage();
    runningScope = Object.freeze({
      company_id: job.company_id,
      identity_id: job.identity_id,
      environment: job.environment,
      browser_profile_id: profileId
    });
    context.on('page', page => { activePage = page; });
    await emit({ type: 'BROWSER_STARTED', ...runningScope });
    return runningScope;
  }

  async function stop(reason = 'NORMAL') {
    if (!context) return;
    const scope = runningScope;
    await context.close();
    context = null;
    activePage = null;
    runningScope = null;
    await emit({ type: 'BROWSER_STOPPED', reason, ...scope });
  }

  async function evidence(job, label = 'evidence') {
    if (!activePage) throw new Error('BROWSER_WORKER_NOT_STARTED');
    const dir = path.resolve(
      artifacts_root,
      safeSegment(job.company_id),
      safeSegment(job.environment),
      safeSegment(job.audit_id || job.request_id || 'no-audit')
    );
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, `${Date.now()}-${safeSegment(label)}.png`);
    await activePage.screenshot({ path: file, fullPage: true });
    return file;
  }

  async function doAction(job, action, index) {
    assertAction(action);
    if (!activePage) throw new Error('BROWSER_WORKER_NOT_STARTED');
    const page = activePage;
    const timeout = action.timeout_ms || job.action_timeout_ms || 30_000;
    const target = action.target ? locatorFor(page, action.target) : null;
    let result = null;

    switch (action.type) {
      case 'NAVIGATE':
        await page.goto(required(action.url, 'URL'), { waitUntil: action.wait_until || 'domcontentloaded', timeout });
        result = { url: page.url(), title: await page.title() };
        break;
      case 'BACK': await page.goBack({ timeout }); result = { url: page.url() }; break;
      case 'FORWARD': await page.goForward({ timeout }); result = { url: page.url() }; break;
      case 'RELOAD': await page.reload({ waitUntil: action.wait_until || 'domcontentloaded', timeout }); result = { url: page.url() }; break;
      case 'OPEN_TAB':
        activePage = await context.newPage();
        if (action.url) await activePage.goto(action.url, { waitUntil: 'domcontentloaded', timeout });
        result = { tab_index: context.pages().indexOf(activePage), url: activePage.url() };
        break;
      case 'CLOSE_TAB': {
        const pages = context.pages();
        await page.close();
        activePage = context.pages()[Math.max(0, Math.min(pages.indexOf(page) - 1, context.pages().length - 1))] || null;
        result = { tabs: context.pages().length };
        break;
      }
      case 'SWITCH_TAB': {
        const pages = context.pages();
        activePage = pages[required(action.index, 'TAB_INDEX')];
        if (!activePage) throw new Error('TAB_NOT_FOUND');
        await activePage.bringToFront();
        result = { tab_index: action.index, url: activePage.url() };
        break;
      }
      case 'CLICK': await target.click({ timeout }); break;
      case 'DOUBLE_CLICK': await target.dblclick({ timeout }); break;
      case 'HOVER': await target.hover({ timeout }); break;
      case 'FILL': await target.fill(String(action.value ?? ''), { timeout }); break;
      case 'TYPE': await target.pressSequentially(String(action.value ?? ''), { delay: action.delay_ms || 0, timeout }); break;
      case 'PRESS': await target.press(required(action.key, 'KEY'), { timeout }); break;
      case 'CHECK': await target.check({ timeout }); break;
      case 'UNCHECK': await target.uncheck({ timeout }); break;
      case 'SELECT': result = await target.selectOption(action.value, { timeout }); break;
      case 'UPLOAD': await target.setInputFiles(required(action.files, 'FILES'), { timeout }); break;
      case 'DRAG': await target.dragTo(locatorFor(page, required(action.to, 'DRAG_DESTINATION')), { timeout }); break;
      case 'SCROLL':
        await page.mouse.wheel(Number(action.delta_x || 0), Number(action.delta_y || 700));
        break;
      case 'WAIT': await page.waitForTimeout(Math.min(Number(action.ms || 500), 30_000)); break;
      case 'EXTRACT_TEXT': result = await target.innerText({ timeout }); break;
      case 'EXTRACT_HTML': result = await target.innerHTML({ timeout }); break;
      case 'SCREENSHOT': {
        const file = await evidence(job, action.label || `action-${index}`);
        result = { file };
        break;
      }
      case 'PDF': {
        const dir = path.resolve(artifacts_root, safeSegment(job.company_id), safeSegment(job.environment), safeSegment(job.audit_id || job.request_id || 'no-audit'));
        await fs.mkdir(dir, { recursive: true });
        const file = path.join(dir, `${Date.now()}-${safeSegment(action.label || 'page')}.pdf`);
        await page.pdf({ path: file, format: action.format || 'A4', printBackground: true });
        result = { file };
        break;
      }
      case 'DOWNLOAD_CLICK': {
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout }),
          target.click({ timeout })
        ]);
        const dir = path.resolve(artifacts_root, safeSegment(job.company_id), safeSegment(job.environment), safeSegment(job.audit_id || job.request_id || 'no-audit'), 'downloads');
        await fs.mkdir(dir, { recursive: true });
        const file = path.join(dir, safeSegment(action.filename || download.suggestedFilename(), 'download.bin'));
        await download.saveAs(file);
        result = { file, suggested_filename: download.suggestedFilename() };
        break;
      }
      default: throw new Error(`UNSUPPORTED_BROWSER_ACTION:${action.type}`);
    }

    await emit({
      type: 'BROWSER_ACTION',
      request_id: job.request_id || null,
      audit_id: job.audit_id || null,
      company_id: job.company_id,
      identity_id: job.identity_id,
      environment: job.environment,
      index,
      action_type: action.type,
      url: activePage?.url() || null,
      ok: true
    });
    return result;
  }

  async function execute(job = {}) {
    assertScope(job);
    if (job.kill_switch_enabled !== true) throw new Error('BROWSER_KILL_SWITCH_NOT_ARMED');
    const auth = evaluateBrowserExecution({
      engine_id: job.engine_id,
      environment: job.environment,
      canonical_engine_ids: job.canonical_engine_ids || [],
      route_needed: job.route_needed !== false,
      browser_binding: job.browser_binding || {},
      operation: job.operation || {},
      engine_authority: job.engine_authority || {}
    });
    if (auth.status !== 'AUTHORIZED') return { ok: false, authorization: auth, results: [] };

    if (!context) await start(job);
    if (runningScope.company_id !== job.company_id || runningScope.identity_id !== job.identity_id || runningScope.environment !== job.environment) {
      throw new Error('RUNNING_BROWSER_SCOPE_MISMATCH');
    }

    const results = [];
    try {
      for (let i = 0; i < (job.actions || []).length; i += 1) {
        results.push(await doAction(job, job.actions[i], i));
      }
      const finalEvidence = job.capture_final_evidence === false ? null : await evidence(job, 'final');
      await emit({ type: 'BROWSER_JOB_COMPLETED', request_id: job.request_id || null, audit_id: job.audit_id || null, ...runningScope, final_evidence: finalEvidence });
      return { ok: true, authorization: auth, results, final_url: activePage?.url() || null, final_evidence: finalEvidence };
    } catch (error) {
      const failureEvidence = activePage ? await evidence(job, 'failure').catch(() => null) : null;
      await emit({ type: 'BROWSER_JOB_FAILED', request_id: job.request_id || null, audit_id: job.audit_id || null, ...runningScope, error: String(error?.message || error), failure_evidence: failureEvidence });
      throw error;
    } finally {
      if (job.keep_session_open !== true) await stop('JOB_COMPLETE');
    }
  }

  return Object.freeze({ start, stop, execute, capabilities: getCloudBrowserWorkerCapabilities });
}
