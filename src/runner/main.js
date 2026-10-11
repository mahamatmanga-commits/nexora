import '@fontsource-variable/inter'
import '@fontsource-variable/space-grotesk'
import './runner.css'

/* =========================================================================
   NOVA Run — coureur sans fin (canvas 2D, sans dépendance)
   ========================================================================= */

const CFG = {
  // Monde logique : au moins 760 × 420 unités visibles, mis à l'échelle de l'écran
  minViewW: 760,
  viewH: 420,
  groundFromBottom: 84,
  playerX: 160,

  // Physique du joueur
  gravity: 2700,
  jumpV: 900,
  cutGravity: 1.9, // gravité accrue en montée quand le saut est relâché (saut variable)
  fastFall: 5200,
  jumpBuffer: 0.13,
  stand: { w: 34, h: 48 },
  slide: { w: 50, h: 24 },

  // Rampes de vitesse
  baseSpeed: 400,
  maxSpeed: 980,
  speedStep: 48,
  levelTime: 14,

  // Densité des obstacles : temps de difficulté maximale (s)
  rampTime: 150,
  barGap: 31,

  // Score & combo
  distPts: 0.025,
  clearPts: 20,
  nearPts: 30,
  nearMiss: 12,
  comboWindow: 3.2,
  comboPerMult: 5,
  maxMult: 8,
}

const BEST_KEY = 'nova-run:best'
const MUTE_KEY = 'nova-run:muted'

const storage = {
  get(key) {
    try { return window.localStorage.getItem(key) } catch { return null }
  },
  set(key, value) {
    try { window.localStorage.setItem(key, value) } catch { /* stockage indisponible */ }
  },
}

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/* ---------- Helpers ---------- */
const rand = (a, b) => a + Math.random() * (b - a)
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const lerp = (a, b, t) => a + (b - a) * t
const mod = (a, n) => ((a % n) + n) % n
const fmt = (n) => Math.floor(n).toLocaleString('fr-FR')
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

function weighted(options) {
  const total = options.reduce((s, o) => s + o[1], 0)
  let r = Math.random() * total
  for (const [value, w] of options) {
    r -= w
    if (r <= 0) return value
  }
  return options[0][0]
}

const COLORS = {
  cyan: [34, 211, 238],
  violet: [167, 139, 250],
  rose: [251, 113, 133],
  amber: [251, 191, 36],
  blue: [59, 130, 246],
  sky: [147, 197, 253],
}

/* ---------- DOM ---------- */
const $ = (id) => document.getElementById(id)
const canvas = $('game')
const ctx = canvas.getContext('2d')
const ui = {
  hud: $('hud'),
  score: $('score'),
  best: $('best'),
  bestWrap: $('best').parentElement,
  combo: $('combo'),
  mult: $('mult'),
  comboCount: $('comboCount'),
  comboBar: $('comboBar'),
  speed: $('speed'),
  banner: $('banner'),
  menu: $('menu'),
  menuBest: $('menuBest'),
  startBtn: $('startBtn'),
  pause: $('pause'),
  over: $('over'),
  finalScore: $('finalScore'),
  finalBest: $('finalBest'),
  finalDist: $('finalDist'),
  finalCombo: $('finalCombo'),
  finalSpeed: $('finalSpeed'),
  newBest: $('newBest'),
  restartBtn: $('restartBtn'),
  slideBtn: $('slideBtn'),
  muteBtn: $('muteBtn'),
  pauseBtn: $('pauseBtn'),
}

/* ---------- Vue / redimensionnement ---------- */
const view = { w: CFG.minViewW, h: CFG.viewH, scale: 1, dpr: 1, groundY: 336 }

function resize() {
  const cw = window.innerWidth
  const ch = window.innerHeight
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(cw * dpr)
  canvas.height = Math.round(ch * dpr)
  view.dpr = dpr
  view.scale = Math.min(cw / CFG.minViewW, ch / CFG.viewH)
  view.w = cw / view.scale
  view.h = ch / view.scale
  // La bande de jeu de 420 unités est centrée verticalement
  view.groundY = view.h / 2 + CFG.viewH / 2 - CFG.groundFromBottom
}
window.addEventListener('resize', resize)
resize()

/* ---------- Audio (WebAudio, synthétisé) ---------- */
const audio = { ctx: null, master: null, noise: null, muted: storage.get(MUTE_KEY) === '1' }

function ensureAudio() {
  if (audio.ctx) {
    if (audio.ctx.state === 'suspended') audio.ctx.resume()
    return
  }
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  try {
    audio.ctx = new AC()
    audio.master = audio.ctx.createGain()
    audio.master.gain.value = audio.muted ? 0 : 0.32
    audio.master.connect(audio.ctx.destination)
    const len = audio.ctx.sampleRate * 0.6
    audio.noise = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate)
    const data = audio.noise.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  } catch {
    audio.ctx = null
  }
}

function tone({ type = 'sine', f0, f1 = f0, dur = 0.12, vol = 0.3, delay = 0 }) {
  const ac = audio.ctx
  const t = ac.currentTime + delay
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(f0, t)
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain).connect(audio.master)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

function noise({ dur = 0.2, vol = 0.3, freq = 1200, q = 0.8 }) {
  const ac = audio.ctx
  const t = ac.currentTime
  const src = ac.createBufferSource()
  src.buffer = audio.noise
  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(freq, t)
  filter.frequency.exponentialRampToValueAtTime(80, t + dur)
  filter.Q.value = q
  const gain = ac.createGain()
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(filter).connect(gain).connect(audio.master)
  src.start(t)
  src.stop(t + dur + 0.02)
}

