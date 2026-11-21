import * as THREE from 'three';
import { ShootableTarget } from '../combat/CombatSystem';
import { ArticulatedHumanRig, buildRealisticHumanRig } from '../entities/HumanRigBuilder';
import { NpcDialogueSnapshot, NpcRole } from '../types/game';
import { FootpathLoop, RoadSystem } from '../world/RoadSystem';

interface Pedestrian {
  id: string;
  role: NpcRole;
  nameEn: string;
  nameBn: string;
  roleEn: string;
  roleBn: string;
  lineEn: string;
  lineBn: string;
  rig: ArticulatedHumanRig;
  loop: FootpathLoop;
  edge: number;
  t: number;
  speed: number;
  phase: number;
  dir: 1 | -1;
  panicTimer: number;
  stationary?: boolean;
  health: number;
  downed: boolean;
  respawnTimer: number;
  knockVx: number;
  knockVz: number;
}

const SHIRT_COLORS = [0x0f766e, 0xd97706, 0x2563eb, 0xbe123c, 0xf8fafc, 0x4338ca, 0x15803d, 0xea580c];
const PANTS_COLORS = [0x1e293b, 0x334155, 0x422006, 0x1f2937];
const SKIN_TONES = [0xc28a63, 0xb07852, 0x9b6441, 0xc89572, 0xa86f4c];

const NPC_PROFILES = [
  {
    role: 'civilian' as NpcRole,
    shirtHex: 0x0f766e,
    female: false,
    nameEn: 'Arif',
    nameBn: 'আরিফ',
    roleEn: 'University Student',
    roleBn: 'বিশ্ববিদ্যালয়ের ছাত্র',
    lineEn: 'Brother, traffic near Gulshan Circle is wild today! Try taking a CNG or bike.',
    lineBn: 'ভাই, আজ গুলশান সার্কেলে জ্যাম খুব! সিএনজি বা বাইক নিলে দ্রুত যেতে পারবেন।',
  },
  {
    role: 'civilian' as NpcRole,
    shirtHex: 0x2563eb,
    female: true,
    nameEn: 'Farzana',
    nameBn: 'ফারজানা',
    roleEn: 'Office Executive',
    roleBn: 'অফিস এক্সিকিউটিভ',
    lineEn: 'Have you seen Hatirjheel Bridge after sunset? The blue arches look incredible.',
    lineBn: 'সন্ধ্যার পর হাতিরঝিল ব্রিজ দেখেছেন? নীল আলোয় অসাধারণ লাগে!',
  },
  {
    role: 'shopkeeper' as NpcRole,
    shirtHex: 0xd97706,
    female: false,
    nameEn: 'Kamal',
    nameBn: 'কামাল',
    roleEn: 'Street Vendor',
    roleBn: 'ব্যবসায়ী',
    lineEn: 'Royal Biryani right on the corner has the best Kacchi in Gulshan!',
    lineBn: 'কোণার রয়েল বিরিয়ানিতে গুলশানের সেরা কাচ্চি পাওয়া যায়!',
  },
  {
    role: 'police_officer' as NpcRole,
    shirtHex: 0x1d4ed8,
    female: false,
    nameEn: 'SI Mahmud',
    nameBn: 'এসআই মাহমুদ',
    roleEn: 'DMP Patrol Officer',
    roleBn: 'ডিএমপি পুলিশ অফিসার',
    lineEn: 'Keep the avenues safe, citizen. Special Ops HQ on the southeast block coordinates city rescues.',
    lineBn: 'সড়কে নিরাপত্তা বজায় রাখুন। দক্ষিণ-পূর্ব ব্লকে স্পেশাল অপস হেডকোয়ার্টার থেকে উদ্ধার অভিযান চলে।',
  },
  {
    role: 'medical' as NpcRole,
    shirtHex: 0xf8fafc,
    female: true,
    nameEn: 'Nurse Rina',
    nameBn: 'নার্স রিনা',
    roleEn: 'Gulshan Care Paramedic',
    roleBn: 'প্যারামেডিক',
    lineEn: 'Gulshan Care Hospital is open 24/7 if you ever need emergency medical attention.',
    lineBn: 'জরুরি চিকিৎসার প্রয়োজন হলে গুলশান কেয়ার হাসপাতাল ২৪ ঘণ্টা খোলা আছে।',
  },
  {
    role: 'security' as NpcRole,
    shirtHex: 0x475569,
    female: false,
    nameEn: 'Guard Rashid',
    nameBn: 'গার্ড রশিদ',
    roleEn: 'Plaza Security',
    roleBn: 'প্লাজা নিরাপত্তা কর্মী',
    lineEn: 'Word is the Iron Syndicate has been stirring trouble under Mohakhali Flyover. Stay alert!',
    lineBn: 'মহাখালী ফ্লাইওভারের নিচে আয়রন সিন্ডিকেটের আনাগোনা বেড়েছে—সতর্ক থাকবেন!',
  },
];

