// SIMPLE CANVAS TEST - Run this in console
console.log('🧪 Running simple canvas test...');

const canvas = document.getElementById('eqGraphCanvas');
const ctx = canvas.getContext('2d');

console.log('Canvas:', canvas.width, 'x', canvas.height);

// Draw bright colors that are IMPOSSIBLE to miss
ctx.fillStyle = 'red';
ctx.fillRect(0, 0, 400, 200);

ctx.fillStyle = 'blue';
ctx.fillRect(400, 0, 400, 200);

ctx.fillStyle = 'yellow';
ctx.fillRect(800, 0, 400, 200);

ctx.fillStyle = 'green';
ctx.fillRect(1200, 0, 400, 200);

ctx.fillStyle = 'white';
ctx.font = 'bold 60px Arial';
ctx.fillText('CANVAS TEST - CAN YOU SEE THIS?', 50, 300);

console.log('✅ Drew test patterns. You should see 4 colored rectangles and white text.');
