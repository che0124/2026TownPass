import {arText} from './ar-locale.mjs';
import { cameraDownAngle, createGroundGuide } from './ground-guide.mjs';
import { cameraHeading, signedAngle, walkingLegs, walkingPosition } from './ar-route.mjs';
import { advanceDistance, createStepDetector } from './motion.mjs';

const stride = .65;

async function sensorAllowed(sensor) {
  if (!sensor) return false;
  try {
    return typeof sensor.requestPermission !== 'function' || await sensor.requestPermission() === 'granted';
  } catch {
    return false;
  }
}

export function createAR(dialog, network, advance, updateMiniMap, getLanguage=()=> 'zh', onInstruction=()=>{}, onClose=()=>{}) {
  const t=zh=>arText(zh,getLanguage());
  const find = name => dialog.querySelector('[data-ar="' + name + '"]');
  const video = find('video');
  const draw = createGroundGuide(find('ground'));
  let context;
  let legs = [];
  let subleg = 0;
  let distance = 0;
  let stream;
  let request = 0;
  let heading = null;
  let tilt = 20;
  let offset = null;
  let aligned = false;
  let sensorRequest;
  let pendingBearing = null;
  let detectStep = createStepDetector();
  let motionSeen = false;
  let message = '';
  let openSession=false;

  function headingError(position) {
    return heading !== null && offset !== null ? signedAngle(position.bearing - heading - offset) : null;
  }

  function paint() {
    const leg = legs[subleg];
    const position = leg && walkingPosition(leg, distance);
    const mapHeading = heading !== null && offset !== null ? heading + offset : 0;
    const angle = position ? headingError(position) : null;
    if (dialog.open) updateMiniMap(mapHeading, position?.uv);
    const ready = Boolean(stream && aligned && leg);
    const facing = angle === null || Math.abs(angle) <= 55;
    const remaining = leg ? Math.max(0, leg.length - distance) : 0;
    const turn = leg?.turn ?? 0;
    draw(ready && facing ? { angle: angle ?? 0, tilt, remaining, turn } : null);
    const alert = find('direction');
    alert.hidden = !(ready && !facing);
    if (!alert.hidden) alert.textContent = Math.abs(angle) > 155 ? t("↶ 轉身後繼續") : angle > 0 ? t("→ 朝右方通道前進") : t("← 朝左方通道前進");
    const hintElement=find('hint');
    if(hintElement.textContent!==message)hintElement.textContent=message;
    find('progress').textContent=ready?'≈ '+Math.ceil(remaining)+' m':context?.step&&context.step.from.level_id!==context.step.to.level_id?context.step.from.level_id+' → '+context.step.to.level_id:'';
  }

  function recordStep(manual = false) {
    const leg = legs[subleg];
    if (!stream || !aligned || !leg || distance >= leg.length) return;
    const angle = manual ? 0 : headingError(walkingPosition(leg, distance)) ?? 0;
    const next = advanceDistance(distance, stride, angle, leg.length);
    if (next === distance) return;
    distance = next;
    paint();
  }

  function onMotion(event) {
    const axes = event.accelerationIncludingGravity;
    if (!axes || ![axes.x, axes.y, axes.z].every(Number.isFinite)) return;
    const step = detectStep(axes, event.timeStamp);
    if (!motionSeen) {
      motionSeen = true;
      paint();
    }
    if (step) recordStep();
  }

  function onOrientation(event) {
    const value = cameraHeading(event);
    if (value === null) return;
    heading = heading === null ? value : heading + signedAngle(value - heading) * .35;
    tilt = Math.max(-12, Math.min(65, cameraDownAngle(event)));
    if (pendingBearing !== null) {
      offset = signedAngle(pendingBearing - heading);
      pendingBearing = null;
    }
    paint();
  }

  function stop() {
    request++;
    window.removeEventListener('deviceorientation', onOrientation);
    window.removeEventListener('devicemotion', onMotion);
    stream?.getTracks().forEach(track => track.stop());
    stream = undefined;
    video.srcObject = null;
    draw(null);
    heading = offset = pendingBearing = null;
    sensorRequest = undefined;
    tilt = 20;
    aligned = motionSeen = false;
    detectStep = createStepDetector();
    message = '';
  }

  async function startCamera() {
    const id = ++request;
    find('retry').hidden = true;
    message = t("正在開啟後置鏡頭…");
    paint();
    try {
      if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Object.assign(new Error('insecure'),{name:'SecurityError'});
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (id !== request || !dialog.open) {
        media.getTracks().forEach(track => track.stop());
        return;
      }
      stream = media;
      video.srcObject = stream;
      await video.play();
      if (id !== request) return;
      message = '';
      if(legs[subleg])align();
      for (const track of stream.getVideoTracks()) track.addEventListener('ended', () => {
        if (id !== request) return;
        stop();
        message = t('相機已中斷');
        find('retry').hidden = false;
        paint();
      });
      paint();
    } catch (error) {
      if (id !== request) return;
      stop();
      message = error.name === 'NotAllowedError'
        ? t('相機權限被拒絕。請在模擬器設定中允許 TownPass 使用相機，再重試；若仍被拒絕，請改用地圖。')
        : error.name==='SecurityError'?t('相機需要 HTTPS 或 localhost 安全來源，請改用安全網址開啟。'):error.name==='NotFoundError'?t('模擬器找不到相機，請檢查虛擬裝置的相機設定。'):t('相機無法使用，可回到地圖繼續導航。');
      find('retry').hidden = false;
      paint();
    }
  }

  function align() {
    const leg = legs[subleg];
    if (!leg || !stream) return;
    const { bearing } = walkingPosition(leg, distance);
    aligned = true;
    if (heading === null) pendingBearing = bearing;
    else offset = signedAngle(bearing - heading);
    requestSensors();
    paint();
  }

  function requestSensors(){
    if (!sensorRequest) {
      const id=request;
      sensorRequest = Promise.all([
        sensorAllowed(window.DeviceMotionEvent),
        sensorAllowed(window.DeviceOrientationEvent),
      ]).then(([motion, orientation]) => {
        if (id !== request) return;
        if (motion) window.addEventListener('devicemotion', onMotion);
        if (orientation) window.addEventListener('deviceorientation', onOrientation);
        if (!motion && !orientation) sensorRequest = undefined;
      });
    }
  }

  function update(next) {
    const changed = context?.step !== next.step;
    context = next;
    if (changed) {
      legs = walkingLegs(context.step, context.after, network.positions);
      subleg = distance = 0;
      if (pendingBearing !== null) pendingBearing = legs[0]?.segments[0].bearing ?? null;
    }
    if (!dialog.open) return;
    const corner = subleg < legs.length - 1;
    find('floor').textContent = context.here.level_id;
    find('segment').textContent = context.segment || '';
    find('instruction').textContent = corner ? t("沿通道走到下一個轉角") : context.instruction;
    find('next').hidden = !context.step;
    find('next').textContent = corner ? t('抵達轉角') : t('抵達地標');
    if(stream&&!aligned&&legs[subleg])align();
    paint();
    onInstruction(find('instruction').textContent,`${context.step?.edge.id}:${context.step?.from.id}:${subleg}:${getLanguage()}`);
  }

  function closeSession(){if(!openSession)return;openSession=false;stop();document.documentElement.classList.remove('ar-open');onClose();}
  find('close').onclick=()=>{closeSession();dialog.close();};
  dialog.addEventListener('close',()=>{if(!dialog.open)closeSession();});
  window.addEventListener('pagehide',()=>{closeSession();if(dialog.open)dialog.close();});
  find('retry').onclick=()=>{startCamera();requestSensors();};
  find('next').onclick = () => {
    if (subleg < legs.length - 1) {
      subleg++;
      distance = 0;
      if (pendingBearing !== null) pendingBearing = legs[subleg].segments[0].bearing;
      update(context);
    } else advance();
  };
  return {
    update,
    close() { closeSession(); if (dialog.open) dialog.close(); },
    open() {
      if (!context?.step || dialog.open) return;
      openSession=true;document.documentElement.classList.add('ar-open');
      dialog.showModal();
      update(context);
      startCamera();
      requestSensors();
    },
  };
}
