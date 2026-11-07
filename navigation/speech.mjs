// Web speech where available; Android TownPass can use the device TTS bridge.
export function createSpeech({getLanguage,onStatus=()=>{}}){
  let sequence=0,timer,lastKey=null,transport=null;
  const bridge=()=>window.flutterObject;
  function receive(event){try{const reply=JSON.parse(event.data);if(reply.name!=='station_speech'||reply.data?.requestId!==sequence)return;clearTimeout(timer);onStatus(reply.data.status);}catch{}}
  if(bridge()?.addEventListener)bridge().addEventListener('message',receive);
  function stop(){clearTimeout(timer);sequence++;lastKey=null;if(transport==='web')window.speechSynthesis?.cancel();if(transport==='native')try{bridge()?.postMessage(JSON.stringify({name:'station_speech',data:{action:'stop',requestId:sequence}}));}catch{}transport=null;}
  function read(text,key,{force=false}={}){
    if(!text||(!force&&key===lastKey))return;
    clearTimeout(timer);lastKey=key;const requestId=++sequence;
    const lang=({zh:'zh-TW',en:'en-US',id:'id-ID'})[getLanguage()]||'zh-TW';
    if(window.speechSynthesis&&window.SpeechSynthesisUtterance){
      transport='web';window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang=lang;utterance.rate=.95;
      utterance.onstart=()=>{if(requestId===sequence)onStatus('speaking');};utterance.onerror=e=>{if(requestId===sequence&&!['canceled','interrupted'].includes(e.error))onStatus('unavailable');};
      window.speechSynthesis.speak(utterance);return;
    }
    if(bridge()?.postMessage){transport='native';onStatus('pending');timer=setTimeout(()=>{if(requestId===sequence)onStatus('unavailable');},7000);try{bridge().postMessage(JSON.stringify({name:'station_speech',data:{action:'speak',text,lang,requestId}}));}catch{clearTimeout(timer);onStatus('unavailable');}return;}
    onStatus('unavailable');
  }
  window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  return {read,stop};
}
