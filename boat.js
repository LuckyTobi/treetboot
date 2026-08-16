const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x87ceeb, 0.012);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

const ambient = new THREE.AmbientLight(0xfff0d0, 0.65);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xfff5e0, 1.45);
sun.position.set(80, 120, 60);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 400;
sun.shadow.camera.left = -80;
sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80;
sun.shadow.camera.bottom = -80;
scene.add(sun);
scene.background = new THREE.Color(0x87ceeb);

// Water
const waterGeo = new THREE.PlaneGeometry(600, 600, 80, 80);
const waterMat = new THREE.MeshPhongMaterial({
  color: 0x1a6fa0, specular: 0x88ccff, shininess: 60,
  side: THREE.DoubleSide, transparent: true, opacity: 0.92
});
const water = new THREE.Mesh(waterGeo, waterMat);
water.rotation.x = -Math.PI / 2;
water.receiveShadow = true;
scene.add(water);
const wPos = waterGeo.attributes.position;
const wOrigY = [];
for (let i = 0; i < wPos.count; i++) wOrigY.push(wPos.getY(i));

// ── BOAT: farbiges Holzmodell nach der Museums-/3D-Vorlage ──
// Wichtig: Die Vorrichtung/der Sockel unter dem Boot aus der Vorlage wird NICHT übernommen.
const boatGroup = new THREE.Group();
scene.add(boatGroup);

const woodDark = new THREE.MeshPhongMaterial({ color: 0x4a2b16, specular: 0x241207, shininess: 14 });
const woodHull = new THREE.MeshPhongMaterial({ color: 0x7b4722, specular: 0x2b1609, shininess: 20 });
const woodMid = new THREE.MeshPhongMaterial({ color: 0x9a6030, specular: 0x3d210d, shininess: 18 });
const woodLight = new THREE.MeshPhongMaterial({ color: 0xc58a4b, specular: 0x5b3215, shininess: 22 });
const mechanismMat = new THREE.MeshPhongMaterial({ color: 0x8a6a45, specular: 0x5a4631, shininess: 32 });
const metalDark = new THREE.MeshPhongMaterial({ color: 0x4d4740, specular: 0x77716b, shininess: 48 });

function addBeam(parent, from, to, thickness, material) {
  const a = new THREE.Vector3(from[0], from[1], from[2]);
  const b = new THREE.Vector3(to[0], to[1], to[2]);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, len, thickness), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeHullShape(scale = 1) {
  const s = new THREE.Shape();
  s.moveTo(-0.34 * scale, -2.00 * scale);
  s.lineTo(-0.62 * scale, -1.45 * scale);
  s.lineTo(-0.70 * scale, 0.75 * scale);
  s.lineTo(-0.54 * scale, 1.48 * scale);
  s.lineTo(0, 2.30 * scale);
  s.lineTo(0.54 * scale, 1.48 * scale);
  s.lineTo(0.70 * scale, 0.75 * scale);
  s.lineTo(0.62 * scale, -1.45 * scale);
  s.lineTo(0.34 * scale, -2.00 * scale);
  s.closePath();
  return s;
}

const hullGeo = new THREE.ExtrudeGeometry(makeHullShape(1), {
  depth: 0.58, bevelEnabled: true, bevelThickness: 0.07,
  bevelSize: 0.07, bevelSegments: 3
});
const hull = new THREE.Mesh(hullGeo, woodHull);
hull.rotation.x = Math.PI / 2;
hull.position.y = 0.02;
hull.castShadow = true;
boatGroup.add(hull);

const innerGeo = new THREE.ExtrudeGeometry(makeHullShape(0.84), { depth: 0.035, bevelEnabled: false });
const inner = new THREE.Mesh(innerGeo, woodDark);
inner.rotation.x = Math.PI / 2;
inner.position.y = 0.44;
boatGroup.add(inner);

addBeam(boatGroup, [-0.62,0.49,-1.42], [-0.70,0.49,0.72], 0.07, woodLight);
addBeam(boatGroup, [ 0.62,0.49,-1.42], [ 0.70,0.49,0.72], 0.07, woodLight);
addBeam(boatGroup, [-0.70,0.49,0.72], [-0.50,0.49,1.55], 0.07, woodLight);
addBeam(boatGroup, [ 0.70,0.49,0.72], [ 0.50,0.49,1.55], 0.07, woodLight);

[-1.05, 0.95].forEach(zPos => {
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.08, 0.18), woodLight);
  seat.position.set(0, 0.55, zPos);
  seat.castShadow = true;
  boatGroup.add(seat);
});

const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.65, 12), metalDark);
axle.rotation.z = Math.PI / 2;
axle.position.set(0, 0.98, 0.02);
axle.castShadow = true;
boatGroup.add(axle);

