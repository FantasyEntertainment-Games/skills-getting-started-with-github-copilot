const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const ui = { health: document.getElementById("health"), ammo: document.getElementById("ammo"), score: document.getElementById("score"), time: document.getElementById("time"), message: document.getElementById("message") };
const W = canvas.width, H = canvas.height;
const keys = new Set(), pointer = { x: W / 2, y: H / 2, down: false };
const cover = [
  { x: 120, y: 120, w: 150, h: 76 }, { x: 375, y: 205, w: 210, h: 72 },
  { x: 700, y: 85, w: 150, h: 105 }, { x: 95, y: 390, w: 205, h: 72 },
  { x: 445, y: 440, w: 190, h: 80 }, { x: 745, y: 365, w: 135, h: 120 }
];
let player, enemies, bullets, supplies, score, remaining, spawnTimer, supplyTimer, active, message;
function reset() {
  player = { x: W / 2, y: H / 2, r: 13, health: 100, ammo: 30, angle: 0, cooldown: 0, flash: 0 };
  enemies = []; bullets = []; supplies = []; score = 0; remaining = 90; spawnTimer = .7; supplyTimer = 4; active = true;
  message = "Survive for 90 seconds. Collect supplies and keep moving."; updateHud();
}
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const rand = (a, b) => Math.random() * (b - a) + a;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function blocked(x, y, radius, r) { const cx = clamp(x, r.x, r.x + r.w), cy = clamp(y, r.y, r.y + r.h); return (x - cx) ** 2 + (y - cy) ** 2 < radius ** 2; }
function updateHud() { ui.health.textContent = Math.ceil(Math.max(0, player.health)); ui.ammo.textContent = player.ammo; ui.score.textContent = score; ui.time.textContent = Math.ceil(Math.max(0, remaining)); ui.message.textContent = message; }
function shoot() {
  if (!active || player.cooldown > 0) return;
  if (player.ammo <= 0) { message = "Out of ammo — press R to reload."; return; }
  const dx = Math.cos(player.angle), dy = Math.sin(player.angle);
  bullets.push({ x: player.x + dx * 19, y: player.y + dy * 19, vx: dx * 560, vy: dy * 560, life: 1 });
  player.ammo--; player.cooldown = .19;
}
function spawnEnemy() {
  const edge = Math.floor(Math.random() * 4);
  const p = edge === 0 ? { x: rand(20, W - 20), y: -14 } : edge === 1 ? { x: W + 14, y: rand(20, H - 20) } : edge === 2 ? { x: rand(20, W - 20), y: H + 14 } : { x: -14, y: rand(20, H - 20) };
  enemies.push({ ...p, r: 12, speed: rand(42, 63) + score * .35 });
}
function update(dt) {
  if (!active) return;
  remaining -= dt; spawnTimer -= dt; supplyTimer -= dt;
  let dx = Number(keys.has("d") || keys.has("arrowright")) - Number(keys.has("a") || keys.has("arrowleft"));
  let dy = Number(keys.has("s") || keys.has("arrowdown")) - Number(keys.has("w") || keys.has("arrowup"));
  const length = Math.hypot(dx, dy) || 1; dx = dx / length * 190 * dt; dy = dy / length * 190 * dt;
  const nx = clamp(player.x + dx, player.r, W - player.r);
  if (!cover.some(r => blocked(nx, player.y, player.r, r))) player.x = nx;
  const ny = clamp(player.y + dy, player.r, H - player.r);
  if (!cover.some(r => blocked(player.x, ny, player.r, r))) player.y = ny;
  player.angle = Math.atan2(pointer.y - player.y, pointer.x - player.x);
  player.cooldown = Math.max(0, player.cooldown - dt); player.flash = Math.max(0, player.flash - dt);
  if (pointer.down) shoot();
  if (spawnTimer <= 0 && enemies.length < 14) { spawnEnemy(); spawnTimer = Math.max(.55, 1.5 - score * .02); }
  if (supplyTimer <= 0 && supplies.length < 3) { supplies.push({ x: rand(35, W - 35), y: rand(35, H - 35), kind: Math.random() < .5 ? "health" : "ammo", t: 0 }); supplyTimer = rand(7, 11); }
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0 || b.x < 0 || b.x > W || b.y < 0 || b.y > H || cover.some(r => b.x > r.x && b.x < r.x + r.w && b.y > r.y && b.y < r.y + r.h)) { bullets.splice(i, 1); continue; }
    const target = enemies.findIndex(e => distance(b, e) < e.r + 4);
    if (target !== -1) { const e = enemies[target]; enemies.splice(target, 1); bullets.splice(i, 1); score++; message = "Target down. Watch the edge of the clearing."; if (Math.random() < .28) supplies.push({ x: e.x, y: e.y, kind: Math.random() < .5 ? "health" : "ammo", t: 0 }); }
  }
  for (const e of enemies) {
    const a = Math.atan2(player.y - e.y, player.x - e.x), ex = e.x + Math.cos(a) * e.speed * dt, ey = e.y + Math.sin(a) * e.speed * dt;
    if (!cover.some(r => blocked(ex, e.y, e.r, r))) e.x = ex;
    if (!cover.some(r => blocked(e.x, ey, e.r, r))) e.y = ey;
    if (distance(player, e) < player.r + e.r) { player.health -= 24 * dt; player.flash = .12; message = "Under attack! Break contact and move."; }
  }
  for (let i = supplies.length - 1; i >= 0; i--) {
    const s = supplies[i]; s.t += dt;
    if (distance(player, s) < player.r + 14) {
      if (s.kind === "health") { player.health = Math.min(100, player.health + 28); message = "Medical supplies collected."; }
      else { player.ammo = Math.min(30, player.ammo + 10); message = "Ammunition collected."; }
      supplies.splice(i, 1);
    }
  }
  if (player.health <= 0) { player.health = 0; active = false; message = "Mission failed. Restart to try again."; }
  if (remaining <= 0) { remaining = 0; active = false; message = score >= 8 ? "You survived the island. Mission complete!" : "Time is up. Try again and score at least 8."; }
}
function draw() {
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#285746"); bg.addColorStop(.72, "#214531"); bg.addColorStop(1, "#163c43"); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 95; i++) { ctx.fillStyle = i % 2 ? "#bdd27512" : "#06191218"; ctx.beginPath(); ctx.arc((i * 137 + 17) % W, (i * 83 + 29) % H, 2 + i % 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = "#1f5359b8"; ctx.fillRect(0, H - 27, W, 27);
  cover.forEach(r => { ctx.fillStyle = "#594d35"; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.fillStyle = "#356b43"; ctx.fillRect(r.x - 4, r.y - 5, r.w + 8, 12); ctx.fillStyle = "#081b102e"; ctx.fillRect(r.x, r.y + r.h - 8, r.w, 8); });
  supplies.forEach(s => { const y = s.y + Math.sin(s.t * 5) * 2; ctx.fillStyle = s.kind === "health" ? "#9befa4" : "#f3d16b"; ctx.beginPath(); ctx.arc(s.x, y, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#102319"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s.kind === "health" ? "+" : "A", s.x, y); });
  bullets.forEach(b => { ctx.fillStyle = "#ffe58c"; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill(); });
  enemies.forEach(e => { ctx.fillStyle = "#d56b5d"; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#f2c99e"; ctx.beginPath(); ctx.arc(e.x + 3, e.y - 3, 3, 0, Math.PI * 2); ctx.fill(); });
  ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle); ctx.fillStyle = player.flash ? "#fff" : "#8ee9a0"; ctx.beginPath(); ctx.arc(0, 0, player.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#e4f7d9"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(3, 0); ctx.lineTo(22, 0); ctx.stroke(); ctx.restore();
  if (!active) { ctx.fillStyle = "#020d0bb0"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 34px Segoe UI, sans-serif"; ctx.fillText(remaining <= 0 && score >= 8 ? "MISSION COMPLETE" : "MISSION OVER", W / 2, H / 2 - 12); ctx.font = "16px Segoe UI, sans-serif"; ctx.fillText("Select Restart Mission to play again", W / 2, H / 2 + 25); }
}
let last = 0;
function frame(now) { const dt = Math.min((now - last) / 1000 || 0, .033); last = now; update(dt); draw(); updateHud(); requestAnimationFrame(frame); }
function setPointer(event) { const r = canvas.getBoundingClientRect(); pointer.x = (event.clientX - r.left) * W / r.width; pointer.y = (event.clientY - r.top) * H / r.height; }
window.addEventListener("keydown", e => { const k = e.key.toLowerCase(); keys.add(k); if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault(); if (k === "r") { player.ammo = 30; message = "Magazine reloaded."; updateHud(); } });
window.addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));
canvas.addEventListener("pointermove", setPointer);
canvas.addEventListener("pointerdown", e => { setPointer(e); pointer.down = true; canvas.setPointerCapture(e.pointerId); shoot(); });
canvas.addEventListener("pointerup", () => { pointer.down = false; });
canvas.addEventListener("pointercancel", () => { pointer.down = false; });
document.getElementById("restart").addEventListener("click", reset);
reset(); requestAnimationFrame(frame);
