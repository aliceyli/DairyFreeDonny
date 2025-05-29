// keeps track of actor properties
class Actor {
  constructor({ imgSrc, initialx, initialy, width, height, speed }) {
    this.img = new Image();
    this.img.src = imgSrc;
    this.x = initialx;
    this.y = initialy;
    this.width = width;
    this.height = height;
    this.speed = speed;
  }
}

// adds event listeners to player
class Donny extends Actor {
  static INITIAL_ALLERGY_TOLERANCE = 3;
  static INITIAL_HUNGER_LEVEL = 5;

  constructor({ imgSrc, initialx, initialy, width, height, speed = 4 }) {
    super({ imgSrc, initialx, initialy, width, height, speed });
    this.allergyStartTime;
    this.allergyDuration = 700;
    this.allergicReactions = [
      "my tummy hurts",
      "I'm feeling itchy",
      "I don't feel so good",
      "whyyyy",
    ];
    this.curAllergicReaction;
    this.hasUpdatedReaction = false;
    this.allergyTolerance = Donny.INITIAL_ALLERGY_TOLERANCE;
    this.hungerLevel = Donny.INITIAL_HUNGER_LEVEL;
    this.hungerMin = 0;
    this.fullMax = 10;
    this.hungerInterval = 2000;
    this.lastHungerDecrease = Date.now();
    this.hungerReaction = "I'm hungry";
    this.fullReaction = "I ate too much";

    this.keys = {};

    // interesting behavior of keydown is that
    // if you hold it down,
    // it fires once immediately,
    // has a short delay
    // and then fires at a regular interval
    // so if you only update your players movements based on keydown, you'll see a lag if you continue to hold down the key
    // that's why we need to keep track of the current state of whether the key is pressed down or not
    addEventListener("keydown", (e) => {
      this.keys[e.key] = true;
    });
    addEventListener("keyup", (e) => {
      this.keys[e.key] = false;
    });
  }

  reset() {
    this.allergyTolerance = Donny.INITIAL_ALLERGY_TOLERANCE;
    this.hungerLevel = Donny.INITIAL_HUNGER_LEVEL;
    this.lastHungerDecrease = Date.now();
  }

  update(canvas) {
    if (this.keys["ArrowDown"] && this.y < canvas.height - this.height) {
      this.y += this.speed;
    }
    if (this.keys["ArrowUp"] && this.y > 0) {
      this.y -= this.speed;
    }
    if (this.keys["ArrowRight"] && this.x < canvas.width - this.width) {
      this.x += this.speed;
    }
    if (this.keys["ArrowLeft"] && this.x > 0) {
      this.x -= this.speed;
    }
  }

  triggerAllergy() {
    this.allergyStartTime = Date.now();
    this.hasUpdatedReaction = false;
  }

  updateAllergicReaction() {
    if (!this.hasUpdatedReaction && this.allergyStartTime !== null) {
      this.curAllergicReaction =
        this.allergicReactions[
          Math.floor(Math.random() * this.allergicReactions.length)
        ];
      this.hasUpdatedReaction = true;
    }
  }

  hasAllergicReaction() {
    return (
      Date.now() - this.allergyStartTime < this.allergyDuration &&
      Date.now() - this.allergyStartTime >= 0
    );
  }

  decreaseHunger() {
    // hunger level goes down 1 every hungerInterval
    if (Date.now() - this.lastHungerDecrease > this.hungerInterval) {
      this.hungerLevel--;
      this.lastHungerDecrease = Date.now();
    }
  }

  tooFull() {
    return this.hungerLevel >= this.fullMax;
  }

  tooHungry() {
    return this.hungerLevel <= this.hungerMin;
  }

  checkHunger() {
    return this.tooFull() || this.tooHungry();
  }

  checkAllergyTolerance() {
    return this.allergyTolerance <= 0;
  }
}

// adds food specific properties to actor
// different update behavior to player
class Food extends Actor {
  constructor({
    imgSrc,
    initialx,
    initialy,
    width,
    height,
    speed = -2,
    releaseTime,
    allergies = [],
  }) {
    super({ imgSrc, initialx, initialy, width, height, speed });
    this.releaseTime = releaseTime;
    this.collided = false;
    this.allergies = allergies;

    this.initialx = initialx;
    this.initialy = initialy;
  }

