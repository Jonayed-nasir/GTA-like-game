import { AABBCollider } from '../types/game';

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface DynamicObstacleCircle {
  id: string;
  x: number;
  z: number;
  radius: number;
}

export interface StuntRampDef {
  id: string;
  x: number;
  z: number;
  width: number;
  length: number;
  height: number;
  yaw: number; // Direction vehicle drives UP the ramp (local +Z)
}

export class PhysicsWorld {
  private exteriorColliders: AABBCollider[] = [];
  private interiorColliders: AABBCollider[] = [];
  private stuntRamps: StuntRampDef[] = [];
  private exteriorBounds: WorldBounds = { minX: -132, maxX: 132, minZ: -124, maxZ: 108 };
  private interiorBounds: WorldBounds = { minX: -8, maxX: 8, minZ: -8, maxZ: 8 };
  private mode: 'exterior' | 'interior' = 'exterior';

  public setWorldBounds(bounds: WorldBounds): void {
    this.exteriorBounds = bounds;
  }

  public getWorldBounds(): WorldBounds {
    return this.mode === 'interior' ? this.interiorBounds : this.exteriorBounds;
  }

  public setInteriorMode(
    active: boolean,
    bounds?: WorldBounds,
    colliders?: AABBCollider[]
  ): void {
    this.mode = active ? 'interior' : 'exterior';
    if (bounds) this.interiorBounds = bounds;
    if (colliders) this.interiorColliders = colliders;
    else if (!active) this.interiorColliders = [];
  }

  public isInteriorMode(): boolean {
    return this.mode === 'interior';
  }

  public addStaticBox(
    id: string,
    cx: number,
    cz: number,
    width: number,
    depth: number,
    height = 20,
    tag: AABBCollider['tag'] = 'building'
  ): void {
    this.exteriorColliders.push({
      id,
      minX: cx - width * 0.5,
      maxX: cx + width * 0.5,
      minZ: cz - depth * 0.5,
      maxZ: cz + depth * 0.5,
      minY: 0,
      maxY: height,
      tag,
    });
  }

  public addStuntRamp(ramp: StuntRampDef): void {
    this.stuntRamps.push(ramp);
  }

  public getStuntRamps(): StuntRampDef[] {
    return this.stuntRamps;
  }

  public clear(): void {
    this.exteriorColliders = [];
    this.interiorColliders = [];
    this.stuntRamps = [];
  }

  private getActiveColliders(): AABBCollider[] {
    return this.mode === 'interior' ? this.interiorColliders : this.exteriorColliders;
  }

  /**
   * Resolves a 2D circle against active static AABB colliders and active bounds.
   * Mutates `out` in place (zero allocations). Returns true if a collision occurred.
   */
  public resolveCircleStatic(
    x: number,
    z: number,
    radius: number,
    out: { x: number; z: number }
  ): boolean {
    let rx = x;
    let rz = z;
    let collided = false;
    const bounds = this.getWorldBounds();

    if (rx - radius < bounds.minX) {
      rx = bounds.minX + radius;
      collided = true;
    } else if (rx + radius > bounds.maxX) {
      rx = bounds.maxX - radius;
      collided = true;
    }
    if (rz - radius < bounds.minZ) {
      rz = bounds.minZ + radius;
      collided = true;
    } else if (rz + radius > bounds.maxZ) {
      rz = bounds.maxZ - radius;
      collided = true;
    }

    const rSq = radius * radius;
    const colliders = this.getActiveColliders();
    const len = colliders.length;
    for (let i = 0; i < len; i++) {
      const box = colliders[i];
      if (
        rx + radius < box.minX ||
        rx - radius > box.maxX ||
        rz + radius < box.minZ ||
        rz - radius > box.maxZ
      ) {
        continue;
      }

      const closestX = Math.max(box.minX, Math.min(rx, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(rz, box.maxZ));
      const dx = rx - closestX;
      const dz = rz - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < rSq) {
        collided = true;
        if (distSq > 0.00001) {
          const dist = Math.sqrt(distSq);
          const overlap = radius - dist;
          rx += (dx / dist) * overlap;
          rz += (dz / dist) * overlap;
        } else {
          const penLeft = Math.abs(rx - box.minX);
          const penRight = Math.abs(box.maxX - rx);
          const penTop = Math.abs(rz - box.minZ);
          const penBottom = Math.abs(box.maxZ - rz);
          const minPen = Math.min(penLeft, penRight, penTop, penBottom);
          if (minPen === penLeft) rx = box.minX - radius;
          else if (minPen === penRight) rx = box.maxX + radius;
          else if (minPen === penTop) rz = box.minZ - radius;
          else rz = box.maxZ + radius;
        }
      }
    }

    out.x = rx;
    out.z = rz;
    return collided;
  }

