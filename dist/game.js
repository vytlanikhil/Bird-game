// ========================================================
// FLAPPY SUDHEER: LITTLE HEARTS EDITION
// ========================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const liveScoreEl = document.getElementById('liveScore');
const startScreenEl = document.getElementById('startScreen');
const gameOverScreenEl = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const muteBtn = document.getElementById('muteBtn');
const muteIcon = document.getElementById('muteIcon');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const finalScoreEl = document.getElementById('finalScore');
const bestScoreEl = document.getElementById('bestScore');
const medalBadgeEl = document.getElementById('medalBadge');
const medalEmojiEl = document.getElementById('medalEmoji');
const medalTextEl = document.getElementById('medalText');
const quoteBoxEl = document.getElementById('quoteBox');

// Audio Elements
const bgm = document.getElementById('bgm');
const gameOverAudio = document.getElementById('gameOverAudio');

let isMuted = false;
let audioUnlocked = false;

// Web Audio API for responsive flap and point chime sounds
let audioCtx = null;

function initAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Synthesize comical flap sound
function playFlapSound() {
  if (isMuted) return;
  try {
    initAudioContext();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.08);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch (e) {
    console.warn('Flap sound error:', e);
  }
}

// Synthesize score ding sound
function playScoreSound() {
  if (isMuted) return;
  try {
    initAudioContext();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.08); // A5
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  } catch (e) {
    console.warn('Score sound error:', e);
  }
}

// Background Music Control
function playBGM() {
  if (isMuted) return;
  bgm.currentTime = 0;
  const playPromise = bgm.play();
  if (playPromise !== undefined) {
    playPromise.catch(err => {
      console.log('BGM autoplay waiting for user interaction:', err);
    });
  }
}

function stopBGM() {
  try {
    bgm.pause();
    bgm.currentTime = 0;
  } catch (e) {}
}

function playGameOverSound() {
  stopBGM();
  if (isMuted) return;
  gameOverAudio.currentTime = 0;
  const playPromise = gameOverAudio.play();
  if (playPromise !== undefined) {
    playPromise.catch(err => console.log('GameOver audio error:', err));
  }
}

function stopGameOverSound() {
  try {
    gameOverAudio.pause();
    gameOverAudio.currentTime = 0;
  } catch (e) {
    console.warn('Error pausing gameover audio:', e);
  }
}

// Toggle Mute
muteBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  isMuted = !isMuted;
  bgm.muted = isMuted;
  gameOverAudio.muted = isMuted;
  muteIcon.textContent = isMuted ? '🔇' : '🔊';
  muteBtn.style.opacity = isMuted ? '0.6' : '1';
});

// Fullscreen Toggle
fullscreenBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const container = document.getElementById('gameContainer');
  if (!document.fullscreenElement) {
    container.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

// ========================================================
// ASSET LOADER
// ========================================================
const assets = {
  sudheer: new Image(),
  bg: new Image(),
  bookPipe: new Image(),
  booksGen: new Image()
};

let loadedCount = 0;
const totalAssets = 4;

function assetLoaded() {
  loadedCount++;
}

assets.sudheer.src = 'assests/sudheer.png';
assets.sudheer.onload = assetLoaded;

assets.bg.src = 'assests/campus_bg_seamless.png?v=2';
assets.bg.onload = assetLoaded;
assets.bg.onerror = () => {
  // fallback to campus_bg.png
  assets.bg.src = 'assets/campus_bg_seamless.png?v=2';
};

assets.bookPipe.src = 'assests/book_pipe_original.png';
assets.bookPipe.onload = assetLoaded;

assets.booksGen.src = 'assests/generated_books.png';
assets.booksGen.onload = assetLoaded;

// ========================================================
// GAME CONSTANTS & STATE
// ========================================================
const CANVAS_WIDTH = 450;
const CANVAS_HEIGHT = 800;
const GROUND_HEIGHT = 45;

const STATE = {
  READY: 'READY',
  PLAYING: 'PLAYING',
  GAMEOVER: 'GAMEOVER'
};

let currentState = STATE.READY;
let score = 0;
let bestScore = parseInt(localStorage.getItem('flappy_sudheer_best') || '0', 10);
bestScoreEl.textContent = bestScore;

// Screen shake effect on impact
let screenShake = 0;

// Parallax background offset
let bgX = 0;
const BG_SPEED = 0.8;

// Particle system for score sparkles / hearts
const particles = [];

function spawnHearts(x, y) {
  const emojis = ['❤️', '✨', '💖', '📚'];
  for (let i = 0; i < 6; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 30,
      vx: (Math.random() - 0.5) * 3,
      vy: -Math.random() * 3 - 1.5,
      alpha: 1,
      size: 16 + Math.random() * 8,
      text: emojis[Math.floor(Math.random() * emojis.length)]
    });
  }
}

