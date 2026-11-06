#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const shots = join(root, 'screenshots');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9400 + Math.floor(Math.random() * 400);
const profile = join(tmpdir(), 't3-previews-' + process.pid);

const shot = async (page, width, maxHeight, file) => {
  const target = await fetch(`http://127.0.0.1:${port}/json/new?` + encodeURIComponent(page), { method: 'PUT' }).then((r) => r.json());
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const waiters = new Map();
  const send = (method, params = {}) => new Promise((done, fail) => {
    const call = ++id;
    waiters.set(call, { done, fail });
    ws.send(JSON.stringify({ id: call, method, params }));
  });
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const waiter = waiters.get(message.id);
    if (!waiter) return;
    waiters.delete(message.id);
    if (message.error) waiter.fail(Error(message.error.message));
    else waiter.done(message.result);
  });
  await new Promise((done) => ws.addEventListener('open', done, { once: true }));
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height: maxHeight, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: page });
  await new Promise((done) => setTimeout(done, 900));
  const measured = await send('Runtime.evaluate', {
    expression: "document.documentElement.style.colorScheme='dark';document.body.style.cssText='margin:0;background:#0f1116;';Math.min(" + maxHeight + ",Math.max(240,Math.round(document.body.scrollHeight)+32))",
    returnByValue: true
  });
  const height = measured.result.value;
  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y: 0, width, height, scale: 1 },
    captureBeyondViewport: true
  });
  await writeFile(join(shots, file), Buffer.from(shot.data, 'base64'));
  ws.close();
  console.log(file, width + 'x' + height);
};

if (!process.argv.includes('--check')) {
  await mkdir(shots, { recursive: true });
  const server = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
  const quit = () => { server.kill(); rm(profile, { recursive: true, force: true }).catch(() => {}); };
  try {
    for (let tries = 0; tries < 40; tries += 1) {
      try { await fetch(`http://127.0.0.1:${port}/json/version`); break; } catch { await new Promise((r) => setTimeout(r, 150)); }
    }
    const page = (name) => pathToFileURL(join(root, name)).href;
    await shot(page('ui-library/reply-template.html'), 1024, 1600, 'overview.png');
    await shot(page('ui-library/reply-template.html'), 390, 2000, 'reply-mobile.png');
    await shot(page('ui-library/index.html'), 1024, 3200, 'gallery.png');
  } finally {
    quit();
  }
}

