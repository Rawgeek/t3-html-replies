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
  eta: '2 min',
  wake: 'Not armed',
  milestones: ['A', 'B', 'C'],
  results: [
    { label: 'Checks', value: '1,248', note: 'All pass' },
    { label: 'Review', value: 'Open', note: 'Reader pending' },
    { label: 'Release', value: 'Next', note: 'After review' }
  ],
  sections: [
    {
      title: 'Stages',
      type: 'swimlane',
      items: [
        { label: 'One', time: '09:00', state: 'done' },
        { label: 'Two', time: '09:12', state: 'done' },
        { label: 'Three', time: '09:30', state: 'waiting', progress: '55%' },
        { label: 'Four', time: '09:50', state: 'pending' },
        { label: 'Five', time: '10:10', state: 'pending' }
      ]
    },
    { title: 'Changes', type: 'changes', done: Array.from({ length: 3 }, () => ({ title: 'WWWWWWWWWWWWWWWWWW', description: 'WWWWWWWWWWWWWWWWWWWW' })), todo: [{ title: 'WWWWWWWWWWWWWWWWWW', description: 'WWWWWWWWWWWWWWWWWWWW' }] },
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

const maximum = {
  title: 'Maximum content',
  state: 'working',
  summary: 'S'.repeat(80),
  progress: '55% estimate',
  eta: 'Unknown',
  wake: 'Not armed',
  milestones: ['M'.repeat(8), 'M'.repeat(8), 'M'.repeat(8), 'M'.repeat(8)],
  results: Array.from({ length: 4 }, () => ({ label: 'L'.repeat(12), value: 'V'.repeat(8), note: 'N'.repeat(18) })),
  sections: [
    {
      title: 'Stages',
      type: 'swimlane',
      items: [
        { label: 'W'.repeat(18), note: 'N'.repeat(20), time: '09:00', state: 'done' },
        { label: 'W'.repeat(18), note: 'N'.repeat(20), time: '09:30', state: 'done' },
        { label: 'W'.repeat(18), note: 'N'.repeat(20), time: '10:00', state: 'waiting', progress: '55%' },
        { label: 'W'.repeat(18), note: 'N'.repeat(20), time: '10:30', state: 'pending' },
        { label: 'W'.repeat(18), note: 'N'.repeat(20), time: '11:00', state: 'pending' },
        { label: 'W'.repeat(18), note: 'N'.repeat(20), time: '11:30', state: 'pending' }
      ]
    },
    {
      title: 'Changes',
      type: 'changes',
      done: Array.from({ length: 3 }, () => ({ title: 'T'.repeat(18), description: 'D'.repeat(22) })),
      todo: Array.from({ length: 3 }, () => ({ title: 'T'.repeat(18), description: 'D'.repeat(22) }))
    },
    {
      title: 'Cards',
      type: 'cards',
      items: Array.from({ length: 3 }, () => ({ label: 'L'.repeat(12), state: 'done', note: 'N'.repeat(18) }))
    }
  ]
};

const actions = {
  ...base,
  title: 'T'.repeat(64),
  wake: 'W'.repeat(20),
  actions: [
    { label: 'L'.repeat(14), send: 'First action', icon: 'check' },
    { label: 'M'.repeat(14), send: 'Second action', icon: 'play' },
    { label: 'N'.repeat(14), send: 'Third action', icon: 'download' }
  ]
};

const W = (length) => 'W'.repeat(length);
const maxSections = {
  maxFacts: { type: 'facts', title: W(24), items: Array.from({ length: 4 }, () => ({ label: W(12), value: W(8), note: W(18) })) },
  maxList: { type: 'list', title: W(24), items: [W(48), W(48), W(48)] },
  maxTable: { type: 'table', title: W(24), columns: [W(14), W(14)], rows: Array.from({ length: 3 }, () => [W(18), W(18)]) },
  maxTableActions: { type: 'table', title: W(24), columns: [W(14), W(14)], rows: Array.from({ length: 3 }, () => [W(18), { label: W(14), send: W(400), icon: 'check' }]) },
  maxBars: { type: 'bars', title: W(23), items: Array.from({ length: 3 }, () => ({ label: W(18), note: W(13), value: 999999999 })) },
  maxCompare: { type: 'compare', title: W(20), items: Array.from({ length: 3 }, () => ({ label: W(18), before: '99999999 s', after: '9999999 ms', delta: W(12) })) },
  maxCards: { type: 'cards', title: W(24), items: Array.from({ length: 3 }, () => ({ label: W(12), note: W(18), state: 'done' })) }
};
const compactBase = structuredClone(base);
compactBase.sections = compactBase.sections.slice(0, 3);
const boundary = {};
for (const [name, section] of Object.entries(maxSections)) {
  const data = structuredClone(compactBase);
  data.sections[2] = section;
  boundary[name] = data;
}
for (const [name, section] of Object.entries({ compactFacts: maxSections.maxFacts, compactList: maxSections.maxList, compactCards: maxSections.maxCards })) {
  const data = structuredClone(compactBase);
  data.sections.push(structuredClone(compactBase.sections[2]), structuredClone(compactBase.sections[2]), section);
  boundary[name] = data;
}
const maxStages = structuredClone(compactBase);
maxStages.sections[0] = {
  title: W(24),
  type: 'swimlane',
  items: Array.from({ length: 6 }, (_, index) => ({
    label: W(18), note: W(20), time: '09:' + String(index * 10).padStart(2, '0'),
    state: index < 3 ? 'done' : index === 3 ? 'waiting' : 'pending', ...(index === 3 ? { progress: '55%' } : {})
  }))
};
boundary.maxStages = maxStages;
const maxResults = structuredClone(compactBase);
maxResults.results = Array.from({ length: 4 }, () => ({ label: W(12), value: W(8), note: W(18) }));
boundary.maxResults = maxResults;
const maxChanges = structuredClone(compactBase);
maxChanges.sections[1] = { type: 'changes', title: W(24), done: Array.from({ length: 3 }, () => ({ title: W(18), description: W(22) })), todo: Array.from({ length: 3 }, () => ({ title: W(18), description: W(22) })) };
boundary.maxChanges = maxChanges;

const pages = {};
for (const [name, data] of Object.entries({ base, dense, maximum, actions, ...boundary })) {
  const file = join(dir, name + '.html');
  try {
    await writeFile(file, await renderReply(data));
  } catch (error) {
    throw Error(name + ' (' + (Array.isArray(data.sections) ? data.sections.length : '?') + ' sections): ' + error.message);
  }
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
      const bento = document.querySelector('.bento');
      const box = (element) => element.getBoundingClientRect();
      const tiles = [...document.querySelectorAll('.bento .reply-section-tile')];
      const clippedTiles = tiles.filter((tile) => {
        const body = tile.querySelector('.tile-body');
        return body.scrollHeight > body.clientHeight + 1 || body.scrollWidth > body.clientWidth + 1;
      });
      const status = [...document.querySelectorAll('.bento .status-tile')];
      const statusClipped = status.filter((tile) => tile.scrollHeight > tile.clientHeight + 1).map((tile) => tile.dataset.field || 'tile');
      const hidden = [...document.querySelectorAll('.bento *')].filter((node) => node.children.length === 0 && node.textContent.trim() && (getComputedStyle(node).display === 'none' || getComputedStyle(node).visibility === 'hidden')).length;
      const spilledNodes = [...document.querySelectorAll('.bento .reply-section-tile *, .bento .status-tile *')]
        .filter((node) => node instanceof HTMLElement)
        .filter((node) => node.scrollWidth > node.clientWidth + 2 || node.scrollHeight > node.clientHeight + 2)
        .map((node) => node.tagName.toLowerCase() + '.' + String(node.className).split(' ').filter(Boolean).join('.') + ' ' + node.scrollWidth + '/' + node.clientWidth + 'x' + node.scrollHeight + '/' + node.clientHeight);
      const spilled = spilledNodes.length;
      const columns = getComputedStyle(bento).gridTemplateColumns.split(' ').length;
      const occupied = new Map();
      for (const child of bento.children) {
        const style = getComputedStyle(child);
        const rowStart = Number(style.gridRowStart);
        const rowEndValue = Number(style.gridRowEnd);
        const colStart = Number(style.gridColumnStart);
        const colEndValue = Number(style.gridColumnEnd);
        const rowEnd = Number.isFinite(rowEndValue) ? rowEndValue : rowStart + 1;
        const colEnd = Number.isFinite(colEndValue) ? colEndValue : colStart + 1;
        if (!Number.isFinite(rowStart) || !Number.isFinite(rowEnd) || !Number.isFinite(colStart) || !Number.isFinite(colEnd)) continue;
        for (let row = rowStart; row < rowEnd; row += 1) {
          const cells = occupied.get(row) || [];
          for (let col = colStart; col < colEnd; col += 1) cells.push(col);
          occupied.set(row, cells);
        }
      }
      const holes = [...occupied.entries()].reduce((count, [row, cells]) =>
        count + (new Set(cells).size === columns ? 0 : 1), 0);
      const sectionHeights = tiles.map((tile) => Math.round(box(tile).height));
      const sectionMeta = tiles.map((tile) => ({ type: tile.dataset.sectionType, height: tile.dataset.height, pixels: Math.round(box(tile).height) }));
      const resultTiles = [...document.querySelectorAll('.reply-results > .component-tile')];
      const resultMetrics = resultTiles.map((tile) => {
        const body = tile.querySelector('.tile-body');
        return { width: Math.round(box(tile).width), scrollHeight: body.scrollHeight, clientHeight: body.clientHeight, scrollWidth: body.scrollWidth, clientWidth: body.clientWidth };
      });
      const resultClip = resultMetrics.filter((tile) => tile.scrollHeight > tile.clientHeight + 1 || tile.scrollWidth > tile.clientWidth + 1).length;
      const progress = document.querySelector('.bento > .status-board[data-slot="progress"]');
      const stage = document.querySelector('.bento > [data-section-type="swimlane"]');
      const orderOk = !progress || !stage || progress.getBoundingClientRect().top <= stage.getBoundingClientRect().top;
      const page = document.documentElement;
      const overflowX = page.scrollWidth > page.clientWidth + 1;
      return JSON.stringify({ columns, clipped: clippedTiles.length, resultClip, resultMetrics, clippedTypes: clippedTiles.map((t) => t.dataset.sectionType), statusClipped, hidden, spilled, spilledNodes, holes, sectionHeights, sectionMeta, orderOk, overflowX });
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
      const expected = width > 900 ? 4 : 1;
      if (report.columns !== expected) failures.push(name + '@' + width + ': ' + report.columns + ' columns, expected ' + expected);
      if (report.clipped) failures.push(name + '@' + width + ': ' + report.clipped + ' clipped tiles (' + report.clippedTypes.join(',') + ')');
      if (report.resultClip) failures.push(name + '@' + width + ': ' + report.resultClip + ' clipped result tiles ' + JSON.stringify(report.resultMetrics));
      if (report.statusClipped.length) failures.push(name + '@' + width + ': status tiles clip (' + report.statusClipped.join(',') + ')');
      if (report.hidden) failures.push(name + '@' + width + ': ' + report.hidden + ' visible text nodes are hidden');
      if (report.spilled) failures.push(name + '@' + width + ': ' + report.spilled + ' overflowing nodes (' + report.spilledNodes.slice(0, 3).join(' | ') + ')');
      if (report.holes) failures.push(name + '@' + width + ': ' + report.holes + ' packed rows do not reach both edges');
      if (!report.orderOk) failures.push(name + '@' + width + ': Progress does not lead the layout');
      if (width > 900) {
        const minimum = { slim: 88, small: 184, tall: 376 };
        const short = report.sectionMeta.filter((tile) => tile.pixels + 1 < minimum[tile.height]);
        if (short.length) failures.push(name + '@' + width + ': section below its minimum height (' + short.map((tile) => tile.type + ':' + tile.pixels).join(',') + ')');
      }
      if (report.overflowX) failures.push(name + '@' + width + ': the page scrolls horizontally');
    }
  }
  if (failures.length) {
    process.stderr.write(failures.join('\n') + '\n');
    process.exitCode = 1;
  } else {
    process.stdout.write('Layout check passed: ' + Object.keys(pages).length + ' pages at 1024, 728, and 390 with no clips, spills, or holes.\n');
  }
} finally {
  quit();
  await rm(dir, { recursive: true, force: true });
}
