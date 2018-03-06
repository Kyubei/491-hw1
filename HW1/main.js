var socket = io.connect("http://24.16.255.56:8888");
var platforms = [];
var particles = [];
var arrows = [];
var character;
var gameEngine = new GameEngine();

socket.on("load", function (data) {
	console.log("loading: "+data.statename+": data amount - "+data.data.length);
	if (data.statename === "blocks") {
		if (data.data.length === 0) {
		    for (i = 0; i < 15; i++) {
		    	for (j = 0; j < 6; j++) {
		    		var newBlock = new Platform(gameEngine, 150 + i * 50, 500 + j * 25, 50, 25, "gray");
		    		platforms.push(newBlock);
		    		gameEngine.addEntity(newBlock);
		    	}
		    }
		} else {
			for (i = 0; i < data.data.length; i++) {
				var raw = data.data[i];
				var newBlock = new Platform(gameEngine, Number(raw[1]), Number(raw[2]), 50, 25, "gray");
				newBlock.deadTicks = Number(raw[0]);
				newBlock.alpha = parseFloat(raw[3]);
				platforms.push(newBlock);
				gameEngine.addEntity(newBlock);
				
			}
		}
	}
	if (data.statename === "particles") {
		for (i = 0; i < data.data.length; i++) {
			var raw = data.data[i];
			var newPart = new Particle(parseFloat(raw[0]), parseFloat(raw[1]), parseFloat(raw[2]), parseFloat(raw[3]),
					parseFloat(raw[3]), parseFloat(raw[4]), parseFloat(raw[4]),	parseFloat(raw[5]), parseFloat(raw[6]), 
					0, parseFloat(raw[7]), parseFloat(raw[8]), parseFloat(raw[9]), parseFloat(raw[10]), 0, (raw[11] == 'true'), gameEngine, 
					new Animation(ASSET_MANAGER.getAsset("./img/pink_flare.png"), 0, 0, 64, 64, 0.03, 16, true, false, 0, 0));
			newPart.life = raw[12];
			newPart.animation.elaspedTime = raw[13];
			particles.push(newPart);
			gameEngine.addEntity(newPart);
		}
	}
	if (data.statename === "arrows") {
		for (i = 0; i < data.data.length; i++) {
			var raw = data.data[i];
			var newArrow = new Arrow(raw[0], raw[1], gameEngine);
			newArrow.hSpeed = raw[3];
			newArrow.vSpeed = raw[4];
			newArrow.starting = (raw[2] == 'true');
			newArrow.tick = raw[5];
			newArrow.life = raw[6];
			newArrow.generation = raw[7];
			newArrow.lastCollision = raw[8];
			arrows.push(newArrow);
			gameEngine.addEntity(newArrow);
		}
	}
	if (data.statename === "attacking") {
		character.attacking = (data.data == 'true');
	}
	if (data.statename === "step") {
		character.step = Number(data.data);
	}
	if (data.statename === "clock") {
		gameEngine.clockTick = parseFloat(data.data);
	}
	if (data.statename === "animTime") {
		character.animation.elaspedTime = parseFloat(data.data);
	}
	if (data.statename === "attackTime") {
		character.attackAnimation.elaspedTime = parseFloat(data.data);
	}
    console.log(data);
});

function Animation(spriteSheet, startX, startY, frameWidth, frameHeight, frameDuration, frames, loop, reverse, offsetX, offsetY) {
    this.spriteSheet = spriteSheet;
    this.startX = startX;
    this.startY = startY;
    this.frameWidth = frameWidth;
    this.frameDuration = frameDuration;
    this.frameHeight = frameHeight;
    this.frames = frames;
    this.totalTime = frameDuration * frames;
    this.elapsedTime = 0;
    this.loop = loop;
    this.reverse = reverse;
	this.offsetX = offsetX || 0;
	this.offsetY = offsetY || 0;
}

Animation.prototype.drawFrame = function (tick, ctx, x, y, scaleBy) {
    var scaleBy = scaleBy || 1;
    this.elapsedTime += tick;
    if (this.loop) {
        if (this.isDone()) {
            this.elapsedTime = 0;
        }
    } else if (this.isDone()) {
        return;
    }
    var index = this.reverse ? this.frames - this.currentFrame() - 1 : this.currentFrame();
    var vindex = 0;
    if ((index + 1) * this.frameWidth + this.startX > this.spriteSheet.width) {
        index -= Math.floor((this.spriteSheet.width - this.startX) / this.frameWidth);
        vindex++;
    }
    while ((index + 1) * this.frameWidth > this.spriteSheet.width) {
        index -= Math.floor(this.spriteSheet.width / this.frameWidth);
        vindex++;
    }

    var locX = x;
    var locY = y;
    var offset = vindex === 0 ? this.startX : 0;
    ctx.drawImage(this.spriteSheet,
                  index * this.frameWidth + offset, vindex * this.frameHeight + this.startY,  // source from sheet
                  this.frameWidth, this.frameHeight,
                  locX, locY,
                  this.frameWidth * scaleBy,
                  this.frameHeight * scaleBy);
}

