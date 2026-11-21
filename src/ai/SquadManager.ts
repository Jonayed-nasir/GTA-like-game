import * as THREE from 'three';
import { PhysicsWorld } from '../core/PhysicsWorld';
import {
  ArticulatedHumanRig,
  buildRealisticHumanRig,
  buildWeaponMesh,
} from '../entities/HumanRigBuilder';
import { SquadCommand, SquadMemberSnapshot } from '../types/game';
import { SpecialOpsEncounterManager } from './SpecialOpsEncounterManager';

interface SquadCompanion {
  id: string;
  callsignEn: string;
  callsignBn: string;
  roleEn: string;
  roleBn: string;
  vestHex: number;
  isMedic: boolean;
  rig: ArticulatedHumanRig;
  x: number;
  z: number;
  yaw: number;
  phase: number;
  health: number;
  maxHealth: number;
  inVehicle: boolean;
  fireCooldown: number;
  statusEn: string;
  statusBn: string;
  holdX: number;
  holdZ: number;
}

const _resolved = { x: 0, z: 0 };

/**
 * 3-Member Dhaka Special Operations AI Squad (forming a 4-member tactical team with the player):
 * - Sgt. Hasan (Assault — Tactical Rifle)
 * - Cpl. Rafi (Support — Assault Rifle)
 * - Medic Nabila (Field Medic — SMG + Automatic Healing)
 * Supports all 5 commands: follow, hold, objective, regroup, protect.
 */
export class SquadManager {
  public readonly group = new THREE.Group();
  public active = false;
  public command: SquadCommand = 'follow';

  private members: SquadCompanion[] = [];
  private tracers: Array<{ mesh: THREE.Mesh; life: number }> = [];

  constructor(shadowTex: THREE.Texture) {
    const specs = [
      {
        id: 'squad_hasan',
        callsignEn: 'Sgt. Hasan',
        callsignBn: 'সার্জেন্ট হাসান',
        roleEn: 'Assault',
        roleBn: 'অ্যাসল্ট',
        vestHex: 0x0284c7,
        isMedic: false,
        female: false,
        weapon: 'rifle' as const,
      },
      {
        id: 'squad_rafi',
        callsignEn: 'Cpl. Rafi',
        callsignBn: 'কর্পোরাল রাফি',
        roleEn: 'Support',
        roleBn: 'সাপোর্ট',
        vestHex: 0x1d4ed8,
        isMedic: false,
        female: false,
        weapon: 'rifle' as const,
      },
      {
        id: 'squad_nabila',
        callsignEn: 'Medic Nabila',
        callsignBn: 'মেডিক নাবিলা',
        roleEn: 'Field Medic',
        roleBn: 'ফিল্ড মেডিক',
        vestHex: 0x0f766e,
        isMedic: true,
        female: true,
        weapon: 'smg' as const,
      },
    ];

    for (const s of specs) {
      const rig = buildRealisticHumanRig(shadowTex, {
        skinHex: s.female ? 0xc08a65 : 0xb27b56,
        hairHex: 0x15171d,
        hasJacket: true,
        jacketHex: 0x0f172a,
        shirtHex: s.vestHex,
        pantsHex: 0x0f172a,
        shoeHex: 0x111827,
        hasVest: true,
        vestHex: s.vestHex,
        hasHelmet: !s.female,
        helmetHex: 0x1e293b,
        femaleHair: s.female,
        hasSunglasses: !s.female,
        scale: s.female ? 0.96 : 1.02,
        castShadow: true,
      });

      const weaponMesh = buildWeaponMesh(s.weapon);
      rig.weaponSocket.add(weaponMesh);

      const badgeRing = new THREE.Mesh(
        new THREE.RingGeometry(0.48, 0.62, 16),
        new THREE.MeshBasicMaterial({ color: s.isMedic ? 0x34d399 : 0x38bdf8, side: THREE.DoubleSide })
      );
      badgeRing.rotation.x = -Math.PI * 0.5;
      badgeRing.position.y = 0.05;
      rig.root.add(badgeRing);

      rig.root.visible = false;
      this.group.add(rig.root);

      this.members.push({
        id: s.id,
        callsignEn: s.callsignEn,
        callsignBn: s.callsignBn,
        roleEn: s.roleEn,
        roleBn: s.roleBn,
        vestHex: s.vestHex,
        isMedic: s.isMedic,
        rig,
        x: 38,
        z: 49,
        yaw: 0,
        phase: 0,
        health: 100,
        maxHealth: 100,
        inVehicle: false,
        fireCooldown: 0.8,
        statusEn: 'Standby',
        statusBn: 'প্রস্তুত',
        holdX: 38,
        holdZ: 49,
      });
    }
  }

