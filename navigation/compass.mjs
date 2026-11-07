// Only absolute headings can orient a map to geographic north.
export function createCompass(onChange){
  let active=false,permission,heading=null;
  function receive(e){
    if(!active||document.hidden)return;
    const screenAngle=screen.orientation?.angle??window.orientation??0;
    const value=Number.isFinite(e.webkitCompassHeading)&&(!Number.isFinite(e.webkitCompassAccuracy)||e.webkitCompassAccuracy>=0)?e.webkitCompassHeading:e.absolute&&Number.isFinite(e.alpha)?360-e.alpha:null;
    if(value===null)return;
    const next=(value+screenAngle+360)%360;
    heading=heading===null?next:heading+(((next-heading+540)%360)-180)*.2;
    onChange((heading+360)%360);
  }
  function attach(){if(!active)return;window.addEventListener('deviceorientationabsolute',receive);window.addEventListener('deviceorientation',receive);}
  function request(){
    try{permission=typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'?DeviceOrientationEvent.requestPermission().then(v=>v==='granted'):Promise.resolve(true);}catch{permission=Promise.resolve(false);}
    permission.catch(()=>false).then(ok=>{if(ok)attach();});
  }
  function start(){active=true;if(permission)permission.catch(()=>false).then(ok=>{if(ok)attach();});else attach();}
  function stop(){active=false;heading=null;window.removeEventListener('deviceorientationabsolute',receive);window.removeEventListener('deviceorientation',receive);}
  window.addEventListener('pagehide',stop);
  return {request,start,stop};
}