Animation.prototype.currentFrame = function () {
    return Math.floor(this.elapsedTime / this.frameDuration);
}

Animation.prototype.isDone = function () {
    return (this.elapsedTime >= this.totalTime);
}

function Background(game) {
    Entity.call(this, game, 0, 400);
    this.radius = 200;
}

Background.prototype = new Entity();
Background.prototype.constructor = Background;

Background.prototype.update = function () {
}

Background.prototype.draw = function (ctx) {
    ctx.fillStyle = "SaddleBrown";
    ctx.fillRect(0,500,800,300);
    Entity.prototype.draw.call(this);
}

var ARROW_PART_MAIN = 1;
var ARROW_PART_SECONDARY = 2;

function makeParticleData() {
	var data = [];
	for (i = 0; i < particles.length; i++) {
		var particle = particles[i];
		var newData = [];
		newData.push(particle.particleId);
		newData.push(particle.x);
		newData.push(particle.y);
		newData.push(particle.hSpeed);
		newData.push(particle.vSpeed);
		newData.push(particle.gravity);
		newData.push(particle.friction);
		newData.push(particle.maxLife);
		newData.push(particle.fadeIn);
		newData.push(particle.fadeOut);
		newData.push(particle.maxAlpha);
		newData.push(particle.shrink);
		newData.push(particle.life);
		newData.push(particle.elaspedTime);
		data.push(newData);
	}
	return data;
}

function Particle(particleId, x, y, minHSpeed, maxHSpeed, minVSpeed, maxVSpeed,
	gravity, friction, width, maxLife, fadeIn, fadeOut, maxAlpha, alphaVariance, shrink, game, anim) {
	this.particleId = particleId;
	this.GRAVITY_CAP = 6;
	this.animation = anim;
	this.hSpeed = maxHSpeed - (Math.random() * (maxHSpeed - minHSpeed));
	this.vSpeed = maxVSpeed - (Math.random() * (maxVSpeed - minVSpeed));
	this.gravity = gravity;
	this.friction = friction; //horizontal friction only
	this.life = 0;
	this.maxLife = maxLife;
	this.fadeIn = fadeIn;
	this.fadeOut = fadeOut;
	this.shrink = shrink;
	this.sizeScale = 1;
	this.maxAlpha = maxAlpha + Math.random() * (alphaVariance * 2) - alphaVariance;
	if (fadeIn > 0)
		this.alpha = 0;
	else
		this.alpha = maxAlpha;
    Entity.call(this, game, x + Math.random() * (width * 2) - width, y + Math.random() * (width * 2) - width);
}

Particle.prototype = new Entity();
Particle.prototype.constructor = Particle;

Particle.prototype.update = function() {
	if (this.particleId === ARROW_PART_MAIN) {
		/*this.game.addEntity(new Particle(ARROW_PART_SECONDARY, this.x + 20, this.y + 20, 3, -3, 3, 0,
			0, 0, 0, 10, 10, 10, 1, 0, true, this.game,
		new Animation(ASSET_MANAGER.getAsset("./img/small_flare.png"), 0, 0, 12, 12, 1, 1, false, false, 0, 0)));*/
	}
	if (this.life < this.fadeIn) {
		this.alpha = this.life / this.fadeIn;
	}
	if (this.life > this.maxLife) {
		this.alpha = 1 - ((this.life - this.maxLife) / this.fadeOut)
	}
	if (this.life > this.maxLife + this.fadeOut) {
		this.removeFromWorld = true;
	}
	if (this.shrink) {
		this.sizeScale = 1 - this.life / (this.maxLife + this.fadeOut);
	}
	if (this.hSpeed > 0) {
		this.hSpeed -= this.friction;
		if (this.hSpeed <= 0)
			this.hSpeed = 0;
	}
	if (this.hSpeed < 0) {
		this.hSpeed += this.friction;
		if (this.hSpeed >= 0)
			this.hSpeed = 0;
	}
	this.vSpeed += this.gravity;
	if (this.vSpeed > this.GRAVITY_CAP)
		this.vSpeed = this.GRAVITY_CAP;
	this.x += this.hSpeed;
	this.y += this.vSpeed;
	if (this.y >= 800)
		this.removeFromWorld = true;
	if (this.removeFromWorld) {
		particles.splice(particles.indexOf(this), 1);
	}
	this.life++;
    Entity.prototype.update.call(this);
}

