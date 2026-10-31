(function () {
  const B = (window.Baller = window.Baller || {});

  B.shotSpeed = function shotSpeed(powder) {
    const b = B.BALANCE;
    return b.speedBase + powder * b.speedPerPowder;
  };

  B.fly = function fly(match, side, elevation, powder, record) {
    const b = B.BALANCE;
    const castle = match[side];
    const origin = B.muzzle(castle);
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
        const castles = [match.left, match.right];
        for (const target of castles) {
          if (target.side === side && i < 18) continue;
          let struck = null;
          let struckDist = Infinity;
          for (const block of target.blocks) {
            const dist = B.solidDistance(x, y, b.ballRadius, block, target);
            if (dist < struckDist) {
              struckDist = dist;
              struck = block;
            }
          }
          if (struck) return { path, hit: { type: "block", castle: target, block: struck, x, y } };
        }
        if (y >= match.terrain.yAt(x)) {
          return { path, hit: { type: "ground", x, y: match.terrain.yAt(x) } };
        }
      }
    }
    return { path, hit: { type: "miss", x, y } };
  };
})();
