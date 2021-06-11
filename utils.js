const { createCanvas } = require("canvas");
const fs = require("fs");

const str = `0001
0005
0009
000009
00000009
0001000005
0005000001
0009
000009`;

const str2 = `0001
0005
0009
000009
00000009
0001000005
0003010001
000503
00050005`;

function drawGrid(ctx, width, height, gridWeight, cellSize) {
  ctx.lineWidth = gridWeight;
  ctx.beginPath();
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  for (let x = 0; x <= width; x += cellSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    for (let y = 0; y <= height; y += cellSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
  }
  ctx.stroke();
  ctx.closePath();
}

function withGrid(canvas, gridWeight, cellSize) {
  const { width, height } = canvas;
  const gridCanvas = createCanvas(width, height);
  const ctx = gridCanvas.getContext("2d");
  ctx.fillStyle = "rgba(255,255,255,1)";
  // white background
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  // for pixel perfect
  ctx.translate(0.5, 0.5);
  drawGrid(ctx, width, height, gridWeight, cellSize);
  ctx.restore();
  ctx.drawImage(canvas, 0, 0);
  return gridCanvas;
}

function getImage(canvas, filepath) {
  const out = fs.createWriteStream(filepath);
  const stream = canvas.createPNGStream();
  stream.pipe(out);
  out.on("finish", () => console.log("The PNG file was created."));
}

function getBuffer() {
  return canvas.toBuffer();
}

function isDraw() {
  return Math.random() >= 0.5;
}

function generatePattern(isSymmetric = true) {
  return str2;
}

module.exports = {
  getImage,
  getBuffer,
  withGrid,
  generatePattern,
};