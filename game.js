// ── GAME STATE ──
const gs = {
  x: 0, z: 0, angle: 0,
  speed: 0, maxSpeed: 5,
  wheelRot: 0,
  nextExpected: 'left',
  combo: 0,
  tilt: 0,
  started: false,
  collisionCooldown: 0,
  missionActive: false,
  missionDone: false,
  fishCollected: 0,
};

const camOffset = new THREE.Vector3(0, 4.5, 9);
const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3();

function updateFishCounter() {
  document.getElementById('fish-counter').textContent = `🐟 ${gs.fishCollected} / 3`;
}

function showControlHint() {
  const hint = document.getElementById('hint');
  hint.style.display = 'block';
  clearTimeout(showControlHint.timer);
  showControlHint.timer = setTimeout(() => { hint.style.display = 'none'; }, 3200);
}

function resetMission() {
  gs.x = 0; gs.z = 0; gs.angle = 0; gs.speed = 0; gs.wheelRot = 0;
  gs.combo = 0; gs.nextExpected = 'left'; gs.started = false;
  gs.missionActive = true; gs.missionDone = false; gs.fishCollected = 0;
  fishTargets.forEach(t => { t.collected = false; t.group.visible = true; });
  updateFishCounter();
  boatGroup.position.set(0, 0, 0);
  boatGroup.rotation.set(0, 0, 0);
  camPos.set(0, 5, 9);
  camTarget.set(0, 0.8, 0);
}

function finishMission() {
  if (gs.missionDone) return;
  gs.missionDone = true;
  gs.missionActive = false;
  gs.speed = 0;
  setTimeout(() => { document.getElementById('success-overlay').style.display = 'flex'; }, 250);
}

function checkFishTargets() {
  if (!gs.missionActive || gs.missionDone) return;
  fishTargets.forEach(t => {
    if (t.collected) return;
    const dx = gs.x - t.group.position.x;
    const dz = gs.z - t.group.position.z;
    if (Math.sqrt(dx*dx + dz*dz) < 1.9) {
      t.collected = true;
      t.group.visible = false;
      gs.fishCollected++;
      updateFishCounter();
      if (gs.fishCollected >= 3) finishMission();
    }
  });
}

let gyroReady = false;
function requestGyro() {
  if (gyroReady) return;
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(r => {
      if (r === 'granted') startGyro();
    }).catch(() => {});
  } else {
    startGyro();
  }
}
function startGyro() {
  window.addEventListener('deviceorientation', e => {
    if (e.gamma !== null) {
      gyroReady = true;
      gs.tilt = Math.max(-1, Math.min(1, e.gamma / 30));
    }
  });
}

function handleTap(side) {
  if (!gs.missionActive || gs.missionDone) return;
  requestGyro();
  if (!gs.started) gs.started = true;
  if (side === gs.nextExpected) {
    gs.combo++;
    gs.speed = Math.min(gs.maxSpeed, gs.speed + 0.4 + gs.combo * 0.05);
    gs.nextExpected = side === 'left' ? 'right' : 'left';
  } else {
    gs.combo = 0;
    gs.speed = Math.max(0, gs.speed - 0.4);
  }
}

document.getElementById('tap-left').addEventListener('touchstart', e => { e.preventDefault(); handleTap('left'); }, { passive: false });
document.getElementById('tap-right').addEventListener('touchstart', e => { e.preventDefault(); handleTap('right'); }, { passive: false });
document.getElementById('tap-left').addEventListener('mousedown', () => handleTap('left'));
document.getElementById('tap-right').addEventListener('mousedown', () => handleTap('right'));

document.getElementById('start-mission').addEventListener('click', () => {
  document.getElementById('mission-overlay').style.display = 'none';
  resetMission();
  requestGyro();
  showControlHint();
});

document.getElementById('restart-mission').addEventListener('click', () => {
  document.getElementById('success-overlay').style.display = 'none';
  resetMission();
  showControlHint();
});

function checkCollisions() {
  if (gs.collisionCooldown > 0) return;
  for (const d of islandData) {
    const dx = gs.x - d.x;
    const dz = gs.z - d.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    if (dist < d.r * 1.15 + 1.2) {
      gs.speed = -1.2;
      gs.x += (dx / dist) * 1.5;
      gs.z += (dz / dist) * 1.5;
      gs.collisionCooldown = 40;
      gs.combo = 0;
      const flash = document.getElementById('collision-flash');
      flash.style.background = 'rgba(255,60,60,0.4)';
      setTimeout(() => { flash.style.background = 'rgba(255,60,60,0)'; }, 180);
      return;
    }
  }
}

