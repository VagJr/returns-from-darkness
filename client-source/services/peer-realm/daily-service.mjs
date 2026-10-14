import {generateDailyContracts,applyDailyEvent,dailyPeriod} from './daily-contracts.mjs';
import {digest,validToken} from './security.mjs';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const heroId=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export class DailyService {
 constructor(community){this.c=community;this.rows=community.rows.bind(community);this.sql=community.sql;
  this.sql.exec(`CREATE TABLE IF NOT EXISTS daily_boards(user TEXT NOT NULL,period TEXT NOT NULL,record TEXT NOT NULL,PRIMARY KEY(user,period));
   CREATE TABLE IF NOT EXISTS daily_events(user TEXT NOT NULL,period TEXT NOT NULL,id TEXT NOT NULL,PRIMARY KEY(user,period,id));
   CREATE TABLE IF NOT EXISTS daily_claims(user TEXT NOT NULL,period TEXT NOT NULL,id TEXT NOT NULL,record TEXT NOT NULL,PRIMARY KEY(user,period,id));
   CREATE TABLE IF NOT EXISTS daily_wallets(user TEXT PRIMARY KEY,marks INTEGER NOT NULL);`);
 }
 save(user,board){this.sql.exec('INSERT OR REPLACE INTO daily_boards VALUES(?,?,?)',user.toLowerCase(),board.period,JSON.stringify(board));}
 async board(user,characterId,now=Date.now()){
  if(!heroId(characterId))fail('Personagem inválido.');const period=dailyPeriod(now),key=user.toLowerCase();
  const row=this.rows('SELECT record FROM daily_boards WHERE user=? AND period=?',key,period.key)[0];
  if(row){const board=JSON.parse(row.record);if(board.characterId!==characterId)fail('Os contratos de hoje já estão vinculados a outro personagem.',409);return board;}
  const hero=this.c.progression.characters(key).find(h=>h.id===characterId&&!h.archived);if(!hero)fail('Sincronize este personagem no cliente.',404);
  const board=await generateDailyContracts(user,hero,this.c.progression.get(user),now);this.save(user,board);return board;
 }
 async run(req,user,input,now){this.c.progression.native(req);if(!validToken(input.runNonce))fail('Partida inválida.');
  const row=this.rows('SELECT record FROM progression_runs WHERE id=? AND user=? AND expires>?',await digest(input.runNonce),user.toLowerCase(),now)[0];if(!row)fail('Partida ausente ou expirada.',410);
  const run=JSON.parse(row.record);if(run.contentHash!==this.c.env.CONTENT_HASH||run.character.id!==input.characterId||run.character.mode===8)fail('Partida incompatível.',403);return run;
 }
 async event(req,user,input,now=Date.now()){
  const run=await this.run(req,user,input,now),period=dailyPeriod(now);
  if(!Number.isSafeInteger(input.occurredAt)||input.occurredAt<period.start||input.occurredAt>now+30000)throw Object.assign(Error('Evento de outro período diário.'),{status:410,expiredDailyEvent:true});
  const board=await this.board(user,input.characterId,now);
  if(typeof input.eventId!=='string'||!/^[a-f0-9-]{36}$/.test(input.eventId))fail('Evento inválido.');
  const identity=input.kind==='slay'?input.instanceId:`floor:${input.floor}`;
  if(input.kind==='slay'&&!heroId(identity))fail('Abate inválido.');
  // Reusing a new request UUID cannot count the same creature a second time.
  const id=await digest(`${input.runNonce}:${identity}`),key=user.toLowerCase();
  if(this.rows('SELECT id FROM daily_events WHERE user=? AND period=? AND id=?',key,board.period,id).length)return {board,duplicate:true};
  if(this.rows('SELECT COUNT(*) AS n FROM daily_events WHERE user=? AND period=?',key,board.period)[0].n>=3000)fail('Limite diário de eventos atingido.',429);
  applyDailyEvent(board,{...input,difficulty:run.difficulty,mode:run.character.mode,category:run.character.category},now);
  this.c.ctx.storage.transactionSync(()=>{this.sql.exec('INSERT INTO daily_events VALUES(?,?,?)',key,board.period,id);this.save(user,board);});return {board,duplicate:false};
 }
 async events(req,user,input,now=Date.now()){
  if(!Array.isArray(input.events)||input.events.length<1||input.events.length>16)fail('Lote de contratos inválido.');
  let result,expiredEvents=0;
  for(const event of input.events){try{result=await this.event(req,user,{...event,runNonce:input.runNonce,characterId:input.characterId},now);}catch(error){if(!error.expiredDailyEvent)throw error;expiredEvents++;}}
  return {...(result||{ignored:true}),expiredEvents};
 }
 async claim(req,user,input,now=Date.now()){
  const run=await this.run(req,user,input,now),board=await this.board(user,input.characterId,now),key=user.toLowerCase();
  if(typeof input.contractId!=='string')fail('Contrato inválido.');
  const previous=this.rows('SELECT record FROM daily_claims WHERE user=? AND period=? AND id=?',key,board.period,input.contractId)[0];if(previous)return {...JSON.parse(previous.record),board,duplicate:true};
  const contract=board.contracts.find(c=>c.id===input.contractId);if(!contract||!contract.complete)fail('Complete o contrato antes de receber a recompensa.',409);
  if(this.rows('SELECT id FROM daily_claims WHERE user=? AND period=?',key,board.period).length>=3)fail('As recompensas de hoje já foram recebidas.',409);
  const result={id:await digest(`${key}:${board.period}:${contract.id}`),contractId:contract.id,characterId:run.character.id,reward:contract.reward,claimedAt:now,
   inGameDelivery:'pending-native-integration',ranked:false};
  // Calls must be serialized by the community's blockConcurrencyWhile route.
  const wallet=this.rows('SELECT marks FROM daily_wallets WHERE user=?',key)[0]?.marks||0;
  this.c.ctx.storage.transactionSync(()=>{
   this.sql.exec('INSERT INTO daily_claims VALUES(?,?,?,?)',key,board.period,contract.id,JSON.stringify(result));
   this.sql.exec('INSERT OR REPLACE INTO daily_wallets VALUES(?,?)',key,wallet+contract.reward.vigilMarks);
   contract.claimed=true;this.save(user,board);
  });
  return {...result,board,duplicate:false};
 }
 wallet(user){return {vigilMarks:this.rows('SELECT marks FROM daily_wallets WHERE user=?',user.toLowerCase())[0]?.marks||0};}
}
