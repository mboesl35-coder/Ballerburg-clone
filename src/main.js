(function () {
  const B = (window.Baller = window.Baller || {});
  const b = B.BALANCE;

  const menu = document.getElementById("menu");
  const play = document.getElementById("play");
  const over = document.getElementById("over");
  const canvas = document.getElementById("view");
  const ctx = canvas.getContext("2d");
  const frameEl = document.getElementById("frame");
  canvas.width = b.viewW;
  canvas.height = b.viewH;
  const mapSelect = document.getElementById("map");
  const status = document.getElementById("status");
  const detail = document.getElementById("detail");
  const angle = document.getElementById("angle");
  const powder = document.getElementById("powder");
  const angleVal = document.getElementById("angle-val");
  const powderVal = document.getElementById("powder-val");
  const stats = document.getElementById("stats");
  const fire = document.getElementById("fire");
  const pass = document.getElementById("pass");
  const shop = document.getElementById("shop");

  let match = null;
  let last = 0;
  let aiToken = 0;
  let zoom = 1;
  let fitView = true;

  function zoomToFit() {
    if (play.hidden) return;
    if (!frameEl.clientWidth) {
      requestAnimationFrame(zoomToFit);
      return;
    }
    frameEl.style.overflowX = "hidden";
    const width = frameEl.clientWidth;
    zoom = Math.min(1, width / b.viewW);
    canvas.style.width = width + "px";
    canvas.style.height = Math.round(b.viewH * zoom) + "px";
    frameEl.scrollLeft = 0;
    fitView = true;
  }

  function applyZoom(next, clientX) {
    const minZoom = Math.min(1, frameEl.clientWidth / b.viewW);
    next = Math.max(minZoom, Math.min(1, next));
    if (next <= minZoom * 1.002) {
      zoomToFit();
      return;
    }
    const frameRect = frameEl.getBoundingClientRect();
    const viewX = clientX == null ? frameEl.clientWidth / 2 : clientX - frameRect.left - frameEl.clientLeft;
    const worldX = (frameEl.scrollLeft + viewX) / zoom;
    zoom = next;
    fitView = false;
    frameEl.style.overflowX = "auto";
    canvas.style.width = b.viewW * zoom + "px";
    canvas.style.height = b.viewH * zoom + "px";
    const maxScroll = Math.max(0, canvas.offsetWidth - frameEl.clientWidth);
    frameEl.scrollLeft = Math.max(0, Math.min(maxScroll, worldX * zoom - viewX));
  }

  for (const map of B.MAPS) {
    const option = document.createElement("option");
    option.value = map.id;
    option.textContent = map.name;
    mapSelect.appendChild(option);
  }

  angle.min = String(b.angleMin);
  angle.max = String(b.angleMax);
  powder.min = String(b.powderMin);
  powder.max = String(b.powderMax);

  function priceButtons() {
    document.getElementById("buy-ball").textContent = "Rocket (" + b.ballCost + ")";
    document.getElementById("buy-powder").textContent = "Rocket Fuel (" + b.powderCost + ")";
    document.getElementById("buy-launcher").textContent = "Buy launcher (" + b.launcherCost + ")";
    document.getElementById("wall").textContent = "Wall (" + b.wallCost + ")";
    document.getElementById("tower").textContent = "Mine tower (" + b.towerCost + ")";
    document.getElementById("borrow").textContent = "Borrow (" + b.borrowAmount + ")";
    document.getElementById("repay").textContent = "Repay";
  }

  function myTurn() {
    return match && match.phase === "aim" && match.turn === "left";
  }

  function refresh() {
    if (!match) return;
    const ruler = match.rulers.left;
    status.textContent = match.log;
    detail.textContent = match.detail;
    const chargeMax = Math.min(b.powderMax, ruler.powder);
    powder.max = String(Math.max(b.powderMin, chargeMax));
    if (ruler.powder >= b.powderMin && match.left.powder > chargeMax) match.left.powder = chargeMax;
    if (myTurn()) {
      angle.value = String(match.left.elevation);
      powder.value = String(match.left.powder);
    }
    angleVal.textContent = angle.value + "°";
    powderVal.textContent = powder.value;
    const happy = Math.round(ruler.happiness);
    stats.textContent =
      "Gold " + ruler.gold +
      "   Debt " + ruler.debt +
      "   Rocket Fuel " + ruler.powder +
      "   Rockets " + ruler.balls +
      "   People " + ruler.people +
      "   Mood " + happy;
    const canShoot = myTurn() && B.hasType(match.left, "cannon") && ruler.balls > 0 && ruler.powder >= b.powderMin;
    fire.disabled = !canShoot;
    pass.disabled = !myTurn();
    shop.disabled = !myTurn();
    document.getElementById("buy-launcher").hidden = B.hasType(match.left, "cannon");
    angle.disabled = !myTurn();
    powder.disabled = !myTurn() || ruler.powder < b.powderMin;
    document.getElementById("food").disabled = !myTurn();
  }

  function scheduleAi() {
    const token = ++aiToken;
    window.setTimeout(function () {
      if (token !== aiToken || !match) return;
      if (match.phase !== "aim" || match.turn !== "right") return;
      B.aiAct(match);
      refresh();
    }, 700);
  }

  function start() {
    aiToken++;
    match = B.createMatch(mapSelect.value);
    document.getElementById("food").value = String(match.rulers.left.food);
    B.openTurn(match);
    menu.hidden = true;
    over.hidden = true;
    play.hidden = false;
    refresh();
    zoomToFit();
    last = performance.now();
  }

  function showOver() {
    const title = document.getElementById("over-title");
    const text = document.getElementById("over-text");
    if (match.winner === "left") {
      title.textContent = "Victory";
      text.textContent = "The enemy king is dead.";
    } else if (match.winner === "right") {
      title.textContent = "Defeat";
      text.textContent = "Your king is dead.";
    } else {
      title.textContent = "Draw";
      text.textContent = "Both kings are dead.";
    }
    over.hidden = false;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!match || play.hidden) return;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    const stamp = match.phase + match.turn + (match.winner || "");
    B.advance(match, dt);
    const next = match.phase + match.turn + (match.winner || "");
    if (next !== stamp) {
      refresh();
      if (match.phase === "over") showOver();
      if (match.phase === "aim" && match.turn === "right") scheduleAi();
    }
    B.drawScene(ctx, match, now);
  }

  frameEl.addEventListener("wheel", function (event) {
    if (play.hidden || !event.deltaY) return;
    event.preventDefault();
    const dy = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * frameEl.clientHeight : event.deltaY;
    applyZoom(zoom * Math.exp(-dy * 0.0016), event.clientX);
  }, { passive: false });

  window.addEventListener("resize", function () {
    if (play.hidden || !fitView) return;
    zoomToFit();
  });

  document.getElementById("start").addEventListener("click", start);
  document.getElementById("again").addEventListener("click", start);

  angle.addEventListener("input", function () {
    if (!myTurn()) return;
    match.left.elevation = Number(angle.value);
    angleVal.textContent = angle.value + "°";
    B.syncAim(match);
  });
  powder.addEventListener("input", function () {
    if (!myTurn()) return;
    match.left.powder = Number(powder.value);
    powderVal.textContent = powder.value;
    B.syncAim(match);
  });

  fire.addEventListener("click", function () {
    if (!myTurn()) return;
    const error = B.launch(match, Number(angle.value), Number(powder.value));
    if (error) match.log = error;
    refresh();
  });
  pass.addEventListener("click", function () {
    if (!myTurn()) return;
    B.passTurn(match);
    refresh();
  });

  const buys = {
    "buy-ball": "ball",
    "buy-powder": "powder",
    "buy-launcher": "launcher",
    wall: "wall",
    tower: "tower",
    borrow: "borrow",
    repay: "repay",
  };
  Object.keys(buys).forEach(function (id) {
    document.getElementById(id).addEventListener("click", function () {
      const error = B.playerBuy(match, buys[id]);
      if (error) match.log = error;
      refresh();
    });
  });

  document.getElementById("food").addEventListener("change", function (event) {
    if (!myTurn()) return;
    match.rulers.left.food = Number(event.target.value);
    match.detail = "Food changed. Takes effect at the start of the next turn.";
    refresh();
  });

  window.addEventListener("keydown", function (event) {
    if (!myTurn()) return;
    if (event.target.matches("input, select, button")) return;
    if (event.key === "ArrowLeft") match.left.elevation = Math.max(b.angleMin, match.left.elevation - 1);
    else if (event.key === "ArrowRight") match.left.elevation = Math.min(b.angleMax, match.left.elevation + 1);
    else if (event.key === "ArrowUp") match.left.powder = Math.min(Math.min(b.powderMax, match.rulers.left.powder), match.left.powder + 1);
    else if (event.key === "ArrowDown") match.left.powder = Math.max(b.powderMin, match.left.powder - 1);
    else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      fire.click();
      return;
    } else return;
    event.preventDefault();
    B.syncAim(match);
    refresh();
  });

  priceButtons();
  if (new URLSearchParams(location.search).has("start")) start();
  requestAnimationFrame(frame);
})();
