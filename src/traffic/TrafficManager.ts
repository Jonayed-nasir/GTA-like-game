import * as THREE from 'three';
import { DynamicObstacleCircle } from '../core/PhysicsWorld';
import { VehicleKind } from '../types/game';
import { ROAD_COORDS, RoadLane, RoadSystem } from '../world/RoadSystem';
import { createVehicleMesh, VehicleRig } from '../vehicles/VehicleFactory';
import { getVehicleSpecForKind } from '../vehicles/VehicleManager';

import { ShootableTarget } from '../combat/CombatSystem';

export interface TrafficAgent {
  id: string;
  kind: VehicleKind;
  paintHex: number;
  rig: VehicleRig;
  lane: RoadLane;
  pos: number;
  speed: number;
  baseSpeed: number;
  wheelSpin: number;
  health: number;
  active: boolean;
  respawnCooldown: number;
  knockVx: number;
  knockVz: number;
  knockYawVel: number;
  knockOffsetX: number;
  knockOffsetZ: number;
  knockYaw: number;
  stunTimer: number;
}

export class TrafficManager {
  public readonly group = new THREE.Group();
  private agents: TrafficAgent[] = [];
  private density = 0.75;
  private nightFactor = 0;

  constructor(roadSystem: RoadSystem, shadowTex: THREE.Texture) {
    const palette: Array<{ kind: VehicleKind; color: number; speed: number }> = [
      { kind: 'cng', color: 0x16a34a, speed: 9.2 },
      { kind: 'motorcycle', color: 0x0ea5e9, speed: 12.2 },
      { kind: 'bus', color: 0xb91c1c, speed: 7.4 },
      { kind: 'sedan', color: 0xf1f5f9, speed: 11.4 },
      { kind: 'suv', color: 0x1e293b, speed: 10.6 },
      { kind: 'pickup', color: 0xd97706, speed: 10.2 },
      { kind: 'cng', color: 0x15803d, speed: 8.8 },
      { kind: 'truck', color: 0x0369a1, speed: 7.6 },
      { kind: 'bus', color: 0x047857, speed: 7.2 },
      { kind: 'sedan', color: 0x334155, speed: 10.8 },
      { kind: 'sports', color: 0xf59e0b, speed: 13.0 },
      { kind: 'suv', color: 0x475569, speed: 10.4 },
      { kind: 'motorcycle', color: 0xdc2626, speed: 12.5 },
      { kind: 'sedan', color: 0x2563eb, speed: 11.2 },
      { kind: 'cng', color: 0x16a34a, speed: 9.0 },
      { kind: 'pickup', color: 0x0f766e, speed: 10.0 },
    ];

    const lanes = roadSystem.lanes;
    for (let i = 0; i < palette.length; i++) {
      const lane = lanes[i % lanes.length];
      const spec = palette[i];
      const rig = createVehicleMesh(spec.kind, spec.color, shadowTex);

      const span = lane.max - lane.min;
      const pos = lane.min + ((i * 31) % Math.floor(span));
      this.placeAgent(rig.root, lane, pos);
      this.group.add(rig.root);

      this.agents.push({
        id: `traffic_${i}`,
        kind: spec.kind,
        paintHex: spec.color,
        rig,
        lane,
        pos,
        speed: spec.speed * 0.5,
        baseSpeed: spec.speed,
        wheelSpin: 0,
        health: 85,
        active: true,
        respawnCooldown: 0,
        knockVx: 0,
        knockVz: 0,
        knockYawVel: 0,
        knockOffsetX: 0,
        knockOffsetZ: 0,
        knockYaw: 0,
        stunTimer: 0,
      });
    }
    this.setDensity(this.density);
  }

  private placeAgent(root: THREE.Group, lane: RoadLane, pos: number): void {
    if (lane.axis === 'z') {
      root.position.set(lane.fixedCoord, 0, pos);
      root.rotation.y = lane.direction === 1 ? 0 : Math.PI;
    } else {
      root.position.set(pos, 0, lane.fixedCoord);
      root.rotation.y = lane.direction === 1 ? Math.PI * 0.5 : -Math.PI * 0.5;
    }
  }

