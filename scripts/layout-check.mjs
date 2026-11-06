#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const libraries = [
  process.env.T3_UI_LIBRARY,
  resolve(here, '../ui-library'),
  join(homedir(), '.codex/templates/t3-ui-library')
].filter(Boolean);
const library = libraries.find((path) => existsSync(join(path, 'render-reply.mjs')));
if (!library) throw Error('UI library not found. Set T3_UI_LIBRARY.');
const { renderReply } = await import(pathToFileURL(join(library, 'render-reply.mjs')).href);

const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9800 + Math.floor(Math.random() * 400);
const profile = join(tmpdir(), 't3-layout-' + process.pid);
const dir = await mkdtemp(join(tmpdir(), 't3-layout-files-'));

const base = {
  title: 'Layout check',
  state: 'working',
  progress: '55%',
  next: 'Check limits',
  eta: '2 min',
  wake: 'Not armed',
  zone: 'Asia/Bangkok',
  milestones: ['A', 'B', 'C'],
  sections: [
    {
      title: 'Stages',
      type: 'swimlane',
      items: [
        { label: 'One', state: 'done' },
        { label: 'Two', state: 'done' },
        { label: 'Three', state: 'waiting', progress: '55%' },
        { label: 'Four', state: 'pending' },
        { label: 'Five', state: 'pending' }
      ]
    },
    { title: 'Changes', type: 'changes', done: ['WWWWWWWWWWWWWWWWWW', 'WWWWWWWWWWWWWWWWWW', 'WWWWWWWWWWWWWWWWWW'], todo: ['WWWWWWWWWWWWWWWWWW'] },
    {
      title: 'Cards',
      type: 'cards',
      items: [
        { label: 'WWWWWWWWWWWW', state: 'done', note: 'WWWWWWWWWWWWWWWWWW' },
        { label: 'WWWWWWWWWWWW', state: 'waiting', note: 'WWWWWWWWWWWWWWWWWW' },
        { label: 'WWWWWWWWWWWW', state: 'pending', note: 'WWWWWWWWWWWWWWWWWW' }
      ]
    },
    {
      title: 'Compare',
      type: 'compare',
      items: [
        { label: 'Build time', before: '148 s', after: '92 s' },
        { label: 'Memory', before: '1.8 GB', after: '1.1 GB' },
        { label: 'Tests', before: '1,248', after: '1,248' }
      ]
    },
    {
      title: 'Scope',
      type: 'list',
      items: ['One item', 'Two items', 'Three items']
    },
    {
      title: 'Facts',
      type: 'facts',
      items: [
        { label: 'WWWWWWWWWWWW', value: 'WWWWWWWW', note: 'WWWWWWWWWWWWWWWWWW' },
        { label: 'WWWWWWWWWWWW', value: 'WWWWWWWW', note: 'WWWWWWWWWWWWWWWWWW' },
        { label: 'WWWWWWWWWWWW', value: 'WWWWWWWW', note: 'WWWWWWWWWWWWWWWWWW' },
        { label: 'WWWWWWWWWWWW', value: 'WWWWWWWW', note: 'WWWWWWWWWWWWWWWWWW' }
      ]
    }
  ]
};

const dense = {
  ...base,
  sections: [
    ...base.sections,
    { title: 'Queue', type: 'table', columns: ['Area', 'State'], rows: [['Checks', 'Pass'], ['Live', 'Verified']] },
    { title: 'Bars', type: 'bars', items: [{ label: 'Build', value: 92 }, { label: 'Before', value: 148 }] }
  ]
};

const pages = {};
for (const [name, data] of Object.entries({ boundary: base, dense })) {
  const file = join(dir, name + '.html');
  await writeFile(file, await renderReply(data));
  pages[name] = pathToFileURL(file).href;
}

const server = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
const quit = () => { server.kill(); rm(profile, { recursive: true, force: true }).catch(() => {}); };

