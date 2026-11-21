import * as THREE from 'three';
import { AABBCollider, EnterableBuildingDef } from '../types/game';
import { WorldBounds } from '../core/PhysicsWorld';
import { createVehicleMesh } from '../vehicles/VehicleFactory';

export interface ActiveInteriorInfo {
  building: EnterableBuildingDef;
  spawnX: number;
  spawnZ: number;
  spawnYaw: number;
  exitX: number;
  exitZ: number;
  counterX: number;
  counterZ: number;
  missionTerminal?: { x: number; z: number };
  armoryStation?: { x: number; z: number };
  bounds: WorldBounds;
  colliders: AABBCollider[];
}

/**
 * Reusable 3D Walk-In Interior Scene Builder & Lifecycle Manager.
 * Loads a dedicated walkable 3D room with lighting, props, and an NPC shopkeeper/host,
 * and disposes all geometry/materials cleanly upon exit to prevent memory leaks.
 */
export class InteriorManager {
  public readonly group = new THREE.Group();
  public activeInterior: ActiveInteriorInfo | null = null;

  private roomGroup: THREE.Group | null = null;
  private npcHead: THREE.Object3D | null = null;
  private animTime = 0;
  private shadowTex: THREE.Texture;

  constructor(shadowTex: THREE.Texture) {
    this.shadowTex = shadowTex;
    this.group.visible = false;
  }

