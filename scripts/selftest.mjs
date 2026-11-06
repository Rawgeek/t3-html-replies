#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const server = spawn(process.execPath, [resolve(here, 'mcp-server.mjs')], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let nextId = 1;
let buffer = '';
const waiting = new Map();

server.stdout.setEncoding('utf8');
server.stdout.on('data', (chunk) => {
  buffer += chunk;
  let newline;
  while ((newline = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, newline);
    buffer = buffer.slice(newline + 1);
    if (!line.trim()) continue;
    const message = JSON.parse(line);
    const waiter = waiting.get(String(message.id));
    if (!waiter) continue;
    waiting.delete(String(message.id));
    if (message.error) waiter.reject(Error(message.error.message));
    else waiter.resolve(message.result);
  }
});

function rpc(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    waiting.set(String(id), { resolve, reject });
    server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

try {
  const initialized = await rpc('initialize', {
    protocolVersion: '2026-01-26',
    capabilities: {},
    clientInfo: { name: 't3-html-replies-selftest', version: '1.0.0' }
  });
  if (initialized.protocolVersion !== '2026-01-26') throw Error('Protocol handshake failed.');

  const listed = await rpc('tools/list');
  const tool = listed.tools?.find((item) => item.name === 'render_reply');
  if (tool?._meta?.ui?.resourceUri !== 'ui://t3-html-replies/reply.html') {
    throw Error('render_reply does not advertise the app resource.');
  }

  const called = await rpc('tools/call', {
    name: 'render_reply',
    arguments: { html: '<!doctype html><html><body><main class="t3lib reply"><section class="status-board">Self test</section></main></body></html>' }
  });
  if (called.structuredContent?.html?.includes('Self test') !== true) {
    throw Error('render_reply did not return its HTML payload.');
  }

  const { writeFile, mkdtemp } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = await mkdtemp(join(tmpdir(), 't3-reply-'));
  const replyPath = join(dir, 'reply.html');
  await writeFile(replyPath, '<!doctype html><html><body><main class="t3lib reply"><section class="status-board">Path check</section></main></body></html>');
  const fromPath = await rpc('tools/call', { name: 'render_reply', arguments: { htmlPath: replyPath } });
  if (!fromPath.structuredContent?.html?.includes('Path check')) throw Error('htmlPath rendering failed.');
  const resource = await rpc('resources/read', {
    uri: 'ui://t3-html-replies/reply.html'
  });
  const contents = resource.contents?.[0];
  if (contents?.mimeType !== 'text/html;profile=mcp-app' || !contents.text?.includes('ui/initialize')) {
    throw Error('MCP app resource is invalid.');
  }

  process.stdout.write('t3-html-replies MCP self-test passed.\n');
} finally {
  server.stdin.end();
}
