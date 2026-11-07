const spread = 0.3;
const ratio = 2013 / 1872;
const corners = [[0, 0], [1, 0], [1, 1], [0, 1]];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const floorColors = { G: '#52776b', B1: '#197b6c', B2: '#4c628d', B3: '#865784', B4: '#97604a' };

export function createScene(canvas, data, network, onPick) {
  const ctx = canvas.getContext('2d');
  const theme = getComputedStyle(canvas);
  const routeColor = theme.getPropertyValue('--primary-700').trim();
  const inferredColor = theme.getPropertyValue('--secondary-800').trim();
  const upcomingColor = theme.getPropertyValue('--primary-300').trim() || '#93d4df';
  const arrowColor = theme.getPropertyValue('--secondary-500').trim() || '#f5ba4b';
  const positionColor = theme.getPropertyValue('--red-600').trim();
  const levels = [...data.levels].sort((a, b) => a.order - b.order);
  const images = new Map();
  let yaw = -0.37;
  let pitch = 0.54;
  let zoom = 1;
  let pointer;
  let pickPoints = [];
  let state = {};
  let frame = 0;

  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  for (const level of levels) {
    if (!level.image) continue;
    const image = new Image();
    image.onload = schedule;
    image.src = new URL(level.image, document.baseURI).href;
    images.set(level.id, image);
  }

  function render() {
    frame = 0;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    pickPoints = [];
    const floor = state.floor === 'all' && state.top ? state.current?.level_id || 'B1' : state.floor;
    const visible = levels.filter(level => !floor || floor === 'all' || level.id === floor);
    const shown = new Set(visible.map(level => level.id));
    let angle = state.top ? -(state.heading || 0) * Math.PI / 180 : yaw;
    if(state.followRoute){
      const step=state.steps?.[state.step];
      if(step){
        let uv=step.edge.geometry?.uv?.map(p=>[...p])||[network.positions.get(step.from.id),network.positions.get(step.to.id)];
        if(step.edge.geometry?.uv&&step.edge.from_node!==step.from.id)uv.reverse();
        const start=uv[0],next=uv.find(p=>p&&start&&Math.hypot(p[0]-start[0],p[1]-start[1])>1e-6);
        if(start&&next)angle=-Math.PI/2-Math.atan2((next[1]-start[1])*ratio,next[0]-start[0]);
      }
    }
    if(state.followRoute&&Number.isFinite(state.phoneHeading)){
      // The map's north is tilted relative to the source image's top edge.
      const northRotation=data.coordinates?.north_rotation_approx_deg||0;
      angle=-(state.phoneHeading+northRotation)*Math.PI/180;
    }
    const tilt = state.top||state.followRoute ? Math.PI / 2 : pitch;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const raw = ([u, v], levelId) => {
      const x = u - .5;
      const depth = (v - .5) * ratio;
      const elevation = network.levels.get(levelId).order * spread;
      return [
        x * cos - depth * sin,
        (x * sin + depth * cos) * Math.sin(tilt) - elevation * Math.cos(tilt),
      ];
    };
    const projected = visible.flatMap(level => corners.map(uv => raw(uv, level.id)));
    const xs = projected.map(([x]) => x);
    const ys = projected.map(([, y]) => y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const scale = state.viewSpan ? Math.min(width, height) / state.viewSpan * zoom
      : Math.min((width - 40) / (maxX - minX), (height - 58) / (maxY - minY)) * zoom;
    const anchorUV=state.followRoute&&state.current&&shown.has(state.current.level_id)?state.currentUV||network.positions.get(state.current.id):null;
    const center = anchorUV ? raw(anchorUV,state.current.level_id) : state.viewCenter ? raw(state.viewCenter, floor) : [(minX + maxX) / 2, (minY + maxY) / 2];
    const project = (uv, level) => {
      const [x, y] = raw(uv, level);
      return [(x - center[0]) * scale + width / 2, (y - center[1]) * scale + height * (anchorUV ? .72 : .5)];
    };
    const point = node => project(network.positions.get(node.id), node.level_id);

    function path(points) {
      ctx.beginPath();
      ctx.moveTo(...points[0]);
      for (const p of points.slice(1)) ctx.lineTo(...p);
    }

    function line(points, color, weight, dashed = false) {
      path(points);
      ctx.strokeStyle = color;
      ctx.lineWidth = weight;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.setLineDash(dashed ? [6, 5] : []);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function dot([x, y], color, size, outline = '#fff') {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = outline;
      ctx.stroke();
    }

    function label(text, [x, y], color, center = false) {
      ctx.font = '700 12px system-ui, sans-serif';
      const labelWidth = ctx.measureText(text).width + 12;
      const left = clamp(x - (center ? labelWidth / 2 : 0), 3, width - labelWidth - 3);
      const top = clamp(y - 17, 3, height - 21);
      ctx.fillStyle = color;
      ctx.fillRect(left, top, labelWidth, 18);
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, left + 6, top + 9);
    }

    for (const level of visible) {
      const points = corners.map(uv => project(uv, level.id));
      const [a, b, , d] = points;
      const image = images.get(level.id);
      const active = state.current?.level_id === level.id;
      path([...points, a]);
      ctx.fillStyle = active ? '#edf8faec' : '#edf8faac';
      if (image) ctx.fill();
      if (image?.complete && image.naturalWidth) {
        ctx.save();
        ctx.transform(b[0] - a[0], b[1] - a[1], d[0] - a[0], d[1] - a[1], ...a);
        ctx.globalAlpha = active || visible.length === 1 ? .91 : .67;
        ctx.drawImage(image, 0, 0, 1, 1);
        ctx.restore();
      }
      line([...points, a], floorColors[level.id], active ? 2 : 1, level.id === 'G');
    }

    for (const edge of data.edges) {
      if (!edge.routing_enabled) continue;
      const from = network.nodes.get(edge.from_node);
      const to = network.nodes.get(edge.to_node);
      if (!shown.has(from.level_id) || !shown.has(to.level_id)) continue;
      if (!network.positions.get(from.id) || !network.positions.get(to.id)) continue;
      const cross = from.level_id !== to.level_id;
      const points = edge.geometry?.uv?.map(uv => project(uv, from.level_id)) || [point(from), point(to)];
      line(points, cross ? '#73899560' : '#356c7755', cross ? 1 : 1.3, edge.status === 'inferred');
    }

    for (const [index, { from, to, edge }] of [...(state.steps || []).entries()].sort((a,b)=>Number(a[0]===state.step)-Number(b[0]===state.step))) {
      const fromShown = shown.has(from.level_id);
      const toShown = shown.has(to.level_id);
      if (!network.positions.get(from.id) || !network.positions.get(to.id)) continue;
      if (!fromShown || !toShown) {
        if (fromShown || toShown) {
          const here = fromShown ? from : to;
          const there = fromShown ? to : from;
          const position = point(here);
          dot(position, index===state.step?routeColor:upcomingColor, index===state.step?7:5);
          if (!state.compact) label(there.level_id, [position[0] + 7, position[1] - 3], index===state.step?routeColor:'#356c77');
        }
        continue;
      }
      const points = edge.geometry?.uv?.map(uv => project(uv, from.level_id)) || [point(from), point(to)];
      const active = index === state.step;
      const weight = active ? 6 : 3;
      line(points, '#fff', weight + (active ? 4 : 2));
      const color = active ? routeColor : index < state.step ? '#b6c3c7' : upcomingColor;
      line(points, color, weight, edge.status === 'inferred');

      if (from.level_id !== to.level_id) {
        dot(point(from), color, 4);
        dot(point(to), color, 4);
      }
    }

    if (!state.compact) for (const level of visible) label(level.id, project([0, 0], level.id), floorColors[level.id]);

    if (state.picking) {
      for (const node of network.nodes.values()) {
        if (!shown.has(node.level_id) || !network.positions.get(node.id)) continue;
        const position = point(node);
        pickPoints.push({ position, node });
        dot(position, '#235e54', 3.5);
      }
    }
    if (state.end && shown.has(state.end.level_id) && network.positions.get(state.end.id)) {
      const end = point(state.end);
      dot(end, '#254f9b', 6);
      if (!state.compact) label(state.labels?.end||'終點', [end[0], end[1] - 10], '#254f9b', true);
    }
    if (state.current && shown.has(state.current.level_id) && network.positions.get(state.current.id)) {
      const current = state.currentUV ? project(state.currentUV, state.current.level_id) : point(state.current);
      if(state.followRoute){
        // A single larger position arrow replaces the repeated route arrows.
        ctx.save();ctx.translate(...current);
        ctx.beginPath();ctx.arc(0,0,21,0,Math.PI*2);ctx.fillStyle='#5ab4c533';ctx.fill();
        path([[0,-16],[11,12],[0,7],[-11,12],[0,-16]]);
        ctx.fillStyle=arrowColor;ctx.fill();ctx.strokeStyle=routeColor;ctx.lineWidth=2;ctx.lineJoin='round';ctx.stroke();ctx.restore();
      }else dot(current, positionColor, state.compact ? 4.5 : 7);
      if (!state.compact) label(state.labels?.current||'目前位置', [current[0], current[1] + 30], positionColor, true);
    }
  }

  canvas.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId);
    pointer = { id: event.pointerId, startX: event.clientX, startY: event.clientY, yaw, pitch, moved: false };
  });
  canvas.addEventListener('pointermove', event => {
    if (pointer?.id !== event.pointerId) return;
    const dx = event.clientX - pointer.startX;
    const dy = event.clientY - pointer.startY;
    pointer.moved ||= Math.hypot(dx, dy) > 5;
    if (!pointer.moved || state.top || state.followRoute) return;
    yaw = pointer.yaw + dx * .012;
    pitch = clamp(pointer.pitch + dy * .007, .18, 1.36);
    schedule();
  });
  canvas.addEventListener('pointerup', event => {
    if (pointer?.id !== event.pointerId) return;
    const { moved } = pointer;
    pointer = null;
    if (moved || !state.picking) return;
    const box = canvas.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    const closest = pickPoints.reduce((best, candidate) => {
      const distance = Math.hypot(x - candidate.position[0], y - candidate.position[1]);
      return distance <= best.distance ? { node: candidate.node, distance } : best;
    }, { distance: 16 });
    if (closest.node) onPick(closest.node);
  });
  canvas.addEventListener('pointercancel', () => { pointer = null; });
  const observer = new ResizeObserver(schedule);
  observer.observe(canvas);
  return {
    destroy() { observer.disconnect(); if (frame) cancelAnimationFrame(frame); },
    update(next) { state = next; schedule(); },
    zoom(factor) { zoom = clamp(zoom * factor, .65, 2.8); schedule(); },
    resetZoom() { zoom = 1; schedule(); },
  };
}
