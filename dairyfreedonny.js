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
  constructor({ imgSrc, initialx, initialy, width, height, speed = 4 }) {
    super({ imgSrc, initialx, initialy, width, height, speed });
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
    releaseTime = 0,
    points = 1,
    allergies = [],
  }) {
    super({ imgSrc, initialx, initialy, width, height, speed });
    this.releaseTime = releaseTime;
    this.collided = false;
    this.points = points;
    this.allergies = allergies;
  }

  update() {
    if (this.collided) {
      // how do i destroy the objects or is it ok to just put them off screen?
      this.x = -100;
      this.y = -100;
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

// keeps track of actors, score and time
// draws actors and score
class Level {
  constructor({ player, duration, obstacleNum, startTime }) {
    this.startTime = startTime;
    this.duration = duration;
    this.score = 0;
    this.allergyTolerance = 3;
    this.player = player;
    this.foods = [];
    this.obstacleNum = obstacleNum;

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

  addFood(food) {
    this.foods.push(food);
  }

  drawScore() {
    this.ctx.font = "24px serif";
    this.ctx.textAlign = "left";
    this.ctx.fillText(`Score: ${this.score}`, 10, this.canvas.height - 10);
    this.ctx.textAlign = "right";
    this.ctx.fillText(
      `Allergy Tolerance: ${this.allergyTolerance}`,
      this.canvas.width - 10,
      this.canvas.height - 10
    );
  }

  updateScore() {
    for (let food of this.foods) {
      if (food.isColliding(this.player)) {
        if (food.allergies.includes("dairy")) {
          this.allergyTolerance--;
        } else {
          this.score += food.points;
        }
      }
    }
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

    for (let food of this.foods) {
      if (this.timeElapsed > food.releaseTime) {
        food.update();
        this.ctx.drawImage(food.img, food.x, food.y, food.width, food.height);
      }
    }
  }

  generateFood() {
    const FOODS = [
      { imgSrc: "images/apple.png" },
      { imgSrc: "images/milk.png", allergies: ["dairy"] },
      { imgSrc: "images/egg.png" },
      { imgSrc: "images/pizza.png", allergies: ["dairy"] },
    ];

    const foodWidth = 50;
    const foodHeight = 60;

    const getRandomNumber = (n) => {
      return Math.floor(Math.random() * n);
    };

    for (let i = 0; i < this.obstacleNum; i++) {
      const randFoodIdx = getRandomNumber(FOODS.length);
      const randInitialY = getRandomNumber(this.canvas.height - foodHeight); // to-do: add start
      const randReleaseTime = getRandomNumber(this.duration); // to-do: add start as 2000 (2 seconds)

      const food = new Food({
        ...FOODS[randFoodIdx],
        initialx: this.canvas.width,
        initialy: randInitialY,
        width: foodWidth,
        height: foodHeight,
        releaseTime: randReleaseTime,
      });

      this.addFood(food);
    }
  }
}

// create game and keeps track of levels
class Game {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.levels = [];
    this.currentLevel;
    this.showMenu = true;
    this.finished = false;
    this.gameOver = false;

    this.canvas.addEventListener("click", (event) => {
      if (this.showMenu) {
        this.showMenu = false;
        // initialize level start time!
        this.currentLevel.startTime = Date.now();
      }
    });
  }

  addLevel(level) {
    level.canvas = this.canvas;
    level.ctx = this.ctx;
    this.levels.push(level);

    // initialize currentLevel if null
    if (!this.currentLevel) {
      this.currentLevel = this.levels[0];
    }
  }

  nextLevel() {
    if (this.levels.length > 0 && this.currentLevel) {
      const curLevelIdx = this.levels.indexOf(this.currentLevel);
      const nextLevelIdx = curLevelIdx + 1;
      if (nextLevelIdx < this.levels.length) {
        this.currentLevel = this.levels[nextLevelIdx];
      } else {
        this.finished = true;
      }
    }
  }

  checkGameOver() {
    if (this.currentLevel.allergyTolerance <= 0) {
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

  drawMenu() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawTitle("Dairy Free Donny");
    this.drawSubtitle("Click to continue");
  }

  drawGameOverScreen() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // title
    this.drawTitle("Game Over");
    this.drawSubtitle("You fed Donny dairy");
  }

  drawWinScreen() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // title
    this.drawTitle("Game Finished");
  }
}

const main = () => {
  const game = new Game("myCanvas");

  const player = new Donny({
    imgSrc: "images/donny.png",
    initialx: 50,
    initialy: game.canvas.height / 2 - 40,
    width: 70,
    height: 80,
  });

  const level1 = new Level({
    player,
    duration: 20000,
    obstacleNum: 20,
  });
  game.addLevel(level1);
  level1.generateFood();

  const level2 = new Level({
    player,
    duration: 10000,
    obstacleNum: 10,
  });
  game.addLevel(level2);
  level2.generateFood();

  let myReq;
  function animate(t) {
    if (game.gameOver) {
      game.drawGameOverScreen();
    } else if (game.finished) {
      game.drawWinScreen();
    } else if (game.showMenu) {
      game.drawMenu();
    } else if (game.currentLevel.completed) {
      game.showMenu = true;
      game.nextLevel();
    } else {
      console.log(game.currentLevel.timeElapsed);
      game.ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
      game.currentLevel.drawScore();
      game.currentLevel.drawAllActors();
      game.currentLevel.updateScore();
      game.checkGameOver();
    }
    myReq = requestAnimationFrame(animate);
  }

  myReq = requestAnimationFrame(animate);
  // cancelAnimationFrame(myReq);
};

main();