  public setDensity(density: number): void {
    this.density = THREE.MathUtils.clamp(density, 0.25, 1.0);
    const activeCount = Math.max(5, Math.round(this.agents.length * this.density));
    for (let i = 0; i < this.agents.length; i++) {
      const active = i < activeCount && this.agents[i].respawnCooldown <= 0;
      this.agents[i].active = active;
      this.agents[i].rig.root.visible = active;
    }
  }

  public setNightFactor(nf: number): void {
    this.nightFactor = nf;
  }

  /**
   * Finds nearest active traffic vehicle within interaction range so the player
   * can stop and enter ANY vehicle on Dhaka streets!
   */
  public findNearestTrafficVehicle(
    px: number,
    pz: number,
    maxDist = 5.4
  ): {
    agent: TrafficAgent;
    distance: number;
    nameEn: string;
    nameBn: string;
  } | null {
    let best: TrafficAgent | null = null;
    let bestDistSq = maxDist * maxDist;

    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      if (!a.active) continue;
      const dx = a.rig.root.position.x - px;
      const dz = a.rig.root.position.z - pz;
      const dSq = dx * dx + dz * dz;
      const reach = maxDist + (a.rig.length > 6 ? 1.8 : 0);
      if (dSq < Math.min(bestDistSq, reach * reach)) {
        bestDistSq = dSq;
        best = a;
      }
    }

