#!/usr/bin/env node

import { readFile, realpath } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_PATH = resolve(HERE, '../assets/mcp-app.html');
const APP_URI = 'ui://t3-html-replies/reply.html';
const APP_MIME = 'text/html;profile=mcp-app';
const MAX_HTML_BYTES = 1024 * 1024;
const DEFAULT_PROTOCOL = '2025-06-18';

const send = (message) => process.stdout.write(JSON.stringify(message) + '\n');
const result = (id, value) => send({ jsonrpc: '2.0', id, result: value });
const fail = (id, code, message) =>
  send({ jsonrpc: '2.0', id, error: { code, message } });

function readString(args, key, max) {
  const value = args?.[key];
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  if (value.length > max) throw Error(key + ' exceeds ' + max + ' characters.');
  return value;
}

function assertReplyShape(html) {
  if (html.includes('<!--')) {
    throw Error('The HTML contains comments. Render the reply with node ui.mjs reply instead.');
  }
  if (!/<main class="t3lib reply"/.test(html)) {
    throw Error('The HTML is not a rendered reply. Use node ui.mjs reply to render it first.');
  }
  if (!/<section class="status-board"/.test(html)) {
    throw Error('The HTML is missing the status board. Render the reply with node ui.mjs reply.');
  }
  if (/<details|<summary/i.test(html)) {
    throw Error('Expandable content is not allowed. Remove details and summary elements.');
  }
  return html;
}

async function resolveHtml(args) {
  const inline = readString(args, 'html', MAX_HTML_BYTES);
  if (inline !== undefined) {
    if (Buffer.byteLength(inline) > MAX_HTML_BYTES) throw Error('The reply HTML exceeds 1 MB.');
    return assertReplyShape(inline);
  }

  const htmlPath = readString(args, 'htmlPath', 4096);
  if (htmlPath === undefined) throw Error('Pass html or htmlPath.');
  if (!htmlPath.startsWith('/') || extname(htmlPath).toLowerCase() !== '.html') {
    throw Error('htmlPath must be an absolute .html path.');
  }

  const real = await realpath(resolve(htmlPath));

  const html = await readFile(real, 'utf8');
  if (Buffer.byteLength(html) > MAX_HTML_BYTES) {
    throw Error('The reply HTML exceeds 1 MB.');
  }
  return assertReplyShape(html);
}

const tool = {
  name: 'render_reply',
  title: 'Render T3 HTML reply',
  description:
    'Render a validated t3-html-replies page as a native T3 MCP app. Buttons with data-t3-send send their instruction to the current thread through T3.',
  inputSchema: {
    type: 'object',
    properties: {
      htmlPath: {
        type: 'string',
        description: 'Absolute path to HTML produced by the t3-html-replies CLI.'
      },
      html: {
        type: 'string',
        description: 'Complete validated HTML. Prefer htmlPath for normal use.'
      }
    },
    additionalProperties: false
  },
  annotations: {
    title: 'Render T3 HTML reply',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
  },
  _meta: {
    ui: {
      resourceUri: APP_URI,
      visibility: ['model']
    }
  }
};

async function handle(message) {
  const { id, method, params = {} } = message;
  const isRequest = id !== undefined;
  try {
    switch (method) {
      case 'initialize': {
        const requested = readString(params, 'protocolVersion', 64);
        result(id, {
          protocolVersion: requested ?? DEFAULT_PROTOCOL,
          serverInfo: { name: 't3-html-replies', version: '1.0.0' },
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false }
          }
        });
        return;
      }
      case 'notifications/initialized':
      case 'notifications/cancelled':
        return;
      case 'ping':
        result(id, {});
        return;
      case 'tools/list':
        result(id, { tools: [tool] });
        return;
      case 'tools/call': {
        if (params.name !== 'render_reply') {
          fail(id, -32602, 'Unknown tool.');
          return;
        }
        const html = await resolveHtml(params.arguments ?? {});
        result(id, {
          content: [{ type: 'text', text: 'T3 HTML reply rendered.' }],
          structuredContent: { html }
        });
        return;
      }
      case 'resources/list':
        result(id, {
          resources: [
            {
              uri: APP_URI,
              name: 'T3 HTML reply',
              title: 'T3 HTML reply',
              description: 'Interactive T3 reply renderer.',
              mimeType: APP_MIME
            }
          ]
        });
        return;
      case 'resources/templates/list':
        result(id, { resourceTemplates: [] });
        return;
      case 'resources/read': {
        if (params.uri !== APP_URI) {
          fail(id, -32602, 'Unknown resource.');
          return;
        }
        const text = await readFile(APP_PATH, 'utf8');
        result(id, {
          contents: [
            {
              uri: APP_URI,
              mimeType: APP_MIME,
              text
            }
          ]
        });
        return;
      }
      default:
        if (isRequest) fail(id, -32601, 'Method not found: ' + method);
    }
  } catch (error) {
    if (isRequest) {
      fail(id, -32602, error instanceof Error ? error.message : 'Request failed.');
    } else {
      process.stderr.write(
        't3-html-replies: notification failed: ' +
          (error instanceof Error ? error.message : String(error)) +
          '\n'
      );
    }
  }
}

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of lines) {
  if (line.trim() === '') continue;
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    fail(null, -32700, 'Parse error.');
    continue;
  }
  if (message && typeof message === 'object') await handle(message);
}
