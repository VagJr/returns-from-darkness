import {digest,equal,random,passwordKey,validUser,validToken,validRoom,validateSignal} from './security.mjs';
import {Progression,RULES,permitsDifficulty,unlocks} from './progression.mjs';
import {DailyService} from './daily-service.mjs';
const TTL=180000,SESSION=5400000,CHANNELS=['Tristram','Procurando Grupo','Comercio','Arena'];
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
async function body(req,limit=8192){
 const chunks=[];let size=0;const reader=req.body?.getReader();
 if(reader)try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();fail('Mensagem acima do limite.',413);}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 let input;try{input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)||'{}');}catch{fail('Mensagem inválida.');}
 if(!input||typeof input!=='object'||Array.isArray(input))fail('Mensagem inválida.');return input;
}
function bearer(req){const value=req.headers.get('Authorization')||'';return /^Bearer [A-Za-z0-9_-]{43}$/.test(value)?value.slice(7):'';}
const roomStub=(env,id)=>env.SIGNALS.get(env.SIGNALS.idFromName(id));
const community=env=>env.COMMUNITY.get(env.COMMUNITY.idFromName('realm-v1'));
const call=(stub,path,input)=>stub.fetch(new Request('https://internal'+path,{method:'POST',body:JSON.stringify(input)}));
const publicRoom=r=>({id:r.id,name:r.name,creator:r.creator,mode:r.mode,difficulty:r.difficulty,capacity:4,locked:!!r.passwordHash,contentHash:r.contentHash,players:r.members.map(m=>({user:m.user,slot:m.slot,connected:(r.connected||[]).includes(m.slot)})),createdAt:r.createdAt,hostReady:(r.connected||[]).includes(0)});
const validRelease=(version,hash)=>typeof version==='string'&&/^\d+\.\d+\.\d+$/.test(version)&&typeof hash==='string'&&/^[a-f0-9]{64}$/.test(hash);
function currentReleaseRequest(req,env){
 if(!validRelease(env.CLIENT_VERSION,env.CONTENT_HASH))fail('Configuração de versão indisponível.',503);
 const headers=new Headers(req.headers);
 // These headers are server configuration, never input supplied by a player.
 headers.set('X-Rfd-Realm-Version',env.CLIENT_VERSION);headers.set('X-Rfd-Realm-Hash',env.CONTENT_HASH);
 return new Request(req,{headers});
}

export default {
  async fetch(req,env) {
    const url=new URL(req.url),origin=req.headers.get('Origin');
    if(origin&&origin!==env.SITE_ORIGIN)return json({error:'Origem não autorizada.'},403);
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':env.SITE_ORIGIN,'Access-Control-Allow-Methods':'GET, POST','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600'}});
    let result;
    try {
      const signal=/^\/signal\/([a-f0-9-]{36})(\/bootstrap)?$/.exec(url.pathname);
      if(signal){if((signal[2]&&req.method!=='POST')||(!signal[2]&&req.headers.get('Upgrade')!=='websocket'))return json({error:'Rota indisponível.'},404);result=await roomStub(env,signal[1]).fetch(req);}
      else if(url.pathname==='/health'||/^\/api\/(login|register|state|channel|chat|rooms\/(create|join|leave)|logout|launch|auth\/(handoff|redeem)|native\/connect|profiles\/(public|update)|progression\/(rules|roster|run|report|remove)|daily\/(board|events?|claim|wallet))$/.test(url.pathname))result=await community(env).fetch(currentReleaseRequest(req,env));
      else if(url.pathname==='/migration'&&env.MIGRATION_ENABLED==='true'&&env.MIGRATION_TOKEN&&equal(req.headers.get('Authorization'), 'Bearer '+env.MIGRATION_TOKEN))result=await community(env).fetch(currentReleaseRequest(req,env));
      else return json({error:'Rota indisponível.'},404);
    }catch(error){result=json({error:error.status?error.message:'Não foi possível concluir a operação.'},error.status||503);}
    if(result.status===101)return result;
    const response=new Response(result.body,result);response.headers.set('Access-Control-Allow-Origin',env.SITE_ORIGIN);response.headers.set('Vary','Origin');return response;
  }
};

