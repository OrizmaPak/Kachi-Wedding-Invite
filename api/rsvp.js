import { timingSafeEqual, randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { get, list, put } from '@vercel/blob';

const RSVP_PREFIX = 'wedding-rsvps/';
const LOCAL_DIRECTORY = path.join(process.cwd(), 'data', 'rsvp-responses');

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(body));
}

function safeEqual(left = '', right = '') {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

async function readJson(request) {
  if (request.body && typeof request.body === 'object') return request.body;
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 20_000) throw new Error('Request is too large.');
  }
  return body ? JSON.parse(body) : {};
}

function cleanSingleLine(value, maximum) {
  return String(value || '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, maximum);
}

function cleanMessage(value) {
  return String(value || '').replace(/\r\n?/g, '\n').trim().slice(0, 1000);
}

function formatResponse({ fullName, attendance, message, submittedAt }) {
  return [
    'GINIKACHI & GODWIN — WEDDING RSVP',
    `Submitted: ${submittedAt}`,
    `Full name: ${fullName}`,
    `Attendance: ${attendance}`,
    '',
    'Message to the couple:',
    message || '(No message included)',
    '',
  ].join('\n');
}

async function saveTextFile(filename, content) {
  if (!process.env.VERCEL) {
    await mkdir(LOCAL_DIRECTORY, { recursive: true });
    await writeFile(path.join(LOCAL_DIRECTORY, filename), content, 'utf8');
    return;
  }

  await put(`${RSVP_PREFIX}${filename}`, content, {
    access: 'private',
    addRandomSuffix: false,
    contentType: 'text/plain; charset=utf-8',
  });
}

async function readStoredResponses() {
  if (!process.env.VERCEL) {
    await mkdir(LOCAL_DIRECTORY, { recursive: true });
    const filenames = (await readdir(LOCAL_DIRECTORY)).filter((name) => name.endsWith('.txt')).sort().reverse();
    return Promise.all(filenames.map(async (filename) => ({
      pathname: filename,
      submittedAt: filename.slice(0, 24).replaceAll('_', ':'),
      content: await readFile(path.join(LOCAL_DIRECTORY, filename), 'utf8'),
    })));
  }

  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix: RSVP_PREFIX, limit: 1000, cursor });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  return Promise.all(blobs.map(async (blob) => {
    const result = await get(blob.url, { access: 'private', useCache: false });
    return {
      pathname: blob.pathname,
      submittedAt: blob.uploadedAt.toISOString(),
      content: result?.statusCode === 200 ? await new Response(result.stream).text() : '',
    };
  }));
}

function isAuthorized(request) {
  const configuredPassword = process.env.RSVP_ADMIN_PASSWORD || (!process.env.VERCEL ? 'preview' : '');
  return Boolean(configuredPassword) && safeEqual(request.headers['x-admin-password'], configuredPassword);
}

export default async function handler(request, response) {
  try {
    if (request.method === 'POST') {
      const body = await readJson(request);
      if (body.website) return sendJson(response, 200, { ok: true });

      const fullName = cleanSingleLine(body.fullName, 100);
      const attendance = cleanSingleLine(body.attendance, 50);
      const message = cleanMessage(body.message);
      const allowedAttendance = ['Yes, I’ll be there', 'I won’t be able to attend'];
      if (fullName.length < 2) return sendJson(response, 400, { error: 'Please enter your full name.' });
      if (!allowedAttendance.includes(attendance)) return sendJson(response, 400, { error: 'Please choose whether you will attend.' });

      const submittedAt = new Date().toISOString();
      const filename = `${submittedAt.replaceAll(':', '_')}-${randomUUID()}.txt`;
      await saveTextFile(filename, formatResponse({ fullName, attendance, message, submittedAt }));
      return sendJson(response, 201, { ok: true });
    }

    if (request.method === 'GET') {
      if (!isAuthorized(request)) return sendJson(response, 401, { error: 'The password is incorrect.' });
      const responses = await readStoredResponses();
      return sendJson(response, 200, { responses });
    }

    response.setHeader('Allow', 'GET, POST');
    return sendJson(response, 405, { error: 'Method not allowed.' });
  } catch (error) {
    console.error(error);
    const configurationError = process.env.VERCEL && (error?.message || '').match(/token|store|blob/i);
    return sendJson(response, 500, {
      error: configurationError
        ? 'RSVP storage is not connected yet. Please contact the couple.'
        : 'We could not save this response. Please try again.',
    });
  }
}
