const db=require('../lib/db.js'),cr=require('crypto'),K=process.env.INFO_KEY||'';
const sign=e=>cr.createHmac('sha256',K).update(String(e)).digest('hex');
const eq=(a,b)=>{a=Buffer.from(a);b=Buffer.from(b);return a.length===b.length&&cr.timingSafeEqual(a,b)};
const authed=r=>{const m=/(?:^|; )s=(\d+)\.([a-f0-9]+)/.exec(r.headers.cookie||'');return!!(m&&K&&+m[1]>Date.now()&&eq(m[2],sign(m[1])))};
const out=(res,s,o)=>{res.statusCode=s;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(o))};
const hm=r=>{const o={};for(let i=0;i<(r||[]).length;i+=2)o[r[i]]=r[i+1];return o};
module.exports=async(req,res)=>{
 if(req.method!=='POST')return out(res,405,{error:'método'});
 const b=req.body&&typeof req.body==='object'?req.body:{},a=b.action;
 try{
 if(a==='login'){
  if(!K)return out(res,500,{error:'INFO_KEY não configurada'});
  const ip=String(req.headers['x-forwarded-for']||'x').split(',')[0].trim();
  if(db.on){const[n]=await db.pipe([['INCR','rl:'+ip],['EXPIRE','rl:'+ip,900]]);if(n>10)return out(res,429,{error:'Muitas tentativas. Aguarde 15 min.'})}
  if(!eq(String(b.password||''),K))return out(res,401,{error:'Senha incorreta'});
  const e=Date.now()+432e5;res.setHeader('Set-Cookie',`s=${e}.${sign(e)}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=43200`);return out(res,200,{ok:1});
 }
 if(!authed(req))return out(res,401,{error:'auth'});
 if(a==='logout'){res.setHeader('Set-Cookie','s=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0');return out(res,200,{ok:1})}
 if(!db.on)return out(res,200,{redis:false});
 if(a==='import'){const sd=require('../data/placas.json');await db.pipe(sd.map(([k,n,m])=>['HSETNX','placas',k,JSON.stringify({n,modelo:m,destino:'',estab:'',obs:''})]));return out(res,200,{ok:1,total:sd.length})}
 if(a==='batch'){const it=(b.items||[]).slice(0,2000);if(!it.length||it.some(r=>!Array.isArray(r)||!/^[a-z0-9]{4,12}$/.test(r[0])))return out(res,400,{error:'Arquivo inválido: use codigo,modelo'});
  const ex=await db.pipe(it.map(r=>['HEXISTS','placas',r[0]]));
  await db.pipe(it.map(([k,n,m])=>['HSETNX','placas',k,JSON.stringify({n:+n||0,modelo:String(m||'Sem modelo').slice(0,80),destino:'',estab:'',obs:''})]));
  const dup=ex.filter(Boolean).length;return out(res,200,{ok:1,added:it.length-dup,dup})}
 if(a==='pedido'){const G='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',q=Math.min(Math.max(parseInt(b.qtd)||0,1),10000),id='p'+Date.now().toString(36);let pin='';
  for(let t=0;t<5&&!pin;t++){const c=Array.from({length:8},()=>G[cr.randomInt(32)]).join(''),[k]=await db.pipe([['HSETNX','pins',c,id]]);if(k)pin=c}
  if(!pin)return out(res,500,{error:'Falha ao gerar PIN'});const o={id,cliente:String(b.cliente||'').trim().slice(0,120)||'Sem nome',contato:String(b.contato||'').trim().slice(0,120),qtd:q,pin,criado:Date.now(),ativo:true};
  await db.pipe([['HSET','pedidos',id,JSON.stringify(o)]]);return out(res,200,{pedido:{...o,usadas:0}})}
 if(a==='pedidos'){const[P,U]=await db.pipe([['HGETALL','pedidos'],['HGETALL','pusados']]),u=hm(U);return out(res,200,{items:Object.values(hm(P)).map(x=>{const o=JSON.parse(x);return{...o,usadas:+u[o.id]||0}}).sort((x,y)=>y.criado-x.criado)})}
 if(a==='pedido_edit'||a==='pedido_pin'){const[r]=await db.pipe([['HGET','pedidos',String(b.id)]]);if(!r)return out(res,404,{error:'Pedido não encontrado'});const o=JSON.parse(r),f=b.fields||{},cm=[];
  if(a==='pedido_edit'){if(typeof f.cliente==='string')o.cliente=f.cliente.slice(0,120);if(typeof f.contato==='string')o.contato=f.contato.slice(0,120);if(+f.qtd>0)o.qtd=Math.min(+f.qtd,10000);if(typeof f.ativo==='boolean')o.ativo=f.ativo}
  else{const G='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',np=Array.from({length:8},()=>G[cr.randomInt(32)]).join('');cm.push(['HDEL','pins',o.pin],['HSET','pins',np,o.id]);o.pin=np}
  cm.push(['HSET','pedidos',o.id,JSON.stringify(o)]);await db.pipe(cm);return out(res,200,{ok:1,pedido:o})}
 if(a==='del'){const cs=[].concat(b.codes||[]);if(!cs.length||cs.some(c=>!/^[a-z0-9]{4,12}$/.test(c)))return out(res,400,{error:'código inválido'});await db.pipe([['HDEL','placas',...cs],['HDEL','scans',...cs],['HDEL','last',...cs],['HDEL','nfc',...cs]]);return out(res,200,{ok:1})}
 if(a==='list'){const[p,s,l,nf,dg]=await db.pipe([['HGETALL','placas'],['HGETALL','scans'],['HGETALL','last'],['HGETALL','nfc'],['HGETALL','dias']]);const P=hm(p),S=hm(s),L=hm(l),N=hm(nf);
  return out(res,200,{redis:true,dias:hm(dg),items:Object.keys(P).map(k=>({code:k,...JSON.parse(P[k]),scans:+S[k]||0,nfc:+N[k]||0,last:+L[k]||0})).sort((x,y)=>x.n-y.n)})}
 if(a==='save'){const cs=[].concat(b.codes||b.code||[]),f=b.fields||{};
  if(!cs.length||cs.some(c=>!/^[a-z0-9]{4,12}$/.test(c)))return out(res,400,{error:'código inválido'});
  const cur=await db.pipe(cs.map(c=>['HGET','placas',c])),cm=[];
  cs.forEach((c,i)=>{if(!cur[i])return;const o=JSON.parse(cur[i]);if(f.owner===''&&o.owner)cm.push(['HINCRBY','pusados',o.owner,-1],['SREM','pl:'+o.owner,c]);o.rev='';for(const k of['destino','estab','obs','modelo','titulo','cor','links','modo','owner','bloq'])if(typeof f[k]==='string')o[k]=f[k].trim().slice(0,k=='links'?2000:500);if(+f.n>0)o.n=+f.n;o.upd=Date.now();cm.push(['HSET','placas',c,JSON.stringify(o)])});
  if(cm.length)await db.pipe(cm);return out(res,200,{ok:1,n:cm.length})}
 }catch(e){return out(res,500,{error:String(e.message||e)})}
 out(res,400,{error:'ação inválida'});
};
