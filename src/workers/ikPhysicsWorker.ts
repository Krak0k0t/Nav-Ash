export interface SpatialEnemyInput {
  id: string;
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  ko: boolean;
}

export interface SpatialWorkerRequest {
  seq: number;
  elapsed: number;
  heroX: number;
  heroZ: number;
  heroVx: number;
  heroVz: number;
  heroYaw: number;
  enemies: SpatialEnemyInput[];
}

export interface SpatialWorkerResponse {
  seq: number;
  sortedEnemyIds: string[];
  cloakFlutter: number;
  cloakBackLag: number;
  cloakSideSwing: number;
  windGust: number;
}

export function computeSpatialAndClothStep(req: SpatialWorkerRequest): SpatialWorkerResponse {
  const candidates: {id: string; distSq: number}[] = [];
  for (const e of req.enemies) {
    if (e.ko) continue;
    const dx = e.x - req.heroX;
    const dz = e.z - req.heroZ;
    candidates.push({id: e.id, distSq: dx * dx + dz * dz});
  }
  candidates.sort((a, b) => a.distSq - b.distSq);

  // Project hero velocity into local forward/right space for realistic cloak lag & turn swing
  const sinY = Math.sin(req.heroYaw);
  const cosY = Math.cos(req.heroYaw);
  const localForwardSpeed = req.heroVx * sinY + req.heroVz * cosY;
  const localRightSpeed = req.heroVx * cosY - req.heroVz * sinY;

  const windGust =
    0.55 +
    0.3 * Math.sin(req.elapsed * 1.45) +
    0.15 * Math.cos(req.elapsed * 3.2);
  const speedMag = Math.hypot(req.heroVx, req.heroVz);
  const cloakBackLag = Math.min(0.85, Math.max(0.06, localForwardSpeed * 0.08 + windGust * 0.14));
  const cloakSideSwing = Math.max(-0.52, Math.min(0.52, -localRightSpeed * 0.065 + Math.sin(req.elapsed * 2.1) * 0.06));
  const cloakFlutter = 0.03 + Math.min(0.28, speedMag * 0.025) + windGust * 0.05;

  return {
    seq: req.seq,
    sortedEnemyIds: candidates.map((c) => c.id),
    cloakFlutter,
    cloakBackLag,
    cloakSideSwing,
    windGust,
  };
}

if (typeof self !== 'undefined' && typeof (self as unknown as {document?: unknown}).document === 'undefined') {
  self.onmessage = (e: MessageEvent<SpatialWorkerRequest>) => {
    const out = computeSpatialAndClothStep(e.data);
    (self as unknown as {postMessage: (msg: SpatialWorkerResponse) => void}).postMessage(out);
  };
}