  reset(y) {
    this.x = this.initialx;
    this.y = y;
    this.collided = false;
  }

  update() {
    if (this.collided) {
      this.reset();
    } else {
      this.x = this.x + this.speed;
      // this.draw();
    }
  }

  isColliding(donny) {
    const thisX2 = this.x + this.width;
    const donnyX2 = donny.x + donny.width;
    const thisY2 = this.y + this.height;
    const donnyY2 = donny.y + donny.height;

    const xColliding =
      (donny.x >= this.x && donny.x <= thisX2) ||
      (donnyX2 >= this.x && donnyX2 <= thisX2) ||
      (donny.x <= this.x && donnyX2 >= thisX2);
    const yColliding =
      (donny.y >= this.y && donny.y <= thisY2) ||
      (donnyY2 >= this.y && donnyY2 < thisY2) ||
      (donny.y <= this.y && donnyY2 >= thisY2);

    const isColliding = xColliding && yColliding;

    // set collided
    if (this.collided === false && isColliding) {
      this.collided = true;
    }

    return isColliding;
  }

  // TO-DO: explore when you might want to use this and translate like in https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations
  // update() {
  //   this.ctx.save();
  //   this.ctx.translate(this.x + this.speed, 0);
  //   this.x = this.x + this.speed;
  // }
}

// keeps track of actors and level time
// draws actors
class Level {
  constructor({
    player,
    duration = 40000,
    obstacleNum,
    startTime,
    allergiesToAvoid,
    releaseInterval,
  }) {
    this.startTime = startTime;
    this.duration = duration;
    this.obstacleNum = obstacleNum;
    this.releaseInterval = releaseInterval;
    this.lastRelease;
    this.allergiesToAvoid = allergiesToAvoid;
    this.player = player;
    this.foods = [];
    this.curFoodIdx = null;

    // passed from game
    this.canvas;
    this.ctx;
  }

  get timeElapsed() {
    return Date.now() - this.startTime;
  }

  get completed() {
    return this.timeElapsed > this.duration + 8000;
  }

  get inProgress() {
    return this.startTime && !this.completed;
  }

  addFood(food) {
    this.foods.push(food);
  }

  startLevel() {
    this.startTime = Date.now();
    this.player.reset();
  }

  updatePlayerStatus() {
    for (let food of this.foods) {
      if (food.isColliding(this.player)) {
        if (
          food.allergies.some((allergy) =>
            this.allergiesToAvoid.includes(allergy)
          )
        ) {
          this.player.allergyTolerance--;
          this.player.triggerAllergy();
        } else {
          this.player.hungerLevel++;
        }
      }
    }
    this.player.decreaseHunger();
  }

  drawAllergicReaction() {
    if (this.player.hasAllergicReaction()) {
      this.player.updateAllergicReaction();
      this.ctx.font = "18px serif";
      this.ctx.textAlign = "right";
      this.ctx.fillText(
        this.player.curAllergicReaction,
        this.player.x,
        this.player.y
      );
    }
  }

  drawHungerReaction() {
    const drawReaction = (text) => {
      this.ctx.font = "18px serif";
      this.ctx.textAlign = "right";
      this.ctx.fillText(text, this.player.x, this.player.y + 20); // +20 to go below the allergic reaction
    };

    if (this.player.hungerLevel < 3) {
      drawReaction(this.player.hungerReaction);
    }
    if (this.player.hungerLevel > 7) {
      drawReaction(this.player.fullReaction);
    }
  }

  // TO-DO: this helper function should go somewhere else
  get randY() {
    const getRandomNumber = (n) => {
      return Math.floor(Math.random() * n);
    };

    return getRandomNumber(this.canvas.height - 60 - 30); // 30 is bottom text and 60 is food height
  }

