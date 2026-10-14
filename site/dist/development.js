document.querySelectorAll('[data-development]').forEach(section=>{
 const tabs=[...section.querySelectorAll('[data-dev-tab]')],panels=[...section.querySelectorAll('[data-dev-panel]')];
 function activate(index,focus=false){tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;});panels.forEach((panel,i)=>panel.hidden=i!==index);if(focus)tabs[index].focus();}
 tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>activate(index));tab.addEventListener('keydown',event=>{let next;if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;if(next!==undefined){event.preventDefault();activate(next,true);}});});
 const shots=[...section.querySelectorAll('[data-dev-shot]')];
 function choose(button){const id=button.dataset.devShot;if(!/^0[1-6]$/.test(id))return;shots.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));const base='/assets/development/ashes/';section.querySelector('[data-dev-detail]').src=base+'inventory-detail-'+id+'.webp';section.querySelector('[data-dev-detail-link]').href=base+'inventory-detail-'+id+'.webp';section.querySelector('[data-dev-full]').src=base+'inventory-'+id+'.webp';section.querySelector('[data-dev-full-link]').href=base+'inventory-'+id+'.webp';section.querySelector('[data-dev-shot-title]').textContent=window.rfdT?.(button.dataset.shotTitle)||button.dataset.shotTitle;}
 shots.forEach(button=>button.addEventListener('click',()=>choose(button)));
 document.documentElement.addEventListener('rfd-language',()=>{const selected=shots.find(b=>b.getAttribute('aria-pressed')==='true');if(selected)choose(selected);});
});
