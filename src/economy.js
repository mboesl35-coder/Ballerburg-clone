(function () {
  const B = (window.Baller = window.Baller || {});

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  B.createRuler = function createRuler() {
    const b = B.BALANCE;
    return {
      gold: b.startGold,
      powder: b.startPowder,
      balls: b.startBalls,
      people: b.startPeople,
      food: b.startFood,
      happiness: b.startHappiness,
      debt: 0,
    };
  };

  B.beginEconomy = function beginEconomy(ruler, towers) {
    const b = B.BALANCE;
    const income = Math.round(ruler.people * b.incomeFactor + towers * b.towerIncome);
    const foodBill = ruler.food * b.foodCost;
    ruler.gold += income;
    let fed = false;
    if (ruler.gold >= foodBill) {
      ruler.gold -= foodBill;
      fed = true;
    }
    let interest = 0;
    if (ruler.debt > 0) {
      interest = Math.max(1, Math.round(ruler.debt * b.interest));
      if (ruler.gold >= interest) ruler.gold -= interest;
      else {
        ruler.debt += interest - ruler.gold;
        ruler.gold = 0;
      }
    }
    let mood = (ruler.food - 1) * 12;
    if (!fed) mood -= 18;
    ruler.happiness = clamp(ruler.happiness + mood, 0, 100);
    let drifted = 0;
    if (ruler.happiness < b.happyLeaveBelow) {
      drifted = -Math.min(b.leaveAmount, ruler.people - b.peopleMin);
      ruler.people += drifted;
    } else if (ruler.happiness > b.happyGrowAbove && ruler.people < b.peopleMax) {
      drifted = 1;
      ruler.people += 1;
    }
    return { income, foodBill, interest, fed, drifted };
  };

  B.moodLine = function moodLine(ruler) {
    if (ruler.people <= B.BALANCE.peopleMin && ruler.happiness < 40) {
      return "Only a few people still hold the castle.";
    }
    if (ruler.happiness >= 65) return "The people are content and stay.";
    if (ruler.happiness >= 40) return "The courtyard is grumbling.";
    return "Families pack up and leave.";
  };

  B.kingLine = function kingLine(own, enemy, ruler) {
    const ownKeep = B.hasType(own, "keep");
    const enemyKeep = B.hasType(enemy, "keep");
    if (!ownKeep) return "Your king is dead.";
    if (!B.hasType(own, "cannon")) return "Without a launcher, the day is lost.";
    if (ruler.debt > 80) return "Interest is eating the treasury.";
    if (ruler.balls < 2) return "Rockets are running low.";
    if (ruler.happiness < 40) return "Look after the people before they leave.";
    if (!enemyKeep) return "The enemy king is dead.";
    const enemyBlocks = B.stoneCount(enemy);
    const ownBlocks = B.stoneCount(own);
    if (enemyBlocks + 2 < ownBlocks) return "Good aim. Keep the pressure on.";
    if (ownBlocks + 2 < enemyBlocks) return "The walls are getting thin.";
    return "Kill the king, not just the hillside.";
  };

  B.spend = function spend(ruler, cost) {
    if (ruler.gold < cost) return false;
    ruler.gold -= cost;
    return true;
  };
})();
