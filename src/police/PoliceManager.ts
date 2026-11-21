import * as THREE from 'three';
import { DynamicObstacleCircle, PhysicsWorld } from '../core/PhysicsWorld';
import { createVehicleMesh, VehicleRig } from '../vehicles/VehicleFactory';

import { ShootableTarget } from '../combat/CombatSystem';

interface PoliceUnit {
  id: string;
  rig: VehicleRig;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  knockVx: number;
  knockVz: number;
  knockYawVel: number;
  wheelSpin: number;
  health: number;
  active: boolean;
  searchAngle: number;
}

const _resolved = { x: 0, z: 0 };
const VISION_RANGE = 38.0;
const VISION_HALF_ANGLE = 0.87; // ~50 degrees half-angle (100° cone)
const VISION_HALF_COS = Math.cos(VISION_HALF_ANGLE);

/**
 * GTA 5-style Dhaka Police System:
 * - Major crimes immediately alert DMP units; minor fender-benders only build Crime Heat (which cools naturally).
 * - Active cruisers use a 38m / 100° forward Vision Cone to spot the player (flying >11m high breaks line of sight!).
 * - Breaking line-of-sight switches police into SEARCH MODE patrolling your Last Known Position; stay unseen for 8s to escape!
 */
export class PoliceManager {
  public readonly group = new THREE.Group();
  public wantedLevel = 0; // 0..5
  public evading = false; // true = GTA 5 Search Mode (flashing stars)
  public evadeProgress = 0; // 0..1
  public crimeHeat = 0; // 0..100 threshold before 1-star triggers on minor offenses

  private units: PoliceUnit[] = [];
  private sirenTimer = 0;
  private evadeTimer = 0;
  private readonly evadeDurationSec = 8.0;
  private nightFactor = 0;
  private lastKnownX = 0;
  private lastKnownZ = 0;
  private obstacleBuf: DynamicObstacleCircle[] = [];
  private miniMapBuf: Array<{
    x: number;
    z: number;
    yaw: number;
    chasing: boolean;
    searching: boolean;
    visionRange: number;
    visionHalfAngle: number;
  }> = [];

  // Ambient patrol loop & mission police backup support mode
  private patrolWaypointIdx = 0;
  private readonly patrolLoop: Array<[number, number]> = [
    [60, -60],
    [60, 60],
    [-60, 60],
    [-60, -60],
  ];
  private supportZone: { active: boolean; x: number; z: number } = { active: false, x: 0, z: 0 };

  constructor(shadowTex: THREE.Texture) {
    // Pre-allocate pool of 3 Dhaka Metropolitan Police Patrol Cruisers (zero runtime GC!)
    for (let i = 0; i < 3; i++) {
      const rig = createVehicleMesh('police', 0xf8fafc, shadowTex);
      rig.root.visible = false;
      this.group.add(rig.root);
      this.units.push({
        id: `police_${i}`,
        rig,
        x: 60,
        y: 0,
        z: -60,
        yaw: 0,
        speed: 0,
        knockVx: 0,
        knockVz: 0,
        knockYawVel: 0,
        wheelSpin: 0,
        health: 120,
        active: false,
        searchAngle: (i / 3) * Math.PI * 2,
      });
    }
  }

  public setNightFactor(nf: number): void {
    this.nightFactor = nf;
  }

  public setSupportZone(active: boolean, x = 0, z = 0): void {
    this.supportZone = { active, x, z };
  }

  /**
   * GTA 5 Crime Heat:
   * - Minor offenses (small collisions, stray shots) add heat (30..45). Police only respond once heat hits 100!
   * - Major crimes (Bank Heist, Shop Robbery, Explosions, Attacking Police) immediately add wanted stars.
   */
  public addCrimeHeat(amount: number, majorCrime = false, maxCap = 3): boolean {
    if (majorCrime) {
      const stars = amount >= 160 ? 2 : 1;
      const before = this.wantedLevel;
      this.addWantedStars(stars, maxCap);
      return this.wantedLevel > before;
    }
    this.crimeHeat = Math.min(100, this.crimeHeat + amount);
    if (this.crimeHeat >= 100) {
      this.crimeHeat = 0;
      const before = this.wantedLevel;
      this.addWantedStars(1, maxCap);
      return this.wantedLevel > before;
    }
    return false;
  }

  public addWantedStars(delta: number, maxCap = 5): void {
    const next = Math.min(maxCap, Math.max(this.wantedLevel, this.wantedLevel + delta));
    if (next > this.wantedLevel) {
      this.wantedLevel = next;
      this.crimeHeat = 0;
      this.evadeTimer = 0;
      this.evadeProgress = 0;
      this.evading = false;
    }
  }