let lastTime = 0;
let wakeTimer = 0;
function animate(t) {
  requestAnimationFrame(animate);
  const dt = Math.min((t - lastTime) / 16.67, 3);
  lastTime = t;

  const time = t * 0.001;
  for (let i = 0; i < wPos.count; i++) {
    const x = wPos.getX(i);
    const z = wPos.getZ(i);
    wPos.setZ(i, Math.sin(x * 0.3 + time) * 0.18 + Math.cos(z * 0.25 + time * 1.1) * 0.12);
  }
  wPos.needsUpdate = true;
  waterGeo.computeVertexNormals();

  fishTargets.forEach((target, i) => {
    if (!target.group.visible) return;
    target.sprite.position.y = 1.25 + Math.sin(time * 2.2 + i) * 0.15;
    target.ring.material.opacity = 0.64 + Math.sin(time * 3 + i) * 0.16;
    target.group.rotation.y = Math.sin(time * 0.8 + i) * 0.12;
  });

  if (gs.collisionCooldown > 0) gs.collisionCooldown -= dt;
  gs.speed *= Math.pow(0.982, dt);
  if (Math.abs(gs.speed) < 0.005) { gs.speed = 0; gs.combo = 0; }

  if (gs.speed > 0.05 || gs.speed < -0.05) {
    gs.angle += gs.tilt * 0.028 * dt * (gs.speed / gs.maxSpeed);
  }
  gs.x += Math.sin(gs.angle) * gs.speed * dt * 0.18;
  gs.z += Math.cos(gs.angle) * gs.speed * dt * 0.18;

  gs.wheelRot += gs.speed * 0.07 * dt;
  wheelL.rotation.x = gs.wheelRot;
  wheelR.rotation.x = gs.wheelRot;
  gearMain.rotation.x = -gs.wheelRot * 1.25;
  gearFront.rotation.x = gs.wheelRot * 1.6;

  checkCollisions();
  checkFishTargets();

  boatGroup.position.set(gs.x, 0, gs.z);
  boatGroup.rotation.y = gs.angle;
  boatGroup.rotation.z = Math.sin(time * 1.2) * 0.03;
  boatGroup.rotation.x = Math.cos(time * 0.9) * 0.02;
  boatGroup.position.y = Math.sin(time * 1.5) * 0.06;

  if (gs.speed > 0.5) {
    wakeTimer += dt;
    if (wakeTimer > 3) {
      wakeTimer = 0;
      spawnWake(gs.x, gs.z);
    }
  }
  for (let i = wakeParticles.length - 1; i >= 0; i--) {
    const p = wakeParticles[i];
    p.life -= 0.012 * dt;
    p.mesh.material.opacity = p.life * 0.5;
    p.mesh.scale.setScalar(1 + (1 - p.life) * 1.5);
    if (p.life <= 0) {
      scene.remove(p.mesh);
      wakeParticles.splice(i, 1);
    }
  }

  const behindX = gs.x - Math.sin(gs.angle) * camOffset.z;
  const behindZ = gs.z - Math.cos(gs.angle) * camOffset.z;
  const targetCam = new THREE.Vector3(behindX, camOffset.y, behindZ);
  camPos.lerp(targetCam, 0.07);
  camera.position.copy(camPos);
  camTarget.lerp(new THREE.Vector3(gs.x, 0.8, gs.z), 0.1);
  camera.lookAt(camTarget);

  const needle = document.getElementById('compass-needle');
  const tail = document.getElementById('compass-tail');
  const nx = 26 + Math.sin(gs.angle) * 18;
  const ny = 26 - Math.cos(gs.angle) * 18;
  const tx = 26 - Math.sin(gs.angle) * 12;
  const ty = 26 + Math.cos(gs.angle) * 12;
  needle.setAttribute('x2', nx); needle.setAttribute('y2', ny);
  tail.setAttribute('x2', tx); tail.setAttribute('y2', ty);

  const fillEl = document.getElementById('speed-bar-fill');
  if (fillEl) fillEl.style.width = Math.round(Math.max(0, gs.speed / gs.maxSpeed) * 100) + '%';

  const bL = document.getElementById('badge-left');
  const bR = document.getElementById('badge-right');
  if (bL) bL.style.opacity = gs.nextExpected === 'left' ? '1' : '0.35';
  if (bR) bR.style.opacity = gs.nextExpected === 'right' ? '1' : '0.35';

  renderer.render(scene, camera);
}

camPos.set(0, 5, 9);
camera.position.copy(camPos);
camera.lookAt(0, 0, 0);
updateFishCounter();
requestAnimationFrame(animate);