  public deploy(playerX: number, playerZ: number, physics: PhysicsWorld, initialCommand?: SquadCommand): void {
    this.active = true;
    if (initialCommand) this.command = initialCommand;
    const offsets = [
      [-2.4, -2.0],
      [2.4, -2.0],
      [0, -3.2],
    ];
    for (let i = 0; i < this.members.length; i++) {
      const m = this.members[i];
      physics.resolveCircleStatic(playerX + offsets[i][0], playerZ + offsets[i][1], 0.48, _resolved);
      m.x = _resolved.x;
      m.z = _resolved.z;
      m.holdX = m.x;
      m.holdZ = m.z;
      m.health = m.maxHealth;
      m.inVehicle = false;
      m.rig.root.visible = true;
      const y = physics.getGroundHeightAt(m.x, m.z);
      m.rig.root.position.set(m.x, y, m.z);
      m.statusEn = 'Following';
      m.statusBn = 'অনুসরণ করছে';
    }
  }

  public recall(): void {
    this.active = false;
    for (const m of this.members) {
      m.rig.root.visible = false;
      m.inVehicle = false;
      m.statusEn = 'Standby';
      m.statusBn = 'প্রস্তুত';
    }
    this.clearTracers();
  }

  public setCommand(cmd: SquadCommand, playerX: number, playerZ: number): void {
    this.command = cmd;
    if (cmd === 'hold') {
      for (const m of this.members) {
        m.holdX = m.x;
        m.holdZ = m.z;
      }
    } else if (cmd === 'regroup') {
      for (let i = 0; i < this.members.length; i++) {
        const m = this.members[i];
        m.holdX = playerX + (i - 1) * 2.2;
        m.holdZ = playerZ - 2.0;
      }
    }
  }

  public getSnapshots(): SquadMemberSnapshot[] {
    return this.members.map((m) => ({
      id: m.id,
      callsignEn: m.callsignEn,
      callsignBn: m.callsignBn,
      roleEn: m.roleEn,
      roleBn: m.roleBn,
      health: Math.round(m.health),
      maxHealth: m.maxHealth,
      statusEn: m.statusEn,
      statusBn: m.statusBn,
      inVehicle: m.inVehicle,
    }));
  }

  public getMiniMapPositions(): Array<{ x: number; z: number }> {
    if (!this.active) return [];
    return this.members.map((m) => ({ x: m.x, z: m.z }));
  }

