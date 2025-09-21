let canvas, ctx, w, h, dpr, thunder, particles;
let texts = [];
let finishedCount = 0;
let overlay; // bảng hướng dẫn
let started = false; // để tránh chạy nhiều lần

function resizeCanvas() {
  dpr = window.devicePixelRatio || 1;
  w = window.innerWidth;
  h = window.innerHeight;

  if (canvas) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }
}

// ====== Thunder, Spark, Particles, Text (giữ nguyên như code bạn gửi, chỉ sửa tọa độ Y trong Text.update) ======

function Thunder(options) {
  options = options || {};
  this.lifespan = options.lifespan || Math.round(Math.random() * 10 + 10);
  this.maxlife = this.lifespan;
  this.color = options.color || "#fefefe";
  this.glow = options.glow || "#2323fe";
  this.x = options.x || Math.random() * w;
  this.y = options.y || Math.random() * h;
  this.width = options.width || 2;
  this.direct = options.direct || Math.random() * Math.PI * 2;
  this.max = options.max || Math.round(Math.random() * 10 + 20);
  this.segments = [...new Array(this.max)].map(() => {
    return {
      direct: this.direct + (Math.PI * Math.random() * 0.2 - 0.1),
      length: Math.random() * 20 + 80,
      change: Math.random() * 0.04 - 0.02,
    };
  });

  this.update = function (index, array) {
    this.segments.forEach((s) => {
      (s.direct += s.change) && Math.random() > 0.96 && (s.change *= -1);
    });
    this.lifespan > 0 && this.lifespan-- || this.remove(index, array);
  };

  this.render = function (ctx) {
    if (this.lifespan <= 0) return;
    ctx.beginPath();
    ctx.globalAlpha = this.lifespan / this.maxlife;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.width;
    ctx.shadowBlur = 32;
    ctx.shadowColor = this.glow;
    ctx.moveTo(this.x, this.y);
    let prev = { x: this.x, y: this.y };
    this.segments.forEach((s) => {
      const x = prev.x + Math.cos(s.direct) * s.length;
      const y = prev.y + Math.sin(s.direct) * s.length;
      prev = { x: x, y: y };
      ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.closePath();
    ctx.shadowBlur = 0;

    const strength = Math.random() * 80 + 40;
    const light = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      strength
    );
    light.addColorStop(0, "rgba(250, 200, 50, 0.6)");
    light.addColorStop(0.1, "rgba(250, 200, 50, 0.2)");
    light.addColorStop(0.4, "rgba(250, 200, 50, 0.06)");
    light.addColorStop(0.65, "rgba(250, 200, 50, 0.01)");
    light.addColorStop(0.8, "rgba(250, 200, 50, 0)");
    ctx.beginPath();
    ctx.fillStyle = light;
    ctx.arc(this.x, this.y, strength, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  };

  this.remove = function (index, array) {
    array.splice(index, 1);
  };
}

function Spark(options) {
  options = options || {};
  this.x = options.x || w * 0.5;
  this.y = options.y || h * 0.5;
  this.v = options.v || {
    direct: Math.random() * Math.PI * 2,
    weight: Math.random() * 14 + 2,
    friction: 0.88,
  };
  this.a = options.a || {
    change: Math.random() * 0.4 - 0.2,
    min: this.v.direct - Math.PI * 0.4,
    max: this.v.direct + Math.PI * 0.4,
  };
  this.g = options.g || {
    direct: Math.PI * 0.5 + (Math.random() * 0.4 - 0.2),
    weight: Math.random() * 0.25 + 0.25,
  };
  this.width = options.width || Math.random() * 3;
  this.lifespan = options.lifespan || Math.round(Math.random() * 20 + 40);
  this.maxlife = this.lifespan;
  this.color = options.color || "#feca32";
  this.prev = { x: this.x, y: this.y };

  this.update = function (index, array) {
    this.prev = { x: this.x, y: this.y };
    this.x += Math.cos(this.v.direct) * this.v.weight;
    this.x += Math.cos(this.g.direct) * this.g.weight;
    this.y += Math.sin(this.v.direct) * this.v.weight;
    this.y += Math.sin(this.g.direct) * this.g.weight;
    this.v.weight > 0.2 && (this.v.weight *= this.v.friction);
    this.v.direct += this.a.change;
    (this.v.direct > this.a.max || this.v.direct < this.a.min) &&
      (this.a.change *= -1);
    this.lifespan > 0 && this.lifespan--;
    this.lifespan <= 0 && this.remove(index, array);
  };

  this.render = function (ctx) {
    if (this.lifespan <= 0) return;
    ctx.beginPath();
    ctx.globalAlpha = this.lifespan / this.maxlife;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.width;
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.prev.x, this.prev.y);
    ctx.stroke();
    ctx.closePath();
  };

  this.remove = function (index, array) {
    array.splice(index, 1);
  };
}

function Particles(options) {
  options = options || {};
  this.max = options.max || Math.round(Math.random() * 10 + 10);
  this.sparks = [...new Array(this.max)].map(() => new Spark(options));

  this.update = function () {
    this.sparks.forEach((s, i) => s.update(i, this.sparks));
  };

  this.render = function (ctx) {
    this.sparks.forEach((s) => s.render(ctx));
  };
}

function Text(options) {
  options = options || {};
  const pool = document.createElement("canvas");
  const buffer = pool.getContext("2d");
  pool.width = w * dpr;
  pool.height = h * dpr;
  buffer.scale(dpr, dpr);
  buffer.fillStyle = "#000000";
  buffer.fillRect(0, 0, w, h);

  this.size = options.size || 50;
  this.copy = (options.copy || `Hello!`) + " ";
  this.color = options.color || "#cd96fe";
  this.delay = options.delay || 1;
  this.basedelay = this.delay;
  buffer.font = `${this.size}px Comic Sans MS`;
  this.logical_bound = buffer.measureText(this.copy);
  this.logical_height = this.size * 1.5;
  this.physical_width = Math.ceil(this.logical_bound.width * dpr);
  this.physical_height = Math.ceil(this.logical_height * dpr);
  this.x = options.x || w * 0.5 - this.logical_bound.width * 0.5;
  this.y = options.y || h * 0.5 - this.size * 1;

  buffer.strokeStyle = this.color;
  buffer.strokeText(this.copy, 0, this.logical_height * 0.8);
  this.data = buffer.getImageData(0, 0, this.physical_width, this.physical_height);
  this.index = 0;
  this.finished = false;

  this.update = function () {
    if (this.finished) return;
    if (this.index >= this.logical_bound.width) {
      this.index = this.logical_bound.width;
      this.finished = true;
      finishedCount++;
      if (finishedCount === texts.length) {
        showRedirectButton();
      }
      return;
    }
    const data = this.data.data;
    const physical_col_start = Math.floor(this.index * dpr);
    const physical_col_end = Math.floor((this.index + 1) * dpr);
    for (let physical_col = physical_col_start; physical_col < physical_col_end; physical_col++) {
      for (let row = 0; row < this.physical_height; row++) {
        const i = (row * this.data.width + physical_col) * 4;
        const bitmap = data[i] + data[i + 1] + data[i + 2] + data[i + 3];
        if (bitmap > 255 && Math.random() > 0.980) {
          const x = this.x + (physical_col / dpr);
          const y = this.y + (row / dpr);
          thunder.push(new Thunder({ x: x, y: y }));
          Math.random() > 0.5 && particles.push(new Particles({ x: x, y: y }));
        }
      }
    }
    if (this.delay-- < 0) {
      this.index++;
      this.delay += this.basedelay;
    }
  };

  this.render = function (ctx) {
    ctx.putImageData(
      this.data,
      this.x * dpr,
      this.y * dpr,
      0,
      0,
      this.index * dpr,
      this.physical_height
    );
  };
}

// ====== Overlay yêu cầu xoay ngang ======
function createOrientationOverlay() {
  overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "black";
  overlay.style.color = "white";
  overlay.style.display = "flex";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.fontSize = "24px";
  overlay.style.zIndex = 9999;
  overlay.innerText = "Hãy xoay ngang màn hình để có trải nghiệm tốt nhất";
  document.body.appendChild(overlay);
}

// Khi xoay ngang thì ẩn overlay và bắt đầu hiệu ứng
function checkOrientation() {
  if (window.innerWidth > window.innerHeight && !started) {
    overlay.style.display = "none";
    started = true;
    startEffect();
  }
}

// ====== Hiệu ứng chữ ======
function startEffect() {
  resizeCanvas();

  // dòng 1
  texts.push(
    new Text({
      copy: "chúc mừng sinh nhật",
      size: 30,
      delay: 1,
      y: h / 2 - 20,
    })
  );

  // dòng 2
  setTimeout(() => {
    texts.push(
      new Text({
        copy: "cô loan yêu dấu",
        size: 30,
        delay: 1,
        y: h / 2 + 20,
      })
    );
  }, 4900);

  // dòng 3
  setTimeout(() => {
    texts.push(
      new Text({
        copy: " xoay dọc và nhấn vào màn hình ạ",
        size: 70,
        delay: 1,
        y: h / 2 + 60,
      })
    );
  }, 9000);

  loop();
}

// ====== Redirect sau khi xong ======
function showRedirectButton() {
  let btn = document.createElement("button");
  btn.style.position = "fixed";
  btn.style.top = "0";
  btn.style.left = "0";
  btn.style.width = "100%";
  btn.style.height = "100%";
  btn.style.opacity = "0";
  btn.style.cursor = "pointer";
  btn.style.border = "none";
  btn.style.background = "transparent";
  btn.onclick = () => {
    window.location.href =
      "https://123tien-alt.github.io/thuguii/thuguicoloan.html";
  };
  document.body.appendChild(btn);
}

// ====== Loop update / render ======
function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

function update() {
  texts.forEach((t) => t.update());
  thunder.forEach((l, i) => l.update(i, thunder));
  particles.forEach((p) => p.update());
}

function render() {
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "screen";
  texts.forEach((t) => t.render(ctx));
  thunder.forEach((l) => l.render(ctx));
  particles.forEach((p) => p.render(ctx));
}

// ====== Init ======
(function () {
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");
  thunder = [];
  particles = [];

  createOrientationOverlay();
  checkOrientation(); // check ngay lần đầu
  window.addEventListener("resize", () => {
    resizeCanvas();
    checkOrientation();
  });
})();