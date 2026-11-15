(function () {
  const B = (window.Baller = window.Baller || {});

  B.prices = function prices() {
    return B.PRICES || B.BALANCE;
  };

  B.createRuler = function createRuler(side, mode) {
    const b = B.BALANCE;
    return {
      gold: b.startGold,
      powder: b.startPowder,
      balls: b.startBalls,
      interceptors: 0,
      drones: 0,
      dronesBought: 0,
      mobilised: false,
      droneLevel: 0,
      droneRangeLevel: 0,
      a2aLevel: 0,
      fuelLevel: mode !== "free" && side === "right" ? b.powderMax - b.powderBase : 0,
      guidanceLevel: 0,
      rocketDamageLevel: 0,
      nuclearProgram: false,
      nukes: 0,
      targetRockets: true,
      targetDrones: true,
      population: b.civilianHouses * b.houseHits * b.popPerHit,
    };
  };

  // Captured at load so intercept checks can force interceptChance to 0 or 1
  // without changing how many research levels exist.
  B.a2aBaseChance = B.BALANCE.interceptChance;

  function a2aPercent(chance) {
    return Math.round(chance * 100);
  }

  B.a2aMaxLevel = function a2aMaxLevel() {
    const b = B.BALANCE;
    const base = a2aPercent(B.a2aBaseChance);
    const step = a2aPercent(b.a2aStep);
    const max = a2aPercent(b.a2aMax);
    return Math.round((max - base) / step);
  };

  B.a2aMaxed = function a2aMaxed(ruler) {
    return (ruler.a2aLevel || 0) >= B.a2aMaxLevel();
  };

  B.a2aResearchCost = function a2aResearchCost(ruler) {
    return ((ruler.a2aLevel || 0) + 1) * B.prices().a2aCost;
  };

  B.fuelCapacity = function fuelCapacity(ruler) {
    const b = B.BALANCE;
    const level = ruler && ruler.fuelLevel ? ruler.fuelLevel : 0;
    return Math.min(b.powderMax, B.prices().powderBase + level);
  };

  B.fuelMaxed = function fuelMaxed(ruler) {
    return B.fuelCapacity(ruler) >= B.BALANCE.powderMax;
  };

  B.fuelResearchCost = function fuelResearchCost() {
    return B.prices().fuelCapacityCost;
  };

  B.guidanceMaxLevel = function guidanceMaxLevel() {
    return Math.max(0, B.BALANCE.powderSpreads.length - 1);
  };

  B.guidanceLevel = function guidanceLevel(ruler) {
    return ruler && ruler.guidanceLevel ? ruler.guidanceLevel : 0;
  };

  B.powderSpreadAt = function powderSpreadAt(level) {
    const spreads = B.BALANCE.powderSpreads;
    const i = Math.max(0, Math.min(spreads.length - 1, level || 0));
    return spreads[i];
  };

  B.powderSpread = function powderSpread(ruler) {
    return B.powderSpreadAt(B.guidanceLevel(ruler));
  };

  B.guidanceMaxed = function guidanceMaxed(ruler) {
    return B.powderSpread(ruler) <= 0;
  };

  B.guidanceResearchCost = function guidanceResearchCost() {
    return B.prices().guidanceCost;
  };

  B.rocketDamageLevel = function rocketDamageLevel(ruler) {
    return ruler && ruler.rocketDamageLevel ? ruler.rocketDamageLevel : 0;
  };

  B.rocketDamageMaxed = function rocketDamageMaxed(ruler) {
    return B.rocketDamageLevel(ruler) >= B.FREE_PRICES.rocketDamageCosts.length;
  };

  B.rocketDamageCost = function rocketDamageCost(ruler) {
    const costs = B.FREE_PRICES.rocketDamageCosts;
    const level = B.rocketDamageLevel(ruler);
    return costs[Math.min(level, costs.length - 1)];
  };

  B.rocketBlastRadiusAt = function rocketBlastRadiusAt(level) {
    if (!level) return B.BALANCE.blastRadius;
    const radii = B.FREE_PRICES.rocketDamageRadii;
    return radii[Math.min(level, radii.length) - 1];
  };

  B.rocketBlastRadius = function rocketBlastRadius(ruler) {
    return B.rocketBlastRadiusAt(B.rocketDamageLevel(ruler));
  };

  B.droneFactoryLevel = function droneFactoryLevel(ruler) {
    return ruler && ruler.droneLevel ? ruler.droneLevel : 0;
  };

  B.droneFactoryMaxed = function droneFactoryMaxed(ruler) {
    return B.droneFactoryLevel(ruler) >= B.prices().droneFactoryMax;
  };

  function steppedCost(costs, level, flat) {
    if (costs && costs.length) return costs[Math.min(level, costs.length - 1)];
    return flat;
  }

  B.droneFactoryCost = function droneFactoryCost(ruler) {
    const prices = B.prices();
    return steppedCost(prices.droneFactoryCosts, B.droneFactoryLevel(ruler), prices.droneResearchCost);
  };

  B.droneRangeLevel = function droneRangeLevel(ruler) {
    return ruler && ruler.droneRangeLevel ? ruler.droneRangeLevel : 0;
  };

  B.droneRange = function droneRange(ruler) {
    const b = B.BALANCE;
    return Math.min(b.droneRangeMax, b.droneRangeBase + B.droneRangeLevel(ruler) * b.droneRangeStep);
  };

  B.droneRangeMaxLevel = function droneRangeMaxLevel() {
    const b = B.BALANCE;
    return Math.round((b.droneRangeMax - b.droneRangeBase) / b.droneRangeStep);
  };

  B.droneRangeMaxed = function droneRangeMaxed(ruler) {
    return B.droneRange(ruler) >= B.BALANCE.droneRangeMax;
  };

  B.droneRangeCost = function droneRangeCost(ruler) {
    const prices = B.prices();
    return steppedCost(prices.droneRangeCosts, B.droneRangeLevel(ruler), prices.droneRangeCost);
  };

  B.interceptOdds = function interceptOdds(ruler) {
    const b = B.BALANCE;
    const level = ruler && ruler.a2aLevel ? ruler.a2aLevel : 0;
    if (level <= 0) return b.interceptChance;
    const pct = a2aPercent(B.a2aBaseChance) + level * a2aPercent(b.a2aStep);
    return Math.min(a2aPercent(b.a2aMax), pct) / 100;
  };

  B.turnIncome = function turnIncome(ruler, castle) {
    const b = B.BALANCE;
    const towers = castle ? B.towerCount(castle) : 0;
    const oils = castle ? B.oilCount(castle) : 0;
    return Math.round(ruler.population * b.incomeFactor + towers * b.towerIncome + oils * b.oilIncome);
  };

  B.beginEconomy = function beginEconomy(ruler, castle) {
    const income = B.turnIncome(ruler, castle);
    ruler.gold += income;
    return { income };
  };

  B.moodLine = function moodLine(ruler, castle) {
    if (!ruler || ruler.population > 0) return "";
    const houses = castle && castle.houses;
    if (houses) {
      for (let i = 0; i < houses.length; i++) {
        if (houses[i].type === "house") return "The houses stand empty.";
      }
    }
    return "The houses are gone.";
  };

  B.kingLine = function kingLine(own, enemy, ruler) {
    const ownKeep = B.hasType(own, "keep");
    const enemyKeep = B.hasType(enemy, "keep");
    if (!ownKeep) return "Your king is dead.";
    if (!B.hasType(own, "cannon")) return "Without a launcher, the day is lost.";
    if (ruler.balls < 2) return "Rockets are running low.";
    if (ruler.population <= 0) return "No population remains.";
    if (!enemyKeep) return "The Orc Overlord is dead.";
    const enemyBlocks = B.stoneCount(enemy);
    const ownBlocks = B.stoneCount(own);
    if (enemyBlocks + 2 < ownBlocks) return "Good aim. Keep the pressure on.";
    if (ownBlocks + 2 < enemyBlocks) return "The walls are getting thin.";
    return "Kill the Orc Overlord, not just the hillside.";
  };

  B.spend = function spend(ruler, cost) {
    if (ruler.gold < cost) return false;
    ruler.gold -= cost;
    return true;
  };
})();