  private spawnTracer(ax: number, az: number, bx: number, bz: number): void {
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.max(0.4, Math.hypot(dx, dz));
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.055, len),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 })
    );
    mesh.position.set((ax + bx) * 0.5, 1.32, (az + bz) * 0.5);
    mesh.rotation.y = Math.atan2(dx, dz);
    this.group.add(mesh);
    this.tracers.push({ mesh, life: 0.14 });
  }

  private clearTracers(): void {
    for (const t of this.tracers) {
      t.mesh.geometry.dispose();
      (t.mesh.material as THREE.Material).dispose();
      this.group.remove(t.mesh);
    }
    this.tracers = [];
  }

  public update(
    dt: number,
    playerX: number,
    playerZ: number,
    playerYaw: number,
    playerInVehicle: boolean,
    insideBuilding: boolean,
    objectiveX: number | null,
    objectiveZ: number | null,
    encounters: SpecialOpsEncounterManager,
    physics: PhysicsWorld
  ): { playerHealDelta: number; hostileNeutralizedCount: number } {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      this.tracers[i].life -= dt;
      if (this.tracers[i].life <= 0) {
        const t = this.tracers[i];
        t.mesh.geometry.dispose();
        (t.mesh.material as THREE.Material).dispose();
        this.group.remove(t.mesh);
        this.tracers.splice(i, 1);
      }
    }

    if (!this.active || insideBuilding) {
      for (const m of this.members) m.rig.root.visible = false;
      return { playerHealDelta: 0, hostileNeutralizedCount: 0 };
    }

    let playerHealDelta = 0;
    let hostileNeutralizedCount = 0;
    const hostiles = encounters.getAliveHostiles();
    const civs = encounters.getCivilianPositions();

    const formationOffsets = [
      { side: -2.2, back: -2.4 },
      { side: 2.2, back: -2.4 },
      { side: 0, back: -3.6 },
    ];

    for (let i = 0; i < this.members.length; i++) {
      const m = this.members[i];
      m.fireCooldown = Math.max(0, m.fireCooldown - dt);
      m.health = Math.min(m.maxHealth, m.health + dt * 2.2);

      if (playerInVehicle) {
        if (!m.inVehicle) {
          m.inVehicle = true;
          m.rig.root.visible = false;
        }
        m.x = playerX;
        m.z = playerZ;
        m.statusEn = 'In Vehicle';
        m.statusBn = 'গাড়িতে আছে';
        continue;
      } else if (m.inVehicle) {
        m.inVehicle = false;
        const sideSign = i % 2 === 0 ? -1 : 1;
        physics.resolveCircleStatic(playerX + sideSign * (2.1 + i * 0.5), playerZ - 1.8, 0.45, _resolved);
        m.x = _resolved.x;
        m.z = _resolved.z;
        m.rig.root.visible = true;
      } else {
        m.rig.root.visible = true;
      }

      if (m.isMedic && Math.hypot(playerX - m.x, playerZ - m.z) < 8.5) {
        playerHealDelta += dt * 3.0;
      }

      let targetX = playerX;
      let targetZ = playerZ;
      const off = formationOffsets[i];
      const sinY = Math.sin(playerYaw);
      const cosY = Math.cos(playerYaw);
      const formX = playerX + cosY * off.side + sinY * off.back;
      const formZ = playerZ - sinY * off.side + cosY * off.back;

      if (this.command === 'hold') {
        targetX = m.holdX;
        targetZ = m.holdZ;
        m.statusEn = 'Holding';
        m.statusBn = 'অবস্থানে স্থির';
      } else if (this.command === 'objective' && objectiveX !== null && objectiveZ !== null) {
        targetX = objectiveX + (i - 1) * 2.5;
        targetZ = objectiveZ + (i === 2 ? 2.5 : -1.5);
        m.statusEn = 'Advancing';
        m.statusBn = 'লক্ষ্যে অগ্রসর';
      } else if (this.command === 'protect' && civs.length > 0) {
        const c = civs[i % civs.length];
        targetX = c.x + (i - 1) * 2.1;
        targetZ = c.z + 1.8;
        m.statusEn = 'Protecting';
        m.statusBn = 'সুরক্ষা দিচ্ছে';
      } else if (this.command === 'regroup') {
        targetX = formX;
        targetZ = formZ;
        m.statusEn = 'Regrouping';
        m.statusBn = 'একত্রিত হচ্ছে';
      } else {
        targetX = formX;
        targetZ = formZ;
        m.statusEn = 'Following';
        m.statusBn = 'অনুসরণ করছে';
      }

      let nearestHostile = null as (typeof hostiles)[number] | null;
      let bestHDist = 26;
      for (const h of hostiles) {
        const d = Math.hypot(h.x - m.x, h.z - m.z);
        if (d < bestHDist) {
          bestHDist = d;
          nearestHostile = h;
        }
      }

      if (nearestHostile) {
        m.statusEn = 'Engaging';
        m.statusBn = 'অভিযানে সক্রিয়';
        if (m.fireCooldown <= 0 && bestHDist < 24) {
          const dmg = m.isMedic ? 16 : 24;
          const res = encounters.damageHostile(nearestHostile.id, dmg);
          this.spawnTracer(m.x, m.z, nearestHostile.x, nearestHostile.z);
          if (res.neutralized) hostileNeutralizedCount++;
          m.fireCooldown = m.isMedic ? 1.55 : 1.15;
          m.health = Math.max(35, m.health - 3);
        }
      }

      const dx = targetX - m.x;
      const dz = targetZ - m.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 44 && this.command !== 'hold') {
        physics.resolveCircleStatic(formX, formZ, 0.45, _resolved);
        m.x = _resolved.x;
        m.z = _resolved.z;
      } else if (dist > 1.15) {
        const moveYaw = Math.atan2(dx, dz);
        const spd = dist > 9 ? 6.4 : 4.2;
        const nx = m.x + Math.sin(moveYaw) * spd * dt;
        const nz = m.z + Math.cos(moveYaw) * spd * dt;
        physics.resolveCircleStatic(nx, nz, 0.46, _resolved);
        m.x = _resolved.x;
        m.z = _resolved.z;
        m.yaw = nearestHostile ? Math.atan2(nearestHostile.x - m.x, nearestHostile.z - m.z) : moveYaw;
        m.phase += dt * spd * 2.2;
        const swing = Math.sin(m.phase) * 0.52;
        m.rig.leftLegPivot.rotation.x = swing;
        m.rig.rightLegPivot.rotation.x = -swing;
        m.rig.leftShinPivot.rotation.x = Math.max(0, -swing * 0.65 + 0.1);
        m.rig.rightShinPivot.rotation.x = Math.max(0, swing * 0.65 + 0.1);
        m.rig.leftArmPivot.rotation.x = nearestHostile ? -1.3 : -swing * 0.65;
        m.rig.rightArmPivot.rotation.x = nearestHostile ? -1.5 : -0.35 + swing * 0.35;
      } else {
        m.yaw = nearestHostile
          ? Math.atan2(nearestHostile.x - m.x, nearestHostile.z - m.z)
          : playerYaw;
        m.rig.leftLegPivot.rotation.x = THREE.MathUtils.damp(m.rig.leftLegPivot.rotation.x, 0, 10, dt);
        m.rig.rightLegPivot.rotation.x = THREE.MathUtils.damp(m.rig.rightLegPivot.rotation.x, 0, 10, dt);
        m.rig.leftArmPivot.rotation.x = nearestHostile ? -1.3 : 0.02;
        m.rig.rightArmPivot.rotation.x = nearestHostile ? -1.5 : -0.3;
      }

      const my = physics.getGroundHeightAt(m.x, m.z);
      m.rig.root.position.set(m.x, my, m.z);
      m.rig.root.rotation.y = m.yaw;
    }

    return { playerHealDelta, hostileNeutralizedCount };
  }
}
