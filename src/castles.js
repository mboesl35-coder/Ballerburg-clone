(function () {
  const B = (window.Baller = window.Baller || {});

  // Rows grow upward. A square block: the king is the center entrance.
  // The launcher is an extra slot, set in front of the face toward the enemy.
  const TEMPLATE = [
    ["wall", "wall", "wall", "wall", "wall", "wall"],
    ["wall", "wall", "wall", "wall", "wall", "wall"],
    ["wall", "wall", "wall", "wall", "wall", "wall"],
    ["keep", "wall", "wall", "wall", "wall", "wall"],
    ["wall", "wall", "wall", "wall", "wall", "wall"],
    ["wall", "wall", "wall", "wall", "wall", "wall"],
    ["wall", "wall", "wall", "wall", "wall", "wall"],
    ["cannon"],
  ];

  // Right-hand skyline: corner tents, a taller clock tower, low curtain walls.
  // The launcher and the king are extra slots. Layout parks the launcher in
  // front of the wall and the king in a bunker under the clock tower.
  const KREMLIN = [
    ["wall", "wall", "wall", "wall"],
    ["wall", "wall"],
    ["wall", "wall"],
    ["wall", "wall", "wall", "wall", "wall"],
    ["wall", "wall"],
    ["wall", "wall"],
    ["wall", "wall", "wall", "wall"],
    ["cannon"],
    ["keep"],
  ];

  const LAUNCH_GAP = 34;
  const BURY = 30;

  function copyTemplate() {
    return TEMPLATE.map((col) => col.slice());
  }

  B.createCastle = function createCastle(side) {
    const kremlin = side === "right";
    const columns = kremlin ? KREMLIN.map((col) => col.slice()) : copyTemplate();
    const castle = {
      side,
      style: kremlin ? "kremlin" : "stone",
      columns,
      foundation: columns.map((col) => col.slice()),
      blocks: [],
      elevation: 48,
      powder: B.BALANCE.powderReach,
      kremlinTowers: kremlin ? { 0: "corner", 3: "great", 6: "corner" } : null,
    };
    B.layoutCastle(castle, null);
    return castle;
  };

  function cloneCells(cells) {
    if (!cells) return null;
    const copy = {};
    for (const key in cells) copy[key] = 1;
    return copy;
  }

  function hasCells(cells) {
    if (!cells) return false;
    for (const key in cells) return true;
    return false;
  }

  B.hasCells = hasCells;

  function coversBelow(block) {
    if (block.type === "gap") return false;
    if (block.live && !hasCells(block.live)) return false;
    return true;
  }

  function markCovered(blocks) {
    const covers = new Set();
    for (const block of blocks) {
      if (coversBelow(block)) covers.add(block.c + "," + block.r);
    }
    for (const block of blocks) {
      const covered = covers.has(block.c + "," + (block.r + 1));
      if (block.covered !== covered) {
        block.covered = covered;
        block._mask = null;
      }
    }
  }

  B.layoutCastle = function layoutCastle(castle, terrain) {
    const b = B.BALANCE;
    const padY = terrain ? terrain.padY(castle.side) : b.viewH - 80;
    const originX = terrain
      ? (castle.side === "left" ? terrain.leftX : terrain.rightX)
      : 0;
    castle.originX = originX;
    castle.padY = padY;
    if (terrain) castle.terrain = terrain;
    const saved = {};
    for (const block of castle.blocks) {
      saved[block.c + "," + block.r] = {
        type: block.type,
        live: cloneCells(block.live),
        base: cloneCells(block.base),
      };
    }
    const blocks = [];
    for (let c = 0; c < castle.columns.length; c++) {
      const col = castle.columns[c];
      for (let r = 0; r < col.length; r++) {
        const type = col[r];
        if (!type) continue;
        let x = originX + c * b.block;
        let y = padY - (r + 1) * b.block;
        if (type === "cannon" && castle.style === "kremlin") {
          x = originX - b.block - LAUNCH_GAP;
          y = padY - b.block;
        } else if (type === "cannon" && castle.style === "stone") {
          x = originX + b.cols * b.block + LAUNCH_GAP;
          y = padY - b.block;
        } else if (castle.style === "kremlin" && type === "keep") {
          x = originX + 3 * b.block;
          y = padY + BURY;
        }
        const block = {
          c,
          r,
          type,
          x,
          y,
          w: b.block,
          h: b.block,
        };
        const prev = saved[c + "," + r];
        if (prev && prev.type === type && prev.live) {
          block.live = prev.live;
          block.base = prev.base;
        }
        blocks.push(block);
      }
    }
    markCovered(blocks);
    castle.blocks = blocks;
  };

  // Shared by the barrel drawing and the muzzle so the ball leaves the muzzle.
  B.cannonLocal = function cannonLocal(block, castle) {
    const dir = castle.side === "left" ? 1 : -1;
    return {
      dir,
      elev: (castle.elevation * Math.PI) / 180,
      cx: dir === 1 ? block.w - 4 : 4,
      cy: block.h * 0.38,
      len: 36,
    };
  };

  B.muzzle = function muzzle(castle) {
    const cannon = castle.blocks.find((block) => block.type === "cannon");
    if (!cannon) return null;
    const pose = B.cannonLocal(cannon, castle);
    return {
      x: cannon.x + pose.cx + pose.dir * Math.cos(pose.elev) * (pose.len + 2),
      y: cannon.y + pose.cy - Math.sin(pose.elev) * (pose.len + 2),
      cx: cannon.x + pose.cx,
      cy: cannon.y + pose.cy,
    };
  };

  B.hasType = function hasType(castle, type) {
    return castle.blocks.some((block) => block.type === type);
  };

  B.towerCount = function towerCount(castle) {
    return castle.blocks.filter((block) => block.type === "tower").length;
  };

  B.stoneCount = function stoneCount(castle) {
    let count = 0;
    for (const block of castle.blocks) {
      if (block.type === "gap") continue;
      if (B.solidMask) B.solidMask(block, castle);
      if (!block.live) continue;
      for (const key in block.live) count += 1;
    }
    return count;
  };

  function note(list, side) {
    if (list.indexOf(side) < 0) list.push(side);
  }

  B.applyBlast = function applyBlast(match, x, y) {
    const radius = B.BALANCE.blastRadius;
    const report = { keeps: [], cannons: [], towers: [], walls: [] };
    for (const castle of [match.left, match.right]) {
      let coverDirty = false;
      for (const block of castle.blocks) {
        if (block.type === "gap") continue;
        B.solidMask(block, castle);
        if (!hasCells(block.live)) continue;
        const vital = block.type === "keep" || block.type === "cannon" || block.type === "tower";
        if (vital) {
          if (!B.diskTouchesBlock(block, x, y, radius)) continue;
          if (block.type === "keep") note(report.keeps, castle.side);
          else if (block.type === "cannon") note(report.cannons, castle.side);
          else note(report.towers, castle.side);
          block.live = {};
          block.base = {};
          block._mask = null;
          castle.columns[block.c][block.r] = "gap";
          block.type = "gap";
          coverDirty = true;
        } else if (B.carveBlock(block, x, y, radius)) {
          note(report.walls, castle.side);
          if (!hasCells(block.live)) coverDirty = true;
        }
      }
      if (coverDirty) markCovered(castle.blocks);
    }
    match.terrain.scoop(x, y, radius);
    return report;
  };

  B.buyLauncher = function buyLauncher(castle) {
    if (B.hasType(castle, "cannon")) return false;
    const spot = castle.foundation.flatMap((col, c) => col.map((type, r) => ({ c, r, type }))).find((cell) => cell.type === "cannon");
    if (!spot) return false;
    const col = castle.columns[spot.c];
    while (col.length <= spot.r) col.push("gap");
    col[spot.r] = "cannon";
    B.layoutCastle(castle, castle.terrain);
    return true;
  };

  B.buildOnCastle = function buildOnCastle(castle, type) {
    const b = B.BALANCE;
    const inner = castle.side === "left" ? b.cols - 1 : 0;
    const order = [];
    for (let i = 0; i < b.cols; i++) order.push(castle.side === "left" ? inner - i : inner + i);
    const preferred = type === "tower" ? order.slice().reverse() : order;
    for (const c of preferred) {
      const col = castle.columns[c];
      if (!col.length || col.length >= b.maxRow) continue;
      if (type === "tower" && col.includes("tower")) continue;
      col.push(type);
      B.layoutCastle(castle, castle.terrain);
      return true;
    }
    return false;
  };
})();
