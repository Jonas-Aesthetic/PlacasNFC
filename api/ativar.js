const db=require('../lib/db.js');
const out=(res,s,o)=>{res.statusCode=s;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(o))};
const fx=x=>{x=String(x||'').trim();if(!x)return'';try{const u=new URL(/^[a-z][a-z0-9+.-]*:/i.test(x)?x:'https://'+x);return/^https?:$/.test(u.protocol)?u.toString():''}catch(_){return''}};
module.exports=async(req,res)=>{
 if(req.method!=='POST'||!db.on)return out(res,400,{error:'Indisponível'});
 const b=req.body&&typeof req.body==='object'?req.body:{},a=b.action,code=String(b.code||'').toLowerCase(),pin=String(b.pin||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 try{
  const ip=String(req.headers['x-forwarded-for']||'x').split(',')[0].trim(),[n]=await db.pipe([['INCR','rla:'+ip],['EXPIRE','rla:'+ip,900]]);
  if(n>40)return out(res,429,{error:'Muitas tentativas. Aguarde 15 minutos.'});
  const ok=/^[a-z0-9]{4,12}$/.test(code);
  if(a==='info'){const[r]=ok?await db.pipe([['HGET','placas',code]]):[null];if(!r)return out(res,404,{error:'Placa não encontrada'});const p=JSON.parse(r);return out(res,200,{livre:!p.destino&&!(p.modo==='pagina'&&p.links),bloq:!!p.bloq})}
  const[oid]=pin?await db.pipe([['HGET','pins',pin]]):[null];if(!oid)return out(res,401,{error:'PIN inválido'});
  const[ro,us,cs]=await db.pipe([['HGET','pedidos',oid],['HGET','pusados',oid],['SMEMBERS','pl:'+oid]]),o=JSON.parse(ro),used=+us||0;
  if(o.ativo===false)return out(res,403,{error:'Este PIN foi cancelado'});
  const mine=async()=>{const rs=cs.length?await db.pipe(cs.map(c=>['HGET','placas',c])):[];return rs.filter(Boolean).map((r,i)=>{const p=JSON.parse(r);return{code:cs[i],estab:p.estab||'',destino:p.destino||'',modo:p.modo||'direto',titulo:p.titulo||'',links:p.links||''}})};
  if(a==='minhas')return out(res,200,{cliente:o.cliente,qtd:o.qtd,usadas:used,items:await mine()});
  if(a!=='ativar'&&a!=='editar')return out(res,400,{error:'Ação inválida'});
  if(!ok)return out(res,400,{error:'Código inválido'});
  const[r]=await db.pipe([['HGET','placas',code]]);if(!r)return out(res,404,{error:'Placa não encontrada'});
  const p=JSON.parse(r),f=b.fields||{},livre=!p.destino&&!(p.modo==='pagina'&&p.links);
  if(p.bloq)return out(res,403,{error:'Placa bloqueada'});
  const nv={destino:fx(f.destino),estab:String(f.estab||'').trim().slice(0,120),modo:f.modo==='pagina'?'pagina':'direto',titulo:String(f.titulo||'').trim().slice(0,120),links:String(f.links||'').slice(0,2000)};
  if(!nv.destino&&!(nv.modo==='pagina'&&nv.links.trim()))return out(res,400,{error:'Informe um link válido'});
  const cm=[];
  if(a==='ativar'){if(!livre)return out(res,409,{error:'Esta placa já está ativada'});if(used>=o.qtd)return out(res,403,{error:'Todas as placas deste pedido já foram ativadas'});cm.push(['HINCRBY','pusados',oid,1],['SADD','pl:'+oid,code])}
  else if(p.owner!==oid)return out(res,403,{error:'Esta placa não pertence ao seu pedido'});
  cm.unshift(['HSET','placas',code,JSON.stringify({...p,...nv,owner:oid,rev:'1',upd:Date.now()})]);await db.pipe(cm);
  return out(res,200,{ok:1,usadas:used+(a==='ativar'?1:0),qtd:o.qtd});
 }catch(e){console.error(e);return out(res,500,{error:'Erro interno'})}
};
