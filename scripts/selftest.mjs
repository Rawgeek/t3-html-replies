#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { library } from './library-path.mjs';

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

function assertDelivery(value, expected) {
  if (!value._meta?.html?.includes(expected)) throw Error('App HTML payload is missing.');
  if (value.structuredContent?.status !== 'rendered'
      || Object.keys(value.structuredContent).length !== 1
      || value.content?.length !== 1
      || value.content[0].type !== 'text'
      || value.content[0].text.length > 240
      || /<\/?(?:html|main|body)\b/.test(value.content[0].text)) {
    throw Error('Model-facing reply must contain only a short delivery receipt.');
  }
}

const reply = {
  title: 'Self test reply',
  state: 'working',
  summary: 'Exercises the rendered reply path.',
  progress: '40%',
  eta: '2 min',
  wake: 'Not armed',
  milestones: ['Read', 'Build', 'Ship'],
  results: [
    { label: 'Checks', value: '8', note: 'Passing' },
    { label: 'Files', value: '3', note: 'Changed' },
    { label: 'Review', value: 'Open', note: 'Pending' }
  ],
  sections: [
    {
      title: 'Stages',
      type: 'swimlane',
      items: [
        { label: 'Read', note: 'Scope set', time: '09:10', state: 'done' },
        { label: 'Plan', note: 'Blocks chosen', time: '09:20', state: 'done' },
        { label: 'Build', note: 'Focused checks', time: '09:30', state: 'waiting', progress: '40%' },
        { label: 'Check', note: 'Review queued', time: '09:40', state: 'pending' },
        { label: 'Ship', note: 'Release follows', time: '09:50', state: 'pending' }
      ]
    },
    { title: 'Changes', type: 'changes', done: [{ title: 'Renderer updated', description: 'Templates synchronized' }], todo: [{ title: 'Run checks', description: 'Focused suite pending' }] },
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
  assertDelivery(fromPath, 'Self test reply');
  const inline = await rpc('tools/call', { name: 'render_reply', arguments: { data: reply } });
  assertDelivery(inline, 'Self test reply');
  for (const name of ['data', 'interactive']) {
    const data = JSON.parse(await readFile(join(library, name + '-example.json'), 'utf8'));
    const typed = await rpc('tools/call', { name: 'render_reply', arguments: { data } });
    assertDelivery(typed, name === 'data' ? 'report-grid' : 'data-t3-interactive');
  }
  const question = await rpc('tools/call', { name: 'render_reply', arguments: {
    data: { kind: 'question', title: 'Pick one', context: 'One choice steers.', question: 'Choose a path.',
      options: [{ label: 'First', send: 'First.' }, { label: 'Second', send: 'Second.' }] }
  } });
  assertDelivery(question, 'Choose a path.');

  let extraRejected = false;
  try {
    await rpc('tools/call', { name: 'render_reply', arguments: { data: reply, html: '<script>alert(1)</script>' } });
  } catch (error) {
    extraRejected = /unsupported arguments: html/.test(error.message);
  }
  if (!extraRejected) throw Error('render_reply accepted unsupported arguments.');

  let rejected = false;
  try {
    await rpc('tools/call', {
      name: 'render_reply',
      arguments: { data: { title: 'Fake', state: 'working', progress: '40%' } }
    });
  } catch (error) {
    rejected = /result facts|swimlane/i.test(error.message);
  }
  if (!rejected) throw Error('render_reply accepted reply data without a swimlane.');

  let aggregated = '';
  try {
    await rpc('tools/call', {
      name: 'render_reply',
      arguments: {
        data: {
          ...reply,
          title: 'x'.repeat(65),
          sections: reply.sections.map((section, index) => index === 0 ? {
            ...section,
            items: section.items.map((item, itemIndex) => itemIndex === 2 ? {
              ...item,
              note: 'x'.repeat(21)
            } : item)
          } : section)
        }
      }
    });
  } catch (error) {
    aggregated = error.message;
  }
  if (!/Reply data has 2 issues/.test(aggregated)
      || !/Title exceeds 64/.test(aggregated)
      || !/Sections\[0\] item 3 note exceeds 20/.test(aggregated)) {
    throw Error('render_reply did not report every field issue in one response.');
  }

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
