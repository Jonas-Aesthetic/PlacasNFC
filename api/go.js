const db=require('../lib/db.js'),old=require('./redirect.js');
const pg=(res,s,t,m)=>{res.statusCode=s;res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>${t}</title><body style="font-family:system-ui;background:#fff;color:#0f172a;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px"><div><h1 style="font-size:22px">${t}</h1><p style="color:#64748b">${m}</p><b style="color:#2563eb">VyntraTags</b></div>`)};
module.exports=async(req,res)=>{
 const q=req.query||{},code=String(q.code||'').trim().toLowerCase();
 if(!db.on||q.info!==undefined)return old(req,res);
 if(!/^[a-z0-9]{4,12}$/.test(code))return pg(res,404,'Link inválido','Esse endereço não existe.');
 try{
  const[raw]=await db.pipe([['HGET','placas',code]]);
  if(!raw)return pg(res,404,'Placa não encontrada','Não encontramos essa placa.');
  const p=JSON.parse(raw),fx=x=>{x=String(x||'').trim();if(!x)return null;try{const u=new URL(/^[a-z][a-z0-9+.-]*:/i.test(x)?x:'https://'+x);return/^https?:$/.test(u.protocol)?u.toString():null}catch(_){return null}};
  const L=p.modo==='pagina'?String(p.links||'').split('\n').map(l=>l.split('|')).map(a=>[(a[0]||'').trim(),fx(a[1])]).filter(a=>a[0]&&a[1]):[],d=fx(p.destino);
  if(p.bloq)return pg(res,403,'Placa bloqueada','Esta placa está temporariamente indisponível.');
  if(!d&&!L.length){res.statusCode=302;res.setHeader('Location','/ativar?c='+code);res.setHeader('Cache-Control','no-store');return res.end()}
  try{await db.pipe([['HINCRBY','scans',code,1],['HSET','last',code,Date.now()],['HINCRBY','dias',new Date().toISOString().slice(0,10),1],...(q.o==='n'?[['HINCRBY','nfc',code,1]]:[])])}catch(_){}
  if(L.length){const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),cor=/^#[0-9a-f]{6}$/i.test(p.cor||'')?p.cor:'#2563eb';
   res.statusCode=200;res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');
   return res.end(`<!doctype html><html lang=pt-BR><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>${e(p.titulo||p.estab||'Links')}</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#f8fafc;color:#0f172a;font-family:system-ui,sans-serif;padding:24px"><main style="width:min(420px,100%);text-align:center"><h1 style="font-size:24px;margin:0 0 24px">${e(p.titulo||p.estab||'')}</h1>${L.map(([t,u])=>`<a href="${e(u)}" style="display:block;background:${cor};color:#fff;text-decoration:none;font-weight:600;padding:16px;border-radius:14px;margin-bottom:12px">${e(t)}</a>`).join('')}<b style="color:#2563eb">VyntraTags</b></main>`)}
  res.statusCode=302;res.setHeader('Location',d);res.setHeader('Cache-Control','no-store');res.end();
 }catch(e){console.error(e);return old(req,res)}
};
