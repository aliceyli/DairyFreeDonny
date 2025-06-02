const MARGIN = 10;
const SCORE_BAR_HEIGHT = 25;

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

    this.initialx = initialx;
    this.initialy = initialy;

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
    this.x = this.initialx;
    this.y = this.initialy;
  }

  update(canvas) {
    if (
      this.keys["ArrowDown"] &&
      this.y < canvas.height - this.height - MARGIN - SCORE_BAR_HEIGHT
    ) {
      this.y += this.speed;
    }
    if (this.keys["ArrowUp"] && this.y > MARGIN + SCORE_BAR_HEIGHT) {
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
    foodPool,
    allergiesToAvoid,
    releaseInterval,
  }) {
    this.startTime = null;
    this.duration = duration;
    this.foodPool = foodPool;
    this.releaseInterval = releaseInterval;
    this.lastRelease = null;
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
    return this.timeElapsed > this.duration;
  }

  get inProgress() {
    return this.startTime && !this.completed;
  }

  addFood(food) {
    this.foods.push(food);
  }

  startLevel() {
    if (this.startTime) {
      this.lastRelease = null;
      this.curFoodIdx = null;
      this.foods.map((food) => food.reset());
    } else {
      this.generateFood();
    }

    this.player.reset();
    this.startTime = Date.now();
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

    if (this.player.hungerLevel <= 2) {
      drawReaction(this.player.hungerReaction);
    }
    if (this.player.hungerLevel >= 8) {
      drawReaction(this.player.fullReaction);
    }
  }

  randFoodY(foodHeight) {
    const getRandomNumber = (start, end) => {
      return Math.floor(Math.random() * (end - start + 1) + start);
    };

    const topBottomMargin = MARGIN + SCORE_BAR_HEIGHT;

    return getRandomNumber(
      topBottomMargin,
      this.canvas.height - 60 - topBottomMargin
    ); // 60 is food height
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
    }
  }

  generateFood() {
    const FOOD_PROPERTIES = {
      apple: { imgSrc: "images/apple.png" },
      chicken: { imgSrc: "images/chicken.png" },
      milk: { imgSrc: "images/milk.png", allergies: ["dairy"] },
      egg: { imgSrc: "images/egg.png" },
      pizza: { imgSrc: "images/pizza.png", allergies: ["dairy", "gluten"] },
      banana: { imgSrc: "images/banana.png" },
      frenchfries: { imgSrc: "images/frenchfries.png" },
      hotdog: { imgSrc: "images/hotdog.png", allergies: ["gluten"] },
      watermelon: { imgSrc: "images/watermelon.png" },
      bread: { imgSrc: "images/bread.png", allergies: ["gluten"] },
      strawberry: { imgSrc: "images/strawberry.png" },
      peanutbutter: { imgSrc: "images/peanutbutter.png", allergies: ["nut"] },
      pistachios: { imgSrc: "images/pistachios.png", allergies: ["nut"] },
      icecream: {
        imgSrc: "images/icecream.png",
        allergies: ["dairy", "gluten"],
      },
      cake: { imgSrc: "images/cake.png", allergies: ["dairy", "gluten"] },
      carrot: { imgSrc: "images/carrot.png" },
      steak: { imgSrc: "images/steak.png", allergies: ["red meat"] },
      cheeseburger: {
        imgSrc: "images/cheeseburger.png",
        allergies: ["dairy", "gluten", "red meat"],
      },
      bacon: { imgSrc: "images/bacon.png", allergies: ["red meat"] },
      sushi: { imgSrc: "images/sushi.png" },
      avocado: { imgSrc: "images/avocado.png" },
    };

    const foodPoolPropsList = this.foodPool.map(
      (food) => FOOD_PROPERTIES[food]
    );

    const foodWidth = 50;
    const foodHeight = 60;

    for (let foodProps of foodPoolPropsList) {
      const randInitialY = this.randFoodY(foodHeight);

      const food = new Food({
        ...foodProps,
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
      //cycle back if foods run out
      this.curFoodIdx = 0;
    } else {
      this.curFoodIdx++;
    }
    return this.foods[this.curFoodIdx];
  }

  releaseNextFood() {
    if (
      Date.now() - this.lastRelease > this.releaseInterval ||
      !this.lastRelease
    ) {
      const foodToRelease = this.nextFood;
      if (foodToRelease) {
        foodToRelease.reset(this.randFoodY(foodToRelease.foodHeight));
        foodToRelease.releaseTime = this.timeElapsed;
        this.lastRelease = Date.now();
      }
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
    this.showLevelScreen = false;
    this.finished = false;
    this.gameOver = false;
    this.reqID = -1;

    this.canvas.addEventListener("click", (event) => {
      if (!this.started) {
        this.started = true;
        this.showLevelScreen = true;
      } else if (this.showLevelScreen) {
        this.showLevelScreen = false;

        if (this.levels[this.currentLevelIdx]) {
          this.levels[this.currentLevelIdx].startLevel();
        }
      } else if (this.finished || this.gameOver) {
        this.reset();
      }
    });
  }

  get currentLevel() {
    return this.levels[this.currentLevelIdx];
  }

  reset() {
    this.player.reset();
    this.currentLevelIdx = 0;
    this.score = 0;
    this.started = false;
    this.showLevelScreen = false;
    this.finished = false;
    this.gameOver = false;
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
      // also this probably updates based on frame rates which can differ
      // so probably need to make this explicitly time based
    }
  }

  drawScore() {
    this.ctx.font = "24px sans-serif";
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";
    this.ctx.fillText(`Score: ${this.score}`, MARGIN, MARGIN);
  }

  drawPlayerStatus() {
    this.ctx.font = "24px serif";
    this.ctx.textBaseline = "alphabetic";

    const { hungerLevel } = this.player;

    const w = 250;
    const cellW = w / this.player.fullMax;
    const curBarW = cellW * hungerLevel;
    const h = 10;

    this.ctx.save();
    const padding = 1;
    this.ctx.strokeStyle = "black";
    this.ctx.strokeRect(
      MARGIN - padding,
      this.canvas.height - MARGIN - h - padding,
      w + padding * 2,
      h + padding * 2
    );

    let blink = false;
    if (hungerLevel <= 1 || hungerLevel >= 9) {
      blink = Math.floor(this.reqID / 10) % 2 === 0;
    } else if (hungerLevel <= 2 || hungerLevel >= 8) {
      blink = Math.floor(this.reqID / 20) % 2 === 0;
    }

    this.ctx.fillStyle = blink ? "transparent" : "black";
    this.ctx.fillRect(MARGIN, this.canvas.height - MARGIN - h, curBarW, h);
    this.ctx.restore();

    this.ctx.textAlign = "left";
    this.ctx.fillText(
      `Hunger Level: ${this.player.hungerLevel}`,
      MARGIN,
      this.canvas.height - MARGIN - h
    );

    this.ctx.textAlign = "right";
    this.ctx.fillText(
      `Allergy Tolerance: ${this.player.allergyTolerance}`,
      this.canvas.width - MARGIN,
      this.canvas.height - MARGIN
    );
  }

  checkGameOver() {
    if (this.player.checkAllergyTolerance() || this.player.checkHunger()) {
      this.gameOver = true;
    }
  }

  drawTitle(text) {
    this.ctx.font = "48px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "alphabetic";
    this.ctx.fillText(text, this.canvas.width / 2, 150);
  }

  drawSubtitle(text) {
    const drawMultilineText = (text, x, y, lineHeight) => {
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        this.ctx.fillText(lines[i], x, y + i * lineHeight);
      }
    };
    this.ctx.font = "24px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "alphabetic";
    drawMultilineText(text, this.canvas.width / 2, 190, 30);
  }

  drawCTA(text) {
    this.ctx.font = "18px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "alphabetic";
    this.ctx.fillText(text, this.canvas.width / 2, 300);
  }

  drawStartScreen() {
    this.drawTitle("Dairy Free Donny");
    this.drawSubtitle(
      `Donny has food allergies. Avoid foods with allergens and\nmake sure Donny doesn't eat too much or too little.`
    );
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
    this.drawSubtitle(gameOverText + `\nFinal Score: ${this.score}`);
    this.drawCTA("Click to replay");
  }

  drawWinScreen() {
    this.drawTitle("You Win! Donny is satisfied");
    this.drawSubtitle(`Final Score: ${this.score}`);
    this.drawCTA("Click to replay");
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

  const allLevelProperties = [
    // level 1 - less foods and allergens
    {
      foodPool: [
        "apple",
        "chicken",
        "milk",
        "egg",
        "pizza",
        "egg",
        "apple",
        "chicken",
        "pizza",
        "bread",
        "steak",
      ],
      allergiesToAvoid: ["dairy"],
      releaseInterval: 1000,
    },
    // level 2 - more foods and possibility of being too full
    // bread becomes an allergen
    {
      foodPool: [
        "egg",
        "apple",
        "frenchfries",
        "milk",
        "bread",
        "steak",
        "egg",
        "pizza",
        "banana",
        "chicken",
        "hotdog",
        "frenchfries",
        "banana",
        "cheeseburger",
      ],
      allergiesToAvoid: ["dairy", "gluten"],
      releaseInterval: 900,
    },
    // level 3 - most foods and possibility of being hungry
    // new foods with previous allergies like icecream and cake
    {
      foodPool: [
        "bread", // n
        "carrot", // y
        "milk", // n
        "apple", // y
        "chicken", // y
        "milk", // n
        "steak", // y
        "pistachios", // n
        "peanutbutter", // n
        "egg", // y
        "pizza", // n
        "watermelon", // n
        "icecream", // n
        "bread", // n
        "frenchfries", // y
        "milk", // n
        "carrot", // y
        "cake", // n
        "pizza", // n
        "bread", // n
        "strawberry", // y
        "peanutbutter", // n
        "banana", // y
        "pistachios", // n
      ],
      allergiesToAvoid: ["dairy", "gluten", "nuts"],
      releaseInterval: 800,
    },
    // level 4 - most foods - red meat
    // steak becomes allergen
    // can be too full and then too hungry
    // new foods that are allergy free
    {
      foodPool: [
        "chicken", // y
        "watermelon", // y
        "icecream", // n
        "apple", // y
        "cake", // n
        "egg", // y
        "avocado", // y
        "frenchfries", // y
        "carrot", // y
        "sushi", // y
        "milk", // n
        "bacon", // n
        "banana", // y
        "steak", // n
        "peanutbutter", // n
        "strawberry", // y
        "egg", // y
        "bacon", // n
        "pistachios", // n
        "milk", // n
        "strawberry", // y
        "icecream", // n
        "pizza", // n
        "steak", // n
        "sushi", // y
        "cheeseburger", // n
        "bread", // n
        "peanutbutter", // n
        "apple", // y
        "cake", // n
        "bacon", // n
        "pistachios", // n
        "avocado", // y
        "pizza", // n
        "cheeseburger", // n
      ],
      allergiesToAvoid: ["dairy", "gluten", "nuts", "red meat"],
      releaseInterval: 600,
    },
  ];

  // generate levels
  for (let levelProperties of allLevelProperties) {
    const level = new Level({ player, ...levelProperties });
    game.addLevel(level);
  }

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
    game.reqID = requestAnimationFrame(animate);
  }

  game.reqID = requestAnimationFrame(animate);
  // cancelAnimationFrame(myReq);
};

main();
