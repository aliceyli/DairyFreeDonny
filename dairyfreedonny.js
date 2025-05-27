class Actor {
  constructor({ imgSrc, initialx, initialy, width, height, ctx, speed = 2 }) {
    this.img = new Image();
    this.img.src = imgSrc;
    this.x = initialx;
    this.y = initialy;
    this.width = width;
    this.height = height;
    this.ctx = ctx;
    this.speed = speed;
  }

  draw() {
    // When this script gets executed, the image starts loading.
    // You need to be sure to use the load event so you don't draw the image to the canvas before it's ready
    // this seems to not be an issue with the requestanimationfrme loop though, so not sure if i need to come back to this???
    // this.img.addEventListener("load", (e) => {
    if (this.x > this.x * -1) {
      // is this necessary to stop drawing once its off screen?
      this.ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
    }
    // });
  }
}

class Donny extends Actor {
  constructor({ imgSrc, initialx, initialy, width, height, ctx, speed }) {
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

    this.draw();
  }
}

class Food extends Actor {
  constructor({
    imgSrc,
    initialx,
    initialy,
    width,
    height,
    ctx,
    speed,
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
      this.draw();
    }
  }

  collides(donny) {
    this.collided =
      (donny.x >= this.x && donny.x <= this.x + this.width) ||
      (donny.x + donny.width >= this.x &&
        donny.x + donny.width <= this.x + this.width) ||
      (donny.x <= this.x && donny.x + donny.width >= this.x + this.width);

    return this.collided;
  }

  // TO-DO: explore when you might want to use this and translate like in https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations
  // update() {
  //   this.ctx.save();
  //   this.ctx.translate(this.x + this.speed, 0);
  //   this.x = this.x + this.speed;
  // }
}

class Level {
  constructor(ctx) {
    this.startTime = Date.now();
    this.score = 0;
    this.ctx = ctx;
  }

  get timeElapsed() {
    return Date.now() - this.startTime;
  }

  draw() {
    this.ctx.font = "24px serif";
    this.ctx.fillText(`Score: ${this.score}`, 10, 50);
  }

  updateScore(points) {
    this.score += points;
  }
}

const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

let player = new Donny({
  imgSrc: "images/donny.png",
  initialx: 50,
  initialy: canvas.height / 2 - 40,
  width: 70,
  height: 80,
  ctx: ctx,
});

let apple = new Food({
  imgSrc: "images/apple.png",
  initialx: canvas.width,
  initialy: 50,
  width: 50,
  height: 60,
  ctx: ctx,
  speed: -2,
  releaseTime: 2000,
});

let milk = new Food({
  imgSrc: "images/milk.png",
  initialx: canvas.width,
  initialy: 150,
  width: 50,
  height: 60,
  ctx: ctx,
  speed: -2,
  releaseTime: 4000,
  points: -2,
});

let egg = new Food({
  imgSrc: "images/egg.png",
  initialx: canvas.width,
  initialy: 250,
  width: 50,
  height: 60,
  ctx: ctx,
  speed: -2,
  releaseTime: 5000,
});

let pizza = new Food({
  imgSrc: "images/pizza.png",
  initialx: canvas.width,
  initialy: 340,
  width: 50,
  height: 60,
  ctx: ctx,
  speed: -2,
  releaseTime: 8000,
  points: -1,
});

// Animation loop
function animate(t) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  level1.draw();

  player.update();

  if (t > apple.releaseTime) {
    apple.update();
    if (apple.collides(player)) {
      level1.updateScore(apple.points);
    }
  }
  if (t > milk.releaseTime) {
    milk.update();
    if (milk.collides(player)) {
      level1.updateScore(milk.points);
    }
  }
  if (t > egg.releaseTime) {
    egg.update();
    if (egg.collides(player)) {
      level1.updateScore(egg.points);
    }
  }
  if (t > pizza.releaseTime) {
    pizza.update();
    if (pizza.collides(player)) {
      level1.updateScore(pizza.points);
    }
  }

  requestAnimationFrame(animate);
}

const level1 = new Level(ctx);
animate(level1.timeElapsed);
