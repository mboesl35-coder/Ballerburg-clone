(function () {
  const B = (window.Baller = window.Baller || {});

  B.MAPS = [
    { id: "tal", name: "Green Valley", hill: 78, leftY: 452, rightY: 452 },
  ];

  // The original 960px map placed each castle 46px from the outer edge, so the
  // hill between the two pads was 960 - 2 * (46 + 7 * 28) = 476px. That hill
  // stays this wide. The wider map is extra plain on either side.
  const HILL_WIDTH = 476;

  B.createTerrain = function createTerrain(mapId) {
    const b = B.BALANCE;
    const spec = B.MAPS.find((map) => map.id === mapId) || B.MAPS[0];
    const span = b.cols * b.block;
    const plainW = (b.viewW - HILL_WIDTH) / 2;
    const valleyStart = plainW;
    const valleyEnd = plainW + HILL_WIDTH;
    const leftX = (plainW - span) / 2;
    const rightX = valleyEnd + (plainW - span) / 2;
    const craters = [];

    function baseY(x) {
      if (x <= valleyStart) return spec.leftY;
      if (x >= valleyEnd) return spec.rightY;
      const t = (x - valleyStart) / (valleyEnd - valleyStart);
      return spec.leftY + (spec.rightY - spec.leftY) * t - Math.sin(t * Math.PI) * spec.hill;
    }

    const terrain = {
      id: spec.id,
      name: spec.name,
      leftX,
      rightX,
      span,
      leftY: spec.leftY,
      rightY: spec.rightY,
      craters,
      padY(side) {
        return side === "left" ? spec.leftY : spec.rightY;
      },
      valleyStart,
      valleyEnd,
      yAt(x) {
        let y = baseY(x);
        for (let i = 0; i < craters.length; i++) {
          const crater = craters[i];
          const dx = x - crater.x;
          if (dx < -crater.r || dx > crater.r) continue;
          const reach = crater.r * crater.r - dx * dx;
          if (reach <= 0) continue;
          const bottom = crater.y + Math.sqrt(reach);
          if (bottom > y) y = bottom;
        }
        return y;
      },
      scoop(x, y, radius) {
        craters.push({ x, y, r: radius || b.blastRadius });
      },
    };
    return terrain;
  };
})();