function sfx(name, n = 0) {
  if (!audio.ctx || audio.muted) return
  switch (name) {
    case 'jump': tone({ type: 'square', f0: 420, f1: 820, dur: 0.12, vol: 0.08 }); break
    case 'land': noise({ dur: 0.08, vol: 0.12 * Math.max(0.3, n), freq: 500 }); break
    case 'slide': noise({ dur: 0.18, vol: 0.08, freq: 2400, q: 2 }); break
    case 'clear': tone({ type: 'sine', f0: 660 * Math.pow(2, Math.min(n, 24) / 24), f1: 990 * Math.pow(2, Math.min(n, 24) / 24), dur: 0.09, vol: 0.1 }); break
    case 'near': tone({ type: 'triangle', f0: 1200, f1: 1800, dur: 0.12, vol: 0.12 }); break
    case 'mult':
      tone({ type: 'square', f0: 523, dur: 0.08, vol: 0.07 })
      tone({ type: 'square', f0: 784, dur: 0.12, vol: 0.07, delay: 0.07 })
      break
    case 'break': tone({ type: 'sawtooth', f0: 300, f1: 140, dur: 0.22, vol: 0.06 }); break
    case 'speed':
      tone({ type: 'sawtooth', f0: 220, f1: 880, dur: 0.45, vol: 0.06 })
      tone({ type: 'sine', f0: 440, f1: 1320, dur: 0.45, vol: 0.06 })
      break
    case 'crash':
      noise({ dur: 0.5, vol: 0.45, freq: 3000 })
      tone({ type: 'sine', f0: 160, f1: 40, dur: 0.5, vol: 0.4 })
      break
    case 'start': tone({ type: 'triangle', f0: 392, f1: 784, dur: 0.18, vol: 0.12 }); break
    default:
  }
}

function setMuted(muted) {
  audio.muted = muted
  storage.set(MUTE_KEY, muted ? '1' : '0')
  if (audio.master) audio.master.gain.value = muted ? 0 : 0.32
  ui.muteBtn.classList.toggle('muted', muted)
  ui.muteBtn.setAttribute('aria-label', muted ? 'Activer le son' : 'Couper le son')
}

/* ---------- Décor (généré une fois) ---------- */
const STAR_PERIOD = 1800
const stars = Array.from({ length: 140 }, () => ({
  x: Math.random() * STAR_PERIOD,
  y: rand(30, 900),
  r: Math.random() < 0.15 ? rand(1.2, 1.8) : rand(0.5, 1.1),
  a: rand(0.35, 0.9),
  tw: rand(1, 3),
  p: Math.random() * Math.PI * 2,
}))

function makeSkyline(period, minH, maxH, minW, maxW, windows) {
  const buildings = []
  let x = 0
  while (x < period) {
    const w = rand(minW, maxW)
    const h = rand(minH, maxH)
    const lights = []
    if (windows) {
      for (let wy = 10; wy < h - 8; wy += 12) {
        for (let wx = 6; wx < w - 6; wx += 10) {
          if (Math.random() < 0.18) lights.push([wx, wy])
        }
      }
    }
    buildings.push({ x, w, h, lights, antenna: Math.random() < 0.25 ? rand(8, 22) : 0 })
    x += w + rand(2, 16)
  }
  return { period: x, buildings }
}

const skylines = [
  { f: 0.08, color: '#0a1534', ...makeSkyline(1600, 60, 170, 40, 110, false) },
  { f: 0.22, color: '#0c1a40', edge: 'rgba(96,165,250,0.18)', ...makeSkyline(1400, 30, 110, 30, 80, true) },
]

const speedLines = Array.from({ length: 26 }, () => ({
  x: Math.random() * 2000,
  y: Math.random(),
  len: rand(40, 160),
  k: rand(0.9, 1.8),
}))

/* ---------- État ---------- */
const input = { jumpHeld: false, slideKey: false, slideBtn: false, slideMouse: false }
const isSlideHeld = () => input.slideKey || input.slideBtn || input.slideMouse

const player = {}
const game = {
  state: 'menu',
  best: Number.parseInt(storage.get(BEST_KEY) ?? '0', 10) || 0,
  clock: 0,
  bgX: 0,
  speed: CFG.baseSpeed * 0.6,
  obstacles: [],
  particles: [],
  floaters: [],
  shake: 0,
  flash: 0,
  flashColor: COLORS.rose,
  timeScale: 1,
  hitStop: 0,
}

function resetPlayer() {
  Object.assign(player, {
    y: 0,
    vy: 0,
    dx: 0,
    vx: 0,
    rot: 0,
    vrot: 0,
    grounded: true,
    sliding: false,
    buffer: 0,
    sx: 1,
    sy: 1,
    vsx: 0,
    vsy: 0,
    rw: CFG.stand.w,
    rh: CFG.stand.h,
    phase: 0,
    dead: false,
    history: [],
  })
}

function resetRun() {
  Object.assign(game, {
    time: 0,
    level: 0,
    speed: CFG.baseSpeed,
    target: CFG.baseSpeed,
    topSpeed: CFG.baseSpeed,
    distance: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    comboTimer: 0,
    mult: 1,
    obstacles: [],
    floaters: [],
    spawnX: view.w + CFG.baseSpeed * 1.4,
    lastPattern: null,
    timeScale: 1,
    hitStop: 0,
    deathT: 0,
    newBest: false,
  })
  resetPlayer()
}

resetPlayer()

/* ---------- Particules & textes flottants ---------- */
function emit(p) {
  if (game.particles.length > 450) game.particles.shift()
  game.particles.push(p)
}

function dust(x, y, count, power = 1) {
  for (let i = 0; i < count; i++) {
    const life = rand(0.3, 0.6)
    emit({
      x: x + rand(-10, 10),
      y,
      vx: rand(-90, 50) * power,
      vy: rand(-170, -30) * power,
      g: 520,
      life,
      max: life,
      size: rand(1.6, 3.6),
      color: COLORS.sky,
      world: true,
      kind: 'dot',
    })
  }
}

function sparks(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const life = rand(0.18, 0.38)
    emit({ x, y, vx: rand(-320, -80), vy: rand(-220, -40), g: 900, life, max: life, size: rand(1, 1.8), color, world: true, kind: 'spark' })
  }
}

function burst(x, y, colors) {
  for (let i = 0; i < 46; i++) {
    const a = rand(0, Math.PI * 2)
    const s = rand(120, 560)
    const life = rand(0.5, 1.15)
    emit({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 160,
      g: 900,
      life,
      max: life,
      size: rand(2, 5),
      color: colors[i % colors.length],
      world: false,
      kind: i % 3 === 0 ? 'spark' : 'shard',
      rot: rand(0, Math.PI),
      vr: rand(-12, 12),
    })
  }
}

function floater(text, x, y, color = COLORS.sky, size = 16) {
  game.floaters.push({ text, x, y, color, size, age: 0, life: 0.9 })
}

/* ---------- Génération procédurale ---------- */
const difficulty = () => clamp(game.time / CFG.rampTime, 0, 1)

