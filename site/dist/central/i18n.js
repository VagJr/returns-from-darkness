(() => {
 const names={'pt-BR':'Português','en':'English','es':'Español','fr':'Français','de':'Deutsch','it':'Italiano','pl':'Polski','ru':'Русский','uk':'Українська','tr':'Türkçe','ja':'日本語','ko':'한국어','zh-CN':'简体中文','ar':'العربية'};
 const requested=new URLSearchParams(location.search).get('lang');
 let language=names[requested]?requested:localStorage.getItem('rfd-language')||navigator.language;
 if(!names[language])language=names[language.split('-')[0]]?language.split('-')[0]:'en';
 let packs={},originals=new WeakMap();
 const skip='#messages,#users,#channels,.room strong,.party-slot strong,#identity,#welcome,#room-name,#room-detail,#home-room,script,style,option';
 window.rfdT=text=>packs[language]?.[text]||text;
 function translate(){
  document.title=(packs[language]?.['Santuário']||'Sanctuary')+' · Returns from Darkness';
  const identity=document.getElementById('identity');
  if(identity&&(!document.getElementById('signed-in')||document.getElementById('signed-in').hidden)){
   const label=window.rfdT('Minha conta');if(identity.textContent!==label)identity.textContent=label;
  }
  document.documentElement.lang=language;document.documentElement.dir=language==='ar'?'rtl':'ltr';
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  for(let node;node=walker.nextNode();){
   if(node.parentElement?.closest(skip))continue;
   const text=node.textContent.trim();const before=originals.get(node);
   const source=before&&node.textContent===before.translated?before.source:text;
   if(packs['pt-BR']?.[source]){
    const translated=window.rfdT(source);
    originals.set(node,{source,translated});if(node.textContent!==translated)node.textContent=translated;
   }
  }
  for(const element of document.querySelectorAll('[placeholder],[aria-label],[alt]')){
   for(const attr of ['placeholder','aria-label','alt']){
    const value=element.getAttribute(attr);if(!value)continue;
    const source=element.dataset['rfd'+attr.replace('-','')]||value;
    if(packs['pt-BR']?.[source]){element.dataset['rfd'+attr.replace('-','')]=source;const translated=window.rfdT(source);if(value!==translated)element.setAttribute(attr,translated);}
   }
  }
 }
 const label=document.createElement('label');label.className='language-picker';label.setAttribute('aria-label','Idioma');
 const select=document.createElement('select');select.setAttribute('aria-label','Idioma');
 for(const [id,name]of Object.entries(names)){const option=document.createElement('option');option.value=id;option.textContent=name;select.append(option);}select.value=language;label.append(select);document.querySelector('header').append(label);
 select.addEventListener('change',()=>{language=select.value;localStorage.setItem('rfd-language',language);const url=new URL(location.href);url.searchParams.set('lang',language);history.replaceState(null,'',url);translate();});
 fetch('locales.json').then(r=>{if(!r.ok)throw Error('Translations unavailable');return r.json();}).then(data=>{
  packs=data;translate();let queued=false;
  const options={childList:true,subtree:true,characterData:true};
  const observer=new MutationObserver(()=>{
   if(queued)return;queued=true;
   requestAnimationFrame(()=>{queued=false;observer.disconnect();try{translate();}finally{observer.observe(document.body,options);}});
  });observer.observe(document.body,options);
 }).catch(()=>{});
})();
