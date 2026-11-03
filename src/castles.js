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
  // front of the wall and the king in a chamber under the clock tower.
  // A shaft, drawn with the chamber, runs from that room up into the tower.
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

  // The enemy chamber keeps the old clearance under its floor. Deeper ground
  // therefore drops the keep by the same amount, and the shaft spans the gap.
  B.BUNKER = {
    earthUnder: 22,
    chamberFoot: 8,
    chamberHead: 16,
    chamberSide: 30,
    shaftW: 24,
  };

  // Launcher box on the near slope of the middle hill. Tubes point at the enemy.
  B.PATRIOT = {
    w: 100,
    h: 56,
    pivotX: 46,
    pivotY: 30,
    tube: 42,
    elev: 50,
  };

  function copyTemplate() {
    return TEMPLATE.map((col) => col.slice());
  }

  B.createCastle = function createCastle(side, opts) {
    opts = opts || {};
    const kremlin = opts.style ? opts.style === "kremlin" : side === "right";
    const columns = kremlin ? KREMLIN.map((col) => col.slice()) : copyTemplate();
    const castle = {
      side,
      style: kremlin ? "kremlin" : "stone",
      brick: kremlin ? (opts.brick || "red") : null,
      gateCol: kremlin ? (side === "left" ? 6 : 0) : null,
      columns,
      foundation: columns.map((col) => col.slice()),
      blocks: [],
      elevation: 48,
      powder: B.BALANCE.powderBase,
      kremlinTowers: kremlin ? { 0: "corner", 3: "great", 6: "corner" } : null,
      houses: [],
      mines: [],
      rigs: [],
      extraWalls: [],
      parcels: { front: [], behind: [] },
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
    castle._geom = (castle._geom || 0) + 1;
    const b = B.BALANCE;
    const padY = terrain ? terrain.padY(castle.side) : b.viewH - b.ground;
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
        if (type === "cannon") {
          x = castle.side === "left"
            ? originX + b.cols * b.block + LAUNCH_GAP
            : originX - b.block - LAUNCH_GAP;
          y = padY - b.block;
        } else if (castle.style === "kremlin" && type === "keep") {
          const bunker = B.BUNKER;
          x = originX + 3 * b.block;
          y = padY + b.ground - bunker.earthUnder - bunker.chamberFoot - b.block;
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
    if (castle.mines) {
      for (let i = 0; i < castle.mines.length; i++) {
        const mine = castle.mines[i];
        if (mine.type === "tower") blocks.push(mine);
      }
    }
    if (castle.rigs) {
      for (let i = 0; i < castle.rigs.length; i++) {
        const rig = castle.rigs[i];
        if (rig.type === "rig") blocks.push(rig);
      }
    }
    if (castle.extraWalls) {
      for (let i = 0; i < castle.extraWalls.length; i++) {
        const wall = castle.extraWalls[i];
        if (wall.type === "wall") {
          wall.x = originX + wall.c * b.block;
          wall.y = padY - (wall.r + 1) * b.block;
          blocks.push(wall);
        }
      }
    }
    markCovered(blocks);
    castle.blocks = blocks;
  };

  // Slots count outward from the castle. 0 is the parcel nearest the walls.
  // The launcher sits in front, so front parcels begin just past it.
  // The first freeParcels slots on each flank stay empty for later buildings.
  const HOUSE_SLOTS = {
    left: { behind: [5, 7, 9, 12, 16, 21], front: [6, 10, 15] },
    right: { behind: [7, 11, 14, 19], front: [5, 7, 11, 14, 19] },
  };

  B.FREE_HOUSE_SLOTS = {
    behind: HOUSE_SLOTS.right.behind.slice(),
    front: HOUSE_SLOTS.right.front.slice(),
  };

  function flankParcels(side, terrain) {
    const b = B.BALANCE;
    const span = b.cols * b.block;
    const origin = side === "left" ? terrain.leftX : terrain.rightX;
    const behind = [];
    const front = [];
    if (side === "left") {
      for (let x = origin - b.block; x >= 0; x -= b.block) behind.push(x);
      const pastLauncher = origin + span + LAUNCH_GAP + b.block;
      for (let x = pastLauncher; x + b.block <= terrain.valleyStart; x += b.block) front.push(x);
    } else {
      for (let x = origin + span; x + b.block <= b.viewW; x += b.block) behind.push(x);
      const beforeLauncher = origin - b.block - LAUNCH_GAP - b.block;
      for (let x = beforeLauncher; x >= terrain.valleyEnd; x -= b.block) front.push(x);
    }
    return { behind, front };
  }

  B.placeHouses = function placeHouses(castle, slots) {
    const b = B.BALANCE;
    const terrain = castle.terrain;
    const parcels = flankParcels(castle.side, terrain);
    castle.parcels = parcels;
    const plan = slots || HOUSE_SLOTS[castle.side];
    const houses = [];
    for (const flank of ["behind", "front"]) {
      for (const slot of plan[flank]) {
        if (slot < b.freeParcels) continue;
        const parcelX = parcels[flank][slot];
        if (parcelX == null) continue;
        const outward = (castle.side === "left" && flank === "behind") || (castle.side === "right" && flank === "front");
        const x = outward ? parcelX + b.block - b.houseW : parcelX;
        const ground = terrain.yAt(x + b.houseW / 2);
        houses.push({
          type: "house",
          x,
          y: ground - b.houseH,
          w: b.houseW,
          h: b.houseH,
          flank,
          slot,
          hits: 0,
          pop: b.houseHits * b.popPerHit,
        });
      }
    }
    castle.houses = houses;
  };

  // Structures are new again. Occupants stay in the house they already occupy.
  B.rebuildHouses = function rebuildHouses(castle) {
    const houses = castle && castle.houses;
    if (!houses) return;
    for (let i = 0; i < houses.length; i++) {
      const house = houses[i];
      house.type = "house";
      house.hits = 0;
      house.live = null;
      house.base = null;
      house._mask = null;
      house._bounds = null;
      if (house.pop == null) house.pop = 0;
    }
    castle._geom = (castle._geom || 0) + 1;
  };

  // Shared by the barrel drawing and the muzzle so the ball leaves the muzzle.
  B.cannonLocal = function cannonLocal(block, castle, elevation) {
    const dir = castle.side === "left" ? 1 : -1;
    const deg = elevation != null ? elevation : castle.elevation;
    return {
      dir,
      elev: (deg * Math.PI) / 180,
      cx: dir === 1 ? block.w - 4 : 4,
      cy: block.h * 0.38,
      len: 36,
    };
  };

  B.patriotAlive = function patriotAlive(castle) {
    return !!(castle && castle.patriot && castle.patriot.type === "patriot");
  };

  B.patriotSite = function patriotSite(side, terrain) {
    const g = B.PATRIOT;
    const mid = (terrain.valleyStart + terrain.valleyEnd) / 2;
    const gap = 18;
    const x = side === "left" ? mid - gap - g.w : mid + gap;
    const planted = side === "left" ? x + 16 : x + g.w - 16;
    return { x: x, planted: planted, w: g.w, h: g.h };
  };

  B.placePatriot = function placePatriot(castle) {
    if (B.patriotAlive(castle)) return false;
    const terrain = castle.terrain;
    if (!terrain) return false;
    const site = B.patriotSite(castle.side, terrain);
    const ground = terrain.yAt(site.planted);
    castle.patriot = {
      type: "patriot",
      side: castle.side,
      x: site.x,
      y: ground - site.h + 2,
      w: site.w,
      h: site.h,
      c: 0,
      r: 0,
    };
    castle._geom = (castle._geom || 0) + 1;
    return true;
  };

  B.patriotMuzzle = function patriotMuzzle(patriot) {
    const g = B.PATRIOT;
    const elev = (g.elev * Math.PI) / 180;
    const dir = patriot.side === "left" ? 1 : -1;
    const pivotX = dir === 1 ? g.pivotX : g.w - g.pivotX;
    const reach = g.tube + 3;
    return {
      x: patriot.x + pivotX + dir * Math.cos(elev) * reach,
      y: patriot.y + g.pivotY - Math.sin(elev) * reach,
      dir: dir,
      elev: elev,
    };
  };

  B.muzzle = function muzzle(castle, elevation) {
    const cannon = castle.blocks.find((block) => block.type === "cannon");
    if (!cannon) return null;
    const pose = B.cannonLocal(cannon, castle, elevation);
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

  B.oilCount = function oilCount(castle) {
    const rigs = castle && castle.rigs;
    if (!rigs) return 0;
    let count = 0;
    for (let i = 0; i < rigs.length; i++) {
      if (rigs[i].type === "rig") count += 1;
    }
    return count;
  };

  B.stoneCount = function stoneCount(castle) {
    let count = 0;
    for (const block of castle.blocks) {
      if (block.type === "gap" || block.oil) continue;
      if (B.solidMask) B.solidMask(block, castle);
      if (!block.live) continue;
      for (const key in block.live) count += 1;
    }
    return count;
  };

  function note(list, side) {
    if (list.indexOf(side) < 0) list.push(side);
  }

  B.applyBlast = function applyBlast(match, x, y, radius) {
    if (radius == null) radius = B.BALANCE.blastRadius;
    const report = { keeps: [], cannons: [], towers: [], rigs: [], rigLoss: { left: 0, right: 0 }, walls: [], patriots: [], houseLoss: { left: 0, right: 0 }, houseGone: { left: 0, right: 0 }, popLost: { left: 0, right: 0 }, popHomes: { left: 0, right: 0 } };
    for (const castle of [match.left, match.right]) {
      castle._geom = (castle._geom || 0) + 1;
      let coverDirty = false;
      for (const block of castle.blocks) {
        if (block.type === "gap") continue;
        B.solidMask(block, castle);
        if (!hasCells(block.live)) continue;
        const vital = block.type === "keep" || block.type === "cannon" || block.type === "tower" || block.type === "rig";
        if (vital) {
          if (!B.diskTouchesBlock(block, x, y, radius)) continue;
          if (block.type === "keep") note(report.keeps, castle.side);
          else if (block.type === "cannon") note(report.cannons, castle.side);
          else if (block.type === "rig") {
            note(report.rigs, castle.side);
            report.rigLoss[castle.side] += 1;
            if (castle.side === "right" && match.turn !== "right") {
              match.oilRigsDestroyed = (match.oilRigsDestroyed || 0) + 1;
              if (match.rulers && match.rulers.left) {
                match.rulers.left.oilRigsDestroyed = match.oilRigsDestroyed;
              }
            }
          }
          else note(report.towers, castle.side);
          block.live = {};
          block.base = {};
          block._mask = null;
          block._bounds = null;
          if (block.oil) {
            block.repair = B.BALANCE.oilRepairTurns;
          } else if (block.mine) {
            const mines = castle.mines || [];
            const index = mines.indexOf(block);
            if (index >= 0) mines.splice(index, 1);
          } else {
            castle.columns[block.c][block.r] = "gap";
          }
          block.type = "gap";
          coverDirty = true;
        } else if (B.carveBlock(block, x, y, radius)) {
          note(report.walls, castle.side);
          if (!hasCells(block.live)) coverDirty = true;
        }
      }
      for (const house of castle.houses) {
        if (house.type !== "house") continue;
        B.solidMask(house, castle);
        if (!hasCells(house.live)) continue;
        if (!B.diskTouchesBlock(house, x, y, radius)) continue;
        house.hits += 1;
        house._mask = null;
        house.base = null;
        house.live = null;
        const full = B.BALANCE.houseHits * B.BALANCE.popPerHit;
        const sitting = house.pop == null ? full : house.pop;
        const lost = Math.min(B.BALANCE.popPerHit, sitting);
        house.pop = sitting - lost;
        const ruler = match.rulers[castle.side];
        ruler.population = Math.max(0, ruler.population - lost);
        report.popLost[castle.side] += lost;
        if (lost > 0) report.popHomes[castle.side] += 1;
        if (house.hits >= B.BALANCE.houseHits) {
          house.type = "gap";
          house.live = {};
          house.base = {};
          report.houseGone[castle.side] += 1;
        }
        report.houseLoss[castle.side] += 1;
      }
      const patriot = castle.patriot;
      if (patriot && patriot.type === "patriot") {
        B.solidMask(patriot, castle);
        if (hasCells(patriot.live) && B.diskTouchesBlock(patriot, x, y, radius)) {
          note(report.patriots, castle.side);
          patriot.live = {};
          patriot.base = {};
          patriot._mask = null;
          patriot.type = "gap";
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

  // Player mines stand at the left edge of the map, with open ground between them.
  B.placeMine = function placeMine(castle) {
    if (!castle || castle.side !== "left") return false;
    const b = B.BALANCE;
    const mines = castle.mines || (castle.mines = []);
    const standing = mines.filter((mine) => mine.type === "tower");
    if (standing.length >= b.maxMines) return false;
    const behind = castle.parcels && castle.parcels.behind;
    if (!behind || !behind.length || !castle.terrain) return false;
    const used = {};
    for (let i = 0; i < standing.length; i++) used[standing[i].slot] = true;
    const last = behind.length - 1;
    const stride = 1 + b.mineGap;
    for (let slot = last; slot >= 0; slot -= stride) {
      if (used[slot]) continue;
      const parcelX = behind[slot];
      if (parcelX == null) continue;
      if (!parcelFreeOfOil(castle, parcelX)) continue;
      const ground = castle.terrain.yAt(parcelX + b.block / 2);
      mines.push({
        type: "tower",
        mine: true,
        flank: "behind",
        slot: slot,
        c: -1 - slot,
        r: 0,
        x: parcelX,
        y: ground - b.block,
        w: b.block,
        h: b.block,
      });
      B.layoutCastle(castle, castle.terrain);
      return true;
    }
    return false;
  };

  function seatRig(terrain, x, flank, index) {
    const b = B.BALANCE;
    const y0 = terrain.yAt(x + 4);
    const y1 = terrain.yAt(x + b.oilW - 4);
    return {
      type: "rig",
      oil: true,
      flank: flank,
      slot: index,
      repair: 0,
      c: -80 - index,
      r: 0,
      x: x,
      y: Math.max(y0, y1) - b.oilH,
      w: b.oilW,
      h: b.oilH,
    };
  }

  function spreadXs(left, right, count, width) {
    const room = right - left - width;
    if (!(room >= 0) || count < 1) return null;
    const xs = [];
    for (let i = 0; i < count; i++) {
      xs.push(count === 1 ? left + room / 2 : left + (room * i) / (count - 1));
    }
    return xs;
  }

  function parcelFreeOfOil(castle, parcelX) {
    const b = B.BALANCE;
    const rigs = castle && castle.rigs;
    if (!rigs) return true;
    for (let i = 0; i < rigs.length; i++) {
      const rig = rigs[i];
      if (!rig || rig.x == null) continue;
      if (parcelX < rig.x + rig.w && parcelX + b.block > rig.x) return false;
    }
    return true;
  }

  // Rigs sit on the flat between the patriot and the front houses, plus a
  // pair at the outer edge of the map.
  B.placeOilRigs = function placeOilRigs(castle) {
    if (!castle || !castle.terrain) return false;
    const b = B.BALANCE;
    const terrain = castle.terrain;
    const site = B.patriotSite(castle.side, terrain);
    let frontMin = Infinity;
    let frontMax = 0;
    let behindMin = Infinity;
    let behindMax = 0;
    const houses = castle.houses || [];
    for (let i = 0; i < houses.length; i++) {
      const house = houses[i];
      if (house.flank === "front") {
        if (house.x < frontMin) frontMin = house.x;
        frontMax = Math.max(frontMax, house.x + house.w);
      } else if (house.flank === "behind") {
        if (house.x < behindMin) behindMin = house.x;
        behindMax = Math.max(behindMax, house.x + house.w);
      }
    }
    const rigs = [];
    if (castle.side === "right") {
      const flatLeft = Math.max(terrain.valleyEnd, site.x + site.w) + b.oilMargin;
      const flatRight = frontMin - b.oilMargin;
      const frontXs = spreadXs(flatLeft, flatRight, b.oilFront, b.oilW);
      if (!frontXs) return false;
      for (let i = 0; i < frontXs.length; i++) rigs.push(seatRig(terrain, frontXs[i], "front", i));
      const edge = b.viewW - b.oilMargin - b.oilW;
      for (let i = 0; i < b.oilRear; i++) {
        const x = edge - i * (b.oilW + b.oilGap);
        if (x < behindMax + b.oilMargin) return false;
        rigs.push(seatRig(terrain, x, "rear", b.oilFront + i));
      }
    } else {
      const flatRight = Math.min(terrain.valleyStart, site.x) - b.oilMargin;
      const flatLeft = frontMax + b.oilMargin;
      const frontXs = spreadXs(flatLeft, flatRight, b.oilFront, b.oilW);
      if (!frontXs) return false;
      for (let i = 0; i < frontXs.length; i++) rigs.push(seatRig(terrain, frontXs[i], "front", i));
      for (let i = 0; i < b.oilRear; i++) {
        const x = b.oilMargin + i * (b.oilW + b.oilGap);
        if (x + b.oilW > behindMin - b.oilMargin) return false;
        rigs.push(seatRig(terrain, x, "rear", b.oilFront + i));
      }
    }
    castle.rigs = rigs;
    B.layoutCastle(castle, terrain);
    return true;
  };

  B.tickOilRepair = function tickOilRepair(castle) {
    const rigs = castle && castle.rigs;
    if (!rigs || !castle.terrain) return;
    let changed = false;
    for (let i = 0; i < rigs.length; i++) {
      const rig = rigs[i];
      if (rig.type === "rig") continue;
      rig.repair -= 1;
      if (rig.repair > 0) continue;
      const stood = seatRig(castle.terrain, rig.x, rig.flank, rig.slot);
      rig.type = "rig";
      rig.repair = 0;
      rig.y = stood.y;
      rig.live = null;
      rig.base = null;
      rig._mask = null;
      rig._bounds = null;
      changed = true;
    }
    if (changed) B.layoutCastle(castle, castle.terrain);
  };

  B.rigAt = function rigAt(match, x, y) {
    if (!match) return null;
    const castles = [match.right, match.left];
    for (let c = 0; c < castles.length; c++) {
      const rigs = castles[c].rigs || [];
      for (let i = 0; i < rigs.length; i++) {
        const rig = rigs[i];
        if (rig.type !== "rig") continue;
        if (x >= rig.x && x <= rig.x + rig.w && y >= rig.y && y <= rig.y + rig.h) return rig;
      }
    }
    return null;
  };

  function castleLiveCells(castle) {
    const size = B.BALANCE.cell;
    const live = new Set();
    for (const block of castle.blocks) {
      if (block.type !== "wall" && block.type !== "keep") continue;
      if (B.solidMask) B.solidMask(block, castle);
      if (!block.live) continue;
      const bx = Math.round((block.x - castle.originX) / size);
      const by = Math.round((block.y - castle.padY) / size);
      for (const key in block.live) {
        const comma = key.indexOf(",");
        const cx = Number(key.slice(0, comma));
        const cy = Number(key.slice(comma + 1));
        live.add((bx + cx) + "," + (by + cy));
      }
    }
    return live;
  }

  function cellBlockedByStructure(castle, x, y, size) {
    for (const block of castle.blocks) {
      if (block.type === "wall" || block.type === "gap") continue;
      if (x + size > block.x && x < block.x + block.w && y + size > block.y && y < block.y + block.h) return true;
    }
    const houses = castle.houses || [];
    for (let i = 0; i < houses.length; i++) {
      const h = houses[i];
      if (h.type !== "house") continue;
      if (x + size > h.x && x < h.x + h.w && y + size > h.y && y < h.y + h.h) return true;
    }
    const p = castle.patriot;
    if (p && p.type === "patriot") {
      if (x + size > p.x && x < p.x + p.w && y + size > p.y && y < p.y + p.h) return true;
    }
    return false;
  }

  B.wallPatchPlan = function wallPatchPlan(castle, wx, wy) {
    if (!castle || wx == null || wy == null) return null;
    const b = B.BALANCE;
    const size = b.cell;
    const span = b.wallPatchCells || 4;
    const live = castleLiveCells(castle);
    const gx0 = Math.round((wx - castle.originX) / size - span / 2);
    const gy0 = Math.round((wy - castle.padY) / size - span / 2);
    const cells = [];
    let touches = false;
    const terrain = castle.terrain;
    for (let dy = 0; dy < span; dy++) {
      for (let dx = 0; dx < span; dx++) {
        const gx = gx0 + dx;
        const gy = gy0 + dy;
        const gKey = gx + "," + gy;
        if (live.has(gKey)) continue;
        const cellX = castle.originX + gx * size;
        const cellY = castle.padY + gy * size;
        if (cellX < 0 || cellX + size > b.viewW || cellY < 0) continue;
        if (terrain) {
          if (castle.side === "left" && cellX + size > terrain.valleyEnd) continue;
          if (cellY + size > terrain.yAt(cellX + size * 0.5) + 2) continue;
        }
        if (cellBlockedByStructure(castle, cellX, cellY, size)) continue;
        cells.push({ gx, gy, x: cellX, y: cellY, w: size, h: size });
        if (!touches) {
          for (let ny = -1; ny <= 1 && !touches; ny++) {
            for (let nx = -1; nx <= 1; nx++) {
              if (nx === 0 && ny === 0) continue;
              if (live.has((gx + nx) + "," + (gy + ny))) {
                touches = true;
                break;
              }
            }
          }
        }
      }
    }
    return {
      valid: touches && cells.length > 0,
      touches,
      cells,
      x: castle.originX + gx0 * size,
      y: castle.padY + gy0 * size,
      w: span * size,
      h: span * size,
    };
  };

  B.placeWallPatch = function placeWallPatch(castle, wx, wy) {
    const plan = B.wallPatchPlan(castle, wx, wy);
    if (!plan || !plan.valid) return false;
    const b = B.BALANCE;
    const extraWalls = castle.extraWalls || (castle.extraWalls = []);
    const dirty = new Set();
    for (let i = 0; i < plan.cells.length; i++) {
      const cell = plan.cells[i];
      const gx = cell.gx;
      const gy = cell.gy;
      let restored = false;
      for (let j = 0; j < castle.blocks.length; j++) {
        const block = castle.blocks[j];
        if (block.type !== "wall" || block.extraWall) continue;
        const cx = gx - block.c * 7;
        const cy = gy + (block.r + 1) * 7;
        const key = cx + "," + cy;
        if (block.base && block.base[key]) {
          if (!block.live) block.live = {};
          block.live[key] = 1;
          dirty.add(block);
          restored = true;
        }
      }
      if (restored) continue;
      const c = Math.floor(gx / 7);
      const r = Math.floor((-gy - 1) / 7);
      const cx = gx - c * 7;
      const cy = gy + (r + 1) * 7;
      const key = cx + "," + cy;
      let extra = null;
      for (let j = 0; j < extraWalls.length; j++) {
        if (extraWalls[j].c === c && extraWalls[j].r === r) {
          extra = extraWalls[j];
          break;
        }
      }
      if (!extra) {
        extra = {
          c,
          r,
          type: "wall",
          extraWall: true,
          x: castle.originX + c * b.block,
          y: castle.padY - (r + 1) * b.block,
          w: b.block,
          h: b.block,
          patched: {},
          base: {},
          live: {},
        };
        extraWalls.push(extra);
        castle.blocks.push(extra);
      }
      extra.patched[key] = 1;
      extra.base[key] = 1;
      extra.live[key] = 1;
      dirty.add(extra);
    }
    for (const block of dirty) {
      block._mask = null;
      block._bounds = null;
      if (B.solidMask) B.solidMask(block, castle);
    }
    markCovered(castle.blocks);
    castle._geom = (castle._geom || 0) + 1;
    return true;
  };

  B.buildOnCastle = function buildOnCastle(castle, type) {
    if (type === "tower") return B.placeMine(castle);
    const b = B.BALANCE;
    const inner = castle.side === "left" ? b.cols - 1 : 0;
    const order = [];
    for (let i = 0; i < b.cols; i++) order.push(castle.side === "left" ? inner - i : inner + i);
    for (const c of order) {
      const col = castle.columns[c];
      if (!col.length || col.length >= b.maxRow) continue;
      col.push(type);
      B.layoutCastle(castle, castle.terrain);
      return true;
    }
    return false;
  };
})();
