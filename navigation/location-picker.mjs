const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Both fields share matching, invalidation and selection behavior.
export function createLocationPicker({data,network,state,name,t,floorName,onChange,onPick}){
  const fields={start:{floor:'',query:''},end:{floor:'',query:''}};
  let activeCategory='';
  const categories=()=>[
    {id:'blue',title:t('板南線','Bannan Line','Jalur Bannan'),sub:'BL12',nodes:['BL_P3','BL_P4']},
    {id:'red',title:t('淡水信義線','Tamsui–Xinyi Line','Jalur Tamsui–Xinyi'),sub:'R10',nodes:['R_P1','R_P2']},
    {id:'exit',title:t('出口','Station exits','Pintu keluar'),sub:'M1–M8',nodes:Array.from({length:8},(_,i)=>`M${i+1}_G`)},
    {id:'airport',title:t('機場捷運','Airport MRT','MRT Bandara'),sub:'A1',nodes:['b1_airport']}
  ];
  const categoryFor=id=>categories().find(c=>c.nodes.includes(id))?.id||'';
  const categoryIcon=id=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${id==='exit'?'<path d="M10 3H3v18h7M8 12h14m-5-5 5 5-5 5"/>':'<rect x="5" y="3" width="14" height="15" rx="4"/><path d="M5 10h14M12 3v7M8 18l-3 4m11-4 3 4M8 14h1m6 0h1"/>'}</svg>`;
  const destinationGrid=()=>`<p class="destination-help">${t('選擇路線或出口，再確認前往方向。','Choose a line or exit, then confirm your direction.','Pilih jalur atau pintu keluar, lalu tentukan arah.')}</p><div class="destination-grid" role="group" aria-label="${t('目的地類別','Destination categories','Kategori tujuan')}">${categories().map(c=>`<button type="button" class="destination-card ${c.id}" data-destination-category="${c.id}" aria-pressed="false"${c.nodes.length>1?' aria-controls="destination-choices" aria-expanded="false"':''}><span class="destination-symbol">${categoryIcon(c.id)}</span><strong>${c.title}</strong><small>${c.sub}</small><span class="destination-chevron" aria-hidden="true">›</span></button>`).join('')}</div><div id="destination-choices" class="destination-choices" hidden></div><p id="destination-selected" class="destination-selected" role="status" hidden></p>`;
  function syncDestination(){
    const selected=state.destination,category=categories().find(c=>c.id===activeCategory);
    for(const button of document.querySelectorAll('[data-destination-category]')){
      const current=button.dataset.destinationCategory===activeCategory;
      button.setAttribute('aria-pressed',String(current));button.classList.toggle('is-confirmed',current&&!!selected);button.querySelector('.destination-chevron').textContent=current&&selected?'✓':'›';
      if(button.hasAttribute('aria-expanded'))button.setAttribute('aria-expanded',String(current));
    }
    const choices=$('destination-choices');choices.replaceChildren();choices.hidden=!category||category.nodes.length===1;choices.classList.toggle('exit-choices',category?.id==='exit');
    if(!choices.hidden){
      const heading=document.createElement('p');heading.textContent=category.id==='exit'?t('選擇出口編號','Choose an exit','Pilih nomor pintu keluar'):t('選擇搭乘方向','Choose a direction','Pilih arah perjalanan');choices.append(heading);
      for(const id of category.nodes){const node=network.nodes.get(id);if(!node)continue;const button=document.createElement('button');button.type='button';button.dataset.pickerNode=id;button.dataset.pickerKind='end';button.textContent=name(id);button.setAttribute('aria-pressed',String(id===selected));choices.append(button);}
    }
    const status=$('destination-selected');status.hidden=!selected;status.textContent=selected?t(`已選擇：${name(selected)}`,`Selected: ${name(selected)}`,`Dipilih: ${name(selected)}`):'';
  }
  function chooseCategory(id,keyboard=false){
    const category=categories().find(c=>c.id===id);if(!category)return;
    if(activeCategory===id&&state.destination){syncDestination();return;}
    activeCategory=id;fields.end.floor='';fields.end.query='';state.destination=null;
    $('end-floor').value='';$('end-search').value='';refresh('end',{open:false});
    if(category.nodes.length===1)select('end',network.nodes.get(category.nodes[0]),false,keyboard);
    else{syncDestination();onChange();}
  }
  const stateKey=kind=>kind==='start'?'start':'destination';
  const $=id=>document.getElementById(id);
  const aliases={b1_airport:'機捷 桃園 機場 airport mrt a1 bandara',BL_P3:'板南線 bannan blue biru',BL_P4:'板南線 bannan blue biru',R_P1:'淡水信義線 tamsui xinyi red merah',R_P2:'淡水信義線 tamsui xinyi red merah',r3_tr:'台鐵 tra train kereta',r3_hsr:'高鐵 hsr high speed kereta cepat'};
  const searchText=node=>{const level=network.levels.get(node.level_id);return `${name(node.id)} ${node.label} ${node.id} ${node.level_id} ${floorName(level)} ${level.label} ${aliases[node.id]||''}`.toLocaleLowerCase();};
  function hide(kind){$(kind+'-results').hidden=true;$(kind+'-search').setAttribute('aria-expanded','false');}
  function syncCard(kind){const value=state[stateKey(kind)];$(kind).value=value||'';$(kind+'-step').classList.toggle('is-selected',!!value);if(kind==='end')syncDestination();}
  function refresh(kind,{invalidate=false,open=true}={}){
    if(open)hide(kind==='start'?'end':'start');
    const field=fields[kind],key=stateKey(kind),query=field.query.trim().toLocaleLowerCase();
    const matches=node=>(!field.floor||node.level_id===field.floor)&&searchText(node).includes(query);
    if(invalidate&&state[key]){
      const selected=network.nodes.get(state[key]);
      if(!query||!selected||!matches(selected))state[key]=null;
    }
    const results=$(kind+'-results');results.replaceChildren();
    const show=Boolean(query||field.floor);let count=0;
    if(show)for(const level of data.levels){
      if(field.floor&&field.floor!==level.id)continue;
      const nodes=data.nodes.filter(node=>node.level_id===level.id&&matches(node));if(!nodes.length)continue;
      const group=document.createElement('section');group.className='search-result-group';
      const heading=document.createElement('h3');heading.textContent=`${level.id} · ${floorName(level)}`;group.append(heading);
      for(const node of nodes){
        const button=document.createElement('button');button.type='button';button.className='search-result';button.dataset.pickerNode=node.id;button.dataset.pickerKind=kind;
        button.id=`${kind}-option-${node.id}`;button.setAttribute('role','option');button.setAttribute('aria-selected',String(node.id===state[key]));
        button.textContent=name(node.id);group.append(button);count++;
      }
      results.append(group);
    }
    if(!count){const empty=document.createElement('p');empty.className='search-empty';empty.textContent=show?t('找不到符合的地標，請更換關鍵字或樓層。','No matching landmarks. Try another keyword or floor.','Penanda tidak ditemukan. Coba kata kunci atau lantai lain.'):t('輸入關鍵字，或先選擇樓層瀏覽地標。','Enter a keyword or choose a floor to see landmarks.','Masukkan kata kunci atau pilih lantai untuk melihat penanda.');results.append(empty);}
    if(query&&count){const total=document.createElement('p');total.className='search-count';total.textContent=t(`找到 ${count} 個地標`,`${count} landmarks found`,`${count} penanda ditemukan`);results.prepend(total);}
    results.hidden=!(open&&show);$(kind+'-search').setAttribute('aria-expanded',String(!results.hidden));syncCard(kind);
  }
  function select(kind,node,fromMap=false,keyboard=false){
    if(!keyboard)$(kind+'-search').blur();
    const field=fields[kind];if(kind==='end'){activeCategory=categoryFor(node.id);field.floor='';}state[stateKey(kind)]=node.id;field.query=name(node.id);if(fromMap)field.floor=node.level_id;
    $(kind+'-search').value=field.query;$(kind+'-floor').value=field.floor;
    refresh(kind,{open:false});onChange();if(keyboard&&!fromMap){const focusTarget=kind==='end'&&activeCategory&&!document.querySelector('.destination-other').open?document.querySelector(`[data-destination-category="${activeCategory}"]`):$(kind+'-search');focusTarget.focus({preventScroll:true});hide(kind);}
  }
  function render(){return `<div class="route-steps" id="route-steps">${['start','end'].map((kind,index)=>{
    const field=fields[kind],selected=network.nodes.get(state[stateKey(kind)]);
    if(selected){field.query=name(selected.id);if(field.floor&&field.floor!==selected.level_id)field.floor=selected.level_id;}
    return `<section class="route-step ${kind==='end'?'destination-step':''} ${selected?'is-selected':''}" id="${kind}-step" aria-labelledby="${kind}-title"><span class="step-number" aria-hidden="true">${index+1}</span><div class="step-content"><h2 id="${kind}-title">${kind==='start'?t('出發地','Starting point','Titik awal'):t('目的地','Destination','Tujuan')}</h2>${kind==='end'?destinationGrid()+`<details class="destination-other" ${selected&&!categoryFor(selected.id)?'open':''}><summary>${t('搜尋其他地標','Search other landmarks','Cari penanda lainnya')}</summary>`:''}<label class="field floor-field" for="${kind}-floor">${t('樓層','Floor','Lantai')}<select id="${kind}-floor"><option value="">${t('不限樓層','All floors','Semua lantai')}</option>${data.levels.map(level=>`<option value="${level.id}" ${field.floor===level.id?'selected':''}>${level.id} · ${esc(floorName(level))}</option>`).join('')}</select></label><label class="field search-field" for="${kind}-search">${t('搜尋地標','Search landmarks','Cari penanda')}<input id="${kind}-search" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${kind}-results" type="search" value="${esc(field.query)}" placeholder="${t('輸入地標或路線，例如：機捷、M8','Landmark or line, e.g. Airport MRT, M8','Penanda atau jalur, mis. MRT Bandara, M8')}" autocomplete="off"></label><input id="${kind}" type="hidden" value="${esc(selected?.id||'')}"><div id="${kind}-results" class="search-results" role="listbox" aria-label="${kind==='start'?t('出發地搜尋結果','Starting point results','Hasil titik awal'):t('目的地搜尋結果','Destination results','Hasil tujuan')}" hidden></div><button type="button" class="map-pick-button secondary" id="pick-${kind}" data-picker-map="${kind}" aria-pressed="false"><span aria-hidden="true">⌖</span>${kind==='start'?t('在地圖上選擇出發地','Choose start on the map','Pilih titik awal di peta'):t('在地圖上選擇目的地','Choose destination on the map','Pilih tujuan di peta')}</button>${kind==='end'?'</details>':''}</div></section>`;
  }).join('')}</div>`;}
  function mount(){
    activeCategory=categoryFor(state.destination);
    for(const kind of ['start','end']){
      refresh(kind,{open:false});
      $(kind+'-floor').addEventListener('change',()=>{fields[kind].floor=$(kind+'-floor').value;refresh(kind,{invalidate:true});onChange();});
      $(kind+'-search').addEventListener('input',()=>{fields[kind].query=$(kind+'-search').value;refresh(kind,{invalidate:true});onChange();});
      $(kind+'-search').addEventListener('focus',()=>refresh(kind));
    }
    $('route-steps').addEventListener('click',event=>{const button=event.target.closest('button');if(button?.dataset.destinationCategory)chooseCategory(button.dataset.destinationCategory,event.detail===0);else if(button?.dataset.pickerNode)select(button.dataset.pickerKind,network.nodes.get(button.dataset.pickerNode),false,event.detail===0);else if(button?.dataset.pickerMap)onPick(button.dataset.pickerMap);});
    $('route-steps').addEventListener('keydown',event=>{
      const kind=event.target.id==='start-search'?'start':event.target.id==='end-search'?'end':event.target.dataset.pickerKind;if(!kind)return;
      if(event.key==='Escape'){event.preventDefault();$(kind+'-search').focus();hide(kind);return;}
      if(!['ArrowDown','ArrowUp'].includes(event.key))return;
      event.preventDefault();if($(kind+'-results').hidden)refresh(kind);
      const options=[...$(kind+'-results').querySelectorAll('[role="option"]')];if(!options.length)return;
      const index=options.indexOf(event.target),direction=event.key==='ArrowDown'?1:-1;
      options[index===-1?(direction===1?0:options.length-1):(index+direction+options.length)%options.length].focus();
    });
  }
  return {render,mount,select,filter:kind=>fields[kind].floor,reset(){activeCategory='';for(const kind of ['start','end']){fields[kind].floor='';fields[kind].query=name(state[stateKey(kind)]);}}};
}
