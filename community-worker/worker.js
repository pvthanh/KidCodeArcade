import { validateCommunityLevel } from '../src/core/CommunityLevel.js';

const ORIGINS = new Set(['https://pvthanh.github.io', 'http://localhost:3000', 'http://127.0.0.1:3000']);
const MAX_BYTES = 512 * 1024;
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function response(data, status, origin) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Vary': 'Origin' };
  if (ORIGINS.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(JSON.stringify(data), { status, headers });
}

async function readJson(request) {
  if (!request.body) throw new TypeError('Request body is required.');
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new RangeError('Level exceeds the 512 KB limit.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

const validName = (value, max) => typeof value === 'string' && value === value.trim() &&
  value.length >= 1 && value.length <= max && !/[\u0000-\u001f\u007f-\u009f]/.test(value);

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      if (!ORIGINS.has(origin)) return response({ error: 'Origin not allowed.' }, 403, origin);
      return new Response(null, { status: 204, headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600',
        'Vary': 'Origin'
      } });
    }
    if (origin && !ORIGINS.has(origin)) return response({ error: 'Origin not allowed.' }, 403, origin);
    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip) return response({ error: 'Unable to verify request.' }, 400, origin);
    try {
      const limiter = request.method === 'POST' ? env.WRITE_LIMIT : env.READ_LIMIT;
      if (!(await limiter.limit({ key: ip })).success) {
        return response({ error: 'Too many requests. Please try again later.' }, 429, origin);
      }
      if (request.method === 'GET' && url.pathname === '/levels') {
        const cursor = url.searchParams.get('before');
        if (cursor && !/^\d{1,15}:[0-9a-f-]{36}$/i.test(cursor)) {
          return response({ error: 'Invalid page cursor.' }, 400, origin);
        }
        const [timestamp, id] = cursor ? cursor.split(':') : [String(Date.now() + 1), ''];
        const result = await env.DB.prepare(
          'SELECT id, title, author, created_at FROM levels WHERE created_at < ? OR (created_at = ? AND id < ?) ORDER BY created_at DESC, id DESC LIMIT 21'
        ).bind(Number(timestamp), Number(timestamp), id).all();
        const items = result.results.slice(0, 20);
        const last = items.at(-1);
        return response({ levels: items, next: result.results.length > 20 ? `${last.created_at}:${last.id}` : null }, 200, origin);
      }
      const match = url.pathname.match(/^\/levels\/([^/]+)$/);
      if (request.method === 'GET' && match && idPattern.test(match[1])) {
        const row = await env.DB.prepare('SELECT id, title, author, created_at, level FROM levels WHERE id = ?')
          .bind(match[1]).first();
        if (!row) return response({ error: 'Level not found.' }, 404, origin);
        return response({ ...row, level: JSON.parse(row.level) }, 200, origin);
      }
      if (request.method === 'POST' && url.pathname === '/levels') {
        if (!ORIGINS.has(origin)) return response({ error: 'Origin not allowed.' }, 403, origin);
        if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
          return response({ error: 'Expected JSON.' }, 415, origin);
        }
        let body;
        try {
          body = await readJson(request);
          if (!body || Object.keys(body).some(key => !['title', 'author', 'level'].includes(key)) ||
            !validName(body.title, 60) || !validName(body.author, 40)) throw new TypeError('Enter a title and nickname.');
          validateCommunityLevel(body.level);
        } catch (error) {
          if (error instanceof SyntaxError || error instanceof TypeError || error instanceof RangeError) {
            return response({ error: error.message }, error instanceof RangeError ? 413 : 400, origin);
          }
          throw error;
        }
        const id = crypto.randomUUID();
        await env.DB.prepare('INSERT INTO levels (id, title, author, level, created_at) VALUES (?, ?, ?, ?, ?)')
          .bind(id, body.title, body.author, JSON.stringify(body.level), Date.now()).run();
        return response({ id }, 201, origin);
      }
      return response({ error: 'Not found.' }, 404, origin);
    } catch (error) {
      console.error('Community library request failed:', error);
      return response({ error: 'The library is unavailable. Please try again later.' }, 503, origin);
    }
  }
};
