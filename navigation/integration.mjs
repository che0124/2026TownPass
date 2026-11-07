import {enhanceSelects} from './select-ui.mjs';
import {createCompass} from './compass.mjs';
import {createSpeech} from './speech.mjs';
import {createLocationPicker} from './location-picker.mjs';
import {buildNetwork,findRoute} from './routes.mjs';
import {createScene} from './scene.mjs';
import {createAR} from './ar-camera.mjs';
import {mapDistance} from './ar-route.mjs';
import {localizedLabel,floorLabel} from './labels.mjs';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pin='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>';

export async function createNavigation({state,go,render,save}){
  let data,network,failure,route,routeKey,cursor=0,scene,ar,mini,floor='all',top=false,picking=null;
  let phoneHeading=null,followPhone=false;
  const compass=createCompass(value=>{phoneHeading=value;if(location.hash==='#guide'&&!dialog.open){paintMap();const status=document.querySelector('#heading-status');if(status)status.hidden=true;}});
  const app=()=>document.querySelector('#app');
  const dialog=document.querySelector('#ar');
  const t=(zh,en,id)=>state.lang==='zh'?zh:state.lang==='id'?id:en;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{const res=await fetch(new URL('./station.json',import.meta.url),{signal:controller.signal});if(!res.ok)throw Error(res.status);data=await res.json();network=buildNetwork(data);}catch(error){failure=error;}finally{clearTimeout(timer);}
  const name=id=>network?.nodes.has(id)?localizedLabel(network.nodes.get(id),state.lang):'';
  const homeMap={airport:'b1_airport',blue:'BL_P3',red:'R_P1',exit:'M1_G'};
  const button=(label,action,primary=false)=>`<button class="${primary?'primary':'secondary full'}" data-nav="${action}">${esc(label)}</button>`;
  const back=()=>'';
  const note=()=>'';
  const selectionKey=()=>JSON.stringify([state.start,state.destination,!!state.strict,!!state.luggage]);
  function plan(){routeKey=selectionKey();route=network&&findRoute(network,state.start,state.destination,{strict:!!state.strict,elevatorsOnly:state.luggage});cursor=0;}
  function startJourney(destination=null,firstPage='locate'){leave();state.start=null;state.destination=destination;route=null;routeKey=null;cursor=0;picking=null;picker?.reset();floor='all';top=false;go(firstPage);}
  const mode=step=>({walk:t('沿通道步行','Walk along the passage','Berjalan menyusuri lorong'),elevator:t('搭乘電梯','Take the elevator','Naik lift'),stairs:t('走樓梯','Take the stairs','Gunakan tangga'),escalator:t('搭乘手扶梯','Take the escalator','Naik eskalator'),fare_gate:t('通過閘門','Pass the fare gate','Lewati gerbang tiket')})[step.edge.mode];
  const describe=step=>`${mode(step)} → ${name(step.to.id)}`;
  const detail=step=>[step.from.level_id!==step.to.level_id?`${step.from.level_id} → ${step.to.level_id}`:'',step.edge.facility_id?localizedLabel(network.facilities.get(step.edge.facility_id)||{id:step.edge.facility_id,label:step.edge.facility_id},state.lang):'',step.edge.status==='inferred'?t('推定路段，請現場核對','Inferred connection; verify on site','Koneksi perkiraan; periksa di lokasi'):''].filter(Boolean).join(' · ');

  const endpoints=()=>`<div class="nav-endpoints"><div><i></i><span><small>${t('起點','From','Dari')}</small><strong>${esc(name(state.start))}</strong></span></div><div><i></i><span><small>${t('目的地','To','Tujuan')}</small><strong>${esc(name(state.destination))}</strong></span></div></div>`;
  const picker=network?createLocationPicker({data,network,state,name,t,floorName:level=>floorLabel(level,state.lang),onChange(){picking=null;plan();updateSelection();paintMap();},onPick(kind){picking=picking===kind?null:kind;if(picking){document.querySelector('#location-picker-map').open=true;floor=picker.filter(kind)||network.nodes.get(state[kind==='start'?'start':'destination'])?.level_id||'B1';top=true;scene?.resetZoom();}updateSelection();paintMap();if(picking)document.querySelector('#location-picker-map').scrollIntoView({block:'nearest'});}}):null;
  function updateSelection(){
    const summary=document.querySelector('#selection-summary');if(!summary)return;
    summary.classList.toggle('has-route',!!route);summary.classList.toggle('no-route',!!state.start&&!!state.destination&&!route);
    summary.textContent=state.start&&state.destination?(route?t(`路線已準備好：${name(state.start)} → ${name(state.destination)}`,`Route ready: ${name(state.start)} → ${name(state.destination)}`,`Rute siap: ${name(state.start)} → ${name(state.destination)}`):t('目前沒有連通路線，請更換起點或目的地。','No connected route. Choose another starting point or destination.','Tidak ada rute. Pilih titik awal atau tujuan lain.')):state.start?t('再選擇目的地，就會自動規劃路線。','Choose a destination to plan your route.','Pilih tujuan untuk merencanakan rute.'):state.destination?t('再選擇出發地，就會自動規劃路線。','Choose a starting point to plan your route.','Pilih titik awal untuk merencanakan rute.'):t('選好出發地與目的地後，就會顯示路線。','Choose a starting point and destination to see your route.','Pilih titik awal dan tujuan untuk melihat rute.');
    document.querySelector('[data-nav="preview"]').disabled=!route;
    for(const kind of ['start','end'])document.querySelector('#pick-'+kind).setAttribute('aria-pressed',String(picking===kind));
    const map=document.querySelector('#location-picker-map');map.hidden=!picking;map.classList.toggle('is-picking',!!picking);
    document.querySelector('#picker-hint').textContent=picking?(picking==='start'?t('請點選地圖上的出發地圓點；可切換樓層或放大。','Tap a starting landmark dot on the map. Change floors or zoom if needed.','Ketuk titik awal di peta. Ubah lantai atau perbesar jika perlu.'):t('請點選地圖上的目的地圓點；可切換樓層或放大。','Tap a destination landmark dot on the map. Change floors or zoom if needed.','Ketuk titik tujuan di peta. Ubah lantai atau perbesar jika perlu.')):t('也可以按上方選點按鈕，再到地圖上選擇地標。','You can also use either map-picking button above to choose a landmark.','Anda juga dapat memakai tombol pilih di peta untuk memilih penanda.');
  }
  function renderPicker(){
    app().innerHTML=back('home')+`<p class="eyebrow">${t('規劃站內路線','PLAN YOUR ROUTE','RENCANAKAN RUTE')}</p><h1>${t('設定你的路線','Plan your journey','Rencanakan perjalanan')}</h1><p>${t('先確認出發地，再選擇目的地。','Choose your starting point, then your destination.','Pilih titik awal, lalu tujuan Anda.')}</p>`+picker.render()+`<p id="selection-summary" class="selection-summary" role="status" aria-live="polite"></p>`+''+`<details id="location-picker-map" class="location-picker-map planner-map" hidden><summary id="picker-map-title">${t('在地圖上選點','Choose on map','Pilih di peta')}</summary><div class="planner-map-content"><p id="picker-hint" class="picker-hint" role="status" aria-live="polite"></p>${mapTools()}`+mapMarkup()+`<p id="speech-status" class="nav-map-credit" role="status"></p></div></details><div class="nav-footer">${button(t('預覽路線','Preview route','Lihat rute'),'preview',true)}</div>`+note();
    picker.mount();plan();mountMap();updateSelection();window.scrollTo(0,0);
  }

  function leave(){compass.stop();phoneHeading=null;speech.stop();scene?.destroy();scene=null;if(dialog.open)ar?.close();}
  function staticAR(){
    dialog.querySelector('#ar-title').textContent=t('AR 導航','AR navigation','Navigasi AR');
    dialog.querySelector('[data-ar="close"]').setAttribute('aria-label',t('關閉 AR','Close AR','Tutup AR'));
    dialog.querySelector('.ar-bottom').setAttribute('aria-label',t('導航指引','Navigation instructions','Petunjuk navigasi'));
    dialog.querySelector('[data-ar="retry"]').textContent=t('重新開啟相機','Retry camera','Coba kamera');
    document.querySelector('#ar-map').setAttribute('aria-label',t('目前樓層與估算位置','Current floor and estimated position','Lantai dan perkiraan posisi saat ini'));
  }
  function initAR(){if(ar)return;mini=createScene(document.querySelector('#ar-map'),data,network);ar=createAR(dialog,network,()=>advance(1),(heading,uv)=>{const here=route?.steps[cursor-1]?.to||network.nodes.get(state.start);if(here)mini.update({floor:here.level_id,top:true,compact:true,heading,viewCenter:uv||network.positions.get(here.id),viewSpan:56/mapDistance([0,0],[1,0]),currentUV:uv,current:here,end:network.nodes.get(state.destination),steps:route?.steps,step:cursor,labels:mapLabels()});},()=>state.lang,(text,key)=>speech.read(text,'ar:'+key),()=>speech.stop());}
  const mapLabels=()=>({end:t('終點','Destination','Tujuan'),current:t('目前位置','You are here','Posisi Anda')});
  function updateAR(){initAR();staticAR();const step=route?.steps[cursor],here=route?.steps[cursor-1]?.to||network.nodes.get(state.start);ar.update({here,hereLabel:name(here.id),step,after:route?.steps[cursor+1],instruction:step?describe(step):t('已到達目的地','Arrived','Sudah sampai'),detail:step?detail(step):'',segment:`${cursor+1} / ${route?.steps.length||0}`});dialog.classList.toggle('big-mode',state.mode==='elder');}
  const speech=createSpeech({getLanguage:()=>state.lang,onStatus(status){const node=document.querySelector('#speech-status');if(node)node.textContent=['unavailable','language-unavailable'].includes(status)?t('暫時無法使用語音，請依照文字指引前進。','Voice is unavailable. Follow the written instructions.','Suara tidak tersedia. Ikuti petunjuk tertulis.'):'';}});
  function speak(force=false){const step=route?.steps[cursor];if(step)speech.read(describe(step),`guide:${routeKey}:${cursor}:${state.lang}`,{force});}
  function advance(change){if(!route)return;const from=route.steps[cursor-1]?.to||network.nodes.get(state.start);cursor=Math.max(0,Math.min(route.steps.length,cursor+change));if(cursor===route.steps.length){ar?.close();go('arrived');return;}const here=route.steps[cursor-1]?.to||network.nodes.get(state.start);if(floor===from.level_id)floor=here.level_id;drawGuide();}
  function paintMap(){const headingStatus=document.querySelector('#heading-status');if(headingStatus)headingStatus.hidden=!followPhone||phoneHeading!==null;const headingButton=document.querySelector('[data-nav=heading-mode]');if(headingButton){headingButton.setAttribute('aria-pressed',String(followPhone));headingButton.textContent=followPhone?t('手機朝向','Phone heading','Arah ponsel'):t('路線朝上','Route up','Arah rute');}const select=document.querySelector('#nav-map-floor');if(select)select.value=floor;const here=route?.steps[cursor-1]?.to||network.nodes.get(state.start);scene?.update({floor,top,followRoute:location.hash==='#guide',phoneHeading:location.hash==='#guide'&&followPhone?phoneHeading:null,current:here,end:network.nodes.get(state.destination),steps:route?.steps,step:cursor,picking,labels:mapLabels(),...mapFocus()});const view=document.querySelector('[data-nav="top"]');if(view){view.disabled=location.hash==='#guide';view.setAttribute('aria-pressed',String(top));view.textContent=top?t('立體','3D','3D'):t('俯視','Top view','Tampak atas');}enhanceSelects(app());}
  function mapFocus(){
    if(picking||!top||floor==='all'||!route)return {};
    const points=[];
    for(const step of route.steps.slice(cursor)){
      for(const node of [step.from,step.to])if(node.level_id===floor&&network.positions.get(node.id))points.push(network.positions.get(node.id));
      if(step.from.level_id===floor&&step.to.level_id===floor&&step.edge.geometry?.uv)points.push(...step.edge.geometry.uv);
    }
    if(!points.length)return {};
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
    return {viewCenter:[(x0+x1)/2,(y0+y1)/2],viewSpan:Math.max(.24,(x1-x0)*1.35,(y1-y0)*2013/1872*1.35)};
  }
  function mountMap(){scene?.destroy();scene=createScene(document.querySelector('#nav-scene'),data,network,node=>{if(picking)picker.select(picking,node,true);});paintMap();}
  const mapTools=()=>`<div class="nav-map-tools"><select id="nav-map-floor" aria-label="${t('地圖顯示樓層','Map floor','Lantai peta')}"><option value="all">${t('所有樓層','All floors','Semua lantai')}</option>${data.levels.map(l=>`<option>${l.id}</option>`).join('')}</select><button data-nav="top"></button><button data-nav="zoom-in" aria-label="${t('放大','Zoom in','Perbesar')}">＋</button><button data-nav="zoom-out" aria-label="${t('縮小','Zoom out','Perkecil')}">−</button></div>`;
  function mapMarkup(preview=false){return `<div class="nav-map ${preview?'nav-map-preview':''}"><canvas id="nav-scene" aria-label="${t('樓層路線圖','Floor route map','Peta rute lantai')}"></canvas></div>`;}
  function drawGuide(){const step=route.steps[cursor];document.querySelector('#nav-current').innerHTML=`<div class="nav-progress"><span>${t('路段','Segment','Segmen')} ${cursor+1} / ${route.steps.length}</span><progress max="${route.steps.length}" value="${cursor}" aria-label="${t('導航進度','Route progress','Progres rute')}"></progress></div><p class="nav-here">${esc(name(step.from.id))}</p><h1 class="instruction">${esc(describe(step))}</h1>${detail(step)?`<p class="nav-detail">${esc(detail(step))}</p>`:''}${state.mode==='child'?`<p class="child-guide">${t('跟我一起，找到下一個地標！','Let’s find the next landmark!','Ayo cari penanda berikutnya!')}</p>`:''}`;document.querySelector('[data-nav="previous"]').disabled=cursor===0;paintMap();updateAR();if(!dialog.open)speak();}
  function renderPage(page){
    document.documentElement.classList.toggle('page-planner',['locate','candidates','confirm','destinations'].includes(page));
    document.documentElement.classList.toggle('page-guiding',page==='guide');
    app().className='navigation-page nav-page-'+page;
    document.documentElement.lang=state.lang==='zh'?'zh-Hant':state.lang;
    document.querySelector('.app-shell').classList.toggle('big-mode',state.mode==='elder');



    document.querySelector('#language').setAttribute('aria-label',t('選擇語言','Choose language','Pilih bahasa'));
    if(failure){app().innerHTML=back('home')+`<h1>${t('路網載入失敗','Unable to load routes','Gagal memuat rute')}</h1>`+button(t('重新載入','Reload','Muat ulang'),'reload');return;}
    if(['route','guide','arrived'].includes(page)&&!network.nodes.has(state.start)){go('locate');return;}
    if(['route','guide','arrived'].includes(page)&&!network.nodes.has(state.destination)){go('destinations');return;}
    if(['locate','candidates','confirm','destinations'].includes(page)){renderPicker();return;}
    let html='';
    if(page==='route'){
      plan();floor='all';top=false;const inferred=route?.steps.filter(s=>s.edge.status==='inferred').length||0;
      html=back('destinations')+`<p class="eyebrow">02 · ${t('路線預覽','YOUR ROUTE','RUTE ANDA')}</p><h1>${t('確認路線','Review your route','Periksa rute')}</h1>`+endpoints()+`<button class="text-button nav-change" data-nav="destinations">${t('更改地點','Change places','Ubah lokasi')} →</button>`;
      if(!route)html+=`<div class="notice" role="status">${t('目前沒有連通路線，請更換起點或目的地。','No connected route. Choose another starting point or destination.','Tidak ada rute. Pilih titik awal atau tujuan lain.')}</div>`;
      else if(!route.steps.length)html+=`<div class="notice">${t('起點與目的地相同。','You are already at the destination.','Anda sudah berada di tujuan.')}</div>`+button(t('確認抵達','Confirm arrival','Konfirmasi tiba'),'arrived',true);
      else html+=`<section class="preview-map" aria-label="${t('路線地圖','Route map','Peta rute')}">${mapTools()}${mapMarkup(true)}</section>`+`<div class="nav-stats"><span><b>${route.steps.length}</b> ${t('段路線','segments','segmen')}</span><span>${t('過閘','Fare gates','Gerbang tiket')} <b>${route.cost[0]}</b></span></div>${inferred?`<p class="nav-warning">${inferred} ${t('段推定連線，請現場核對','inferred connections; verify on site','koneksi perkiraan; periksa di lokasi')}</p>`:''}`;
      
      if(route?.steps.length)html+=`<details class="nav-steps"><summary>${t('看全部路段','View all segments','Lihat semua segmen')}</summary><ol>${route.steps.map(s=>`<li>${esc(describe(s))}</li>`).join('')}</ol></details><div class="nav-footer">${button(t('開始導航','Start navigation','Mulai navigasi'),'begin',true)}</div>`;
      html+=note();
    }else if(page==='guide'){
      if(routeKey!==selectionKey()){plan();go('route');return;}if(!route?.steps.length){go('route');return;}cursor=Math.min(cursor,route.steps.length-1);
      html=back('route')+`<p class="nav-destination">${t('前往','Going to','Menuju')} ${esc(name(state.destination))}</p><div id="nav-current" aria-live="polite"></div><p id="heading-status" class="nav-map-credit" role="status">${t('方位未就緒，暫依路線朝向顯示。','Heading unavailable; using route direction.','Arah belum tersedia; memakai arah rute.')}</p>`+mapMarkup()+`<div class="guide-tools">${button(t('開啟 AR','Open AR','Buka AR'),'ar')}<details class="guide-more"><summary>${t('更多操作','More options','Opsi lainnya')} <span aria-hidden="true">⋯</span></summary><div class="guide-more-options">${button(t('重播指引','Replay instruction','Ulangi petunjuk'),'speak')}<button class="secondary heading-mode" data-nav="heading-mode" aria-pressed="false">${t('路線朝上','Route up','Arah rute')}</button><button data-nav="relocate">${t('重新確認位置','Check location','Periksa lokasi')}</button><button data-nav="destinations">${t('更換目的地','Change destination','Ubah tujuan')}</button></div></details></div><p id="speech-status" class="nav-map-credit" role="status"></p><div class="nav-footer nav-step-controls"><button class="secondary" data-nav="previous">${t('上一步','Previous','Sebelumnya')}</button>${button(t('我到了，下一步','I’m here. Next','Sudah tiba, lanjut'),'next',true)}</div>`+note();
    }else if(page==='arrived')html=`<div class="nav-arrival"><div class="success" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg></div><h1>${t('已抵達目的地','You have arrived','Anda sudah tiba')}</h1><p>${esc(name(state.destination))}</p></div>`+button(t('規劃新路線','Plan a new route','Rencanakan rute baru'),'new',true)+`<div class="nav-minor-actions">${button(t('回首頁','Home','Beranda'),'home')}</div>`+note();
    app().innerHTML=html;window.scrollTo(0,0);
    if(page==='arrived')speech.read(t('已抵達，','You have arrived at ','Anda sudah tiba di ')+name(state.destination),'arrival:'+state.destination+':'+state.lang);if(page==='route'&&route?.steps.length)mountMap();if(page==='guide'){mountMap();drawGuide();compass.start();}
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.dest&&homeMap[b.dataset.dest]){e.stopImmediatePropagation();startJourney(homeMap[b.dataset.dest]);return;}
    const a=b.dataset.nav;if(!a)return;e.stopImmediatePropagation();
    if(a==='new')startJourney();else if(a==='reload')location.reload();else if(a==='preview'){plan();if(route)go('route');}else if(a==='begin'){followPhone=false;compass.request();cursor=0;top=true;floor=network.nodes.get(state.start).level_id;go('guide');}else if(a==='next')advance(1);else if(a==='previous')advance(-1);else if(a==='heading-mode'){followPhone=!followPhone;paintMap();}else if(a==='ar'){updateAR();ar.open();}else if(a==='speak')speak(true);else if(a==='top'){top=!top;paintMap();}else if(a==='zoom-in')scene?.zoom(1.25);else if(a==='zoom-out')scene?.zoom(.8);else if(a==='relocate'){picking=null;route=null;state.start=null;picker.reset();go('locate');}else if(a==='destinations'){if(location.hash==='#guide'){state.start=route?.steps[cursor-1]?.to.id||state.start;route=null;routeKey=null;cursor=0;}picking=null;picker.reset();go(a);}else go(a);
  },true);
  document.addEventListener('change',e=>{if(e.target.id==='nav-map-floor'){floor=e.target.value;paintMap();}});

  return {startJourney,leave,render:renderPage,handles:p=>['locate','candidates','confirm','destinations','route','guide','arrived'].includes(p)};
}
