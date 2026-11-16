#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline';
import { library } from './library-path.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_PATH = resolve(HERE, '../assets/mcp-app.html');
const APP_URI = 'ui://t3-html-replies/reply.html';
const APP_MIME = 'text/html;profile=mcp-app';
const MAX_DATA_BYTES = 256 * 1024;
const DEFAULT_PROTOCOL = '2025-06-18';

const { renderReply } = await import(pathToFileURL(join(library, 'render-reply.mjs')).href);

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

function assertData(value, source) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw Error(source + ' must contain one reply data object.');
  }
  if (Buffer.byteLength(JSON.stringify(value)) > MAX_DATA_BYTES) {
    throw Error(source + ' exceeds 256 KB. Split the reply into fewer blocks.');
  }
  return value;
}

async function resolveData(args) {
  if (args?.data !== undefined) {
    if (args?.dataPath !== undefined) throw Error('Pass data or dataPath, not both.');
    return assertData(args.data, 'data');
  }

  const dataPath = readString(args, 'dataPath', 4096);
  if (dataPath === undefined) throw Error('Pass reply data or an absolute dataPath.');
  if (!isAbsolute(dataPath) || extname(dataPath).toLowerCase() !== '.json') {
    throw Error('dataPath must be an absolute .json path.');
  }

  const text = await readFile(resolve(dataPath), 'utf8');
  if (Buffer.byteLength(text) > MAX_DATA_BYTES) throw Error('The reply data exceeds 256 KB.');
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw Error('dataPath does not contain valid JSON.');
  }
  return assertData(parsed, 'The reply data');
}

const tool = {
  name: 'render_reply',
  title: 'Render T3 HTML reply',
  description:
    'Choose replyType progress, data, or interactive, then validate and display reply JSON as a T3 app. This tool delivers the reply. Do not repeat its HTML or text in chat or call html_render for it. Leave the final message empty when the turn is complete. Missing replyType keeps progress compatibility. Chat controls stay disabled until T3 supports steering. Links and local controls work separately.',
  inputSchema: {
    type: 'object',
    properties: {
      dataPath: {
        type: 'string',
        description: 'Absolute path to reply JSON, for example /task/output/reply.json.'
      },
      data: {
        type: 'object',
        description: 'Inline reply data. Prefer dataPath for normal use.'
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
          serverInfo: { name: 't3-html-replies', version: '1.2.2' },
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
        const args = params.arguments ?? {};
        if (!args || typeof args !== 'object' || Array.isArray(args)) throw Error('arguments must be one JSON object.');
        const extra = Object.keys(args).filter((key) => !['data', 'dataPath'].includes(key));
        if (extra.length) throw Error('render_reply has unsupported arguments: ' + extra.join(', ') + '.');
        const data = await resolveData(args);
        const html = await renderReply(data);
        result(id, {
          content: [{ type: 'text', text: 'T3 displays this tool result as the reply. Do not repeat its HTML or text in chat or call html_render for it. If the turn is complete, leave the final message empty.' }],
          structuredContent: { status: 'rendered' },
          _meta: { html }
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
