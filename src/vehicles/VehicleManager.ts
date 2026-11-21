import * as THREE from 'three';
import { ShootableTarget } from '../combat/CombatSystem';
import { DynamicObstacleCircle, PhysicsWorld } from '../core/PhysicsWorld';
import { GameSettings, InputState, VehicleDomain, VehicleKind } from '../types/game';
import { createVehicleMesh, VehicleRig } from './VehicleFactory';

export interface VehicleRamHitEvent {
  hitKind: 'vehicle' | 'traffic' | 'police';
  hitId: string;
  impactSpeed: number;
  hitX: number;
  hitY: number;
  hitZ: number;
  dirX: number;
  dirZ: number;
}

export interface StuntLandedEvent {
  distanceMeters: number;
  hangSec: number;
  maxHeightMeters: number;
}

export interface DrivableVehicle {
  id: string;
  kind: VehicleKind;
  domain: VehicleDomain;
  nameEn: string;
  nameBn: string;
  rig: VehicleRig;
  x: number;
  y: number;
  z: number;
  vy: number;
  yaw: number;
  speed: number; // m/s
  knockVx: number;
  knockVz: number;
  knockYawVel: number;
  steerAngle: number;
  maxSpeed: number;
  accel: number;
  brakeForce: number;
  turnRate: number;
  wheelSpin: number;
  rotorSpeed: number;
  airborne: boolean;
  airborneTime: number;
  launchX: number;
  launchZ: number;
  maxAirY: number;
  paintHex: number;
  health: number; // 0..100
  boostCharge: number; // 0..100
  boosting: boolean;
  engineLevel: number; // 1..3
  locked: boolean;
  ownedByPlayer: boolean;
  alarmTimer: number; // >0 flashes headlights/horn
  doorOpenTimer: number; // >0 swings door open smoothly
  respawnTimer: number; // >0 vehicle is destroyed & hidden until respawn
  damageSmokeTimer: number;
}

const _resolved = { x: 0, z: 0 };

export function getVehicleSpecForKind(kind: VehicleKind): {
  nameEn: string;
  nameBn: string;
  maxSpeed: number;
  accel: number;
  brakeForce: number;
  turnRate: number;
} {
  switch (kind) {
    case 'cng':
      return {
        nameEn: 'Dhaka CNG Auto',
        nameBn: 'ঢাকা সিএনজি অটো',
        maxSpeed: 22,
        accel: 13.5,
        brakeForce: 24,
        turnRate: 2.25,
      };
    case 'motorcycle':
      return {
        nameEn: 'Dhaka Street Bike',
        nameBn: 'ঢাকা স্ট্রিট বাইক',
        maxSpeed: 34,
        accel: 22.0,
        brakeForce: 30,
        turnRate: 2.35,
      };
    case 'sports':
      return {
        nameEn: 'Gulshan GT Coupe',
        nameBn: 'গুলশান জিটি স্পোর্টস',
        maxSpeed: 40,
        accel: 22.5,
        brakeForce: 34,
        turnRate: 2.05,
      };
    case 'suv':
      return {
        nameEn: 'Bengal V8 SUV',
        nameBn: 'বেঙ্গল ভি৮ এসইউভি',
        maxSpeed: 31,
        accel: 16.5,
        brakeForce: 28,
        turnRate: 1.88,
      };
    case 'pickup':
      return {
        nameEn: 'Dhaka Utility Pickup',
        nameBn: 'ঢাকা ইউটিলিটি পিকআপ',
        maxSpeed: 29,
        accel: 15.5,
        brakeForce: 26,
        turnRate: 1.9,
      };
    case 'bus':
      return {
        nameEn: 'Dhaka City Bus',
        nameBn: 'ঢাকা সিটি বাস',
        maxSpeed: 23,
        accel: 10.5,
        brakeForce: 22,
        turnRate: 1.45,
      };
    case 'truck':
      return {
        nameEn: 'Dhaka Cargo Truck',
        nameBn: 'ঢাকা কার্গো ট্রাক',
        maxSpeed: 24,
        accel: 11.2,
        brakeForce: 23,
        turnRate: 1.55,
      };
    case 'police':
      return {
        nameEn: 'Dhaka Police Cruiser',
        nameBn: 'ঢাকা পুলিশ ক্রুজার',
        maxSpeed: 36,
        accel: 20.0,
        brakeForce: 32,
        turnRate: 2.1,
      };
    case 'helicopter':
      return {
        nameEn: 'Dhaka SkyHawk Chopper',
        nameBn: 'ঢাকা স্কাইহক হেলিকপ্টার',
        maxSpeed: 34,
        accel: 18.0,
        brakeForce: 20,
        turnRate: 1.95,
      };
    case 'speedboat':
      return {
        nameEn: 'Hatirjheel Jet Cruiser',
        nameBn: 'হাতিরঝিল জেট স্পিডবোট',
        maxSpeed: 32,
        accel: 19.5,
        brakeForce: 24,
        turnRate: 2.15,
      };
    default:
      return {
        nameEn: 'Gulshan Sedan',
        nameBn: 'গুলশান সেডান',
        maxSpeed: 30,
        accel: 16.2,
        brakeForce: 27,
        turnRate: 1.95,
      };
  }
}

export class VehicleManager {
  public readonly group = new THREE.Group();
  public readonly vehicles: DrivableVehicle[] = [];
  public activeVehicle: DrivableVehicle | null = null;

  private nightFactor = 0;
  private shadowTex: THREE.Texture;
  private nextSpawnIdx = 1;
  private nitroFlame: THREE.Mesh;
  private smokePool: Array<{ mesh: THREE.Mesh; life: number; vx: number; vy: number; vz: number }> = [];
  private smokeTimer = 0;
  private waterWaveTime = 0;
  private obstacleBuf: DynamicObstacleCircle[] = [];