// ========================================================
// SUDHEER (CHARACTER) PHYSICS
// ========================================================
const sudheer = {
  x: 95,
  y: 350,
  width: 58,
  height: 76,
  vy: 0,
  gravity: 0.36,
  jump: -7.5,
  rotation: 0,
  hitboxRadius: 22,
  flapTrail: 0,

  reset() {
    this.x = 95;
    this.y = 330;
    this.vy = 0;
    this.rotation = 0;
    this.flapTrail = 0;
  },

  flap() {
    this.vy = this.jump;
    this.flapTrail = 8;
    playFlapSound();
  },

  update() {
    if (currentState === STATE.READY) {
      // Bob up and down gently
      this.y = 330 + Math.sin(Date.now() / 250) * 12;
      this.rotation = Math.sin(Date.now() / 250) * 0.08;
      return;
    }

    // Apply gravity
    this.vy += this.gravity;
    // Terminal falling speed
    if (this.vy > 10.5) this.vy = 10.5;
    this.y += this.vy;

    // Rotation based on velocity
    if (this.vy < 0) {
      // Flapping up
      this.rotation = Math.max(-0.45, this.vy * 0.06);
    } else {
      // Falling down
      this.rotation = Math.min(1.2, this.rotation + 0.04);
    }

    if (this.flapTrail > 0) this.flapTrail--;

    // Floor collision
    const floorY = CANVAS_HEIGHT - GROUND_HEIGHT - this.height / 2;
    if (this.y >= floorY) {
      this.y = floorY;
      triggerGameOver();
    }

    // Ceiling boundary
    if (this.y < this.height / 2) {
      this.y = this.height / 2;
      this.vy = 0;
    }
  },

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Flap wind particles
    if (this.flapTrail > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(-this.width / 2 - 8, 12, 6, 0, Math.PI * 2);
      ctx.arc(-this.width / 2 - 16, 18, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Sudheer image
    if (assets.sudheer.complete && assets.sudheer.naturalWidth > 0) {
      ctx.drawImage(
        assets.sudheer,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );
    } else {
      // Fallback placeholder circle if image is loading
      ctx.fillStyle = '#ff7675';
      ctx.beginPath();
      ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
};

// ========================================================
// BOOK OBSTACLES (PIPES)
// ========================================================
const PIPE_WIDTH = 68;
const PIPE_GAP = 190;
const PIPE_SPACING = 270;
const PIPE_SPEED = 2.6;

let pipes = [];

// Palette for procedural books
const bookStyles = [
  { spine: '#9b2a34', cover: '#7a1f27', rib: '#ffd152' },
  { spine: '#267b84', cover: '#1a5960', rib: '#e2f5f7' },
  { spine: '#2e5b88', cover: '#1d3e5e', rib: '#ffd79d' },
  { spine: '#357c4c', cover: '#235934', rib: '#c7eecf' },
  { spine: '#bd5324', cover: '#943f18', rib: '#ffe5a3' },
  { spine: '#683661', cover: '#4f2449', rib: '#f3cbf0' },
  { spine: '#e4dcc7', cover: '#c5bca5', rib: '#5a4d38' }
];

function createPipe(x) {
  const minTop = 60;
  const maxTop = CANVAS_HEIGHT - GROUND_HEIGHT - PIPE_GAP - 80;
  const topHeight = Math.floor(minTop + Math.random() * (maxTop - minTop));

  return {
    x: x,
    width: PIPE_WIDTH,
    topHeight: topHeight,
    gap: PIPE_GAP,
    bottomY: topHeight + PIPE_GAP,
    bottomHeight: CANVAS_HEIGHT - GROUND_HEIGHT - (topHeight + PIPE_GAP),
    passed: false,
    seed: Math.floor(Math.random() * 100)
  };
}

function initPipes() {
  pipes = [];
  pipes.push(createPipe(CANVAS_WIDTH + 100));
  pipes.push(createPipe(CANVAS_WIDTH + 100 + PIPE_SPACING));
}

function updatePipes() {
  for (let i = pipes.length - 1; i >= 0; i--) {
    const pipe = pipes[i];
    pipe.x -= PIPE_SPEED;

    // Check score when Sudheer passes pipe center
    if (!pipe.passed && sudheer.x > pipe.x + pipe.width / 2) {
      pipe.passed = true;
      score++;
      liveScoreEl.textContent = score;
      liveScoreEl.classList.remove('pop');
      void liveScoreEl.offsetWidth; // trigger reflow
      liveScoreEl.classList.add('pop');
      spawnHearts(pipe.x + pipe.width / 2, pipe.topHeight + pipe.gap / 2);
      playScoreSound();
    }

    // Remove offscreen pipe and spawn next
    if (pipe.x + pipe.width < -10) {
      pipes.splice(i, 1);
      const lastPipe = pipes[pipes.length - 1];
      const newX = (lastPipe ? lastPipe.x : CANVAS_WIDTH) + PIPE_SPACING;
      pipes.push(createPipe(newX));
    }

    // Collision Detection with Sudheer
    if (checkCollision(sudheer, pipe)) {
      triggerGameOver();
      return;
    }
  }
}

// Draw a stack of books with authentic hardcover book details
function drawBookStack(x, y, width, height, isTop) {
  ctx.save();

  // If screenshot book sprite is loaded, tile it for authentic look!
  if (assets.bookPipe.complete && assets.bookPipe.naturalWidth > 0) {
    const imgW = assets.bookPipe.naturalWidth;
    const imgH = assets.bookPipe.naturalHeight;
    const scale = width / imgW;
    const scaledH = imgH * scale;

    ctx.save();
    // Clip to exact stack bounding box
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    if (isTop) {
      // Top pipe: tile from bottom up so the clean book end meets the gap!
      let currY = y + height - scaledH;
      while (currY + scaledH >= y) {
        ctx.drawImage(assets.bookPipe, x, currY, width, scaledH);
        currY -= scaledH;
      }
    } else {
      // Bottom pipe: tile from top down so clean book top meets the gap!
      let currY = y;
      while (currY <= y + height) {
        ctx.drawImage(assets.bookPipe, x, currY, width, scaledH);
        currY += scaledH;
      }
    }
    ctx.restore();

    // Prominent book end cap at the gap entrance
    ctx.fillStyle = isTop ? '#9b2a34' : '#267b84';
    const capH = 12;
    const capY = isTop ? (y + height - capH) : y;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x - 3, capY, width + 6, capH);
    ctx.fillRect(x - 3, capY, width + 6, capH);

    // Book page stripe on cap
    ctx.fillStyle = '#f8f4e6';
    ctx.fillRect(x - 1, capY + 3, width + 2, 4);

    ctx.restore();
    return;
  }

  // Fallback high-definition procedural book stack
  ctx.save();
  let currY = isTop ? (y + height) : y;
  const dir = isTop ? -1 : 1;
  let remaining = height;
  let bookIdx = 0;

  while (remaining > 0) {
    const bHeight = Math.min(32, remaining);
    const style = bookStyles[bookIdx % bookStyles.length];
    bookIdx++;

    const bookTop = isTop ? (currY - bHeight) : currY;
    
    // Spine shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x, bookTop, width, bHeight);

    // Spine
    ctx.fillStyle = style.spine;
    ctx.fillRect(x + 1, bookTop + 1, width - 2, bHeight - 2);

    // Pages edge
    ctx.fillStyle = '#faf6ea';
    ctx.fillRect(x + 3, bookTop + 2, width - 6, 4);

    // Gold rib bands
    ctx.fillStyle = style.rib;
    ctx.fillRect(x + 4, bookTop + bHeight / 2 - 1, width - 8, 2);

    // Book outline
    ctx.strokeStyle = '#1b1b1b';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, bookTop, width, bHeight);

    currY += dir * bHeight;
    remaining -= bHeight;
  }
  ctx.restore();

  ctx.restore();
}

function drawPipes() {
  for (const pipe of pipes) {
    // Top Pipe (hanging from top of screen down to topHeight)
    drawBookStack(pipe.x, 0, pipe.width, pipe.topHeight, true);

    // Bottom Pipe (from bottomY down to ground)
    drawBookStack(pipe.x, pipe.bottomY, pipe.width, pipe.bottomHeight, false);
  }
}

// Circle to Box collision detection (fair and forgiving)
function checkCollision(bird, pipe) {
  const birdRadius = bird.hitboxRadius;
  const birdCenterX = bird.x;
  const birdCenterY = bird.y;

  // Check top pipe rectangle: [pipe.x, 0, pipe.width, pipe.topHeight]
  if (circleIntersectsRect(birdCenterX, birdCenterY, birdRadius, pipe.x, 0, pipe.width, pipe.topHeight)) {
    return true;
  }

  // Check bottom pipe rectangle: [pipe.x, pipe.bottomY, pipe.width, pipe.bottomHeight]
  if (circleIntersectsRect(birdCenterX, birdCenterY, birdRadius, pipe.x, pipe.bottomY, pipe.width, pipe.bottomHeight)) {
    return true;
  }

  return false;
}

function circleIntersectsRect(cx, cy, r, rx, ry, rw, rh) {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const distX = cx - closestX;
  const distY = cy - closestY;
  return (distX * distX + distY * distY) < (r * r);
}

// ========================================================
// BACKGROUND & ENVIRONMENT
// ========================================================
function drawBackground() {
  if (assets.bg.complete && assets.bg.naturalWidth > 0) {
    const bgW = CANVAS_WIDTH;
    const bgH = CANVAS_HEIGHT - GROUND_HEIGHT;

    // Smooth horizontal parallax scroll
    if (currentState === STATE.PLAYING) {
      bgX = (bgX + BG_SPEED) % bgW;
    }

    ctx.drawImage(assets.bg, -bgX, 0, bgW, bgH);
    ctx.drawImage(assets.bg, bgW - bgX, 0, bgW, bgH);
  } else {
    // Gradient Sky fallback
    const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    skyGrad.addColorStop(0, '#5352ed');
    skyGrad.addColorStop(0.6, '#ff7675');
    skyGrad.addColorStop(1, '#ffeaa7');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  // Ground / Campus Lawn
  const groundY = CANVAS_HEIGHT - GROUND_HEIGHT;
  ctx.fillStyle = '#2d5a27'; // Dark green grass
  ctx.fillRect(0, groundY, CANVAS_WIDTH, GROUND_HEIGHT);

  // Grass highlight rim
  ctx.fillStyle = '#48973b';
  ctx.fillRect(0, groundY, CANVAS_WIDTH, 6);

  // Subtle path line at bottom
  ctx.fillStyle = '#1e3d1a';
  ctx.fillRect(0, groundY + 6, CANVAS_WIDTH, 2);
}

// ========================================================
// PARTICLES
// ========================================================
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.025;

    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.font = `${p.size}px sans-serif`;
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();

    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }
}

