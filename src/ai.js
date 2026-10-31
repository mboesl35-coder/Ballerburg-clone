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
    if (ruler.powder < b.powderReach && afford(ruler, b.powderCost)) {
      ruler.gold -= b.powderCost;
      ruler.powder += b.powderPack;
      notes.push("buys rocket fuel");
    }
    if (!B.hasType(castle, "cannon") && afford(ruler, b.launcherCost) && B.buyLauncher(castle)) {
      ruler.gold -= b.launcherCost;
      notes.push("buys a launcher");
    }
    if (ruler.happiness < 50 && ruler.food < 2) ruler.food = Math.min(2, ruler.food + 1);
    if (ruler.gold > 140 && B.towerCount(castle) < 2 && afford(ruler, b.towerCost)) {
      if (B.buildOnCastle(castle, "tower")) {
        ruler.gold -= b.towerCost;
        notes.push("builds a mine tower");
      }
    }
    return notes;
  };

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
    const powderTop = Math.min(b.powderMax, ruler.powder);
    for (let powder = b.powderMin; powder <= powderTop; powder += 1) {
      for (let angle = b.angleMin; angle <= b.angleMax; angle += 4) {
        const hit = B.fly(match, side, angle, powder, false).hit;
        let kind = "miss";
        let score = 0;
        if (hit.type === "block" && hit.castle.side !== side) {
          kind = hit.block.type;
          score = kind === "keep" ? 100 : kind === "cannon" ? 80 : 50;
          score += hit.block.r;
        } else if (hit.type === "ground") {
          kind = "ground";
          score = 20 - Math.hypot(hit.x - aimX, (hit.y - aimY) / 4) / 40;
        }
        shots.push({ angle, powder, score, kind });
      }
    }
    const enemy = shots.filter((shot) => shot.kind === "keep" || shot.kind === "cannon" || shot.kind === "wall" || shot.kind === "tower");
    let pool = enemy;
    if (enemy.some((shot) => shot.kind === "keep") && Math.random() < 0.3) {
      pool = enemy.filter((shot) => shot.kind === "keep");
    }
    if (!pool.length) pool = shots;
    pool.sort((a, b) => b.score - a.score);
    const pick = pool[Math.floor(Math.random() * Math.min(6, pool.length))];
    if (!pick) return null;
    const jitter = Math.floor(Math.random() * 7) - 3;
    pick.angle = Math.max(b.angleMin, Math.min(b.angleMax, pick.angle + jitter));
    return pick;
  };
})();
