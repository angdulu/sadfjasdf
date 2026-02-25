import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_API_BASE = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
}

function buildPrompt(sourceText) {
    return [
        '아래 텍스트를 성분표로 보고 분석해줘.',
        '반드시 JSON으로만 응답하고 아래 형식을 지켜줘.',
        '{',
        '  "summary": "한 줄 요약",',
        '  "ingredients": [',
        '    {"name":"성분명","role":"역할","risk":"낮음|중간|높음|불명","notes":"주의사항"}',
        '  ],',
        '  "watchouts": ["주의 성분 또는 알레르기 포인트"],',
        '  "confidence": "낮음|중간|높음",',
        '  "disclaimer": "의학적 진단 대체 불가"',
        '}',
        '',
        '분석할 텍스트:',
        sourceText
    ].join('\n');
}

async function handleAnalyze(req, res) {
    if (!OPENAI_API_KEY) {
        sendJson(res, 500, { error: { message: 'OPENAI_API_KEY is not configured on server.' } });
        return;
    }

    let rawBody = '';
    req.on('data', (chunk) => {
        rawBody += chunk;
        if (rawBody.length > 2_000_000) {
            req.destroy();
        }
    });

    await new Promise((resolve, reject) => {
        req.on('end', resolve);
        req.on('error', reject);
    }).catch(() => null);

    let payload;
    try {
        payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
        sendJson(res, 400, { error: { message: 'Invalid JSON body.' } });
        return;
    }

    const sourceText = String(payload?.sourceText || '').trim();
    const model = String(payload?.model || DEFAULT_MODEL).trim();
    if (!sourceText) {
        sendJson(res, 400, { error: { message: 'sourceText is required.' } });
        return;
    }
    if (!model) {
        sendJson(res, 400, { error: { message: 'model is required.' } });
        return;
    }

    const upstream = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model,
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: 'You are a cosmetic ingredient analysis assistant. Return strict JSON only. Output language must be Korean.'
                },
                {
                    role: 'user',
                    content: buildPrompt(sourceText)
                }
            ]
        })
    }).catch((error) => ({ ok: false, status: 502, text: async () => JSON.stringify({ error: { message: error.message } }) }));

    const rawText = await upstream.text().catch(() => '');
    let responseJson = {};
    try {
        responseJson = rawText ? JSON.parse(rawText) : {};
    } catch {
        responseJson = {};
    }

    if (!upstream.ok) {
        const message = responseJson?.error?.message || rawText || `Upstream HTTP ${upstream.status}`;
        sendJson(res, upstream.status || 500, { error: { message } });
        return;
    }
    sendJson(res, upstream.status || 200, responseJson);
}

async function serveStatic(req, res) {
    const requestedPath = req.url === '/' ? '/index.html' : req.url;
    const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(__dirname, safePath);
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    try {
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const content = await fs.readFile(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
    }
}

const server = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/api/analyze') {
        await handleAnalyze(req, res);
        return;
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
        await serveStatic(req, res);
        return;
    }
    res.writeHead(405, { Allow: 'GET, HEAD, POST' });
    res.end('Method Not Allowed');
});

server.listen(PORT, () => {
    const keyConfigured = OPENAI_API_KEY ? 'yes' : 'no';
    console.log(`Risk Radar server listening on http://localhost:${PORT} (OPENAI_API_KEY configured: ${keyConfigured})`);
});
