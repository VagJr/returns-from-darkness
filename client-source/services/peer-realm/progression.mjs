import RULES from './progression-rules.mjs';
import {digest,validToken,validUser} from './security.mjs';
const bad=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const category=v=>['campaign','solo','coliseum'].includes(v);
const validId=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export function permits(profile,rule,legacy=true){return profile.maxLevel>=rule.level&&(rule.clear<0||profile.cleared.includes(rule.clear)||(legacy&&profile.legacyDifficulty>rule.clear));}
export function permitsDifficulty(profile,tier){return integer(tier,0,8)&&profile.maxLevel>=RULES.difficulties[tier].level&&(tier===0||profile.cleared.includes(tier-1)||profile.legacyDifficulty>=tier);}
export function unlocks(profile){
 const select=rows=>rows.filter(r=>permits(profile,r.unlock)).map(r=>r.id);
 return {classes:select(RULES.classes),traits:select(RULES.traits),modes:select(RULES.modes),gameChangers:select(RULES.gameChangers),
  difficulties:RULES.difficulties.filter(d=>permitsDifficulty(profile,d.id)).map(d=>d.id),
  titles:RULES.titles.filter(t=>permits(profile,t.unlock,false)&&profile.pvpKills>=(t.pvp_kills||0)).map(t=>t.id)};
}
function empty(user){return {username:user,maxLevel:1,maxArenaLevel:1,legacyDifficulty:0,cleared:[],pvpKills:0,bosses:[],avatar:0,title:'wanderer',bio:'',createdAt:Date.now(),updatedAt:Date.now()};}
function hero(input){
 if(!input||!validId(input.id)||typeof input.name!=='string'||input.name.trim().length<1||[...input.name].length>16||/[\x00-\x1f\x7f]/.test(input.name)||
    !integer(input.classId,0,28)||!integer(input.level,1,150)||!integer(input.mode,0,8)||!category(input.category)||(input.mode===8)!==(input.category==='coliseum')||!integer(input.allowedDifficulty??0,0,9))bad('Personagem inválido.');
 return {id:input.id,name:input.name.trim(),classId:input.classId,level:input.level,mode:input.mode,category:input.category,allowedDifficulty:input.allowedDifficulty||0};
}
export class Progression {
 constructor(community){this.c=community;this.sql=community.sql;this.rows=community.rows.bind(community);
  this.sql.exec(`CREATE TABLE IF NOT EXISTS profiles (user TEXT PRIMARY KEY,record TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS characters (user TEXT NOT NULL,id TEXT NOT NULL,record TEXT NOT NULL,PRIMARY KEY(user,id));
   CREATE TABLE IF NOT EXISTS progression_runs (id TEXT PRIMARY KEY,user TEXT NOT NULL,record TEXT NOT NULL,expires INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS progression_events (run TEXT NOT NULL,id TEXT NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(run,id));`);
 }
 get(user){const row=this.rows('SELECT record FROM profiles WHERE user=?',user.toLowerCase())[0];if(row)return JSON.parse(row.record);const profile=empty(user);this.save(profile);return profile;}
 save(profile){profile.updatedAt=Date.now();this.sql.exec('INSERT OR REPLACE INTO profiles VALUES (?,?)',profile.username.toLowerCase(),JSON.stringify(profile));}
 characters(user){return this.rows('SELECT record FROM characters WHERE user=?',user.toLowerCase()).map(r=>JSON.parse(r.record)).sort((a,b)=>Number(a.archived)-Number(b.archived)||b.level-a.level||a.name.localeCompare(b.name)).slice(0,512);}
 summary(user){const p=this.get(user);return {username:p.username,avatar:p.avatar,title:p.title,maxLevel:p.maxLevel,dots:RULES.completionDots.map(i=>p.cleared.includes(i)),golden:RULES.goldenAvatarRequires.every(i=>p.cleared.includes(i))};}
 view(user,limit=512){const p=this.get(user),characters=this.characters(user);return {...p,...this.summary(user),characters:characters.slice(0,limit),characterCount:characters.length,unlocks:unlocks(p),rulesRevision:RULES.revision,
  achievements:[...p.cleared.map(tier=>({id:'campaign-'+tier,tier})),...RULES.milestones.filter(level=>p.maxLevel>=level).map(level=>({id:'level-'+level,level})),
   ...(p.pvpKills>=5?[{id:'duelist-5',kills:5}]:[])]};}
 public(user){if(!validUser(user))bad('Perfil inválido.');const account=this.rows('SELECT display FROM accounts WHERE name=?',user.toLowerCase())[0];if(!account)bad('Perfil não encontrado.',404);return this.view(account.display);}
 update(user,input){const p=this.get(user),owned=unlocks(p);
  if(Object.keys(input).some(k=>!['avatar','title','bio'].includes(k)))bad('Campo de perfil inválido.');
  if(input.avatar!==undefined){if(!integer(input.avatar,0,28)||!owned.classes.includes(input.avatar))bad('Avatar ainda não desbloqueado.',403);p.avatar=input.avatar;}
  if(input.title!==undefined){if(typeof input.title!=='string'||!owned.titles.includes(input.title))bad('Título ainda não conquistado.',403);p.title=input.title;}
  if(input.bio!==undefined){if(typeof input.bio!=='string'||[...input.bio].length>160||/[\x00-\x1f\x7f]/.test(input.bio))bad('Biografia inválida.');p.bio=input.bio.trim();}
  this.save(p);return this.view(user);
 }
 native(req){if(!/^RFD-Native(?:Hub|Progress)\//.test(req.headers.get('User-Agent')||''))bad('Abra esta função no cliente do jogo.',403);}
 upsert(user,h,legacy=false){const p=this.get(user),key=user.toLowerCase(),existing=this.rows('SELECT record FROM characters WHERE user=? AND id=?',key,h.id)[0];
  if(!existing&&this.rows('SELECT COUNT(*) AS n FROM characters WHERE user=?',key)[0].n>=512)bad('Limite de personagens do perfil atingido.',409);
  // Stable account/hero identity is scoped to the authenticated account.
  this.sql.exec('INSERT OR REPLACE INTO characters VALUES (?,?,?)',key,h.id,JSON.stringify({...h,archived:false,updatedAt:Date.now(),provenance:legacy?'local-save':'native-game'}));
  if(h.category==='coliseum')p.maxArenaLevel=Math.max(p.maxArenaLevel||1,h.level);
  else {p.maxLevel=Math.max(p.maxLevel,h.level);if(legacy)p.legacyDifficulty=Math.max(p.legacyDifficulty,h.allowedDifficulty);}
  this.save(p);return p;
 }
 async roster(req,user,input){this.native(req);if(!Array.isArray(input.characters)||input.characters.length>20)bad('Lote de personagens inválido.');
  const heroes=input.characters.map(hero),existing=new Set(this.rows('SELECT id FROM characters WHERE user=?',user.toLowerCase()).map(r=>r.id));
  if(new Set([...existing,...heroes.map(h=>h.id)]).size>512)bad('Limite de personagens do perfil atingido.',409);
  for(const h of heroes)this.upsert(user,h,true);return this.view(user,24);
 }
 async remove(req,user,input){this.native(req);if(!validId(input.characterId))bad('Personagem inválido.');
  const row=this.rows('SELECT record FROM characters WHERE user=? AND id=?',user.toLowerCase(),input.characterId)[0];
  if(row){const h=JSON.parse(row.record);h.archived=true;h.updatedAt=Date.now();this.sql.exec('UPDATE characters SET record=? WHERE user=? AND id=?',JSON.stringify(h),user.toLowerCase(),input.characterId);}return this.view(user);
 }
 async begin(req,user,input){this.native(req);const h=hero(input.character);if(!validToken(input.runNonce)||!integer(input.difficulty,0,8)||input.contentHash!==this.c.env.CONTENT_HASH)bad('Partida de progressão inválida.');
  const id=await digest(input.runNonce),old=this.rows('SELECT user,record,expires FROM progression_runs WHERE id=?',id)[0];
  if(old){if(old.user!==user.toLowerCase())bad('Partida inválida.',403);if(old.expires<Date.now())bad('Partida de progresso ausente ou expirada.',410);const r=JSON.parse(old.record);if(r.character.id!==h.id||r.difficulty!==input.difficulty||r.roomId!==(input.roomId||''))bad('Contexto da partida mudou.',409);return {ok:true,profile:this.view(user,24)};}
  let slot=-1;
  if(h.level<RULES.difficulties[input.difficulty].level)bad('Este personagem ainda não tem nível para esta dificuldade.',403);
  if(input.roomId){const room=this.c.rooms().find(r=>r.id===input.roomId),member=room?.members.find(m=>m.user.toLowerCase()===user.toLowerCase());
   if(!member||!(room.connected||[]).includes(member.slot))bad('Conecte o cliente à sua sala antes de registrar progresso.',409);
   if(room.difficulty!==input.difficulty||h.mode!==(room.mode==='coliseum-pvp'?8:0))bad('Modo ou dificuldade não corresponde à sala.');slot=member.slot;
  }
  const p=this.get(user),candidate=h.category==='coliseum'?p:{...p,maxLevel:Math.max(p.maxLevel,h.level),legacyDifficulty:Math.max(p.legacyDifficulty,h.allowedDifficulty)};
  if(h.mode===8&&!permits(p,RULES.modes[8].unlock))bad('Desbloqueie o Coliseum antes de iniciar a jornada.',403);
  const known=this.rows('SELECT record FROM characters WHERE user=? AND id=?',user.toLowerCase(),h.id)[0];
  const saved=known?JSON.parse(known.record):null;
  // Preserve choices on a previously imported local hero without granting them to new heroes.
  // This is consistency checking for native reports, not authoritative anti-cheat attestation.
  const preserved=saved&&!saved.archived&&saved.name===h.name&&saved.classId===h.classId&&saved.mode===h.mode&&saved.category===h.category;
  if(h.mode!==8&&!permits(candidate,RULES.modes[h.mode].unlock)&&!preserved)bad('Desbloqueie este modo antes de iniciar uma nova jornada.',403);
  if(!permitsDifficulty(candidate,input.difficulty))bad('Desbloqueie esta dificuldade antes de iniciar a jornada.',403);
  this.upsert(user,h,true);
  const room=input.roomId?this.c.rooms().find(r=>r.id===input.roomId):null;
  const record={character:h,difficulty:input.difficulty,roomId:input.roomId||'',slot,participants:room?.members.filter(m=>(room.connected||[]).includes(m.slot)).map(m=>m.slot)||[],contentHash:input.contentHash,pvpKills:0};
  this.sql.exec('INSERT INTO progression_runs VALUES (?,?,?,?)',id,user.toLowerCase(),JSON.stringify(record),Date.now()+604800000);
  await this.c.ctx.storage.setAlarm(Date.now()+180000);return {ok:true,profile:this.view(user,24)};
 }
 async report(req,user,input){this.native(req);if(!validToken(input.runNonce)||typeof input.eventId!=='string'||!/^[a-f0-9-]{36}$/.test(input.eventId))bad('Evento inválido.');
  const id=await digest(input.runNonce),row=this.rows('SELECT record FROM progression_runs WHERE id=? AND user=? AND expires>?',id,user.toLowerCase(),Date.now())[0];if(!row)bad('Partida de progresso ausente ou expirada.',410);
  if(this.rows('SELECT id FROM progression_events WHERE run=? AND id=?',id,input.eventId).length)return {ok:true,duplicate:true,profile:this.view(user,24)};
  const run=JSON.parse(row.record),h=hero(input.character);
  if(h.id!==run.character.id||h.classId!==run.character.classId||h.name!==run.character.name||h.category!==run.character.category||h.mode!==run.character.mode||run.contentHash!==this.c.env.CONTENT_HASH)bad('Personagem ou build incompatível.');
  if(!['snapshot','campaign-clear','pvp-kill','boss'].includes(input.kind))bad('Tipo de conquista inválido.');
  if(input.kind==='campaign-clear'&&(h.mode===8||input.floor!==24||input.bossId!==137))bad('Conclusão de campanha inválida.');
  const liveRoom=run.roomId?this.c.rooms().find(r=>r.id===run.roomId):null;
  const participants=new Set([...(run.participants||[]),...(liveRoom?.members.filter(m=>(liveRoom.connected||[]).includes(m.slot)).map(m=>m.slot)||[])]);
  if(input.kind==='pvp-kill'&&(h.mode!==8||run.slot<0||!integer(input.victimSlot,0,3)||input.victimSlot===run.slot||!participants.has(input.victimSlot)))bad('Abate de arena inválido.');
  run.participants=[...participants];
  if(input.kind==='boss'&&!integer(input.bossId,0,799))bad('Chefe inválido.');
  if(input.kind==='pvp-kill'&&run.pvpKills>=500)bad('Limite de abates por sessão atingido.',429);
  const p=this.upsert(user,h);
  if(input.kind==='campaign-clear'&&!p.cleared.includes(run.difficulty)){p.cleared.push(run.difficulty);p.cleared.sort((a,b)=>a-b);}
  if(input.kind==='pvp-kill'){run.pvpKills++;p.pvpKills++;}
  if(input.kind==='boss'&&!p.bosses.includes(input.bossId))p.bosses.push(input.bossId);
  this.sql.exec('INSERT INTO progression_events VALUES (?,?,?)',id,input.eventId,Date.now());
  this.sql.exec('UPDATE progression_runs SET record=? WHERE id=?',JSON.stringify(run),id);this.save(p);return {ok:true,profile:this.view(user,24)};
 }
 cleanup(now){this.sql.exec('DELETE FROM progression_events WHERE at<?',now-604800000);this.sql.exec('DELETE FROM progression_runs WHERE expires<?',now);}
}
export {RULES};
