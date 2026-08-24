// Feintuning für die mobile Museums-Version.
// 1) Handy nach rechts neigen = Boot fährt nach rechts.
// 2) Lenkung deutlich empfindlicher / kleinerer Wendekreis.
// 3) Die drei Fischziele liegen weiter auseinander.
// 4) HTML-Fischmarker werden perspektivisch kleiner, je weiter sie entfernt sind.

// Fischroute weiter über die Spielwelt verteilen.
const tunedFishPositions = [
  { x: 0, z: 12 },
  { x: 22, z: 34 },
  { x: -26, z: 62 }
];

tunedFishPositions.forEach((p, i) => {
  if (fishTargets[i]) fishTargets[i].group.position.set(p.x, 0, p.z);
});

// game.js schreibt den normierten Handy-Neigungswert in gs.tilt.
// Über einen Getter/Setter drehen wir die Richtung um und verstärken
// die Wirkung, ohne die übrige Fahrphysik anzutasten.
let tunedTilt = Number(gs.tilt) || 0;
Object.defineProperty(gs, 'tilt', {
  configurable: true,
  enumerable: true,
  get() {
    return tunedTilt;
  },
  set(rawTilt) {
    const raw = Number(rawTilt) || 0;
    tunedTilt = Math.max(-2.2, Math.min(2.2, -raw * 2.2));
  }
});

// Perspektivische Größe für die HTML-Fische.
// Da das Emoji kein echtes 3D-Objekt mehr ist, würde es sonst in Pixeln immer gleich groß bleiben
// und dadurch in der Ferne riesig wirken. Wir skalieren es deshalb mit der Entfernung zur Kamera.
updateHtmlFishMarkers = function(time) {
  camera.updateMatrixWorld();
  const rect = renderer.domElement.getBoundingClientRect();
  const worldPos = new THREE.Vector3();

  fishTargets.forEach((target, i) => {
    const el = target.htmlFish;
    if (!el) return;

    if (target.collected || !target.group.visible) {
      el.style.display = 'none';
      return;
    }

    const bob = 1.55 + Math.sin(time * 2.2 + i) * 0.12;
    worldPos.set(
      target.group.position.x,
      target.group.position.y + bob,
      target.group.position.z
    );

    // Entfernung für die perspektivische Größe VOR der Projektion merken.
    const distance = camera.position.distanceTo(worldPos);
    const scale = Math.max(0.28, Math.min(1.0, 11.5 / distance));

    fishScreenPos.copy(worldPos).project(camera);

    const onScreen = fishScreenPos.z > -1 && fishScreenPos.z < 1 &&
                     fishScreenPos.x > -1.15 && fishScreenPos.x < 1.15 &&
                     fishScreenPos.y > -1.15 && fishScreenPos.y < 1.15;

    if (!onScreen) {
      el.style.display = 'none';
      return;
    }

    const screenX = rect.left + (fishScreenPos.x + 1) * 0.5 * rect.width;
    const screenY = rect.top + (1 - fishScreenPos.y) * 0.5 * rect.height;

    el.style.left = `${screenX}px`;
    el.style.top = `${screenY}px`;
    el.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(3)})`;
    el.style.display = 'block';
  });
};