// ========================================================
// GAME OVER HANDLING & MEME QUOTES
// ========================================================
const teluguQuotes = [
  "Better luck next round! Inko sari try cheyyi! 🚀",
  "Backlog vachindi bro! Next attempt lo chusukundam! 📚",
  "Cinema hero laaga entry ichav, ground lo padipoyav! 😂",
  "Sudheer ki inko round ivvandi raa! 🎬",
  "Degree inka 3 years late! 👨‍🎓📉",
  "Close call! Inka konchem focus cheyyi! 🔥"
];

function triggerGameOver() {
  if (currentState === STATE.GAMEOVER) return;
  currentState = STATE.GAMEOVER;
  screenShake = 18;

  playGameOverSound();

  // Update scores
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('flappy_sudheer_best', bestScore);
  }

  finalScoreEl.textContent = score;
  bestScoreEl.textContent = bestScore;

  // Assign medal / funny status
  if (score >= 25) {
    medalEmojiEl.textContent = '👑';
    medalTextEl.textContent = 'Topper Sudheer - Pro Player!';
  } else if (score >= 15) {
    medalEmojiEl.textContent = '🥇';
    medalTextEl.textContent = 'Gold Medal - All Backlogs Cleared!';
  } else if (score >= 8) {
    medalEmojiEl.textContent = '🥈';
    medalTextEl.textContent = 'Silver Medal - Just Pass Marks!';
  } else if (score >= 3) {
    medalEmojiEl.textContent = '🥉';
    medalTextEl.textContent = 'Bronze Medal - Attempted All Questions!';
  } else {
    medalEmojiEl.textContent = '💔';
    medalTextEl.textContent = 'Zero Marks - Attendance Shortage!';
  }

  // Random hilarious Telugu quote
  const randomQuote = teluguQuotes[Math.floor(Math.random() * teluguQuotes.length)];
  quoteBoxEl.textContent = `"${randomQuote}"`;

  // Show Game Over Modal
  gameOverScreenEl.classList.add('active');
}