  constructor(shadowTex: THREE.Texture, physics: PhysicsWorld) {
    this.shadowTex = shadowTex;

    // Glowing 3D Nitro Exhaust Flame cone (reused on active vehicle)
    const flameGeo = new THREE.ConeGeometry(0.22, 1.35, 8);
    flameGeo.rotateX(-Math.PI * 0.5);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
    });
    this.nitroFlame = new THREE.Mesh(flameGeo, flameMat);
    this.nitroFlame.visible = false;
    this.group.add(this.nitroFlame);

    // Pooled Drift & Damage Smoke / Fire spheres (zero runtime GC)
    const smokeGeo = new THREE.SphereGeometry(0.35, 6, 6);
    for (let i = 0; i < 28; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xe2e8f0,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(smokeGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.smokePool.push({ mesh, life: 0, vx: 0, vy: 0, vz: 0 });
    }

    // Diverse curated fleet across Gulshan & Hatirjheel (all 8 classes available to drive!)
    this.spawnVehicle(
      {
        id: 'veh_cng_1',
        kind: 'cng',
        color: 0x15803d,
        x: -7.2,
        z: 19.5,
        yaw: Math.PI,
        locked: false,
        ownedByPlayer: true,
      },
      physics
    );
    this.spawnVehicle(
      {
        id: 'veh_sports_1',
        kind: 'sports',
        color: 0xdc2626,
        x: 7.1,
        z: 15.0,
        yaw: 0,
        locked: true, // Taking triggers alarm + 1-star chase!
        ownedByPlayer: false,
      },
      physics
    );
    this.spawnVehicle(
      {
        id: 'veh_moto_1',
        kind: 'motorcycle',
        color: 0x0284c7,
        x: -10.8,
        z: 12.2,
        yaw: 0.4,
        locked: false,
        ownedByPlayer: false,
      },
      physics
    );
    this.spawnVehicle(
      {
        id: 'veh_suv_1',
        kind: 'suv',
        color: 0x1e293b,
        x: 17.5,
        z: -6.8,
        yaw: -Math.PI * 0.5,
        locked: true,
        ownedByPlayer: false,
      },
      physics
    );
    this.spawnVehicle(
      {
        id: 'veh_pickup_1',
        kind: 'pickup',
        color: 0xea580c,
        x: 34.0,
        z: 6.8,
        yaw: Math.PI * 0.5,
        locked: false,
        ownedByPlayer: false,
      },
      physics
    );
    this.spawnVehicle(
      {
        id: 'veh_sedan_1',
        kind: 'sedan',
        color: 0xf1f5f9,
        x: -18.5,
        z: -6.8,
        yaw: Math.PI * 0.5,
        locked: false,
        ownedByPlayer: false,
      },
      physics
    );
    this.spawnVehicle(
      {
        id: 'veh_truck_1',
        kind: 'truck',
        color: 0x0369a1,
        x: -53.2,
        z: -24.0,
        yaw: 0,
        locked: false,
        ownedByPlayer: false,
      },
      physics
    );
    this.spawnVehicle(
      {
        id: 'veh_sedan_2',
        kind: 'sedan',
        color: 0x1d4ed8,
        x: 24.0,
        z: 63.8,
        yaw: -Math.PI * 0.5,
        locked: false,
        ownedByPlayer: false,
      },
      physics
    );
    // Dedicated Special Operations Tactical SUV parked in HQ bay
    this.spawnVehicle(
      {
        id: 'veh_specops_suv',
        kind: 'suv',
        nameEn: 'Spec Ops Tactical SUV',
        nameBn: 'স্পেশাল অপস ট্যাকটিক্যাল এসইউভি',
        color: 0x0f172a,
        x: 49.5,
        z: 42.0,
        yaw: 0,
        locked: false,
        ownedByPlayer: true,
        engineLevel: 2,
      },
      physics
    );
    // Flyable Dhaka SkyHawk Helicopter stationed on Hatirjheel Helipad!
    this.spawnVehicle(
      {
        id: 'veh_heli_1',
        kind: 'helicopter',
        color: 0x1e293b,
        x: 72.0,
        z: 54.0,
        yaw: -Math.PI * 0.5,
        locked: false,
        ownedByPlayer: true,
        engineLevel: 2,
      },
      physics
    );
    // Hatirjheel Jet Cruiser Speedboat docked at Hatirjheel Boat Pier!
    this.spawnVehicle(
      {
        id: 'veh_boat_1',
        kind: 'speedboat',
        color: 0x0f172a,
        x: -68.0,
        z: 79.2,
        yaw: Math.PI * 0.5,
        locked: false,
        ownedByPlayer: true,
        engineLevel: 2,
      },
      physics
    );
  }

  public spawnVehicle(
    cfg: {
      id?: string;
      kind: VehicleKind;
      nameEn?: string;
      nameBn?: string;
      color: number;
      x: number;
      z: number;
      yaw: number;
      locked?: boolean;
      ownedByPlayer?: boolean;
      engineLevel?: number;
    },
    physics: PhysicsWorld
  ): DrivableVehicle {
    const spec = getVehicleSpecForKind(cfg.kind);
    const rig = createVehicleMesh(cfg.kind, cfg.color, this.shadowTex);
    const domain: VehicleDomain =
      cfg.kind === 'helicopter' ? 'air' : cfg.kind === 'speedboat' ? 'water' : 'ground';
    const y = domain === 'water' ? -0.35 : physics.getGroundHeightAt(cfg.x, cfg.z);
    rig.root.position.set(cfg.x, y, cfg.z);
    rig.root.rotation.y = cfg.yaw;
    this.group.add(rig.root);

    const engineLevel = cfg.engineLevel ?? 1;
    const boost = 1 + (engineLevel - 1) * 0.14;
    const v: DrivableVehicle = {
      id: cfg.id || `veh_dyn_${this.nextSpawnIdx++}`,
      kind: cfg.kind,
      domain,
      nameEn: cfg.nameEn || spec.nameEn,
      nameBn: cfg.nameBn || spec.nameBn,
      rig,
      x: cfg.x,
      y,
      z: cfg.z,
      vy: 0,
      yaw: cfg.yaw,
      speed: 0,
      knockVx: 0,
      knockVz: 0,
      knockYawVel: 0,
      steerAngle: 0,
      maxSpeed: spec.maxSpeed * boost,
      accel: spec.accel * boost,
      brakeForce: spec.brakeForce,
      turnRate: spec.turnRate,
      wheelSpin: 0,
      rotorSpeed: 0,
      airborne: false,
      airborneTime: 0,
      launchX: cfg.x,
      launchZ: cfg.z,
      maxAirY: y,
      paintHex: cfg.color,
      health: 100,
      boostCharge: 100,
      boosting: false,
      engineLevel,
      locked: cfg.locked ?? false,
      ownedByPlayer: cfg.ownedByPlayer ?? false,
      alarmTimer: 0,
      doorOpenTimer: 0,
      respawnTimer: 0,
      damageSmokeTimer: 0,
    };
    this.vehicles.push(v);
    return v;
  }

  /**
   * Takes ownership of a converted traffic vehicle cleanly at its exact position.
   */
  public adoptTrafficVehicle(
    kind: VehicleKind,
    paintHex: number,
    x: number,
    z: number,
    yaw: number,
    physics: PhysicsWorld
  ): DrivableVehicle {
    return this.spawnVehicle(
      {
        kind,
        color: paintHex,
        x,
        z,
        yaw,
        locked: false,
        ownedByPlayer: false,
      },
      physics
    );
  }

  public repaintVehicle(v: DrivableVehicle, hex: number): void {
    v.paintHex = hex;
    v.rig.paintMat.color.setHex(hex);
  }

  public repairVehicle(v: DrivableVehicle): void {
    v.health = 100;
  }

  public upgradeVehicleEngine(v: DrivableVehicle): void {
    if (v.engineLevel >= 3) return;
    v.engineLevel += 1;
    const spec = getVehicleSpecForKind(v.kind);
    const boost = 1 + (v.engineLevel - 1) * 0.14;
    v.maxSpeed = spec.maxSpeed * boost;
    v.accel = spec.accel * boost;
  }

  public triggerDoorSwing(v: DrivableVehicle): void {
    v.doorOpenTimer = 1.15;
  }

  public findNearestVehicle(px: number, pz: number, maxDist = 5.0): DrivableVehicle | null {
    let best: DrivableVehicle | null = null;
    let bestDistSq = (maxDist + 3.6) * (maxDist + 3.6);
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (v.respawnTimer > 0) continue;
      // Only allow boarding helicopter when it is near the ground
      if (v.domain === 'air' && v.y > 4.5) continue;
      const dx = v.x - px;
      const dz = v.z - pz;
      const dSq = dx * dx + dz * dz;
      const bonus =
        v.domain === 'water' || v.domain === 'air' ? 3.5 : v.rig.length > 6 ? 1.8 : 0;
      const effectiveRange = maxDist + bonus;
      if (dSq < effectiveRange * effectiveRange && dSq < bestDistSq) {
        bestDistSq = dSq;
        best = v;
      }
    }
    return best;
  }

  public getObstacleCircles(excludeId: string | null = null): DynamicObstacleCircle[] {
    const out = this.obstacleBuf;
    out.length = 0;
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (v.respawnTimer > 0) continue;
      if (v.domain === 'air' && v.y > 3.2) continue;
      if (v.domain === 'water') continue;
      if (excludeId && v.id === excludeId) continue;
      out.push({ id: v.id, x: v.x, z: v.z, radius: v.rig.radius * 0.85 });
    }
    return out;
  }

  public getShootableTargets(excludeId: string | null = null): ShootableTarget[] {
    const out: ShootableTarget[] = [];
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (v.respawnTimer > 0) continue;
      if (excludeId && v.id === excludeId) continue;
      out.push({
        kind: 'vehicle',
        id: v.id,
        x: v.x,
        y: v.y,
        z: v.z,
        radius: Math.max(1.3, v.rig.radius * 0.92),
        height: v.kind === 'bus' || v.kind === 'truck' ? 2.8 : v.kind === 'motorcycle' ? 1.3 : 1.75,
      });
    }
    return out;
  }

  public damageVehicleById(
    vehicleId: string,
    damage: number
  ): { hit: boolean; destroyed: boolean; x: number; y: number; z: number } {
    const v = this.vehicles.find((it) => it.id === vehicleId);
    if (!v || v.respawnTimer > 0) {
      return { hit: false, destroyed: false, x: 0, y: 0, z: 0 };
    }
    v.health = Math.max(0, v.health - damage);
    v.alarmTimer = Math.max(v.alarmTimer, 3.0);
    if (v.health <= 0) {
      v.respawnTimer = 24;
      v.speed = 0;
      v.knockVx = 0;
      v.knockVz = 0;
      v.knockYawVel = 0;
      v.boosting = false;
      v.rig.root.visible = false;
      if (this.activeVehicle === v) {
        this.activeVehicle = null;
      }
      return { hit: true, destroyed: true, x: v.x, y: v.y, z: v.z };
    }
    return { hit: true, destroyed: false, x: v.x, y: v.y, z: v.z };
  }

  /**
   * Applies GTA-style ramming knockback + spin + damage to a parked/idle vehicle.
   */
  public ramVehicle(
    vehicleId: string,
    impulseX: number,
    impulseZ: number,
    damage: number
  ): { hit: boolean; destroyed: boolean; x: number; y: number; z: number } {
    const v = this.vehicles.find((it) => it.id === vehicleId);
    if (!v || v.respawnTimer > 0) {
      return { hit: false, destroyed: false, x: 0, y: 0, z: 0 };
    }
    const massScale =
      v.kind === 'bus' || v.kind === 'truck'
        ? 0.48
        : v.kind === 'suv' || v.kind === 'pickup'
          ? 0.78
          : v.kind === 'motorcycle' || v.kind === 'cng'
            ? 1.38
            : 1.0;
    v.knockVx += impulseX * massScale;
    v.knockVz += impulseZ * massScale;
    v.knockYawVel += ((Math.random() > 0.5 ? 1 : -1) * (1.8 + Math.random() * 2.4)) * massScale;
    v.alarmTimer = Math.max(v.alarmTimer, 4.5);
    return this.damageVehicleById(vehicleId, damage);
  }

  /**
   * Used when selling a stolen vehicle at the Gulshan Chop-Shop Garage.
   */
  public removeOrRespawnVehicle(vehicleId: string): boolean {
    const idx = this.vehicles.findIndex((it) => it.id === vehicleId);
    if (idx === -1) return false;
    const v = this.vehicles[idx];
    if (this.activeVehicle === v) {
      this.activeVehicle = null;
    }
    if (v.id.startsWith('veh_dyn_')) {
      this.group.remove(v.rig.root);
      this.vehicles.splice(idx, 1);
    } else {
      v.respawnTimer = 28;
      v.speed = 0;
      v.knockVx = 0;
      v.knockVz = 0;
      v.knockYawVel = 0;
      v.rig.root.visible = false;
    }
    return true;
  }

  public setNightFactor(nf: number): void {
    this.nightFactor = nf;
  }

  /**
   * Upgraded forgiving mobile driving physics with automatic steering stabilization,
   * speed-sensitive turn attenuation, automatic transmission/reverse, and Driving Assist.
   */
  public update(
    dt: number,
    input: InputState,
    settings: GameSettings,
    physics: PhysicsWorld,
    externalObstacles: DynamicObstacleCircle[],
    onCrashImpact?: (severity: number, destroyed: boolean, x: number, y: number, z: number) => void,
    onVehicleRamCollision?: (evt: VehicleRamHitEvent) => void,
    onStuntLanded?: (evt: StuntLandedEvent) => void
  ): void {
    this.waterWaveTime += dt;
    const allCircles = this.getObstacleCircles();

    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (v.respawnTimer > 0) {
        v.respawnTimer -= dt;
        if (v.respawnTimer <= 0) {
          v.respawnTimer = 0;
          v.health = 100;
          v.rig.root.visible = true;
        }
        continue;
      }
      const isControlled = this.activeVehicle === v;

      if (v.alarmTimer > 0) v.alarmTimer = Math.max(0, v.alarmTimer - dt);
      if (v.doorOpenTimer > 0) v.doorOpenTimer = Math.max(0, v.doorOpenTimer - dt);

      // ═══════════════════════════════════════════════════════════════
      // DOMAIN 1: FLYABLE HELICOPTER (Dhaka SkyHawk Chopper)
      // ═══════════════════════════════════════════════════════════════
      if (v.domain === 'air') {
        const targetRotor = isControlled ? 24.0 : v.y > 0.3 ? 16.0 : 0;
        v.rotorSpeed = THREE.MathUtils.damp(v.rotorSpeed, targetRotor, 2.8, dt);
        if (v.rig.mainRotor) v.rig.mainRotor.rotation.y += v.rotorSpeed * dt;
        if (v.rig.tailRotor) v.rig.tailRotor.rotation.x += v.rotorSpeed * 1.45 * dt;

        const groundY = Math.max(0, physics.getGroundHeightAt(v.x, v.z));
        let pitchTarget = 0;
        let rollTarget = 0;

        if (isControlled) {
          const wantsBoost = input.boost && v.boostCharge > 4;
          if (wantsBoost) {
            v.boosting = true;
            v.boostCharge = Math.max(0, v.boostCharge - 30 * dt);
          } else {
            v.boosting = false;
            v.boostCharge = Math.min(100, v.boostCharge + 16 * dt);
          }

          // Vertical lift controls (dedicated Ascend / Descend inputs without handbrake conflict)
          const ascendInput = Boolean(input.ascend);
          const descendInput = Boolean(input.descend);
          let targetVy = 0;
          if (ascendInput && !descendInput) {
            targetVy = v.boosting ? 16.0 : 11.5;
          } else if (descendInput && !ascendInput) {
            targetVy = -11.0;
          } else if (v.y < groundY + 1.8 && (input.throttle > 0.1 || v.boosting)) {
            // Smooth automatic takeoff assist when player pushes forward on Helipad!
            targetVy = 7.2;
          }
          v.vy = THREE.MathUtils.damp(v.vy, targetVy, 5.5, dt);
          v.y = THREE.MathUtils.clamp(v.y + v.vy * dt, groundY, 54.0);

          // Yaw steering
          let rawSteer = input.steer;
          if (Math.abs(rawSteer) < 0.06) rawSteer = 0;
          v.yaw -= rawSteer * v.turnRate * dt;

          // Forward / Reverse airspeed (active once lifted > 0.4m)
          const effMax = v.boosting ? v.maxSpeed * 1.32 : v.maxSpeed;
          if (v.y > groundY + 0.35) {
            const forwardInput = input.reverse
              ? -0.75
              : input.throttle > 0.05 || v.boosting
                ? Math.max(input.throttle, v.boosting ? 1 : 0)
                : input.brake > 0.05
                  ? -input.brake * 0.65
                  : 0;
            const targetSpd = forwardInput * effMax;
            v.speed = THREE.MathUtils.damp(v.speed, targetSpd, 3.2, dt);
            pitchTarget = THREE.MathUtils.clamp((v.speed / effMax) * 0.24, -0.18, 0.26);
            rollTarget = THREE.MathUtils.clamp(-rawSteer * 0.34, -0.36, 0.36);
          } else {
            v.speed = THREE.MathUtils.damp(v.speed, 0, 6.0, dt);
          }
        } else {
          v.boosting = false;
          v.speed = THREE.MathUtils.damp(v.speed, 0, 4.0, dt);
          if (v.y > groundY + 0.05) {
            // Gentle auto-descent if player exits mid-air
            v.vy = THREE.MathUtils.damp(v.vy, -6.5, 4.0, dt);
            v.y = Math.max(groundY, v.y + v.vy * dt);
          } else {
            v.y = groundY;
            v.vy = 0;
          }
        }

        const nx = THREE.MathUtils.clamp(v.x + Math.sin(v.yaw) * v.speed * dt, -124, 124);
        const nz = THREE.MathUtils.clamp(v.z + Math.cos(v.yaw) * v.speed * dt, -118, 118);

        // Above 14m, fly freely over Dhaka buildings! Below 14m, respect ground colliders
        if (v.y < 14.0) {
          physics.resolveCircleStatic(nx, nz, v.rig.radius * 0.85, _resolved);
          v.x = _resolved.x;
          v.z = _resolved.z;
        } else {
          v.x = nx;
          v.z = nz;
        }

        const hoverBob = v.y > groundY + 0.5 ? Math.sin(this.waterWaveTime * 3.1) * 0.14 : 0;
        v.rig.root.position.set(v.x, v.y + hoverBob, v.z);
        v.rig.root.rotation.set(0, v.yaw, 0);
        v.rig.bodyGroup.rotation.x = THREE.MathUtils.damp(v.rig.bodyGroup.rotation.x, pitchTarget, 6, dt);
        v.rig.bodyGroup.rotation.z = THREE.MathUtils.damp(v.rig.bodyGroup.rotation.z, rollTarget, 6, dt);
        v.rig.headlightMat.emissiveIntensity = isControlled
          ? THREE.MathUtils.lerp(1.4, 3.6, this.nightFactor)
          : 0.3;
        continue;
      }

      // ═══════════════════════════════════════════════════════════════
      // DOMAIN 2: HATIRJHEEL JET CRUISER SPEEDBOAT
      // ═══════════════════════════════════════════════════════════════
      if (v.domain === 'water') {
        let rawSteer = 0;
        if (isControlled) {
          const wantsBoost = input.boost && v.boostCharge > 4 && !input.brake && !input.reverse;
          if (wantsBoost) {
            v.boosting = true;
            v.boostCharge = Math.max(0, v.boostCharge - 34 * dt);
          } else {
            v.boosting = false;
            v.boostCharge = Math.min(100, v.boostCharge + 15 * dt);
          }

          const effMax = v.boosting ? v.maxSpeed * 1.3 : v.maxSpeed;
          const effAccel = v.accel * (v.boosting ? 1.5 : 1.0);
          if (input.reverse) {
            v.speed = THREE.MathUtils.damp(v.speed, -effMax * 0.35, 3.6, dt);
          } else if (input.throttle > 0.05 || v.boosting) {
            v.speed += Math.max(input.throttle, v.boosting ? 1 : 0) * effAccel * dt;
          } else if (input.brake > 0.05) {
            v.speed *= Math.exp(-4.5 * dt);
          } else {
            v.speed *= Math.exp(-1.8 * dt);
          }
          v.speed = THREE.MathUtils.clamp(v.speed, -effMax * 0.35, effMax);

          rawSteer = Math.abs(input.steer) < 0.06 ? 0 : input.steer;
          const turnScale = Math.min(1, Math.abs(v.speed) / 4.2 + 0.22);
          const dirSign = v.speed >= -0.2 ? 1 : -1;
          v.yaw -= rawSteer * v.turnRate * turnScale * dirSign * dt;

          // Emit white foaming water wake when cruising across Hatirjheel Lake!
          if (Math.abs(v.speed) > 4.5) {
            this.smokeTimer -= dt;
            if (this.smokeTimer <= 0) {
              this.smokeTimer = 0.048;
              this.emitWaterWake(v);
            }
          }
        } else {
          v.boosting = false;
          v.speed *= Math.exp(-2.6 * dt);
          if (Math.abs(v.speed) < 0.06) v.speed = 0;
        }

        // Stay cleanly within Hatirjheel Lake shoreline bounds (glides right under the arched bridge!)
        let nx = v.x + Math.sin(v.yaw) * v.speed * dt;
        let nz = v.z + Math.cos(v.yaw) * v.speed * dt;
        let hitShore = false;
        if (nx < -116) {
          nx = -116;
          hitShore = true;
        } else if (nx > 116) {
          nx = 116;
          hitShore = true;
        }
        if (nz < 74.2) {
          nz = 74.2;
          hitShore = true;
        } else if (nz > 118.5) {
          nz = 118.5;
          hitShore = true;
        }
        if (hitShore) v.speed *= 0.35;
        v.x = nx;
        v.z = nz;

        const bob = Math.sin(this.waterWaveTime * 2.6 + v.x * 0.15) * 0.08;
        v.y = -0.35 + bob;
        v.rig.root.position.set(v.x, v.y, v.z);
        v.rig.root.rotation.set(0, v.yaw, 0);

        const bowLift = -THREE.MathUtils.clamp(v.speed / v.maxSpeed, -0.2, 1) * 0.14;
        const waterBank = -rawSteer * Math.min(1, Math.abs(v.speed) / 14) * 0.22;
        v.rig.bodyGroup.rotation.x = THREE.MathUtils.damp(v.rig.bodyGroup.rotation.x, bowLift, 7, dt);
        v.rig.bodyGroup.rotation.z = THREE.MathUtils.damp(v.rig.bodyGroup.rotation.z, waterBank, 7, dt);
        v.rig.headlightMat.emissiveIntensity = isControlled
          ? THREE.MathUtils.lerp(1.0, 3.0, this.nightFactor)
          : 0.2;
        continue;
      }

      // ═══════════════════════════════════════════════════════════════
      // DOMAIN 3: GROUND VEHICLES + 3D STUNT RAMP JUMPS
      // ═══════════════════════════════════════════════════════════════
      // Smooth swinging driver door animation
      if (v.rig.doorPivot) {
        const targetDoorAngle = v.doorOpenTimer > 0.25 ? 0.95 : 0;
        v.rig.doorPivot.rotation.y = THREE.MathUtils.damp(
          v.rig.doorPivot.rotation.y,
          targetDoorAngle,
          10,
          dt
        );
      }

      let braking = false;
      let accelInput = 0;

      if (isControlled) {
        const throttle = input.throttle;
        const brake = input.brake;
        const reversePressed = input.reverse;
        const handbrake = input.handbrake;

        const wantsBoost = input.boost && v.boostCharge > 4 && !brake && !reversePressed;
        if (wantsBoost) {
          v.boosting = true;
          v.boostCharge = Math.max(0, v.boostCharge - 36 * dt);
        } else {
          v.boosting = false;
          v.boostCharge = Math.min(100, v.boostCharge + 14 * dt);
        }

        const effectiveMax = settings.speedLimiter
          ? Math.min(v.maxSpeed, 18.5)
          : v.boosting
            ? v.maxSpeed * 1.34
            : v.maxSpeed;
        const effAccel = v.accel * settings.accelerationScale * (v.boosting ? 1.55 : 1.0);
        const effBrake = v.brakeForce * settings.brakingScale;

        // Driving Assist: gentle automatic low-speed braking if heading directly into a wall/pillar
        let assistAutoBrake = false;
        if (
          settings.drivingAssist &&
          !v.boosting &&
          !v.airborne &&
          v.speed > 0.6 &&
          v.speed < 9.5 &&
          throttle > 0.05 &&
          physics.hasStaticObstacleAhead(v.x, v.z, v.yaw, v.rig.length * 0.6 + 1.8, v.rig.radius)
        ) {
          assistAutoBrake = true;
        }

        if (assistAutoBrake) {
          v.speed = Math.max(0, v.speed - effBrake * 1.15 * dt);
          braking = true;
        } else if (reversePressed) {
          if (v.speed > 0.8) {
            v.speed = Math.max(0, v.speed - effBrake * dt);
            braking = true;
          } else {
            v.speed -= effAccel * 0.62 * dt;
            accelInput = -0.8;
          }
        } else if (throttle > 0.05 || v.boosting) {
          if (v.speed < -0.5) {
            v.speed = Math.min(0, v.speed + effBrake * 1.1 * dt);
            braking = true;
          } else {
            v.speed += Math.max(throttle, v.boosting ? 1 : 0) * effAccel * dt;
            accelInput = 1;
          }
        } else if (brake > 0.05) {
          if (v.speed > 0.7) {
            v.speed = Math.max(0, v.speed - brake * effBrake * dt);
            braking = true;
          } else {
            v.speed -= brake * (effAccel * 0.56) * dt;
            accelInput = -brake;
          }
        } else {
          v.speed *= Math.exp((v.airborne ? -0.35 : -1.95) * dt);
          if (Math.abs(v.speed) < 0.08) v.speed = 0;
        }

        if (handbrake && !v.airborne) {
          v.speed *= Math.exp(-4.6 * dt);
          braking = true;
          if (Math.abs(v.speed) > 5.5) {
            this.smokeTimer -= dt;
            if (this.smokeTimer <= 0) {
              this.smokeTimer = 0.045;
              this.emitDriftSmoke(v);
            }
          }
        }

        v.speed = THREE.MathUtils.clamp(v.speed, -effectiveMax * 0.36, effectiveMax);

        let rawSteer = input.steer;
        if (Math.abs(rawSteer) < 0.06) rawSteer = 0;
        else {
          const sign = Math.sign(rawSteer);
          const norm = (Math.abs(rawSteer) - 0.06) / 0.94;
          rawSteer = sign * Math.pow(norm, 1.25);
        }

        const absSpd = Math.abs(v.speed);
        const highSpeedAtten = settings.drivingAssist
          ? THREE.MathUtils.lerp(1.0, 0.52, Math.min(1, absSpd / 34))
          : THREE.MathUtils.lerp(1.0, 0.72, Math.min(1, absSpd / 34));

        const maxSteerAngle = 0.56 * settings.steeringSensitivity * highSpeedAtten;
        const targetSteer = -rawSteer * Math.min(0.66, maxSteerAngle);

        const steerResponsiveness = Math.abs(rawSteer) > 0.05 ? 11.5 : 14.5;
        v.steerAngle = THREE.MathUtils.damp(v.steerAngle, targetSteer, steerResponsiveness, dt);

        if (absSpd > 0.18) {
          const lowSpeedRamp = Math.min(1, absSpd / 5.2);
          const dirSign = v.speed >= 0 ? 1 : -1;
          const airTurnScale = v.airborne ? 0.25 : 1.0;
          const driftFactor = handbrake ? (settings.drivingAssist ? 1.22 : 1.38) : 1.0;
          v.yaw +=
            v.steerAngle * v.turnRate * lowSpeedRamp * dirSign * driftFactor * airTurnScale * dt;
        }
      } else {
        v.speed *= Math.exp(-3.8 * dt);
        if (Math.abs(v.speed) < 0.05) v.speed = 0;
        v.steerAngle = THREE.MathUtils.damp(v.steerAngle, 0, 10, dt);
      }

      // Apply external ramming knockback & spin decay
      const hasKnock =
        Math.abs(v.knockVx) > 0.08 || Math.abs(v.knockVz) > 0.08 || Math.abs(v.knockYawVel) > 0.04;
      if (hasKnock) {
        v.yaw += v.knockYawVel * dt;
        v.knockVx *= Math.exp(-3.4 * dt);
        v.knockVz *= Math.exp(-3.4 * dt);
        v.knockYawVel *= Math.exp(-4.2 * dt);
      } else {
        v.knockVx = 0;
        v.knockVz = 0;
        v.knockYawVel = 0;
      }

      // Advance position + resolve static buildings + dynamic vehicles
      const moveVx = Math.sin(v.yaw) * v.speed + v.knockVx;
      const moveVz = Math.cos(v.yaw) * v.speed + v.knockVz;
      const nx = v.x + moveVx * dt;
      const nz = v.z + moveVz * dt;
      const hitStatic = physics.resolveCircleStatic(nx, nz, v.rig.radius * 0.86, _resolved);
      let rx = _resolved.x;
      let rz = _resolved.z;

      let hitDyn = false;
      const preImpactSpeed = Math.abs(v.speed);
      if (!v.airborne && (isControlled || Math.abs(v.speed) > 0.4 || hasKnock)) {
        if (isControlled && preImpactSpeed > 3.8 && onVehicleRamCollision) {
          const myR = v.rig.radius * 0.92;
          const dirX = Math.sin(v.yaw) * (v.speed >= 0 ? 1 : -1);
          const dirZ = Math.cos(v.yaw) * (v.speed >= 0 ? 1 : -1);

          for (let k = 0; k < allCircles.length; k++) {
            const c = allCircles[k];
            if (c.id === v.id) continue;
            const d = Math.hypot(c.x - rx, c.z - rz);
            if (d < myR + c.radius) {
              onVehicleRamCollision({
                hitKind: 'vehicle',
                hitId: c.id,
                impactSpeed: preImpactSpeed,
                hitX: (rx + c.x) * 0.5,
                hitY: v.y + 0.85,
                hitZ: (rz + c.z) * 0.5,
                dirX,
                dirZ,
              });
              break;
            }
          }

          for (let k = 0; k < externalObstacles.length; k++) {
            const c = externalObstacles[k];
            const d = Math.hypot(c.x - rx, c.z - rz);
            if (d < myR + c.radius) {
              const hitKind = c.id.startsWith('police_') ? 'police' : 'traffic';
              onVehicleRamCollision({
                hitKind,
                hitId: c.id,
                impactSpeed: preImpactSpeed,
                hitX: (rx + c.x) * 0.5,
                hitY: v.y + 0.85,
                hitZ: (rz + c.z) * 0.5,
                dirX,
                dirZ,
              });
              break;
            }
          }
        }

        const hitOtherVeh = physics.resolveCircleDynamic(
          rx,
          rz,
          v.rig.radius * 0.84,
          allCircles,
          v.id,
          _resolved
        );
        rx = _resolved.x;
        rz = _resolved.z;
        const hitTraffic = physics.resolveCircleDynamic(
          rx,
          rz,
          v.rig.radius * 0.84,
          externalObstacles,
          v.id,
          _resolved
        );
        rx = _resolved.x;
        rz = _resolved.z;
        hitDyn = hitOtherVeh || hitTraffic;
      }

      v.x = rx;
      v.z = rz;

      if (hitStatic || hitDyn) {
        const impactSpeed = Math.abs(v.speed);
        if (isControlled && impactSpeed > 6.5) {
          const dmg = Math.min(20, (impactSpeed - 5.5) * (hitDyn ? 0.55 : 0.85));
          v.health = Math.max(0, v.health - dmg);
          const destroyed = v.health <= 0;
          if (destroyed) {
            v.respawnTimer = 24;
            v.speed = 0;
            v.boosting = false;
            v.rig.root.visible = false;
            this.activeVehicle = null;
          }
          onCrashImpact?.(impactSpeed, destroyed, v.x, v.y, v.z);
          if (destroyed) continue;
        }
        v.speed *= hitStatic ? -0.2 : 0.48;
        if (hitStatic) {
          v.knockVx *= -0.3;
          v.knockVz *= -0.3;
        }
      }

      // Ground elevation + 3D Stunt Ramp Launch & Gravity arc!
      const groundY = physics.getGroundHeightAt(v.x, v.z);

      if (!v.airborne && isControlled && v.speed > 10.5) {
        const launchVy = physics.getRampLipVelocity(v.x, v.z, v.yaw, v.speed);
        if (launchVy > 0) {
          v.vy = launchVy;
          v.airborne = true;
          v.airborneTime = 0;
          v.launchX = v.x;
          v.launchZ = v.z;
          v.maxAirY = v.y;
        }
      }

      let slopePitch = 0;
      if (v.airborne) {
        v.airborneTime += dt;
        v.vy -= 20.5 * dt;
        v.y += v.vy * dt;
        if (v.y > v.maxAirY) v.maxAirY = v.y;
        slopePitch = THREE.MathUtils.clamp(-v.vy * 0.032, -0.42, 0.35);

        if (v.y <= groundY) {
          v.y = groundY;
          v.vy = 0;
          v.airborne = false;
          const distMeters = Math.hypot(v.x - v.launchX, v.z - v.launchZ);
          if (isControlled && v.airborneTime >= 0.58 && distMeters >= 11 && onStuntLanded) {
            onStuntLanded({
              distanceMeters: Math.round(distMeters),
              hangSec: Number(v.airborneTime.toFixed(1)),
              maxHeightMeters: Number(Math.max(1, v.maxAirY - groundY).toFixed(1)),
            });
          }
          v.airborneTime = 0;
        }
      } else {
        v.y = THREE.MathUtils.damp(v.y, groundY, 20, dt);
        const aheadY = physics.getGroundHeightAt(
          v.x + Math.sin(v.yaw) * 1.5,
          v.z + Math.cos(v.yaw) * 1.5
        );
        slopePitch = -Math.atan2(aheadY - groundY, 1.5);
      }

      v.rig.root.position.set(v.x, v.y, v.z);
      v.rig.root.rotation.set(slopePitch, v.yaw, 0);

      // Visible damaged chassis tilt + forgiving suspension roll & pitch
      const damageRatio = v.health < 55 ? (55 - v.health) / 55 : 0;
      const damageRollBias = damageRatio * 0.11;
      const leanSign = v.kind === 'motorcycle' ? 1 : -1;
      const leanScale = v.kind === 'motorcycle' ? 0.34 : 0.085;
      const targetRoll =
        leanSign * v.steerAngle * Math.min(1, Math.abs(v.speed) / 22) * leanScale + damageRollBias;
      const targetPitch = (braking ? 0.04 : -accelInput * 0.03) + damageRatio * 0.05;
      v.rig.bodyGroup.rotation.z = THREE.MathUtils.damp(
        v.rig.bodyGroup.rotation.z,
        targetRoll,
        10,
        dt
      );
      v.rig.bodyGroup.rotation.x = THREE.MathUtils.damp(
        v.rig.bodyGroup.rotation.x,
        targetPitch,
        10,
        dt
      );

      // Engine hood smoke (<55 HP) & orange fire puffs (<28 HP)
      if (v.health < 55) {
        v.damageSmokeTimer -= dt;
        if (v.damageSmokeTimer <= 0) {
          v.damageSmokeTimer = v.health < 28 ? 0.09 : 0.18;
          this.emitDamageSmoke(v, v.health < 28);
        }
      }

      // Wheel rotation & front wheel steering pivot
      v.wheelSpin += (v.speed * dt) / 0.35;
      for (let w = 0; w < v.rig.wheels.length; w++) {
        v.rig.wheels[w].rotation.x = v.wheelSpin;
      }
      for (let p = 0; p < v.rig.frontWheelPivots.length; p++) {
        v.rig.frontWheelPivots[p].rotation.y = v.steerAngle;
      }

      // Alarm flashing headlights or night lighting
      const alarmFlash = v.alarmTimer > 0 && Math.floor(v.alarmTimer * 8) % 2 === 0;
      v.rig.headlightMat.emissiveIntensity = alarmFlash
        ? 3.8
        : isControlled
          ? THREE.MathUtils.lerp(0.6, 2.8, this.nightFactor)
          : THREE.MathUtils.lerp(0.15, 0.9, this.nightFactor);
      v.rig.brakeLightMat.emissiveIntensity = alarmFlash
        ? 3.6
        : braking
          ? 3.1
          : isControlled
            ? THREE.MathUtils.lerp(0.35, 1.15, this.nightFactor)
            : 0.12;
    }

    // Update Nitro Exhaust Flame mesh behind active vehicle
    const av = this.activeVehicle;
    if (av && av.boosting) {
      this.nitroFlame.visible = true;
      const rearDist = av.rig.length * 0.5 + 0.58;
      this.nitroFlame.position.set(
        av.x - Math.sin(av.yaw) * rearDist,
        av.y + 0.44,
        av.z - Math.cos(av.yaw) * rearDist
      );
      this.nitroFlame.rotation.set(0, av.yaw, 0);
      const flicker = 0.85 + Math.random() * 0.45;
      this.nitroFlame.scale.set(1, 1, flicker);
    } else {
      this.nitroFlame.visible = false;
    }

    // Update Drift Tire Smoke puffs
    for (let s = 0; s < this.smokePool.length; s++) {
      const p = this.smokePool[s];
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        continue;
      }
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      const tNorm = 1 - p.life / 0.55;
      const sc = 0.7 + tNorm * 2.1;
      p.mesh.scale.setScalar(sc);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - tNorm) * 0.36;
    }
  }

  private emitDriftSmoke(v: DrivableVehicle): void {
    const slot = this.smokePool.find((p) => p.life <= 0);
    if (!slot) return;
    const rear = v.rig.length * 0.38;
    const side = (Math.random() > 0.5 ? 1 : -1) * (v.rig.width * 0.42);
    slot.mesh.position.set(
      v.x - Math.sin(v.yaw) * rear + Math.cos(v.yaw) * side,
      v.y + 0.25,
      v.z - Math.cos(v.yaw) * rear - Math.sin(v.yaw) * side
    );
    slot.vx = (Math.random() - 0.5) * 1.4;
    slot.vy = 1.1 + Math.random() * 0.6;
    slot.vz = (Math.random() - 0.5) * 1.4;
    slot.life = 0.55;
    (slot.mesh.material as THREE.MeshBasicMaterial).color.setHex(0xe2e8f0);
    slot.mesh.visible = true;
    slot.mesh.scale.setScalar(0.7);
  }

  private emitDamageSmoke(v: DrivableVehicle, burning: boolean): void {
    const slot = this.smokePool.find((p) => p.life <= 0);
    if (!slot) return;
    const front = v.rig.length * 0.36;
    slot.mesh.position.set(
      v.x + Math.sin(v.yaw) * front + (Math.random() - 0.5) * 0.4,
      v.y + 0.92,
      v.z + Math.cos(v.yaw) * front + (Math.random() - 0.5) * 0.4
    );
    slot.vx = (Math.random() - 0.5) * 0.9;
    slot.vy = burning ? 2.6 + Math.random() * 1.1 : 1.7 + Math.random() * 0.8;
    slot.vz = (Math.random() - 0.5) * 0.9;
    slot.life = 0.55;
    (slot.mesh.material as THREE.MeshBasicMaterial).color.setHex(
      burning && Math.random() > 0.35 ? 0xf97316 : 0x334155
    );
    slot.mesh.visible = true;
    slot.mesh.scale.setScalar(burning ? 0.95 : 0.8);
  }

  private emitWaterWake(v: DrivableVehicle): void {
    const slot = this.smokePool.find((p) => p.life <= 0);
    if (!slot) return;
    const stern = v.rig.length * 0.48;
    const spread = (Math.random() - 0.5) * 1.4;
    slot.mesh.position.set(
      v.x - Math.sin(v.yaw) * stern + Math.cos(v.yaw) * spread,
      -0.28,
      v.z - Math.cos(v.yaw) * stern - Math.sin(v.yaw) * spread
    );
    slot.vx = (Math.random() - 0.5) * 1.8;
    slot.vy = 0.55 + Math.random() * 0.45;
    slot.vz = (Math.random() - 0.5) * 1.8;
    slot.life = 0.52;
    (slot.mesh.material as THREE.MeshBasicMaterial).color.setHex(0xe0f2fe);
    slot.mesh.visible = true;
    slot.mesh.scale.setScalar(0.85);
  }
}