Particle.prototype.draw = function (ctx) {
	ctx.globalAlpha = this.alpha * this.maxAlpha;
    this.animation.drawFrame(this.game.clockTick, ctx, this.x + this.animation.offsetX,
		this.y + this.animation.offsetY, this.sizeScale, this.sizeScale);
    Entity.prototype.draw.call(this);
	ctx.globalAlpha = 1;
}

/**
 * Checks a collision between two entities, adding a bonus X or Y value to the
 * hitboxes of entity 1 if applicable.
 */
function checkCollision(entity1, entity2) {
	if (entity1.hitBox == null || entity2.hitBox == null)
		return false;
    if ((entity1.hitBox.x + entity1.hitBox.width) > entity2.hitBox.x) {
        if (entity1.hitBox.x < (entity2.hitBox.x + entity2.hitBox.width)) {
            if (entity1.hitBox.y < entity2.hitBox.y + entity2.hitBox.height) {
                if (entity1.hitBox.y + entity1.hitBox.height > entity2.hitBox.y) {
                    return true;
                }
            }
        }
    }
    return false;
}

function makeArrowData() {
	var data = [];
	for (i = 0; i < arrows.length; i++) {
		var arrow = arrows[i];
		var newData = [];
		newData.push(arrow.x);
		newData.push(arrow.y);
		newData.push(arrow.starting);
		newData.push(arrow.hSpeed);
		newData.push(arrow.vSpeed);
		newData.push(arrow.tick);
		newData.push(arrow.life);
		newData.push(arrow.generation);
		newData.push(arrow.lastCollision);
		data.push(newData);
	}
	return data;
}

function Arrow(x, y, game) {
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/arrow.png"), 0, 0, 184, 29, 0.1, 1, true, false, 0, 0);
    this.startAnimation = new Animation(ASSET_MANAGER.getAsset("./img/arrow_start.png"), 0, 0, 184, 29, 0.05, 10, false, false, 0, 0);
	this.starting = true;
	this.travelX = 0;
	this.hSpeed = 0;
	this.vSpeed = 0;
	this.tick = 0;
	this.life = 0;
	this.generation = 0;
	this.lastCollision = "none";
    this.hitBox = {
    	x: this.x, 
		y: this.y,
		width: 10, 
		height: 10
	};
    Entity.call(this, game, x, y);
}

Arrow.prototype = new Entity();
Arrow.prototype.constructor = Arrow;

