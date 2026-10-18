import {
  handleHealth,
  handleInterpret,
  handleTeach,
  handleSolveMath,
  handleCheckPractice,
} from '../server/service';

function sendJson(res: any, status: number, body: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function getRequestBody(req: any): Promise<any> {
  if (req.body) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    return req.body;
  }

  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: any) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => {
      resolve({});
    });
  });
}

export default async function handler(req: any, res: any) {
  // Global CORS & preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const rawUrl = req.url || '/';
  const url = new URL(rawUrl, `http://${req.headers?.host || 'localhost'}`);

  // Resolve path from explicit query parameter (from vercel.json rewrite), x-matched-path header, or raw pathname
  let pathname = url.searchParams.get('endpoint') || '';
  if (!pathname && typeof req.headers?.['x-matched-path'] === 'string') {
    pathname = req.headers['x-matched-path'];
  }
  if (!pathname) {
    pathname = url.pathname;
  }

  // Normalize: ensure leading slash and strip /api prefix
  if (!pathname.startsWith('/')) {
    pathname = '/' + pathname;
  }
  pathname = pathname.replace(/^\/api/, '') || '/';

  // Health check
  if (req.method === 'GET' && (pathname === '/health' || pathname === '/' || pathname === '/api')) {
    const result = handleHealth();
    sendJson(res, result.status, result.body);
    return;
  }

  if (req.method === 'POST') {
    const body = await getRequestBody(req);

    if (pathname === '/math/solve') {
      const result = await handleSolveMath(body);
      sendJson(res, result.status, result.body);
      return;
    }

    if (pathname === '/math/check-practice') {
      const result = await handleCheckPractice(body);
      sendJson(res, result.status, result.body);
      return;
    }

    if (pathname === '/interpret') {
      const result = await handleInterpret(body);
      sendJson(res, result.status, result.body);
      return;
    }

    if (pathname === '/teach') {
      const result = await handleTeach(body);
      sendJson(res, result.status, result.body);
      return;
    }
  }

  sendJson(res, 404, {
    error: 'not_found',
    message: `API route ${req.method} ${pathname} not found`,
  });
}
