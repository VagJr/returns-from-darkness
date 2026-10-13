import {digest,equal,random,passwordKey,validUser,validToken,validRoom,validateSignal} from './security.mjs';
const TTL=180000,SESSION=5400000,CHANNELS=['Tristram','Procurando Grupo','Comercio','Arena'];
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
async function body(req,limit=8192){const text=await req.text();if(text.length>limit)fail('Mensagem acima do limite.',413);try{return JSON.parse(text||'{}');}catch{fail('Mensagem inválida.');}}
function bearer(req){const value=req.headers.get('Authorization')||'';return /^Bearer [A-Za-z0-9_-]{43}$/.test(value)?value.slice(7):'';}
const roomStub=(env,id)=>env.SIGNALS.get(env.SIGNALS.idFromName(id));
const community=env=>env.COMMUNITY.get(env.COMMUNITY.idFromName('realm-v1'));
const call=(stub,path,input)=>stub.fetch(new Request('https://internal'+path,{method:'POST',body:JSON.stringify(input)}));
const publicRoom=r=>({id:r.id,name:r.name,creator:r.creator,mode:r.mode,difficulty:r.difficulty,capacity:4,locked:!!r.passwordHash,contentHash:r.contentHash,players:r.members.map(m=>({user:m.user,slot:m.slot,connected:(r.connected||[]).includes(m.slot)})),createdAt:r.createdAt,hostReady:(r.connected||[]).includes(0)});

export default {
  async fetch(req,env) {
    const url=new URL(req.url),origin=req.headers.get('Origin');
    if(origin&&origin!==env.SITE_ORIGIN)return json({error:'Origem não autorizada.'},403);
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':env.SITE_ORIGIN,'Access-Control-Allow-Methods':'GET, POST','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600'}});
    let result;
    try {
      const signal=/^\/signal\/([a-f0-9-]{36})(\/bootstrap)?$/.exec(url.pathname);
      if(signal){if((signal[2]&&req.method!=='POST')||(!signal[2]&&req.headers.get('Upgrade')!=='websocket'))return json({error:'Rota indisponível.'},404);result=await roomStub(env,signal[1]).fetch(req);}
      else if(url.pathname==='/health'||/^\/api\/(login|register|state|channel|chat|rooms\/(create|join|leave)|logout|launch|native\/connect)$/.test(url.pathname))result=await community(env).fetch(req);
      else if(url.pathname==='/migration'&&env.MIGRATION_ENABLED==='true'&&env.MIGRATION_TOKEN&&equal(req.headers.get('Authorization'), 'Bearer '+env.MIGRATION_TOKEN))result=await community(env).fetch(req);
      else return json({error:'Rota indisponível.'},404);
    }catch(error){result=json({error:error.status?error.message:'Não foi possível concluir a operação.'},error.status||503);}
    if(result.status===101)return result;
    const response=new Response(result.body,result);response.headers.set('Access-Control-Allow-Origin',env.SITE_ORIGIN);response.headers.set('Vary','Origin');return response;
  }
};