Arrow.prototype.update = function() {
	if (this.life > 0) {
		this.life--;
		if (this.life == 0) {
			this.removeFromWorld = true;
		}
	}
	this.tick++;
	if (this.tick >= 1000) {
		this.removeFromWorld = true;
	}
	if (this.tick >= 30 && this.starting) {
		this.starting = false;
		this.hSpeed = 3 + Math.random() * 12;
		this.vSpeed = -2 + Math.random() * 10;
	}

	//function Particle(particleId, x, y, minHSpeed, maxHSpeed, minVSpeed, maxVSpeed,
	//	gravity, friction, width, maxLife, fadeIn, fadeOut, maxAlpha, alphaVariance, shrink, game, anim) {
	if (this.lastCollision === "blue")  {
		this.lastCollision = "none";
		if (this.generation < 1) {
			for (i = 0; i < 3; i++) {
				var newArrow = new Arrow(this.x, this.y, this.game);
				newArrow.starting = false;
				newArrow.hSpeed = this.hSpeed + (i * 8) - 4;
				newArrow.vSpeed = this.vSpeed;
				newArrow.tick = this.tick;
				newArrow.life = 50;
				newArrow.generation = this.generation + 1;
				arrows.push(newArrow);
				this.game.addEntity(newArrow);
			}
		}
	}
	if (this.lastCollision === "blue") {
		var part = new Particle(ARROW_PART_MAIN, this.x, this.y - 10, 0.2, -0.2, 0.2, -0.2, 0, 0, 5, 50, 10, 50, 0.7, 0.2, true, this.game,
				new Animation(ASSET_MANAGER.getAsset("./img/pink_flare.png"), 0, 0, 64, 64, 0.03, 16, true, false, 0, 0));
		particles.push(part);
		this.game.addEntity(part);
	} else {
		var part = new Particle(ARROW_PART_MAIN, this.x, this.y - 10, 0.2, -0.2, 0.2, -0.2, 0, 0, 5, 5, 10, 50, 0.7, 0.2, true, this.game,
				new Animation(ASSET_MANAGER.getAsset("./img/pink_flare.png"), 0, 0, 64, 64, 0.03, 16, true, false, 0, 0));
		particles.push(part);
		this.game.addEntity(part);
	}
	if (!this.starting) {
		this.x += this.hSpeed;
		//this.travelX += 6;
		this.vSpeed += 0.3;
		if (this.vSpeed >= 20)
			this.vSpeed = 20;
		this.y += this.vSpeed;
		this.hitBox.x = this.x;
		this.hitBox.y = this.y;
		var that = this;
		if (this.y >= 700)
			this.vSpeed *= -1;
		else
		this.game.entities.forEach(function(entity) {
	    	if (entity.solid) {
		        if (checkCollision(that, entity) && entity.alpha > 0) {
		        	if (that.y > entity.hitBox.y && that.y < entity.hitBox.y + entity.hitBox.height) {
		        		that.hSpeed *= -1;
		        		that.x += that.hSpeed;
		        	} else {
		        		that.vSpeed *= -1;
		        		that.y += that.vSpeed;
		        	}
		        	if (entity.color === "gray") {
		        		entity.alpha -= 0.1;
		        		if (entity.alpha < 0) {
		        			entity.deadTicks = 500;
		        			entity.alpha = 0;
		        		}
		        	}
		        	that.lastCollision = entity.color;
		        }
	    	}
	    });
		if (this.x >= 800) {
			this.hSpeed *= -1;
		}
		if (this.y >= 1200) {
			this.removeFromWorld = true;
		}
	}
	if (this.removeFromWorld) {
		arrows.splice(arrows.indexOf(this), 1);
	}
	
    Entity.prototype.update.call(this);
}

Arrow.prototype.draw = function (ctx) {
    if (this.starting) {
        //this.startAnimation.drawFrame(this.game.clockTick, ctx, this.x + this.startAnimation.offsetX, this.y + this.startAnimation.offsetY);
    } else {
        //this.animation.drawFrame(this.game.clockTick, ctx, this.x + this.animation.offsetX, this.y + this.animation.offsetY);
    }
    Entity.prototype.draw.call(this);
}


function Character(game) {
	socket.emit("load", { studentname: "Stan Hu", statename: "blocks" });
	socket.emit("load", { studentname: "Stan Hu", statename: "particles" });
	socket.emit("load", { studentname: "Stan Hu", statename: "arrows" });
    this.animation = new Animation(ASSET_MANAGER.getAsset("./img/madoka_idle.png"), 0, 0, 673 / 8 - 1, 133, 0.1, 8, true, false, 0, 0);
    this.runAnimation = new Animation(ASSET_MANAGER.getAsset("./img/madoka_run.png"), 0, 0, 811 / 8 - 1, 133, 0.1, 8, true, false, 8, -5);
    this.attackAnimation = new Animation(ASSET_MANAGER.getAsset("./img/madoka_arrow.png"), 0, 0, 811 / 6 - 1, 133, 0.1, 9, false, false, -23, -8);
	this.running = false;
    this.jumping = false;
	this.attacking = false;
    this.radius = 100;
    this.ground = 400;
    this.step = 0;
	socket.emit("load", { studentname: "Stan Hu", statename: "attacking" });
	socket.emit("load", { studentname: "Stan Hu", statename: "step" });
	socket.emit("load", { studentname: "Stan Hu", statename: "clock" });
	socket.emit("load", { studentname: "Stan Hu", statename: "animTime" });
	socket.emit("load", { studentname: "Stan Hu", statename: "attackTime" });
    Entity.call(this, game, 0, 84);
}

Character.prototype = new Entity();
Character.prototype.constructor = Character;

