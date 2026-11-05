(function () {
  const B = (window.Baller = window.Baller || {});

  // Every number that changes how the game feels lives here.
  // Reload the page after an edit.
  B.BALANCE = {
    viewW: 960 * 5,
    // Pads sit at y=1356, so the sky above them is 452 × 3.
    // Ground under the pads is 176px, double the old 88.
    ground: 176,
    viewH: 1532,
    gravity: 520,
    block: 28,
    cell: 4,
    blastRadius: 22,
    cols: 7,
    maxRow: 6,
    ballRadius: 4,
    angleMin: 10,
    angleMax: 80,
    powderMin: 3,
    // Unresearched tanks accept a charge of 10. Each research step adds 1, up to powderMax.
    // 3–12 keep the old step of 48. 13–24 continue that same step.
    // 20 is the first charge that reaches the other king's column.
    powderBase: 10,
    powderReach: 20,
    powderMax: 24,
    fuelCapacityCost: 50,
    // Unresearched rockets vary by the first powderSpreads entry. Each
    // guidance buy (150 gold) moves one step toward exact.
    powderSpreads: [0.8, 0.4, 0.2, 0],
    guidanceCost: 150,
    speedBase: 210,
    speedPerPowder: 48,
    windMax: 46,
    windJitter: 16,
    startGold: 100,
    startPowder: 40,
    startBalls: 8,
    // Nine houses, four hits of 5. 0.112 keeps a full village near the old income of 48 × 0.42.
    popPerHit: 5,
    houseHits: 4,
    civilianHouses: 9,
    // When this many of the player's houses are gone, the allies rebuild every house.
    // People stay in the houses that still had them. Rebuilt ruins stay empty.
    reconstructionAt: 6,
    houseW: 48,
    houseH: 64,
    freeParcels: 5,
    incomeFactor: 0.112,
    ballCost: 30,
    powderPack: 10,
    powderCost: 12,
    launcherCost: 26,
    wallCost: 100,
    wallPatchCells: 9,
    towerCost: 70,
    towerIncome: 30,
    maxMines: 3,
    // Empty parcels between mine towers. They start at the left edge of the map.
    mineGap: 2,
    // Orc oil rigs. Income is twice a mine tower. A destroyed rig stands again
    // at the start of the seventh turn after the shot.
    oilIncome: 24,
    oilRepairTurns: 7,
    oilOutrageAt: 3,
    oilFront: 3,
    oilRear: 2,
    oilW: 44,
    oilH: 100,
    oilMargin: 20,
    oilGap: 36,
    patriotCost: 60,
    interceptorCost: 50,
    // Unresearched missiles connect half the time. Each research level adds 10%, up to 90%.
    interceptChance: 0.5,
    a2aStep: 0.1,
    a2aMax: 0.9,
    a2aCost: 100,
    // Drone factory. Each level costs the same and allows one more purchase per turn.
    droneResearchCost: 100,
    droneFactoryMax: 10,
    // The overlord researches no further than this. The player can still reach droneFactoryMax.
    overlordDroneFactoryMax: 3,
    droneCost: 5,
    // Drone range, measured horizontally from the drone launch point.
    // Base range crosses the valley (patriot, front rigs/houses) without reaching the castle.
    droneRangeBase: 2000,
    droneRangeStep: 450,
    droneRangeMax: 3800,
    droneRangeCost: 75,
    // Display only. The program unlocks the treasury rocket and the trefoil.
    // Bought rockets are counted and cannot be fired.
    nuclearProgramCost: 1000,
    nuclearRocketCost: 5000,
    // Curved flight, sampled in pixels. The drone flies straight for the first
    // droneStraight share of its horizontal run, then curves down into its target.
    // Playback advances dronePace samples a second.
    droneStep: 6,
    dronePace: 226,
    droneStraight: 0.55,
    // Rocket playback samples per second. 209 makes a powder-20 crossing last about 0.9s.
    rocketPace: 209,
    // Hover point sits this far above the highest stone of the castle.
    droneClearance: 160,
  };

  // Free Game shop and research gold. Copied at load so later Story Mode
  // price edits do not move Free Game, and the other way around.
  const story = B.BALANCE;
  B.FREE_PRICES = {
    ballCost: story.ballCost,
    powderPack: story.powderPack,
    powderCost: story.powderCost,
    launcherCost: story.launcherCost,
    wallCost: story.wallCost,
    towerCost: story.towerCost,
    patriotCost: story.patriotCost,
    interceptorCost: story.interceptorCost,
    droneCost: story.droneCost,
    fuelCapacityCost: story.fuelCapacityCost,
    guidanceCost: story.guidanceCost,
    // Rocket blast radius. Free Game only.
    // Costs: 100, 200, 300, 500. Radii: 26, 30, 34, 42.
    // Unresearched rockets stay at blastRadius. Drones stay at half of that.
    // Story Mode has no such research.
    rocketDamageCosts: [100, 200, 300, 500],
    rocketDamageRadii: [26, 30, 34, 42],
    a2aCost: story.a2aCost,
    droneResearchCost: story.droneResearchCost,
    droneRangeCost: story.droneRangeCost,
    overlordDroneFactoryMax: story.overlordDroneFactoryMax,
  };
})();
