(function () {
  const B = (window.Baller = window.Baller || {});

  B.shotSpeed = function shotSpeed(powder) {
    const b = B.BALANCE;
    return b.speedBase + powder * b.speedPerPowder;
  };

  const COLLIDE_BIN = 64;
  const COLLIDE_PAD = 80;

  function collisionStamp(match) {
    return match.left.elevation + ":" + (match.left._geom || 0) + ":" + match.right.elevation + ":" + (match.right._geom || 0);
  }

  function colliderIndex(match) {
    const stamp = collisionStamp(match);
    if (match._collideBins && match._collideStamp === stamp) return match._collideBins;
    const b = B.BALANCE;
    const radius = b.ballRadius;
    const count = Math.ceil((b.viewW + COLLIDE_PAD * 2) / COLLIDE_BIN) + 1;
    const bins = new Array(count);
    for (let i = 0; i < count; i++) bins[i] = [];
    for (const castle of [match.left, match.right]) {
      const parts = castle.blocks.concat(castle.houses);
      if (castle.patriot && castle.patriot.type === "patriot") parts.push(castle.patriot);
      for (const block of parts) {
        if (block.type === "gap") continue;
        if (block.live && !B.hasCells(block.live)) continue;
        B.solidMask(block, castle);
        const box = block._bounds;
        if (!box) continue;
        const item = {
          block,
          castle,
          house: block.type === "house",
          minX: box.minX,
          minY: box.minY,
          maxX: box.maxX,
          maxY: box.maxY,
        };
        const i0 = Math.max(0, Math.floor((box.minX - radius + COLLIDE_PAD) / COLLIDE_BIN));
        const i1 = Math.min(count - 1, Math.floor((box.maxX + radius + COLLIDE_PAD) / COLLIDE_BIN));
        for (let i = i0; i <= i1; i++) bins[i].push(item);
      }
    }
    match._collideBins = bins;
    match._collideStamp = stamp;
    return bins;
  }

  function strikeBlock(match, side, step, x, y, bins) {
    const radius = B.BALANCE.ballRadius;
    const bin = Math.floor((x + COLLIDE_PAD) / COLLIDE_BIN);
    const list = bins[bin];
    if (!list) return null;
    let struck = null;
    let struckDist = Infinity;
    const ownEarly = step < 18;
    for (let n = 0; n < list.length; n++) {
      const item = list[n];
      if (ownEarly && item.castle.side === side && !item.house) continue;
      if (x + radius < item.minX || x - radius > item.maxX || y + radius < item.minY || y - radius > item.maxY) continue;
      const dist = B.solidDistance(x, y, radius, item.block, item.castle);
      if (dist < struckDist) {
        struckDist = dist;
        struck = item;
      }
    }
    if (!struck) return null;
    return { type: "block", castle: struck.castle, block: struck.block, x, y };
  }

  B.fly = function fly(match, side, elevation, powder, record) {
    const b = B.BALANCE;
    const castle = match[side];
    const origin = B.muzzle(castle, elevation);
    if (!origin) return { path: [], hit: { type: "none" } };
    const elev = (elevation * Math.PI) / 180;
    const dir = side === "left" ? 1 : -1;
    const speed = B.shotSpeed(powder);
    let x = origin.x;
    let y = origin.y;
    let vx = dir * Math.cos(elev) * speed;
    let vy = -Math.sin(elev) * speed;
    const path = [];
    const dt = 1 / 60;
    const steps = 60 * 7;
    const bins = colliderIndex(match);
    for (let i = 0; i < steps; i++) {
      vx += match.wind * dt;
      vy += b.gravity * dt;
      x += vx * dt;
      y += vy * dt;
      if (record) path.push({ x, y });
      if (x < -60 || x > b.viewW + 60 || y > b.viewH + 40) {
        return { path, hit: { type: "miss", x, y } };
      }
      if (i > 4) {
        const struck = strikeBlock(match, side, i, x, y, bins);
        if (struck) return { path, hit: struck };
        if (y >= match.terrain.yAt(x)) {
          return { path, hit: { type: "ground", x, y: match.terrain.yAt(x) } };
        }
      }
    }
    return { path, hit: { type: "miss", x, y } };
  };

  B.droneHome = function droneHome(castle) {
    const b = B.BALANCE;
    let top = castle.padY || b.viewH - b.ground;
    const blocks = castle.blocks || [];
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (!block || block.type === "gap") continue;
      if (block.live && !B.hasCells(block.live)) continue;
      const blockTop = block._bounds ? block._bounds.minY : block.y;
      if (blockTop < top) top = blockTop;
    }
    return {
      x: castle.originX + (b.cols * b.block) / 2,
      y: Math.max(36, top - b.droneClearance),
    };
  };

  function droneCurve(start, dx, dy, u) {
    const b = B.BALANCE;
    const straight = b.droneStraight == null ? 0.55 : b.droneStraight;
    let v = 0;
    if (u > straight) {
      const s = (u - straight) / (1 - straight);
      v = s * s * (0.35 + 0.65 * s);
    }
    return {
      x: start.x + dx * u,
      y: start.y + dy * v,
    };
  }

  B.droneInRange = function droneInRange(match, side, targetX) {
    const start = B.droneHome(match[side]);
    const ruler = match.rulers && match.rulers[side];
    return Math.abs(targetX - start.x) <= B.droneRange(ruler);
  };

  // A guided drone flies straight at first, then curves down into its target
  // and detonates on the first thing it meets.
  B.flyDrone = function flyDrone(match, side, targetX, targetY) {
    const b = B.BALANCE;
    const start = B.droneHome(match[side]);
    const dx = targetX - start.x;
    const dy = targetY - start.y;
    const step = b.droneStep;
    const samples = Math.max(32, Math.ceil((Math.abs(dx) + Math.abs(dy)) / 3));
    const xs = new Array(samples + 1);
    const ys = new Array(samples + 1);
    const lens = new Array(samples + 1);
    xs[0] = start.x;
    ys[0] = start.y;
    lens[0] = 0;
    for (let i = 1; i <= samples; i++) {
      const p = droneCurve(start, dx, dy, i / samples);
      xs[i] = p.x;
      ys[i] = p.y;
      lens[i] = lens[i - 1] + Math.hypot(p.x - xs[i - 1], p.y - ys[i - 1]);
    }
    const total = lens[samples];
    const steps = Math.max(1, Math.ceil(total / step));
    const path = [{ x: start.x, y: start.y }];
    const bins = colliderIndex(match);
    let cursor = 0;
    for (let i = 1; i <= steps; i++) {
      const targetLen = (total * i) / steps;
      while (cursor < samples - 1 && lens[cursor + 1] < targetLen) cursor++;
      const seg = lens[cursor + 1] - lens[cursor];
      const frac = seg > 0 ? (targetLen - lens[cursor]) / seg : 0;
      const x = xs[cursor] + (xs[cursor + 1] - xs[cursor]) * frac;
      const y = ys[cursor] + (ys[cursor + 1] - ys[cursor]) * frac;
      const ground = match.terrain.yAt(x);
      if (y >= ground) {
        path.push({ x: x, y: ground });
        return { path: path, hit: { type: "ground", x: x, y: ground } };
      }
      // Past the muzzle grace, so a drone can strike its own castle.
      const struck = strikeBlock(match, side, 99, x, y, bins);
      if (struck) {
        path.push({ x: x, y: y });
        return { path: path, hit: struck };
      }
      path.push({ x: x, y: y });
      if (x < -60 || x > b.viewW + 60 || y > b.viewH + 40 || y < -80) {
        return { path: path, hit: { type: "miss", x: x, y: y } };
      }
    }
    return { path: path, hit: { type: "target", x: targetX, y: targetY } };
  };
})();