function makeSideFrame(side) {
  const g = new THREE.Group();
  const sx = side * 0.78;
  addBeam(g, [sx,0.45,-0.62], [sx,0.98,0.02], 0.085, woodMid);
  addBeam(g, [sx,0.98,0.02], [sx,1.88,-0.78], 0.085, woodMid);
  addBeam(g, [sx,0.45, 0.62], [sx,0.98,0.02], 0.085, woodMid);
  addBeam(g, [sx,0.98,0.02], [sx,1.88, 0.78], 0.085, woodMid);
  addBeam(g, [sx,1.88,-0.78], [sx,1.88,0.78], 0.07, woodMid);
  addBeam(g, [sx,0.45,-0.62], [sx,0.45,0.62], 0.07, woodMid);
  const bearing = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.12,12), mechanismMat);
  bearing.rotation.z = Math.PI / 2;
  bearing.position.set(sx,0.98,0.02);
  bearing.castShadow = true;
  g.add(bearing);
  return g;
}
boatGroup.add(makeSideFrame(-1));
boatGroup.add(makeSideFrame(1));

function makeGear(radius, teeth, x, y, z, material) {
  const g = new THREE.Group();
  const disk = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.13, 20), material);
  disk.rotation.z = Math.PI / 2;
  disk.castShadow = true;
  g.add(disk);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius*0.20, radius*0.20, 0.18, 12), metalDark);
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  for (let i=0;i<teeth;i++) {
    const a = i / teeth * Math.PI * 2;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.09, 0.08), woodLight);
    tooth.position.set(0, Math.cos(a)*(radius+0.045), Math.sin(a)*(radius+0.045));
    tooth.rotation.x = a;
    tooth.castShadow = true;
    g.add(tooth);
  }
  g.position.set(x,y,z);
  return g;
}
const gearMain = makeGear(0.42, 14, -0.12, 0.72, -0.35, mechanismMat);
const gearFront = makeGear(0.30, 10, 0.18, 0.72, 0.28, woodLight);
boatGroup.add(gearMain);
boatGroup.add(gearFront);

function makeSpokedGear(x,z) {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.32,0.035,6,18), woodLight);
  rim.rotation.y = Math.PI/2;
  g.add(rim);
  for(let i=0;i<8;i++) {
    const a=i/8*Math.PI*2;
    const spoke=new THREE.Mesh(new THREE.BoxGeometry(0.035,0.31,0.045), mechanismMat);
    spoke.rotation.x=a;
    g.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.075,0.12,10), metalDark);
  hub.rotation.z=Math.PI/2;
  g.add(hub);
  g.position.set(x,0.76,z);
  return g;
}
boatGroup.add(makeSpokedGear(-0.34,0.18));
boatGroup.add(makeSpokedGear(0.34,0.18));

function makePaddleWheel(side) {
  const g = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,0.16,12), mechanismMat);
  hub.rotation.z = Math.PI/2;
  hub.castShadow = true;
  g.add(hub);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.64,0.045,7,24), woodLight);
  rim.rotation.y = Math.PI/2;
  rim.castShadow = true;
  g.add(rim);
  for(let i=0;i<2;i++) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.85, 0.11), woodMid);
    arm.rotation.x = i * Math.PI/2;
    arm.castShadow = true;
    g.add(arm);
  }
  for(let i=0;i<4;i++) {
    const a = i/4*Math.PI*2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.38,0.54), woodLight);
    blade.position.set(0, Math.cos(a)*1.03, Math.sin(a)*1.03);
    blade.rotation.x = a;
    blade.castShadow = true;
    g.add(blade);
    addBeam(g, [0, Math.cos(a)*0.63, Math.sin(a)*0.63], [0, Math.cos(a)*0.91, Math.sin(a)*0.91], 0.07, woodMid);
  }
  g.position.set(side * 0.96, 0.98, 0.02);
  return g;
}
const wheelL = makePaddleWheel(-1);
const wheelR = makePaddleWheel(1);
boatGroup.add(wheelL);
boatGroup.add(wheelR);

const rudderPost = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.72,7), woodDark);
rudderPost.position.set(0,0.12,-2.00);
rudderPost.castShadow = true;
boatGroup.add(rudderPost);
const rudderBlade = new THREE.Mesh(new THREE.BoxGeometry(0.30,0.34,0.04), woodMid);
rudderBlade.position.set(0,-0.24,-2.03);
rudderBlade.castShadow = true;
boatGroup.add(rudderBlade);
const tiller = new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,0.60,7), woodLight);
tiller.position.set(0,0.48,-2.12);
tiller.rotation.x = Math.PI/2.6;
boatGroup.add(tiller);