Character.prototype.update = function () {
	this.step++;
	if (this.step % 300 === 0) {
		if (!this.attacking) {
			this.attacking = true;
			this.running = false;
			var newArrow = new Arrow(this.x, this.y + 40, this.game);
			arrows.push(newArrow);
			this.game.addEntity(newArrow);
		}
	}
    /*if (this.game.right && !this.attacking)
		this.running = true;
	if (this.game.rightUp)
		this.running = false;
	if (this.running) {
		this.x += 6;
		if (this.x > 850)
			this.x = -150;
	}*/
	if (this.attacking) {
        if (this.attackAnimation.isDone()) {
            this.attackAnimation.elapsedTime = 0;
            this.attacking = false;
        }
	}
	socket.emit("save", { studentname: "Stan Hu", statename: "blocks", data: makeBlockData() });
	socket.emit("save", { studentname: "Stan Hu", statename: "particles", data: makeParticleData() });
	socket.emit("save", { studentname: "Stan Hu", statename: "arrows", data: makeArrowData() });
	socket.emit("save", { studentname: "Stan Hu", statename: "attacking", data: this.attacking });
	socket.emit("save", { studentname: "Stan Hu", statename: "step", data: this.step });
	socket.emit("save", { studentname: "Stan Hu", statename: "clock", data: this.game.clockTick });
	socket.emit("save", { studentname: "Stan Hu", statename: "animTime", data: this.animation.elapsedTime });
	socket.emit("save", { studentname: "Stan Hu", statename: "attackTime", data: this.attackAnimation.elapsedTime });
    Entity.prototype.update.call(this);
}

Character.prototype.draw = function (ctx) {
    if (this.running) {
        this.runAnimation.drawFrame(this.game.clockTick, ctx, this.x + this.runAnimation.offsetX, this.y + this.runAnimation.offsetY);
    } else if (this.jumping) {
        this.jumpAnimation.drawFrame(this.game.clockTick, ctx, this.x + this.jumpAnimation.offsetX, this.y + this.jumpAnimation.offsetY);
    } else if (this.attacking) {
        this.attackAnimation.drawFrame(this.game.clockTick, ctx, this.x + this.attackAnimation.offsetX, this.y + this.attackAnimation.offsetY);
    } else {
        this.animation.drawFrame(this.game.clockTick, ctx, this.x + this.animation.offsetX, this.y + this.animation.offsetY);
    }
    Entity.prototype.draw.call(this);
}

function makeBlockData() {
	var data = [];
	for (i = 0; i < platforms.length; i++) {
		var platform = platforms[i];
		var newData = [];
		newData.push(platform.deadTicks);
		newData.push(platform.x);
		newData.push(platform.y);
		newData.push(platform.alpha);
		data.push(newData);
	}
	return data;
}


Platform.prototype = new Entity();
Platform.prototype.constructor = Platform;

function Platform(game, x, y, width, height, color) {
	this.deadTicks = 0;
	this.alpha = 1;
	this.solid = true;
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.color = color;
    this.hitBox = {
    	x: this.x, 
		y: this.y,
		width: width, 
		height: height
	};
    Entity.call(this, game, x, y);
}

Platform.prototype.update = function(ctx) {
	if (this.deadTicks > 0) {
		this.deadTicks--;
		if (this.deadTicks === 0)
			this.alpha = 1;
	}
    Entity.prototype.update.call(this);
}

Platform.prototype.draw = function (ctx) {
	ctx.globalAlpha = this.alpha;
	var old = ctx.fillStyle;
	ctx.fillStyle = this.color;
	ctx.fillRect(this.x, this.y, this.width, this.height);
	ctx.fillStyle = old;
    Entity.prototype.draw.call(this);
    ctx.globalAlpha = 1;
}

// the "main" code begins here

var ASSET_MANAGER = new AssetManager();

ASSET_MANAGER.queueDownload("./img/madoka_idle.png");
ASSET_MANAGER.queueDownload("./img/madoka_run.png");
ASSET_MANAGER.queueDownload("./img/madoka_arrow.png");
ASSET_MANAGER.queueDownload("./img/arrow.png");
ASSET_MANAGER.queueDownload("./img/arrow_start.png");
ASSET_MANAGER.queueDownload("./img/pink_flare.png");
ASSET_MANAGER.queueDownload("./img/small_flare.png");

ASSET_MANAGER.downloadAll(function () {
    console.log("starting up da sheild");
    var canvas = document.getElementById('gameWorld');
    var ctx = canvas.getContext('2d');

    var bg = new Background(gameEngine);
    character = new Character(gameEngine);
    
    var platformMain = new Platform(gameEngine, 0, 200, 100, 600, "black");
    var platform2 = new Platform(gameEngine, 350, 400, 200, 20, "blue");
    var platform3 = new Platform(gameEngine, 100, 700, 700, 50, "black");
    
    //gameEngine.addEntity(bg);
    gameEngine.addEntity(character);
    gameEngine.addEntity(platformMain);
    gameEngine.addEntity(platform2);
    gameEngine.addEntity(platform3);
 
    gameEngine.init(ctx);
    gameEngine.start();
});