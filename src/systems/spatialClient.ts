import {
  computeSpatialAndClothStep,
  type SpatialEnemyInput,
  type SpatialWorkerRequest,
  type SpatialWorkerResponse,
} from '../workers/ikPhysicsWorker';

export class SpatialPhysicsClient {
  private worker: Worker | null = null;
  private seq = 0;
  private latest: SpatialWorkerResponse = {
    seq: 0,
    sortedEnemyIds: [],
    cloakFlutter: 0.05,
    cloakBackLag: 0.14,
    cloakSideSwing: 0,
    windGust: 0.5,
  };

  constructor() {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(
          new URL('../workers/ikPhysicsWorker.ts', import.meta.url),
          {type: 'module'},
        );
        this.worker.onmessage = (e: MessageEvent<SpatialWorkerResponse>) => {
          if (e.data && e.data.seq >= this.latest.seq) {
            this.latest = e.data;
          }
        };
        this.worker.onerror = () => {
          this.worker?.terminate();
          this.worker = null;
        };
      } catch {
        this.worker = null;
      }
    }
  }

  dispatch(
    elapsed: number,
    heroX: number,
    heroZ: number,
    heroVx: number,
    heroVz: number,
    heroYaw: number,
    enemies: SpatialEnemyInput[],
  ): SpatialWorkerResponse {
    const req: SpatialWorkerRequest = {
      seq: ++this.seq,
      elapsed,
      heroX,
      heroZ,
      heroVx,
      heroVz,
      heroYaw,
      enemies,
    };
    if (this.worker) {
      this.worker.postMessage(req);
      return this.latest;
    }
    this.latest = computeSpatialAndClothStep(req);
    return this.latest;
  }

  getLatest(): SpatialWorkerResponse {
    return this.latest;
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