// Temps passé au-dessus de la hauteur h pendant un saut complet
const peak = (CFG.jumpV * CFG.jumpV) / (2 * CFG.gravity)
const timeAbove = (h) => 2 * Math.sqrt(Math.max(0, (2 * (peak - h)) / CFG.gravity))
// Largeur maximale franchissable d'un seul saut à la vitesse s (avec marge)
const maxJumpWidth = (h, s) => s * timeAbove(h) * 0.78 - CFG.stand.w

function block(x, w, h, variant = 'low') {
  return { type: 'block', variant, x, w, top: -h, bottom: 0, passed: false, minClear: Infinity, hit: 0 }
}
function bar(x, w) {
  return { type: 'bar', x, w, top: -4000, bottom: -CFG.barGap, passed: false, minClear: Infinity, hit: 0 }
}
function drone(x) {
  return { type: 'drone', x, w: 34, top: -62, bottom: -38, passed: false, minClear: Infinity, hit: 0, phase: Math.random() * 6 }
}

function makePattern(x) {
  const d = difficulty()
  const s = game.speed
  const options = [
    ['low', 1],
    ['tall', d > 0.05 ? 0.45 + 0.3 * d : 0],
    ['bar', d > 0.08 ? 0.55 + 0.35 * d : 0],
    ['wide', d > 0.16 ? 0.3 + 0.3 * d : 0],
    ['pair', d > 0.22 ? 0.3 + 0.5 * d : 0],
    ['drone', d > 0.28 ? 0.4 + 0.4 * d : 0],
    ['barLow', d > 0.42 ? 0.3 + 0.6 * d : 0],
    ['lowDrone', d > 0.55 ? 0.25 + 0.5 * d : 0],
    ['triple', d > 0.65 ? 0.2 + 0.6 * d : 0],
  ].filter(([k]) => k !== game.lastPattern || k === 'low')
  const kind = weighted(options)
  game.lastPattern = kind
  const out = []

  switch (kind) {
    case 'low':
      out.push(block(x, rand(24, 38), rand(30, 46)))
      break
    case 'tall':
      out.push(block(x, rand(26, 34), rand(62, 76), 'tall'))
      break
    case 'wide': {
      const h = rand(28, 38)
      out.push(block(x, clamp(rand(70, 70 + 90 * d), 50, maxJumpWidth(h, s) * 0.9), h))
      break
    }
    case 'pair': {
      const h = rand(28, 38)
      const w1 = rand(22, 28)
      const w2 = rand(22, 28)
      if (Math.random() < 0.5) {
        // Deux blocs serrés : un seul saut
        const gap = clamp(rand(28, 60), 14, maxJumpWidth(h, s) - w1 - w2)
        out.push(block(x, w1, h), block(x + w1 + gap, w2, h))
      } else {
        // Rythme : sauter, atterrir, ressauter
        const gap = s * rand(0.62, 0.78)
        out.push(block(x, w1, h), block(x + w1 + gap, w2, rand(30, 44)))
      }
      break
    }
    case 'bar':
      out.push(bar(x, rand(50, 90 + 110 * d)))
      break
    case 'drone':
      out.push(drone(x))
      break
    case 'barLow': {
      const w = rand(60, 110)
      out.push(bar(x, w), block(x + w + s * rand(0.48, 0.6), rand(24, 32), rand(30, 42)))
      break
    }
    case 'lowDrone': {
      const w = rand(24, 32)
      out.push(block(x, w, rand(30, 42)), drone(x + w + s * rand(0.62, 0.75)))
      break
    }
    case 'triple': {
      let cx = x
      for (let i = 0; i < 3; i++) {
        const w = rand(22, 30)
        out.push(block(cx, w, rand(28, 40)))
        cx += w + s * rand(0.6, 0.72)
      }
      break
    }
    default:
  }

  game.obstacles.push(...out)
  const last = out[out.length - 1]
  return last.x + last.w
}

function spawnObstacles() {
  while (game.spawnX < view.w + 260) {
    const d = difficulty()
    const end = makePattern(game.spawnX)
    // Les obstacles se resserrent au fil du temps
    const gapTime = lerp(1.3, 0.62, d) + Math.random() * lerp(1.0, 0.35, d)
    game.spawnX = end + gapTime * game.speed
  }
}

/* ---------- Joueur ---------- */
function doJump() {
  const p = player
  p.vy = -CFG.jumpV
  p.grounded = false
  p.sliding = false
  p.buffer = 0
  p.sy = 1.3
  p.sx = 0.76
  p.vsx = p.vsy = 0
  dust(CFG.playerX, view.groundY, 6, 0.7)
  sfx('jump')
}

function land() {
  const p = player
  const amt = clamp(p.vy / 1300, 0.25, 1)
  p.y = 0
  p.vy = 0
  p.grounded = true
  p.sy = 1 - 0.34 * amt
  p.sx = 1 + 0.36 * amt
  p.vsx = p.vsy = 0
  dust(CFG.playerX, view.groundY, Math.round(5 + 10 * amt), 0.6 + amt * 0.6)
  sfx('land', amt)
}

function springScale(dt) {
  const p = player
  const k = 420
  const c = 15
  const tx = p.grounded ? 1 : 1 - Math.min(0.1, Math.abs(p.vy) / 9000)
  const ty = p.grounded ? 1 : 1 + Math.min(0.12, Math.abs(p.vy) / 7000)
  p.vsx += (-k * (p.sx - tx) - c * p.vsx) * dt
  p.vsy += (-k * (p.sy - ty) - c * p.vsy) * dt
  p.sx += p.vsx * dt
  p.sy += p.vsy * dt
}

function updatePlayer(dt) {
  const p = player
  const slideHeld = isSlideHeld()

  p.buffer = Math.max(0, p.buffer - dt)
  if (p.buffer > 0 && p.grounded) doJump()

  if (!p.grounded) {
    let g = CFG.gravity
    if (p.vy < 0 && !input.jumpHeld) g *= CFG.cutGravity
    if (slideHeld) g += CFG.fastFall
    p.vy += g * dt
    p.y += p.vy * dt
    if (p.y >= 0) land()
  }

  const wasSliding = p.sliding
  p.sliding = p.grounded && slideHeld
  if (p.sliding && !wasSliding) {
    sfx('slide')
    sparks(CFG.playerX + 10, view.groundY, 8, COLORS.sky)
  }
  if (p.sliding && Math.random() < dt * 30) sparks(CFG.playerX + 18, view.groundY - 1, 1, COLORS.cyan)

  const target = p.sliding ? CFG.slide : CFG.stand
  const k = Math.min(1, dt * 26)
  p.rw += (target.w - p.rw) * k
  p.rh += (target.h - p.rh) * k

  if (p.grounded && !p.sliding) p.phase += (dt * game.speed) / 24
  springScale(dt)
}