export class NPCManager {
  public readonly group = new THREE.Group();
  private peds: Pedestrian[] = [];

  constructor(roadSystem: RoadSystem, shadowTex: THREE.Texture) {
    const loops = roadSystem.footpathLoops;
    const count = 18;

    for (let i = 0; i < count; i++) {
      const loop = loops[i % loops.length];
      const profile = NPC_PROFILES[i % NPC_PROFILES.length];
      const isOfficer = profile.role === 'police_officer' || profile.role === 'security';

      const rig = buildRealisticHumanRig(shadowTex, {
        skinHex: SKIN_TONES[i % SKIN_TONES.length],
        hairHex: 0x16171d,
        hasJacket: isOfficer || i % 3 === 0,
        jacketHex: profile.shirtHex ?? SHIRT_COLORS[i % SHIRT_COLORS.length],
        shirtHex: isOfficer ? 0xe2e8f0 : profile.shirtHex ?? SHIRT_COLORS[i % SHIRT_COLORS.length],
        pantsHex: isOfficer ? 0x0f172a : PANTS_COLORS[i % PANTS_COLORS.length],
        shoeHex: isOfficer ? 0x111827 : 0xe2e8f0,
        hasCap: profile.role === 'police_officer',
        capHex: 0x1e3a8a,
        hasVest: profile.role === 'police_officer',
        vestHex: 0x1e293b,
        femaleHair: profile.female,
        hasSunglasses: i % 5 === 0,
        scale: profile.female ? 0.94 : 0.98 + (i % 3) * 0.03,
        castShadow: true,
      });

      const ped: Pedestrian = {
        id: `npc_${i}`,
        role: profile.role,
        nameEn: profile.nameEn,
        nameBn: profile.nameBn,
        roleEn: profile.roleEn,
        roleBn: profile.roleBn,
        lineEn: profile.lineEn,
        lineBn: profile.lineBn,
        rig,
        loop,
        edge: i % 4,
        t: (i * 0.23) % 1,
        speed: 1.45 + (i % 4) * 0.24,
        phase: i * 1.3,
        dir: i % 2 === 0 ? 1 : -1,
        panicTimer: 0,
        health: isOfficer ? 100 : 65,
        downed: false,
        respawnTimer: 0,
        knockVx: 0,
        knockVz: 0,
      };
      this.positionPedestrian(ped);
      this.group.add(rig.root);
      this.peds.push(ped);
    }

    // Stationed Special Operations HQ Entrance Officer at (35.8, 48.0)
    const officerRig = buildRealisticHumanRig(shadowTex, {
      skinHex: 0xb27b56,
      hairHex: 0x16171d,
      hasJacket: true,
      jacketHex: 0x0f172a,
      shirtHex: 0x0284c7,
      pantsHex: 0x0f172a,
      shoeHex: 0x090d14,
      hasCap: true,
      capHex: 0x0284c7,
      hasVest: true,
      vestHex: 0x0f172a,
      hasSunglasses: true,
      scale: 1.02,
      castShadow: true,
    });
    officerRig.root.position.set(35.8, 0.18, 48.0);
    this.group.add(officerRig.root);
    this.peds.push({
      id: 'npc_specops_gate',
      role: 'spec_ops_officer',
      nameEn: 'Capt. Imran',
      nameBn: 'ক্যাপ্টেন ইমরান',
      roleEn: 'Special Ops Duty Officer',
      roleBn: 'স্পেশাল অপস ডিউটি অফিসার',
      lineEn: 'Step inside Special Ops HQ to brief with Major Tariq, launch rescue operations, or equip tactical gear!',
      lineBn: 'ভেতরে স্পেশাল অপস হেডকোয়ার্টারে যান—মেজর তারিকের ব্রিফিং নিন এবং রেসকিউ অপারেশন শুরু করুন!',
      rig: officerRig,
      loop: loops[0],
      edge: 0,
      t: 0,
      speed: 0,
      phase: 0,
      dir: 1,
      panicTimer: 0,
      stationary: true,
      health: 160,
      downed: false,
      respawnTimer: 0,
      knockVx: 0,
      knockVz: 0,
    });
  }

