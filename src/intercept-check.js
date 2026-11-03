(function () {
  const B = window.Baller;
  const failures = [];
  function check(name, cond, extra) {
    if (!cond) failures.push(name + (extra ? ": " + extra : ""));
  }

  function unlockFuel(match) {
    const levels = B.BALANCE.powderMax - B.BALANCE.powderBase;
    match.rulers.left.fuelLevel = levels;
    match.rulers.right.fuelLevel = levels;
    const guidance = B.guidanceMaxLevel();
    match.rulers.left.guidanceLevel = guidance;
    match.rulers.right.guidanceLevel = guidance;
  }

  try {
    const match = B.createMatch("tal");
    B.openTurn(match);
    match.wind = 0;
    const mid = (match.terrain.valleyStart + match.terrain.valleyEnd) / 2;
    const startGold = match.rulers.left.gold;

    let err = B.playerBuy(match, "patriot");
    check("buy patriot", err == null && B.patriotAlive(match.left), err);
    check("patriot cost", match.rulers.left.gold === startGold - B.BALANCE.patriotCost, String(match.rulers.left.gold));
    const left = match.left.patriot;
    check("left of crest", left.x + left.w < mid, String(left.x + left.w) + " vs " + mid);
    check("close to crest", mid - (left.x + left.w) < 40, String(mid - (left.x + left.w)));
    const goldAfter = match.rulers.left.gold;
    err = B.playerBuy(match, "patriot");
    check("no second patriot", err === "The patriot is already standing." && match.rulers.left.gold === goldAfter, err);

    match.rulers.left.gold = B.BALANCE.interceptorCost + 10;
    const goldBeforeA2a = match.rulers.left.gold;
    err = B.playerBuy(match, "interceptor");
    check("buy a2a", err == null && match.rulers.left.interceptors === 1, err);
    check("a2a cost", match.rulers.left.gold === goldBeforeA2a - B.BALANCE.interceptorCost);

    match.rulers.left.gold = B.BALANCE.interceptorCost - 1;
    err = B.playerBuy(match, "interceptor");
    check("poor a2a", err === "Not enough gold." && match.rulers.left.interceptors === 1, err);

    match.rulers.right.gold = 500;
    match.rulers.right.balls = 8;
    match.rulers.right.powder = 40;
    match.rulers.right.interceptors = 0;
    const notes = B.thinkEconomy(match.rulers.right, match.right);
    check("ai patriot", B.patriotAlive(match.right) && notes.indexOf("buys a patriot") >= 0, notes.join(", "));
    check("ai missile", match.rulers.right.interceptors >= 1 && notes.indexOf("buys an air-to-air missile") >= 0, notes.join(", "));
    const rp = match.right.patriot;
    check("right of crest", rp.x > mid, String(rp.x));
    check("right close", rp.x - mid < 40, String(rp.x - mid));

    match.rulers.right.interceptors = 3;
    match.rulers.right.balls = 8;
    match.rulers.right.powder = 40;
    match.rulers.right.gold = 100;
    B.thinkEconomy(match.rulers.right, match.right);
    check("no duplicate patriot spend", match.rulers.right.gold === 100 && B.patriotAlive(match.right), String(match.rulers.right.gold));

    match.right.patriot.type = "gap";
    match.rulers.right.gold = 200;
    match.rulers.right.interceptors = 3;
    match.rulers.right.balls = 8;
    match.rulers.right.powder = 80;
    B.thinkEconomy(match.rulers.right, match.right);
    check("rebuild patriot", B.patriotAlive(match.right));
    check("rebuild cost", match.rulers.right.gold === 100, String(match.rulers.right.gold));

    const px = match.left.patriot.x + match.left.patriot.w / 2;
    const py = match.left.patriot.y + match.left.patriot.h / 2;
    B.solidMask(match.left.patriot, match.left);
    check("mask solid", B.hasCells(match.left.patriot.live) && B.diskTouchesBlock(match.left.patriot, px, py, 2));
    const blast = B.applyBlast(match, px, py);
    check("blast destroys", blast.patriots.indexOf("left") >= 0 && !B.patriotAlive(match.left), blast.patriots.join(","));

    const reach = B.createMatch("tal");
    B.openTurn(reach);
    reach.wind = 0;
    B.placePatriot(reach.left);
    B.placePatriot(reach.right);
    const clearHit = B.fly(reach, "left", 48, 20, false).hit;
    check(
      "normal shot clears patriots",
      clearHit.type === "block" && clearHit.castle && clearHit.castle.side === "right" && clearHit.block.type !== "patriot",
      clearHit.type + " " + (clearHit.block && clearHit.block.type) + " " + (clearHit.castle && clearHit.castle.side)
    );

    const flight = B.createMatch("tal");
    B.openTurn(flight);
    unlockFuel(flight);
    flight.wind = 0;
    B.placePatriot(flight.left);
    B.placePatriot(flight.right);
    flight.rulers.left.balls = 8;
    flight.rulers.left.powder = 80;
    flight.rulers.right.interceptors = 0;
    B.BALANCE.interceptChance = 0;
    B.launch(flight, 48, 20);
    const cleanLen = flight.shot.path.length;
    const cleanHit = flight.shot.hit.type + ":" + Math.round(flight.shot.hit.x) + "," + Math.round(flight.shot.hit.y);
    flight.phase = "aim";
    flight.shot = null;
    flight.rulers.left.balls = 8;
    flight.rulers.left.powder = 80;

    B.BALANCE.interceptChance = 1;
    flight.rulers.right.interceptors = 3;
    const cratersBefore = flight.terrain.craters.length;
    const popBefore = flight.rulers.left.population;
    B.launch(flight, 48, 20);
    const ice = flight.shot && flight.shot.intercept;
    check("success armed", !!(ice && ice.success === true));
    check("missile spent", flight.rulers.right.interceptors === 2, String(flight.rulers.right.interceptors));
    let meetClear = null;
    if (ice) {
      const meet = flight.shot.path[ice.meetAt];
      const tip = ice.path[ice.path.length - 1];
      const meetGap = Math.hypot(meet.x - tip.x, meet.y - tip.y);
      check("meet point", meetGap < 1.5, String(meetGap));
      check("timing", ice.launchAt + ice.path.length - 1 === ice.meetAt, ice.launchAt + "+" + ice.path.length + " vs " + ice.meetAt);
      let clipped = false;
      for (let i = 0; i < ice.path.length; i++) {
        const p = ice.path[i];
        if (p.y > flight.terrain.yAt(p.x) - 8) clipped = true;
      }
      check("arc clears ground", !clipped);
      meetClear = flight.terrain.yAt(meet.x) - meet.y;
      check("meet in air", meetClear > 40, String(Math.round(meetClear)));
      check("meet on screen", meet.y > 30 && meet.y < B.BALANCE.viewH - 40, String(Math.round(meet.y)));
      let guard = 0;
      while (flight.phase === "fly" && guard < 2000) {
        B.advance(flight, 1 / 60);
        guard++;
      }
      check("air burst ends flight", flight.phase === "between" && !flight.shot, flight.phase);
      check("both explode log", flight.log.indexOf("Both explode") >= 0, flight.log);
      check("no crater", flight.terrain.craters.length === cratersBefore, String(flight.terrain.craters.length));
      check("king lives", B.hasType(flight.left, "keep") && B.hasType(flight.right, "keep"));
      check("pop unchanged", flight.rulers.left.population === popBefore, String(flight.rulers.left.population));
      check("patriot survives air burst", B.patriotAlive(flight.left) && B.patriotAlive(flight.right));
    }

    const missMatch = B.createMatch("tal");
    B.openTurn(missMatch);
    unlockFuel(missMatch);
    missMatch.wind = 0;
    B.placePatriot(missMatch.left);
    B.placePatriot(missMatch.right);
    missMatch.rulers.left.balls = 8;
    missMatch.rulers.left.powder = 80;
    missMatch.rulers.right.interceptors = 3;
    B.BALANCE.interceptChance = 0;
    const cratersMiss = missMatch.terrain.craters.length;
    B.launch(missMatch, 48, 20);
    const miss = missMatch.shot.intercept;
    check("miss armed", !!(miss && miss.success === false));
    check("miss spent", missMatch.rulers.right.interceptors === 2);
    check("attack path kept", missMatch.shot.path.length === cleanLen, missMatch.shot.path.length + " vs " + cleanLen);
    check("attack hit kept", missMatch.shot.hit.type + ":" + Math.round(missMatch.shot.hit.x) + "," + Math.round(missMatch.shot.hit.y) === cleanHit, cleanHit);
    const last = miss.path[miss.path.length - 1];
    const off = last.y < -30 || last.x < -30 || last.x > B.BALANCE.viewW + 30;
    check("miss leaves screen", off, JSON.stringify(last));
    let minGap = Infinity;
    for (let i = 0; i < miss.path.length; i++) {
      const j = miss.launchAt + i;
      if (j < 0 || j >= missMatch.shot.path.length) continue;
      const d = Math.hypot(miss.path[i].x - missMatch.shot.path[j].x, miss.path[i].y - missMatch.shot.path[j].y);
      if (d < minGap) minGap = d;
    }
    check("miss stays clear", minGap > 36, String(Math.round(minGap)));
    let guard2 = 0;
    while (missMatch.phase === "fly" && guard2 < 3000) {
      B.advance(missMatch, 1 / 60);
      guard2++;
    }
    check("miss log", missMatch.log.indexOf("The interceptor misses.") === 0, missMatch.log);
    check("attack still resolves", missMatch.terrain.craters.length > cratersMiss, missMatch.log);

    const bare = B.createMatch("tal");
    B.openTurn(bare);
    unlockFuel(bare);
    bare.wind = 0;
    B.placePatriot(bare.right);
    bare.rulers.right.interceptors = 0;
    bare.rulers.left.balls = 4;
    bare.rulers.left.powder = 40;
    B.launch(bare, 48, 20);
    check("no stock no fire", bare.shot && !bare.shot.intercept);

    bare.phase = "aim";
    bare.shot = null;
    bare.rulers.left.balls = 4;
    bare.rulers.left.powder = 40;
    bare.rulers.right.interceptors = 5;
    bare.right.patriot.type = "gap";
    B.launch(bare, 48, 20);
    check("destroyed no fire", bare.shot && !bare.shot.intercept && bare.rulers.right.interceptors === 5, bare.log);

    const back = B.createMatch("tal");
    B.openTurn(back);
    unlockFuel(back);
    back.wind = 0;
    back.rulers.left.gold = B.BALANCE.patriotCost + B.BALANCE.interceptorCost * 2;
    B.playerBuy(back, "patriot");
    B.playerBuy(back, "interceptor");
    B.playerBuy(back, "interceptor");
    back.phase = "aim";
    back.turn = "right";
    back.rulers.right.balls = 5;
    back.rulers.right.powder = 40;
    B.BALANCE.interceptChance = 1;
    const stock = back.rulers.left.interceptors;
    B.launch(back, 48, 20);
    check("player intercepts", !!(back.shot && back.shot.intercept && back.shot.intercept.success));
    check("player stock spent", back.rulers.left.interceptors === stock - 1, String(back.rulers.left.interceptors));
    let guard3 = 0;
    while (back.phase === "fly" && guard3 < 2000) {
      B.advance(back, 1 / 60);
      guard3++;
    }
    check("player hit log", back.log.indexOf("Your interceptor strikes") >= 0, back.log);

    const col = B.createMatch("tal");
    B.openTurn(col);
    col.wind = 0;
    B.placePatriot(col.left);
    const direct = B.fly(col, "left", 16, 18, false).hit;
    check("rocket hits patriot", direct.type === "block" && direct.block && direct.block.type === "patriot", direct.type + " " + (direct.block && direct.block.type));

    const stat = B.createMatch("tal");
    B.openTurn(stat);
    unlockFuel(stat);
    stat.wind = 0;
    B.placePatriot(stat.right);
    B.BALANCE.interceptChance = 0.5;
    let hits = 0;
    const N = 30;
    for (let i = 0; i < N; i++) {
      stat.phase = "aim";
      stat.turn = "left";
      stat.shot = null;
      stat.rulers.left.balls = 4;
      stat.rulers.left.powder = 40;
      stat.rulers.right.interceptors = 2;
      B.launch(stat, 52, 18);
      if (stat.shot && stat.shot.intercept && stat.shot.intercept.success) hits++;
    }
    check("about half", hits >= 8 && hits <= 22, hits + "/" + N);

    let badMiss = 0;
    const samples = [];
    B.BALANCE.interceptChance = 0;
    for (let a = 24; a <= 72; a += 12) {
      stat.phase = "aim";
      stat.turn = "left";
      stat.shot = null;
      stat.rulers.left.balls = 4;
      stat.rulers.left.powder = 60;
      stat.rulers.right.interceptors = 2;
      if (!B.patriotAlive(stat.right)) B.placePatriot(stat.right);
      B.launch(stat, a, 16);
      const m = stat.shot && stat.shot.intercept;
      if (!m) {
        badMiss++;
        samples.push("no ice " + a + " " + (stat.shot ? stat.shot.hit.type : "noshot"));
        continue;
      }
      const end = m.path[m.path.length - 1];
      const leftScreen = end.y < -30 || end.x < -30 || end.x > B.BALANCE.viewW + 30;
      let gap = Infinity;
      for (let i = 0; i < m.path.length; i++) {
        const j = m.launchAt + i;
        if (j < 0 || j >= stat.shot.path.length) continue;
        const d = Math.hypot(m.path[i].x - stat.shot.path[j].x, m.path[i].y - stat.shot.path[j].y);
        if (d < gap) gap = d;
      }
      if (!leftScreen || gap < 36) {
        badMiss++;
        samples.push(a + " off=" + leftScreen + " gap=" + Math.round(gap));
      }
    }
    check("misses across angles", badMiss === 0, samples.join("; "));

    window.__interceptReport = { failures: failures, hits: hits, meetClear: meetClear };
  } catch (error) {
    window.__interceptReport = { failures: failures, crash: String(error && error.stack || error) };
  } finally {
    B.BALANCE.interceptChance = 0.5;
  }
})();
