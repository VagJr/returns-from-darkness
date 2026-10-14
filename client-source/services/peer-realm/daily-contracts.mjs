// Pure, deterministic daily generation. Native integration is feature-gated.
// Progress is client reported, like Sanctuary progression; never a ranked proof.
import {digest} from './security.mjs';
export const DAILY_REVISION='daily-1';
export const DAILY_RESET_HOUR_UTC=3;
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const invalid=message=>{throw Object.assign(Error(message),{status:400});};
export function dailyPeriod(now=Date.now()){
 const shifted=now-DAILY_RESET_HOUR_UTC*3600000,start=Math.floor(shifted/86400000)*86400000+DAILY_RESET_HOUR_UTC*3600000;
 return {key:new Date(start).toISOString().slice(0,10),start,expires:start+86400000};
}
const titles={
 slay:{en:['Patrol of the Ashes','Hold the Dark at Bay','The Long Vigil'],pt:['Patrulha das Cinzas','Contenha a Escuridão','A Longa Vigília']},
 elite:{en:['Break Their Ranks','Silence the Champions','Ashes of Defiance'],pt:['Rompa as Fileiras','Silencie os Campeões','Cinzas da Resistência']},
 explore:{en:['A Light Below','Footsteps into Darkness','Return with a Map'],pt:['Uma Luz nas Profundezas','Passos na Escuridão','Volte com um Mapa']}
};
function generator(hex){let state=parseInt(hex.slice(0,8),16)||1;return max=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)%max;};}
export async function generateDailyContracts(user,hero,profile,now=Date.now()){
 if(typeof user!=='string'||!user||!hero||!/^[a-f0-9]{64}$/.test(hero.id)||!integer(hero.level,1,150)||hero.category==='coliseum'||hero.mode===8)invalid('Personagem inválido para contratos de campanha.');
 const period=dailyPeriod(now),seed=await digest(`${DAILY_REVISION}:${user.toLowerCase()}:${hero.id}:${period.key}`),random=generator(seed);
 // Snapshot once and persist the resulting board. Gaining levels never rerolls
 // a day's objectives or grants new copies through a different character.
 const level=hero.level,band=level<24?0:level<45?1:2;
 // Only explore a floor already reached, or the next step. A high-level
 // imported hero without exploration history still starts at floor one.
 const maxFloor=Math.max(1,Math.min(24,(hero.highestFloor||0)+1,1+Math.floor((level-1)/3)));
 const cleared=(profile?.cleared||[]).filter(t=>integer(t,0,8));
 const tier=Math.min(8,Math.max(0,...cleared));
 const specs=[{kind:'slay',count:12+band*12+random(9),floor:1},
  level>=15?{kind:'elite',count:2+band+random(2),floor:1}:{kind:'slay',count:18+random(9),floor:1},
  maxFloor>=2?{kind:'explore',count:1,floor:1+random(maxFloor)}:{kind:'slay',count:10+random(7),floor:1}];
 return {revision:DAILY_REVISION,period:period.key,expires:period.expires,characterId:hero.id,levelSnapshot:level,accountClaimLimit:3,
  resetHourUtc:DAILY_RESET_HOUR_UTC,ranked:false,contracts:specs.map((spec,index)=>{
   const name=titles[spec.kind],variant=random(3),id=seed.slice(0,24)+'-'+index;
   return {id,...spec,name:{en:name.en[variant],'pt-BR':name.pt[variant]},progress:0,complete:false,
    reward:{vigilMarks:1+band+(index===2?1:0),supplyRoll:index===0,collectionRoll:index===2,collectionTier:band},
    minimumDifficulty:tier>0?Math.max(0,tier-1):0};
  })};
}
export function applyDailyEvent(board,event,now=Date.now()){
 if(!board||board.revision!==DAILY_REVISION||board.expires<=now)invalid('Contratos expirados.');
 if(!event||event.characterId!==board.characterId||!['slay','explore'].includes(event.kind)||!integer(event.floor,1,24)||!integer(event.difficulty,0,8)||event.mode===8||event.category==='coliseum')invalid('Evento de contrato inválido.');
 if(event.kind==='slay'&&(typeof event.instanceId!=='string'||!/^[a-f0-9]{64}$/.test(event.instanceId)||typeof event.elite!=='boolean'))invalid('Abate inválido.');
 for(const contract of board.contracts){
  if(contract.complete||event.difficulty<contract.minimumDifficulty)continue;
  const eligible=contract.kind==='explore'?event.kind==='explore'&&event.floor===contract.floor:
   event.kind==='slay'&&event.floor>=contract.floor&&(contract.kind!=='elite'||event.elite);
  if(eligible){contract.progress=Math.min(contract.count,contract.progress+1);contract.complete=contract.progress===contract.count;}
 }
 return board;
}
