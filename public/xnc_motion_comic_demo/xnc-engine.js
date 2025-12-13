// XNC Motion Comic Engine (demo) - panel mask + out-of-frame overlay

const $ = (id) => document.getElementById(id);

function log(msg){
  const el = $("log");
  const now = new Date().toLocaleTimeString();
  el.textContent = `[${now}] ${msg}\n` + el.textContent;
}

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t){ return a + (b-a)*t; }
function easeOutBack(t){
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function easeInOutCubic(t){
  return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
}

class XNCEngine{
  constructor({stage, overlay, panelGrid}){
    this.stage = stage;
    this.overlay = overlay;
    this.panelGrid = panelGrid;
    this.panels = new Map();
    this.actors = new Map();
    this.layout = "2x2";
    this.running = false;
  }

  setLayout(layout){
    this.layout = layout;
    this.buildPanels(layout);
  }

  buildPanels(layout){
    this.panels.clear();
    this.panelGrid.innerHTML = "";

    let cols = 2, rows = 2;
    if(layout === "1x2"){ cols = 1; rows = 2; }
    if(layout === "2x1"){ cols = 2; rows = 1; }

    this.panelGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    this.panelGrid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    const count = cols*rows;
    for(let i=0;i<count;i++){
      const pid = `P${i+1}`;
      const panel = document.createElement("div");
      panel.className = "panel";
      panel.dataset.pid = pid;

      const label = document.createElement("div");
      label.className = "panel-label";
      label.textContent = pid;
      panel.appendChild(label);

      this.panelGrid.appendChild(panel);
      this.panels.set(pid, panel);
    }
    log(`Layout set: ${layout} (${cols}x${rows})`);
  }

  registerActor(actor){
    this.actors.set(actor.id, actor);
    this.mountActor(actor.id, actor.panelId);
  }

  mountActor(actorId, panelId){
    const actor = this.actors.get(actorId);
    const panel = this.panels.get(panelId);
    if(!actor || !panel) return;

    actor.panelId = panelId;
    actor.el.style.position = "absolute";
    actor.el.style.left = "50%";
    actor.el.style.top = "56%";
    actor.el.style.transform = "translate(-50%, -50%)";
    actor.el.style.zIndex = "2";

    actor.el.style.width = actor.el.style.width || "180px";
    actor.el.style.height = actor.el.style.height || "220px";

    actor.el.remove();
    panel.appendChild(actor.el);
  }

  getPanelRect(panelId){
    const panel = this.panels.get(panelId);
    const r = panel.getBoundingClientRect();
    const s = this.stage.getBoundingClientRect();
    return { x:r.left-s.left, y:r.top-s.top, w:r.width, h:r.height, cx:r.left-s.left+r.width/2, cy:r.top-s.top+r.height/2 };
  }

  getActorRect(actorId){
    const actor = this.actors.get(actorId);
    const r = actor.el.getBoundingClientRect();
    const s = this.stage.getBoundingClientRect();
    return { x:r.left-s.left, y:r.top-s.top, w:r.width, h:r.height };
  }

  getAnchorPoint(actorId, anchorName){
    const actor = this.actors.get(actorId);
    const rect = this.getActorRect(actorId);
    const a = actor.anchors?.[anchorName] || {x:0.5,y:0.5};
    return { x: rect.x + rect.w*a.x, y: rect.y + rect.h*a.y };
  }

  async play(action, params){
    if(this.running) { log("Engine busy. Wait."); return; }
    this.running = true;
    try{
      if(action === "THROW_PROP") return await this.throwProp(params);
      if(action === "PUNCH") return await this.punch(params);
      if(action === "PULL") return await this.pull(params);
    } finally { this.running = false; }
  }

  async throwProp({from, to, propType="sandal", fromAnchor="handR", toAnchor="face", duration=520}){
    log(`Action: THROW_PROP from ${from} -> ${to} (${propType})`);

    const start = this.getAnchorPoint(from, fromAnchor);
    const hit = this.getAnchorPoint(to, toAnchor);

    const prop = createProp(propType);
    prop.style.position = "absolute";
    prop.style.left = `${start.x}px`;
    prop.style.top = `${start.y}px`;
    prop.style.transform = "translate(-50%, -50%) rotate(-10deg)";
    prop.style.zIndex = "9999";
    this.overlay.appendChild(prop);

    const stageRect = this.stage.getBoundingClientRect();
    const s = {w: stageRect.width - 28, h: stageRect.height - 28};

    const mid = { x:(start.x+hit.x)/2, y: Math.min(start.y, hit.y) - 90 };
    const floorY = s.h - 22;

    const t1 = 0.70;
    await animate(duration, (t)=>{
      if(t <= t1){
        const k = easeInOutCubic(t/t1);
        const x = quadBezier(start.x, mid.x, hit.x, k);
        const y = quadBezier(start.y, mid.y, hit.y, k);
        const rot = lerp(-10, 18, k);
        prop.style.left = `${x}px`;
        prop.style.top = `${y}px`;
        prop.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;
      } else {
        const k = easeOutBack((t-t1)/(1-t1));
        const x = hit.x + 14*Math.sin(k*3.14);
        const y = lerp(hit.y, floorY, clamp(k,0,1));
        const rot = lerp(18, 120, clamp(k,0,1));
        prop.style.left = `${x}px`;
        prop.style.top = `${y}px`;
        prop.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;
      }
    });

    await this.shakeActor(to, 160, 6);

    await sleep(420);
    prop.animate([{opacity:1},{opacity:0}],{duration:240, fill:"forwards"});
    await sleep(260);
    prop.remove();
  }

  async punch({from, to, fromAnchor="handR", toAnchor="face", duration=420}){
    log(`Action: PUNCH from ${from} -> ${to}`);

    const start = this.getAnchorPoint(from, fromAnchor);
    const hit = this.getAnchorPoint(to, toAnchor);

    const hand = createProp("hand");
    hand.style.position = "absolute";
    hand.style.left = `${start.x}px`;
    hand.style.top = `${start.y}px`;
    hand.style.transform = "translate(-50%, -50%) rotate(0deg)";
    hand.style.zIndex = "9999";
    this.overlay.appendChild(hand);

    const mid = { x: lerp(start.x, hit.x, 0.60), y: lerp(start.y, hit.y, 0.60) - 30 };

    await animate(duration, (t)=>{
      if(t < 0.55){
        const k = easeInOutCubic(t/0.55);
        const x = quadBezier(start.x, mid.x, hit.x, k);
        const y = quadBezier(start.y, mid.y, hit.y, k);
        const sc = lerp(0.95, 1.05, k);
        hand.style.left = `${x}px`;
        hand.style.top = `${y}px`;
        hand.style.transform = `translate(-50%, -50%) scale(${sc}) rotate(${lerp(0, 12, k)}deg)`;
      } else {
        const k = (t-0.55)/0.45;
        const x = lerp(hit.x, hit.x - 26, k);
        const y = lerp(hit.y, hit.y + 10, k);
        const sc = lerp(1.05, 0.98, k);
        hand.style.left = `${x}px`;
        hand.style.top = `${y}px`;
        hand.style.transform = `translate(-50%, -50%) scale(${sc}) rotate(${lerp(12, -8, k)}deg)`;
      }
    });

    await this.shakeActor(to, 220, 10);
    hand.remove();
  }

  async pull({from, to, grab="collar", duration=560, carryToPanel=null}){
    log(`Action: PULL from ${from} grabs ${to}`);

    const fromPoint = this.getAnchorPoint(from, "handR");

    const target = this.actors.get(to);
    const targetRect = this.getActorRect(to);

    const arm = document.createElement("div");
    arm.style.position = "absolute";
    arm.style.left = "0px";
    arm.style.top = "0px";
    arm.style.background = "rgba(232,195,143,0.95)";
    arm.style.boxShadow = "0 8px 20px rgba(0,0,0,0.25)";
    arm.style.transformOrigin = "0 50%";
    arm.style.zIndex = "9999";
    this.overlay.appendChild(arm);

    const clone = target.el.cloneNode(true);
    clone.style.position = "absolute";
    clone.style.left = `${targetRect.x}px`;
    clone.style.top = `${targetRect.y}px`;
    clone.style.transform = "none";
    clone.style.zIndex = "9998";
    this.overlay.appendChild(clone);

    target.el.style.opacity = "0";

    const destPanel = carryToPanel || this.actors.get(from).panelId;
    const dp = this.getPanelRect(destPanel);
    const dest = { x: dp.cx, y: dp.cy + 20 };

    await animate(duration, (t)=>{
      const k = easeInOutCubic(t);
      const x = lerp(targetRect.x, dest.x - targetRect.w/2, k);
      const y = lerp(targetRect.y, dest.y - targetRect.h/2, k);
      clone.style.left = `${x}px`;
      clone.style.top = `${y}px`;

      const curGrab = { x: x + targetRect.w*0.50, y: y + targetRect.h*0.35 };
      const dx = curGrab.x - fromPoint.x;
      const dy = curGrab.y - fromPoint.y;
      const len = Math.sqrt(dx*dx + dy*dy);
      const ang = Math.atan2(dy, dx) * 180/Math.PI;

      arm.style.left = `${fromPoint.x}px`;
      arm.style.top = `${fromPoint.y}px`;
      arm.style.width = `${Math.max(22, len)}px`;
      arm.style.height = `14px`;
      arm.style.transform = `translate(0,-50%) rotate(${ang}deg)`;
      arm.style.borderRadius = "999px";
    });

    this.mountActor(to, destPanel);
    target.el.style.opacity = "1";

    clone.remove();
    arm.remove();
    await this.shakePanel(destPanel, 180, 6);
  }

  async shakeActor(actorId, duration=180, mag=8){
    const el = this.actors.get(actorId).el;
    const anim = el.animate([
      { transform: "translate(-50%, -50%)" },
      { transform: `translate(calc(-50% + ${mag}px), calc(-50% - ${mag*0.3}px))` },
      { transform: `translate(calc(-50% - ${mag}px), calc(-50% + ${mag*0.3}px))` },
      { transform: "translate(-50%, -50%)" }
    ], {duration, easing:"linear"});
    await anim.finished;
  }

  async shakePanel(panelId, duration=180, mag=6){
    const panel = this.panels.get(panelId);
    const anim = panel.animate([
      { transform: "translate(0,0)" },
      { transform: `translate(${mag}px, ${-mag}px)` },
      { transform: `translate(${-mag}px, ${mag}px)` },
      { transform: "translate(0,0)" }
    ], {duration, easing:"linear"});
    await anim.finished;
  }
}

function createActorShape({name, colorA, colorB, badge, eye="normal"}){
  const el = document.createElement("div");
  el.style.width = "190px";
  el.style.height = "230px";
  el.style.borderRadius = "26px";
  el.style.background = `linear-gradient(135deg, ${colorA}, ${colorB})`;
  el.style.boxShadow = "0 14px 28px rgba(0,0,0,0.18)";
  el.style.border = "1px solid rgba(0,0,0,0.08)";
  el.style.display = "grid";
  el.style.placeItems = "center";
  el.style.position = "relative";

  const face = document.createElement("div");
  face.style.width = "120px";
  face.style.height = "120px";
  face.style.borderRadius = "999px";
  face.style.background = "rgba(255,255,255,0.75)";
  face.style.border = "1px solid rgba(0,0,0,0.06)";
  face.style.position = "absolute";
  face.style.top = "52px";

  const eyes = document.createElement("div");
  eyes.style.position = "absolute";
  eyes.style.top = "44px";
  eyes.style.left = "50%";
  eyes.style.transform = "translateX(-50%)";
  eyes.style.display = "flex";
  eyes.style.gap = "14px";

  const mkEye = () => {
    const e = document.createElement("div");
    e.style.width = "18px";
    e.style.height = "18px";
    e.style.borderRadius = "999px";
    e.style.background = "rgba(0,0,0,0.65)";
    return e;
  };
  const e1 = mkEye(), e2 = mkEye();
  eyes.appendChild(e1); eyes.appendChild(e2);

  if(eye === "suspicious"){
    e1.style.transform = "translateX(4px)";
    e2.style.transform = "translateX(4px)";
  }
  if(eye === "happy"){
    e1.style.height = "10px"; e2.style.height = "10px";
    e1.style.borderRadius = "0 0 999px 999px";
    e2.style.borderRadius = "0 0 999px 999px";
  }

  const label = document.createElement("div");
  label.textContent = badge;
  label.style.position = "absolute";
  label.style.bottom = "12px";
  label.style.left = "50%";
  label.style.transform = "translateX(-50%)";
  label.style.fontWeight = "900";
  label.style.letterSpacing = "0.6px";
  label.style.fontSize = "14px";
  label.style.color = "rgba(0,0,0,0.68)";
  label.style.background = "rgba(255,255,255,0.72)";
  label.style.padding = "8px 10px";
  label.style.borderRadius = "14px";
  label.style.border = "1px solid rgba(0,0,0,0.08)";

  el.appendChild(face);
  face.appendChild(eyes);
  el.appendChild(label);

  if(name === "bolo"){
    const g = document.createElement("div");
    g.style.position = "absolute";
    g.style.top = "92px";
    g.style.left = "50%";
    g.style.transform = "translateX(-50%)";
    g.style.width = "98px";
    g.style.height = "28px";
    g.style.border = "3px solid rgba(0,0,0,0.35)";
    g.style.borderRadius = "16px";
    g.style.background = "rgba(255,255,255,0.06)";
    face.appendChild(g);
  }

  return el;
}

function createProp(type){
  const el = document.createElement("div");
  el.style.width = "72px";
  el.style.height = "46px";
  el.style.borderRadius = "18px";
  el.style.boxShadow = "0 18px 30px rgba(0,0,0,0.22)";
  el.style.border = "1px solid rgba(0,0,0,0.10)";

  if(type === "sandal"){
    el.style.background = "linear-gradient(135deg, rgba(255,217,61,0.95), rgba(249,211,162,0.95))";
    el.innerHTML = "<div style='width:54px;height:16px;border-radius:999px;background:rgba(0,0,0,0.12);margin:14px auto 0;'></div>";
  } else if(type === "hand"){
    el.style.width = "64px";
    el.style.height = "64px";
    el.style.borderRadius = "22px";
    el.style.background = "linear-gradient(135deg, rgba(247,198,213,0.95), rgba(232,195,143,0.95))";
    el.innerHTML = "<div style='width:26px;height:26px;border-radius:999px;background:rgba(255,255,255,0.55);margin:18px auto 0;'></div>";
  } else {
    el.style.background = "linear-gradient(135deg, rgba(200,243,224,0.95), rgba(217,200,247,0.95))";
  }
  return el;
}

function quadBezier(p0, p1, p2, t){
  const a = lerp(p0, p1, t);
  const b = lerp(p1, p2, t);
  return lerp(a, b, t);
}
function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
function animate(durationMs, onFrame){
  return new Promise((resolve)=>{
    const start = performance.now();
    const tick = (now)=>{
      const t = clamp((now - start)/durationMs, 0, 1);
      onFrame(t);
      if(t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

const engine = new XNCEngine({ stage: $("stage"), overlay: $("overlay"), panelGrid: $("panelGrid") });
engine.setLayout("2x2");

function setupActors(){
  for(const a of engine.actors.values()){ a.el.remove(); }
  engine.actors.clear();
  $("overlay").innerHTML = "";

  const bolo = createActorShape({name:"bolo", colorA:"rgba(200,243,224,0.95)", colorB:"rgba(59,138,91,0.55)", badge:"BÔ-LÔ", eye:"suspicious"});
  const bala = createActorShape({name:"bala", colorA:"rgba(255,98,64,0.75)", colorB:"rgba(138,98,64,0.55)", badge:"BA-LA", eye:"normal"});
  const tumla = createActorShape({name:"tumla", colorA:"rgba(247,198,213,0.85)", colorB:"rgba(107,74,47,0.55)", badge:"TÙM-LA", eye:"normal"});
  const tumlum = createActorShape({name:"tumlum", colorA:"rgba(217,200,247,0.90)", colorB:"rgba(200,243,224,0.70)", badge:"TÙM-LUM", eye:"happy"});

  engine.registerActor({ id:"bolo", panelId:"P1", el: bolo, anchors:{ face:{x:0.50,y:0.36}, collar:{x:0.50,y:0.48}, handR:{x:0.70,y:0.56}, handL:{x:0.30,y:0.56} }});
  engine.registerActor({ id:"bala", panelId:"P2", el: bala, anchors:{ face:{x:0.50,y:0.36}, collar:{x:0.50,y:0.48}, handR:{x:0.68,y:0.58} }});
  engine.registerActor({ id:"tumla", panelId:"P3", el: tumla, anchors:{ face:{x:0.50,y:0.36}, collar:{x:0.50,y:0.48}, handR:{x:0.70,y:0.56} }});
  engine.registerActor({ id:"tumlum", panelId:"P4", el: tumlum, anchors:{ face:{x:0.50,y:0.36}, collar:{x:0.50,y:0.48}, handR:{x:0.70,y:0.56} }});

  log("Actors loaded (placeholders). Replace with PNG <img> later.");
}

setupActors();

$("layout").addEventListener("change", (e)=>{ engine.setLayout(e.target.value); setupActors(); });
$("btnReset").addEventListener("click", ()=>{ setupActors(); log("Reset scene."); });

$("btnThrow").addEventListener("click", ()=>{ engine.play("THROW_PROP", {from:"tumla", to:"bala", propType:"sandal", duration:520}); });
$("btnPunch").addEventListener("click", ()=>{ engine.play("PUNCH", {from:"bolo", to:"tumlum", duration:420}); });
$("btnPull").addEventListener("click", ()=>{ engine.play("PULL", {from:"tumla", to:"bolo", carryToPanel:"P3", duration:560}); });