  drawAllActors() {
    this.player.update(this.canvas);
    this.ctx.drawImage(
      this.player.img,
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height
    );

    this.drawAllergicReaction();
    this.drawHungerReaction();

    this.releaseNextFood();

    for (let food of this.foods) {
      if (food.releaseTime && this.timeElapsed > food.releaseTime) {
        food.update();
        this.ctx.drawImage(food.img, food.x, food.y, food.width, food.height);
      }
      if (food.x < food.width * -1) {
        // if food is offscreen, reset with random y
        // TO-DO: releaseNextFood() with this seems awkward. refactor...
        food.reset(this.randY);
      }
    }
  }

  generateFood() {
    // hack to repeat foods for earlier levels
    // TO-DO: fix this list to be unique
    // and control which foods appear on which level
    const FOODS = [
      { imgSrc: "images/apple.png" },
      { imgSrc: "images/chicken.png" },
      { imgSrc: "images/milk.png", allergies: ["dairy"] },
      { imgSrc: "images/egg.png" },
      { imgSrc: "images/pizza.png", allergies: ["dairy", "gluten"] },
      { imgSrc: "images/apple.png" },
      { imgSrc: "images/chicken.png" },
      { imgSrc: "images/milk.png", allergies: ["dairy"] },
      { imgSrc: "images/egg.png" },
      { imgSrc: "images/pizza.png", allergies: ["dairy", "gluten"] },
      { imgSrc: "images/banana.png" },
      { imgSrc: "images/frenchfries.png" },
      { imgSrc: "images/hotdog.png", allergies: ["gluten"] },
      { imgSrc: "images/watermelon.png" },
      { imgSrc: "images/bread.png", allergies: ["gluten"] },
      { imgSrc: "images/strawberry.png" },
      { imgSrc: "images/peanutbutter.png", allergies: ["nut"] },
    ];

    const foodWidth = 50;
    const foodHeight = 60;

    for (let i = 0; i < this.obstacleNum; i++) {
      const randFoodIdx = i % FOODS.length;
      const randInitialY = this.randY;

      const food = new Food({
        ...FOODS[randFoodIdx],
        initialx: this.canvas.width,
        initialy: randInitialY,
        width: foodWidth,
        height: foodHeight,
      });

      this.addFood(food);
    }
  }

  get nextFood() {
    if ((this.curFoodIdx === null) & (this.foods.length > 0)) {
      this.curFoodIdx = 0;
    } else if (this.curFoodIdx === this.foods.length - 1) {
      // cycle back if foods run out
      this.curFoodIdx = 0;
    } else {
      this.curFoodIdx++;
    }
    return this.foods[this.curFoodIdx];
  }

  releaseNextFood() {
    // TO-DO: this cycle behavior is a bit weird. come back to this
    if (
      Date.now() - this.lastRelease > this.releaseInterval ||
      !this.lastRelease
    ) {
      this.nextFood.releaseTime = this.timeElapsed;
      this.lastRelease = Date.now();
    }
  }
}

// create game and keeps track of levels
class Game {
  constructor(canvasId, player) {
    this.canvas = document.getElementById(canvasId);
    this.player = player;

    this.ctx = this.canvas.getContext("2d");
    this.levels = [];
    this.currentLevelIdx = 0;
    this.score = 0;
    this.started = false;
    this.showLevelScreen = true;
    this.finished = false;
    this.gameOver = false;

    this.canvas.addEventListener("click", (event) => {
      if (!this.started) {
        this.started = true;
      } else if (this.showLevelScreen) {
        this.showLevelScreen = false;
        // initialize level start time!
        if (this.levels[this.currentLevelIdx]) {
          this.levels[this.currentLevelIdx].startLevel();
        }
      }
    });
  }

  get currentLevel() {
    return this.levels[this.currentLevelIdx];
  }

  addLevel(level) {
    level.canvas = this.canvas;
    level.ctx = this.ctx;
    this.levels.push(level);
  }

  nextLevel() {
    if (this.currentLevelIdx + 1 < this.levels.length) {
      this.currentLevelIdx++;
    } else {
      this.finished = true;
    }
  }

  updateScore() {
    if (this.currentLevel.inProgress) {
      this.score++;
      // TO-DO: the score also updates when you eat the right foods?
    }
  }

  drawScore() {
    this.ctx.font = "24px sans-serif";
    this.ctx.textAlign = "left";
    this.ctx.fillText(`Score: ${this.score}`, 10, 25);
  }

