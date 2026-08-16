// Feintuning für die mobile Museums-Version.
// 1) Handy nach rechts neigen = Boot fährt nach rechts.
// 2) Lenkung deutlich empfindlicher / kleinerer Wendekreis.
// 3) Die drei Fischziele liegen weiter auseinander.

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
