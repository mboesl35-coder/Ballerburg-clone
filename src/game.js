(function () {
  const B = (window.Baller = window.Baller || {});

  function other(side) {
    return side === "left" ? "right" : "left";
  }

  function peopleIn(castle) {
    const houses = castle && castle.houses;
    if (!houses) return 0;
    let n = 0;
    for (let i = 0; i < houses.length; i++) n += houses[i].pop || 0;
    return n;
  }

  function spendPopulation(ruler, castle, count) {
    if (!ruler || ruler.population < count) return false;
    ruler.population -= count;
    const houses = castle && castle.houses;
    if (houses) {
      let rem = count;
      for (let i = 0; i < houses.length && rem > 0; i++) {
        const house = houses[i];
        if (house.type !== "house" || !(house.pop > 0)) continue;
        const take = Math.min(rem, house.pop);
        house.pop -= take;
        rem -= take;
      }
    }
    return true;
  }

  function ruinedHomes(castle) {
    const houses = castle && castle.houses;
    if (!houses) return 0;
    let gone = 0;
    for (let i = 0; i < houses.length; i++) {
      if (houses[i].type !== "house") gone += 1;
    }
    return gone;
  }

  function sideStatus(ruler, own, enemy) {
    const mood = B.moodLine(ruler, own);
    const king = B.kingLine(own, enemy, ruler);
    return mood ? mood + " " + king : king;
  }

  B.createMatch = function createMatch(mapId, mode) {
    mode = mode || "story";
    B.PRICES = mode === "free" ? B.FREE_PRICES : B.BALANCE;
    const terrain = B.createTerrain(mapId);
    const left = B.createCastle("left", mode === "free" ? { style: "kremlin", brick: "blue" } : null);
    const right = B.createCastle("right", { style: "kremlin", brick: "red" });
    left.terrain = terrain;
    right.terrain = terrain;
    B.layoutCastle(left, terrain);
    B.layoutCastle(right, terrain);
    const housePlan = mode === "free" ? B.FREE_HOUSE_SLOTS : null;
    B.placeHouses(left, housePlan);
    B.placeHouses(right, housePlan);
    if (mode === "free") B.placeOilRigs(left);
    B.placeOilRigs(right);
    const match = {
      mode,
      prices: B.PRICES,
      terrain,
      left,
      right,
      rulers: { left: B.createRuler("left", mode), right: B.createRuler("right", mode) },
      turn: "left",
      phase: "aim",
      wind: Math.round((Math.random() * 2 - 1) * B.BALANCE.windMax * 0.6),
      shot: null,
      droneAim: null,
      wallTool: null,
      preview: [],
      previewLow: [],
      previewHigh: [],
      fx: [],
      pause: 0,
      log: "",
      detail: "",
      report: null,
      winner: null,
      intercept: null,
      playerTurn: 0,
      oilRigsDestroyed: 0,
      oilOutrageShown: false,
      pendingAllies: false,
      pendingUltimatum: false,
      pendingGrant: false,
      pendingOil: false,
    };
    match.rulers.left.population = peopleIn(left);
    match.rulers.right.population = peopleIn(right);
    return match;
  };

  function refreshPreview(match) {
    if (match.droneAim || match.wallTool || match.turn !== "left" || match.phase !== "aim") {
      match.preview = [];
      match.previewLow = [];
      match.previewHigh = [];
      return;
    }
    const ruler = match.rulers.left;
    const castle = match.left;
    if (!B.hasType(castle, "cannon") || ruler.powder < castle.powder || ruler.balls < 1) {
      match.preview = [];
      match.previewLow = [];
      match.previewHigh = [];
      return;
    }
    match.preview = B.fly(match, "left", castle.elevation, castle.powder, true).path;
    const spread = B.powderSpread(ruler);
    if (spread > 0) {
      match.previewLow = B.fly(match, "left", castle.elevation, castle.powder - spread, true).path;
      match.previewHigh = B.fly(match, "left", castle.elevation, castle.powder + spread, true).path;
    } else {
      match.previewLow = [];
      match.previewHigh = [];
    }
  }

  B.syncAim = function syncAim(match) {
    refreshPreview(match);
  };

  function emitExhaust(match, path, index, sam) {
    const i = Math.max(0, Math.min(path.length - 1, index));
    const p = path[i];
    const prev = path[Math.max(0, i - 1)];
    const next = path[Math.min(path.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const ang = dx === 0 && dy === 0 ? 0 : Math.atan2(dy, dx);
    const bx = p.x - Math.cos(ang) * 10;
    const by = p.y - Math.sin(ang) * 10;
    const hot = Math.random();
    match.fx.push({
      kind: "fire",
      x: bx,
      y: by,
      vx: -Math.cos(ang) * 28 + (Math.random() - 0.5) * 18,
      vy: -Math.sin(ang) * 28 + (Math.random() - 0.5) * 18,
      life: 0.55,
      fade: 3.6,
      size: 2.4 + Math.random() * 2.4,
      grav: 0,
      color: sam
        ? hot < 0.28 ? "#f4fbff" : hot < 0.62 ? "#9ec8f5" : "#3d7ec4"
        : hot < 0.28 ? "#fff4c2" : hot < 0.62 ? "#ffb03a" : "#ff4d12",
    });
    match.fx.push({
      kind: "smoke",
      x: bx,
      y: by,
      vx: -Math.cos(ang) * 8 + (Math.random() - 0.5) * 14,
      vy: -Math.sin(ang) * 8 - 8,
      life: 0.85,
      fade: 0.7,
      size: 4 + Math.random() * 2.5,
      grow: 12,
      grav: -10,
      color: sam ? (Math.random() < 0.5 ? "#c5d0da" : "#8d99a6") : Math.random() < 0.5 ? "#c4beb4" : "#7a746c",
    });
  }

  function burn(match, path, cursor, tip, sam) {
    if (!path.length || tip < 0) return;
    if (cursor.emitted == null) cursor.emitted = 0;
    const end = Math.min(path.length - 1, Math.floor(tip));
    for (let i = cursor.emitted; i <= end; i++) emitExhaust(match, path, i, sam);
    if (end >= cursor.emitted) cursor.emitted = end + 1;
  }

  function explode(match, x, y, debris, scale, boom) {
    const from = match.fx.length;
    match.fx.push({ kind: "flash", x: x, y: y, life: 1, fade: 2.4, size: 16, grow: 150, color: "#fff8e0" });
    match.fx.push({ kind: "ring", x: x, y: y, life: 1, fade: 1.8, size: 8, grow: 130, width: 3, color: "#ffe7a0" });
    match.fx.push({ kind: "ring", x: x, y: y, life: 1, fade: 1.35, size: 5, grow: 78, width: 3, color: "#ff8a1e" });
    match.fx.push({
      kind: "fire",
      x: x,
      y: y,
      vx: 0,
      vy: -12,
      life: 1,
      fade: 1.5,
      size: 14,
      grow: 22,
      grav: 0,
      color: "#fff1c0",
    });
    match.fx.push({
      kind: "fire",
      x: x,
      y: y,
      vx: 0,
      vy: -6,
      life: 1,
      fade: 1.15,
      size: 22,
      grow: 16,
      grav: 0,
      color: "#ff7a18",
    });
    const fire = ["#fff6c8", "#ffd15a", "#ff8a1e", "#e23b12", "#8a2010"];
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 46 + Math.random() * 180;
      match.fx.push({
        kind: "fire",
        x: x,
        y: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 40,
        life: 0.6 + Math.random() * 0.5,
        fade: 1.2,
        size: 3.5 + Math.random() * 6,
        grav: 60,
        color: debris === "gold" && i < 6 ? "#e6c56a" : fire[i % fire.length],
      });
    }
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 12 + Math.random() * 40;
      match.fx.push({
        kind: "smoke",
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 16,
        life: 1,
        fade: 0.62,
        size: 6 + Math.random() * 5,
        grow: 20,
        grav: -26,
        color: i % 2 ? "#6a645c" : "#3a3632",
      });
    }
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 100 + Math.random() * 210;
      match.fx.push({
        kind: "spark",
        x: x,
        y: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 80,
        life: 0.5 + Math.random() * 0.4,
        fade: 1.45,
        size: 2,
        grav: 280,
        color: "#ffe08a",
      });
    }
    if (debris === "ground") {
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI * (0.12 + Math.random() * 0.76);
        const s = 46 + Math.random() * 100;
        match.fx.push({
          kind: "spark",
          x: x,
          y: y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 0.75,
          fade: 1.05,
          size: 3,
          grav: 340,
          color: i % 2 ? "#6d7a45" : "#5a4636",
        });
      }
    }
    if (scale != null && scale !== 1) {
      for (let i = from; i < match.fx.length; i++) {
        const bit = match.fx[i];
        if (bit.size) bit.size *= scale;
        if (bit.grow) bit.grow *= scale;
        if (bit.vx) bit.vx *= scale;
        if (bit.vy) bit.vy *= scale;
        if (bit.grav) bit.grav *= scale;
        if (bit.width) bit.width *= scale;
      }
    }
    if (boom === "intercept") cue("interceptExplosion", x);
    else cue("rocketExplosion", x, scale);
  }

  function cue(name, x, scale) {
    const sfx = B.sfx;
    if (!sfx || typeof sfx[name] !== "function") return;
    sfx[name](x, scale);
  }

  function cryIfHomes(blast, x) {
    if (!blast) return;
    let homes = 0;
    if (blast.popHomes) homes = (blast.popHomes.left || 0) + (blast.popHomes.right || 0);
    else if (blast.houseLoss) homes = (blast.houseLoss.left || 0) + (blast.houseLoss.right || 0);
    if (homes > 0) cue("scream", x, homes);
  }

  function announceIntercept(match, ice) {
    if (ice.announced) return;
    ice.announced = true;
    match.log = match.turn === "left"
      ? "The enemy patriot launches an interceptor."
      : "Your patriot launches an interceptor.";
    const from = ice.path && ice.path.length ? ice.path[0].x : null;
    cue("interceptLaunch", from);
  }

  B.openTurn = function openTurn(match) {
    const b = B.BALANCE;
    match.wind = Math.max(-b.windMax, Math.min(b.windMax, match.wind + (Math.random() * 2 - 1) * b.windJitter));
    const side = match.turn;
    const ruler = match.rulers[side];
    if (side === "left") {
      match.playerTurn += 1;
      if (match.mode !== "free") {
        if (match.playerTurn === 3) match.pendingAllies = true;
        if (match.playerTurn > 0 && match.playerTurn % 10 === 0) match.pendingAid = true;
        if (match.playerTurn === 5 || match.playerTurn === 25 || match.playerTurn === 45 || match.playerTurn === 65) {
          if (match.playerTurn === 5) match.rulers.right.nukes = 67;
          match.pendingUltimatum = true;
          match.ultimatumTurn = match.playerTurn;
        }
      }
    }
    ruler.dronesBought = 0;
    ruler.mobilised = false;
    match.aiSpent = false;
    match.aiNotes = null;
    B.tickOilRepair(match.left);
    B.tickOilRepair(match.right);
    const castle = match[side];
    const report = B.beginEconomy(ruler, castle);
    match.report = report;
    const who = side === "left" ? "Your turn" : "Enemy";
    match.log = who + ". Income " + report.income + ".";
    if (match.mode !== "free" && side === "left" && match.playerTurn === 3) {
      ruler.gold += 250;
      ruler.interceptors += 5;
      if (!B.patriotAlive(match.left) && B.placePatriot(match.left)) {
        match.log = "The allies send a patriot battery, 250 gold, and five air-to-air missiles.";
      } else {
        match.log = "The allies send 250 gold and five air-to-air missiles.";
      }
    }
    if (match.mode !== "free" && side === "left" && match.pendingAid) {
      ruler.gold += 500;
      ruler.interceptors += 10;
      match.log = "The allies send 500 gold and ten air-to-air missiles.";
    }
    match.detail = sideStatus(ruler, castle, match[other(side)]);
    match.phase = "aim";
    match.droneAim = null;
    match.wallTool = null;
    refreshPreview(match);
  };

  function chooseMeet(path, terrain, muzzle) {
    const crestX = (terrain.valleyStart + terrain.valleyEnd) / 2;
    const lo = Math.max(6, Math.floor(path.length * 0.08));
    const hi = Math.max(lo + 1, Math.min(path.length - 4, Math.floor(path.length * 0.94)));
    let best = -1;
    let bestScore = -Infinity;
    let fallback = lo;
    let fallbackScore = -Infinity;
    for (let i = lo; i < hi; i++) {
      const p = path[i];
      const ground = terrain.yAt(p.x);
      const clear = ground - p.y;
      if (p.y > 28 && clear > fallbackScore) {
        fallbackScore = clear;
        fallback = i;
      }
      if (p.y < 48 || clear < 70) continue;
      const dist = Math.hypot(p.x - muzzle.x, p.y - muzzle.y);
      if (dist < 90) continue;
      const score = 220 - Math.abs(p.y - 150) * 0.9 - Math.abs(p.x - crestX) * 0.22;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best >= 0 ? best : fallback;
  }

  function arcBetween(from, to, steps, lift) {
    const path = [];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const safe = Math.max(1, steps);
    for (let i = 1; i <= safe; i++) {
      const t = i / safe;
      path.push({
        x: from.x + dx * t,
        y: from.y + dy * t - Math.sin(Math.PI * t) * lift,
      });
    }
    path[path.length - 1] = { x: to.x, y: to.y };
    return path;
  }

  function clearsGround(path, terrain) {
    for (let i = 0; i < path.length; i++) {
      if (path[i].y > terrain.yAt(path[i].x) - 8) return false;
    }
    return true;
  }

  function planHit(muzzle, attackPath, terrain) {
    const meetAt = chooseMeet(attackPath, terrain, muzzle);
    const to = attackPath[Math.max(0, Math.min(attackPath.length - 1, meetAt))];
    const dist = Math.hypot(to.x - muzzle.x, to.y - muzzle.y);
    let lift = Math.min(64, Math.max(20, dist * 0.1));
    let steps = Math.max(24, Math.min(120, Math.round(dist / 5)));
    let launchAt = meetAt - steps + 1;
    if (launchAt < 4) {
      launchAt = Math.min(4, meetAt);
      steps = Math.max(1, meetAt - launchAt + 1);
    }
    let path = arcBetween(muzzle, to, steps, lift);
    for (let attempt = 0; attempt < 5 && !clearsGround(path, terrain); attempt++) {
      lift += 28;
      path = arcBetween(muzzle, to, steps, lift);
    }
    return { path: path, launchAt: launchAt, meetAt: meetAt, success: true };
  }

  function outsideScreen(p) {
    const w = B.BALANCE.viewW;
    return p.y < -30 || p.x < -30 || p.x > w + 30;
  }

  function climbOut(muzzle, lean) {
    const path = [];
    let x = muzzle.x;
    let y = muzzle.y;
    const vx = -muzzle.dir * (50 + lean * 35);
    let vy = -420 - lean * 30;
    const dt = 1 / 60;
    const w = B.BALANCE.viewW;
    for (let i = 0; i < 420; i++) {
      vy += 18 * dt;
      x += vx * dt;
      y += vy * dt;
      path.push({ x: x, y: y });
      if (y < -60 || x < -70 || x > w + 70) break;
    }
    if (!path.length || !outsideScreen(path[path.length - 1])) path.push({ x: x, y: -90 });
    return path;
  }

  function gapToAttack(path, attackPath, launchAt) {
    let best = Infinity;
    for (let i = 0; i < path.length; i++) {
      const j = launchAt + i;
      if (j < 0 || j >= attackPath.length) continue;
      const a = attackPath[j];
      const p = path[i];
      const d = (p.x - a.x) * (p.x - a.x) + (p.y - a.y) * (p.y - a.y);
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  }

  function planMiss(muzzle, attackPath) {
    const n = attackPath.length;
    let best = null;
    let bestRank = -Infinity;
    for (let k = 0; k < 8; k++) {
      const launchAt = Math.max(3, Math.min(Math.max(3, n - 6), Math.floor(n * (0.06 + k * 0.09))));
      for (let lean = 0; lean < 4; lean++) {
        const path = climbOut(muzzle, lean);
        if (!path.length || !outsideScreen(path[path.length - 1])) continue;
        const gap = gapToAttack(path, attackPath, launchAt);
        const timing = 1 - Math.abs(launchAt / n - 0.32);
        const rank = (gap >= 48 ? 1000 : 0) + gap + timing * 40 - lean * 5;
        if (rank > bestRank) {
          bestRank = rank;
          best = { path: path, launchAt: launchAt, meetAt: -1, success: false };
        }
      }
    }
    if (best) return best;
    return { path: climbOut(muzzle, 5), launchAt: 4, meetAt: -1, success: false };
  }

  function armIntercept(match, attacker, attackPath, weapon) {
    if (!attackPath || attackPath.length < 8) return null;
    const defender = other(attacker);
    const castle = match[defender];
    const ruler = match.rulers[defender];
    if (!B.patriotAlive(castle) || ruler.interceptors < 1) return null;
    const drone = weapon === "drone";
    if (drone ? ruler.targetDrones === false : ruler.targetRockets === false) return null;
    // Drones are slow enough that a launched missile always connects.
    const success = drone || Math.random() < B.interceptOdds(ruler);
    const plan = success
      ? planHit(B.patriotMuzzle(castle.patriot), attackPath, match.terrain)
      : planMiss(B.patriotMuzzle(castle.patriot), attackPath);
    if (!plan || !plan.path || !plan.path.length) return null;
    ruler.interceptors -= 1;
    plan.index = -1;
    plan.emitted = 0;
    plan.announced = false;
    return plan;
  }

  B.launch = function launch(match, elevation, powder) {
    const side = match.turn;
    const ruler = match.rulers[side];
    const castle = match[side];
    const b = B.BALANCE;
    if (match.phase !== "aim") return "A shot is already in flight.";
    if (!B.hasType(castle, "cannon")) return "The launcher is destroyed.";
    if (ruler.balls < 1) return "No rockets left.";
    if (powder < b.powderMin || ruler.powder < powder) return "Not enough rocket fuel.";
    if (powder > B.fuelCapacity(ruler)) return "That charge is past your fuel capacity.";
    castle.elevation = elevation;
    castle.powder = powder;
    ruler.powder -= powder;
    ruler.balls -= 1;
    const spread = B.powderSpread(ruler);
    const actualPowder = spread > 0 ? powder + (Math.random() * 2 - 1) * spread : powder;
    const flown = B.fly(match, side, elevation, actualPowder, true);
    const intercept = armIntercept(match, side, flown.path, "rocket");
    match.shot = { path: flown.path, hit: flown.hit, index: 0, emitted: 0, intercept: intercept };
    match.droneAim = null;
    match.wallTool = null;
    match.preview = [];
    match.previewLow = [];
    match.previewHigh = [];
    match.phase = "fly";
    match.log = side === "left" ? "Your rocket is in flight." : "The enemy fires.";
    cue("rocketLaunch", flown.path.length ? flown.path[0].x : null);
    return null;
  };

  B.passTurn = function passTurn(match) {
    if (match.phase !== "aim") return;
    match.droneAim = null;
    match.wallTool = null;
    match.log = match.turn === "left" ? "You hold your fire." : "The enemy hesitates.";
    match.phase = "between";
    match.pause = 0.45;
  };

  function sideLine(sides, left, right, both) {
    const hasLeft = sides.indexOf("left") >= 0;
    const hasRight = sides.indexOf("right") >= 0;
    if (hasLeft && hasRight) return both;
    if (hasLeft) return left;
    if (hasRight) return right;
    return null;
  }

  function houseLine(blast, voice) {
    const say = voice || "The rocket";
    const loss = blast.houseLoss;
    const gone = blast.houseGone || { left: 0, right: 0 };
    const popped = blast.popLost || { left: 0, right: 0 };
    if (!loss) return null;
    const left = loss.left;
    const right = loss.right;
    if (!left && !right) return null;
    function people(n) {
      if (n <= 0) return "No population is lost.";
      return n + " population is lost.";
    }
    function oneSide(count, fell, pop, mine) {
      const tail = people(pop);
      if (count === 1 && fell === 1) {
        return say + " destroys " + (mine ? "your house" : "the enemy house") + ". " + tail;
      }
      if (count === 1) {
        return say + " damages " + (mine ? "your house" : "the enemy house") + ". " + tail;
      }
      const what = mine ? count + " of your houses" : count + " enemy houses";
      if (fell >= count) return say + " destroys " + what + ". " + tail;
      if (fell > 0) return say + " damages " + what + " and destroys " + fell + ". " + tail;
      return say + " damages " + what + ". " + tail;
    }
    if (left && right) {
      return say + " hits houses on both sides. " + people((popped.left || 0) + (popped.right || 0));
    }
    if (left) return oneSide(left, gone.left, popped.left || 0, true);
    return oneSide(right, gone.right, popped.right || 0, false);
  }

  function noteCivilian(match, blast) {
    if (!match || match.mode === "free") return;
    if (!blast || !blast.houseLoss || !blast.houseLoss.right) return;
    if (match.turn !== "left" || !(match.playerTurn > 2)) return;
    match.pendingCivilian = true;
  }

  function noteOil(match, blast) {
    if (!match || match.mode === "free" || match.oilOutrageShown) return;
    if (!blast || !blast.rigs || blast.rigs.indexOf("right") < 0) return;
    if (match.turn !== "left") return;
    if ((match.oilRigsDestroyed || 0) >= B.BALANCE.oilOutrageAt) {
      match.oilOutrageShown = true;
      match.pendingOil = true;
    }
  }

  function noteReconstruction(match) {
    if (!match || match.mode === "free" || match.pendingGrant) return;
    if (ruinedHomes(match.left) >= B.BALANCE.reconstructionAt) match.pendingGrant = true;
  }

  function describeBlast(blast, hit, weapon) {
    const voice = weapon === "drone" ? "The drone" : "The rocket";
    const king = sideLine(blast.keeps, voice + " kills your king.", voice + " kills the Orc Overlord.", voice + " kills your king and the Orc Overlord.");
    if (king) return king;
    const cannon = sideLine(blast.cannons, voice + " hits your launcher.", voice + " hits the enemy launcher.", voice + " hits both launchers.");
    if (cannon) return cannon;
    const house = houseLine(blast, voice);
    if (house) return house;
    const tower = sideLine(blast.towers, voice + " hits your mine tower.", voice + " hits the enemy mine tower.", voice + " hits both mine towers.");
    if (tower) return tower;
    const rig = sideLine(blast.rigs || [], voice + " hits your oil rig.", voice + " hits the enemy oil rig.", voice + " hits oil rigs on both sides.");
    if (rig) return rig;
    const patriot = sideLine(blast.patriots || [], voice + " hits your patriot.", voice + " hits the enemy patriot.", voice + " hits both patriots.");
    if (patriot) return patriot;
    const wall = sideLine(blast.walls, voice + " hits your wall.", voice + " hits the enemy wall.", voice + " hits both walls.");
    if (wall) return wall;
    if (hit.type === "ground") return voice + " hits the hillside.";
    if (weapon === "drone") return voice + " explodes.";
    return "The rocket flies into the void.";
  }

  function finishDrone(match, line) {
    const leftKeep = B.hasType(match.left, "keep");
    const rightKeep = B.hasType(match.right, "keep");
    match.shot = null;
    match.log = line;
    if (!leftKeep || !rightKeep) {
      match.phase = "over";
      match.winner = leftKeep ? "left" : rightKeep ? "right" : "draw";
      match.detail = B.kingLine(match.left, match.right, match.rulers.left);
      return;
    }
    match.phase = "aim";
    match.detail = sideStatus(match.rulers.left, match.left, match.right);
    refreshPreview(match);
  }

  function advanceDrone(match, dt) {
    const shot = match.shot;
    const path = shot.path;
    const ice = shot.intercept;
    shot.index += dt * B.BALANCE.dronePace;
    const attackTip = ice && ice.success ? Math.min(shot.index, ice.meetAt) : shot.index;
    burn(match, path, shot, attackTip, false);
    if (ice && shot.index >= ice.launchAt) {
      announceIntercept(match, ice);
      ice.index = shot.index - ice.launchAt;
      burn(match, ice.path, ice, ice.index, true);
      if (ice.success && shot.index >= ice.meetAt) {
        const at = path[Math.max(0, Math.min(path.length - 1, ice.meetAt))];
        explode(match, at.x, at.y, false, 1, "intercept");
        const line = match.turn === "left"
          ? "The interceptor strikes your drone. Both explode."
          : "Your interceptor strikes the enemy drone. Both explode.";
        finishDrone(match, line);
        return;
      }
    }
    if (shot.index < path.length) return;
    const hit = shot.hit;
    const at = hit && hit.x != null ? hit : path[path.length - 1];
    const blast = B.applyBlast(match, at.x, at.y, B.BALANCE.blastRadius / 2);
    const debris = blast.keeps.length ? "gold" : hit.type === "ground" ? "ground" : false;
    explode(match, at.x, at.y, debris, 0.5);
    cryIfHomes(blast, at.x);
    let line = describeBlast(blast, hit, "drone");
    if (ice && !ice.success) {
      line = "The interceptor misses. " + line;
      if (ice.index >= 0 && ice.index < ice.path.length) match.intercept = ice;
    }
    const leftKeep = B.hasType(match.left, "keep");
    const rightKeep = B.hasType(match.right, "keep");
    if (leftKeep && rightKeep) {
      noteCivilian(match, blast);
      noteOil(match, blast);
      noteReconstruction(match);
    }
    finishDrone(match, line);
  }

  B.cancelDroneAim = function cancelDroneAim(match) {
    if (!match || !match.droneAim) return;
    match.droneAim = null;
    match.log = "Drone attack cancelled.";
    refreshPreview(match);
  };

  B.planDrone = function planDrone(match) {
    if (!match || match.phase !== "aim" || match.turn !== "left") return "Not now.";
    if (match.wallTool) return "Use the putty knife on your castle first.";
    if (match.droneAim) {
      B.cancelDroneAim(match);
      return null;
    }
    const ruler = match.rulers.left;
    if (!ruler.droneLevel) return "Research the drone factory first.";
    if (ruler.drones < 1) return "No attack drones ready.";
    const home = B.droneHome(match.left);
    match.droneAim = { x: home.x, y: home.y };
    match.log = "Click the map to send the drone.";
    match.detail = "It flies from above your castle and explodes on anything in the way.";
    refreshPreview(match);
    return null;
  };

  B.launchDrone = function launchDrone(match, x, y) {
    if (!match || match.phase !== "aim") return "Not now.";
    const side = match.turn;
    if (side === "left" && !match.droneAim) return "Plan a drone attack first.";
    const ruler = match.rulers[side];
    if (!ruler.droneLevel) return "Research the drone factory first.";
    if (ruler.drones < 1) return "No attack drones ready.";
    if (!B.droneInRange(match, side, x)) return "That target is past your drone range.";
    const flown = B.flyDrone(match, side, x, y);
    if (!flown.path.length) return "The drone has nowhere to fly.";
    ruler.drones -= 1;
    match.droneAim = null;
    match.preview = [];
    match.previewLow = [];
    match.previewHigh = [];
    const intercept = armIntercept(match, side, flown.path, "drone");
    match.shot = { path: flown.path, hit: flown.hit, index: 0, emitted: 0, drone: true, intercept: intercept };
    match.phase = "fly";
    match.log = side === "left" ? "Your drone is in flight." : "The enemy sends a drone.";
    return null;
  };

  B.advance = function advance(match, dt) {
    for (const bit of match.fx) {
      bit.life -= dt * (bit.fade == null ? 1.4 : bit.fade);
      bit.x += (bit.vx || 0) * dt;
      bit.y += (bit.vy || 0) * dt;
      if (bit.vy != null) bit.vy += (bit.grav == null ? 180 : bit.grav) * dt;
      if (bit.grow) bit.size += bit.grow * dt;
    }
    match.fx = match.fx.filter((bit) => bit.life > 0);

    if (match.intercept && (!match.shot || match.shot.intercept !== match.intercept)) {
      const spare = match.intercept;
      spare.index += dt * B.BALANCE.rocketPace;
      burn(match, spare.path, spare, spare.index, true);
      if (spare.index >= spare.path.length) match.intercept = null;
    }

    if (match.phase === "fly" && match.shot) {
      const shot = match.shot;
      if (shot.drone) {
        advanceDrone(match, dt);
        return;
      }
      const path = shot.path;
      const ice = shot.intercept;
      shot.index += dt * B.BALANCE.rocketPace;
      const attackTip = ice && ice.success ? Math.min(shot.index, ice.meetAt) : shot.index;
      burn(match, path, shot, attackTip, false);
      if (ice && shot.index >= ice.launchAt) {
        announceIntercept(match, ice);
        ice.index = shot.index - ice.launchAt;
        burn(match, ice.path, ice, ice.index, true);
        if (ice.success && shot.index >= ice.meetAt) {
          const at = path[Math.max(0, Math.min(path.length - 1, ice.meetAt))];
          explode(match, at.x, at.y, false, 1, "intercept");
          match.log = match.turn === "left"
            ? "The interceptor strikes your rocket. Both explode."
            : "Your interceptor strikes the enemy rocket. Both explode.";
          match.shot = null;
          match.phase = "between";
          match.pause = 0.7;
          return;
        }
      }
      if (shot.index >= path.length) {
        const hit = shot.hit;
        let line;
        let blast = null;
        if (hit.type === "block" || hit.type === "ground") {
          const radius = B.rocketBlastRadius(match.rulers[match.turn]);
          blast = B.applyBlast(match, hit.x, hit.y, radius);
          const debris = blast.keeps.length ? "gold" : hit.type === "ground" ? "ground" : false;
          explode(match, hit.x, hit.y, debris, radius / B.BALANCE.blastRadius);
          cryIfHomes(blast, hit.x);
          line = describeBlast(blast, hit);
        } else {
          line = "The rocket flies into the void.";
        }
        if (ice && !ice.success) {
          line = "The interceptor misses. " + line;
          if (ice.index >= 0 && ice.index < ice.path.length) match.intercept = ice;
        }
        match.log = line;
        const leftKeep = B.hasType(match.left, "keep");
        const rightKeep = B.hasType(match.right, "keep");
        if (!leftKeep || !rightKeep) {
          match.phase = "over";
          match.winner = leftKeep ? "left" : rightKeep ? "right" : "draw";
          match.detail = B.kingLine(match.left, match.right, match.rulers.left);
          match.shot = null;
          return;
        }
        if (match.turn === "left") {
          noteCivilian(match, blast);
          noteOil(match, blast);
        }
        noteReconstruction(match);
        match.shot = null;
        match.phase = "between";
        match.pause = 0.7;
      }
    } else if (match.phase === "between") {
      if (match.pendingCivilian || match.pendingGrant || match.pendingOil) return;
      match.pause -= dt;
      if (match.pause <= 0) {
        match.turn = other(match.turn);
        B.openTurn(match);
      }
    }
  };

  B.playerBuy = function playerBuy(match, kind) {
    if (match.phase !== "aim" || match.turn !== "left") return "Not now.";
    const ruler = match.rulers.left;
    const castle = match.left;
    const b = B.BALANCE;
    const p = match.prices || b;
    if (kind === "ball") {
      if (!B.spend(ruler, p.ballCost)) return "Not enough gold.";
      ruler.balls += 1;
      match.log = "A rocket is ready.";
    } else if (kind === "powder") {
      if (!B.spend(ruler, p.powderCost)) return "Not enough gold.";
      ruler.powder += p.powderPack;
      match.log = "More rocket fuel in store.";
    } else if (kind === "launcher") {
      if (B.hasType(castle, "cannon")) return "The launcher is already standing.";
      if (!B.spend(ruler, p.launcherCost)) return "Not enough gold.";
      if (!B.buyLauncher(castle)) {
        ruler.gold += p.launcherCost;
        return "No room for a launcher.";
      }
      match.log = "A new launcher is ready.";
    } else if (kind === "mobilisation") {
      if (ruler.mobilised) return "Mobilisation can only be used once per turn.";
      if (ruler.population < 1) return "Not enough population.";
      if (!B.hasType(castle, "cannon")) {
        if (!B.buyLauncher(castle)) return "No room for a launcher.";
        spendPopulation(ruler, castle, 1);
        ruler.mobilised = true;
        match.log = "Your people mobilise a new launcher.";
      } else {
        spendPopulation(ruler, castle, 1);
        ruler.balls += 1;
        ruler.mobilised = true;
        match.log = "Your people mobilise a rocket.";
      }
    } else if (kind === "wall") {
      if (match.wallTool) return "Use the putty knife on your castle first.";
      if (!B.spend(ruler, p.wallCost)) return "Not enough gold.";
      match.droneAim = null;
      match.wallTool = { x: null, y: null, onMap: false };
      match.log = "Putty knife ready. Move to the map and click touching your castle.";
    } else if (kind === "tower") {
      if (B.towerCount(castle) >= b.maxMines) return "Three mine towers are enough.";
      if (!B.spend(ruler, p.towerCost)) return "Not enough gold.";
      if (!B.placeMine(castle)) {
        ruler.gold += p.towerCost;
        return "No room for a tower.";
      }
      match.log = "A mine tower stands at the far left.";
    } else if (kind === "patriot") {
      if (B.patriotAlive(castle)) return "The patriot is already standing.";
      if (!B.spend(ruler, p.patriotCost)) return "Not enough gold.";
      if (!B.placePatriot(castle)) {
        ruler.gold += p.patriotCost;
        return "The patriot has nowhere to stand.";
      }
      match.log = "A patriot battery stands by the hill.";
    } else if (kind === "interceptor") {
      if (!B.spend(ruler, p.interceptorCost)) return "Not enough gold.";
      ruler.interceptors += 1;
      match.log = "An air-to-air missile is stored.";
    } else if (kind === "drone") {
      const limit = B.droneFactoryLevel(ruler);
      if (limit < 1) return "Research the drone factory first.";
      const bought = ruler.dronesBought || 0;
      if (bought >= limit) return "The drone factory can build no more this turn.";
      if (!B.spend(ruler, p.droneCost)) return "Not enough gold.";
      ruler.drones += 1;
      ruler.dronesBought = bought + 1;
      const left = limit - ruler.dronesBought;
      match.log = left > 0
        ? "An attack drone is ready. " + left + " more this turn."
        : "An attack drone is ready. The factory is done for this turn.";
    } else if (kind === "nuke") {
      if (match.mode === "free") return "Nuclear rockets are not part of this game.";
      if (!ruler.nuclearProgram) return "Research the nuclear program first.";
      if (!B.spend(ruler, b.nuclearRocketCost)) return "Not enough gold.";
      ruler.nukes = (ruler.nukes || 0) + 1;
      const held = ruler.nukes;
      const noun = held === 1 ? "rocket is" : "rockets are";
      match.log = "A nuclear rocket is stored. " + held + " " + noun + " in the arsenal, and none of them can be fired.";
    }
    refreshPreview(match);
    match.detail = sideStatus(ruler, castle, match.right);
    return null;
  };

  B.useWallTool = function useWallTool(match, x, y) {
    if (!match || match.phase !== "aim" || match.turn !== "left" || !match.wallTool) return "Not now.";
    const plan = B.wallPatchPlan(match.left, x, y);
    if (!plan || !plan.valid) return "New wall must touch your castle.";
    B.placeWallPatch(match.left, x, y);
    match.wallTool = null;
    match.log = "A piece of wall is added to your castle.";
    match.detail = sideStatus(match.rulers.left, match.left, match.right);
    refreshPreview(match);
    return null;
  };

  B.setInterceptTarget = function setInterceptTarget(match, weapon, on) {
    if (!match || match.phase !== "aim" || match.turn !== "left") return "Not now.";
    if (!B.patriotAlive(match.left)) return "The patriot is not standing.";
    const ruler = match.rulers.left;
    const enabled = !!on;
    const drones = weapon === "drone";
    if (drones) ruler.targetDrones = enabled;
    else ruler.targetRockets = enabled;
    const what = drones ? "drones" : "rockets";
    match.log = enabled ? "Air-to-air will target " + what + "." : "Air-to-air will ignore " + what + ".";
    return null;
  };

  B.playerResearch = function playerResearch(match, kind) {
    if (match.phase !== "aim" || match.turn !== "left") return "Not now.";
    const ruler = match.rulers.left;
    const castle = match.left;
    if (kind === "a2a") {
      if (B.a2aMaxed(ruler)) return "Air-to-air efficiency is already at its peak.";
      const cost = B.a2aResearchCost(ruler);
      if (!B.spend(ruler, cost)) return "Not enough gold.";
      ruler.a2aLevel += 1;
      const pct = Math.round(B.interceptOdds(ruler) * 100);
      match.log = "Air-to-air missiles now intercept " + pct + "% of the time.";
    } else if (kind === "fuel") {
      if (B.fuelMaxed(ruler)) return "Rocket fuel capacity is already at its peak.";
      const cost = B.fuelResearchCost();
      if (!B.spend(ruler, cost)) return "Not enough gold.";
      ruler.fuelLevel += 1;
      match.log = "Rocket fuel capacity is now " + B.fuelCapacity(ruler) + ".";
    } else if (kind === "guidance") {
      if (B.guidanceMaxed(ruler)) return "Rocket accuracy is already exact.";
      const cost = B.guidanceResearchCost();
      if (!B.spend(ruler, cost)) return "Not enough gold.";
      ruler.guidanceLevel = B.guidanceLevel(ruler) + 1;
      const spread = B.powderSpread(ruler);
      match.log = spread > 0
        ? "Rocket fuel spread is now ±" + spread + "."
        : "Rocket guidance is now exact.";
      refreshPreview(match);
    } else if (kind === "rocketDamage") {
      if (match.mode !== "free") return "Rocket blast radius is not part of this game.";
      if (B.rocketDamageMaxed(ruler)) return "Rocket blast radius is already at its peak.";
      const cost = B.rocketDamageCost(ruler);
      if (!B.spend(ruler, cost)) return "Not enough gold.";
      ruler.rocketDamageLevel = B.rocketDamageLevel(ruler) + 1;
      match.log = "Rocket blast radius is now level " + ruler.rocketDamageLevel + ". Blasts reach " + B.rocketBlastRadius(ruler) + ".";
    } else if (kind === "drone") {
      if (B.droneFactoryMaxed(ruler)) return "The drone factory is already at its peak.";
      const cost = B.droneFactoryCost();
      if (!B.spend(ruler, cost)) return "Not enough gold.";
      ruler.droneLevel = B.droneFactoryLevel(ruler) + 1;
      const level = ruler.droneLevel;
      const noun = level === 1 ? "drone" : "drones";
      match.log = "Drone factory is level " + level + ". You can buy " + level + " " + noun + " per turn.";
    } else if (kind === "droneRange") {
      if (B.droneFactoryLevel(ruler) < 1) return "Research the drone factory first.";
      if (B.droneRangeMaxed(ruler)) return "Drone range is already at its peak.";
      const cost = B.droneRangeCost();
      if (!B.spend(ruler, cost)) return "Not enough gold.";
      ruler.droneRangeLevel = B.droneRangeLevel(ruler) + 1;
      match.log = "Drone range is now level " + ruler.droneRangeLevel + " (" + B.droneRange(ruler) + " m).";
    } else if (kind === "nuclear") {
      if (match.mode === "free") return "The nuclear program is not part of this game.";
      if (ruler.nuclearProgram) return "The nuclear program is already underway.";
      if (!B.spend(ruler, B.BALANCE.nuclearProgramCost)) return "Not enough gold.";
      ruler.nuclearProgram = true;
      match.log = "The nuclear program is underway. There are still no rockets.";
    }
    match.detail = sideStatus(ruler, castle, match.right);
    return null;
  };

  B.aiAct = function aiAct(match) {
    const ruler = match.rulers.right;
    const ai = match.mode === "free" ? B.FREE_AI : B;
    let notes = match.aiNotes;
    if (!match.aiSpent) {
      match.aiSpent = true;
      notes = ai.thinkEconomy(ruler, match.right);
      match.aiNotes = notes;
    }
    if ((ruler.drones || 0) > 0) {
      const target = ai.chooseDrone(match, "right");
      if (target) {
        const error = B.launchDrone(match, target.x, target.y);
        if (!error) {
          if (notes && notes.length) match.detail = "The enemy " + notes.join(" and ") + ".";
          return null;
        }
      }
    }
    const shot = ai.chooseShot(match, "right");
    if (!shot) {
      B.passTurn(match);
      if (notes && notes.length) match.log = "The enemy " + notes.join(" and ") + ".";
      return null;
    }
    match.right.elevation = shot.angle;
    match.right.powder = shot.powder;
    const error = B.launch(match, shot.angle, shot.powder);
    if (notes && notes.length) match.detail = "The enemy " + notes.join(" and ") + ".";
    return error;
  };
})();