    if (!best) return null;
    const spec = getVehicleSpecForKind(best.kind);
    return {
      agent: best,
      distance: Math.sqrt(bestDistSq),
      nameEn: spec.nameEn,
      nameBn: spec.nameBn,
    };
  }

  /**
   * Hands off a traffic vehicle to the player smoothly and puts the AI slot on respawn cooldown
   * at the district edge so no vehicle duplicates or teleports visibly.
   */
  public claimTrafficAgent(agentId: string): {
    kind: VehicleKind;
    paintHex: number;
    x: number;
    z: number;
    yaw: number;
  } | null {
    const a = this.agents.find((it) => it.id === agentId && it.active);
    if (!a) return null;
    const snapshot = {
      kind: a.kind,
      paintHex: a.paintHex,
      x: a.rig.root.position.x,
      z: a.rig.root.position.z,
      yaw: a.rig.root.rotation.y,
    };
    a.active = false;
    a.rig.root.visible = false;
    a.respawnCooldown = 18;
    a.pos = a.lane.direction === 1 ? a.lane.min : a.lane.max;
    a.speed = 0;
    return snapshot;
  }

  public getObstacleCircles(): DynamicObstacleCircle[] {
    const res: DynamicObstacleCircle[] = [];
    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      if (!a.active) continue;
      res.push({
        id: a.id,
        x: a.rig.root.position.x,
        z: a.rig.root.position.z,
        radius: a.rig.radius * 0.85,
      });
    }
    return res;
  }

  public update(
    dt: number,
    roadSystem: RoadSystem,
    playerX: number,
    playerZ: number,
    parkedObstacles: DynamicObstacleCircle[]
  ): void {
    const activeLimit = Math.max(5, Math.round(this.agents.length * this.density));

    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      if (a.respawnCooldown > 0) {
        a.respawnCooldown -= dt;
        if (a.respawnCooldown <= 0 && i < activeLimit) {
          a.active = true;
          a.health = 85;
          a.knockVx = 0;
          a.knockVz = 0;
          a.knockYawVel = 0;
          a.knockOffsetX = 0;
          a.knockOffsetZ = 0;
          a.knockYaw = 0;
          a.stunTimer = 0;
          a.rig.bodyGroup.rotation.z = 0;
          a.rig.root.visible = true;
          this.placeAgent(a.rig.root, a.lane, a.pos);
        }
        continue;
      }
      if (!a.active) continue;

      if (a.stunTimer > 0) {
        a.stunTimer = Math.max(0, a.stunTimer - dt);
      }

      let shouldStop = a.stunTimer > 0;
      const ax = a.lane.axis === 'z' ? a.lane.fixedCoord : a.pos;
      const az = a.lane.axis === 'z' ? a.pos : a.lane.fixedCoord;

      // 1. Respect traffic light signals
      if (roadSystem.isRedForLane(a.lane.axis)) {
        for (let r = 0; r < ROAD_COORDS.length; r++) {
          const cross = ROAD_COORDS[r];
          const distToCross = (cross - a.pos) * a.lane.direction;
          if (distToCross > 10.5 && distToCross < 18.0) {
            shouldStop = true;
            break;
          }
        }
      }

      // 2. Yield to player / player vehicle directly ahead OR close beside (so player can board easily!)
      if (!shouldStop) {
        const dx = playerX - ax;
        const dz = playerZ - az;
        const distSq = dx * dx + dz * dz;
        const forwardDist =
          a.lane.axis === 'z' ? dz * a.lane.direction : dx * a.lane.direction;
        const lateralDist = a.lane.axis === 'z' ? Math.abs(dx) : Math.abs(dz);
        if (
          (forwardDist > 0.8 && forwardDist < a.rig.length * 0.5 + 9.0 && lateralDist < 3.6) ||
          distSq < 22
        ) {
          shouldStop = true;
        }
      }

      // 3. Yield to parked/player-left vehicles in the lane
      if (!shouldStop) {
        for (let k = 0; k < parkedObstacles.length; k++) {
          const obs = parkedObstacles[k];
          const dx = obs.x - ax;
          const dz = obs.z - az;
          const forwardDist =
            a.lane.axis === 'z' ? dz * a.lane.direction : dx * a.lane.direction;
          const lateralDist = a.lane.axis === 'z' ? Math.abs(dx) : Math.abs(dz);
          if (
            forwardDist > 1.0 &&
            forwardDist < a.rig.length * 0.5 + obs.radius + 5.5 &&
            lateralDist < obs.radius + 1.8
          ) {
            shouldStop = true;
            break;
          }
        }
      }

      // 4. Maintain safe following gap behind other traffic vehicles
      if (!shouldStop) {
        for (let j = 0; j < this.agents.length; j++) {
          if (i === j || !this.agents[j].active) continue;
          const b = this.agents[j];
          if (b.lane.id !== a.lane.id) continue;
          const gap = (b.pos - a.pos) * a.lane.direction;
          const minGap = (a.rig.length + b.rig.length) * 0.5 + 5.2;
          if (gap > 0 && gap < minGap) {
            shouldStop = true;
            break;
          }
        }
      }

      const targetSpeed = shouldStop ? 0 : a.baseSpeed;
      a.speed = THREE.MathUtils.damp(a.speed, targetSpeed, shouldStop ? 8.2 : 3.4, dt);
      a.pos += a.speed * a.lane.direction * dt;

      if (a.lane.direction === 1 && a.pos > a.lane.max) {
        a.pos = a.lane.min;
      } else if (a.lane.direction === -1 && a.pos < a.lane.min) {
        a.pos = a.lane.max;
      }

      this.placeAgent(a.rig.root, a.lane, a.pos);

      // Integrate ramming knockback displacement & spin, then gradually steer back into lane
      if (
        Math.abs(a.knockVx) > 0.05 ||
        Math.abs(a.knockVz) > 0.05 ||
        Math.abs(a.knockYawVel) > 0.03
      ) {
        a.knockOffsetX = THREE.MathUtils.clamp(a.knockOffsetX + a.knockVx * dt, -9, 9);
        a.knockOffsetZ = THREE.MathUtils.clamp(a.knockOffsetZ + a.knockVz * dt, -9, 9);
        a.knockYaw += a.knockYawVel * dt;
        a.knockVx *= Math.exp(-3.6 * dt);
        a.knockVz *= Math.exp(-3.6 * dt);
        a.knockYawVel *= Math.exp(-4.0 * dt);
      } else if (a.stunTimer <= 0) {
        a.knockOffsetX = THREE.MathUtils.damp(a.knockOffsetX, 0, 1.8, dt);
        a.knockOffsetZ = THREE.MathUtils.damp(a.knockOffsetZ, 0, 1.8, dt);
        a.knockYaw = THREE.MathUtils.damp(a.knockYaw, 0, 2.2, dt);
      }

      a.rig.root.position.x += a.knockOffsetX;
      a.rig.root.position.z += a.knockOffsetZ;
      a.rig.root.rotation.y += a.knockYaw;
      a.rig.bodyGroup.rotation.z = a.health < 50 ? ((50 - a.health) / 50) * 0.14 : 0;

      a.wheelSpin += (a.speed * dt) / 0.36;
      for (let w = 0; w < a.rig.wheels.length; w++) {
        a.rig.wheels[w].rotation.x = a.wheelSpin;
      }

      a.rig.headlightMat.emissiveIntensity = THREE.MathUtils.lerp(0.25, 2.4, this.nightFactor);
      a.rig.brakeLightMat.emissiveIntensity = shouldStop
        ? 2.8
        : THREE.MathUtils.lerp(0.2, 0.95, this.nightFactor);
    }
  }

  public getShootableTargets(): ShootableTarget[] {
    const out: ShootableTarget[] = [];
    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      if (!a.active || !a.rig.root.visible) continue;
      out.push({
        kind: 'traffic',
        id: a.id,
        x: a.rig.root.position.x,
        y: a.rig.root.position.y,
        z: a.rig.root.position.z,
        radius: Math.max(1.2, a.rig.radius * 0.9),
        height: a.kind === 'bus' || a.kind === 'truck' ? 2.8 : 1.7,
      });
    }
    return out;
  }

  public damageTrafficAgent(
    agentId: string,
    damage: number
  ): { destroyed: boolean; x: number; y: number; z: number } {
    const a = this.agents.find((it) => it.id === agentId && it.active);
    if (!a) return { destroyed: false, x: 0, y: 0, z: 0 };
    const x = a.rig.root.position.x;
    const y = a.rig.root.position.y;
    const z = a.rig.root.position.z;
    a.health -= damage;
    a.speed = Math.max(a.speed, a.baseSpeed * 1.35); // Panicked driver hits gas!
    if (a.health <= 0) {
      a.active = false;
      a.rig.root.visible = false;
      a.respawnCooldown = 20;
      a.pos = a.lane.direction === 1 ? a.lane.min : a.lane.max;
      return { destroyed: true, x, y, z };
    }
    return { destroyed: false, x, y, z };
  }

  /**
   * Rams an AI traffic car with real impulse knockback, spinout, and explosion at 0 HP.
   */
  public ramTrafficAgent(
    agentId: string,
    impulseX: number,
    impulseZ: number,
    damage: number
  ): { hit: boolean; destroyed: boolean; x: number; y: number; z: number } {
    const a = this.agents.find((it) => it.id === agentId && it.active);
    if (!a) return { hit: false, destroyed: false, x: 0, y: 0, z: 0 };
    const massScale =
      a.kind === 'bus' || a.kind === 'truck'
        ? 0.45
        : a.kind === 'motorcycle' || a.kind === 'cng'
          ? 1.4
          : 1.0;
    a.knockVx += impulseX * massScale;
    a.knockVz += impulseZ * massScale;
    a.knockYawVel += (Math.random() > 0.5 ? 1 : -1) * (2.2 + Math.random() * 2.5) * massScale;
    a.stunTimer = 2.6;
    a.speed *= 0.2;
    const res = this.damageTrafficAgent(agentId, damage);
    return { hit: true, ...res };
  }

  public getMiniMapPositions(): Array<{ x: number; z: number; kind: VehicleKind }> {
    const res: Array<{ x: number; z: number; kind: VehicleKind }> = [];
    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      if (!a.active) continue;
      res.push({
        x: a.rig.root.position.x,
        z: a.rig.root.position.z,
        kind: a.kind,
      });
    }
    return res;
  }
}
