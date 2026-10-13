// Fixed destination: callers cannot select a server or reach local administration.
const UPSTREAM='https://returns-darkness-realm.oblique-tactical.workers.dev/';
const ORIGIN='https://returns-from-darkness.vercel.app';
const reads=new Set(['health','state']);
const writes=new Set(['login','register','channel','chat','rooms/create','rooms/join','rooms/leave','logout','native/connect','launch','auth/handoff','auth/redeem']);
module.exports=async function realm(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const route=req.query.route;
 if(typeof route!=='string'||!(req.method==='GET'?reads:req.method==='POST'?writes:new Set()).has(route)){res.status(404).json({error:'Operação indisponível.'});return;}
 if(req.method==='POST'&&req.headers.origin!==ORIGIN){res.status(403).json({error:'Origem não autorizada.'});return;}
 const body=req.method==='POST'?JSON.stringify(req.body||{}):undefined;
 if(body&&Buffer.byteLength(body)>8192){res.status(413).json({error:'Solicitação acima do limite.'});return;}
 const authorization=req.headers.authorization||'Bearer logged-out';
 if(typeof authorization!=='string'||authorization.length>128){res.status(401).json({error:'Entre em sua conta.'});return;}
 try{
  const upstream=await fetch(UPSTREAM+(route==='health'?'health':'api/'+route),{method:req.method,headers:{Origin:ORIGIN,Authorization:authorization,...(body?{'Content-Type':'application/json'}:{})},body,redirect:'error',signal:AbortSignal.timeout(12000)});
  if(!upstream.headers.get('content-type')?.includes('application/json'))throw Error('Invalid upstream response');
  const text=await upstream.text();if(Buffer.byteLength(text)>262144)throw Error('Response exceeds limit');
  res.status(upstream.status).setHeader('Content-Type','application/json; charset=utf-8');res.end(text);
 }catch(error){console.error('Realm proxy unavailable',error.name);res.status(503).json({error:'Servidor indisponível'});}
};
