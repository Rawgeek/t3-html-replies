#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

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

const reply = {
  title: 'Self test reply',
  state: 'working',
  summary: 'Exercises the rendered reply path.',
  progress: '40%',
  eta: '2 min',
  wake: 'Not armed',
  milestones: ['Read', 'Build', 'Ship'],
  sections: [
    {
      title: 'Stages',
      type: 'swimlane',
      items: [
        { label: 'Read', note: 'Done', time: '09:10', state: 'done' },
        { label: 'Plan', note: 'Done', time: '09:20', state: 'done' },
        { label: 'Build', note: 'Running', time: 'Now', state: 'waiting', progress: '40%' },
        { label: 'Check', note: 'Next', time: 'Next', state: 'pending' },
        { label: 'Ship', note: 'Later', time: 'Later', state: 'pending' }
      ]
    },
    { title: 'Changes', type: 'changes', done: ['Renderer updated'], todo: ['Run checks'] },
    {
      title: 'Proof',
      type: 'facts',
      items: [
        { label: 'Checks', value: '8', note: 'Passing' },
        { label: 'Files', value: '3', note: 'Changed' }
      ]
    },
    {
      title: 'Work',
      type: 'cards',
      items: [
        { label: 'Code', state: 'done', note: 'Merged' },
        { label: 'Tests', state: 'pending', note: 'Queued' }
      ]
    }
  ]
};

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
  if (!tool.inputSchema?.properties?.data || tool.inputSchema?.properties?.html) {
    throw Error('render_reply must accept reply data, not HTML.');
  }

  const dir = await mkdtemp(join(tmpdir(), 't3-reply-'));
  const dataPath = join(dir, 'reply.json');
  await writeFile(dataPath, JSON.stringify(reply));

  const fromPath = await rpc('tools/call', { name: 'render_reply', arguments: { dataPath } });
  if (fromPath.structuredContent?.html?.includes('Self test reply') !== true) {
    throw Error('dataPath rendering failed.');
  }
  const inline = await rpc('tools/call', { name: 'render_reply', arguments: { data: reply } });
  if (inline.structuredContent?.html?.includes('Self test reply') !== true) {
    throw Error('Inline data rendering failed.');
  }

  let rejected = false;
  try {
    await rpc('tools/call', {
      name: 'render_reply',
      arguments: { data: { title: 'Fake', state: 'working', progress: '40%' } }
    });
  } catch (error) {
    rejected = /swimlane/i.test(error.message);
  }
  if (!rejected) throw Error('render_reply accepted reply data without a swimlane.');

  const resource = await rpc('resources/read', {
    uri: 'ui://t3-html-replies/reply.html'
  });
  const contents = resource.contents?.[0];
  if (contents?.mimeType !== 'text/html;profile=mcp-app' || !contents.text?.includes('ui/initialize')) {
    throw Error('MCP app resource is invalid.');
  }
  const scripts = [...contents.text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  if (!scripts.length) throw Error('MCP app has no inline script.');
  for (const source of scripts) new vm.Script(source, { filename: 'mcp-app.html' });

  process.stdout.write('t3-html-replies MCP self-test passed.\n');
} finally {
  server.stdin.end();
}