function updateDeadPlayer(dt) {
  const p = player
  p.vy += CFG.gravity * dt
  p.y += p.vy * dt
  p.dx += p.vx * dt
  p.rot += p.vrot * dt
  if (p.y >= 0) {
    p.y = 0
    if (p.vy > 220) {
      dust(CFG.playerX + p.dx, view.groundY, 8, 0.8)
      p.vy *= -0.35
      p.vx *= 0.55
      p.vrot *= 0.5
    } else {
      p.vy = 0
      p.vx *= Math.exp(-dt * 8)
      p.vrot *= Math.exp(-dt * 8)
    }
  }
  springScale(dt)
}

function playerBox() {
  const p = player
  const s = p.sliding ? CFG.slide : CFG.stand
  const ix = 5
  const iy = 3
  return {
    l: CFG.playerX - s.w / 2 + ix,
    r: CFG.playerX + s.w / 2 - ix,
    t: p.y - s.h + iy,
    b: p.y,
  }
}

/* ---------- Score & combo ---------- */
function bumpCombo() {
  ui.combo.classList.remove('bump')
  void ui.combo.offsetWidth
  ui.combo.classList.add('bump')
}

function clearObstacle(ob) {
  game.combo += 1
  game.maxCombo = Math.max(game.maxCombo, game.combo)
  game.comboTimer = CFG.comboWindow

  const mult = Math.min(CFG.maxMult, 1 + Math.floor(game.combo / CFG.comboPerMult))
  const fy = view.groundY + player.y - player.rh - 22
  if (mult > game.mult) {
    game.mult = mult
    floater(`x${mult}`, CFG.playerX + 40, fy - 26, COLORS.amber, 30)
    sfx('mult')
  }

  const near = ob.type !== 'bar' && ob.minClear < CFG.nearMiss
  let pts = CFG.clearPts * game.mult
  if (near) pts += CFG.nearPts * game.mult
  game.score += pts
  floater(near ? `Juste ! +${pts}` : `+${pts}`, CFG.playerX, fy, near ? COLORS.cyan : COLORS.sky, near ? 18 : 15)
  sfx(near ? 'near' : 'clear', game.combo)
  bumpCombo()
}

function breakCombo() {
  if (game.combo >= 3) {
    floater('Combo perdu', CFG.playerX, view.groundY - 90, [148, 163, 184], 14)
    sfx('break')
  }
  game.combo = 0
  game.mult = 1
  game.comboTimer = 0
}

function checkObstacles() {
  const pb = playerBox()
  for (const ob of game.obstacles) {
    const ol = ob.x + 2
    const or = ob.x + ob.w - 2
    const ot = ob.top + 2
    const obb = ob.type === 'block' ? ob.bottom : ob.bottom - 2
    if (or > pb.l && ol < pb.r) {
      if (pb.b > ot && pb.t < obb) {
        die(ob)
        return
      }
      ob.minClear = Math.min(ob.minClear, Math.max(ot - pb.b, pb.t - obb))
    }
    if (!ob.passed && ob.x + ob.w < pb.l) {
      ob.passed = true
      clearObstacle(ob)
    }
  }
}

/* ---------- Monde ---------- */
function scrollWorld(dt) {
  const dx = game.speed * dt
  game.bgX += dx
  game.spawnX -= dx
  for (const ob of game.obstacles) ob.x -= dx
  if (game.obstacles.length && game.obstacles[0].x + game.obstacles[0].w < -140) {
    game.obstacles = game.obstacles.filter((ob) => ob.x + ob.w > -140)
  }
  for (const pt of game.particles) if (pt.world) pt.x -= dx
  for (const l of speedLines) l.x -= dx * l.k
}

function onSpeedUp() {
  const ratio = (game.target / CFG.baseSpeed).toFixed(1)
  ui.banner.textContent = `Vitesse ${ratio}x`
  ui.banner.classList.remove('show')
  void ui.banner.offsetWidth
  ui.banner.classList.add('show')
  game.flash = 0.35
  game.flashColor = COLORS.cyan
  sfx('speed')
}

function stepPlaying(dt) {
  game.time += dt
  const level = Math.floor(game.time / CFG.levelTime)
  if (level > game.level) {
    game.level = level
    const target = Math.min(CFG.maxSpeed, CFG.baseSpeed + level * CFG.speedStep)
    if (target > game.target) {
      game.target = target
      onSpeedUp()
    }
  }
  game.speed += (game.target - game.speed) * Math.min(1, dt * 1.6)
  game.topSpeed = Math.max(game.topSpeed, game.speed)
  game.distance += game.speed * dt
  game.score += game.speed * dt * CFG.distPts * game.mult

  if (game.combo > 0) {
    game.comboTimer -= dt
    if (game.comboTimer <= 0) breakCombo()
  }

  updatePlayer(dt)
  scrollWorld(dt)
  spawnObstacles()
  checkObstacles()
}

function stepDying(dt) {
  game.speed *= Math.exp(-dt * 2.6)
  scrollWorld(dt)
  updateDeadPlayer(dt)
}

function stepAmbient(dt, speed) {
  game.speed += (speed - game.speed) * Math.min(1, dt * 2)
  scrollWorld(dt)
  if (game.state === 'menu') {
    if (player.grounded) player.phase += (dt * game.speed) / 24
    springScale(dt)
  } else {
    updateDeadPlayer(dt)
  }
}

function updateParticles(dt) {
  for (const pt of game.particles) {
    pt.life -= dt
    pt.vy += pt.g * dt
    pt.x += pt.vx * dt
    pt.y += pt.vy * dt
    if (pt.rot !== undefined) pt.rot += pt.vr * dt
    if (pt.y > view.groundY && pt.vy > 0) {
      pt.y = view.groundY
      pt.vy *= -0.3
      pt.vx *= 0.6
    }
  }
  game.particles = game.particles.filter((pt) => pt.life > 0)
  for (const f of game.floaters) f.age += dt
  game.floaters = game.floaters.filter((f) => f.age < f.life)
}

