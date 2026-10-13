(() => {
 'use strict';
 const byId=id=>document.getElementById(id),T=text=>window.rfdT?.(text)||text;
 const remote=!['127.0.0.1','localhost','[::1]'].includes(location.hostname);
 const tiers=['Horror','Purgatory','Doom','Crucible','Torment','Agony','Terror','Destruction','Inferno'];
 const titles={wanderer:'Peregrino',pathfinder:'Desbravador',veteran:'Veterano',lightbearer:'Portador da Luz',nightbreaker:'Quebrador da Noite',hellwalker:'Caminhante do Inferno',duelist:'Duelista'};
 const classes=['Warrior','Inquisitor','Guardian','Templar','Archer','Scout','Sharpshooter','Trapper','Mage','Elementalist','Demonologist','Necromancer','Beastmaster','Warlock','Monk','Kensei','Shugoki','Shinobi','Rogue','Assassin','Ironmaiden','Bombardier','Savage','Berserker','Executioner','Thraex','Murmillo','Dimachaerus','Secutor'];
 let current=null,rules=null,filter='campaign-coop',target='',profileRequest=0,lastProfile='',saving=false,editorDirty=false,chatKey='',identityKey='',roomFormKey='',membershipKey='',completeProfile=null,profileFetchKey='';
 function node(tag,text='',className=''){const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;}
 async function api(route,body,query=''){
  const token=sessionStorage.getItem('rfd-central-tab-session')||'logged-out';
  const url=remote?'/api/realm?route='+encodeURIComponent(route)+query:'/api/'+route+(query?'?'+query.slice(1):'');
  const res=await fetch(url,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  const data=await res.json();if(!res.ok)throw Error(data.error||T('Não foi possível concluir.'));return data;
 }
 function portrait(profile,size=''){const box=node('span','','sanctuary-portrait '+size+(profile.golden?' golden':''));const img=document.createElement('img');img.src='assets/avatars/path-'+(Number.isInteger(profile.avatar)&&profile.avatar>=0&&profile.avatar<29?profile.avatar:0)+'.webp';img.alt='';img.loading='lazy';img.width=180;img.height=76;box.append(img);const dots=node('span','','completion-dots');for(let i=0;i<3;i++){const dot=node('i','',''+(profile.dots?.[i]?'earned':''));dot.title=tiers[i];dots.append(dot);}box.append(dots);return box;}
 function open(username=''){window.rfdView?.('profile'+(username?'/'+username:''));}
 function user(profile,button=true){const el=node(button?'button':'div','','player-identity');el.append(portrait(profile,'small'));const copy=node('span','','player-copy');const name=node('strong',profile.username);name.dataset.noTranslate='';copy.append(name,node('small',T(titles[profile.title]||titles.wanderer)+' · '+T('Nível')+' '+(profile.maxLevel||1)));el.append(copy);if(button)el.addEventListener('click',()=>open(profile.username));return el;}
 function renderChat(state){
  const signature=JSON.stringify([state.users,state.profiles,state.events,document.documentElement.lang]);if(signature===chatKey)return;chatKey=signature;
  const users=byId('users');users.replaceChildren(...state.users.map(name=>{const li=node('li');li.append(user(state.profiles?.[name.toLowerCase()]||{username:name}));return li;}));
  const log=byId('messages'),bottom=log.scrollTop+log.clientHeight>=log.scrollHeight-45;
  log.replaceChildren(...state.events.filter(e=>[4,5,7,10,13,18,19,23].includes(e.type)).map(e=>{
   if(e.type!==5&&e.type!==4)return node('p',e.text,'system');
   const article=node('article','','chat-message');const p=state.profiles?.[e.user.toLowerCase()]||{username:e.user};
   const face=node('button','','chat-face');face.setAttribute('aria-label',T('Ver perfil')+': '+e.user);face.append(portrait(p,'small'));face.addEventListener('click',()=>open(e.user));
   const body=node('div'),header=node('div','','chat-author');const name=node('button',e.user);name.dataset.noTranslate='';name.addEventListener('click',()=>open(e.user));header.append(name,node('span',T(titles[p.title]||titles.wanderer)));body.append(header,node('p',(e.type===4?T('Mensagem privada')+': ':'')+e.text));article.append(face,body);return article;
  }));if(bottom)log.scrollTop=log.scrollHeight;
 }
 function requirement(rule){if(!rule)return '';return [rule.level>1?T('Nível')+' '+rule.level:'',rule.clear>=0?T('Concluir')+' '+tiers[rule.clear]:''].filter(Boolean).join(' · ');}
 function progressStrip(profile){const out=node('div','','progress-strip');if(!profile){out.append(node('span',T('Sua conta guarda o caminho das suas conquistas.')));return out;}
  const identity=user(profile);const copy=node('div');copy.append(node('small',T('PROGRESSÃO DA CONTA')),node('strong',T('Nível')+' '+profile.maxLevel+' · '+(profile.unlocks?.classes?.length||6)+'/29 '+T('caminhos desbloqueados')));
  const seals=node('div','','strip-seals');for(let i=0;i<3;i++){const s=node('span',profile.dots?.[i]?'◆':'◇',profile.dots?.[i]?'earned':'');s.title=tiers[i];seals.append(s);}out.append(identity,copy,seals);return out;
 }
 function updateRoomForm(){
  const signature=JSON.stringify([current?.profile?.unlocks?.difficulties,current?.profile?.unlocks?.modes,document.documentElement.lang]);if(signature===roomFormKey)return;roomFormKey=signature;
  const select=byId('room-difficulty'),selected=select.value;select.replaceChildren();const owned=current?.profile?.unlocks?.difficulties||[0];
  tiers.forEach((name,i)=>{const option=node('option',name+(owned.includes(i)?'':' · '+T('Bloqueado')));option.value=String(i);option.disabled=!owned.includes(i);select.append(option);});select.value=owned.includes(Number(selected))?selected:'0';
  const col=byId('room-form').elements.mode.querySelector('[value="coliseum-pvp"]');col.disabled=!(current?.profile?.unlocks?.modes||[]).includes(8);
  if(col.disabled&&byId('room-form').elements.mode.value==='coliseum-pvp')byId('room-form').elements.mode.value='campaign-coop';
 }
 function selectMode(mode){filter=mode;for(const b of document.querySelectorAll('[data-room-filter]')){const on=b.dataset.roomFilter===mode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));}}
 function refreshOwnProfile(p){
  if(p.characters.length>=(p.characterCount||0)){completeProfile=p;renderProfile(p,true);return;}
  const key=p.username.toLowerCase()+':'+p.updatedAt+':'+p.characterCount;
  if(completeProfile?.username.toLowerCase()===p.username.toLowerCase()&&completeProfile.updatedAt===p.updatedAt&&completeProfile.characterCount===p.characterCount){renderProfile(completeProfile,true);return;}
  if(profileFetchKey===key)return;profileFetchKey=key;
  api('profiles/public',undefined,'&username='+encodeURIComponent(p.username)).then(full=>{
   if(current?.username?.toLowerCase()!==p.username.toLowerCase())return;
   completeProfile=full;
   if(!target&&!byId('sanctuary-profile').closest('[data-panel]').hidden&&!saving&&!editorDirty&&!document.activeElement?.closest('.profile-editor'))renderProfile(full,true);
  }).catch(()=>{if(!completeProfile)renderProfile(p,true);}).finally(()=>{if(profileFetchKey===key)profileFetchKey='';});
 }
 function update(state){current=state;const p=state?.profile,key=JSON.stringify([p?.username,p?.avatar,p?.title,p?.maxLevel,p?.dots,p?.golden,p?.unlocks?.classes,document.documentElement.lang]);
  if(key!==identityKey){identityKey=key;byId('play-progression').replaceChildren(progressStrip(p));byId('social-profile').replaceChildren();if(p){byId('social-profile').append(user(p));const avatar=byId('account-nav').querySelector('.avatar');if(avatar){avatar.replaceChildren(portrait(p,'small'));avatar.classList.add('has-portrait');}}else{chatKey='';const avatar=byId('account-nav').querySelector('.avatar');if(avatar){avatar.textContent='Ⅰ';avatar.classList.remove('has-portrait');}}}
  if(p)renderChat(state);
  const membership=state?.rooms?.find(r=>r.players.some(player=>player.user.toLowerCase()===state.username.toLowerCase()));
  if(membership?.id!==membershipKey){membershipKey=membership?.id||'';if(membership)selectMode(membership.mode);}
  if(!state){completeProfile=null;profileFetchKey='';}
  updateRoomForm();
  if(!target&&state?.profile&&!byId('sanctuary-profile').closest('[data-panel]').hidden&&!saving&&!editorDirty&&!document.activeElement?.closest('.profile-editor'))refreshOwnProfile(state.profile);
 }
 function block(title){const section=node('section','','profile-block');section.append(node('h2',T(title)));return section;}
 function renderProfile(p,own){
  const signature=JSON.stringify([p,own,document.documentElement.lang]);if(signature===lastProfile)return;lastProfile=signature;
  const root=byId('sanctuary-profile');root.replaceChildren();
  const hero=node('article','','profile-hero');hero.append(portrait(p,'large'));const head=node('div','','profile-intro');head.append(node('p',T('CRÔNICAS DO SANTUÁRIO'),'eyebrow'));const name=node('h1',p.username);name.dataset.noTranslate='';head.append(name,node('p',T(titles[p.title]||titles.wanderer),'profile-title'));if(p.bio){const bio=node('p',p.bio,'profile-bio');bio.dataset.noTranslate='';head.append(bio);}hero.append(head);
  const stats=node('div','','profile-stats');for(const [value,label]of [[p.maxLevel,'Maior nível'],[p.cleared.length+'/9','Selos conquistados'],[(p.unlocks?.classes||[]).length+'/29','Caminhos'],[p.characterCount??p.characters.length,'Personagens']]){const item=node('div');item.append(node('strong',String(value)),node('small',T(label)));stats.append(item);}hero.append(stats);root.append(hero);
  const grid=node('div','','profile-grid'),seals=block('Selos da campanha');seals.append(node('p',T('Conclua a campanha ampliada em cada dificuldade. Os três primeiros selos douram seu retrato.'),'muted'));
  const sealGrid=node('div','','campaign-seals');tiers.forEach((name,i)=>{const won=p.cleared.includes(i),el=node('div','','campaign-seal'+(won?' earned':''));el.append(node('span',won?'◆':'◇'),node('strong',name),node('small',won?T('Conquistado'):T('A conquistar')));sealGrid.append(el);});seals.append(sealGrid);grid.append(seals);
  const journeys=block('Seu próximo capítulo');const milestone=rules?.milestones.find(n=>n>p.maxLevel);if(milestone){journeys.append(node('p',T('Próximo marco')+': '+T('Nível')+' '+milestone,'milestone-heading'));const bar=document.createElement('progress');bar.max=milestone;bar.value=p.maxLevel;bar.setAttribute('aria-label',T('Próximo marco'));journeys.append(bar);}else journeys.append(node('p',T('O último marco de nível foi alcançado.')));
  const next=(rules?.classes||[]).filter(c=>!p.unlocks.classes.includes(c.id)).slice(0,4);for(const path of next){const row=node('div','','next-unlock');row.append(node('strong',path.name),node('small',requirement(path.unlock)));journeys.append(row);}if(!next.length)journeys.append(node('p',T('Todos os caminhos estão disponíveis.')));grid.append(journeys);root.append(grid);
  const chars=block('Personagens');const roster=node('div','','character-grid');for(const h of p.characters){const card=node('article','','character-card'+(h.archived?' archived':''));card.append(portrait({avatar:h.classId,dots:[],golden:false},'small'));const text=node('div');const name=node('strong',h.name);name.dataset.noTranslate='';text.append(name,node('small',classes[h.classId]+' · '+T('Nível')+' '+h.level),node('span',h.archived?T('Arquivado'):T(h.category==='coliseum'?'Coliseum':h.category==='solo'?'Jornada solo':'Campanha cooperativa')));card.append(text);roster.append(card);}if(!p.characters.length)roster.append(node('p',T('Abra seu personagem no cliente para registrar sua jornada.'),'muted'));chars.append(roster);if(p.characters.length<(p.characterCount||0))chars.append(node('p',T('Abra o perfil completo para ver todos os personagens.')));root.append(chars);
  const library=block('O que sua jornada desbloqueia');const libraryGrid=node('div','','unlock-library');for(const [key,label]of [['classes','Caminhos'],['traits','Características'],['modes','Modos de jogo'],['gameChangers','Modificadores']]){const counted=id=>!(['traits','gameChangers'].includes(key)&&id===0),entries=(rules?.[key]||[]).filter(r=>counted(r.id)),owned=(p.unlocks[key]||[]).filter(counted);const item=node('article');item.append(node('strong',owned.length+'/'+(entries.length||'—')),node('h3',T(label)));const chips=node('div','','unlock-chips');for(const r of entries){const chip=node('span',r.name,p.unlocks[key]?.includes(r.id)?'unlocked':'locked');chip.title=p.unlocks[key]?.includes(r.id)?T('Disponível'):requirement(r.unlock);chips.append(chip);}item.append(chips);libraryGrid.append(item);}library.append(libraryGrid);root.append(library);
  const honors=block('Títulos do Santuário'),honorGrid=node('div','','title-grid');for(const title of rules?.titles||[]){const earned=p.unlocks.titles.includes(title.id),card=node('article','','title-achievement'+(earned?' earned':''));const details=[requirement(title.unlock),title.pvp_kills?title.pvp_kills+' '+T('abates no Coliseum'):''].filter(Boolean).join(' · ');card.append(node('span',earned?'◆':'◇'),node('h3',T(titles[title.id])),node('p',details||T('Disponível')),node('small',earned?T('Conquistado'):T('A conquistar')));honorGrid.append(card);}honors.append(honorGrid);root.append(honors);
  if(own)root.append(editor(p));
  const note=node('p',T('Personagens permanecem salvos neste computador. O perfil registra conquistas da conta; não substitui o save. A arena não possui ranking competitivo.'),'profile-note');root.append(note);
 }
 function editor(p){const section=block('Sua identidade no Santuário'),form=node('form','','profile-editor');
  const avatarLabel=node('label',T('Escolha seu retrato')),avatars=node('div','','avatar-picker');const field=document.createElement('input');field.type='hidden';field.name='avatar';field.value=String(p.avatar);form.append(field);
  for(const id of p.unlocks.classes){const btn=node('button','','avatar-choice');btn.type='button';btn.setAttribute('aria-label',classes[id]);btn.setAttribute('aria-pressed',String(id===p.avatar));btn.append(portrait({avatar:id,dots:p.dots,golden:p.golden},'small'));btn.addEventListener('click',()=>{editorDirty=true;field.value=String(id);for(const b of avatars.children)b.setAttribute('aria-pressed',String(b===btn));});avatars.append(btn);}avatarLabel.append(avatars);form.append(avatarLabel);
  const titleLabel=node('label',T('Título')),select=node('select');select.name='title';for(const id of p.unlocks.titles){const option=node('option',T(titles[id]));option.value=id;select.append(option);}select.value=p.title;titleLabel.append(select);form.append(titleLabel);
  const bioLabel=node('label',T('Sobre você')),bio=node('input');bio.name='bio';bio.maxLength=160;bio.value=p.bio;bioLabel.append(bio);form.append(bioLabel);
  const submit=node('button',T('Salvar identidade'),'primary');const status=node('p','','profile-save-status');status.setAttribute('role','status');form.append(submit,status);
  form.addEventListener('input',()=>editorDirty=true);form.addEventListener('submit',async event=>{event.preventDefault();if(saving)return;saving=true;submit.disabled=true;try{const updated=await api('profiles/update',{avatar:Number(field.value),title:select.value,bio:bio.value});if(current)current.profile=updated;completeProfile=updated;lastProfile='';editorDirty=false;renderProfile(updated,true);byId('sanctuary-profile').querySelector('.profile-save-status').textContent=T('Sua identidade foi atualizada.');window.rfdRefresh?.();}catch(error){status.textContent=T(error.message);}finally{saving=false;submit.disabled=false;}});section.append(form);return section;
 }
 async function onView(path){if(!path.startsWith('profile'))return;editorDirty=false;target=path.includes('/')?path.split('/')[1]:'';const id=++profileRequest;lastProfile='';const root=byId('sanctuary-profile');root.replaceChildren(node('p',T('Consultando as crônicas…'),'profile-loading'));
  const username=target||current?.username;if(!username){root.replaceChildren(node('h1',T('Seu lugar no Santuário.')),node('p',T('Entre na sua conta para consultar sua jornada.')));return;}
  try{const p=await api('profiles/public',undefined,'&username='+encodeURIComponent(username));if(id!==profileRequest)return;const own=current?.username?.toLowerCase()===p.username.toLowerCase();target=own?'':p.username;if(own)completeProfile=p;renderProfile(p,own);}catch(error){if(id===profileRequest)root.replaceChildren(node('p',T(error.message),'profile-error'));}
 }
 for(const button of document.querySelectorAll('[data-room-filter]'))button.addEventListener('click',()=>{selectMode(button.dataset.roomFilter);window.rfdRenderRooms?.();});
 document.documentElement.addEventListener('rfd-language',()=>{lastProfile='';update(current);if(!byId('sanctuary-profile').closest('[data-panel]').hidden)onView('profile'+(target?'/'+target:''));});
 window.RfdSanctuary={update,onView,open,user,portrait,roomVisible:room=>room.mode===filter,tier:id=>tiers[id]||tiers[0],updateRoomForm};
 api('progression/rules').then(data=>{rules=data.rules||data;lastProfile='';if(current)update(current);if(!byId('sanctuary-profile').closest('[data-panel]').hidden)onView('profile'+(target?'/'+target:''));}).catch(()=>{});
})();