export class Community {
  constructor(ctx,env) {
    this.ctx=ctx;this.env=env;this.sql=ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS accounts (name TEXT PRIMARY KEY, display TEXT NOT NULL, salt TEXT NOT NULL, verifier TEXT NOT NULL, scheme TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, user TEXT NOT NULL, channel TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, record TEXT NOT NULL, updated INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, channel TEXT NOT NULL, user TEXT NOT NULL, text TEXT NOT NULL, at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, until INTEGER NOT NULL);`);
  }
  rows(query,...args){return this.sql.exec(query,...args).toArray();}
  async limit(key,max,window=60000){const now=Date.now(),r=this.rows('SELECT count,until FROM limits WHERE key=?',key)[0];if(r&&r.until>now&&r.count>=max)fail('Aguarde um instante.',429);this.sql.exec('INSERT OR REPLACE INTO limits VALUES (?,?,?)',key,r&&r.until>now?r.count+1:1,r&&r.until>now?r.until:now+window);}
  rooms(){return this.rows('SELECT record FROM rooms WHERE updated>?',Date.now()-TTL).map(r=>JSON.parse(r.record)).filter(r=>r.contentHash===this.env.CONTENT_HASH);}
  save(room){this.sql.exec('INSERT OR REPLACE INTO rooms VALUES (?,?,?)',room.id,JSON.stringify(room),room.updated);}
  async session(req){const token=bearer(req);if(!token)fail('Entre em sua conta.',401);const hash=await digest(token),s=this.rows('SELECT * FROM sessions WHERE hash=? AND expires>?',hash,Date.now())[0];if(!s)fail('Entre em sua conta.',401);if(s.expires<Date.now()+SESSION-900000)this.sql.exec('UPDATE sessions SET expires=? WHERE hash=?',Date.now()+SESSION,hash);return s;}
  async leave(user,room){
    if(room.creator.toLowerCase()===user.toLowerCase()){await call(roomStub(this.env,room.id),'/internal/close',{});this.sql.exec('DELETE FROM rooms WHERE id=?',room.id);}
    else{room.members=room.members.filter(m=>m.user.toLowerCase()!==user.toLowerCase());await call(roomStub(this.env,room.id),'/internal/members',{members:room.members});room.connected=(room.connected||[]).filter(slot=>room.members.some(m=>m.slot===slot));this.save(room);}
  }
  async fetch(req){
    if(req.method==='POST'&&new URL(req.url).pathname.startsWith('/api/rooms/'))return this.ctx.blockConcurrencyWhile(()=>this.handle(req));
    return this.handle(req);
  }
  async handle(req) {
    const path=new URL(req.url).pathname,now=Date.now();
    try {
      if(path==='/internal/heartbeat'){const input=await body(req);const row=this.rows('SELECT record FROM rooms WHERE id=?',input.id)[0];if(row){const room=JSON.parse(row.record);room.updated=now;room.connected=input.connected;this.save(room);}return json({ok:true});}
      if(path==='/internal/close'){const input=await body(req);this.sql.exec('DELETE FROM rooms WHERE id=?',input.id);return json({ok:true});}
      if(path==='/health'){const rooms=this.rooms();return json({service:'Returns from Darkness community',gatewayListening:true,lobbySessions:this.rows('SELECT COUNT(DISTINCT user) AS n FROM sessions WHERE expires>?',now)[0].n,rooms:rooms.length,connectedGamePlayers:rooms.reduce((n,r)=>n+(r.connected?.length||0),0),transport:'native-webrtc-host',playersPerRoom:4,contentHash:this.env.CONTENT_HASH,dependsOnLocalPc:false,turnRelayConfigured:false,cloudRelayFallback:true});}
      if(path==='/migration'){
        const input=await body(req,262144);if(!Array.isArray(input.accounts)||input.accounts.length>500)fail('Importação inválida.');let imported=0;
        for(const a of input.accounts){if(!validUser(a.name)||!/^[a-f0-9]{64}$/.test(a.verifier)||!/^[a-f0-9]{32}$/.test(a.salt)||a.scheme!=='legacy-pbkdf2')fail('Importação inválida.');if(this.rows('SELECT name FROM accounts WHERE name=?',a.name.toLowerCase()).length)continue;this.sql.exec('INSERT INTO accounts VALUES (?,?,?,?,?)',a.name.toLowerCase(),a.name,a.salt,a.verifier,a.scheme);imported++;}return json({imported});
      }
      if(['/api/login','/api/register'].includes(path)) {
        if(req.method!=='POST')fail('Método inválido.',405);const input=await body(req);
        const ip=await digest(req.headers.get('CF-Connecting-IP')||'proxy');await this.limit('auth:'+ip,12);
        if(!validUser(input.username)||typeof input.password!=='string'||!/^[\x21-\x7e]{8,64}$/.test(input.password))fail('Use uma conta válida e uma senha de 8 a 64 caracteres.');
        const name=input.username.toLowerCase();let account=this.rows('SELECT * FROM accounts WHERE name=?',name)[0];
        if(path==='/api/register'){
          if(account)fail('Conta já existe.',409);if(this.rows('SELECT COUNT(*) AS n FROM accounts')[0].n>=10000)fail('Limite de contas atingido.',429);
          const salt=random(16),verifier=await passwordKey(input.password,salt);account={name,display:input.username,salt,verifier,scheme:'pbkdf2'};
          // Unique constraint also protects simultaneous registration attempts.
          this.sql.exec('INSERT INTO accounts VALUES (?,?,?,?,?)',name,input.username,salt,verifier,'pbkdf2');
        } else {
          const candidate=await passwordKey(input.password,account?.salt||'missing-account-salt',account?.scheme||'pbkdf2');
          if(!account||!equal(account.verifier,candidate))fail('Conta ou senha inválida.',401);
        }
        const token=random();this.sql.exec('INSERT INTO sessions VALUES (?,?,?,?)',await digest(token),account.display,'Tristram',now+SESSION);await this.ctx.storage.setAlarm(now+TTL);return json({username:account.display,sessionToken:token});
      }
      const s=await this.session(req),user=s.user;
      if(path==='/api/state'&&req.method==='GET'){
        const events=this.rows('SELECT user,text,at FROM messages WHERE channel=? ORDER BY id DESC LIMIT 100',s.channel).reverse().map(e=>({...e,type:5}));
        const users=this.rows('SELECT DISTINCT user FROM sessions WHERE channel=? AND expires>?',s.channel,now).map(r=>r.user);
        return json({username:user,channel:s.channel,channels:CHANNELS,users,events,rooms:this.rooms().map(publicRoom),contentHash:this.env.CONTENT_HASH,transport:'native-webrtc-host',clientVersion:this.env.CLIENT_VERSION,clientOpen:false});
      }
      if(req.method!=='POST')fail('Método inválido.',405);const input=await body(req);await this.limit('action:'+s.hash,40,10000);
      if(path==='/api/channel'){if(!CHANNELS.includes(input.channel))fail('Canal inválido.');this.sql.exec('UPDATE sessions SET channel=? WHERE hash=?',input.channel,s.hash);return json({ok:true});}
      if(path==='/api/chat') {await this.limit('chat:'+user.toLowerCase(),5,10000);if(typeof input.text!=='string'||input.text.trim().length<1||input.text.length>240||/[\x00-\x1f]/.test(input.text))fail('Mensagem inválida.');this.sql.exec('INSERT INTO messages(channel,user,text,at) VALUES (?,?,?,?)',s.channel,user,input.text.trim(),now);this.sql.exec('DELETE FROM messages WHERE channel=? AND id NOT IN (SELECT id FROM messages WHERE channel=? ORDER BY id DESC LIMIT 100)',s.channel,s.channel);return json({ok:true});}
      const current=this.rooms().find(r=>r.members.some(m=>m.user.toLowerCase()===user.toLowerCase()));
      if(path==='/api/logout'){this.sql.exec('DELETE FROM sessions WHERE hash=?',s.hash);if(!this.rows('SELECT hash FROM sessions WHERE user=? AND expires>?',user,now).length&&current&&!current.connected?.length)await this.leave(user,current);return json({ok:true});}
      if(path==='/api/rooms/create'){
        if(current)fail('Saia da sala atual antes de criar outra.');if(input.contentHash!==this.env.CONTENT_HASH)fail('Pacote de conteúdo incompatível.');
        if(typeof input.name!=='string'||input.name.trim().length<2||input.name.length>40||/[\x00-\x1f]/.test(input.name))fail('Nome de sala inválido.');
        if(this.rooms().length>=64)fail('Limite de salas atingido.',429);if(!['campaign-coop','coliseum-pvp'].includes(input.mode||'campaign-coop'))fail('Modo inválido.');if(![0,1,2].includes(input.difficulty||0))fail('Dificuldade inválida.');
        const password=input.password||'';if(typeof password!=='string'||password.length>64)fail('Senha de sala inválida.');
        const room={id:crypto.randomUUID(),name:input.name.trim(),creator:user,mode:input.mode||'campaign-coop',difficulty:input.difficulty||0,seed:crypto.getRandomValues(new Uint32Array(1))[0],contentHash:this.env.CONTENT_HASH,members:[{user,slot:0}],connected:[],passwordSalt:random(16),passwordHash:null,createdAt:now,updated:now};
        if(password)room.passwordHash=await passwordKey(password,room.passwordSalt);
        const response=await call(roomStub(this.env,room.id),'/internal/init',room);if(!response.ok)fail('Não foi possível abrir a sala.',503);this.save(room);return json({room:publicRoom(room)});
      }
      if(path==='/api/rooms/join'){
        const room=this.rooms().find(r=>r.id===input.roomId);if(!room)fail('Sala não encontrada.',404);if(current&&current.id!==room.id)fail('Saia da sala atual antes de entrar em outra.');if(room.contentHash!==input.contentHash)fail('Pacote de conteúdo incompatível.');
        if(room.passwordHash&&!equal(room.passwordHash,await passwordKey(input.password||'',room.passwordSalt)))fail('Senha da sala incorreta.',403);
        if(!room.members.some(m=>m.user.toLowerCase()===user.toLowerCase())){if(room.members.length>=4)fail('Sala cheia: quatro jogadores.',409);let slot=1;while(room.members.some(m=>m.slot===slot))slot++;room.members.push({user,slot});await call(roomStub(this.env,room.id),'/internal/members',{members:room.members});this.save(room);}return json({room:publicRoom(room)});
      }
      if(path==='/api/rooms/leave'){if(!current||current.id!==input.roomId)fail('Sala não encontrada.',404);await this.leave(user,current);return json({ok:true});}
      if(['/api/launch','/api/native/connect'].includes(path)) {
        if(!current||current.id!==input.roomId)fail('Entre na sala primeiro.');const member=current.members.find(m=>m.user.toLowerCase()===user.toLowerCase()),ticket=random();
        const result=await call(roomStub(this.env,current.id),'/internal/ticket',{slot:member.slot,ticketHash:await digest(ticket),expires:now+120000});if(result.status===409)return json({launchUri:'rfd://resume/'+user.toLowerCase()+'/'+current.id,message:'Retomando a partida no cliente aberto.'});if(!result.ok)fail('Não foi possível preparar a entrada.',503);
        const payload={transport:'webrtc',signalUrl:'https://returns-darkness-realm.oblique-tactical.workers.dev',roomId:current.id,ticket,contentHash:this.env.CONTENT_HASH,username:user,room:current.name,expires:now+120000};
        const encoded=btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');return json({launchUri:'rfd://play/'+encoded,message:member.slot===0?'Abra seu personagem para hospedar a partida.':'Abra seu personagem para reunir-se ao grupo.'});
      }
      fail('Rota indisponível.',404);
    }catch(error){return json({error:error.status?error.message:'Não foi possível concluir a operação.'},error.status||503);}
  }
  async alarm(){const now=Date.now();this.sql.exec('DELETE FROM sessions WHERE expires<?',now);this.sql.exec('DELETE FROM limits WHERE until<?',now);this.sql.exec('DELETE FROM rooms WHERE updated<?',now-TTL);if(this.rows('SELECT COUNT(*) AS n FROM sessions')[0].n||this.rows('SELECT COUNT(*) AS n FROM rooms')[0].n)await this.ctx.storage.setAlarm(now+TTL);}
}

export class SignalRoom {
  constructor(ctx,env){this.ctx=ctx;this.env=env;}
  async notify(input){return call(community(this.env),'/internal/heartbeat',input);}
  async fetch(req){
    const path=new URL(req.url).pathname;
    try {
      if(path==='/internal/init'){await this.ctx.storage.put('room',await body(req));await this.ctx.storage.setAlarm(Date.now()+TTL);return json({ok:true});}
      if(path==='/internal/close'){await this.close();return json({ok:true});}
      const room=await this.ctx.storage.get('room');if(!room||Date.now()-room.updated>TTL)fail('A sala foi encerrada.',410);
      if(path==='/internal/members'){const {members}=await body(req);room.members=members;for(const ws of this.ctx.getWebSockets()){const a=ws.deserializeAttachment();if(a?.slot!==undefined&&!members.some(m=>m.slot===a.slot&&m.user===a.user))ws.close(1000,'Você saiu da sala');}await this.ctx.storage.put('room',room);return json({ok:true});}
      if(path==='/internal/ticket') {const input=await body(req);if(this.ctx.getWebSockets().some(ws=>ws.deserializeAttachment()?.slot===input.slot&&ws.deserializeAttachment()?.authenticated))return json({error:'Cliente conectado.'},409);await this.ctx.storage.put('ticket:'+input.slot,input);return json({ok:true});}
      if(path.endsWith('/bootstrap')) {
        const input=await body(req),hash=validToken(input.ticket)?await digest(input.ticket):'';
        return await this.ctx.blockConcurrencyWhile(async()=>{
          const tickets=await this.ctx.storage.list({prefix:'ticket:'});let found;
          for(const [key,t]of tickets)if(t.expires>Date.now()&&equal(t.ticketHash,hash)){await this.ctx.storage.delete(key);found=t;break;}
          if(!found)return json({error:'Convite expirado. Abra a sala novamente.'},403);
          const member=room.members.find(m=>m.slot===found.slot);if(!member)return json({error:'Participante inválido.'},403);
          const token=random();await this.ctx.storage.put('peer:'+member.slot,{hash:await digest(token),user:member.user,expires:Date.now()+28800000});
          return json({token,slot:member.slot,host:member.slot===0,seed:room.seed,difficulty:room.difficulty,mode:room.mode,contentHash:room.contentHash,members:room.members,iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}],turnConfigured:false});
        });
      }
      if(req.headers.get('Upgrade')==='websocket'){
        if(this.ctx.getWebSockets().length>=12)fail('Sala ocupada.',429);const pair=new WebSocketPair();this.ctx.acceptWebSocket(pair[1]);pair[1].serializeAttachment({authenticated:false,created:Date.now(),window:Date.now(),count:0});return new Response(null,{status:101,webSocket:pair[0]});
      }
      fail('Rota indisponível.',404);
    }catch(error){return json({error:error.status?error.message:'Não foi possível concluir a operação.'},error.status||503);}
  }
  async close(){for(const ws of this.ctx.getWebSockets()){try{ws.send(JSON.stringify({op:'room-closed'}));ws.close(1000,'Sala encerrada');}catch{}}await this.ctx.storage.deleteAll();}
  async webSocketMessage(ws,message){
    try {
      if(typeof message!=='string'||message.length>90000)fail('Mensagem inválida.');const input=JSON.parse(message),a=ws.deserializeAttachment(),now=Date.now(),room=await this.ctx.storage.get('room');
      if(!room)fail('Sala encerrada.');if(now-a.window>60000){a.window=now;a.count=0;a.relayCount=0;a.relayBytes=0;}if(input.op==='relay'){a.relayCount=(a.relayCount||0)+1;a.relayBytes=(a.relayBytes||0)+message.length;if(a.relayCount>18000||a.relayBytes>12000000)fail('Limite de relay.');}else if(++a.count>180)fail('Limite de sinais.');ws.serializeAttachment(a);
      if(input.op==='auth') {
        if(!Number.isInteger(input.slot)||!validToken(input.token))fail('Credencial inválida.');const grant=await this.ctx.storage.get('peer:'+input.slot);
        if(!grant||grant.expires<now||!equal(grant.hash,await digest(input.token))||!room.members.some(m=>m.slot===input.slot&&m.user===grant.user))fail('Credencial inválida.');
        for(const other of this.ctx.getWebSockets())if(other!==ws&&other.deserializeAttachment()?.authenticated&&other.deserializeAttachment()?.slot===input.slot)other.close(1000,'Reconectado');
        Object.assign(a,{authenticated:true,slot:input.slot,user:grant.user});ws.serializeAttachment(a);ws.send(JSON.stringify({op:'ready',members:room.members}));
        if(a.slot!==0){for(const host of this.ctx.getWebSockets())if(host.deserializeAttachment()?.authenticated&&host.deserializeAttachment()?.slot===0)host.send(JSON.stringify({op:'guest-ready',slot:a.slot}));}
        else{for(const peer of this.ctx.getWebSockets())if(peer!==ws&&peer.deserializeAttachment()?.authenticated)ws.send(JSON.stringify({op:'guest-ready',slot:peer.deserializeAttachment().slot}));}
        return;
      }
      if(!a.authenticated)fail('Credencial inválida.');
      if(input.op==='leave'){
        if(a.slot===0){await call(community(this.env),'/internal/close',{id:room.id});await this.close();return;}
        room.connected=(room.connected||[]).filter(slot=>slot!==a.slot);await this.ctx.storage.put('room',room);await this.ctx.storage.delete('peer:'+a.slot);await this.notify({id:room.id,connected:room.connected});
        for(const host of this.ctx.getWebSockets())if(host.deserializeAttachment()?.authenticated&&host.deserializeAttachment()?.slot===0)host.send(JSON.stringify({op:'peer-left',slot:a.slot}));ws.close(1000,'Saiu da partida');return;
      }
      if(input.op==='heartbeat') {
        if(a.slot===0){room.updated=now;if(Array.isArray(input.connected)&&input.connected.length<=4&&input.connected.every(n=>Number.isInteger(n)&&room.members.some(m=>m.slot===n)))room.connected=input.connected;await this.ctx.storage.put('room',room);await this.notify({id:room.id,connected:room.connected||[]});await this.ctx.storage.setAlarm(now+TTL);}ws.send(JSON.stringify({op:'heartbeat-ok'}));return;
      }
      if(['relay-request','relay-accept','relay'].includes(input.op)){
        if(!Number.isInteger(input.to)||input.to<0||input.to>3||input.to===a.slot||(a.slot!==0&&input.to!==0)||!room.members.some(m=>m.slot===input.to))fail('Destino inválido.');
        if(input.op==='relay-request'&&a.slot===0||input.op==='relay-accept'&&a.slot!==0)fail('Papel inválido.');
        if(input.op==='relay'&&(typeof input.data!=='string'||input.data.length>87380||! /^[A-Za-z0-9+/]*={0,2}$/.test(input.data)))fail('Pacote inválido.');
        const target=this.ctx.getWebSockets().find(other=>other.deserializeAttachment()?.authenticated&&other.deserializeAttachment()?.slot===input.to);if(!target)return;
        target.send(JSON.stringify({op:input.op,from:a.slot,...(input.op==='relay'?{data:input.data}:{})}));return;
      }
      validateSignal(input);if(input.to===a.slot||(a.slot!==0&&input.to!==0)||!room.members.some(m=>m.slot===input.to))fail('Destino inválido.');
      const target=this.ctx.getWebSockets().find(other=>other.deserializeAttachment()?.authenticated&&other.deserializeAttachment()?.slot===input.to);
      if(!target){ws.send(JSON.stringify({op:'peer-unavailable',slot:input.to}));return;}
      const outgoing=input.op==='description'?{op:input.op,from:a.slot,to:input.to,type:input.type,sdp:input.sdp}:{op:input.op,from:a.slot,to:input.to,candidate:input.candidate,mid:input.mid};target.send(JSON.stringify(outgoing));
    }catch{ws.close(1008,'Sinal não autorizado');}
  }
  async webSocketClose(ws){const a=ws.deserializeAttachment();if(!a?.authenticated||a.slot===0)return;for(const host of this.ctx.getWebSockets())if(host.deserializeAttachment()?.slot===0)try{host.send(JSON.stringify({op:'signal-disconnected',slot:a.slot}));}catch{}}
  async webSocketError(ws){ws.close(1011,'Sinal interrompido');}
  async alarm(){const room=await this.ctx.storage.get('room');if(!room||Date.now()-room.updated>TTL){if(room)await call(community(this.env),'/internal/close',{id:room.id});await this.close();return;}for(const ws of this.ctx.getWebSockets()){const a=ws.deserializeAttachment();if(!a.authenticated&&Date.now()-a.created>15000)ws.close(1008,'Autenticação expirada');}await this.ctx.storage.setAlarm(room.updated+TTL);}
}