let nextId = 1;
const inspect = async (url, width) => {
  const target = await fetch('http://127.0.0.1:' + port + '/json/new?' + encodeURIComponent(url), { method: 'PUT' }).then((r) => r.json());
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const waiting = new Map();
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const waiter = waiting.get(message.id);
    if (!waiter) return;
    waiting.delete(message.id);
    message.error ? waiter.fail(Error(message.error.message)) : waiter.done(message.result);
  });
  const send = (method, params = {}) => new Promise((done, fail) => {
    const id = nextId++;
    const timer = setTimeout(() => { waiting.delete(id); fail(Error(method + ' timed out.')); }, 15000);
    waiting.set(id, { done: (v) => { clearTimeout(timer); done(v); }, fail: (e) => { clearTimeout(timer); fail(e); } });
    ws.send(JSON.stringify({ id, method, params }));
  });
  await new Promise((done, fail) => {
    const timer = setTimeout(() => fail(Error('Chrome did not open the page.')), 15000);
    ws.addEventListener('open', () => { clearTimeout(timer); done(); }, { once: true });
  });
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height: 1200, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  await new Promise((done) => setTimeout(done, 500));
  const result = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const flow = document.querySelector('.reply-flow');
      const tiles = [...flow.querySelectorAll(':scope > .reply-section-tile')];
      const box = (element) => element.getBoundingClientRect();
      const clippedTiles = tiles.filter((tile) => {
        const body = tile.querySelector('.tile-body');
        return body.scrollHeight > body.clientHeight + 1 || body.scrollWidth > body.clientWidth + 1;
      });
      const clipped = clippedTiles.length;
      const clippedTypes = clippedTiles.map((tile) => tile.dataset.sectionType);
      const spilled = [...document.querySelectorAll('.reply-section-tile *')]
        .filter((node) => node instanceof HTMLElement)
        .filter((node) => !node.closest('.table-wrap'))
        .filter((node) => node.scrollWidth > node.clientWidth + 2 || node.scrollHeight > node.clientHeight + 2).length;
      const flowBox = box(flow);
      const rows = new Map();
      for (const tile of tiles) {
        const rect = box(tile);
        const key = Math.round(rect.top);
        const row = rows.get(key) || { left: Infinity, right: -Infinity, spans: 0 };
        row.left = Math.min(row.left, rect.left);
        row.right = Math.max(row.right, rect.right);
        row.spans += Number(tile.dataset.span || 1);
        rows.set(key, row);
      }
      const holes = [...rows.values()].filter((row) =>
        Math.abs(row.left - flowBox.left) > 1.5 || Math.abs(row.right - flowBox.right) > 1.5).length;
      const columns = getComputedStyle(flow).gridTemplateColumns.split(' ').length;
      const heights = [...new Set(tiles.map((tile) => Math.round(box(tile).height)))];
      return JSON.stringify({ columns, clipped, clippedTypes, spilled, holes, heights });
    })()`
  });
  ws.close();
  await fetch('http://127.0.0.1:' + port + '/json/close/' + target.id);
  return JSON.parse(result.result.value);
};

try {
  let ready = false;
  for (let tries = 0; tries < 60 && !ready; tries += 1) {
    try { await fetch('http://127.0.0.1:' + port + '/json/version'); ready = true; } catch { await new Promise((r) => setTimeout(r, 200)); }
  }
  if (!ready) throw Error('Chrome did not start. Set CHROME_PATH.');

  const failures = [];
  for (const [name, url] of Object.entries(pages)) {
    for (const width of [1024, 728, 390]) {
      const report = await inspect(url, width);
      const expected = width > 620 ? 2 : 1;
      if (report.columns !== expected) failures.push(name + '@' + width + ': ' + report.columns + ' columns, expected ' + expected);
      if (report.clipped) failures.push(name + '@' + width + ': ' + report.clipped + ' clipped tiles (' + report.clippedTypes.join(',') + ')');
      if (report.spilled) failures.push(name + '@' + width + ': ' + report.spilled + ' overflowing nodes');
      if (report.holes) failures.push(name + '@' + width + ': ' + report.holes + ' packed rows do not reach both edges');
      if (report.heights.some((height) => height !== 184)) failures.push(name + '@' + width + ': non-184px flow tiles');
    }
  }
  if (failures.length) {
    process.stderr.write(failures.join('\n') + '\n');
    process.exitCode = 1;
  } else {
    process.stdout.write('Layout check passed: 2 pages at 1024, 728, and 390 with no clips, spills, or holes.\n');
  }
} finally {
  quit();
  await rm(dir, { recursive: true, force: true });
}