  public getShootableTargets(): ShootableTarget[] {
    const out: ShootableTarget[] = [];
    for (let i = 0; i < this.peds.length; i++) {
      const p = this.peds[i];
      if (p.downed || !p.rig.root.visible) continue;
      out.push({
        kind: 'npc',
        id: p.id,
        x: p.rig.root.position.x,
        y: p.rig.root.position.y,
        z: p.rig.root.position.z,
        radius: 0.45,
        height: 1.72,
        headY: 1.56,
      });
    }
    return out;
  }

  /**
   * Damages a street NPC via gunfire, punch, or vehicle explosion.
   * Triggers panic among nearby civilians and returns whether the NPC was knocked down & if they were an officer.
   */
  public damageNpc(
    npcId: string,
    damage: number
  ): { downed: boolean; isPolice: boolean; x: number; z: number } {
    const p = this.peds.find((it) => it.id === npcId && !it.downed);
    if (!p) return { downed: false, isPolice: false, x: 0, z: 0 };

    const px = p.rig.root.position.x;
    const pz = p.rig.root.position.z;
    const isPolice = p.role === 'police_officer' || p.role === 'spec_ops_officer';

    p.health -= damage;
    p.panicTimer = 9.0;
    this.triggerNearbyReaction(px, pz, 28);

    if (p.health <= 0) {
      p.downed = true;
      p.respawnTimer = 18.0;
      // Realistic splayed fall-down collapse onto pavement
      p.rig.bodyPivot.rotation.x = Math.PI * 0.48;
      p.rig.bodyPivot.position.y = 0.24;
      p.rig.leftArmPivot.rotation.z = 0.55;
      p.rig.rightArmPivot.rotation.z = -0.62;
      p.rig.leftArmPivot.rotation.x = -0.4;
      p.rig.rightArmPivot.rotation.x = 0.35;
      p.rig.leftLegPivot.rotation.z = 0.18;
      p.rig.rightLegPivot.rotation.z = -0.22;
      return { downed: true, isPolice, x: px, z: pz };
    }
    return { downed: false, isPolice, x: px, z: pz };
  }

  /**
   * Checks if a fast-moving player vehicle collides with street pedestrians and knocks them down.
   */
  public checkVehicleRam(
    vx: number,
    vz: number,
    speed: number,
    vehicleRadius: number,
    dirX: number,
    dirZ: number
  ): { hits: number; hitPolice: boolean; hitX: number; hitZ: number } {
    if (Math.abs(speed) < 4.5) return { hits: 0, hitPolice: false, hitX: 0, hitZ: 0 };
    const hitR = vehicleRadius + 0.65;
    const hitRSq = hitR * hitR;
    let hits = 0;
    let hitPolice = false;
    let hitX = vx;
    let hitZ = vz;

    for (let i = 0; i < this.peds.length; i++) {
      const p = this.peds[i];
      if (p.downed) continue;
      const dx = p.rig.root.position.x - vx;
      const dz = p.rig.root.position.z - vz;
      if (dx * dx + dz * dz < hitRSq) {
        const res = this.damageNpc(p.id, Math.max(70, Math.abs(speed) * 9));
        p.knockVx = dirX * Math.min(14, Math.abs(speed) * 0.65) + (Math.random() - 0.5) * 3;
        p.knockVz = dirZ * Math.min(14, Math.abs(speed) * 0.65) + (Math.random() - 0.5) * 3;
        hits++;
        hitX = res.x;
        hitZ = res.z;
        if (res.isPolice) hitPolice = true;
      }
    }
    return { hits, hitPolice, hitX, hitZ };
  }

