// Redireciona /r/<codigo> para o destino cadastrado na planilha (Google Planilhas publicada como CSV).
// Variavel de ambiente necessaria: SHEET_CSV_URL

let cache = { at: 0, rows: null };
const CACHE_MS = 30 * 1000;

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

async function loadRows() {
  if (cache.rows && Date.now() - cache.at < CACHE_MS) return cache.rows;
  const url = process.env.SHEET_CSV_URL;
  if (!url) throw new Error('SHEET_CSV_URL nao configurada');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    if (!r.ok) throw new Error('Planilha respondeu ' + r.status);
    const rows = parseCSV(await r.text());
    cache = { at: Date.now(), rows };
    return rows;
  } catch (e) {
    if (cache.rows) return cache.rows;
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function cleanDestination(raw) {
  let d = String(raw || '').trim();
  if (!d) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(d)) d = 'https://' + d;
  try {
    const u = new URL(d);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.toString();
  } catch (_) {
    return null;
  }
}

const crypto = require('crypto');
function keyOk(given) {
  const key = process.env.INFO_KEY || '';
  if (!key || typeof given !== 'string' || !given) return false;
  const a = Buffer.from(given), b = Buffer.from(key);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function page(res, status, title, msg) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{font-family:system-ui,sans-serif;background:#111827;color:#f9fafb;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px;text-align:center}main{max-width:420px}h1{font-size:22px;margin:0 0 12px}p{color:#d1d5db;line-height:1.5}</style></head><body><main><h1>${esc(title)}</h1><p>${msg}</p></main></body></html>`);
}

module.exports = async (req, res) => {
  const code = String((req.query && req.query.code) || '').trim().toLowerCase();
  if (!/^[a-z0-9]{4,12}$/.test(code)) return page(res, 404, 'Link inválido', 'Esse endereço não existe.');
  try {
    const rows = await loadRows();
    const header = (rows[0] || []).map(norm);
    const ci = header.indexOf('codigo');
    const di = header.indexOf('destino');
    if (ci < 0 || di < 0) return page(res, 500, 'Configuração incompleta', 'A planilha precisa ter as colunas "Código" e "Destino".');
    const row = rows.slice(1).find((r) => norm(r[ci]) === code);
    if (!row) return page(res, 404, 'Placa não encontrada', 'Não encontramos essa placa.');
    const dest = cleanDestination(row[di]);
    const ei = header.indexOf('estabelecimento');
    if (req.query && req.query.info !== undefined && keyOk(req.query.info)) {
      const nome = ei >= 0 ? String(row[ei] || '').trim() : '';
      res.setHeader('X-Robots-Tag', 'noindex');
      return page(res, 200, 'Consulta da placa',
        `Código: <b>${esc(code)}</b><br>Status: <b>${dest ? 'ativa' : 'livre (sem destino)'}</b><br>Estabelecimento: <b>${nome ? esc(nome) : '—'}</b><br>Destino: ${dest ? `<a style="color:#93c5fd" href="${esc(dest)}">${esc(dest)}</a>` : '—'}`);
    }
    if (!dest) return page(res, 200, 'Placa ainda não ativada', `Esta placa (<b>${esc(code)}</b>) ainda não foi vinculada a um estabelecimento.`);
    res.statusCode = 302;
    res.setHeader('Location', dest);
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    res.end();
  } catch (e) {
    console.error(e);
    return page(res, 503, 'Tente novamente', 'Não conseguimos abrir esse link agora. Tente de novo em instantes.');
  }
};
