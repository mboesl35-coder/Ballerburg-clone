(function () {
  const B = (window.Baller = window.Baller || {});

  function afford(ruler, cost) {
    return ruler.gold >= cost;
  }

  B.thinkEconomy = function thinkEconomy(ruler, castle) {
    const b = B.BALANCE;
    const notes = [];
    if (ruler.balls < 2 && afford(ruler, b.ballCost)) {
      ruler.gold -= b.ballCost;
      ruler.balls += 1;
      notes.push("buys a rocket");
    }
    let powderBuys = 0;
    while (ruler.powder < B.fuelCapacity(ruler) && afford(ruler, b.powderCost)) {
      ruler.gold -= b.powderCost;
      ruler.powder += b.powderPack;
      powderBuys += 1;
    }
    if (powderBuys) notes.push("buys rocket fuel");
    if (!B.hasType(castle, "cannon") && afford(ruler, b.launcherCost) && B.buyLauncher(castle)) {
      ruler.gold -= b.launcherCost;
      notes.push("buys a launcher");
    }
    if (!B.patriotAlive(castle) && ruler.gold >= b.patriotCost + b.ballCost && B.placePatriot(castle)) {
      ruler.gold -= b.patriotCost;
      notes.push("buys a patriot");
    }
    if (B.patriotAlive(castle) && ruler.interceptors < 3 && ruler.gold >= b.interceptorCost + b.ballCost) {
      ruler.gold -= b.interceptorCost;
      ruler.interceptors += 1;
      notes.push("buys an air-to-air missile");
    }
    if (B.patriotAlive(castle) && !B.a2aMaxed(ruler)) {
      const cost = B.a2aResearchCost(ruler);
      if (ruler.gold >= cost + b.ballCost) {
        ruler.gold -= cost;
        ruler.a2aLevel += 1;
        notes.push("researches air-to-air efficiency");
      }
    }
    let fuelBuys = 0;
    while (!B.fuelMaxed(ruler) && ruler.gold >= B.fuelResearchCost() + 150 && fuelBuys < 20) {
      ruler.gold -= B.fuelResearchCost();
      ruler.fuelLevel += 1;
      fuelBuys += 1;
    }
    if (fuelBuys) notes.push("researches rocket fuel capacity");
    if (!B.guidanceMaxed(ruler) && ruler.gold >= B.guidanceResearchCost() + b.ballCost) {
      ruler.gold -= B.guidanceResearchCost();
      ruler.guidanceLevel = B.guidanceLevel(ruler) + 1;
      notes.push("researches rocket guidance");
    }
    if (B.droneFactoryLevel(ruler) < b.overlordDroneFactoryMax && ruler.gold >= B.droneFactoryCost(ruler) + b.ballCost) {
      ruler.gold -= B.droneFactoryCost(ruler);
      ruler.droneLevel = B.droneFactoryLevel(ruler) + 1;
      notes.push("researches the drone factory");
    }
    if (B.droneFactoryLevel(ruler) > 0 && !B.droneRangeMaxed(ruler) && ruler.gold >= B.droneRangeCost(ruler) + b.ballCost) {
      ruler.gold -= B.droneRangeCost(ruler);
      ruler.droneRangeLevel = B.droneRangeLevel(ruler) + 1;
      notes.push("researches drone range");
    }
    const droneLimit = B.droneFactoryLevel(ruler);
    let droneBuilt = ruler.dronesBought || 0;
    let droneBuys = 0;
    while (droneBuilt < droneLimit && ruler.gold >= b.droneCost + b.ballCost) {
      ruler.gold -= b.droneCost;
      ruler.drones = (ruler.drones || 0) + 1;
      droneBuilt += 1;
      droneBuys += 1;
    }
    if (droneBuys) {
      ruler.dronesBought = droneBuilt;
      notes.push(droneBuys === 1 ? "buys an attack drone" : "buys attack drones");
    }
    B.syncDroneFactory(castle, ruler);
    return notes;
  };

  function droneScore(kind) {
    if (kind === "keep") return 100;
    if (kind === "cannon") return 80;
    if (kind === "patriot") return 74;
    if (kind === "factory") return 86;
    if (kind === "house") return 60;
    return 50;
  }

  B.chooseDrone = function chooseDrone(match, side) {
    const foe = side === "left" ? match.right : match.left;
    const aims = [];
    function add(block) {
      if (!block || block.type === "gap" || block.w == null || block.h == null) return;
      if (block.live && !B.hasCells(block.live)) return;
      const box = block._bounds;
      if (box) aims.push({ x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 });
      else aims.push({ x: block.x + block.w / 2, y: block.y + block.h / 2 });
    }
    const blocks = foe.blocks || [];
    for (let i = 0; i < blocks.length; i++) add(blocks[i]);
    const houses = foe.houses || [];
    for (let i = 0; i < houses.length; i++) add(houses[i]);
    if (foe.droneFactory && foe.droneFactory.type === "factory") add(foe.droneFactory);
    if (foe.patriot && foe.patriot.type === "patriot") add(foe.patriot);
    let pool = [];
    for (let i = 0; i < aims.length; i++) {
      const aim = aims[i];
      if (!B.droneInRange(match, side, aim.x)) continue;
      const hit = B.flyDrone(match, side, aim.x, aim.y).hit;
      if (!hit || hit.type !== "block" || !hit.castle || hit.castle.side === side) continue;
      const kind = hit.block.type;
      if (kind === "ruin") continue;
      pool.push({ x: aim.x, y: aim.y, score: droneScore(kind) + (hit.block.r || 0), kind: kind });
    }
    if (!pool.length) return null;
    if (pool.some((shot) => shot.kind === "patriot") && Math.random() < 0.35) {
      pool = pool.filter((shot) => shot.kind === "patriot");
    } else if (pool.some((shot) => shot.kind === "keep") && Math.random() < 0.3) {
      pool = pool.filter((shot) => shot.kind === "keep");
    }
    pool.sort((a, b) => b.score - a.score);
    return pool[Math.floor(Math.random() * Math.min(4, pool.length))];
  };

  function arcDistTo(match, side, angle, powder, tx, ty) {
    const b = B.BALANCE;
    const origin = B.muzzle(match[side], angle);
    if (!origin) return Infinity;
    const elev = (angle * Math.PI) / 180;
    const dir = side === "left" ? 1 : -1;
    const speed = B.shotSpeed(powder);
    let x = origin.x;
    let y = origin.y;
    let vx = dir * Math.cos(elev) * speed;
    let vy = -Math.sin(elev) * speed;
    const dt = 1 / 60;
    const steps = 60 * 7;
    let best = Infinity;
    for (let i = 0; i < steps; i++) {
      vx += match.wind * dt;
      vy += b.gravity * dt;
      x += vx * dt;
      y += vy * dt;
      const d = Math.hypot(x - tx, y - ty);
      if (d < best) best = d;
      if (y > b.viewH + 40 || (dir === -1 ? x < tx - 60 : x > tx + 60)) break;
    }
    return best;
  }

  function nearOwn(castle, x, y, safe) {
    const list = (castle.blocks || []).concat(castle.houses || []);
    if (castle.patriot && castle.patriot.type === "patriot") list.push(castle.patriot);
    if (castle.droneFactory && castle.droneFactory.type === "factory") list.push(castle.droneFactory);
    for (let i = 0; i < list.length; i++) {
      const block = list[i];
      if (!block || block.type === "gap" || block.w == null || block.h == null) continue;
      const nx = Math.max(block.x, Math.min(x, block.x + block.w));
      const ny = Math.max(block.y, Math.min(y, block.y + block.h));
      if (Math.hypot(x - nx, y - ny) <= safe) return true;
    }
    return false;
  }

  function bestPerBlock(shots) {
    const map = new Map();
    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i];
      const key = shot.block || shot.kind + ":" + shot.angle;
      const prev = map.get(key);
      if (!prev || shot.score > prev.score) map.set(key, shot);
    }
    const out = Array.from(map.values());
    out.sort((a, b) => b.score - a.score);
    return out;
  }

  B.chooseShot = function chooseShot(match, side) {
    const b = B.BALANCE;
    const ruler = match.rulers[side];
    const castle = match[side];
    if (!B.hasType(castle, "cannon") || ruler.balls < 1 || ruler.powder < b.powderMin) return null;
    const foe = side === "left" ? match.right : match.left;
    const keep = foe.blocks.find((block) => block.type === "keep");
    const aimX = keep ? keep.x + keep.w / 2 : foe.originX + (b.cols * b.block) / 2;
    const aimY = keep ? keep.y + keep.h / 2 : foe.padY - b.block;
    const shots = [];
    const powderTop = Math.min(B.fuelCapacity(ruler), ruler.powder);
    const powderFloor = powderTop >= 12 ? Math.max(b.powderMin, 12) : b.powderMin;
    const safeDist = b.blastRadius + 8;
    for (let powder = powderFloor; powder <= powderTop; powder += 1) {
      for (let angle = b.angleMin; angle <= b.angleMax; angle += 1) {
        const hit = B.fly(match, side, angle, powder, false).hit;
        if (!hit || (hit.type !== "block" && hit.type !== "ground")) continue;
        if (hit.type === "block" && hit.castle && hit.castle.side === side) continue;
        if (nearOwn(castle, hit.x, hit.y, safeDist)) continue;
        if (hit.type === "ground") {
          const crossed = side === "right" ? hit.x <= match.terrain.valleyStart : hit.x >= match.terrain.valleyEnd;
          if (!crossed) continue;
          const score = 20 - Math.hypot(hit.x - aimX, (hit.y - aimY) / 4) / 40;
          shots.push({ angle, powder, score, kind: "ground", block: null, flank: null, kingAim: false, kingScore: 0 });
          continue;
        }
        const block = hit.block;
        const kind = block.type;
        if (kind === "ruin") continue;
        const bx = block.x + (block.w || b.block) / 2;
        const by = block.y + (block.h || b.block) / 2;
        const centerBonus = Math.max(0, 12 - Math.hypot(hit.x - bx, hit.y - by) * 0.25);
        let score = kind === "keep" ? 100 : kind === "factory" ? 90 : kind === "cannon" ? 80 : kind === "patriot" ? 74 : kind === "tower" ? 72 : kind === "house" ? 68 : 50;
        score += (block.r || 0) + centerBonus;
        if (kind === "house" && (block.pop || 0) > 0) score += 12;
        let kingAim = kind === "keep";
        let kingScore = kind === "keep" ? 200 : 0;
        if (kind === "keep" || kind === "wall") {
          const kingDist = arcDistTo(match, side, angle, powder, aimX, aimY);
          if (kingDist <= b.block * 0.75) {
            kingAim = true;
            kingScore = (kind === "keep" ? 200 : 120) - kingDist;
          }
        }
        shots.push({ angle, powder, score, kind, block, flank: block.flank || null, kingAim, kingScore });
      }
    }
    const enemy = shots.filter((shot) => shot.kind === "keep" || shot.kind === "cannon" || shot.kind === "wall" || shot.kind === "tower" || shot.kind === "house" || shot.kind === "factory" || shot.kind === "patriot");
    if (!enemy.length) {
      if (!shots.length) return null;
      shots.sort((a, b) => b.score - a.score);
      return shots[Math.floor(Math.random() * Math.min(4, shots.length))];
    }
    const kingShots = enemy.filter((shot) => shot.kingAim);
    const nonKing = enemy.filter((shot) => !shot.kingAim);
    const rest = nonKing.length ? nonKing : enemy;
    const backHouses = bestPerBlock(rest.filter((shot) => shot.kind === "house" && shot.flank === "behind"));
    const factories = bestPerBlock(rest.filter((shot) => shot.kind === "factory"));
    const patriots = rest.filter((shot) => shot.kind === "patriot");
    const roll = Math.random();
    if (kingShots.length && roll < 0.1) {
      kingShots.sort((a, b) => b.kingScore - a.kingScore);
      return kingShots[Math.floor(Math.random() * Math.min(3, kingShots.length))];
    }
    if (backHouses.length && roll < 0.5) {
      const populated = backHouses.filter((shot) => (shot.block.pop || 0) > 0);
      const choices = populated.length ? populated : backHouses;
      return choices[Math.floor(Math.random() * choices.length)];
    }
    if (factories.length && roll < 0.7) {
      return factories[Math.floor(Math.random() * factories.length)];
    }
    if (patriots.length && Math.random() < 0.35) {
      patriots.sort((a, b) => b.score - a.score);
      return patriots[Math.floor(Math.random() * Math.min(3, patriots.length))];
    }
    const pool = bestPerBlock(rest);
    return pool[Math.floor(Math.random() * Math.min(6, pool.length))];
  };

  function standingFrontRigs(castle) {
    const rigs = castle && castle.rigs || [];
    const out = [];
    for (let i = 0; i < rigs.length; i++) {
      if (rigs[i].type === "rig" && rigs[i].flank === "front") out.push(rigs[i]);
    }
    return out;
  }

  // Opening lasts while the player's three near oil rigs still stand, and
  // through the first few exchanges if they have not fallen yet.
  function onEnemyHill(match, side, x) {
    const terrain = match.terrain;
    const mid = (terrain.valleyStart + terrain.valleyEnd) / 2;
    if (side === "right") return x <= mid && x >= terrain.valleyStart;
    return x >= mid && x <= terrain.valleyEnd;
  }

  function freeOpening(match, side) {
    const foe = side === "left" ? match.right : match.left;
    return (match.playerTurn || 0) < 7 && standingFrontRigs(foe).length > 0;
  }

  function aimPoint(block) {
    if (!block || block.type === "gap" || block.w == null || block.h == null) return null;
    if (block.live && !B.hasCells(block.live)) return null;
    const box = block._bounds;
    if (box) return { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 };
    return { x: block.x + block.w / 2, y: block.y + block.h / 2 };
  }

  function droneStrike(match, side, block) {
    const aim = aimPoint(block);
    if (!aim || !B.droneInRange(match, side, aim.x)) return null;
    const hit = B.flyDrone(match, side, aim.x, aim.y).hit;
    if (!hit || hit.type !== "block" || !hit.castle || hit.castle.side === side) return null;
    return { x: aim.x, y: aim.y, kind: hit.block.type, block: hit.block };
  }

  function buyDrones(ruler, b, notes) {
    const droneLimit = B.droneFactoryLevel(ruler);
    let droneBuilt = ruler.dronesBought || 0;
    let droneBuys = 0;
    while (droneBuilt < droneLimit && ruler.gold >= b.droneCost) {
      ruler.gold -= b.droneCost;
      ruler.drones = (ruler.drones || 0) + 1;
      droneBuilt += 1;
      droneBuys += 1;
    }
    if (droneBuys) {
      ruler.dronesBought = droneBuilt;
      if (notes.indexOf("buys an attack drone") < 0 && notes.indexOf("buys attack drones") < 0) {
        notes.push(droneBuys === 1 ? "buys an attack drone" : "buys attack drones");
      }
    }
  }

  // Free Game AI. Copied from Story Mode so later retunes do not cross.
  B.FREE_AI = {
    thinkEconomy: function thinkEconomy(ruler, castle) {
      const b = B.FREE_PRICES;
      const reach = B.BALANCE.powderReach;
      const notes = [];
      if (ruler.balls < 3 && afford(ruler, b.ballCost)) {
        ruler.gold -= b.ballCost;
        ruler.balls += 1;
        notes.push("buys a rocket");
      }
      let powderBuys = 0;
      function fillPowder() {
        while (ruler.powder < B.fuelCapacity(ruler) && afford(ruler, b.powderCost)) {
          ruler.gold -= b.powderCost;
          ruler.powder += b.powderPack;
          powderBuys += 1;
        }
      }
      fillPowder();
      if (!B.hasType(castle, "cannon") && afford(ruler, b.launcherCost) && B.buyLauncher(castle)) {
        ruler.gold -= b.launcherCost;
        notes.push("buys a launcher");
      }
      let fuelBuys = 0;
      function buyFuel(count) {
        let bought = 0;
        while (bought < count && !B.fuelMaxed(ruler) && ruler.gold >= b.fuelCapacityCost) {
          ruler.gold -= b.fuelCapacityCost;
          ruler.fuelLevel += 1;
          bought += 1;
          fuelBuys += 1;
        }
      }
      if (B.fuelCapacity(ruler) < reach) {
        const fuelBundle = b.fuelCapacityCost * 2 + B.droneFactoryCost(ruler) + B.droneRangeCost(ruler);
        buyFuel(ruler.gold >= fuelBundle ? 2 : 1);
      }
      fillPowder();
      let factoryBuys = 0;
      function buyFactory(count) {
        let bought = 0;
        while (bought < count && !B.droneFactoryMaxed(ruler)) {
          const cost = B.droneFactoryCost(ruler);
          if (ruler.gold < cost + b.droneCost) break;
          ruler.gold -= cost;
          ruler.droneLevel = B.droneFactoryLevel(ruler) + 1;
          bought += 1;
          factoryBuys += 1;
        }
      }
      if (B.droneFactoryLevel(ruler) < 1) buyFactory(1);
      let rangeBuys = 0;
      function buyRange(count) {
        let bought = 0;
        while (bought < count && B.droneFactoryLevel(ruler) > 0 && !B.droneRangeMaxed(ruler)) {
          const cost = B.droneRangeCost(ruler);
          if (ruler.gold < cost) break;
          ruler.gold -= cost;
          ruler.droneRangeLevel = B.droneRangeLevel(ruler) + 1;
          bought += 1;
          rangeBuys += 1;
        }
      }
      buyDrones(ruler, b, notes);
      buyRange(1);
      const armed = B.fuelCapacity(ruler) >= reach && B.droneFactoryLevel(ruler) >= 2 && B.droneRangeLevel(ruler) >= 2;
      if (B.fuelCapacity(ruler) >= reach && !B.guidanceMaxed(ruler) && ruler.gold >= b.guidanceCost) {
        ruler.gold -= b.guidanceCost;
        ruler.guidanceLevel = B.guidanceLevel(ruler) + 1;
        notes.push("researches rocket guidance");
      } else if (armed && !B.patriotAlive(castle) && ruler.gold >= b.patriotCost && B.placePatriot(castle)) {
        ruler.gold -= b.patriotCost;
        notes.push("buys a patriot");
      } else {
        buyFactory(1);
      }
      buyDrones(ruler, b, notes);
      if (armed && B.patriotAlive(castle) && (ruler.interceptors || 0) < 1 && ruler.gold >= b.interceptorCost) {
        ruler.gold -= b.interceptorCost;
        ruler.interceptors += 1;
        notes.push("buys an air-to-air missile");
      }
      let towerBuys = 0;
      while (B.towerCount(castle) < B.BALANCE.maxMines && ruler.gold >= b.towerCost) {
        if (!B.placeMine(castle)) break;
        ruler.gold -= b.towerCost;
        towerBuys += 1;
      }
      if (towerBuys) notes.push(towerBuys === 1 ? "builds a mine tower" : "builds mine towers");
      buyRange(8);
      if (B.guidanceMaxed(ruler)) buyFuel(1);
      fillPowder();
      if (B.guidanceMaxed(ruler) || B.fuelCapacity(ruler) < reach) buyFactory(2);
      buyDrones(ruler, b, notes);
      if (B.guidanceLevel(ruler) > 0 && !B.rocketDamageMaxed(ruler)) {
        const cost = B.rocketDamageCost(ruler);
        if (ruler.gold >= cost) {
          ruler.gold -= cost;
          ruler.rocketDamageLevel = B.rocketDamageLevel(ruler) + 1;
          notes.push("researches rocket blast radius");
        }
      }
      if (powderBuys) notes.push("buys rocket fuel");
      if (fuelBuys) notes.push("researches rocket fuel capacity");
      if (factoryBuys) notes.push("researches the drone factory");
      if (rangeBuys) notes.push("researches drone range");
      B.syncDroneFactory(castle, ruler);
      return notes;
    },
    chooseDrone: function chooseDrone(match, side) {
      const foe = side === "left" ? match.right : match.left;
      if (freeOpening(match, side)) {
        const rigs = standingFrontRigs(foe);
        let best = null;
        let bestNear = -Infinity;
        for (let i = 0; i < rigs.length; i++) {
          const shot = droneStrike(match, side, rigs[i]);
          if (!shot || shot.kind !== "rig") continue;
          const near = side === "right" ? shot.x : -shot.x;
          if (near > bestNear) {
            bestNear = near;
            best = shot;
          }
        }
        return best;
      }
      let best = null;
      function offer(block, score) {
        const shot = droneStrike(match, side, block);
        if (!shot) return;
        if (shot.kind !== "house" && shot.kind !== "rig" && shot.kind !== "tower" && shot.kind !== "factory") return;
        const near = side === "right" ? shot.x : -shot.x;
        const ranked = score + near / 100000;
        if (!best || ranked > best.ranked) {
          shot.ranked = ranked;
          best = shot;
        }
      }
      const houses = foe.houses || [];
      for (let i = 0; i < houses.length; i++) {
        const house = houses[i];
        if (house.type !== "house") continue;
        offer(house, (house.pop || 0) > 0 ? 100 : 80);
      }
      if (foe.droneFactory && foe.droneFactory.type === "factory") offer(foe.droneFactory, 112);
      const rigs = foe.rigs || [];
      for (let i = 0; i < rigs.length; i++) {
        if (rigs[i].type === "rig") offer(rigs[i], 100);
      }
      const mines = foe.mines || [];
      for (let i = 0; i < mines.length; i++) {
        if (mines[i].type === "tower") offer(mines[i], 96);
      }
      return best;
    },
    chooseShot: function chooseShot(match, side) {
      const b = B.BALANCE;
      const ruler = match.rulers[side];
      const castle = match[side];
      if (!B.hasType(castle, "cannon") || ruler.balls < 1 || ruler.powder < b.powderMin) return null;
      const foe = side === "left" ? match.right : match.left;
      const keep = foe.blocks.find((block) => block.type === "keep");
      const aimX = keep ? keep.x + keep.w / 2 : foe.originX + (b.cols * b.block) / 2;
      const aimY = keep ? keep.y + keep.h / 2 : foe.padY - b.block;
      const shots = [];
      const powderTop = Math.min(B.fuelCapacity(ruler), ruler.powder);
      const powderFloor = powderTop >= 12 ? Math.max(b.powderMin, 12) : b.powderMin;
      const safeDist = B.rocketBlastRadius(ruler) + 8;
      for (let powder = powderFloor; powder <= powderTop; powder += 1) {
        for (let angle = b.angleMin; angle <= b.angleMax; angle += 1) {
          const hit = B.fly(match, side, angle, powder, false).hit;
          if (!hit || (hit.type !== "block" && hit.type !== "ground")) continue;
          if (hit.type === "block" && hit.castle && hit.castle.side === side) continue;
          if (nearOwn(castle, hit.x, hit.y, safeDist)) continue;
          if (hit.type === "ground") {
            const crossed = side === "right" ? hit.x <= match.terrain.valleyStart : hit.x >= match.terrain.valleyEnd;
            if (!crossed && !onEnemyHill(match, side, hit.x)) continue;
            const score = 20 - Math.hypot(hit.x - aimX, (hit.y - aimY) / 4) / 40;
            shots.push({ angle, powder, score, kind: "ground", block: null, flank: null, kingAim: false, kingScore: 0 });
            continue;
          }
          const block = hit.block;
          const kind = block.type;
          if (kind === "ruin") continue;
          const bx = block.x + (block.w || b.block) / 2;
          const by = block.y + (block.h || b.block) / 2;
          const centerBonus = Math.max(0, 12 - Math.hypot(hit.x - bx, hit.y - by) * 0.25);
          let score = kind === "keep" ? 140 : kind === "factory" ? 104 : kind === "rig" ? 96 : kind === "house" ? 88 : kind === "tower" ? 84 : kind === "cannon" ? 70 : kind === "patriot" ? 30 : 40;
          score += (block.r || 0) + centerBonus;
          if (kind === "house" && (block.pop || 0) > 0) score += 12;
          let kingAim = kind === "keep";
          let kingScore = kind === "keep" ? 200 : 0;
          if (kind === "keep" || kind === "wall") {
            const kingDist = arcDistTo(match, side, angle, powder, aimX, aimY);
            if (kingDist <= b.block * 0.75) {
              kingAim = true;
              kingScore = (kind === "keep" ? 240 : 160) - kingDist;
            }
          }
          shots.push({ angle, powder, score, kind, block, flank: block.flank || null, kingAim, kingScore });
        }
      }
      const enemy = shots.filter((shot) => shot.kind === "keep" || shot.kind === "cannon" || shot.kind === "wall" || shot.kind === "tower" || shot.kind === "house" || shot.kind === "factory" || shot.kind === "rig" || shot.kind === "patriot");
      const opening = freeOpening(match, side);
      const kingShots = enemy.filter((shot) => shot.kingAim);
      const factories = bestPerBlock(enemy.filter((shot) => shot.kind === "factory"));
      if (!opening && factories.length && Math.random() < 0.28) return factories[0];
      if (!opening && kingShots.length) {
        kingShots.sort((a, b) => b.kingScore - a.kingScore || b.score - a.score);
        return kingShots[0];
      }
      if (opening) {
        const frontRigs = bestPerBlock(enemy.filter((shot) => shot.kind === "rig" && shot.flank === "front"));
        if (frontRigs.length) return frontRigs[0];
      }
      const economic = bestPerBlock(enemy.filter((shot) => shot.kind === "house" || shot.kind === "rig" || shot.kind === "tower" || shot.kind === "factory"));
      if (economic.length) return economic[0];
      if (kingShots.length) {
        kingShots.sort((a, b) => b.kingScore - a.kingScore || b.score - a.score);
        return kingShots[0];
      }
      const pool = bestPerBlock(enemy.length ? enemy : shots);
      return pool.length ? pool[0] : null;
    },
  };
})();