  checkGameOver() {
    if (this.player.checkAllergyTolerance() || this.player.checkHunger()) {
      this.gameOver = true;
    }
  }

  drawTitle(text) {
    this.ctx.font = "48px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText(text, this.canvas.width / 2, 150);
  }

  drawSubtitle(text) {
    this.ctx.font = "24px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText(text, this.canvas.width / 2, 200);
  }

  drawCTA(text) {
    this.ctx.font = "18px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText(text, this.canvas.width / 2, 250);
  }

  drawStartScreen() {
    this.drawTitle("Dairy Free Donny");
    this.drawCTA("Click to start");
  }

  formatAllergies(arr) {
    const copiedArr = arr.map((ele) => ele.toUpperCase());
    if (copiedArr.length === 0) {
      return "";
    }
    if (copiedArr.length === 1) {
      return copiedArr[0];
    }
    const last = copiedArr.pop();
    return copiedArr.join(", ") + " and " + last;
  }

  drawLevelScreen() {
    const allergyString = this.formatAllergies(
      this.currentLevel.allergiesToAvoid
    );
    this.drawTitle(`Level ${this.currentLevelIdx + 1}`);
    this.drawSubtitle(`Donny can't eat ${allergyString}`);
    this.drawCTA("Click to continue");
  }

  drawGameOverScreen() {
    const allergyString = this.formatAllergies(
      this.currentLevel.allergiesToAvoid
    );
    let gameOverText = `You fed Donny too much ${allergyString}`;
    if (this.player.tooHungry()) {
      gameOverText = "Donny got too hungry";
    }
    if (this.player.tooFull()) {
      gameOverText = "Donny ate too much";
    }

    this.drawTitle("Game Over");
    this.drawSubtitle(gameOverText);
  }

  drawWinScreen() {
    this.drawTitle("You Win!");
    this.drawSubtitle(`Final Score: ${this.score}`);
  }

  drawPlayerStatus() {
    this.ctx.font = "24px serif";
    this.ctx.textAlign = "left";
    this.ctx.fillText(
      `Hunger Level: ${this.player.hungerLevel}`,
      10,
      this.canvas.height - 10
    );
    this.ctx.textAlign = "right";
    this.ctx.fillText(
      `Allergy Tolerance: ${this.player.allergyTolerance}`,
      this.canvas.width - 10,
      this.canvas.height - 10
    );
  }
}

const main = () => {
  const player = new Donny({
    imgSrc: "images/donny.png",
    initialx: 50,
    initialy: 200,
    width: 60,
    height: 70,
  });

  const game = new Game("myCanvas", player);

  const level1 = new Level({
    player,
    obstacleNum: 10,
    allergiesToAvoid: ["dairy"],
    releaseInterval: 1000,
  });
  game.addLevel(level1);
  level1.generateFood();

  const level2 = new Level({
    player,
    obstacleNum: 15,
    allergiesToAvoid: ["dairy", "gluten"],
    releaseInterval: 1000,
  });
  game.addLevel(level2);
  level2.generateFood();

  const level3 = new Level({
    player,
    obstacleNum: 17,
    allergiesToAvoid: ["dairy", "gluten", "nuts"],
    releaseInterval: 1000,
  });
  game.addLevel(level2);
  level2.generateFood();

  let myReq;
  function animate(t) {
    game.ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
    if (!game.started) {
      game.drawStartScreen();
    } else if (game.gameOver) {
      game.drawGameOverScreen();
    } else if (game.finished) {
      game.drawWinScreen();
    } else if (game.showLevelScreen) {
      game.drawLevelScreen();
    } else if (game.currentLevel.completed) {
      game.showLevelScreen = true;
      game.nextLevel();
    } else {
      game.updateScore();
      game.drawScore();
      game.currentLevel.updatePlayerStatus();
      game.drawPlayerStatus();
      game.currentLevel.drawAllActors();
      game.checkGameOver();
    }
    myReq = requestAnimationFrame(animate);
  }

  myReq = requestAnimationFrame(animate);
  // cancelAnimationFrame(myReq);
};

main();
