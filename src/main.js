(function () {
  const B = (window.Baller = window.Baller || {});
  const b = B.BALANCE;

  const menu = document.getElementById("menu");
  const play = document.getElementById("play");
  const over = document.getElementById("over");
  const decree = document.getElementById("decree");
  const decreeOk = document.getElementById("decree-ok");
  const allies = document.getElementById("allies");
  const alliesOk = document.getElementById("allies-ok");
  const ultimatum = document.getElementById("ultimatum");
  const ultimatumDismiss = document.getElementById("ultimatum-dismiss");
  const ultimatumSurrender = document.getElementById("ultimatum-surrender");
  const ultimatumSpeech = document.getElementById("ultimatum-speech");
  const ultimatumEyebrow = document.getElementById("ultimatum-eyebrow");
  const peaceTalks = document.getElementById("peace-talks");
  const canvas = document.getElementById("view");
  const ctx = canvas.getContext("2d");
  const frameEl = document.getElementById("frame");
  canvas.width = b.viewW;
  canvas.height = b.viewH;
  const storyMode = document.getElementById("story-mode");
  const freeGame = document.getElementById("free-game");
  const freeSoon = document.getElementById("free-soon");
  let selectedMapId = B.MAPS[0].id;
  const status = document.getElementById("status");
  const detail = document.getElementById("detail");
  const angle = document.getElementById("angle");
  const powder = document.getElementById("powder");
  const fuelMeter = document.getElementById("fuel-meter");
  const fuelShort = document.getElementById("fuel-short");
  const angleVal = document.getElementById("angle-val");
  const powderVal = document.getElementById("powder-val");
  const statsPanel = document.getElementById("stats");
  const enemyPanel = document.getElementById("enemy-stats");
  const tip = document.getElementById("tip");
  const fire = document.getElementById("fire");
  const pass = document.getElementById("pass");
  const shop = document.getElementById("shop");
  const research = document.getElementById("research");
  const researchA2a = document.getElementById("research-a2a");
  const researchFuel = document.getElementById("research-fuel");
  const researchGuidance = document.getElementById("research-guidance");
  const researchRocketDamage = document.getElementById("research-rocket-damage");
  const researchDrone = document.getElementById("research-drone");
  const researchDroneRange = document.getElementById("research-drone-range");
  const researchNuclear = document.getElementById("research-nuclear");
  const planDrone = document.getElementById("plan-drone");
  const a2a = document.getElementById("a2a");
  const alliedHelp = document.getElementById("allied-help");
  const alliesSpeech = document.getElementById("allies-speech");
  const alliesEyebrow = document.getElementById("allies-eyebrow");
  const alliesPortrait = document.getElementById("allies-portrait") || allies.querySelector(".portrait img");
  const a2aRockets = document.getElementById("a2a-rockets");
  const a2aDrones = document.getElementById("a2a-drones");

  let match = null;
  let playMode = "story";
  let last = 0;
  let aiToken = 0;
  let decreeTimer = 0;
  let zoom = 1;
  let fitView = true;

  function zoomToFit() {
    if (play.hidden) return;
    if (!frameEl.clientWidth) {
      requestAnimationFrame(zoomToFit);
      return;
    }
    frameEl.style.overflowX = "hidden";
    const width = frameEl.clientWidth;
    zoom = Math.min(1, width / b.viewW);
    canvas.style.width = width + "px";
    canvas.style.height = Math.round(b.viewH * zoom) + "px";
    frameEl.scrollLeft = 0;
    fitView = true;
  }

  function applyZoom(next, clientX) {
    const minZoom = Math.min(1, frameEl.clientWidth / b.viewW);
    next = Math.max(minZoom, Math.min(1, next));
    if (next <= minZoom * 1.002) {
      zoomToFit();
      return;
    }
    const frameRect = frameEl.getBoundingClientRect();
    const viewX = clientX == null ? frameEl.clientWidth / 2 : clientX - frameRect.left - frameEl.clientLeft;
    const worldX = (frameEl.scrollLeft + viewX) / zoom;
    zoom = next;
    fitView = false;
    frameEl.style.overflowX = "auto";
    canvas.style.width = b.viewW * zoom + "px";
    canvas.style.height = b.viewH * zoom + "px";
    const maxScroll = Math.max(0, canvas.offsetWidth - frameEl.clientWidth);
    frameEl.scrollLeft = Math.max(0, Math.min(maxScroll, worldX * zoom - viewX));
  }

  angle.min = String(b.angleMin);
  angle.max = String(b.angleMax);
  powder.min = String(b.powderMin);
  powder.max = String(b.powderBase);

  const LEDGER = [
    { key: "gold", icon: "ico-gold", name: "Gold" },
    { key: "income", icon: "ico-income", name: "Income" },
    { key: "population", icon: "ico-pop", name: "Population" },
    { key: "towers", icon: "ico-tower", name: "Mines" },
    { key: "balls", icon: "ico-rocket", name: "Rockets" },
    { key: "drones", icon: "ico-drone", name: "Drones" },
    { key: "powder", icon: "ico-fuel", name: "Fuel" },
    { key: "interceptors", icon: "ico-a2a", name: "Air-to-air" },
    { key: "patriot", icon: "ico-patriot", name: "Patriot" },
  ];

  const RESEARCH = [
    { key: "a2aLevel", icon: "ico-a2a", name: "Air-to-air efficiency" },
    { key: "fuelCapacity", icon: "ico-fuel", name: "Rocket fuel capacity" },
    { key: "guidanceLevel", icon: "ico-guidance", name: "Rocket guidance" },
    { key: "rocketDamageLevel", emoji: "💥", name: "Rocket blast radius", freeOnly: true },
    { key: "droneLevel", icon: "ico-drone", name: "Drone factory" },
    { key: "droneRangeLevel", icon: "ico-drone", name: "Drone range" },
  ];

  function addStat(row, item) {
    const stat = document.createElement("span");
    stat.className = "stat";
    stat.dataset.stat = item.key;
    stat.title = item.name;
    const mark = item.emoji
      ? '<span class="ico emoji" aria-hidden="true">' + item.emoji + "</span>"
      : '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#' + item.icon + '"></use></svg>';
    stat.innerHTML =
      mark +
      '<span class="meta"><b class="n" data-n="' + item.key + '">0</b><span class="name">' + item.name + "</span></span>";
    if (item.freeOnly) stat.hidden = true;
    row.appendChild(stat);
  }

  function buildLedger(panel) {
    const row = panel.querySelector(".stats");
    LEDGER.forEach(function (item) { addStat(row, item); });
    const research = panel.querySelector(".research-levels");
    RESEARCH.forEach(function (item) { addStat(research, item); });
  }

  buildLedger(statsPanel);
  buildLedger(enemyPanel);
  addStat(statsPanel.querySelector(".stats"), { key: "oil", icon: "ico-oil", name: "Oil rigs" });
  statsPanel.querySelector('[data-stat="towers"]').after(statsPanel.querySelector('[data-stat="oil"]'));
  statsPanel.querySelector('[data-stat="oil"]').hidden = true;
  addStat(enemyPanel.querySelector(".stats"), { key: "oil", icon: "ico-oil", name: "Oil rigs" });
  enemyPanel.querySelector('[data-stat="towers"]').after(enemyPanel.querySelector('[data-stat="oil"]'));
  addStat(enemyPanel.querySelector(".stats"), { key: "nukes", icon: "ico-nuke", name: "Nukes" });
  enemyPanel.querySelector('[data-stat="nukes"]').hidden = true;
  addStat(statsPanel.querySelector(".stats"), { key: "nukes", icon: "ico-nuke", name: "Nukes" });
  statsPanel.querySelector('[data-stat="nukes"]').hidden = true;

  function ledgerValues(ruler, castle) {
    return {
      gold: ruler.gold,
      income: B.turnIncome(ruler, castle),
      population: ruler.population,
      towers: B.towerCount(castle),
      balls: ruler.balls,
      drones: ruler.drones || 0,
      powder: ruler.powder,
      interceptors: ruler.interceptors,
      patriot: B.patriotAlive(castle) ? 1 : 0,
      a2aLevel: ruler.a2aLevel || 0,
      fuelCapacity: B.fuelCapacity(ruler),
      guidanceLevel: B.guidanceLevel(ruler),
      rocketDamageLevel: B.rocketDamageLevel(ruler),
      droneLevel: ruler.droneLevel || 0,
      droneRangeLevel: B.droneRangeLevel(ruler),
    };
  }

  function paintLedger(panel, values) {
    const shown = LEDGER.concat(RESEARCH);
    const sig = shown.map(function (item) { return values[item.key]; }).join(",");
    if (panel.dataset.sig === sig) return;
    panel.dataset.sig = sig;
    shown.forEach(function (item) {
      const stat = panel.querySelector('[data-stat="' + item.key + '"]');
      const value = values[item.key];
      stat.querySelector("[data-n]").textContent = String(value);
      stat.setAttribute("aria-label", item.name + " " + value);
      if (item.key === "patriot") stat.classList.toggle("off", value === 0);
    });
  }

  function incomeTitle(ruler, castle) {
    const towers = castle ? B.towerCount(castle) : 0;
    const oils = castle ? B.oilCount(castle) : 0;
    const towerGold = towers * b.towerIncome;
    const oilGold = oils * b.oilIncome;
    const popGold = B.turnIncome(ruler, castle) - towerGold - oilGold;
    const parts = [];
    if (popGold > 0) parts.push("Population earns " + popGold + " gold.");
    if (towers > 0) {
      const noun = towers === 1 ? "mine earns " : "mines earn ";
      parts.push(towers + " " + noun + towerGold + " gold.");
    }
    if (oils > 0) {
      const noun = oils === 1 ? "oil rig earns " : "oil rigs earn ";
      parts.push(oils + " " + noun + oilGold + " gold.");
    }
    if (!parts.length) return "No income this turn.";
    return parts.join(" ");
  }

  function paintIncome(panel, ruler, castle) {
    const stat = panel.querySelector('[data-stat="income"]');
    if (!stat) return;
    const title = incomeTitle(ruler, castle);
    if (stat.title === title) return;
    stat.title = title;
    stat.setAttribute("aria-label", "Income. " + title);
  }

  function oilTitle(count, destroyed) {
    const each = b.oilIncome;
    let text;
    if (count <= 0) text = "Each oil rig earns " + each + " gold a turn. None are standing.";
    else {
      const total = count * each;
      const noun = count === 1 ? "oil rig earns " : "oil rigs earn ";
      text = count + " " + noun + total + " gold a turn.";
    }
    if (destroyed > 0) {
      const times = destroyed === 1 ? "1 time" : destroyed + " times";
      text += " Destroyed " + times + ".";
    }
    return text;
  }

  function paintOil(panel, castle, destroyed) {
    const stat = panel.querySelector('[data-stat="oil"]');
    if (!stat) return;
    const hasRigs = !!(castle && castle.rigs && castle.rigs.length);
    stat.hidden = !hasRigs;
    if (!hasRigs) return;
    const count = B.oilCount(castle);
    const label = String(count);
    const title = oilTitle(count, destroyed || 0);
    const number = stat.querySelector("[data-n]");
    stat.dataset.destroyed = String(destroyed || 0);
    if (number.textContent === label && stat.title === title) return;
    number.textContent = label;
    stat.title = title;
    stat.setAttribute("aria-label", title);
  }

  function paintNukes(panel, count, always) {
    const stat = panel.querySelector('[data-stat="nukes"]');
    const shown = always || count > 0;
    const label = String(count);
    if (stat.hidden === !shown && stat.querySelector("[data-n]").textContent === label) return;
    stat.hidden = !shown;
    stat.querySelector("[data-n]").textContent = label;
    stat.setAttribute("aria-label", "Nukes " + label);
  }

  function priceButtons() {
    const p = B.prices();
    const ball = document.getElementById("buy-ball");
    const powderBtn = document.getElementById("buy-powder");
    const launcher = document.getElementById("buy-launcher");
    const wall = document.getElementById("wall");
    const tower = document.getElementById("tower");
    const patriot = document.getElementById("buy-patriot");
    const a2a = document.getElementById("buy-a2a");
    ball.textContent = "Rocket (" + p.ballCost + ")";
    powderBtn.textContent = "Rocket Fuel (" + p.powderCost + ")";
    launcher.textContent = "Buy launcher (" + p.launcherCost + ")";
    wall.textContent = "Wall (" + p.wallCost + ")";
    tower.textContent = "Mine tower (" + p.towerCost + ")";
    patriot.textContent = "Patriot (" + p.patriotCost + ")";
    a2a.textContent = "Air-to-air (" + p.interceptorCost + ")";
    document.getElementById("buy-drone").textContent = "Attack drone (" + p.droneCost + ")";
    document.getElementById("buy-nuke").textContent = "Nuclear rocket (" + b.nuclearRocketCost + ")";
    ball.title = "One shot from the launcher. Firing it spends the fuel you set on the slider.";
    powderBtn.title = "Ten units of fuel. A shot spends the charge you choose, from 3 up to your fuel capacity.";
    launcher.title = "Rebuilds the launcher after it has been destroyed. You need it to fire rockets.";
    document.getElementById("mobilisation").title = "Once a turn, spend 1 population. With a launcher standing, that buys one rocket. With the launcher gone, your people rebuild it for free.";
    wall.title = "A small patch of wall. Click the map where it touches your castle.";
    tower.title = "A mine on the outer ground. Each one that is still standing earns 30 gold a turn. Three at most.";
    patriot.title = "A battery by the hill. It is what fires your air-to-air missiles. Only one can stand, and it can be destroyed.";
    a2a.title = "One missile for the patriot. It tries to shoot down an incoming rocket, and it always hits a drone you have set it to target. It does nothing until the patriot is standing.";
  }

  function myTurn() {
    return match && match.phase === "aim" && match.turn === "left" && decree.hidden && allies.hidden && ultimatum.hidden;
  }

  function paintFuelMeter(ruler) {
    const cap = Math.max(1, B.fuelCapacity(ruler));
    const stock = Math.max(0, ruler.powder);
    const short = Math.max(0, cap - stock);
    fuelMeter.style.setProperty("--stock", String(short > 0 ? stock : 1));
    fuelMeter.style.setProperty("--short", String(short));
    fuelShort.hidden = short <= 0;
    fuelMeter.classList.toggle("is-empty", stock <= 0);
    if (short > 0) fuelMeter.title = short + " short of a fuel capacity of " + cap + ".";
    else fuelMeter.removeAttribute("title");
  }

  function refresh() {
    if (!match) return;
    const ruler = match.rulers.left;
    status.textContent = match.log;
    detail.textContent = match.detail;
    const chargeMax = Math.min(B.fuelCapacity(ruler), ruler.powder);
    powder.max = String(Math.max(b.powderMin, chargeMax));
    paintFuelMeter(ruler);
    if (ruler.powder >= b.powderMin && match.left.powder > chargeMax) {
      match.left.powder = chargeMax;
      B.syncAim(match);
    }
    if (myTurn()) {
      angle.value = String(match.left.elevation);
      powder.value = String(match.left.powder);
    }
    angleVal.textContent = angle.value + "°";
    powderVal.textContent = powder.value;
    paintLedger(statsPanel, ledgerValues(ruler, match.left));
    paintLedger(enemyPanel, ledgerValues(match.rulers.right, match.right));
    paintIncome(statsPanel, ruler, match.left);
    paintIncome(enemyPanel, match.rulers.right, match.right);
    paintOil(statsPanel, match.left, 0);
    paintOil(enemyPanel, match.right, match.oilRigsDestroyed || 0);
    paintNukes(enemyPanel, match.mode === "free" ? 0 : (match.rulers.right.nukes || 0), false);
    paintNukes(statsPanel, match.mode === "free" ? 0 : (ruler.nukes || 0), match.mode !== "free" && !!ruler.nuclearProgram);
    const aiming = !!(match.droneAim);
    const usingPutty = !!(match.wallTool);
    const canShoot = myTurn() && B.hasType(match.left, "cannon") && ruler.balls > 0 && ruler.powder >= b.powderMin;
    fire.disabled = !canShoot || aiming || usingPutty;
    pass.disabled = !myTurn() || aiming || usingPutty;
    shop.disabled = !myTurn();
    document.getElementById("wall").disabled = !myTurn() || usingPutty;
    research.disabled = !myTurn();
    paintResearch(ruler);
    const hasPatriot = B.patriotAlive(match.left);
    a2a.hidden = !hasPatriot;
    a2a.disabled = !myTurn();
    alliedHelp.disabled = !myTurn();
    peaceTalks.hidden = !match.peaceTalks;
    if (hasPatriot) {
      a2aRockets.checked = ruler.targetRockets !== false;
      a2aDrones.checked = ruler.targetDrones !== false;
    }
    planDrone.hidden = !(ruler.drones > 0);
    planDrone.disabled = !myTurn() || usingPutty;
    planDrone.textContent = aiming ? "Cancel drone attack" : "Plan a drone attack";
    const factory = ruler.droneLevel || 0;
    const built = ruler.dronesBought || 0;
    const buyDrone = document.getElementById("buy-drone");
    buyDrone.hidden = factory < 1;
    buyDrone.disabled = factory < 1 || built >= factory;
    buyDrone.title = "One drone, after you have a drone factory. You can buy only as many as the factory level each turn. Plan the attack, then click the map once for each drone. They fly at the same time. The blast is half a rocket's, and the enemy can intercept it.";
    if (factory > 0) {
      buyDrone.title += " Built " + built + " of " + factory + " this turn.";
    }
    const buyNuke = document.getElementById("buy-nuke");
    buyNuke.hidden = match.mode === "free" || !ruler.nuclearProgram;
    buyNuke.title = "Adds one nuclear rocket to the arsenal count.";
    researchNuclear.hidden = match.mode === "free";
    alliedHelp.hidden = match.mode === "free" || !match.alliedHelp;
    document.getElementById("buy-launcher").hidden = B.hasType(match.left, "cannon");
    document.getElementById("buy-patriot").hidden = B.patriotAlive(match.left);
    const mobilise = document.getElementById("mobilisation");
    mobilise.disabled = !myTurn() || !!ruler.mobilised || ruler.population < 1;
    mobilise.title = "Once a turn, spend 1 population. With a launcher standing, that buys one rocket. With the launcher gone, your people rebuild it for free.";
    if (ruler.mobilised) mobilise.title = "Already used this turn. " + mobilise.title;
    canvas.classList.toggle("aiming-drone", aiming);
    canvas.classList.toggle("using-putty", usingPutty);
    angle.disabled = !myTurn();
    powder.disabled = !myTurn() || ruler.powder < b.powderMin;
  }

  function scheduleAi() {
    const token = ++aiToken;
    window.setTimeout(function () {
      if (token !== aiToken || !match) return;
      if (match.phase !== "aim" || match.turn !== "right") return;
      B.aiAct(match);
      refresh();
    }, 700);
  }

  function showDecree() {
    decree.hidden = false;
    decreeOk.focus();
  }

  function dismissDecree() {
    if (decree.hidden) return;
    decree.hidden = true;
    if (match && match.phase === "aim" && match.turn === "right") scheduleAi();
  }

  const ALLIED_INTRO = alliesSpeech.textContent;
  const ALLIED_EXCUSES = [
    "We would send more, but the more is in a meeting about whether to send more. The meeting has a good feeling about next quarter. Next quarter has not been briefed.",
    "Our warehouses are full of help. Unfortunately the help is palletized for a different war, and repalletizing requires a signature from a person who collects signatures as a hobby.",
    "A second patriot would look eager. Eagerness is not our brand. Our brand is the first patriot, which you already have, and which we consider a complete sentence.",
    "The allies did take a vote. The vote was to take another vote. Democracy is a process, and the process is currently in the hallway, looking for the room.",
    "We have missiles. They are very good missiles. They are also emotionally committed to a training range, and we do not like to break up a happy training range.",
    "Further assistance is in the pipeline. The pipeline is a metaphor. Metaphors do not intercept rockets, which we understand is disappointing, and which we have noted in the metaphor.",
    "Our pilots asked for a weather window. The weather is a policy issue. The policy is that weather is being studied by a committee that meets when the weather is nice.",
    "We sent helmets. Helmets are a foundation. One does not put a second foundation on a foundation. That would be a pile, and piles are not a strategy.",
    "There is a package of aid on my desk. I have moved it from the left side of the desk to the right side. This is what momentum looks like at our level.",
    "We are not saying no. We are saying not now, which is a warmer no, and which we can repeat for you whenever you ask, because repetition is the one resource we have fully funded.",
  ];
  const ALLIED_AID = "The allies have counted your turns, which is a form of affection. Five hundred gold is on the way, and ten air-to-air missiles. We are sorry we cannot send more. The Orc Overlord has nuclear rockets, and a mood, and the allies have done the sober arithmetic of people who would like to go on existing. More help might make him creative. We prefer him bored. You had better be extremely thankful. Extremely. We are listening for it.";
  const ALLIED_CIVILIAN = "This will not play well. Hitting the Orc Overlord's residential buildings is, as the people who watch the pictures have mentioned, not good for publicity. Civilians are a difficult caption. The allies are not sure they can sustain the help if his population suffers any further. We remain supportive. Support is a delicate instrument, and it does not enjoy being photographed next to a ruined house.";
  const ALLIED_GRANT = "The allies have counted your ruins. At least six of your nine residential buildings are gone, and a number like that gets a meeting. We have therefore come together to fund a reconstruction grant. The grant puts the houses back. They will be new. The people do not come back with the walls. Whoever is still living stays in the house they were already in. If no one is left, then the street is empty rooms, and an empty room is what a grant can honestly build. You had better be thankful. The paint is fresh, and thankfulness is still the part that does not have to be shipped.";
  const ALLIED_OIL = "Have you lost your mind?! That is the third enemy oil rig you have blown up! We sent you weapons to defend your country, not to set fire to the global energy market! Since you started using the Orc Overlord's drilling rigs for target practice, the oil prices went up through the roof, and it is hurting our economy! Filling a tank at home now costs a small mortgage, our voters are furious, and the treasury ministers are shouting in the hallway! Why we don't switch to renewable energy? Well, the lizard party's politicians are funded by the oil industry, they wouldn't like that, would they? Stop shooting at the damned oil rigs immediately, or the next committee meeting will be about you!";
  const ALLIED_PORTRAIT_CALM = {
    src: "allies.jpeg",
    alt: "The leader of the allies, offering a handshake from his office",
  };
  const ALLIED_PORTRAIT_ANGRY = {
    src: "Angry allied leader.jpeg",
    alt: "The leader of the allies, furious in his office",
  };

  function setAlliedSpeech(text, button, eyebrow, angry) {
    alliesSpeech.textContent = text;
    alliesOk.textContent = button;
    alliesEyebrow.textContent = eyebrow;
    if (alliesPortrait) {
      const pic = angry ? ALLIED_PORTRAIT_ANGRY : ALLIED_PORTRAIT_CALM;
      alliesPortrait.src = pic.src;
      alliesPortrait.alt = pic.alt;
    }
  }

  function showAllies() {
    if (!match || !match.pendingAllies || !allies.hidden) return;
    match.pendingAllies = false;
    match.alliedHelp = true;
    setAlliedSpeech(ALLIED_INTRO, "We are thankful", "A rules-based partnership");
    allies.hidden = false;
    alliesOk.focus();
    refresh();
  }

  function askAllies() {
    if (!match || !match.alliedHelp || !myTurn()) return;
    const i = match.excuseIndex || 0;
    setAlliedSpeech(ALLIED_EXCUSES[i], "Perhaps later", "A further consultation");
    match.excuseIndex = (i + 1) % ALLIED_EXCUSES.length;
    allies.hidden = false;
    alliesOk.focus();
    refresh();
  }

  function showAlliedAid() {
    if (!match || !match.pendingAid || !allies.hidden) return;
    match.pendingAid = false;
    match.alliedHelp = true;
    setAlliedSpeech(ALLIED_AID, "We are extremely thankful", "A modest installment");
    allies.hidden = false;
    alliesOk.focus();
    refresh();
  }

  function showCivilian() {
    if (!match || !match.pendingCivilian || !allies.hidden) return;
    match.alliedTopic = "civilian";
    setAlliedSpeech(ALLIED_CIVILIAN, "We will be careful", "A note on publicity");
    allies.hidden = false;
    alliesOk.focus();
    refresh();
  }

  function showOil() {
    if (!match || !match.pendingOil || !allies.hidden) return;
    match.alliedTopic = "oil";
    setAlliedSpeech(ALLIED_OIL, "We will be careful", "An economic emergency", true);
    allies.hidden = false;
    alliesOk.focus();
    refresh();
  }

  function showGrant() {
    if (!match || !match.pendingGrant || !allies.hidden) return;
    if (!match.grantBuilt) {
      B.rebuildHouses(match.left);
      match.grantBuilt = true;
      match.log = "The allies rebuild your houses. The people stay where they were.";
    }
    match.alliedTopic = "grant";
    setAlliedSpeech(ALLIED_GRANT, "We are thankful", "A reconstruction grant");
    allies.hidden = false;
    alliesOk.focus();
    refresh();
  }

  function dismissAllies() {
    if (allies.hidden) return;
    const topic = match && match.alliedTopic;
    allies.hidden = true;
    if (match) {
      if (topic === "grant") {
        match.pendingGrant = false;
        match.grantBuilt = false;
      } else if (topic === "oil") {
        match.pendingOil = false;
      } else if (topic === "civilian") {
        match.pendingCivilian = false;
      }
      match.alliedTopic = null;
    }
    refresh();
    if (match && match.pendingGrant) showGrant();
    else if (match && match.pendingOil) showOil();
    else if (match && match.pendingCivilian) showCivilian();
    else if (match && match.phase === "aim" && match.turn === "right" && ultimatum.hidden) scheduleAi();
  }

  const ULTIMATUM_INTRO = ultimatumSpeech.textContent;
  const ULTIMATUM_BY_TURN = {
    5: ULTIMATUM_INTRO,
    25: "You have had twenty-five turns to surrender, and you spent them throwing rocks. How persistent. How unwise. We are therefore obliged, purely in self-defense, to mention the nuclear rockets again: sixty-seven of them, still aimed at you, your allies, your king, and whatever is left of the hillside. We have already drafted the communiqué for afterward. It is one sentence. It says you left us no choice. Surrender, and this remains a stern conversation. Refuse—we would rather you did not refuse—and we will annihilate every one of you. The communiqué is ready. You do not have to be.",
    45: "You have had forty-five turns to surrender. Forty-five. Our war council has begun to ask, very politely, whether a rocket that is never launched still counts as diplomacy. It counts. We count. You threw rocks as if sixty-seven nuclear rockets were a metaphor. They are not a metaphor. They have serial numbers. Surrender. We would like you to surrender. We have already named the crater. We have already scheduled the parade. Refuse, and we will annihilate every one of you—you, your allies, your king, the hillside—and our war council can stop being polite.",
    65: "Sixty-five turns. Please. We are saying please, which is still an order, which is still self-defense. We have asked. We have explained. We have sat on this throne and waited for you to do the one thing that would spare us the embarrassment of having to mean it. Surrender. Surrender now. Surrender this afternoon. We will call it wisdom. We will call it your idea. We will even let your baker keep his shop, for a week. Refuse, and the sixty-seven nuclear rockets will finally have a job, and it will be your fault for making a warlord beg. We are begging. Stop making us beg. There is no patience left. There is only you, still standing, turning our threats into a hobby.",
  };
  const PEACE_SPEECHES = [
    "You want peace talks? Wonderful. Let us begin with the obvious: you and your entire population are Nazis. Even your baker. Especially your baker. Every loaf is an act of ideological aggression against orc kind, and we cannot sign a treaty with sourdough.",
    "The war and the suffering end instantly—this very afternoon—if you simply surrender. Think of the humanitarian relief when we stop bombing you! Truly, every rocket we fire is your fault for still being there when it lands.",
    "Before we discuss borders, allow me a brief forty-minute lecture on ninth-century orc war history. When Chieftain Grak the Unwashed crossed this valley to steal a goat, he established an eternal legal precedent. Where is the goat? We are still waiting.",
    "Let us consult the archives on why your country belongs to orcs. In the year 312, an orc dropped his helmet on your side of the hill. By ancient orcish property law, everything within sight of the helmet is our ancestral homeland. You are merely squatting on our hat.",
    "A historical lecture on why you are a Nazi: centuries ago, your ancestors built a wall to keep our raiding parties out. Refusing to be pillaged is the textbook definition of fascism. We have charts. An orc professor drew them in mud.",
    "Your country is not even a real country. It was invented by a confused cartographer who sneezed on a map during the Third Goblin Synod. We are simply correcting a clerical error with high explosives.",
    "We are the victims here. Do you know how exhausting it is to haul rockets up a hill every turn while you stubbornly refuse to die? Our gunners have lower-back pain. Nobody in the international community talks about orc lumbar trauma.",
    "Look at your so-called democracy—not a single Warlord-for-Life on the ballot, no skull throne, no mandatory applause. Frankly, your people are begging to be liberated from the tyranny of not being ruled by me.",
    "Peace is our highest value, which is why we brought sixty-seven nuclear rockets to the negotiating table. Nothing says 'good-faith diplomacy' like a glowing crater where your keep used to be.",
    "Here is our final, most generous peace proposal: you give us your castle, your gold, your mines, and your king's head on a pike, and in return we promise to consider not invading the next valley until Tuesday. <em>And so on, and so forth.</em>",
  ];

  function setUltimatumSpeech(html, eyebrow) {
    ultimatumSpeech.innerHTML = html;
    ultimatumEyebrow.textContent = eyebrow;
  }

  function showUltimatum() {
    if (!match || !match.pendingUltimatum || !ultimatum.hidden) return;
    match.pendingUltimatum = false;
    match.peaceTalks = true;
    const speech = ULTIMATUM_BY_TURN[match.ultimatumTurn] || ULTIMATUM_INTRO;
    setUltimatumSpeech(speech, "A limited nuclear operation");
    ultimatum.hidden = false;
    ultimatumDismiss.focus();
    refresh();
  }

  function initiatePeaceTalks() {
    if (!match || !match.peaceTalks || !myTurn()) return;
    const i = match.peaceIndex || 0;
    setUltimatumSpeech(PEACE_SPEECHES[i], "Peace negotiations");
    match.peaceIndex = (i + 1) % PEACE_SPEECHES.length;
    ultimatum.hidden = false;
    ultimatumDismiss.focus();
    refresh();
  }

  function dismissUltimatum() {
    if (ultimatum.hidden) return;
    ultimatum.hidden = true;
    refresh();
  }

  function surrender() {
    if (!match || ultimatum.hidden) return;
    ultimatum.hidden = true;
    match.phase = "over";
    match.winner = "surrender";
    if (B.silenceFlights) B.silenceFlights(match);
    match.shot = null;
    match.droneAim = null;
    match.wallTool = null;
    match.log = "You surrender.";
    match.detail = "The Orc Overlord accepts, and calls it peace.";
    showOver();
    refresh();
  }

  function start(mode) {
    playMode = mode === "free" ? "free" : "story";
    aiToken++;
    window.clearTimeout(decreeTimer);
    decree.hidden = true;
    allies.hidden = true;
    ultimatum.hidden = true;
    if (freeSoon) freeSoon.hidden = true;
    match = B.createMatch(selectedMapId, playMode);
    if (playMode === "story") match.turn = "right";
    B.openTurn(match);
    priceButtons();
    menu.hidden = true;
    over.hidden = true;
    play.hidden = false;
    refresh();
    zoomToFit();
    last = performance.now();
    if (playMode !== "story") return;
    const token = aiToken;
    decreeTimer = window.setTimeout(function () {
      if (token !== aiToken || !match || play.hidden) return;
      showDecree();
    }, 2000);
  }

  function livesLost(side) {
    const start = match.startPop && match.startPop[side];
    const now = match.rulers[side] ? match.rulers[side].population : 0;
    if (start == null) return 0;
    return Math.max(0, start - now);
  }

  function livesLine(lost, mobilised) {
    const n = Math.max(0, lost || 0);
    const sent = Math.max(0, mobilised || 0);
    if (!sent) return String(n);
    return n + ", including " + sent + " mobilised";
  }

  function victorySpeech(turns) {
    const n = turns || 0;
    const stood = n < 1
      ? "Before your own turn had come, you stood"
      : n === 1
        ? "For one turn you stood"
        : "For " + n + " turns you stood";
    return "The civilized world would like a moment. We practiced this in the mirror, and then we practiced being the sort of people who do not cry at a podium, and then we cried anyway. " + stood + " on that hill while we sent helmets, and speeches, and the kind of courage that fits in a communiqué. He had sixty-seven nuclear rockets and a theory about your country. You had a king, a bakery, and the bad manners to go on existing. The Overlord is dead. We are so relieved we can hardly stand up straight. You are the defender of the civilized world, which is a large thing to say, and which we are saying because it is true, and because we would like someone brave to have done it. Be proud. We are proud in the smaller way, the way of people who were kept safe by someone else and have just noticed.";
  }

  function showStoryVictory() {
    document.getElementById("vic-turns").textContent = String(match.playerTurn || 0);
    document.getElementById("vic-rockets").textContent = String(match.rocketsFired || 0);
    document.getElementById("vic-drones").textContent = String(match.dronesFired || 0);
    document.getElementById("vic-oil").textContent = String(match.oilRigsDestroyed || 0);
    document.getElementById("vic-homes").textContent = String(match.residentialHits || 0);
    document.getElementById("vic-lives-you").textContent = livesLine(livesLost("left"), match.mobilised);
    document.getElementById("vic-lives-orc").textContent = String(livesLost("right"));
    document.getElementById("victory-speech").textContent = victorySpeech(match.playerTurn || 0);
    document.getElementById("over-plain").hidden = true;
    document.getElementById("over-victory").hidden = false;
    over.hidden = false;
    document.getElementById("victory-again").focus();
  }

  function showOver() {
    const storyWin = match.mode !== "free" && match.winner === "left";
    if (storyWin) {
      showStoryVictory();
      return;
    }
    document.getElementById("over-victory").hidden = true;
    document.getElementById("over-plain").hidden = false;
    const title = document.getElementById("over-title");
    const text = document.getElementById("over-text");
    if (match.winner === "left") {
      title.textContent = "Victory";
      text.textContent = "The Orc Overlord is dead.";
    } else if (match.winner === "surrender") {
      title.textContent = "Surrender";
      text.textContent = "You lay down your arms. The Orc Overlord accepts with great reluctance and even greater satisfaction. The nuclear rockets, he assures you, were only ever for peace.";
    } else if (match.winner === "right") {
      title.textContent = "Defeat";
      text.textContent = "Your king is dead.";
    } else {
      title.textContent = "Draw";
      text.textContent = "Your king and the Orc Overlord are dead.";
    }
    over.hidden = false;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!match || play.hidden) return;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    const stamp = match.phase + match.turn + (match.winner || "") + (match.pendingAllies ? "1" : "0") + (match.pendingAid ? "1" : "0") + (match.pendingCivilian ? "1" : "0") + (match.pendingGrant ? "1" : "0") + (match.pendingOil ? "1" : "0") + (match.pendingUltimatum ? "1" : "0");
    B.advance(match, dt);
    if (status.textContent !== match.log) status.textContent = match.log;
    paintLedger(statsPanel, ledgerValues(match.rulers.left, match.left));
    paintLedger(enemyPanel, ledgerValues(match.rulers.right, match.right));
    paintIncome(statsPanel, match.rulers.left, match.left);
    paintIncome(enemyPanel, match.rulers.right, match.right);
    paintOil(statsPanel, match.left, 0);
    paintOil(enemyPanel, match.right, match.oilRigsDestroyed || 0);
    paintNukes(enemyPanel, match.mode === "free" ? 0 : (match.rulers.right.nukes || 0), false);
    paintNukes(statsPanel, match.mode === "free" ? 0 : (match.rulers.left.nukes || 0), match.mode !== "free" && !!match.rulers.left.nuclearProgram);
    const next = match.phase + match.turn + (match.winner || "") + (match.pendingAllies ? "1" : "0") + (match.pendingAid ? "1" : "0") + (match.pendingCivilian ? "1" : "0") + (match.pendingGrant ? "1" : "0") + (match.pendingOil ? "1" : "0") + (match.pendingUltimatum ? "1" : "0");
    if (next !== stamp) {
      refresh();
      if (match.pendingAllies) showAllies();
      if (match.pendingAid) showAlliedAid();
      if (match.pendingGrant) showGrant();
      if (match.pendingOil) showOil();
      if (match.pendingCivilian) showCivilian();
      if (match.pendingUltimatum) showUltimatum();
      if (match.phase === "over") showOver();
      if (match.phase === "aim" && match.turn === "right" && allies.hidden && ultimatum.hidden) scheduleAi();
    }
    B.drawScene(ctx, match, now);
  }

  frameEl.addEventListener("wheel", function (event) {
    if (play.hidden || !event.deltaY) return;
    event.preventDefault();
    const dy = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * frameEl.clientHeight : event.deltaY;
    applyZoom(zoom * Math.exp(-dy * 0.0016), event.clientX);
  }, { passive: false });

  window.addEventListener("resize", function () {
    if (play.hidden || !fitView) return;
    zoomToFit();
  });

  function unlockAudio() {
    if (B.sfx) B.sfx.unlock();
  }
  document.addEventListener("pointerdown", unlockAudio);
  window.addEventListener("keydown", unlockAudio);

  storyMode.addEventListener("click", function () { start("story"); });
  freeGame.addEventListener("click", function () { start("free"); });
  document.getElementById("again").addEventListener("click", function () { start(playMode); });
  document.getElementById("victory-again").addEventListener("click", function () { start(playMode); });
  decreeOk.addEventListener("click", dismissDecree);
  alliesOk.addEventListener("click", dismissAllies);
  document.getElementById("ask-allies").addEventListener("click", askAllies);
  peaceTalks.addEventListener("click", initiatePeaceTalks);
  ultimatumDismiss.addEventListener("click", dismissUltimatum);
  ultimatumSurrender.addEventListener("click", surrender);

  angle.addEventListener("input", function () {
    if (!myTurn()) return;
    match.left.elevation = Number(angle.value);
    angleVal.textContent = angle.value + "°";
    B.syncAim(match);
  });
  powder.addEventListener("input", function () {
    if (!myTurn()) return;
    match.left.powder = Number(powder.value);
    powderVal.textContent = powder.value;
    B.syncAim(match);
  });

  fire.addEventListener("click", function () {
    if (!myTurn()) return;
    const error = B.launch(match, Number(angle.value), Number(powder.value));
    if (error) match.log = error;
    refresh();
  });
  pass.addEventListener("click", function () {
    if (!myTurn()) return;
    B.passTurn(match);
    refresh();
  });

  function paintResearch(ruler) {
    const free = match && match.mode === "free";
    researchRocketDamage.hidden = !free;
    statsPanel.querySelector('[data-stat="rocketDamageLevel"]').hidden = !free;
    enemyPanel.querySelector('[data-stat="rocketDamageLevel"]').hidden = !free;
    if (free) {
      researchNuclear.hidden = true;
      const level = B.rocketDamageLevel(ruler);
      if (B.rocketDamageMaxed(ruler)) {
        researchRocketDamage.textContent = "💥 Rocket blast radius (" + level + ")";
        researchRocketDamage.disabled = true;
        researchRocketDamage.title = "Rocket blasts reach " + B.rocketBlastRadius(ruler) + ".";
      } else {
        const next = level + 1;
        const cost = B.rocketDamageCost(ruler);
        const radius = B.rocketBlastRadiusAt(next);
        researchRocketDamage.textContent = "💥 Rocket blast radius (" + next + " · " + cost + ")";
        researchRocketDamage.disabled = false;
        researchRocketDamage.title = "Raise rocket blast radius to " + radius + " for " + cost + " gold.";
      }
    } else if (ruler.nuclearProgram) {
      researchNuclear.textContent = "Nuclear program";
      researchNuclear.disabled = true;
      researchNuclear.title = "The program is underway. Nuclear rockets can be bought from the treasury. They cannot be fired.";
    } else {
      const cost = b.nuclearProgramCost;
      researchNuclear.textContent = "Nuclear program (" + cost + ")";
      researchNuclear.disabled = false;
      researchNuclear.title = "Begin the nuclear program for " + cost + " gold. The trefoil appears at 0, and a nuclear rocket can then be bought.";
    }
    const factory = B.droneFactoryLevel(ruler);
    if (B.droneFactoryMaxed(ruler)) {
      researchDrone.textContent = "Drone factory (" + factory + ")";
      researchDrone.disabled = true;
      researchDrone.title = "The factory can build " + factory + " drones per turn.";
    } else {
      const next = factory + 1;
      const droneCost = B.droneFactoryCost(ruler);
      const noun = next === 1 ? "drone" : "drones";
      researchDrone.textContent = "Drone factory (" + next + " · " + droneCost + ")";
      researchDrone.disabled = false;
      researchDrone.title = "Raise the drone factory to level " + next + " for " + droneCost + " gold. You can then buy " + next + " " + noun + " per turn.";
    }
    const rangeLevel = B.droneRangeLevel(ruler);
    const rangeMeters = B.droneRange(ruler);
    if (B.droneRangeMaxed(ruler)) {
      researchDroneRange.textContent = "Drone range (" + rangeLevel + ")";
      researchDroneRange.disabled = true;
      researchDroneRange.title = "Drones can reach " + rangeMeters + " m from your castle.";
    } else if (factory < 1) {
      const nextRange = rangeLevel + 1;
      const rangeCost = B.droneRangeCost(ruler);
      researchDroneRange.textContent = "Drone range (" + nextRange + " · " + rangeCost + ")";
      researchDroneRange.disabled = true;
      researchDroneRange.title = "Research the drone factory first.";
    } else {
      const nextRange = rangeLevel + 1;
      const rangeCost = B.droneRangeCost(ruler);
      const nextMeters = Math.min(b.droneRangeMax, rangeMeters + b.droneRangeStep);
      researchDroneRange.textContent = "Drone range (" + nextRange + " · " + rangeCost + ")";
      researchDroneRange.disabled = false;
      researchDroneRange.title = "Raise drone range to level " + nextRange + " (" + nextMeters + " m) for " + rangeCost + " gold.";
    }
    if (B.a2aMaxed(ruler)) {
      const pct = Math.round(B.interceptOdds(ruler) * 100);
      researchA2a.textContent = "Air-to-air efficiency (" + pct + "%)";
      researchA2a.disabled = true;
      researchA2a.title = "Interception chance is " + pct + "%.";
    } else {
      const next = (ruler.a2aLevel || 0) + 1;
      const pct = Math.round(B.a2aBaseChance * 100) + next * Math.round(b.a2aStep * 100);
      const cost = B.a2aResearchCost(ruler);
      researchA2a.textContent = "Air-to-air efficiency (" + pct + "% · " + cost + ")";
      researchA2a.disabled = false;
      researchA2a.title = "Raise interception chance to " + pct + "% for " + cost + " gold.";
    }
    const cap = B.fuelCapacity(ruler);
    if (B.fuelMaxed(ruler)) {
      researchFuel.textContent = "Rocket fuel capacity (" + cap + ")";
      researchFuel.disabled = true;
      researchFuel.title = "Rockets can use " + cap + " fuel.";
    } else {
      const nextCap = cap + 1;
      const fuelCost = B.fuelResearchCost();
      researchFuel.textContent = "Rocket fuel capacity (" + nextCap + " · " + fuelCost + ")";
      researchFuel.disabled = false;
      researchFuel.title = "Raise the fuel charge to " + nextCap + " for " + fuelCost + " gold.";
    }
    if (B.guidanceMaxed(ruler)) {
      researchGuidance.textContent = "Rocket guidance (exact)";
      researchGuidance.disabled = true;
      researchGuidance.title = "Rocket fuel burn is exact.";
    } else {
      const nextSpread = B.powderSpreadAt(B.guidanceLevel(ruler) + 1);
      const cost = B.guidanceResearchCost();
      const nextLabel = nextSpread > 0 ? "±" + nextSpread : "exact";
      researchGuidance.textContent = "Rocket guidance (" + nextLabel + " · " + cost + ")";
      researchGuidance.disabled = false;
      researchGuidance.title = nextSpread > 0
        ? "Tighten rocket fuel spread to ±" + nextSpread + " for " + cost + " gold."
        : "Make rocket fuel burn exact for " + cost + " gold.";
    }
  }

  const buys = {
    "buy-ball": "ball",
    "buy-powder": "powder",
    "buy-launcher": "launcher",
    mobilisation: "mobilisation",
    wall: "wall",
    tower: "tower",
    "buy-patriot": "patriot",
    "buy-a2a": "interceptor",
    "buy-drone": "drone",
    "buy-nuke": "nuke",
  };
  Object.keys(buys).forEach(function (id) {
    document.getElementById(id).addEventListener("click", function () {
      const error = B.playerBuy(match, buys[id]);
      if (error) match.log = error;
      refresh();
    });
  });

  researchA2a.addEventListener("click", function () {
    if (!match) return;
    const error = B.playerResearch(match, "a2a");
    if (error) match.log = error;
    refresh();
  });

  researchFuel.addEventListener("click", function () {
    if (!match) return;
    const error = B.playerResearch(match, "fuel");
    if (error) match.log = error;
    refresh();
  });

  researchGuidance.addEventListener("click", function () {
    if (!match) return;
    const error = B.playerResearch(match, "guidance");
    if (error) match.log = error;
    refresh();
  });

  researchRocketDamage.addEventListener("click", function () {
    if (!match) return;
    const error = B.playerResearch(match, "rocketDamage");
    if (error) match.log = error;
    refresh();
  });

  researchDrone.addEventListener("click", function () {
    if (!match) return;
    const error = B.playerResearch(match, "drone");
    if (error) match.log = error;
    refresh();
  });

  researchDroneRange.addEventListener("click", function () {
    if (!match) return;
    const error = B.playerResearch(match, "droneRange");
    if (error) match.log = error;
    refresh();
  });

  researchNuclear.addEventListener("click", function () {
    if (!match) return;
    const error = B.playerResearch(match, "nuclear");
    if (error) match.log = error;
    refresh();
  });

  planDrone.addEventListener("click", function () {
    if (!match) return;
    const error = B.planDrone(match);
    if (error) match.log = error;
    refresh();
  });

  function bindA2a(input, weapon) {
    input.addEventListener("change", function () {
      if (!match) return;
      const error = B.setInterceptTarget(match, weapon, input.checked);
      if (error) match.log = error;
      refresh();
    });
  }
  bindA2a(a2aRockets, "rocket");
  bindA2a(a2aDrones, "drone");

  function worldPoint(event) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function hideTip() {
    tip.hidden = true;
    if (!canvas.classList.contains("aiming-drone") && !canvas.classList.contains("using-putty")) canvas.style.cursor = "";
  }

  function oilTip(rig) {
    if (rig.type === "ruin") {
      const n = rig.repair || 0;
      const turns = n === 1 ? "1 turn" : n + " turns";
      return "Oil rig. Ruined. Repairs in " + turns + ".";
    }
    const turns = b.oilRepairTurns === 1 ? "1 turn" : b.oilRepairTurns + " turns";
    return "Oil rig. " + b.oilIncome + " gold a turn. A hit ruins it for " + turns + ".";
  }

  function factoryTip(castle) {
    const level = B.droneFactoryLevel(match.rulers[castle.side]);
    const hit = level <= 1 ? "A hit destroys it." : "A hit sets it back one level.";
    return "Drone factory, level " + level + ". " + hit;
  }

  function houseTip(house) {
    const people = house.pop || 0;
    const left = Math.max(1, B.BALANCE.houseHits - (house.hits || 0));
    const destroys = left === 1 ? "A hit destroys it." : left + " hits destroy it.";
    if (people <= 0) return "Residential building. Empty. " + destroys;
    const noun = people === 1 ? "person" : "people";
    if (left === 1) return "Residential building, " + people + " " + noun + ". A hit destroys it.";
    const loss = Math.min(B.BALANCE.popPerHit, people);
    const costNoun = loss === 1 ? "person" : "people";
    return "Residential building, " + people + " " + noun + ". A hit costs " + loss + " " + costNoun + ". " + destroys;
  }

  function buildingTip(hit) {
    if (hit.kind === "house") return houseTip(hit.block);
    if (hit.kind === "mine") return "Mine. " + b.towerIncome + " gold a turn. A hit destroys it.";
    return "Launcher. Fires rockets. A hit destroys it.";
  }

  function showTip(event, text) {
    tip.hidden = false;
    tip.textContent = text;
    const pad = 14;
    let x = event.clientX + pad;
    let y = event.clientY + pad;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
    const rect = tip.getBoundingClientRect();
    if (rect.right > window.innerWidth - 8) x = event.clientX - rect.width - pad;
    if (rect.bottom > window.innerHeight - 8) y = event.clientY - rect.height - pad;
    tip.style.left = Math.max(8, x) + "px";
    tip.style.top = Math.max(8, y) + "px";
  }

  canvas.addEventListener("mousemove", function (event) {
    const point = worldPoint(event);
    if (!match || !point) {
      hideTip();
      return;
    }
    if (match.wallTool) {
      match.wallTool.x = point.x;
      match.wallTool.y = point.y;
      match.wallTool.onMap = true;
      hideTip();
      return;
    }
    if (match.droneAim) {
      match.droneAim.x = point.x;
      match.droneAim.y = point.y;
      hideTip();
      return;
    }
    const factory = B.factoryAt(match, point.x, point.y);
    if (factory) {
      canvas.style.cursor = "help";
      showTip(event, factoryTip(factory.castle));
      return;
    }
    const building = B.buildingAt(match, point.x, point.y);
    if (building) {
      canvas.style.cursor = "help";
      showTip(event, buildingTip(building));
      return;
    }
    const rig = B.rigAt(match, point.x, point.y);
    if (!rig) {
      hideTip();
      return;
    }
    canvas.style.cursor = "help";
    showTip(event, oilTip(rig));
  });

  canvas.addEventListener("mouseleave", function () {
    if (match && match.wallTool) match.wallTool.onMap = false;
    hideTip();
  });

  canvas.addEventListener("click", function (event) {
    if (!match || event.button !== 0) return;
    const point = worldPoint(event);
    if (!point) return;
    if (match.wallTool) {
      match.wallTool.x = point.x;
      match.wallTool.y = point.y;
      match.wallTool.onMap = true;
      const error = B.useWallTool(match, point.x, point.y);
      if (error) match.log = error;
      refresh();
      return;
    }
    if (!match.droneAim) return;
    match.droneAim.x = point.x;
    match.droneAim.y = point.y;
    const error = B.launchDrone(match, point.x, point.y);
    if (error) match.log = error;
    refresh();
  });

  window.addEventListener("keydown", function (event) {
    if (!decree.hidden && (event.key === "Escape" || event.key === "Enter")) {
      event.preventDefault();
      dismissDecree();
      return;
    }
    if (!allies.hidden && (event.key === "Escape" || event.key === "Enter")) {
      event.preventDefault();
      dismissAllies();
      return;
    }
    if (!ultimatum.hidden) {
      if (event.key === "Escape") {
        event.preventDefault();
        dismissUltimatum();
      }
      return;
    }
    if (match && match.droneAim && event.key === "Escape") {
      event.preventDefault();
      B.cancelDroneAim(match);
      refresh();
      return;
    }
    if (!myTurn()) return;
    if (match.droneAim || match.wallTool) return;
    if (event.target.matches("input, select, button")) return;
    if (event.key === "ArrowLeft") match.left.elevation = Math.max(b.angleMin, match.left.elevation - 1);
    else if (event.key === "ArrowRight") match.left.elevation = Math.min(b.angleMax, match.left.elevation + 1);
    else if (event.key === "ArrowUp") match.left.powder = Math.min(Math.min(B.fuelCapacity(match.rulers.left), match.rulers.left.powder), match.left.powder + 1);
    else if (event.key === "ArrowDown") match.left.powder = Math.max(b.powderMin, match.left.powder - 1);
    else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      fire.click();
      return;
    } else return;
    event.preventDefault();
    B.syncAim(match);
    refresh();
  });

  priceButtons();
  if (new URLSearchParams(location.search).has("start")) start();
  requestAnimationFrame(frame);
})();
