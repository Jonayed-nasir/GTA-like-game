import * as THREE from 'three';
import { ShootableTarget } from '../combat/CombatSystem';
import { PhysicsWorld } from '../core/PhysicsWorld';
import {
  ArticulatedHumanRig,
  buildRealisticHumanRig,
  buildWeaponMesh,
} from '../entities/HumanRigBuilder';
import { EncounterRuntimeStatus } from '../missions/MissionManager';
import { MissionStage } from '../types/game';

export interface HostileTarget {
  id: string;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  isBoss: boolean;
  nameEn: string;
  nameBn: string;
}

interface HostileActor extends HostileTarget {
  rig: ArticulatedHumanRig;
  hpBarFill: THREE.Mesh;
  hpBg: THREE.Mesh;
  ring: THREE.Mesh;
  anchorX: number;
  anchorZ: number;
  yaw: number;
  phase: number;
  attackCooldown: number;
  alive: boolean;
  deathTimer: number;
}

interface ProtectedCivilian {
  id: string;
  rig: ArticulatedHumanRig;
  ring: THREE.Mesh;
  x: number;
  z: number;
  yaw: number;
  phase: number;
  vip: boolean;
  following: boolean;
  inVehicle: boolean;
  extracted: boolean;
  harmed: boolean;
}

interface ClueNode {
  id: string;
  labelEn: string;
  labelBn: string;
  x: number;
  z: number;
  root: THREE.Group;
  ring: THREE.Mesh;
  found: boolean;
}

const _resolved = { x: 0, z: 0 };

/**
 * Manages 3D Special Operations & GTA Heist/Turf War mission entities:
 * - Sculpted realistic 3D human gang units & Bosses armed with 3D rifles/SMGs
 * - Realistic 3D rescued civilians / hostages / VIPs who follow, board vehicles & extract
 * - Glowing evidence clues & gold heist bags
 * - Enemy fire tracer events & headshot-capable shootable targets
 */
export class SpecialOpsEncounterManager {
  public readonly group = new THREE.Group();

  private hostiles: HostileActor[] = [];
  private civilians: ProtectedCivilian[] = [];
  private clues: ClueNode[] = [];
  private pulseBeam: THREE.Mesh | null = null;
  private pulseTimer = 0;
  private shadowTex: THREE.Texture;
  private animTime = 0;

  private extractX = 38;
  private extractZ = 48;
  private hasExtractTarget = false;
  private totalCiviliansSpawned = 0;
  private totalHostilesSpawned = 0;
  private totalCluesSpawned = 0;
  private totalNeutralizedThisMission = 0;
  private totalCluesFoundThisMission = 0;

  constructor(shadowTex: THREE.Texture) {
    this.shadowTex = shadowTex;
  }

  public spawnForStage(stage: MissionStage, physics: PhysicsWorld, preserveEscortedCivilians = false): void {
    const carriedCivs = preserveEscortedCivilians
      ? this.civilians.filter((c) => !c.harmed && !c.extracted)
      : [];

    this.clearHostilesAndClues();
    if (!preserveEscortedCivilians) {
      this.clearCivilians();
    }

    const enc = stage.encounter;
    if (!enc) {
      this.hasExtractTarget = stage.type === 'escort_civilians';
      this.extractX = stage.targetX;
      this.extractZ = stage.targetZ;
      return;
    }

    this.hasExtractTarget =
      stage.type === 'escort_civilians' || (enc.extractX !== undefined && enc.extractZ !== undefined);
    this.extractX = enc.extractX ?? stage.targetX;
    this.extractZ = enc.extractZ ?? stage.targetZ;

    if (enc.clues && enc.clues.length > 0) {
      for (const c of enc.clues) {
        this.spawnClue(c.id, c.x, c.z, c.labelEn, c.labelBn, physics);
      }
      this.totalCluesSpawned = this.clues.length;
    } else {
      this.totalCluesSpawned = 0;
    }

    const hostileCount = enc.hostilesCount ?? 0;
    if (hostileCount > 0) {
      for (let i = 0; i < hostileCount; i++) {
        const angle = (i / Math.max(1, hostileCount)) * Math.PI * 2 + 0.4;
        const radius = i === 0 && enc.hasBoss ? 3.2 : 4.6 + (i % 3) * 2.2;
        const hx = stage.targetX + Math.cos(angle) * radius;
        const hz = stage.targetZ + Math.sin(angle) * radius;
        const isBoss = Boolean(enc.hasBoss && i === 0);
        this.spawnHostile(
          `hostile_${stage.type}_${i}`,
          hx,
          hz,
          isBoss,
          isBoss ? (enc.bossNameEn ?? 'Syndicate Boss Raza') : 'Iron Syndicate Gunman',
          isBoss ? (enc.bossNameBn ?? 'সিন্ডিকেট বস রাজা') : 'আয়রন সিন্ডিকেট গানম্যান',
          physics
        );
      }
      this.totalHostilesSpawned = this.hostiles.length;
    } else {
      this.totalHostilesSpawned = 0;
    }

    const civCount = enc.civiliansCount ?? 0;
    if (carriedCivs.length === 0 && civCount > 0) {
      for (let i = 0; i < civCount; i++) {
        const angle = (i / Math.max(1, civCount)) * Math.PI * 2;
        const cx = stage.targetX + Math.cos(angle) * 2.2;
        const cz = stage.targetZ + Math.sin(angle) * 2.2;
        this.spawnCivilian(`civ_${i}`, cx, cz, Boolean(enc.vipMode), physics);
      }
      this.totalCiviliansSpawned = this.civilians.length;
    } else {
      this.totalCiviliansSpawned = this.civilians.length;
    }
  }