  public triggerNearbyReaction(originX: number, originZ: number, radius = 22): void {
    const rSq = radius * radius;
    for (let i = 0; i < this.peds.length; i++) {
      const p = this.peds[i];
      if (p.downed) continue;
      const dx = p.rig.root.position.x - originX;
      const dz = p.rig.root.position.z - originZ;
      if (dx * dx + dz * dz < rSq) {
        p.panicTimer = Math.max(p.panicTimer, 7.5);
        p.dir = p.dir === 1 ? -1 : 1;
      }
    }
  }

  public findNearestNpc(
    px: number,
    pz: number,
    maxDist = 3.2
  ): { id: string; nameEn: string; nameBn: string; distance: number } | null {
    let best: Pedestrian | null = null;
    let bestDistSq = maxDist * maxDist;
    for (let i = 0; i < this.peds.length; i++) {
      const p = this.peds[i];
      if (p.downed) continue;
      const dx = p.rig.root.position.x - px;
      const dz = p.rig.root.position.z - pz;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        best = p;
      }
    }
    if (!best) return null;
    return {
      id: best.id,
      nameEn: best.nameEn,
      nameBn: best.nameBn,
      distance: Math.sqrt(bestDistSq),
    };
  }

  public getDialogueForNpc(npcId: string): NpcDialogueSnapshot | null {
    const p = this.peds.find((it) => it.id === npcId && !it.downed);
    if (!p) return null;
    if (p.panicTimer > 0) {
      return {
        npcId: p.id,
        nameEn: p.nameEn,
        nameBn: p.nameBn,
        roleEn: p.roleEn,
        roleBn: p.roleBn,
        lineEn: 'Whoa! Shots fired—watch out, police are on the way!',
        lineBn: 'আরে! গুলি চলছে—সাবধান, পুলিশ চলে আসছে!',
        mood: 'alert',
      };
    }
    return {
      npcId: p.id,
      nameEn: p.nameEn,
      nameBn: p.nameBn,
      roleEn: p.roleEn,
      roleBn: p.roleBn,
      lineEn: p.lineEn,
      lineBn: p.lineBn,
      mood: 'friendly',
    };
  }

  private positionPedestrian(p: Pedestrian): void {
    const { minX, maxX, minZ, maxZ } = p.loop;
    let x = minX;
    let z = minZ;
    let yaw = 0;

    if (p.edge === 0) {
      x = THREE.MathUtils.lerp(minX, maxX, p.t);
      z = minZ;
      yaw = p.dir === 1 ? Math.PI * 0.5 : -Math.PI * 0.5;
    } else if (p.edge === 1) {
      x = maxX;
      z = THREE.MathUtils.lerp(minZ, maxZ, p.t);
      yaw = p.dir === 1 ? 0 : Math.PI;
    } else if (p.edge === 2) {
      x = THREE.MathUtils.lerp(maxX, minX, p.t);
      z = maxZ;
      yaw = p.dir === 1 ? -Math.PI * 0.5 : Math.PI * 0.5;
    } else {
      x = minX;
      z = THREE.MathUtils.lerp(maxZ, minZ, p.t);
      yaw = p.dir === 1 ? Math.PI : 0;
    }

    p.rig.root.position.set(x, 0.18, z);
    p.rig.root.rotation.y = yaw;
  }

  public update(dt: number, playerX: number, playerZ: number, hornActive = false): void {
    for (let i = 0; i < this.peds.length; i++) {
      const p = this.peds[i];

      if (p.downed) {
        // Slide knocked-down body along pavement briefly
        if (Math.abs(p.knockVx) > 0.08 || Math.abs(p.knockVz) > 0.08) {
          p.rig.root.position.x += p.knockVx * dt;
          p.rig.root.position.z += p.knockVz * dt;
          p.knockVx *= Math.exp(-5.5 * dt);
          p.knockVz *= Math.exp(-5.5 * dt);
        }
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          p.downed = false;
          p.health = p.role === 'police_officer' || p.role === 'spec_ops_officer' ? 100 : 65;
          p.panicTimer = 0;
          p.knockVx = 0;
          p.knockVz = 0;
          p.rig.bodyPivot.rotation.x = 0;
          p.rig.bodyPivot.position.y = 0.92;
          p.rig.leftArmPivot.rotation.z = 0;
          p.rig.rightArmPivot.rotation.z = 0;
          p.rig.leftLegPivot.rotation.z = 0;
          p.rig.rightLegPivot.rotation.z = 0;
          if (!p.stationary) {
            p.t = (p.t + 0.5) % 1;
            this.positionPedestrian(p);
          }
        }
        continue;
      }

      if (p.panicTimer > 0) p.panicTimer = Math.max(0, p.panicTimer - dt);

      const dx = playerX - p.rig.root.position.x;
      const dz = playerZ - p.rig.root.position.z;
      const distSq = dx * dx + dz * dz;

      if (hornActive && distSq < 110) {
        p.panicTimer = Math.max(p.panicTimer, 2.5);
      }

      if (p.stationary) {
        if (distSq < 36) {
          const faceYaw = Math.atan2(dx, dz);
          p.rig.root.rotation.y = THREE.MathUtils.damp(p.rig.root.rotation.y, faceYaw, 7, dt);
        }
        continue;
      }

      if (distSq < 5.2 && p.panicTimer <= 0) {
        const faceYaw = Math.atan2(dx, dz);
        p.rig.root.rotation.y = THREE.MathUtils.damp(p.rig.root.rotation.y, faceYaw, 8, dt);
        p.rig.leftLegPivot.rotation.x = THREE.MathUtils.damp(p.rig.leftLegPivot.rotation.x, 0, 8, dt);
        p.rig.rightLegPivot.rotation.x = THREE.MathUtils.damp(p.rig.rightLegPivot.rotation.x, 0, 8, dt);
        p.rig.leftArmPivot.rotation.x = THREE.MathUtils.damp(p.rig.leftArmPivot.rotation.x, 0, 8, dt);
        p.rig.rightArmPivot.rotation.x = THREE.MathUtils.damp(p.rig.rightArmPivot.rotation.x, 0, 8, dt);
        continue;
      }

      const activeSpeed = p.panicTimer > 0 ? p.speed * 2.35 : p.speed;
      const edgeLen =
        p.edge % 2 === 0 ? p.loop.maxX - p.loop.minX : p.loop.maxZ - p.loop.minZ;
      p.t += ((activeSpeed * dt) / Math.max(edgeLen, 1)) * p.dir;

      if (p.t >= 1) {
        p.t = 0;
        p.edge = (p.edge + 1) % 4;
      } else if (p.t < 0) {
        p.t = 1;
        p.edge = (p.edge + 3) % 4;
      }

      this.positionPedestrian(p);

      p.phase += dt * activeSpeed * 4.4;
      const amp = p.panicTimer > 0 ? 0.68 : 0.42;
      const swing = Math.sin(p.phase) * amp;
      p.rig.leftLegPivot.rotation.x = swing;
      p.rig.rightLegPivot.rotation.x = -swing;
      p.rig.leftShinPivot.rotation.x = Math.max(0, -swing * 0.65 + 0.1);
      p.rig.rightShinPivot.rotation.x = Math.max(0, swing * 0.65 + 0.1);
      // Panic arms raised while running away!
      p.rig.leftArmPivot.rotation.x = p.panicTimer > 0 ? -1.1 + swing * 0.4 : -swing * 0.72;
      p.rig.rightArmPivot.rotation.x = p.panicTimer > 0 ? -1.1 - swing * 0.4 : swing * 0.72;
    }
  }
}