/* ---------- Mort ---------- */
function die(ob) {
  const p = player
  game.state = 'dying'
  game.hitStop = reducedMotion ? 0 : 0.09
  game.timeScale = reducedMotion ? 1 : 0.2
  game.deathT = 0
  game.shake = 18
  game.flash = 1
  game.flashColor = COLORS.rose
  ob.hit = 1

  p.dead = true
  p.grounded = false
  p.sliding = false
  p.vy = -640
  p.vx = -130
  p.vrot = -9
  p.sx = 1.35
  p.sy = 0.7
  p.vsx = p.vsy = 0

  const color = ob.type === 'bar' ? COLORS.rose : ob.type === 'drone' ? COLORS.amber : ob.variant === 'tall' ? COLORS.violet : COLORS.cyan
  burst(CFG.playerX + 14, view.groundY + p.y - p.rh / 2, [COLORS.blue, COLORS.sky, color, [255, 255, 255]])
  sfx('crash')
  try { navigator.vibrate?.(70) } catch { /* non supporté */ }

  if (Math.floor(game.score) > game.best) {
    game.best = Math.floor(game.score)
    game.newBest = true
    storage.set(BEST_KEY, String(game.best))
  }
}

function showGameOver() {
  game.state = 'over'
  game.lockUntil = performance.now() + 550
  ui.finalScore.textContent = fmt(game.score)
  ui.finalBest.textContent = fmt(game.best)
  ui.finalDist.textContent = `${fmt(game.distance / 40)} m`
  ui.finalCombo.textContent = fmt(game.maxCombo)
  ui.finalSpeed.textContent = `${(game.topSpeed / CFG.baseSpeed).toFixed(1)}x`
  ui.newBest.hidden = !game.newBest
  ui.hud.classList.remove('show')
  ui.slideBtn.classList.remove('show')
  ui.over.classList.add('show')
  ui.restartBtn.focus({ preventScroll: true })
}

/* ---------- Transitions d'état ---------- */
function startGame() {
  ensureAudio()
  resetRun()
  game.state = 'playing'
  game.particles = []
  ui.menu.classList.remove('show')
  ui.over.classList.remove('show')
  ui.pause.classList.remove('show')
  ui.hud.classList.add('show')
  ui.slideBtn.classList.add('show')
  ui.banner.classList.remove('show')
  canvas.focus?.({ preventScroll: true })
  sfx('start')
}

function setPaused(paused) {
  if (paused && game.state === 'playing') {
    game.state = 'paused'
    ui.pause.classList.add('show')
  } else if (!paused && game.state === 'paused') {
    game.state = 'playing'
    ui.pause.classList.remove('show')
    input.jumpHeld = false
    last = performance.now()
  }
}

function pressJump() {
  ensureAudio()
  input.jumpHeld = true
  switch (game.state) {
    case 'menu': startGame(); break
    case 'playing': player.buffer = CFG.jumpBuffer; break
    case 'paused': setPaused(false); break
    case 'over': if (performance.now() >= game.lockUntil) startGame(); break
    default:
  }
}

/* ---------- Entrées ---------- */
const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW'])
const SLIDE_KEYS = new Set(['ArrowDown', 'KeyS'])

window.addEventListener('keydown', (e) => {
  if (JUMP_KEYS.has(e.code)) {
    e.preventDefault()
    if (!e.repeat) pressJump()
  } else if (SLIDE_KEYS.has(e.code)) {
    e.preventDefault()
    input.slideKey = true
    ensureAudio()
  } else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
    e.preventDefault()
    if (game.state === 'menu' || game.state === 'paused' || game.state === 'over') pressJump()
  } else if (e.code === 'KeyP' || e.code === 'Escape') {
    setPaused(game.state === 'playing')
  } else if (e.code === 'KeyM') {
    setMuted(!audio.muted)
  }
})

window.addEventListener('keyup', (e) => {
  if (JUMP_KEYS.has(e.code) || e.code === 'Enter' || e.code === 'NumpadEnter') input.jumpHeld = false
  else if (SLIDE_KEYS.has(e.code)) input.slideKey = false
})

canvas.addEventListener('pointerdown', (e) => {
  if (e.button === 2) {
    input.slideMouse = true
    ensureAudio()
    return
  }
  if (e.button !== 0) return
  e.preventDefault()
  pressJump()
})
canvas.addEventListener('contextmenu', (e) => e.preventDefault())

window.addEventListener('pointerup', (e) => {
  if (e.button === 2) input.slideMouse = false
  else input.jumpHeld = false
})
window.addEventListener('pointercancel', () => {
  input.jumpHeld = false
  input.slideMouse = false
})

const setSlideBtn = (on) => {
  input.slideBtn = on
  ui.slideBtn.classList.toggle('pressed', on)
}
ui.slideBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault()
  e.stopPropagation()
  ensureAudio()
  ui.slideBtn.setPointerCapture?.(e.pointerId)
  setSlideBtn(true)
})
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  ui.slideBtn.addEventListener(type, () => setSlideBtn(false))
}
ui.slideBtn.addEventListener('contextmenu', (e) => e.preventDefault())

ui.menu.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return
  e.preventDefault()
  pressJump()
})
ui.startBtn.addEventListener('click', () => {
  if (game.state === 'menu') startGame()
})
ui.pause.addEventListener('pointerdown', () => setPaused(false))
ui.restartBtn.addEventListener('click', () => {
  if (game.state === 'over') startGame()
})
ui.pauseBtn.addEventListener('click', () => {
  setPaused(game.state === 'playing')
  ui.pauseBtn.blur()
})
ui.muteBtn.addEventListener('click', () => {
  ensureAudio()
  setMuted(!audio.muted)
  ui.muteBtn.blur()
})

function releaseAll() {
  input.jumpHeld = input.slideKey = input.slideMouse = false
  setSlideBtn(false)
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    setPaused(true)
    releaseAll()
  }
})
window.addEventListener('blur', () => {
  setPaused(true)
  releaseAll()
})

