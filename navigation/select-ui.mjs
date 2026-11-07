const controls=new WeakMap();let opened=null;
function close(focus=false){if(!opened)return;const c=opened;opened=null;c.list.remove();c.button.setAttribute('aria-expanded','false');if(focus)c.button.focus();}
document.addEventListener('pointerdown',e=>{if(opened&&!opened.button.contains(e.target)&&!opened.list.contains(e.target))close();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened){e.preventDefault();close(true);}});
window.addEventListener('resize',()=>close());window.addEventListener('scroll',e=>{if(opened&&!opened.list.contains(e.target))close();},true);window.addEventListener('hashchange',()=>close());
export function enhanceSelects(root=document){
 if(opened&&!opened.button.isConnected)close();
 for(const select of root.querySelectorAll('select')){
  const existing=controls.get(select);if(existing){existing.sync();continue;}
  const button=document.createElement('button');button.type='button';button.className='custom-select';button.id=select.id+'-control';button.setAttribute('role','combobox');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',select.id+'-choices');
  const label=select.getAttribute('aria-label')||select.labels?.[0]?.firstChild?.textContent?.trim()||'';
  for(const l of select.labels||[])l.htmlFor=button.id;
  select.hidden=true;select.tabIndex=-1;select.after(button);
  const list=document.createElement('div');list.className='custom-select-options';list.id=select.id+'-choices';list.setAttribute('role','listbox');list.setAttribute('aria-label',label);
  const control={button,list,sync(){button.textContent=select.selectedOptions[0]?.textContent||'';button.disabled=select.disabled;button.setAttribute('aria-label',label+': '+button.textContent);for(const option of list.children)option.setAttribute('aria-selected',String(option.dataset.value===select.value));}};
  controls.set(select,control);control.sync();select.addEventListener('change',control.sync);
  function open(){close();list.replaceChildren();for(const option of select.options){if(option.hidden)continue;const item=document.createElement('div');item.setAttribute('role','option');item.tabIndex=-1;item.dataset.value=option.value;item.textContent=option.textContent;item.setAttribute('aria-selected',String(option.selected));item.setAttribute('aria-disabled',String(option.disabled));list.append(item);}
   document.body.append(list);const rect=button.getBoundingClientRect(),available=Math.max(96,Math.max(rect.top,innerHeight-rect.bottom)-16),height=Math.min(260,available);list.style.width=Math.min(rect.width,innerWidth-24)+'px';list.style.left=Math.max(12,Math.min(rect.left,innerWidth-list.offsetWidth-12))+'px';list.style.maxHeight=height+'px';if(innerHeight-rect.bottom>=Math.min(220,height)+8)list.style.top=rect.bottom+6+'px';else list.style.top=Math.max(8,rect.top-Math.min(list.scrollHeight,height)-6)+'px';
   opened=control;button.setAttribute('aria-expanded','true');const item=list.querySelector('[aria-selected=true]')||list.firstElementChild;item?.focus({preventScroll:true});item?.scrollIntoView({block:'nearest'});
  }
  function choose(item){if(!item||item.getAttribute('aria-disabled')==='true')return;select.value=item.dataset.value;close(true);select.dispatchEvent(new Event('change',{bubbles:true}));control.sync();}
  button.addEventListener('click',()=>opened===control?close():open());
  button.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();open();}});
  list.addEventListener('click',e=>choose(e.target.closest('[role=option]')));
  list.addEventListener('keydown',e=>{const options=[...list.children].filter(n=>n.getAttribute('aria-disabled')!=='true'),index=options.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();options[e.key==='Home'?0:e.key==='End'?options.length-1:(index+(e.key==='ArrowDown'?1:-1)+options.length)%options.length]?.focus();}else if(['Enter',' '].includes(e.key)){e.preventDefault();choose(document.activeElement);}else if(e.key==='Tab')close();});
 }
}
