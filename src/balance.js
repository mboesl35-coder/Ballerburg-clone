(function () {
  const B = (window.Baller = window.Baller || {});

  // Every number that changes how the game feels lives here.
  // Reload the page after an edit.
  B.BALANCE = {
    viewW: 960 * 5,
    viewH: 540,
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
    // 3–12 keep the old step of 48. 13–24 continue that same step.
    // 20 is the first charge that reaches the other king's column.
    powderReach: 20,
    powderMax: 24,
    speedBase: 210,
    speedPerPowder: 48,
    windMax: 46,
    windJitter: 16,
    startGold: 160,
    startPowder: 40,
    startBalls: 8,
    startPeople: 48,
    startFood: 1,
    startHappiness: 70,
    incomeFactor: 0.42,
    foodCost: 14,
    leaveAmount: 5,
    peopleMin: 10,
    peopleMax: 80,
    ballCost: 16,
    powderPack: 10,
    powderCost: 12,
    launcherCost: 26,
    wallCost: 36,
    towerCost: 70,
    towerIncome: 12,
    borrowAmount: 50,
    interest: 0.12,
    maxDebt: 200,
    happyLeaveBelow: 34,
    happyGrowAbove: 82,
  };
})();