  public setWantedLevel(level: number, playerX: number, playerZ: number): void {
    this.wantedLevel = Math.max(0, Math.min(5, level));
    this.crimeHeat = 0;
    this.evadeTimer = 0;
    this.evadeProgress = 0;
    this.evading = false;
    this.lastKnownX = playerX;
    this.lastKnownZ = playerZ;
    if (this.wantedLevel === 0) {
      this.despawnAll();
    } else {
      this.ensureActiveUnits(playerX, playerZ);
    }
  }

  public clearWanted(): void {
    this.wantedLevel = 0;
    this.crimeHeat = 0;
    this.evading = false;
    this.evadeTimer = 0;
    this.evadeProgress = 0;
    this.despawnAll();
  }

  private despawnAll(): void {
    for (let i = 0; i < this.units.length; i++) {
      this.units[i].active = false;
      this.units[i].rig.root.visible = false;
      this.units[i].speed = 0;
    }
  }

  private ensureActiveUnits(playerX: number, playerZ: number): void {
    const desired = Math.min(this.units.length, Math.max(1, Math.min(3, this.wantedLevel)));
    const spawnPoints: Array<[number, number]> = [
      [60, -60],
      [-60, 60],
      [-60, -60],
      [60, 60],
    ];

    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      if (i < desired && !u.active) {
        // Spawn well away (> 52m) from the player so chases always give room to outmaneuver!
        let best = spawnPoints[i % spawnPoints.length];
        let bestDist = 0;
        for (const sp of spawnPoints) {
          const d = Math.hypot(sp[0] - playerX, sp[1] - playerZ);
          if (d > 52 && d > bestDist) {
            bestDist = d;
            best = sp;
          }
        }
        u.x = best[0];
        u.z = best[1];
        u.y = 0;
        u.yaw = Math.atan2(playerX - u.x, playerZ - u.z);
        u.speed = 6.5;
        u.health = 120;
        u.active = true;
        u.rig.root.visible = true;
        u.rig.root.position.set(u.x, u.y, u.z);
        u.rig.root.rotation.y = u.yaw;
      } else if (i >= desired && u.active) {
        u.active = false;
        u.rig.root.visible = false;
      }
    }
  }

  public getObstacleCircles(): DynamicObstacleCircle[] {
    const res = this.obstacleBuf;
    res.length = 0;
    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      if (!u.active) continue;
      res.push({ id: u.id, x: u.x, z: u.z, radius: u.rig.radius * 0.85 });
    }
    return res;
  }

  public getShootableTargets(): ShootableTarget[] {
    const out: ShootableTarget[] = [];
    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      if (!u.active || !u.rig.root.visible) continue;
      out.push({
        kind: 'police',
        id: u.id,
        x: u.x,
        y: u.y,
        z: u.z,
        radius: 1.55,
        height: 1.75,
      });
    }
    return out;
  }

  public damagePoliceUnit(
    unitId: string,
    damage: number
  ): { destroyed: boolean; x: number; y: number; z: number } {
    const u = this.units.find((it) => it.id === unitId && it.active);
    if (!u) return { destroyed: false, x: 0, y: 0, z: 0 };
    const { x, y, z } = u;
    u.health -= damage;
    if (u.health <= 0) {
      u.active = false;
      u.rig.root.visible = false;
      u.speed = 0;
      u.health = 120;
      return { destroyed: true, x, y, z };
    }
    return { destroyed: false, x, y, z };
  }

  public ramPoliceUnit(
    unitId: string,
    impulseX: number,
    impulseZ: number,
    damage: number
  ): { hit: boolean; destroyed: boolean; x: number; y: number; z: number } {
    const u = this.units.find((it) => it.id === unitId && it.active);
    if (!u) return { hit: false, destroyed: false, x: 0, y: 0, z: 0 };
    u.knockVx += impulseX * 0.95;
    u.knockVz += impulseZ * 0.95;
    u.knockYawVel += (Math.random() > 0.5 ? 1 : -1) * (2.5 + Math.random() * 2.2);
    u.speed *= 0.22;
    const res = this.damagePoliceUnit(unitId, damage);
    return { hit: true, ...res };
  }

  public getMiniMapPositions(): Array<{
    x: number;
    z: number;
    yaw: number;
    chasing: boolean;
    searching: boolean;
    visionRange: number;
    visionHalfAngle: number;
  }> {
    const res = this.miniMapBuf;
    res.length = 0;
    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      if (!u.active) continue;
      res.push({
        x: u.x,
        z: u.z,
        yaw: u.yaw,
        chasing: this.wantedLevel > 0 && !this.evading,
        searching: this.wantedLevel > 0 && this.evading,
        visionRange: VISION_RANGE,
        visionHalfAngle: VISION_HALF_ANGLE,
      });
    }
    return res;
  }

  private isPlayerInVisionCone(u: PoliceUnit, px: number, pz: number, py: number): boolean {
    // High-altitude helicopter flights (>11m) easily break ground cruiser vision!
    if (py > 11.0) return false;
    const dx = px - u.x;
    const dz = pz - u.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 13.5) return true; // Immediate close proximity detection
    if (dist > VISION_RANGE) return false;
    const fwdX = Math.sin(u.yaw);
    const fwdZ = Math.cos(u.yaw);
    const dot = (dx / dist) * fwdX + (dz / dist) * fwdZ;
    return dot >= VISION_HALF_COS;
  }

  /**
   * Returns nearest active police distance for audio siren attenuation and whether stars just cleared.
   */
  public update(
    dt: number,
    playerX: number,
    playerZ: number,
    playerY: number,
    insideBuilding: boolean,
    physics: PhysicsWorld
  ): { nearestDist: number; justCleared: boolean } {
    this.sirenTimer += dt;
    const flash = Math.floor(this.sirenTimer * 9) % 2 === 0;

    // Natural Crime Heat cooldown when no stars are active
    if (this.crimeHeat > 0) {
      this.crimeHeat = Math.max(0, this.crimeHeat - 15 * dt);
    }

    if (this.wantedLevel <= 0) {
      // Keep 1 ambient DMP patrol cruiser cruising the perimeter or providing mission backup
      const patrolUnit = this.units[0];
      if (!insideBuilding && patrolUnit) {
        if (!patrolUnit.active) {
          patrolUnit.active = true;
          patrolUnit.x = 60;
          patrolUnit.z = -56;
          patrolUnit.yaw = 0;
          patrolUnit.speed = 8;
          patrolUnit.rig.root.visible = true;
        }
        for (let i = 1; i < this.units.length; i++) {
          this.units[i].active = false;
          this.units[i].rig.root.visible = false;
        }

        const targetX = this.supportZone.active
          ? this.supportZone.x
          : this.patrolLoop[this.patrolWaypointIdx][0];
        const targetZ = this.supportZone.active
          ? this.supportZone.z
          : this.patrolLoop[this.patrolWaypointIdx][1];

        const dx = targetX - patrolUnit.x;
        const dz = targetZ - patrolUnit.z;
        const dist = Math.hypot(dx, dz);

        if (!this.supportZone.active && dist < 8) {
          this.patrolWaypointIdx = (this.patrolWaypointIdx + 1) % this.patrolLoop.length;
        }

        const desiredSpd = this.supportZone.active ? (dist > 14 ? 13.5 : 0) : 9.2;
        patrolUnit.speed = THREE.MathUtils.damp(patrolUnit.speed, desiredSpd, 3.5, dt);
        const targetYaw = Math.atan2(dx, dz);
        let diff = targetYaw - patrolUnit.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        patrolUnit.yaw += THREE.MathUtils.clamp(diff, -2.0 * dt, 2.0 * dt);

        const nx = patrolUnit.x + Math.sin(patrolUnit.yaw) * patrolUnit.speed * dt;
        const nz = patrolUnit.z + Math.cos(patrolUnit.yaw) * patrolUnit.speed * dt;
        physics.resolveCircleStatic(nx, nz, patrolUnit.rig.radius * 0.85, _resolved);
        patrolUnit.x = _resolved.x;
        patrolUnit.z = _resolved.z;
        patrolUnit.y = physics.getGroundHeightAt(patrolUnit.x, patrolUnit.z);
        patrolUnit.rig.root.position.set(patrolUnit.x, patrolUnit.y, patrolUnit.z);
        patrolUnit.rig.root.rotation.y = patrolUnit.yaw;

        patrolUnit.wheelSpin += (patrolUnit.speed * dt) / 0.35;
        for (let w = 0; w < patrolUnit.rig.wheels.length; w++) {
          patrolUnit.rig.wheels[w].rotation.x = patrolUnit.wheelSpin;
        }
        if (patrolUnit.rig.sirenRedMat && patrolUnit.rig.sirenBlueMat) {
          patrolUnit.rig.sirenRedMat.emissiveIntensity = this.supportZone.active && flash ? 3.8 : 0.25;
          patrolUnit.rig.sirenBlueMat.emissiveIntensity = this.supportZone.active && !flash ? 3.8 : 0.25;
        }
        patrolUnit.rig.headlightMat.emissiveIntensity = THREE.MathUtils.lerp(0.8, 2.8, this.nightFactor);
      }
      return { nearestDist: 999, justCleared: false };
    }

    // Hiding inside a Safe House / building clears stars rapidly (4s)!
    if (insideBuilding) {
      this.evading = true;
      this.evadeTimer += dt * 2.1;
      this.evadeProgress = Math.min(1, this.evadeTimer / this.evadeDurationSec);
      if (this.evadeTimer >= this.evadeDurationSec) {
        this.clearWanted();
        return { nearestDist: 999, justCleared: true };
      }
      return { nearestDist: 80, justCleared: false };
    }

    this.ensureActiveUnits(playerX, playerZ);

    // Step 1: Check GTA 5 Vision-Cone spotting across all active police cruisers
    let spottedByAny = false;
    let nearestDist = 999;

    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      if (!u.active) continue;
      const dist = Math.hypot(playerX - u.x, playerZ - u.z);
      if (dist < nearestDist) nearestDist = dist;
      if (this.isPlayerInVisionCone(u, playerX, playerZ, playerY)) {
        spottedByAny = true;
      }
    }

    if (spottedByAny) {
      this.lastKnownX = playerX;
      this.lastKnownZ = playerZ;
      this.evading = false;
      this.evadeTimer = Math.max(0, this.evadeTimer - dt * 1.8);
      this.evadeProgress = Math.min(1, this.evadeTimer / this.evadeDurationSec);
    } else {
      // Unseen -> GTA 5 SEARCH MODE! Stars flash & clear cleanly in 8 seconds!
      this.evading = true;
      this.evadeTimer += dt;
      this.evadeProgress = Math.min(1, this.evadeTimer / this.evadeDurationSec);
      if (this.evadeTimer >= this.evadeDurationSec) {
        this.clearWanted();
        return { nearestDist: 999, justCleared: true };
      }
    }

    // Step 2: Drive active cruisers toward spotted player OR sweep around Last Known Position
    // Fair escapable chase speed: sports cars, bikes, boats & helicopters easily outrun them!
    const maxChaseSpeed = 11.8 + this.wantedLevel * 1.45;
    const searchSpeed = 9.2;

    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      if (!u.active) continue;

      let goalX = this.lastKnownX;
      let goalZ = this.lastKnownZ;
      if (this.evading) {
        u.searchAngle += dt * 0.48 * (i % 2 === 0 ? 1 : -1);
        const patrolRadius = 18 + i * 7;
        goalX = THREE.MathUtils.clamp(
          this.lastKnownX + Math.cos(u.searchAngle) * patrolRadius,
          -116,
          116
        );
        goalZ = THREE.MathUtils.clamp(
          this.lastKnownZ + Math.sin(u.searchAngle) * patrolRadius,
          -110,
          64
        );
      }

      const dx = goalX - u.x;
      const dz = goalZ - u.z;
      const dist = Math.hypot(dx, dz);

      const targetYaw = Math.atan2(dx, dz);
      let diff = targetYaw - u.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      u.yaw += THREE.MathUtils.clamp(diff, -2.0 * dt, 2.0 * dt);

      const desiredSpeed = this.evading
        ? searchSpeed
        : dist > 9.5
          ? maxChaseSpeed
          : dist > 5.8
            ? 6.5
            : 0;
      u.speed = THREE.MathUtils.damp(u.speed, desiredSpeed, 4.2, dt);

      u.yaw += u.knockYawVel * dt;
      u.knockVx *= Math.exp(-3.5 * dt);
      u.knockVz *= Math.exp(-3.5 * dt);
      u.knockYawVel *= Math.exp(-4.2 * dt);

      const nx = u.x + (Math.sin(u.yaw) * u.speed + u.knockVx) * dt;
      const nz = u.z + (Math.cos(u.yaw) * u.speed + u.knockVz) * dt;
      const hit = physics.resolveCircleStatic(nx, nz, u.rig.radius * 0.88, _resolved);
      u.x = _resolved.x;
      u.z = _resolved.z;
      if (hit) {
        u.yaw += 0.95 * dt * (i % 2 === 0 ? 1 : -1);
        u.speed *= 0.45;
        u.knockVx *= -0.3;
        u.knockVz *= -0.3;
      }

      u.y = physics.getGroundHeightAt(u.x, u.z);
      u.rig.root.position.set(u.x, u.y, u.z);
      u.rig.root.rotation.y = u.yaw;
      u.rig.bodyGroup.rotation.z = u.health < 65 ? ((65 - u.health) / 65) * 0.14 : 0;

      u.wheelSpin += (u.speed * dt) / 0.35;
      for (let w = 0; w < u.rig.wheels.length; w++) {
        u.rig.wheels[w].rotation.x = u.wheelSpin;
      }

      if (u.rig.sirenRedMat && u.rig.sirenBlueMat) {
        u.rig.sirenRedMat.emissiveIntensity = flash ? 4.2 : 0.15;
        u.rig.sirenBlueMat.emissiveIntensity = flash ? 0.15 : 4.2;
      }
      u.rig.headlightMat.emissiveIntensity = THREE.MathUtils.lerp(0.9, 3.0, this.nightFactor);
    }

    return { nearestDist, justCleared: false };
  }
}