/* ---------- Rendu ---------- */
function roundRect(x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function drawBackground() {
  const { w, h, groundY } = view
  const sky = ctx.createLinearGradient(0, groundY - 480, 0, groundY)
  sky.addColorStop(0, '#02040b')
  sky.addColorStop(0.6, '#06102c')
  sky.addColorStop(1, '#0d1f52')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, groundY + 1)

  const halo = ctx.createRadialGradient(w * 0.72, groundY - 170, 10, w * 0.72, groundY - 170, 300)
  halo.addColorStop(0, 'rgba(59,130,246,0.25)')
  halo.addColorStop(1, 'rgba(59,130,246,0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, w, groundY)

  // Étoiles
  for (const s of stars) {
    const y = groundY - s.y
    if (y < -4) continue
    const a = s.a * (0.6 + 0.4 * Math.sin(game.clock * s.tw + s.p))
    ctx.fillStyle = `rgba(219,234,254,${a})`
    for (let x = mod(s.x - game.bgX * 0.02, STAR_PERIOD); x < w; x += STAR_PERIOD) {
      ctx.fillRect(x, y, s.r, s.r)
    }
  }

  // Skyline en parallaxe
  for (const layer of skylines) {
    const offset = game.bgX * layer.f
    for (const b of layer.buildings) {
      for (let x = mod(b.x - offset, layer.period) - layer.period; x < w; x += layer.period) {
        if (x + b.w < 0) continue
        const top = groundY - b.h
        ctx.fillStyle = layer.color
        ctx.fillRect(x, top, b.w, b.h)
        if (b.antenna) ctx.fillRect(x + b.w / 2 - 1, top - b.antenna, 2, b.antenna)
        if (layer.edge) {
          ctx.fillStyle = layer.edge
          ctx.fillRect(x, top, b.w, 1.5)
          ctx.fillStyle = 'rgba(147,197,253,0.45)'
          for (const [lx, ly] of b.lights) ctx.fillRect(x + lx, top + ly, 3, 4)
        }
      }
    }
  }

  const horizon = ctx.createLinearGradient(0, groundY - 60, 0, groundY)
  horizon.addColorStop(0, 'rgba(59,130,246,0)')
  horizon.addColorStop(1, 'rgba(59,130,246,0.22)')
  ctx.fillStyle = horizon
  ctx.fillRect(0, groundY - 60, w, 60)

  // Sol
  const ground = ctx.createLinearGradient(0, groundY, 0, h)
  ground.addColorStop(0, '#0a1638')
  ground.addColorStop(0.35, '#050a1c')
  ground.addColorStop(1, '#03050d')
  ctx.fillStyle = ground
  ctx.fillRect(0, groundY, w, h - groundY)

  // Grille en perspective
  const depth = Math.min(h - groundY, 260)
  const vp = w * 0.5
  ctx.strokeStyle = 'rgba(96,165,250,0.14)'
  ctx.lineWidth = 1
  ctx.beginPath()
  const spacing = 64
  for (let x = -mod(game.bgX, spacing) - w; x < w * 2; x += spacing) {
    ctx.moveTo(x, groundY)
    ctx.lineTo(vp + (x - vp) * 3, groundY + depth)
  }
  for (let i = 1; i <= 6; i++) {
    const y = groundY + Math.pow(i / 6, 1.8) * depth
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
  }
  ctx.stroke()

  ctx.fillStyle = 'rgba(147,197,253,0.9)'
  ctx.fillRect(0, groundY, w, 1.5)
  ctx.fillStyle = 'rgba(59,130,246,0.35)'
  ctx.fillRect(0, groundY + 1.5, w, 3)

  // Lignes de vitesse
  const intensity = clamp((game.speed - CFG.baseSpeed * 1.25) / 420, 0, 1)
  if (intensity > 0 && !reducedMotion) {
    ctx.strokeStyle = `rgba(191,219,254,${0.22 * intensity})`
    ctx.lineWidth = 1
    ctx.beginPath()
    for (const l of speedLines) {
      if (l.x + l.len < 0) {
        l.x = w + rand(0, 400)
        l.y = Math.random()
      }
      const y = groundY - 30 - l.y * 300
      ctx.moveTo(l.x, y)
      ctx.lineTo(l.x + l.len * (0.5 + intensity), y)
    }
    ctx.stroke()
  }
}

function drawBlock(ob) {
  const c = ob.variant === 'tall' ? COLORS.violet : COLORS.cyan
  const x = ob.x
  const y = view.groundY + ob.top
  const w = ob.w
  const h = -ob.top

  ctx.save()
  ctx.shadowColor = rgba(c, 0.75)
  ctx.shadowBlur = 18
  const g = ctx.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(0, rgba(c, 0.6))
  g.addColorStop(1, rgba(c, 0.12))
  ctx.fillStyle = g
  roundRect(x, y, w, h, 5)
  ctx.fill()
  ctx.restore()

  ctx.lineWidth = 1.5
  ctx.strokeStyle = rgba(c, 0.95)
  ctx.stroke()

  // Reflet balayant
  ctx.save()
  ctx.clip()
  const sweep = mod(game.clock * 60 + ob.x * 0.3, w + h + 40) - h - 20
  ctx.fillStyle = 'rgba(255,255,255,0.14)'
  ctx.beginPath()
  ctx.moveTo(x + sweep, y + h)
  ctx.lineTo(x + sweep + h, y)
  ctx.lineTo(x + sweep + h + 8, y)
  ctx.lineTo(x + sweep + 8, y + h)
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.fillRect(x + 4, y + 3, w - 8, 1.5)

  if (ob.hit > 0) {
    ctx.fillStyle = `rgba(255,255,255,${ob.hit})`
    roundRect(x, y, w, h, 5)
    ctx.fill()
  }
}

function drawBar(ob) {
  const c = COLORS.rose
  const x = ob.x
  const w = ob.w
  const by = view.groundY + ob.bottom

  const panel = ctx.createLinearGradient(0, by - 260, 0, by)
  panel.addColorStop(0, rgba(c, 0))
  panel.addColorStop(1, rgba(c, 0.3))
  ctx.fillStyle = panel
  ctx.fillRect(x, 0, w, by)

  // Balayage de lignes
  ctx.fillStyle = rgba(c, 0.16)
  const off = mod(game.clock * 90, 14)
  for (let y = by - 4 - off; y > by - 200; y -= 14) ctx.fillRect(x, y, w, 1.5)

  ctx.fillStyle = rgba(c, 0.55)
  ctx.fillRect(x, 0, 1.5, by)
  ctx.fillRect(x + w - 1.5, 0, 1.5, by)

  // Faisceau laser
  const flicker = 0.82 + 0.18 * Math.sin(game.clock * 42 + ob.x)
  ctx.save()
  ctx.shadowColor = rgba(c, 1)
  ctx.shadowBlur = 18
  ctx.fillStyle = rgba(c, flicker)
  ctx.fillRect(x - 3, by - 3, w + 6, 4)
  ctx.fillStyle = `rgba(255,228,230,${flicker})`
  ctx.fillRect(x - 3, by - 2, w + 6, 1.5)
  ctx.restore()

  // Émetteurs
  ctx.fillStyle = '#1e0a14'
  ctx.strokeStyle = rgba(c, 0.9)
  ctx.lineWidth = 1
  for (const ex of [x - 7, x + w - 1]) {
    roundRect(ex, by - 9, 8, 12, 2)
    ctx.fill()
    ctx.stroke()
  }

  // Lueur au sol : indique qu'il faut glisser
  ctx.fillStyle = rgba(c, 0.35 + 0.15 * Math.sin(game.clock * 8))
  ctx.fillRect(x, view.groundY + 1, w, 3)

  if (ob.hit > 0) {
    ctx.fillStyle = `rgba(255,255,255,${ob.hit * 0.8})`
    ctx.fillRect(x, by - 30, w, 30)
  }
}

function drawDrone(ob) {
  const c = COLORS.amber
  const cx = ob.x + ob.w / 2
  const bob = Math.sin(game.clock * 6 + ob.phase) * 2
  const cy = view.groundY + (ob.top + ob.bottom) / 2 + bob

  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(cx, view.groundY + 3, 14, 3, 0, 0, Math.PI * 2)
  ctx.fill()

  // Rotors
  ctx.strokeStyle = rgba(c, 0.7)
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (const side of [-1, 1]) {
    const rx = cx + side * 11
    const len = 10 * Math.abs(Math.sin(game.clock * 48 + side))
    ctx.moveTo(rx, cy - 9)
    ctx.lineTo(rx, cy - 13)
    ctx.moveTo(rx - len, cy - 13)
    ctx.lineTo(rx + len, cy - 13)
  }
  ctx.stroke()

  ctx.save()
  ctx.shadowColor = rgba(c, 0.9)
  ctx.shadowBlur = 16
  const g = ctx.createLinearGradient(0, cy - 10, 0, cy + 10)
  g.addColorStop(0, '#fde68a')
  g.addColorStop(1, '#b45309')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(cx, cy, ob.w / 2, 9, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = '#1c1206'
  roundRect(cx - 10, cy - 3, 14, 6, 3)
  ctx.fill()
  const blink = Math.sin(game.clock * 10 + ob.phase) > 0
  ctx.fillStyle = blink ? '#f87171' : '#7f1d1d'
  ctx.beginPath()
  ctx.arc(cx - 5, cy, 2, 0, Math.PI * 2)
  ctx.fill()

  if (ob.hit > 0) {
    ctx.fillStyle = `rgba(255,255,255,${ob.hit})`
    ctx.beginPath()
    ctx.ellipse(cx, cy, ob.w / 2 + 2, 11, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawPlayerShape(w, h, legT) {
  const legH = 9 * legT
  const bodyH = h - legH
  const p = player

  // Jambes
  if (legH > 1) {
    ctx.fillStyle = '#1d4ed8'
    let a = 0
    let b = 0
    let lift = 0
    if (p.dead) {
      a = -4
      b = 5
    } else if (p.grounded) {
      a = Math.sin(p.phase) * 6
      b = -a
    } else {
      a = -4
      b = 6
      lift = 3
    }
    roundRect(-9 + a, -legH - lift, 7, legH, 3)
    ctx.fill()
    roundRect(2 + b, -legH - lift, 7, legH, 3)
    ctx.fill()
  }

  // Corps
  ctx.save()
  ctx.shadowColor = 'rgba(59,130,246,0.9)'
  ctx.shadowBlur = 20
  const g = ctx.createLinearGradient(0, -h, 0, -legH)
  g.addColorStop(0, '#bfdbfe')
  g.addColorStop(0.5, '#60a5fa')
  g.addColorStop(1, '#2563eb')
  ctx.fillStyle = g
  roundRect(-w / 2, -h, w, bodyH, Math.min(12, bodyH / 2))
  ctx.fill()
  ctx.restore()

  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 1
  ctx.stroke()

  // Visière
  const vh = Math.min(10, bodyH * 0.38)
  const vy = -h + Math.min(8, bodyH * 0.22)
  ctx.fillStyle = '#050b1f'
  roundRect(w / 2 - 17, vy, 14, vh, vh / 2)
  ctx.fill()
  if (p.dead) {
    ctx.strokeStyle = '#fb7185'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    const ex = w / 2 - 8
    const ey = vy + vh / 2
    ctx.moveTo(ex - 3, ey - 3)
    ctx.lineTo(ex + 3, ey + 3)
    ctx.moveTo(ex + 3, ey - 3)
    ctx.lineTo(ex - 3, ey + 3)
    ctx.stroke()
  } else {
    ctx.save()
    ctx.shadowColor = '#22d3ee'
    ctx.shadowBlur = 8
    ctx.fillStyle = '#67e8f9'
    roundRect(w / 2 - 11, vy + vh / 2 - 1.5, 6, 3, 1.5)
    ctx.fill()
    ctx.restore()
  }

  // Antenne (penche avec la vitesse et le saut)
  const lean = clamp(game.speed / 120, 2, 8) + (p.grounded ? 0 : clamp(p.vy / 120, -4, 4))
  ctx.strokeStyle = '#93c5fd'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(-w / 2 + 8, -h + 1)
  ctx.lineTo(-w / 2 + 8 - lean, -h - 8)
  ctx.stroke()
  ctx.fillStyle = '#22d3ee'
  ctx.beginPath()
  ctx.arc(-w / 2 + 8 - lean, -h - 9, 2.2, 0, Math.PI * 2)
  ctx.fill()
}

function drawPlayer() {
  const p = player
  const legT = clamp((p.rh - CFG.slide.h) / (CFG.stand.h - CFG.slide.h), 0, 1)
  const baseX = CFG.playerX + p.dx
  const bob = p.grounded && !p.sliding && !p.dead && game.state !== 'over' ? -Math.abs(Math.sin(p.phase)) * 2 : 0

  // Traînée de vitesse
  if (!p.dead && (game.state === 'playing' || game.state === 'paused')) {
    const spacing = game.speed * 0.014
    for (let i = 0; i < p.history.length; i++) {
      const hs = p.history[i]
      const a = 0.2 * (1 - i / p.history.length)
      ctx.fillStyle = `rgba(59,130,246,${a})`
      roundRect(baseX - hs.w / 2 - (i + 1) * spacing, view.groundY + hs.y - hs.h, hs.w, hs.h - 4, 8)
      ctx.fill()
    }
  }

  ctx.save()
  ctx.translate(baseX, view.groundY + p.y + bob)
  if (p.dead) {
    ctx.translate(0, -p.rh / 2)
    ctx.rotate(p.rot)
    ctx.translate(0, p.rh / 2)
  }
  ctx.scale(p.sx, p.sy)
  drawPlayerShape(p.rw, p.rh, legT)
  ctx.restore()
}

function drawParticles() {
  for (const pt of game.particles) {
    const a = clamp(pt.life / pt.max, 0, 1)
    if (pt.kind === 'spark') {
      ctx.strokeStyle = rgba(pt.color, a)
      ctx.lineWidth = pt.size
      ctx.beginPath()
      ctx.moveTo(pt.x, pt.y)
      ctx.lineTo(pt.x - pt.vx * 0.03, pt.y - pt.vy * 0.03)
      ctx.stroke()
    } else if (pt.kind === 'shard') {
      ctx.save()
      ctx.translate(pt.x, pt.y)
      ctx.rotate(pt.rot)
      ctx.fillStyle = rgba(pt.color, a)
      ctx.fillRect(-pt.size / 2, -pt.size / 2, pt.size, pt.size)
      ctx.restore()
    } else {
      ctx.fillStyle = rgba(pt.color, a * 0.8)
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, pt.size * (0.5 + a * 0.5), 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawFloaters() {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const f of game.floaters) {
    const t = f.age / f.life
    const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.5 : 1.1 - Math.min(0.1, (t - 0.15) * 0.4)
    const a = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3
    ctx.save()
    ctx.translate(f.x, f.y - t * 46)
    ctx.scale(pop, pop)
    ctx.font = `700 ${f.size}px "Space Grotesk Variable", "Inter Variable", system-ui, sans-serif`
    ctx.shadowColor = rgba(f.color, 0.9)
    ctx.shadowBlur = 12
    ctx.fillStyle = rgba(f.color, a)
    ctx.fillText(f.text, 0, 0)
    ctx.restore()
  }
}

function render() {
  const s = view.scale * view.dpr
  ctx.setTransform(s, 0, 0, s, 0, 0)

  let sx = 0
  let sy = 0
  if (game.shake > 0.1) {
    const amp = reducedMotion ? game.shake * 0.2 : game.shake
    sx = (Math.random() - 0.5) * amp
    sy = (Math.random() - 0.5) * amp
  }
  ctx.save()
  ctx.translate(sx, sy)

  drawBackground()
  for (const ob of game.obstacles) {
    if (ob.x > view.w + 20 || ob.x + ob.w < -20) continue
    if (ob.type === 'block') drawBlock(ob)
    else if (ob.type === 'bar') drawBar(ob)
    else drawDrone(ob)
  }
  drawPlayer()
  drawParticles()
  drawFloaters()
  ctx.restore()

  // Flash d'impact / d'accélération
  if (game.flash > 0.01) {
    ctx.fillStyle = rgba(game.flashColor, game.flash * 0.28)
    ctx.fillRect(0, 0, view.w, view.h)
  }

  // Vignette
  const vg = ctx.createRadialGradient(view.w / 2, view.h / 2, view.h * 0.35, view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.75)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,0,0,0.5)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, view.w, view.h)
}

/* ---------- HUD ---------- */
const hudCache = {}
function setText(el, key, value) {
  if (hudCache[key] !== value) {
    hudCache[key] = value
    el.textContent = value
  }
}

function updateHud() {
  setText(ui.score, 'score', fmt(game.score))
  const record = game.score > game.best
  setText(ui.best, 'best', fmt(record ? game.score : game.best))
  ui.bestWrap.classList.toggle('record', record && game.best > 0)
  setText(ui.mult, 'mult', `x${game.mult}`)
  setText(ui.comboCount, 'combo', `${game.combo} combo`)
  setText(ui.speed, 'speed', `${(game.speed / CFG.baseSpeed).toFixed(1)}x`)
  const pct = game.combo > 0 ? (game.comboTimer / CFG.comboWindow) * 100 : 0
  ui.comboBar.style.width = `${pct.toFixed(1)}%`
  ui.combo.classList.toggle('active', game.combo > 0)
  ui.combo.classList.toggle('hot', game.mult >= 4)
}

/* ---------- Boucle principale ---------- */
let last = performance.now()
const STEP = 1 / 120

function frame(now) {
  const realDt = Math.min(0.05, Math.max(0, (now - last) / 1000))
  last = now

  if (game.state !== 'paused') {
    game.clock += realDt
    game.shake *= Math.exp(-realDt * 9)
    game.flash *= Math.exp(-realDt * 5)

    if (game.hitStop > 0) {
      game.hitStop -= realDt
    } else {
      if (game.state === 'dying') {
        game.timeScale += (1 - game.timeScale) * Math.min(1, realDt * 2.4)
        game.deathT += realDt
      }
      const dt = realDt * game.timeScale
      const steps = Math.max(1, Math.ceil(dt / STEP))
      const h = dt / steps
      for (let i = 0; i < steps; i++) {
        if (game.state === 'playing') stepPlaying(h)
        else if (game.state === 'dying') stepDying(h)
        else if (game.state === 'menu') stepAmbient(h, CFG.baseSpeed * 0.6)
        else if (game.state === 'over') stepAmbient(h, 0)
      }
      updateParticles(dt)
      for (const ob of game.obstacles) if (ob.hit > 0) ob.hit = Math.max(0, ob.hit - dt * 3)
      if (game.state === 'dying' && game.deathT > 1.15) showGameOver()
    }

    if (game.state === 'playing') {
      player.history.unshift({ y: player.y, w: player.rw, h: player.rh })
      if (player.history.length > 5) player.history.pop()
    }
  }

  render()
  if (game.state === 'playing' || game.state === 'dying') updateHud()
  requestAnimationFrame(frame)
}

/* ---------- Init ---------- */
ui.menuBest.textContent = fmt(game.best)
setMuted(audio.muted)
updateHud()
requestAnimationFrame(frame)

// Accès de débogage (serveur de dev uniquement, retiré du build)
if (import.meta.env.DEV) window.__runner = { game, player, view, CFG }