export class Community {
  constructor(ctx,env) {
    this.ctx=ctx;this.env=env;this.release=Object.freeze({version:env.CLIENT_VERSION,contentHash:env.CONTENT_HASH});this.sql=ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS accounts (name TEXT PRIMARY KEY, display TEXT NOT NULL, salt TEXT NOT NULL, verifier TEXT NOT NULL, scheme TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, user TEXT NOT NULL, channel TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, record TEXT NOT NULL, updated INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, channel TEXT NOT NULL, user TEXT NOT NULL, text TEXT NOT NULL, at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, until INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS handoffs (hash TEXT PRIMARY KEY, source TEXT NOT NULL, target TEXT NOT NULL, expires INTEGER NOT NULL);`);
    this.progression=new Progression(this);
    this.daily=env.DAILY_ENABLED==='true'?new DailyService(this):null;
  }
  rows(query,...args){return this.sql.exec(query,...args).toArray();}
  async limit(key,max,window=60000){const now=Date.now(),r=this.rows('SELECT count,until FROM limits WHERE key=?',key)[0];if(r&&r.until>now&&r.count>=max)fail('Aguarde um instante.',429);this.sql.exec('INSERT OR REPLACE INTO limits VALUES (?,?,?)',key,r&&r.until>now?r.count+1:1,r&&r.until>now?r.until:now+window);}
  rooms(release=this.release){return this.rows('SELECT record FROM rooms WHERE updated>?',Date.now()-TTL).map(r=>JSON.parse(r.record)).filter(r=>r.contentHash===release.contentHash);}
  save(room){this.sql.exec('INSERT OR REPLACE INTO rooms VALUES (?,?,?)',room.id,JSON.stringify(room),room.updated);}
  async session(req){const token=bearer(req);if(!token)fail('Entre em sua conta.',401);const hash=await digest(token),s=this.rows('SELECT * FROM sessions WHERE hash=? AND expires>?',hash,Date.now())[0];if(!s)fail('Entre em sua conta.',401);if(s.expires<Date.now()+SESSION-900000)this.sql.exec('UPDATE sessions SET expires=? WHERE hash=?',Date.now()+SESSION,hash);return s;}
  async leave(user,room){
    if(room.creator.toLowerCase()===user.toLowerCase()){await call(roomStub(this.env,room.id),'/internal/close',{});this.sql.exec('DELETE FROM rooms WHERE id=?',room.id);}
    else{room.members=room.members.filter(m=>m.user.toLowerCase()!==user.toLowerCase());await call(roomStub(this.env,room.id),'/internal/members',{members:room.members});room.connected=(room.connected||[]).filter(slot=>room.members.some(m=>m.slot===slot));this.save(room);}
  }
  async fetch(req){
    const version=req.headers.get('X-Rfd-Realm-Version'),contentHash=req.headers.get('X-Rfd-Realm-Hash');
    if(version!==null||contentHash!==null){
      if(!validRelease(version,contentHash))return json({error:'Configuração de versão indisponível.'},503);
      this.release=Object.freeze({version,contentHash});
    }
    // A resident object may outlive a vars-only deployment. Keep bindings and
    // secrets intact, and preserve this immutable snapshot across await/queuing.
    const release=this.release;
    if(req.method==='POST'&&(/^\/api\/(rooms\/|auth\/|profiles\/|progression\/|daily\/|launch$|native\/connect$)/.test(new URL(req.url).pathname)))return this.ctx.blockConcurrencyWhile(()=>this.handle(req,release));
    return this.handle(req,release);
  }
  async handoff(s,target){
    if(!['client','web'].includes(target))fail('Destino inválido.');await this.limit('handoff:'+s.user.toLowerCase(),20);
    const code=random();this.sql.exec('INSERT INTO handoffs VALUES (?,?,?,?)',await digest(code),s.hash,target,Date.now()+120000);await this.ctx.storage.setAlarm(Date.now()+TTL);return code;
  }
  async handle(req,release=this.release) {
    const path=new URL(req.url).pathname,now=Date.now();
    try {
      if(path==='/internal/heartbeat'){const input=await body(req);const row=this.rows('SELECT record FROM rooms WHERE id=?',input.id)[0];if(row){const room=JSON.parse(row.record);room.updated=now;room.connected=input.connected;this.save(room);}return json({ok:true});}
      if(path==='/internal/close'){const input=await body(req);this.sql.exec('DELETE FROM rooms WHERE id=?',input.id);return json({ok:true});}
      if(path==='/health'){const rooms=this.rooms(release);return json({service:'Returns from Darkness community',gatewayListening:true,lobbySessions:this.rows('SELECT COUNT(DISTINCT user) AS n FROM sessions WHERE expires>?',now)[0].n,rooms:rooms.length,connectedGamePlayers:rooms.reduce((n,r)=>n+(r.connected?.length||0),0),transport:'native-webrtc-host',playersPerRoom:4,contentHash:release.contentHash,clientVersion:release.version,dependsOnLocalPc:false,turnRelayConfigured:false,cloudRelayFallback:true});}
      if(path==='/api/progression/rules'&&req.method==='GET')return json(RULES);
      if(path==='/api/profiles/public'&&req.method==='GET')return json(this.progression.public(new URL(req.url).searchParams.get('username')));
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
      if(path==='/api/auth/redeem'){
        if(req.method!=='POST')fail('Método inválido.',405);const input=await body(req);await this.limit('redeem:'+await digest(req.headers.get('CF-Connecting-IP')||'unknown'),60);
        if(!validToken(input.code)||!['client','web'].includes(input.target))fail('Autorização inválida.',403);
        const hash=await digest(input.code),h=this.rows('SELECT * FROM handoffs WHERE hash=? AND expires>?',hash,now)[0];
        if(!h||h.target!==input.target)fail('Autorização expirada. Abra novamente pela sua conta.',403);
        const source=this.rows('SELECT * FROM sessions WHERE hash=? AND expires>?',h.source,now)[0];
        if(!source||(input.username&&(!validUser(input.username)||input.username.toLowerCase()!==source.user.toLowerCase())))fail('Autorização inválida.',403);
        this.sql.exec('DELETE FROM handoffs WHERE hash=?',hash);
        const token=random();this.sql.exec('INSERT INTO sessions VALUES (?,?,?,?)',await digest(token),source.user,source.channel,now+SESSION);return json({username:source.user,sessionToken:token});
      }
      const s=await this.session(req),user=s.user;
      if(path.startsWith('/api/daily/')){
        if(!this.daily)fail('Contratos diários ainda não disponíveis.',404);
        this.progression.native(req);
        if(path==='/api/daily/wallet'&&req.method==='GET')return json(this.daily.wallet(user));
        if(req.method!=='POST')fail('Método inválido.',405);
        await this.limit('daily:'+user.toLowerCase(),120);
        const input=await body(req);
        if(path==='/api/daily/board')return json(await this.daily.board(user,input.characterId));
        if(path==='/api/daily/event')return json(await this.daily.event(req,user,input,undefined,release));
        if(path==='/api/daily/events')return json(await this.daily.events(req,user,input,undefined,release));
        if(path==='/api/daily/claim')return json(await this.daily.claim(req,user,input,undefined,release));
        fail('Rota indisponível.',404);
      }
      if(path==='/api/state'&&req.method==='GET'){
        const events=this.rows('SELECT user,text,at FROM messages WHERE channel=? ORDER BY id DESC LIMIT 100',s.channel).reverse().map(e=>({...e,type:5}));
        const users=this.rows('SELECT user FROM sessions WHERE channel=? AND expires>? GROUP BY user ORDER BY MAX(expires) DESC LIMIT 256',s.channel,now).map(r=>r.user);
        const summaries=Object.fromEntries([...new Set([...users,...events.map(e=>e.user)])].slice(0,256).map(name=>[name.toLowerCase(),this.progression.summary(name)]));
        return json({username:user,channel:s.channel,channels:CHANNELS,users,events,rooms:this.rooms(release).map(publicRoom),profile:this.progression.view(user,24),profiles:summaries,contentHash:release.contentHash,transport:'native-webrtc-host',clientVersion:release.version,clientOpen:false});
      }
      if(req.method!=='POST')fail('Método inválido.',405);const input=await body(req);await this.limit('action:'+s.hash,40,10000);
      if(path==='/api/auth/handoff')return json({code:await this.handoff(s,input.target),username:user,expires:now+120000});
      if(path==='/api/profiles/update')return json(this.progression.update(user,input));
      if(path.startsWith('/api/progression/')){
        await this.limit('progress:'+user.toLowerCase(),60);
        const method={'/api/progression/roster':'roster','/api/progression/run':'begin','/api/progression/report':'report','/api/progression/remove':'remove'}[path];
        if(!method)fail('Rota indisponível.',404);
        const result=await this.progression[method](req,user,input,release);
        if(method==='begin'){
          result.daily=null;
          if(this.daily&&input.character.mode!==8){try{result.daily=await this.daily.board(user,input.character.id);}catch(error){if(error.status!==409)throw error;result.daily={unavailable:'character-locked'};}}
        }
        return json(result);
      }
      if(path==='/api/channel'){if(!CHANNELS.includes(input.channel))fail('Canal inválido.');this.sql.exec('UPDATE sessions SET channel=? WHERE hash=?',input.channel,s.hash);return json({ok:true});}
      if(path==='/api/chat') {await this.limit('chat:'+user.toLowerCase(),5,10000);if(typeof input.text!=='string'||input.text.trim().length<1||input.text.length>240||/[\x00-\x1f]/.test(input.text))fail('Mensagem inválida.');this.sql.exec('INSERT INTO messages(channel,user,text,at) VALUES (?,?,?,?)',s.channel,user,input.text.trim(),now);this.sql.exec('DELETE FROM messages WHERE channel=? AND id NOT IN (SELECT id FROM messages WHERE channel=? ORDER BY id DESC LIMIT 100)',s.channel,s.channel);return json({ok:true});}
      const current=this.rooms(release).find(r=>r.members.some(m=>m.user.toLowerCase()===user.toLowerCase()));
      if(path==='/api/logout'){this.sql.exec('DELETE FROM sessions WHERE hash=?',s.hash);if(!this.rows('SELECT hash FROM sessions WHERE user=? AND expires>?',user,now).length&&current&&!current.connected?.length)await this.leave(user,current);return json({ok:true});}
      if(path==='/api/rooms/create'){
        if(current)fail('Saia da sala atual antes de criar outra.');if(input.contentHash!==release.contentHash)fail('Pacote de conteúdo incompatível.');
        if(typeof input.name!=='string'||input.name.trim().length<2||input.name.length>40||/[\x00-\x1f]/.test(input.name))fail('Nome de sala inválido.');
        if(this.rooms(release).length>=64)fail('Limite de salas atingido.',429);const mode=input.mode||'campaign-coop';if(!['campaign-coop','coliseum-pvp'].includes(mode))fail('Modo inválido.');
        // Coliseum has fixed arena rules. Ignore a stale campaign selection from older clients.
        const difficulty=mode==='coliseum-pvp'?0:(input.difficulty??0);if(!Number.isInteger(difficulty)||difficulty<0||difficulty>8)fail('Dificuldade inválida.');
        const profile=this.progression.get(user);if(!permitsDifficulty(profile,difficulty))fail('Desbloqueie esta dificuldade antes de criar a sala.',403);
        if(mode==='coliseum-pvp'&&!unlocks(profile).modes.includes(8))fail('Alcance o nível 10 para desbloquear o Coliseum.',403);
        const password=input.password||'';if(typeof password!=='string'||password.length>64)fail('Senha de sala inválida.');
        const room={id:crypto.randomUUID(),name:input.name.trim(),creator:user,mode,difficulty,seed:crypto.getRandomValues(new Uint32Array(1))[0],contentHash:release.contentHash,members:[{user,slot:0}],connected:[],passwordSalt:random(16),passwordHash:null,createdAt:now,updated:now};
        if(password)room.passwordHash=await passwordKey(password,room.passwordSalt);
        const response=await call(roomStub(this.env,room.id),'/internal/init',room);if(!response.ok)fail('Não foi possível abrir a sala.',503);this.save(room);return json({room:publicRoom(room)});
      }
      if(path==='/api/rooms/join'){
        const room=this.rooms(release).find(r=>r.id===input.roomId);if(!room)fail('Sala não encontrada.',404);if(current&&current.id!==room.id)fail('Saia da sala atual antes de entrar em outra.');if(room.contentHash!==input.contentHash)fail('Pacote de conteúdo incompatível.');
        if(room.passwordHash&&!equal(room.passwordHash,await passwordKey(input.password||'',room.passwordSalt)))fail('Senha da sala incorreta.',403);
        const profile=this.progression.get(user);if(!permitsDifficulty(profile,room.difficulty))fail('Desbloqueie esta dificuldade antes de entrar na sala.',403);
        if(room.mode==='coliseum-pvp'&&!unlocks(profile).modes.includes(8))fail('Alcance o nível 10 para desbloquear o Coliseum.',403);
        if(!room.members.some(m=>m.user.toLowerCase()===user.toLowerCase())){if(room.members.length>=4)fail('Sala cheia: quatro jogadores.',409);let slot=1;while(room.members.some(m=>m.slot===slot))slot++;room.members.push({user,slot});await call(roomStub(this.env,room.id),'/internal/members',{members:room.members});this.save(room);}return json({room:publicRoom(room)});
      }
      if(path==='/api/rooms/leave'){if(!current||current.id!==input.roomId)fail('Sala não encontrada.',404);await this.leave(user,current);return json({ok:true});}
      if(['/api/launch','/api/native/connect'].includes(path)) {
        if(!current||current.id!==input.roomId)fail('Entre na sala primeiro.');const member=current.members.find(m=>m.user.toLowerCase()===user.toLowerCase()),ticket=random(),authCode=await this.handoff(s,'client');
        const result=await call(roomStub(this.env,current.id),'/internal/ticket',{slot:member.slot,ticketHash:await digest(ticket),expires:now+120000,replace:input.replaceConnection===true});if(result.status===409)return json({launchUri:'rfd://resume/'+user.toLowerCase()+'/'+current.id+'?auth='+authCode,message:'Retomando a partida no cliente aberto.'});if(!result.ok)fail('Não foi possível preparar a entrada.',503);
        if(input.replaceConnection===true){current.connected=(current.connected||[]).filter(slot=>slot!==member.slot);this.save(current);}
        const payload={transport:'webrtc',signalUrl:'https://returns-darkness-realm.oblique-tactical.workers.dev',roomId:current.id,ticket,contentHash:release.contentHash,username:user,room:current.name,mode:current.mode,difficulty:current.difficulty,expires:now+120000,authCode};
        const encoded=btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');return json({launchUri:'rfd://play/'+encoded,message:member.slot===0?'Abra seu personagem para hospedar a partida.':'Abra seu personagem para reunir-se ao grupo.'});
      }
      fail('Rota indisponível.',404);
    }catch(error){return json({error:error.status?error.message:'Não foi possível concluir a operação.'},error.status||503);}
  }
  async alarm(){const now=Date.now();this.sql.exec('DELETE FROM sessions WHERE expires<?',now);this.sql.exec('DELETE FROM limits WHERE until<?',now);this.sql.exec('DELETE FROM handoffs WHERE expires<?',now);this.sql.exec('DELETE FROM rooms WHERE updated<?',now-TTL);this.progression.cleanup(now);if(this.rows('SELECT COUNT(*) AS n FROM sessions')[0].n||this.rows('SELECT COUNT(*) AS n FROM rooms')[0].n||this.rows('SELECT COUNT(*) AS n FROM progression_runs')[0].n)await this.ctx.storage.setAlarm(now+TTL);}
}

export class SignalRoom {
  constructor(ctx,env){this.ctx=ctx;this.env=env;}
  activeSockets(){return this.ctx.getWebSockets().filter(ws=>ws.readyState===1);}
  async notify(input){return call(community(this.env),'/internal/heartbeat',input);}
  async fetch(req){
    const path=new URL(req.url).pathname;
    try {
      if(path==='/internal/init'){await this.ctx.storage.put('room',await body(req));await this.ctx.storage.setAlarm(Date.now()+TTL);return json({ok:true});}
      if(path==='/internal/close'){await this.close();return json({ok:true});}
      const room=await this.ctx.storage.get('room');if(!room||Date.now()-room.updated>TTL)fail('A sala foi encerrada.',410);
      if(path==='/internal/members'){const {members}=await body(req);const removed=room.members.filter(old=>!members.some(m=>m.slot===old.slot&&m.user===old.user));room.members=members;room.connected=(room.connected||[]).filter(slot=>members.some(m=>m.slot===slot)&&!removed.some(m=>m.slot===slot));for(const member of removed){await this.ctx.storage.delete('peer:'+member.slot);await this.ctx.storage.delete('ticket:'+member.slot);}for(const ws of this.activeSockets()){const a=ws.deserializeAttachment();if(a?.slot!==undefined&&!members.some(m=>m.slot===a.slot&&m.user===a.user))ws.close(1000,'Você saiu da sala');}for(const host of this.activeSockets())if(host.deserializeAttachment()?.authenticated&&host.deserializeAttachment()?.slot===0)for(const member of removed)if(member.slot!==0)host.send(JSON.stringify({op:'peer-left',slot:member.slot}));await this.ctx.storage.put('room',room);return json({ok:true});}
      if(path==='/internal/ticket') {const input=await body(req);const sockets=this.activeSockets().filter(ws=>ws.deserializeAttachment()?.slot===input.slot&&ws.deserializeAttachment()?.authenticated&&ws.readyState===1);if(sockets.length&&!input.replace)return json({error:'Cliente conectado.'},409);if(input.replace){await this.ctx.storage.delete('peer:'+input.slot);for(const ws of sockets)ws.close(1000,'Reconectando cliente');room.connected=(room.connected||[]).filter(slot=>slot!==input.slot);await this.ctx.storage.put('room',room);if(input.slot!==0)for(const host of this.activeSockets())if(host.deserializeAttachment()?.authenticated&&host.deserializeAttachment()?.slot===0)host.send(JSON.stringify({op:'peer-left',slot:input.slot}));}await this.ctx.storage.put('ticket:'+input.slot,input);return json({ok:true});}
      if(path.endsWith('/bootstrap')) {
        const input=await body(req),hash=validToken(input.ticket)?await digest(input.ticket):'';
        return await this.ctx.blockConcurrencyWhile(async()=>{
          const tickets=await this.ctx.storage.list({prefix:'ticket:'});let found;
          for(const [key,t]of tickets)if(t.expires>Date.now()&&equal(t.ticketHash,hash)){await this.ctx.storage.delete(key);found=t;break;}
          if(!found)return json({error:'Convite expirado. Abra a sala novamente.'},403);
          const member=room.members.find(m=>m.slot===found.slot);if(!member)return json({error:'Participante inválido.'},403);
          const token=random();await this.ctx.storage.put('peer:'+member.slot,{hash:await digest(token),user:member.user,expires:Date.now()+28800000});
          return json({token,slot:member.slot,host:member.slot===0,hostReady:!!room.connected?.includes(0),seed:room.seed,difficulty:room.difficulty,mode:room.mode,contentHash:room.contentHash,members:room.members,iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}],turnConfigured:false});
        });
      }
      if(req.headers.get('Upgrade')==='websocket'){
        if(this.activeSockets().length>=12)fail('Sala ocupada.',429);const pair=new WebSocketPair();this.ctx.acceptWebSocket(pair[1]);pair[1].serializeAttachment({authenticated:false,created:Date.now(),window:Date.now(),count:0});return new Response(null,{status:101,webSocket:pair[0]});
      }
      fail('Rota indisponível.',404);
    }catch(error){return json({error:error.status?error.message:'Não foi possível concluir a operação.'},error.status||503);}
  }
  async close(){for(const ws of this.activeSockets()){try{ws.send(JSON.stringify({op:'room-closed'}));ws.close(1000,'Sala encerrada');}catch{}}await this.ctx.storage.deleteAll();}
  async webSocketMessage(ws,message){
    try {
      if(typeof message!=='string'||message.length>90000)fail('Mensagem inválida.');const input=JSON.parse(message),a=ws.deserializeAttachment(),now=Date.now(),room=await this.ctx.storage.get('room');
      if(!room)fail('Sala encerrada.');if(now-a.window>60000){a.window=now;a.count=0;a.relayCount=0;a.relayBytes=0;}if(input.op==='relay'){a.relayCount=(a.relayCount||0)+1;a.relayBytes=(a.relayBytes||0)+message.length;if(a.relayCount>18000||a.relayBytes>12000000)fail('Limite de relay.');}else if(++a.count>180)fail('Limite de sinais.');ws.serializeAttachment(a);
      if(input.op==='auth') {
        if(!Number.isInteger(input.slot)||!validToken(input.token))fail('Credencial inválida.');const grant=await this.ctx.storage.get('peer:'+input.slot);
        if(!grant||grant.expires<now||!equal(grant.hash,await digest(input.token))||!room.members.some(m=>m.slot===input.slot&&m.user===grant.user))fail('Credencial inválida.');
        for(const other of this.activeSockets())if(other!==ws&&other.deserializeAttachment()?.authenticated&&other.deserializeAttachment()?.slot===input.slot)other.close(1000,'Reconectado');
        Object.assign(a,{authenticated:true,slot:input.slot,user:grant.user,grantHash:grant.hash});ws.serializeAttachment(a);ws.send(JSON.stringify({op:'ready',members:room.members,hostReady:!!room.connected?.includes(0)}));
        if(a.slot!==0){for(const host of this.activeSockets())if(host.deserializeAttachment()?.authenticated&&host.deserializeAttachment()?.slot===0)host.send(JSON.stringify({op:'guest-ready',slot:a.slot}));}
        else{for(const peer of this.activeSockets())if(peer!==ws&&peer.deserializeAttachment()?.authenticated)ws.send(JSON.stringify({op:'guest-ready',slot:peer.deserializeAttachment().slot}));}
        return;
      }
      if(!a.authenticated)fail('Credencial inválida.');
      if(a.grantHash){const grant=await this.ctx.storage.get('peer:'+a.slot);if(!grant||!equal(a.grantHash,grant.hash)){ws.close(1000,'Conexao substituida');return;}}
      if(input.op==='leave'){
        if(a.slot===0){await call(community(this.env),'/internal/close',{id:room.id});await this.close();return;}
        room.connected=(room.connected||[]).filter(slot=>slot!==a.slot);await this.ctx.storage.put('room',room);await this.ctx.storage.delete('peer:'+a.slot);await this.notify({id:room.id,connected:room.connected});
        for(const host of this.activeSockets())if(host.deserializeAttachment()?.authenticated&&host.deserializeAttachment()?.slot===0)host.send(JSON.stringify({op:'peer-left',slot:a.slot}));ws.close(1000,'Saiu da partida');return;
      }
      if(input.op==='heartbeat') {
        if(a.slot===0){const wasReady=!!room.connected?.includes(0);room.updated=now;if(Array.isArray(input.connected)&&input.connected.length<=4&&input.connected.every(n=>Number.isInteger(n)&&room.members.some(m=>m.slot===n)))room.connected=input.connected;await this.ctx.storage.put('room',room);await this.notify({id:room.id,connected:room.connected||[]});if(!wasReady&&room.connected?.includes(0))for(const peer of this.activeSockets())if(peer!==ws&&peer.deserializeAttachment()?.authenticated)peer.send(JSON.stringify({op:'host-game-ready'}));await this.ctx.storage.setAlarm(now+TTL);}ws.send(JSON.stringify({op:'heartbeat-ok'}));return;
      }
      if(['relay-request','relay-accept','relay'].includes(input.op)){
        if(!Number.isInteger(input.to)||input.to<0||input.to>3||input.to===a.slot||(a.slot!==0&&input.to!==0)||!room.members.some(m=>m.slot===input.to))fail('Destino inválido.');
        if(input.op==='relay-request'&&a.slot===0||input.op==='relay-accept'&&a.slot!==0)fail('Papel inválido.');
        if(input.op==='relay'&&(typeof input.data!=='string'||input.data.length>87380||! /^[A-Za-z0-9+/]*={0,2}$/.test(input.data)))fail('Pacote inválido.');
        const target=this.activeSockets().find(other=>other.deserializeAttachment()?.authenticated&&other.deserializeAttachment()?.slot===input.to);if(!target)return;
        target.send(JSON.stringify({op:input.op,from:a.slot,...(input.op==='relay'?{data:input.data}:{})}));return;
      }
      validateSignal(input);if(input.to===a.slot||(a.slot!==0&&input.to!==0)||!room.members.some(m=>m.slot===input.to))fail('Destino inválido.');
      const target=this.activeSockets().find(other=>other.deserializeAttachment()?.authenticated&&other.deserializeAttachment()?.slot===input.to);
      if(!target){ws.send(JSON.stringify({op:'peer-unavailable',slot:input.to}));return;}
      const outgoing=input.op==='description'?{op:input.op,from:a.slot,to:input.to,type:input.type,sdp:input.sdp}:{op:input.op,from:a.slot,to:input.to,candidate:input.candidate,mid:input.mid};target.send(JSON.stringify(outgoing));
    }catch{ws.close(1008,'Sinal não autorizado');}
  }
  async webSocketClose(ws){const a=ws.deserializeAttachment();if(!a?.authenticated||a.slot===0)return;for(const host of this.activeSockets())if(host.deserializeAttachment()?.slot===0)try{host.send(JSON.stringify({op:'signal-disconnected',slot:a.slot}));}catch{}}
  async webSocketError(ws){ws.close(1011,'Sinal interrompido');}
  async alarm(){const room=await this.ctx.storage.get('room');if(!room||Date.now()-room.updated>TTL){if(room)await call(community(this.env),'/internal/close',{id:room.id});await this.close();return;}for(const ws of this.activeSockets()){const a=ws.deserializeAttachment();if(!a.authenticated&&Date.now()-a.created>15000)ws.close(1008,'Autenticação expirada');}await this.ctx.storage.setAlarm(room.updated+TTL);}
}
