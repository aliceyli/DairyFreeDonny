// keeps track of actor properties
class Actor {
  constructor({ imgSrc, initialx, initialy, width, height, ctx, speed }) {
    this.img = new Image();
    this.img.src = imgSrc;
    this.x = initialx;
    this.y = initialy;
    this.width = width;
    this.height = height;
    this.ctx = ctx;
    this.speed = speed;
  }
}

// adds event listeners to player
class Donny extends Actor {
  constructor({ imgSrc, initialx, initialy, width, height, ctx, speed = 4 }) {
    super({ imgSrc, initialx, initialy, width, height, ctx, speed });
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

  update() {
    if (this.keys["ArrowDown"]) {
      this.y += this.speed;
    }
    if (this.keys["ArrowUp"]) {
      this.y -= this.speed;
    }
    if (this.keys["ArrowRight"]) {
      this.x += this.speed;
    }
    if (this.keys["ArrowLeft"]) {
      this.x -= this.speed;
    }

    // this.draw();
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
    ctx,
    speed = -2,
    releaseTime = 0,
    points = 1,
  }) {
    super({ imgSrc, initialx, initialy, width, height, ctx, speed });
    this.releaseTime = releaseTime;
    this.collided = false;
    this.points = points;
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
  constructor({ player, duration, obstacleNum }) {
    this.startTime = Date.now();
    this.duration = duration;
    this.score = 0;
    this.ctx;
    this.player = player;
    this.foods = [];
    this.obstacleNum = obstacleNum;
  }

  get timeElapsed() {
    return Date.now() - this.startTime;
  }

  addFood(food) {
    this.foods.push(food);
  }

  drawScore() {
    this.ctx.font = "24px serif";
    this.ctx.fillText(`Score: ${this.score}`, 10, 50);
  }

  updateScore() {
    for (let food of this.foods) {
      if (food.isColliding(this.player)) {
        this.score += food.points;
      }
    }
  }

  drawAllActors(t) {
    this.player.update();
    this.ctx.drawImage(
      this.player.img,
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height
    );

    for (let food of this.foods) {
      if (t > food.releaseTime) {
        food.update();
        this.ctx.drawImage(food.img, food.x, food.y, food.width, food.height);
      }
    }
  }
}

// create game and keeps track of levels
class Game {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.levels = [];
  }

  addLevel(level) {
    level.ctx = this.ctx;
    this.levels.push(level);
  }
}

const generateFood = (game, level) => {
  const FOODS = [
    { imgSrc: "images/apple.png" },
    { imgSrc: "images/milk.png" },
    { imgSrc: "images/egg.png" },
    { imgSrc: "images/pizza.png" },
  ];

  const foodWidth = 50;
  const foodHeight = 60;

  const getRandomNumber = (n) => {
    return Math.floor(Math.random() * n);
  };

  for (let i = 0; i < level.obstacleNum; i++) {
    const randFoodIdx = getRandomNumber(FOODS.length);
    const randInitialY = getRandomNumber(game.canvas.height - foodHeight); // to-do: add start
    const randReleaseTime = getRandomNumber(level.duration); // to-do: add start as 2000 (2 seconds)

    const food = new Food({
      ...FOODS[randFoodIdx],
      initialx: game.canvas.width,
      initialy: randInitialY,
      width: foodWidth,
      height: foodHeight,
      releaseTime: randReleaseTime,
    });

    level.addFood(food);
  }
};

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
    duration: 30000,
    obstacleNum: 30,
  });
  game.addLevel(level1);

  generateFood(game, level1);

  // Animation loop
  function animate(t) {
    level1.ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
    level1.drawScore();
    level1.drawAllActors(t);
    level1.updateScore();

    requestAnimationFrame(animate);
  }

  animate(level1.timeElapsed);
};

main();
