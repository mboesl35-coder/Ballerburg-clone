(function () {
  const B = (window.Baller = window.Baller || {});

  function other(side) {
    return side === "left" ? "right" : "left";
  }

  B.createMatch = function createMatch(mapId) {
    const terrain = B.createTerrain(mapId);
    const left = B.createCastle("left");
    const right = B.createCastle("right");
    left.terrain = terrain;
    right.terrain = terrain;
    B.layoutCastle(left, terrain);
    B.layoutCastle(right, terrain);
    const match = {
      terrain,
      left,
      right,
      rulers: { left: B.createRuler(), right: B.createRuler() },
      turn: "left",
      phase: "aim",
      wind: Math.round((Math.random() * 2 - 1) * B.BALANCE.windMax * 0.6),
      shot: null,
      preview: [],
      fx: [],
      pause: 0,
      log: "",
      detail: "",
      report: null,
      winner: null,
    };
    return match;
  };

  function refreshPreview(match) {
    if (match.turn !== "left" || match.phase !== "aim") {
      match.preview = [];
      return;
    }
    const ruler = match.rulers.left;
    const castle = match.left;
    if (!B.hasType(castle, "cannon") || ruler.powder < castle.powder || ruler.balls < 1) {
      match.preview = [];
      return;
    }
    match.preview = B.fly(match, "left", castle.elevation, castle.powder, true).path;
  }

  B.syncAim = function syncAim(match) {
    refreshPreview(match);
  };

  function emitExhaust(match, path, index) {
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
      color: hot < 0.28 ? "#fff4c2" : hot < 0.62 ? "#ffb03a" : "#ff4d12",
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
      color: Math.random() < 0.5 ? "#c4beb4" : "#7a746c",
    });
  }

  function explode(match, x, y, debris) {
    match.fx.push({ kind: "flash", x: x, y: y, life: 1, fade: 2.4, size: 16, grow: 150, color: "#fff8e0" });
    match.fx.push({ kind: "ring", x: x, y: y, life: 1, fade: 1.8, size: 8, grow: 130, color: "#ffe7a0" });
    match.fx.push({ kind: "ring", x: x, y: y, life: 1, fade: 1.35, size: 5, grow: 78, color: "#ff8a1e" });
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
  }

  B.openTurn = function openTurn(match) {
    const b = B.BALANCE;
    match.wind = Math.max(-b.windMax, Math.min(b.windMax, match.wind + (Math.random() * 2 - 1) * b.windJitter));
    const side = match.turn;
    const ruler = match.rulers[side];
    const castle = match[side];
    const report = B.beginEconomy(ruler, B.towerCount(castle));
    match.report = report;
    const who = side === "left" ? "Your turn" : "Enemy";
    match.log = who + ". Income " + report.income + ", food " + report.foodBill + (report.interest ? ", interest " + report.interest : "") + ".";
    match.detail = B.moodLine(ruler) + " " + B.kingLine(castle, match[other(side)], ruler);
    match.phase = "aim";
    refreshPreview(match);
  };

  B.launch = function launch(match, elevation, powder) {
    const side = match.turn;
    const ruler = match.rulers[side];
    const castle = match[side];
    const b = B.BALANCE;
    if (match.phase !== "aim") return "A shot is already in flight.";
    if (!B.hasType(castle, "cannon")) return "The launcher is destroyed.";
    if (ruler.balls < 1) return "No rockets left.";
    if (powder < b.powderMin || ruler.powder < powder) return "Not enough rocket fuel.";
    castle.elevation = elevation;
    castle.powder = powder;
    ruler.powder -= powder;
    ruler.balls -= 1;
    const flown = B.fly(match, side, elevation, powder, true);
    match.shot = { path: flown.path, hit: flown.hit, index: 0, emitted: 0 };
    match.preview = [];
    match.phase = "fly";
    match.log = side === "left" ? "Your rocket is in flight." : "The enemy fires.";
    return null;
  };

  B.passTurn = function passTurn(match) {
    if (match.phase !== "aim") return;
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

  function describeBlast(blast, hit) {
    const king = sideLine(blast.keeps, "The rocket kills your king.", "The rocket kills the enemy king.", "The rocket kills both kings.");
    if (king) return king;
    const cannon = sideLine(blast.cannons, "The rocket hits your launcher.", "The rocket hits the enemy launcher.", "The rocket hits both launchers.");
    if (cannon) return cannon;
    const tower = sideLine(blast.towers, "The rocket hits your mine tower.", "The rocket hits the enemy mine tower.", "The rocket hits both mine towers.");
    if (tower) return tower;
    const wall = sideLine(blast.walls, "The rocket hits your wall.", "The rocket hits the enemy wall.", "The rocket hits both walls.");
    if (wall) return wall;
    if (hit.type === "ground") return "The rocket hits the hillside.";
    return "The rocket flies into the void.";
  }

  B.advance = function advance(match, dt) {
    for (const bit of match.fx) {
      bit.life -= dt * (bit.fade == null ? 1.4 : bit.fade);
      bit.x += (bit.vx || 0) * dt;
      bit.y += (bit.vy || 0) * dt;
      if (bit.vy != null) bit.vy += (bit.grav == null ? 180 : bit.grav) * dt;
      if (bit.grow) bit.size += bit.grow * dt;
    }
    match.fx = match.fx.filter((bit) => bit.life > 0);

    if (match.phase === "fly" && match.shot) {
      const shot = match.shot;
      const path = shot.path;
      shot.index += dt * 120;
      if (path.length) {
        if (shot.emitted == null) shot.emitted = 0;
        const end = Math.min(path.length - 1, Math.floor(shot.index));
        for (let i = shot.emitted; i <= end; i++) emitExhaust(match, path, i);
        shot.emitted = end + 1;
      }
      if (shot.index >= path.length) {
        const hit = shot.hit;
        if (hit.type === "block" || hit.type === "ground") {
          const blast = B.applyBlast(match, hit.x, hit.y);
          const debris = blast.keeps.length ? "gold" : hit.type === "ground" ? "ground" : false;
          explode(match, hit.x, hit.y, debris);
          match.log = describeBlast(blast, hit);
        } else {
          match.log = "The rocket flies into the void.";
        }
        const leftKeep = B.hasType(match.left, "keep");
        const rightKeep = B.hasType(match.right, "keep");
        if (!leftKeep || !rightKeep) {
          match.phase = "over";
          match.winner = leftKeep ? "left" : rightKeep ? "right" : "draw";
          match.detail = B.kingLine(match.left, match.right, match.rulers.left);
          match.shot = null;
          return;
        }
        match.shot = null;
        match.phase = "between";
        match.pause = 0.7;
      }
    } else if (match.phase === "between") {
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
    if (kind === "ball") {
      if (!B.spend(ruler, b.ballCost)) return "Not enough gold.";
      ruler.balls += 1;
      match.log = "A rocket is ready.";
    } else if (kind === "powder") {
      if (!B.spend(ruler, b.powderCost)) return "Not enough gold.";
      ruler.powder += b.powderPack;
      match.log = "More rocket fuel in store.";
    } else if (kind === "launcher") {
      if (B.hasType(castle, "cannon")) return "The launcher is already standing.";
      if (!B.spend(ruler, b.launcherCost)) return "Not enough gold.";
      if (!B.buyLauncher(castle)) {
        ruler.gold += b.launcherCost;
        return "No room for a launcher.";
      }
      match.log = "A new launcher is ready.";
    } else if (kind === "wall") {
      if (!B.spend(ruler, b.wallCost)) return "Not enough gold.";
      if (!B.buildOnCastle(castle, "wall")) {
        ruler.gold += b.wallCost;
        return "No room for a wall.";
      }
      match.log = "A wall is raised.";
    } else if (kind === "tower") {
      if (!B.spend(ruler, b.towerCost)) return "Not enough gold.";
      if (!B.buildOnCastle(castle, "tower")) {
        ruler.gold += b.towerCost;
        return "No room for a tower.";
      }
      match.log = "The mine tower pays gold from the next turn.";
    } else if (kind === "borrow") {
      if (ruler.debt + b.borrowAmount > b.maxDebt) return "Nobody will take on more debt.";
      ruler.debt += b.borrowAmount;
      ruler.gold += b.borrowAmount;
      match.log = "You borrow " + b.borrowAmount + " gold.";
    } else if (kind === "repay") {
      const pay = Math.min(b.borrowAmount, ruler.debt);
      if (pay <= 0) return "No debt.";
      if (!B.spend(ruler, pay)) return "Not enough gold.";
      ruler.debt -= pay;
      match.log = "You repay " + pay + " gold.";
    }
    refreshPreview(match);
    match.detail = B.moodLine(ruler) + " " + B.kingLine(castle, match.right, ruler);
    return null;
  };

  B.aiAct = function aiAct(match) {
    const notes = B.thinkEconomy(match.rulers.right, match.right);
    const shot = B.chooseShot(match, "right");
    if (!shot) {
      B.passTurn(match);
      if (notes.length) match.log = "The enemy " + notes.join(" and ") + ".";
      return null;
    }
    match.right.elevation = shot.angle;
    match.right.powder = shot.powder;
    const error = B.launch(match, shot.angle, shot.powder);
    if (notes.length) match.detail = "The enemy " + notes.join(" and ") + ".";
    return error;
  };
})();