// ========================================================
// START / RESTART GAME
// ========================================================
function startGame() {
  stopGameOverSound();
  initAudioContext();
  audioUnlocked = true;
  currentState = STATE.PLAYING;
  score = 0;
  liveScoreEl.textContent = '0';
  liveScoreEl.style.display = 'block';

  startScreenEl.classList.remove('active');
  gameOverScreenEl.classList.remove('active');

  sudheer.reset();
  initPipes();
  particles.length = 0;

  playBGM();
}

function handleAction() {
  if (currentState === STATE.READY) {
    startGame();
    sudheer.flap();
  } else if (currentState === STATE.PLAYING) {
    sudheer.flap();
  } else if (currentState === STATE.GAMEOVER) {
    // Only restart after a brief moment so accidental double taps don't instantly restart
    if (screenShake === 0) {
      startGame();
    }
  }
}

// Input Listeners: Keyboard
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    handleAction();
  }
  if (e.key === 'm' || e.key === 'M') {
    muteBtn.click();
  }
});

// Input Listeners: Mouse & Touch
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  handleAction();
});

startBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  startGame();
});

restartBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  stopGameOverSound();
  startGame();
});

// ========================================================
// MAIN GAME LOOP
// ========================================================
let lastTime = performance.now();

function gameLoop(now) {
  requestAnimationFrame(gameLoop);

  // Apply screen shake
  ctx.save();
  if (screenShake > 0) {
    const shakeX = (Math.random() - 0.5) * screenShake;
    const shakeY = (Math.random() - 0.5) * screenShake;
    ctx.translate(shakeX, shakeY);
    screenShake--;
  }

  // Clear Canvas
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 1. Draw Background
  drawBackground();

  // 2. Update & Draw Pipes
  if (currentState === STATE.PLAYING) {
    updatePipes();
  }
  drawPipes();

  // 3. Update & Draw Sudheer
  sudheer.update();
  sudheer.draw();

  // 4. Update & Draw Particles
  updateParticles();

  ctx.restore();
}

// Initialize
initPipes();
requestAnimationFrame(gameLoop);
