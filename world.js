// ── FISCH-FELDER ──
// Eigene Canvas-Zeichnung statt Emoji: sieht auf Android/iPhone/PC gleich aus.
function makeFishTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);

  ctx.save();
  ctx.translate(128, 128);

  // Schwanz
  ctx.beginPath();
  ctx.moveTo(-64, 0);
  ctx.lineTo(-105, -40);
  ctx.lineTo(-101, 38);
  ctx.closePath();
  ctx.fillStyle = '#2679b8';
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#15517f';
  ctx.stroke();

  // Körper
  ctx.beginPath();
  ctx.ellipse(10, 0, 82, 52, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#56b9e9';
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#15517f';
  ctx.stroke();

  // Bauch
  ctx.beginPath();
  ctx.ellipse(18, 15, 58, 26, 0, 0, Math.PI);
  ctx.fillStyle = '#9be4f4';
  ctx.fill();

  // obere Flosse
  ctx.beginPath();
  ctx.moveTo(-12, -48);
  ctx.lineTo(14, -78);
  ctx.lineTo(35, -44);
  ctx.closePath();
  ctx.fillStyle = '#2679b8';
  ctx.fill();

  // Seitenflosse
  ctx.beginPath();
  ctx.moveTo(5, 13);
  ctx.lineTo(-22, 48);
  ctx.lineTo(28, 30);
  ctx.closePath();
  ctx.fillStyle = '#2679b8';
  ctx.fill();

  // Auge
  ctx.beginPath();
  ctx.arc(54, -13, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(57, -13, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#17242d';
  ctx.fill();

  // Mund
  ctx.beginPath();
  ctx.arc(76, 8, 10, -0.7, 0.7);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#15517f';
  ctx.stroke();

  // kleine Schuppenpunkte
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  [[-15,-14],[8,-20],[30,1],[-10,12]].forEach(([x,y]) => {
    ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fill();
  });

  ctx.restore();

  const texture = new THREE.CanvasTexture(c);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
const fishTexture = makeFishTexture();

// Etwas weiter in der Welt verteilt, aber weiterhin in kurzer Spielzeit erreichbar.
const fishTargetData = [
  { x: 0, z: 11 },
  { x: 11, z: 28 },
  { x: -10, z: 46 }
];

const fishTargets = fishTargetData.map((d, index) => {
  const group = new THREE.Group();

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffd34d,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.78
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.62, 48), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.09;
  group.add(ring);

  const innerMat = new THREE.MeshBasicMaterial({
    color: 0x7be4ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.22
  });
  const innerCircle = new THREE.Mesh(new THREE.CircleGeometry(1.22, 48), innerMat);
  innerCircle.rotation.x = -Math.PI / 2;
  innerCircle.position.y = 0.085;
  group.add(innerCircle);

  // Leicht transparenter roter Lichtstrahl als weithin sichtbarer Beacon.
  // Zwei überlagerte, additive Kegel/Zylinder sorgen für eine weichere Lichtwirkung.
  const beamCoreMat = new THREE.MeshBasicMaterial({
    color: 0xff4b42,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
  const beamCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.50, 16, 28, 1, true),
    beamCoreMat
  );
  beamCore.position.y = 8.05;
  group.add(beamCore);

  const beamGlowMat = new THREE.MeshBasicMaterial({
    color: 0xff6a62,
    transparent: true,
    opacity: 0.055,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
  const beamGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.70, 0.88, 16.5, 28, 1, true),
    beamGlowMat
  );
  beamGlow.position.y = 8.25;
  group.add(beamGlow);

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: fishTexture,
    transparent: true,
    depthTest: false
  }));
  sprite.scale.set(1.45, 1.45, 1);
  sprite.position.y = 1.25;
  group.add(sprite);

  group.position.set(d.x, 0, d.z);
  group.userData.index = index;
  scene.add(group);
  return { group, ring, sprite, beamCore, beamGlow, collected: false };
});

// Wake particles
const wakeParticles = [];
function spawnWake(x, z) {
  if (wakeParticles.length > 60) {
    const old = wakeParticles.shift();
    scene.remove(old.mesh);
  }
  const geo = new THREE.SphereGeometry(0.08 + Math.random()*0.1, 4, 4);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x + (Math.random()-0.5)*0.5, 0.05, z + (Math.random()-0.5)*0.5);
  scene.add(m);
  wakeParticles.push({ mesh: m, life: 1.0 });
}

// ── ISLANDS ──
const islandData = [
  // Zusätzliche Inseln näher an der eigentlichen Spielstrecke
  { x: -13, z: 13, r: 2.2 }, { x: 16, z: 18, r: 2.5 },
  { x: -17, z: 28, r: 2.4 }, { x: 16, z: 37, r: 2.1 },
  { x: 2, z: 52, r: 2.8 }, { x: -15, z: 57, r: 2.0 },

  // Größere Inselwelt im Hintergrund
  { x: 25, z: -18, r: 3.5 }, { x: -30, z: 20, r: 4.2 },
  { x: 50, z: 30, r: 2.8 }, { x: -20, z: -45, r: 5.0 },
  { x: 60, z: -50, r: 3.0 }, { x: -55, z: -30, r: 3.8 },
  { x: 80, z: 10, r: 4.0 }, { x: -70, z: 60, r: 3.2 },
  { x: 10, z: 70, r: 4.5 }, { x: -10, z: -80, r: 3.0 },
  { x: 40, z: 80, r: 2.5 }, { x: -80, z: -10, r: 3.5 },
  { x: 28, z: 58, r: 3.0 }, { x: -34, z: 48, r: 3.4 },
];

islandData.forEach(d => {
  const g = new THREE.Group();
  const beach = new THREE.Mesh(new THREE.CylinderGeometry(d.r, d.r * 1.2, 0.5, 12), new THREE.MeshPhongMaterial({ color: 0xf0d87a }));
  beach.receiveShadow = true; beach.castShadow = true; g.add(beach);
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(d.r * 0.7, d.r * 0.9, 0.4, 12), new THREE.MeshPhongMaterial({ color: 0x3a9a30 }));
  grass.position.y = 0.4; grass.castShadow = true; g.add(grass);
  const hill = new THREE.Mesh(new THREE.SphereGeometry(d.r * 0.65, 10, 6), new THREE.MeshPhongMaterial({ color: 0x4aaa38 }));
  hill.position.y = 0.55; hill.scale.y = 0.45; hill.castShadow = true; g.add(hill);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 2.2, 6), new THREE.MeshPhongMaterial({ color: 0x8B6010 }));
  trunk.position.y = 1.55; trunk.rotation.z = (Math.random() - 0.5) * 0.3; trunk.castShadow = true; g.add(trunk);
  const leafMat = new THREE.MeshPhongMaterial({ color: 0x2d8020, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const la = (i / 6) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.0, 4), leafMat);
    leaf.position.set(Math.cos(la)*0.55, 2.7, Math.sin(la)*0.55);
    leaf.rotation.z = Math.cos(la) * 0.8;
    leaf.rotation.x = Math.sin(la) * 0.8;
    leaf.castShadow = true;
    g.add(leaf);
  }
  g.position.set(d.x, 0, d.z);
  scene.add(g);
});