  private spawnClue(
    id: string,
    x: number,
    z: number,
    labelEn: string,
    labelBn: string,
    physics: PhysicsWorld
  ): void {
    const root = new THREE.Group();
    const y = physics.getGroundHeightAt(x, z);
    root.position.set(x, y, z);

    const isHeistLoot = id.includes('heist') || id.includes('cipher');
    const accent = isHeistLoot ? 0xf59e0b : 0x0284c7;
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.44, 0.42),
      new THREE.MeshStandardMaterial({
        color: isHeistLoot ? 0x1e293b : 0x0f172a,
        emissive: accent,
        emissiveIntensity: 0.9,
        roughness: 0.3,
        metalness: 0.6,
      })
    );
    crate.position.y = 0.28;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 1.15, 22),
      new THREE.MeshBasicMaterial({
        color: isHeistLoot ? 0xfbbf24 : 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      })
    );
    ring.rotation.x = -Math.PI * 0.5;
    ring.position.y = 0.08;

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.32, 3.2, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: isHeistLoot ? 0xfbbf24 : 0x38bdf8,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    beam.position.y = 1.6;

    root.add(crate, ring, beam);
    this.group.add(root);
    this.clues.push({ id, labelEn, labelBn, x, z, root, ring, found: false });
  }

  private spawnHostile(
    id: string,
    rawX: number,
    rawZ: number,
    isBoss: boolean,
    nameEn: string,
    nameBn: string,
    physics: PhysicsWorld
  ): void {
    physics.resolveCircleStatic(rawX, rawZ, 0.6, _resolved);
    const x = _resolved.x;
    const z = _resolved.z;
    const y = physics.getGroundHeightAt(x, z);

    const scale = isBoss ? 1.12 : 1.0;
    const trimColor = isBoss ? 0xf59e0b : 0xef4444;

    const rig = buildRealisticHumanRig(this.shadowTex, {
      skinHex: 0xa66d4a,
      hairHex: 0x121318,
      hasJacket: true,
      jacketHex: isBoss ? 0x991b1b : 0x1e293b,
      shirtHex: isBoss ? 0xf59e0b : 0x7f1d1d,
      pantsHex: 0x111827,
      shoeHex: 0x090d14,
      hasVest: true,
      vestHex: isBoss ? 0x7f1d1d : 0x334155,
      hasSunglasses: true,
      scale,
      castShadow: true,
    });

    // Equip 3D rifle on boss/enforcers so shootouts look authentic
    const gun = buildWeaponMesh(isBoss ? 'rifle' : 'smg');
    rig.weaponSocket.add(gun);
    rig.root.position.set(x, y, z);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 0.82, 18),
      new THREE.MeshBasicMaterial({ color: trimColor, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI * 0.5;
    ring.position.y = 0.06;

    const hpBg = new THREE.Mesh(
      new THREE.BoxGeometry(0.84, 0.09, 0.04),
      new THREE.MeshBasicMaterial({ color: 0x0f172a })
    );
    hpBg.position.y = 2.1 * scale;
    const hpBarFill = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.07, 0.05),
      new THREE.MeshBasicMaterial({ color: isBoss ? 0xf59e0b : 0xef4444 })
    );
    hpBarFill.position.y = 2.1 * scale;

    rig.root.add(ring, hpBg, hpBarFill);
    this.group.add(rig.root);

    const maxHp = isBoss ? 240 : 100;
    this.hostiles.push({
      id,
      x,
      z,
      hp: maxHp,
      maxHp,
      isBoss,
      nameEn,
      nameBn,
      rig,
      hpBarFill,
      hpBg,
      ring,
      anchorX: x,
      anchorZ: z,
      yaw: 0,
      phase: Math.random() * 6,
      attackCooldown: 1.4,
      alive: true,
      deathTimer: 0,
    });
  }

  private spawnCivilian(
    id: string,
    rawX: number,
    rawZ: number,
    vip: boolean,
    physics: PhysicsWorld
  ): void {
    physics.resolveCircleStatic(rawX, rawZ, 0.5, _resolved);
    const x = _resolved.x;
    const z = _resolved.z;
    const y = physics.getGroundHeightAt(x, z);

    const rig = buildRealisticHumanRig(this.shadowTex, {
      skinHex: 0xba825c,
      hairHex: 0x18181b,
      hasJacket: vip,
      jacketHex: vip ? 0x1e293b : 0x10b981,
      shirtHex: vip ? 0xf59e0b : 0x10b981,
      pantsHex: 0x334155,
      shoeHex: 0xe2e8f0,
      hasSunglasses: vip,
      scale: vip ? 1.0 : 0.96,
      castShadow: true,
    });
    rig.root.position.set(x, y, z);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.58, 0.78, 18),
      new THREE.MeshBasicMaterial({ color: vip ? 0xfbbf24 : 0x34d399, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI * 0.5;
    ring.position.y = 0.06;

    rig.root.add(ring);
    this.group.add(rig.root);

    this.civilians.push({
      id,
      rig,
      ring,
      x,
      z,
      yaw: 0,
      phase: Math.random() * 5,
      vip,
      following: false,
      inVehicle: false,
      extracted: false,
      harmed: false,
    });
  }

  public getShootableTargets(): ShootableTarget[] {
    const out: ShootableTarget[] = [];
    for (const h of this.hostiles) {
      if (!h.alive || !h.rig.root.visible) continue;
      const scale = h.isBoss ? 1.12 : 1.0;
      out.push({
        kind: 'hostile',
        id: h.id,
        x: h.x,
        y: h.rig.root.position.y,
        z: h.z,
        radius: 0.48 * scale,
        height: 1.76 * scale,
        headY: 1.58 * scale,
      });
    }
    return out;
  }

  public findNearestClue(
    px: number,
    pz: number,
    maxDist = 3.4
  ): { id: string; labelEn: string; labelBn: string; distance: number } | null {
    let best: ClueNode | null = null;
    let bestDistSq = maxDist * maxDist;
    for (const c of this.clues) {
      if (c.found) continue;
      const dx = c.x - px;
      const dz = c.z - pz;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        best = c;
      }
    }
    if (!best) return null;
    return { id: best.id, labelEn: best.labelEn, labelBn: best.labelBn, distance: Math.sqrt(bestDistSq) };
  }

  public inspectClue(clueId: string): boolean {
    const clue = this.clues.find((c) => c.id === clueId && !c.found);
    if (!clue) return false;
    clue.found = true;
    clue.root.visible = false;
    this.totalCluesFoundThisMission += 1;
    return true;
  }

  public findNearestHostile(px: number, pz: number, maxDist = 11.5): (HostileTarget & { distance: number }) | null {
    let best: HostileActor | null = null;
    let bestDistSq = maxDist * maxDist;
    for (const h of this.hostiles) {
      if (!h.alive) continue;
      const dx = h.x - px;
      const dz = h.z - pz;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        best = h;
      }
    }
    if (!best) return null;
    return {
      id: best.id,
      x: best.x,
      z: best.z,
      hp: best.hp,
      maxHp: best.maxHp,
      isBoss: best.isBoss,
      nameEn: best.nameEn,
      nameBn: best.nameBn,
      distance: Math.sqrt(bestDistSq),
    };
  }

  public getAliveHostiles(): HostileTarget[] {
    return this.hostiles
      .filter((h) => h.alive)
      .map((h) => ({
        id: h.id,
        x: h.x,
        z: h.z,
        hp: h.hp,
        maxHp: h.maxHp,
        isBoss: h.isBoss,
        nameEn: h.nameEn,
        nameBn: h.nameBn,
      }));
  }

  public getCivilianPositions(): Array<{ x: number; z: number; escorted: boolean }> {
    return this.civilians
      .filter((c) => !c.extracted && !c.harmed)
      .map((c) => ({ x: c.x, z: c.z, escorted: c.following || c.inVehicle }));
  }

  public damageHostile(
    hostileId: string,
    amount: number,
    fromX?: number,
    fromZ?: number
  ): { neutralized: boolean; isBoss: boolean } {
    const h = this.hostiles.find((it) => it.id === hostileId && it.alive);
    if (!h) return { neutralized: false, isBoss: false };

    h.hp = Math.max(0, h.hp - amount);
    const ratio = Math.max(0.02, h.hp / h.maxHp);
    h.hpBarFill.scale.x = ratio;

    if (fromX !== undefined && fromZ !== undefined) {
      this.spawnPulseBeam(fromX, fromZ, h.x, h.z);
    }

    if (h.hp <= 0) {
      h.alive = false;
      h.deathTimer = 4.0;
      // Dramatic GTA knock-down collapse onto the ground!
      h.rig.bodyPivot.rotation.x = Math.PI * 0.48;
      h.rig.bodyPivot.position.y = 0.24;
      h.hpBg.visible = false;
      h.hpBarFill.visible = false;
      h.ring.visible = false;
      this.totalNeutralizedThisMission += 1;
      return { neutralized: true, isBoss: h.isBoss };
    }
    return { neutralized: false, isBoss: h.isBoss };
  }

  private spawnPulseBeam(ax: number, az: number, bx: number, bz: number): void {
    if (this.pulseBeam) {
      this.pulseBeam.geometry.dispose();
      (this.pulseBeam.material as THREE.Material).dispose();
      this.group.remove(this.pulseBeam);
      this.pulseBeam = null;
    }
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.max(0.4, Math.hypot(dx, dz));
    const geo = new THREE.BoxGeometry(0.08, 0.08, len);
    const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((ax + bx) * 0.5, 1.3, (az + bz) * 0.5);
    mesh.rotation.y = Math.atan2(dx, dz);
    this.group.add(mesh);
    this.pulseBeam = mesh;
    this.pulseTimer = 0.14;
  }

  public getStatus(): EncounterRuntimeStatus {
    const hostilesRemaining = this.hostiles.filter((h) => h.alive).length;
    const cluesFound = this.clues.filter((c) => c.found).length;
    const civHarmed = this.civilians.filter((c) => c.harmed).length;
    const civSafe = this.civilians.filter((c) => !c.harmed).length;
    const activeCivs = this.civilians.filter((c) => !c.harmed);
    const allAtExtract =
      activeCivs.length > 0 &&
      activeCivs.every(
        (c) =>
          c.extracted ||
          Math.hypot(c.x - this.extractX, c.z - this.extractZ) < 11.5
      );

    return {
      civiliansSafe: civSafe,
      civiliansTotal: this.totalCiviliansSpawned,
      civiliansHarmed: civHarmed,
      civiliansAtExtract: allAtExtract,
      hostilesRemaining,
      hostilesTotal: this.totalHostilesSpawned,
      cluesFound,
      cluesTotal: this.totalCluesSpawned,
    };
  }

  public getMiniMapData(): {
    hostiles: Array<{ x: number; z: number; isBoss: boolean }>;
    civilians: Array<{ x: number; z: number; escorted: boolean }>;
  } {
    return {
      hostiles: this.hostiles
        .filter((h) => h.alive)
        .map((h) => ({ x: h.x, z: h.z, isBoss: h.isBoss })),
      civilians: this.getCivilianPositions(),
    };
  }

  public update(
    dt: number,
    playerX: number,
    playerZ: number,
    playerInVehicle: boolean,
    playerVehicleSpeed: number,
    physics: PhysicsWorld
  ): {
    playerDamageTaken: number;
    civilianJustHarmed: boolean;
    enemyShots: Array<{ fromX: number; fromY: number; fromZ: number }>;
  } {
    this.animTime += dt;
    let playerDamageTaken = 0;
    let civilianJustHarmed = false;
    const enemyShots: Array<{ fromX: number; fromY: number; fromZ: number }> = [];

    if (this.pulseBeam) {
      this.pulseTimer -= dt;
      if (this.pulseTimer <= 0) {
        this.pulseBeam.geometry.dispose();
        (this.pulseBeam.material as THREE.Material).dispose();
        this.group.remove(this.pulseBeam);
        this.pulseBeam = null;
      }
    }

    for (const c of this.clues) {
      if (c.found) continue;
      c.ring.rotation.z += dt * 1.8;
    }

    let aliveHostiles = 0;
    for (const h of this.hostiles) {
      if (!h.alive) {
        if (h.deathTimer > 0) {
          h.deathTimer -= dt;
          if (h.deathTimer <= 0) {
            h.rig.root.visible = false;
          }
        }
        continue;
      }
      aliveHostiles++;
      h.attackCooldown = Math.max(0, h.attackCooldown - dt);

      const dx = playerX - h.x;
      const dz = playerZ - h.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 32) {
        const targetYaw = Math.atan2(dx, dz);
        h.yaw = targetYaw;
        h.rig.root.rotation.y = targetYaw;

        // Raise weapon arm into aiming stance during combat!
        h.rig.rightArmPivot.rotation.x = THREE.MathUtils.damp(h.rig.rightArmPivot.rotation.x, -1.5, 12, dt);
        h.rig.leftArmPivot.rotation.x = THREE.MathUtils.damp(h.rig.leftArmPivot.rotation.x, -1.25, 12, dt);

        if (dist > 6.5) {
          const moveSpd = h.isBoss ? 3.2 : 2.7;
          const nx = h.x + Math.sin(targetYaw) * moveSpd * dt;
          const nz = h.z + Math.cos(targetYaw) * moveSpd * dt;
          physics.resolveCircleStatic(nx, nz, 0.55, _resolved);
          h.x = _resolved.x;
          h.z = _resolved.z;
          h.phase += dt * 7.5;
          const swing = Math.sin(h.phase) * 0.5;
          h.rig.leftLegPivot.rotation.x = swing;
          h.rig.rightLegPivot.rotation.x = -swing;
          h.rig.leftShinPivot.rotation.x = Math.max(0, -swing * 0.65 + 0.1);
          h.rig.rightShinPivot.rotation.x = Math.max(0, swing * 0.65 + 0.1);
        } else {
          h.rig.leftLegPivot.rotation.x = 0;
          h.rig.rightLegPivot.rotation.x = 0;
        }

        // Fire visible enemy tracer shots when in gunfight range
        if (dist < 24 && h.attackCooldown <= 0) {
          playerDamageTaken += h.isBoss ? 7 : 4;
          h.attackCooldown = h.isBoss ? 1.85 : 2.35;
          enemyShots.push({
            fromX: h.x,
            fromY: h.rig.root.position.y + 1.38,
            fromZ: h.z,
          });
        }
      } else {
        h.rig.rightArmPivot.rotation.x = THREE.MathUtils.damp(h.rig.rightArmPivot.rotation.x, -0.3, 8, dt);
        h.rig.leftArmPivot.rotation.x = THREE.MathUtils.damp(h.rig.leftArmPivot.rotation.x, 0.05, 8, dt);
        const pAngle = this.animTime * 0.7 + h.phase;
        const tx = h.anchorX + Math.cos(pAngle) * 2.4;
        const tz = h.anchorZ + Math.sin(pAngle) * 2.4;
        const pdx = tx - h.x;
        const pdz = tz - h.z;
        if (Math.hypot(pdx, pdz) > 0.25) {
          const pyaw = Math.atan2(pdx, pdz);
          h.x += Math.sin(pyaw) * 1.4 * dt;
          h.z += Math.cos(pyaw) * 1.4 * dt;
          h.rig.root.rotation.y = pyaw;
        }
      }

      const hy = physics.getGroundHeightAt(h.x, h.z);
      h.rig.root.position.set(h.x, hy, h.z);
    }

    for (let i = 0; i < this.civilians.length; i++) {
      const c = this.civilians[i];
      if (c.extracted || c.harmed) continue;

      const distToPlayer = Math.hypot(playerX - c.x, playerZ - c.z);

      if (playerInVehicle && !c.inVehicle && playerVehicleSpeed > 11 && distToPlayer < 2.2) {
        c.harmed = true;
        c.rig.root.visible = false;
        civilianJustHarmed = true;
        continue;
      }

      if (!c.following && distToPlayer < 12 && (aliveHostiles === 0 || c.vip)) {
        c.following = true;
      }

      if (c.following && playerInVehicle) {
        if (!c.inVehicle && distToPlayer < 16) {
          c.inVehicle = true;
          c.rig.root.visible = false;
        }
        if (c.inVehicle) {
          c.x = playerX;
          c.z = playerZ;
        }
      } else if (c.inVehicle && !playerInVehicle) {
        c.inVehicle = false;
        c.x = playerX + (i % 2 === 0 ? 1.8 : -1.8);
        c.z = playerZ + 1.4;
        physics.resolveCircleStatic(c.x, c.z, 0.45, _resolved);
        c.x = _resolved.x;
        c.z = _resolved.z;
        c.rig.root.visible = true;
      }

      if (!c.inVehicle) {
        const distToExtract = Math.hypot(this.extractX - c.x, this.extractZ - c.z);
        if (this.hasExtractTarget && c.following && distToExtract < 15) {
          if (distToExtract < 3.5) {
            c.extracted = true;
            c.rig.root.visible = false;
            continue;
          }
          const exYaw = Math.atan2(this.extractX - c.x, this.extractZ - c.z);
          c.x += Math.sin(exYaw) * 4.4 * dt;
          c.z += Math.cos(exYaw) * 4.4 * dt;
          c.rig.root.rotation.y = exYaw;
          c.phase += dt * 9;
          const sw = Math.sin(c.phase) * 0.5;
          c.rig.leftLegPivot.rotation.x = sw;
          c.rig.rightLegPivot.rotation.x = -sw;
        } else if (c.following) {
          const offsetAngle = i * 1.3 + 2.4;
          const targetX = playerX + Math.cos(offsetAngle) * 2.6;
          const targetZ = playerZ + Math.sin(offsetAngle) * 2.6;
          const fdx = targetX - c.x;
          const fdz = targetZ - c.z;
          const fDist = Math.hypot(fdx, fdz);
          if (fDist > 36) {
            c.x = targetX;
            c.z = targetZ;
          } else if (fDist > 1.2) {
            const fyaw = Math.atan2(fdx, fdz);
            const spd = fDist > 7 ? 5.6 : 3.7;
            const nx = c.x + Math.sin(fyaw) * spd * dt;
            const nz = c.z + Math.cos(fyaw) * spd * dt;
            physics.resolveCircleStatic(nx, nz, 0.45, _resolved);
            c.x = _resolved.x;
            c.z = _resolved.z;
            c.rig.root.rotation.y = fyaw;
            c.phase += dt * 8.5;
            const sw = Math.sin(c.phase) * 0.48;
            c.rig.leftLegPivot.rotation.x = sw;
            c.rig.rightLegPivot.rotation.x = -sw;
          } else {
            c.rig.leftLegPivot.rotation.x = 0;
            c.rig.rightLegPivot.rotation.x = 0;
          }
        }
        const cy = physics.getGroundHeightAt(c.x, c.z);
        c.rig.root.position.set(c.x, cy, c.z);
      } else if (this.hasExtractTarget) {
        const distToExtract = Math.hypot(this.extractX - c.x, this.extractZ - c.z);
        if (distToExtract < 9.5) {
          c.extracted = true;
          c.inVehicle = false;
          c.rig.root.visible = false;
        }
      }
    }

    return { playerDamageTaken, civilianJustHarmed, enemyShots };
  }

  public consumeMissionTotals(): { neutralized: number; cluesFound: number } {
    const out = {
      neutralized: this.totalNeutralizedThisMission,
      cluesFound: this.totalCluesFoundThisMission,
    };
    this.totalNeutralizedThisMission = 0;
    this.totalCluesFoundThisMission = 0;
    return out;
  }

  private disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material?.dispose();
      }
    });
    this.group.remove(obj);
  }

  private clearHostilesAndClues(): void {
    for (const h of this.hostiles) this.disposeObject(h.rig.root);
    for (const c of this.clues) this.disposeObject(c.root);
    this.hostiles = [];
    this.clues = [];
  }

  private clearCivilians(): void {
    for (const c of this.civilians) this.disposeObject(c.rig.root);
    this.civilians = [];
  }

  public clearEncounter(): void {
    this.clearHostilesAndClues();
    this.clearCivilians();
    if (this.pulseBeam) {
      this.disposeObject(this.pulseBeam);
      this.pulseBeam = null;
    }
    this.totalCiviliansSpawned = 0;
    this.totalHostilesSpawned = 0;
    this.totalCluesSpawned = 0;
    this.hasExtractTarget = false;
  }
}