  public enterBuilding(def: EnterableBuildingDef): ActiveInteriorInfo {
    this.unloadRoom();

    const room = new THREE.Group();
    const isSpecOps = def.category === 'spec_ops_hq';
    const isLarge =
      isSpecOps || def.category === 'dealership' || def.category === 'garage' || def.category === 'hotel';
    const halfW = isSpecOps ? 11.5 : isLarge ? 8.5 : 6.2;
    const halfD = isSpecOps ? 11.5 : isLarge ? 8.5 : 6.2;
    const wallH = isSpecOps ? 5.2 : isLarge ? 4.8 : 3.9;

    const palette = this.getPaletteForCategory(def.category);

    // Interior lighting (warm ceiling bounce + key directional inside room)
    const amb = new THREE.HemisphereLight(0xfff5e6, 0x3b3a3a, 1.25);
    room.add(amb);

    const key = new THREE.PointLight(palette.lightColor, 26, 26, 1.4);
    key.position.set(0, wallH - 0.55, 0);
    room.add(key);

    // Floor
    const floorMat = new THREE.MeshStandardMaterial({
      color: palette.floorColor,
      roughness: def.category === 'dealership' || def.category === 'hotel' ? 0.25 : 0.72,
      metalness: def.category === 'dealership' ? 0.25 : 0.05,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2, halfD * 2), floorMat);
    floor.rotation.x = -Math.PI * 0.5;
    floor.receiveShadow = true;
    room.add(floor);

    // Ceiling + recessed LED strip
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0xdbe2ea, roughness: 0.9 });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2, halfD * 2), ceilMat);
    ceiling.rotation.x = Math.PI * 0.5;
    ceiling.position.y = wallH;
    room.add(ceiling);

    const ledMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: palette.lightColor,
      emissiveIntensity: 1.8,
    });
    const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(halfW * 1.1, 0.08, 0.5), ledMat);
    ledStrip.position.set(0, wallH - 0.06, -1);
    room.add(ledStrip);

    // 4 Interior Walls
    const wallMat = new THREE.MeshStandardMaterial({
      color: palette.wallColor,
      roughness: 0.82,
      metalness: 0.04,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: palette.accentHex,
      roughness: 0.45,
      metalness: 0.2,
    });

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2, wallH, 0.35), wallMat);
    backWall.position.set(0, wallH * 0.5, -halfD);
    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2, wallH, 0.35), wallMat);
    frontWall.position.set(0, wallH * 0.5, halfD);
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, wallH, halfD * 2), wallMat);
    leftWall.position.set(-halfW, wallH * 0.5, 0);
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, wallH, halfD * 2), wallMat);
    rightWall.position.set(halfW, wallH * 0.5, 0);
    room.add(backWall, frontWall, leftWall, rightWall);

    // Accent wall trim stripe
    const trim = new THREE.Mesh(new THREE.BoxGeometry(halfW * 1.9, 0.42, 0.08), accentMat);
    trim.position.set(0, wallH * 0.68, -halfD + 0.22);
    room.add(trim);

    // Exit Door Frame & Glowing Green Exit Mat at Z = +halfD - 0.3
    const doorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 2.55, 0.26),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.6 })
    );
    doorFrame.position.set(0, 1.28, halfD - 0.2);
    room.add(doorFrame);

    const exitMat = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 1.15),
      new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 0.55,
        roughness: 0.6,
      })
    );
    exitMat.rotation.x = -Math.PI * 0.5;
    exitMat.position.set(0, 0.02, halfD - 1.15);
    room.add(exitMat);

    // Service Counter / Desk at Z = -halfD + 2.4
    const counterZ = -halfD + 2.5;
    const colliders: AABBCollider[] = [];
    const counterMat = new THREE.MeshStandardMaterial({
      color: 0x2c3442,
      roughness: 0.45,
      metalness: 0.25,
    });
    const counterW = isLarge ? 5.0 : 3.8;
    const counter = new THREE.Mesh(new THREE.BoxGeometry(counterW, 1.05, 1.0), counterMat);
    counter.position.set(0, 0.525, counterZ);
    room.add(counter);

    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(counterW + 0.14, 0.08, 1.12), accentMat);
    counterTop.position.set(0, 1.08, counterZ);
    room.add(counterTop);

    colliders.push({
      id: 'int_counter',
      minX: -counterW * 0.5 - 0.2,
      maxX: counterW * 0.5 + 0.2,
      minZ: counterZ - 0.65,
      maxZ: counterZ + 0.65,
      minY: 0,
      maxY: 2.5,
      tag: 'interior',
    });

    // Animated Shopkeeper / Host NPC behind the counter
    this.npcHead = this.addInteriorNpc(room, 0, counterZ - 1.05, palette.accentHex);

    // Category-specific 3D interior furnishings & props
    this.populateCategoryProps(room, def.category, halfW, halfD, accentMat, colliders);

    this.roomGroup = room;
    this.group.add(room);
    this.group.visible = true;

    const info: ActiveInteriorInfo = {
      building: def,
      spawnX: 0,
      spawnZ: halfD - 2.2,
      spawnYaw: Math.PI, // Facing north into the room
      exitX: 0,
      exitZ: halfD - 1.1,
      counterX: 0,
      counterZ: counterZ + 1.4,
      missionTerminal: isSpecOps ? { x: -6.8, z: -2.4 } : undefined,
      armoryStation: isSpecOps ? { x: 6.8, z: -2.4 } : undefined,
      bounds: {
        minX: -halfW + 0.45,
        maxX: halfW - 0.45,
        minZ: -halfD + 0.45,
        maxZ: halfD - 0.45,
      },
      colliders,
    };
    this.activeInterior = info;
    return info;
  }

  private addInteriorNpc(
    room: THREE.Group,
    x: number,
    z: number,
    shirtHex: number
  ): THREE.Object3D {
    const npc = new THREE.Group();
    npc.position.set(x, 0, z);

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xb67c56, roughness: 0.72 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtHex, roughness: 0.75 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });

    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.86, 0.22), pantsMat);
    legs.position.y = 0.43;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.56, 0.24), shirtMat);
    torso.position.y = 1.14;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), skinMat);
    head.position.y = 1.58;
    const hair = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.09, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.9 })
    );
    hair.position.y = 1.7;

    npc.add(legs, torso, head, hair);
    room.add(npc);
    return head;
  }

  private populateCategoryProps(
    room: THREE.Group,
    category: EnterableBuildingDef['category'],
    halfW: number,
    halfD: number,
    accentMat: THREE.Material,
    colliders: AABBCollider[]
  ): void {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78492a, roughness: 0.78 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.8 });

    if (category === 'spec_ops_hq') {
      const darkSteel = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.38, metalness: 0.65 });
      const cyanHolo = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 1.5,
        roughness: 0.2,
      });
      const amberGlow = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 1.35,
        roughness: 0.25,
      });

      // 1) Central Holographic Dhaka Tactical Briefing Table
      const briefBase = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.92, 2.2), darkSteel);
      briefBase.position.set(0, 0.46, -1.6);
      const briefMap = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 1.85), cyanHolo);
      briefMap.position.set(0, 0.96, -1.6);
      // Mini 3D Dhaka holographic towers on the briefing table
      for (let i = 0; i < 6; i++) {
        const mh = 0.2 + (i % 3) * 0.16;
        const miniTower = new THREE.Mesh(new THREE.BoxGeometry(0.22, mh, 0.22), cyanHolo);
        miniTower.position.set(-1.1 + i * 0.44, 1.0 + mh * 0.5, -1.6 + (i % 2 === 0 ? -0.35 : 0.35));
        room.add(miniTower);
      }
      room.add(briefBase, briefMap);
      colliders.push({
        id: 'hq_briefing_table',
        minX: -2.05,
        maxX: 2.05,
        minZ: -2.85,
        maxZ: -0.35,
        minY: 0,
        maxY: 1.8,
        tag: 'interior',
      });

      // 2) Left Wing: Operations Control Room (Multi-monitor Mission Selection Terminal at x=-6.8, z=-2.4)
      const termDesk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.96, 1.2), darkSteel);
      termDesk.position.set(-7.6, 0.48, -4.4);
      const screenMain = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.15, 0.12), cyanHolo);
      screenMain.position.set(-7.6, 1.65, -4.85);
      const termPad = new THREE.Mesh(
        new THREE.RingGeometry(0.75, 1.15, 22),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
      );
      termPad.rotation.x = -Math.PI * 0.5;
      termPad.position.set(-6.8, 0.03, -2.4);
      room.add(termDesk, screenMain, termPad);
      this.addInteriorNpc(room, -8.8, -3.8, 0x0284c7); // Ops Analyst Officer
      colliders.push({
        id: 'hq_terminal',
        minX: -9.1,
        maxX: -6.1,
        minZ: -5.2,
        maxZ: -3.6,
        minY: 0,
        maxY: 2.5,
        tag: 'interior',
      });

      // 3) Right Wing: Squad Preparation & Tactical Armory (x=+6.8, z=-2.4)
      const armoryCabinet = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.35, 1.0), darkSteel);
      armoryCabinet.position.set(7.6, 1.18, -4.5);
      const armoryTrim = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 0.12), amberGlow);
      armoryTrim.position.set(7.6, 2.1, -3.96);
      const armoryPad = new THREE.Mesh(
        new THREE.RingGeometry(0.75, 1.15, 22),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide })
      );
      armoryPad.rotation.x = -Math.PI * 0.5;
      armoryPad.position.set(6.8, 0.03, -2.4);
      room.add(armoryCabinet, armoryTrim, armoryPad);
      this.addInteriorNpc(room, 8.8, -3.6, 0x0f766e); // Quartermaster Officer
      colliders.push({
        id: 'hq_armory',
        minX: 6.0,
        maxX: 9.2,
        minZ: -5.2,
        maxZ: -3.8,
        minY: 0,
        maxY: 2.6,
        tag: 'interior',
      });

      // 4) Rear-Right Indoor Tactical Vehicle Bay (Display Interceptor SUV)
      const suvRig = createVehicleMesh('suv', 0x0f172a, this.shadowTex);
      suvRig.root.position.set(6.6, 0.1, 4.4);
      suvRig.root.rotation.y = -Math.PI * 0.25;
      room.add(suvRig.root);
      const bayFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(5.2, 6.2),
        new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.45, metalness: 0.35 })
      );
      bayFloor.rotation.x = -Math.PI * 0.5;
      bayFloor.position.set(6.6, 0.02, 4.4);
      room.add(bayFloor);
      colliders.push({
        id: 'hq_bay_suv',
        minX: 4.5,
        maxX: 8.8,
        minZ: 1.9,
        maxZ: 6.9,
        minY: 0,
        maxY: 2.3,
        tag: 'interior',
      });

      // 5) Reception Desk (Left-Front) & Back Wall Mission Results Board
      const recepDesk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 0.95), darkSteel);
      recepDesk.position.set(-6.6, 0.5, 5.2);
      room.add(recepDesk);
      this.addInteriorNpc(room, -6.6, 4.1, 0x1e40af);
      colliders.push({
        id: 'hq_reception',
        minX: -8.3,
        maxX: -4.9,
        minZ: 4.6,
        maxZ: 5.8,
        minY: 0,
        maxY: 2.0,
        tag: 'interior',
      });

      const resultsBoard = new THREE.Mesh(new THREE.BoxGeometry(6.2, 2.2, 0.14), darkSteel);
      resultsBoard.position.set(0, 2.55, -halfD + 0.26);
      const boardScreen = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.85, 0.08), cyanHolo);
      boardScreen.position.set(0, 2.55, -halfD + 0.34);
      room.add(resultsBoard, boardScreen);
      return;
    }

    if (category === 'dealership' || category === 'garage') {
      // Showcase centerpiece vehicle inside the dealership / garage bay!
      const displayKind = category === 'dealership' ? 'sports' : 'sedan';
      const displayColor = category === 'dealership' ? 0xdc2626 : 0x1d4ed8;
      const rig = createVehicleMesh(displayKind, displayColor, this.shadowTex);
      rig.root.position.set(0, 0.16, 0.9);
      rig.root.rotation.y = Math.PI * 0.22;
      room.add(rig.root);

      const podium = new THREE.Mesh(
        new THREE.CylinderGeometry(3.1, 3.3, 0.16, 20),
        new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.35, metalness: 0.5 })
      );
      podium.position.set(0, 0.08, 0.9);
      room.add(podium);

      colliders.push({
        id: 'int_showcar',
        minX: -2.4,
        maxX: 2.4,
        minZ: -1.4,
        maxZ: 3.2,
        minY: 0,
        maxY: 2.2,
        tag: 'interior',
      });
      return;
    }

    if (category === 'clothing') {
      const colors = [0x991b1b, 0x0f172a, 0xd97706, 0x0f766e];
      [-3.8, 3.8].forEach((rx, sIdx) => {
        const rackBar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.75, 4.2), steelMat);
        rackBar.position.set(rx, 0.9, 0.2);
        room.add(rackBar);

        for (let i = 0; i < 4; i++) {
          const coat = new THREE.Mesh(
            new THREE.BoxGeometry(0.42, 0.85, 0.55),
            new THREE.MeshStandardMaterial({ color: colors[(i + sIdx) % colors.length], roughness: 0.8 })
          );
          coat.position.set(rx, 1.15, -1.3 + i * 0.95);
          room.add(coat);
        }
        colliders.push({
          id: `int_rack_${sIdx}`,
          minX: rx - 0.5,
          maxX: rx + 0.5,
          minZ: -2.0,
          maxZ: 2.4,
          minY: 0,
          maxY: 2,
          tag: 'interior',
        });
      });
      return;
    }

    if (category === 'restaurant' || category === 'hotel') {
      // Dining tables & chairs on left and right sides
      const positions: Array<[number, number]> = [
        [-3.4, -0.2],
        [-3.4, 2.3],
        [3.4, -0.2],
        [3.4, 2.3],
      ];
      positions.forEach(([tx, tz], idx) => {
        const table = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.08, 12), woodMat);
        table.position.set(tx, 0.82, tz);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.8, 8), steelMat);
        leg.position.set(tx, 0.4, tz);
        room.add(table, leg);

        colliders.push({
          id: `int_table_${idx}`,
          minX: tx - 0.85,
          maxX: tx + 0.85,
          minZ: tz - 0.85,
          maxZ: tz + 0.85,
          minY: 0,
          maxY: 1.5,
          tag: 'interior',
        });
      });
      return;
    }

    if (category === 'apartment') {
      // Safe House bed, sofa & TV console
      const bed = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.55, 3.2),
        new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.85 })
      );
      bed.position.set(-3.6, 0.28, 0.2);
      const pillow = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.2, 0.6),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 })
      );
      pillow.position.set(-3.6, 0.62, -0.9);
      const sofa = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.75, 2.8),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 })
      );
      sofa.position.set(3.8, 0.38, 0.6);
      room.add(bed, pillow, sofa);

      colliders.push(
        { id: 'int_bed', minX: -4.9, maxX: -2.3, minZ: -1.5, maxZ: 1.9, minY: 0, maxY: 1.5, tag: 'interior' },
        { id: 'int_sofa', minX: 3.1, maxX: 4.5, minZ: -0.9, maxZ: 2.1, minY: 0, maxY: 1.5, tag: 'interior' }
      );
      return;
    }

    if (category === 'bank') {
      // Armored Steel Dhaka Central Bank Vault Door on back wall
      const vaultFrame = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 2.7, 0.36),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.8 })
      );
      vaultFrame.position.set(3.2, 1.35, -halfD + 0.3);
      const vaultDoor = new THREE.Mesh(
        new THREE.CylinderGeometry(1.05, 1.05, 0.28, 20),
        new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.25, metalness: 0.9 })
      );
      vaultDoor.rotation.x = Math.PI * 0.5;
      vaultDoor.position.set(3.2, 1.35, -halfD + 0.45);
      const vaultWheel = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.06, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.9 })
      );
      vaultWheel.position.set(3.2, 1.35, -halfD + 0.62);
      room.add(vaultFrame, vaultDoor, vaultWheel);
    }

    // Default shelves / display cases (Supermarket, Electronics, Convenience, Bank, Hospital, Office)
    [-halfW + 1.5, halfW - 1.5].forEach((sx, idx) => {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.85, halfD * 0.95), steelMat);
      shelf.position.set(sx, 0.92, 0.3);
      room.add(shelf);

      const band = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.22, halfD * 0.92), accentMat);
      band.position.set(sx, 1.55, 0.3);
      room.add(band);

      colliders.push({
        id: `int_shelf_${idx}`,
        minX: sx - 0.55,
        maxX: sx + 0.55,
        minZ: 0.3 - halfD * 0.48,
        maxZ: 0.3 + halfD * 0.48,
        minY: 0,
        maxY: 2.2,
        tag: 'interior',
      });
    });
  }

  private getPaletteForCategory(cat: EnterableBuildingDef['category']): {
    floorColor: number;
    wallColor: number;
    accentHex: number;
    lightColor: number;
  } {
    switch (cat) {
      case 'restaurant':
        return { floorColor: 0x452c1e, wallColor: 0x7c2d12, accentHex: 0xf59e0b, lightColor: 0xffd89e };
      case 'clothing':
        return { floorColor: 0x2a2433, wallColor: 0x3b3348, accentHex: 0xa855f7, lightColor: 0xf5e8ff };
      case 'electronics':
        return { floorColor: 0x162030, wallColor: 0x1e293b, accentHex: 0x22d3ee, lightColor: 0xdff7ff };
      case 'dealership':
        return { floorColor: 0x202733, wallColor: 0xe2e8f0, accentHex: 0xdc2626, lightColor: 0xffffff };
      case 'garage':
        return { floorColor: 0x383c42, wallColor: 0x4b5563, accentHex: 0xf97316, lightColor: 0xffedd5 };
      case 'hospital':
        return { floorColor: 0xdbeafe, wallColor: 0xf1f5f9, accentHex: 0xf43f5e, lightColor: 0xffffff };
      case 'bank':
        return { floorColor: 0x1f2d28, wallColor: 0xe2e8f0, accentHex: 0x10b981, lightColor: 0xf0fdf4 };
      case 'apartment':
        return { floorColor: 0x5c4632, wallColor: 0xd6cfc4, accentHex: 0x38bdf8, lightColor: 0xfff3d6 };
      case 'spec_ops_hq':
        return { floorColor: 0x111a2b, wallColor: 0x1e293b, accentHex: 0x38bdf8, lightColor: 0xdbf4ff };
      default:
        return { floorColor: 0x363e4a, wallColor: 0xcbd5e1, accentHex: 0x10b981, lightColor: 0xfff8eb };
    }
  }

  public update(dt: number): void {
    if (!this.activeInterior || !this.npcHead) return;
    this.animTime += dt;
    this.npcHead.rotation.y = Math.sin(this.animTime * 1.4) * 0.28;
  }

  public unloadRoom(): void {
    if (this.roomGroup) {
      this.roomGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material?.dispose();
        }
      });
      this.group.remove(this.roomGroup);
      this.roomGroup = null;
    }
    this.npcHead = null;
    this.activeInterior = null;
    this.group.visible = false;
  }
}