  /**
   * Resolves a circle against dynamic obstacle circles (parked/traffic vehicles).
   * Prevents player or vehicles from phasing through each other!
   */
  public resolveCircleDynamic(
    x: number,
    z: number,
    radius: number,
    obstacles: DynamicObstacleCircle[],
    ignoreId: string | null,
    out: { x: number; z: number }
  ): boolean {
    let rx = x;
    let rz = z;
    let hit = false;

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (ignoreId && obs.id === ignoreId) continue;
      const minDist = radius + obs.radius;
      const dx = rx - obs.x;
      const dz = rz - obs.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < minDist * minDist) {
        hit = true;
        if (dSq > 0.0001) {
          const d = Math.sqrt(dSq);
          const push = minDist - d;
          rx += (dx / d) * push;
          rz += (dz / d) * push;
        } else {
          rx += minDist;
        }
      }
    }

    out.x = rx;
    out.z = rz;
    return hit;
  }

  /**
   * Zero-allocation segment-vs-AABB raycast from target (vehicle/player) to desired camera position.
   * Returns fraction in [0.22, 1.0] to pull camera cleanly in front of buildings so it never clips.
   */
  public raycastCameraFraction(
    ox: number,
    oy: number,
    oz: number,
    tx: number,
    ty: number,
    tz: number,
    padding = 0.42
  ): number {
    const dx = tx - ox;
    const dy = ty - oy;
    const dz = tz - oz;
    const lenSq = dx * dx + dy * dy + dz * dz;
    if (lenSq < 0.0001) return 1.0;

    const invDx = Math.abs(dx) > 1e-6 ? 1 / dx : 1e9;
    const invDy = Math.abs(dy) > 1e-6 ? 1 / dy : 1e9;
    const invDz = Math.abs(dz) > 1e-6 ? 1 / dz : 1e9;

    let bestT = 1.0;
    const colliders = this.getActiveColliders();
    for (let i = 0; i < colliders.length; i++) {
      const box = colliders[i];
      if (box.tag === 'water' || box.tag === 'boundary') continue;

      const minX = box.minX - padding;
      const maxX = box.maxX + padding;
      const minY = box.minY - 0.1;
      const maxY = box.maxY + padding;
      const minZ = box.minZ - padding;
      const maxZ = box.maxZ + padding;

      const t1 = (minX - ox) * invDx;
      const t2 = (maxX - ox) * invDx;
      const t3 = (minY - oy) * invDy;
      const t4 = (maxY - oy) * invDy;
      const t5 = (minZ - oz) * invDz;
      const t6 = (maxZ - oz) * invDz;

      const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4), Math.min(t5, t6));
      const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4), Math.max(t5, t6));

      if (tmax >= 0 && tmin <= tmax && tmin >= 0.05 && tmin < bestT) {
        bestT = tmin;
      }
    }
    return Math.max(0.24, Math.min(1.0, bestT));
  }

  /**
   * Finds a safe non-colliding exit spot around a vehicle (left -> right -> back -> front)
   * fixing the Phase 1 bug where exiting next to a wall could wedge the player.
   */
  public findClearExitPoint(
    vx: number,
    vz: number,
    vyaw: number,
    vehicleHalfW: number,
    vehicleHalfL: number,
    playerRadius = 0.55
  ): { x: number; z: number } {
    const cosY = Math.cos(vyaw);
    const sinY = Math.sin(vyaw);
    const sideDist = vehicleHalfW + playerRadius + 0.45;
    const endDist = vehicleHalfL + playerRadius + 0.55;

    const candidates = [
      // Driver left side
      { x: vx - cosY * sideDist, z: vz + sinY * sideDist },
      // Passenger right side
      { x: vx + cosY * sideDist, z: vz - sinY * sideDist },
      // Rear of vehicle
      { x: vx - sinY * endDist, z: vz - cosY * endDist },
      // Front of vehicle
      { x: vx + sinY * endDist, z: vz + cosY * endDist },
    ];

    const probe = { x: 0, z: 0 };
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const hit = this.resolveCircleStatic(c.x, c.z, playerRadius, probe);
      if (!hit) return c;
    }
    this.resolveCircleStatic(candidates[0].x, candidates[0].z, playerRadius, probe);
    return probe;
  }

  /**
   * Driving Assist low-speed obstacle detector: checks if a static building or obstacle
   * lies immediately ahead within `lookDist` meters.
   */
  public hasStaticObstacleAhead(
    x: number,
    z: number,
    yaw: number,
    lookDist: number,
    radius: number
  ): boolean {
    const px = x + Math.sin(yaw) * lookDist;
    const pz = z + Math.cos(yaw) * lookDist;
    const probe = { x: 0, z: 0 };
    return this.resolveCircleStatic(px, pz, radius * 0.72, probe);
  }

  /**
   * Returns ground elevation including Hatirjheel arched bridge AND 3D Stunt Ramps.
   */
  public getGroundHeightAt(x: number, z: number): number {
    if (this.mode === 'interior') return 0;
    let h = 0;

    // Hatirjheel arched bridge spans X from -44 to +44 along Z around 75..102
    if (z >= 75 && z <= 102 && Math.abs(x) <= 44) {
      const t = Math.max(0, 1 - Math.abs(x) / 44);
      const arch = Math.sin(t * Math.PI * 0.5);
      h = arch * arch * 2.1;
    }

    // Check oriented 3D Stunt Ramps
    for (let i = 0; i < this.stuntRamps.length; i++) {
      const r = this.stuntRamps[i];
      const dx = x - r.x;
      const dz = z - r.z;
      const cosY = Math.cos(r.yaw);
      const sinY = Math.sin(r.yaw);
      // Forward along ramp = (sinY, cosY), Right = (cosY, -sinY)
      const localForward = dx * sinY + dz * cosY;
      const localRight = dx * cosY - dz * sinY;
      const halfL = r.length * 0.5;
      const halfW = r.width * 0.5;
      if (Math.abs(localRight) <= halfW && localForward >= -halfL && localForward <= halfL) {
        const progress = (localForward + halfL) / r.length; // 0 at base -> 1 at lip
        const rampH = progress * r.height;
        if (rampH > h) h = rampH;
      }
    }

    return h;
  }

  /**
   * Detects when a fast vehicle crests the high lip of a stunt ramp and returns
   * upward launch velocity (m/s) for cinematic GTA 5 Stunt Jumps!
   */
  public getRampLipVelocity(x: number, z: number, vehYaw: number, speed: number): number {
    if (this.mode === 'interior' || speed < 10.5) return 0;
    const vx = Math.sin(vehYaw);
    const vz = Math.cos(vehYaw);

    for (let i = 0; i < this.stuntRamps.length; i++) {
      const r = this.stuntRamps[i];
      const cosY = Math.cos(r.yaw);
      const sinY = Math.sin(r.yaw);
      // Ensure vehicle is driving UP the ramp (dot > 0.45)
      const align = vx * sinY + vz * cosY;
      if (align < 0.45) continue;

      const dx = x - r.x;
      const dz = z - r.z;
      const localForward = dx * sinY + dz * cosY;
      const localRight = dx * cosY - dz * sinY;
      const halfL = r.length * 0.5;
      const halfW = r.width * 0.52;

      if (
        Math.abs(localRight) <= halfW &&
        localForward >= halfL * 0.58 &&
        localForward <= halfL + 1.15
      ) {
        const slopeRatio = r.height / Math.max(1, r.length);
        return Math.min(18.5, Math.max(8.2, speed * slopeRatio * 1.48));
      }
    }
    return 0;
  }
}
