import * as THREE from 'three';
import { PhysicsWorld } from '../core/PhysicsWorld';
import { ENTERABLE_BUILDINGS } from '../data/shops';
import { BuildingFootprint, GpsPoint, MapMarker } from '../types/game';
import { ROAD_COORDS, RoadSystem } from './RoadSystem';
import { FacadeTexturePair, TextureFactory } from './TextureFactory';
import gulshanBillboardImg from '../assets/images/gulshan_neon_billboard_1795254861516.jpg';
import hatirjheelMarinaImg from '../assets/images/hatirjheel_marina_sign_1795254861767.jpg';
import dhakaSkylineImg from '../assets/images/dhaka_skyline_backdrop_1795254861209.jpg';

interface EmissiveNightTarget {
  material: THREE.MeshStandardMaterial;
  dayIntensity: number;
  nightIntensity: number;
}

export class DhakaWorld {
  public readonly group = new THREE.Group();
  public readonly roads: RoadSystem;
  public readonly buildingFootprints: BuildingFootprint[] = [];
  public readonly mapMarkers: MapMarker[] = [];

  private nightTargets: EmissiveNightTarget[] = [];
  private nightPointLights: THREE.PointLight[] = [];
  private waterMesh: THREE.Mesh | null = null;
  private waterTime = 0;

  // 3D glowing mission/GPS beacon ring visible in the Dhaka street world
  private beaconGroup = new THREE.Group();
  private beaconRing: THREE.Mesh;
  private beaconPillar: THREE.Mesh;

  constructor(textures: TextureFactory, physics: PhysicsWorld) {
    this.roads = new RoadSystem(textures);
    this.group.add(this.roads.group);

    this.buildTerrainAndHorizon();
    this.buildCityBuildings(textures, physics);
    this.buildEnterableDoorwayMarkers();
    this.buildDhakaFlyover(textures, physics);
    this.buildHatirjheelLakeAndBridge(physics);
    this.buildStreetlights();
    this.buildTropicalTrees();
    this.buildStreetProps(textures, physics);
    this.buildSpecialOpsHqExterior();
    this.buildHelipadPierStuntsAndBillboards(physics);
    this.registerMapMarkers();

    // 3D Mission / GPS Beacon
    const ringGeo = new THREE.TorusGeometry(2.6, 0.16, 10, 28);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.9,
      roughness: 0.25,
    });
    this.beaconRing = new THREE.Mesh(ringGeo, ringMat);
    this.beaconRing.rotation.x = Math.PI * 0.5;
    this.beaconRing.position.y = 0.35;

    const pillarGeo = new THREE.CylinderGeometry(1.15, 1.45, 22, 16, 1, true);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.beaconPillar = new THREE.Mesh(pillarGeo, pillarMat);
    this.beaconPillar.position.y = 11.2;

    this.beaconGroup.add(this.beaconRing, this.beaconPillar);
    this.beaconGroup.visible = false;
    this.group.add(this.beaconGroup);
  }

  public setWaypointBeacon(active: boolean, x = 0, z = 0, colorHex = 0xf59e0b): void {
    this.beaconGroup.visible = active;
    if (!active) return;
    this.beaconGroup.position.set(x, 0.08, z);
    const rm = this.beaconRing.material as THREE.MeshStandardMaterial;
    rm.color.setHex(colorHex);
    rm.emissive.setHex(colorHex);
    (this.beaconPillar.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
  }

  /**
   * Computes a clean road-grid GPS route between any two points in Gulshan–Hatirjheel.
   */
  public computeGpsRoute(fromX: number, fromZ: number, toX: number, toZ: number): GpsPoint[] {
    const snapCoord = (v: number) => {
      let best = ROAD_COORDS[0];
      let bestD = Math.abs(v - best);
      for (const rc of ROAD_COORDS) {
        const d = Math.abs(v - rc);
        if (d < bestD) {
          bestD = d;
          best = rc;
        }
      }
      return best;
    };

    const pts: GpsPoint[] = [{ x: fromX, z: fromZ }];
    const distDirect = Math.hypot(toX - fromX, toZ - fromZ);
    if (distDirect < 22) {
      pts.push({ x: toX, z: toZ });
      return pts;
    }

    const startRoadX = snapCoord(fromX);
    const startRoadZ = snapCoord(fromZ);
    const endRoadX = snapCoord(toX);
    const endRoadZ = snapCoord(toZ);

    // Move to nearest avenue, follow grid intersection, then turn to destination
    if (Math.abs(fromX - startRoadX) < Math.abs(fromZ - startRoadZ)) {
      pts.push({ x: startRoadX, z: fromZ });
      pts.push({ x: startRoadX, z: endRoadZ });
      pts.push({ x: endRoadX, z: endRoadZ });
    } else {
      pts.push({ x: fromX, z: startRoadZ });
      pts.push({ x: endRoadX, z: startRoadZ });
      pts.push({ x: endRoadX, z: endRoadZ });
    }

    // If destination is on Hatirjheel Bridge (Z > 72), route cleanly through +/-60 approach!
    if (toZ > 72) {
      const bridgeApproachX = fromX >= 0 ? 60 : -60;
      pts.push({ x: bridgeApproachX, z: 60 });
      pts.push({ x: bridgeApproachX, z: 88 });
    }

    pts.push({ x: toX, z: toZ });
    return pts;
  }

  private buildEnterableDoorwayMarkers(): void {
    const padGeo = new THREE.RingGeometry(0.62, 1.05, 18);
    const frameGeo = new THREE.BoxGeometry(2.1, 2.75, 0.25);
    const glassDoorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x1e3a5f,
      emissiveIntensity: 0.4,
      roughness: 0.2,
      metalness: 0.75,
    });

    for (const b of ENTERABLE_BUILDINGS) {
      const accent = new THREE.Color(b.accentColor);
      const padMat = new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.rotation.x = -Math.PI * 0.5;
      pad.position.set(b.doorX, 0.22, b.doorZ);
      this.group.add(pad);

      // Visible illuminated doorway portal frame facing street
      const portal = new THREE.Mesh(frameGeo, glassDoorMat);
      const backX = b.doorX - Math.sin(b.exitYaw) * 0.75;
      const backZ = b.doorZ - Math.cos(b.exitYaw) * 0.75;
      portal.position.set(backX, 1.55, backZ);
      portal.rotation.y = b.exitYaw;
      this.group.add(portal);
    }
  }

  private buildTerrainAndHorizon(): void {
    const groundGeo = new THREE.PlaneGeometry(900, 900);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x3b403c,
      roughness: 0.96,
      metalness: 0.02,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.group.add(ground);

    const skyBoxGeo = new THREE.BoxGeometry(1, 1, 1);
    const skyBoxMat = new THREE.MeshStandardMaterial({
      color: 0x4b5868,
      roughness: 0.85,
      metalness: 0.15,
    });
    const count = 96;
    const skyline = new THREE.InstancedMesh(skyBoxGeo, skyBoxMat, count);
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 178 + (i % 5) * 18;
      const w = 14 + (i % 4) * 5;
      const d = 14 + ((i + 2) % 4) * 5;
      const h = 18 + ((i * 13) % 44);
      dummy.position.set(Math.cos(angle) * radius, h * 0.5, Math.sin(angle) * radius);
      dummy.scale.set(w, h, d);
      dummy.rotation.y = (i % 3) * 0.2;
      dummy.updateMatrix();
      skyline.setMatrixAt(i, dummy.matrix);

      tint.setHSL(0.58 + (i % 3) * 0.02, 0.12, 0.34 + (i % 4) * 0.04);
      skyline.setColorAt(i, tint);
    }
    skyline.instanceMatrix.needsUpdate = true;
    if (skyline.instanceColor) skyline.instanceColor.needsUpdate = true;
    skyline.computeBoundingSphere();
    this.group.add(skyline);
  }

  private buildCityBuildings(textures: TextureFactory, physics: PhysicsWorld): void {
    const glassBlue = textures.createGlassTowerFacade('#3c729c');
    const glassTeal = textures.createGlassTowerFacade('#2f787d');
    const dhakaOchre = textures.createDhakaBuildingFacade('#c99a64', '#9e7447', 5, 7);
    const dhakaBrick = textures.createDhakaBuildingFacade('#b66a54', '#7e4838', 6, 7);
    const dhakaMint = textures.createDhakaBuildingFacade('#92b5a4', '#638072', 5, 6);
    const dhakaCream = textures.createDhakaBuildingFacade('#cfc9bc', '#999284', 6, 7);

    const makeFacadeMat = (
      pair: FacadeTexturePair,
      isGlass: boolean,
      repeatX: number,
      repeatY: number
    ) => {
      const map = pair.map.clone();
      map.needsUpdate = true;
      map.repeat.set(repeatX, repeatY);

      const emap = pair.emissiveMap.clone();
      emap.needsUpdate = true;
      emap.repeat.set(repeatX, repeatY);

      const mat = new THREE.MeshStandardMaterial({
        map,
        emissive: 0xffe4b3,
        emissiveMap: emap,
        emissiveIntensity: 0.05,
        roughness: isGlass ? 0.18 : 0.82,
        metalness: isGlass ? 0.72 : 0.08,
      });
      this.nightTargets.push({
        material: mat,
        dayIntensity: 0.04,
        nightIntensity: isGlass ? 1.15 : 0.95,
      });
      return mat;
    };

    const roofMat = new THREE.MeshStandardMaterial({ color: 0x52575e, roughness: 0.92, metalness: 0.08 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xd8dce0, roughness: 0.55, metalness: 0.25 });
    const tankBlueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4, metalness: 0.15 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x262c36, roughness: 0.35, metalness: 0.75 });

    interface BuildingSpec {
      x: number;
      z: number;
      w: number;
      d: number;
      h: number;
      style: 'glassBlue' | 'glassTeal' | 'ochre' | 'brick' | 'mint' | 'cream';
      sign?: { bn: string; en: string; bg: string; accent: string; face: 'S' | 'N' | 'E' | 'W' };
      stepped?: boolean;
    }

    const specs: BuildingSpec[] = [
      // Block NW (-30, -30)
      {
        x: -37,
        z: -37,
        w: 18,
        d: 18,
        h: 44,
        style: 'glassBlue',
        stepped: true,
        sign: { bn: 'গুলশান সেন্টার', en: 'Gulshan Center', bg: '#0c2340', accent: '#38bdf8', face: 'E' },
      },
      {
        x: -20,
        z: -37,
        w: 13,
        d: 16,
        h: 26,
        style: 'cream',
        sign: { bn: 'ঢাকা ব্যাংক', en: 'Dhaka Bank', bg: '#064e3b', accent: '#34d399', face: 'E' },
      },
      { x: -37, z: -19, w: 16, d: 14, h: 20, style: 'ochre' },
      {
        x: -20,
        z: -19,
        w: 14,
        d: 14,
        h: 32,
        style: 'glassTeal',
        stepped: true,
        sign: { bn: 'স্কাইলাইন টাওয়ার', en: 'Skyline Tower', bg: '#1e1b4b', accent: '#f59e0b', face: 'S' },
      },

      // Block NE (+30, -30)
      {
        x: 20,
        z: -37,
        w: 14,
        d: 16,
        h: 38,
        style: 'glassTeal',
        stepped: true,
        sign: { bn: 'বনানী ফ্যাশন', en: 'Banani Style Studio', bg: '#3b0764', accent: '#c084fc', face: 'W' },
      },
      { x: 38, z: -37, w: 16, d: 16, h: 22, style: 'brick' },
      {
        x: 20,
        z: -19,
        w: 15,
        d: 14,
        h: 24,
        style: 'mint',
        sign: { bn: 'গুলশান মার্ট', en: 'Fresh Supermarket', bg: '#064e3b', accent: '#34d399', face: 'S' },
      },
      {
        x: 38,
        z: -19,
        w: 15,
        d: 15,
        h: 30,
        style: 'glassBlue',
        stepped: true,
        sign: { bn: 'হোটেল গুলশান', en: 'Hotel Gulshan Grand', bg: '#451a03', accent: '#fbbf24', face: 'S' },
      },

      // Block SW (-30, +30)
      {
        x: -20,
        z: 20,
        w: 14,
        d: 14,
        h: 21,
        style: 'ochre',
        sign: { bn: 'রয়েল বিরিয়ানি', en: 'Royal Biryani House', bg: '#7f1d1d', accent: '#facc15', face: 'E' },
      },
      {
        x: -38,
        z: 20,
        w: 16,
        d: 15,
        h: 28,
        style: 'cream',
        sign: { bn: 'গুলশান হাসপাতাল', en: 'Care Hospital 24/7', bg: '#881337', accent: '#fda4af', face: 'N' },
      },
      {
        x: -20,
        z: 38,
        w: 15,
        d: 15,
        h: 34,
        style: 'glassBlue',
        stepped: true,
        sign: { bn: 'হাতিরঝিল ভিউ', en: 'Safe House Apt', bg: '#0f172a', accent: '#60a5fa', face: 'S' },
      },
      {
        x: -38,
        z: 38,
        w: 16,
        d: 15,
        h: 18,
        style: 'brick',
        sign: { bn: 'মিনি মার্ট ২৪/৭', en: 'Dhaka Mini Mart', bg: '#14532d', accent: '#4ade80', face: 'S' },
      },

      // Block SE (+30, +30)
      {
        x: 20,
        z: 20,
        w: 14,
        d: 15,
        h: 36,
        style: 'glassTeal',
        stepped: true,
        sign: { bn: 'ডিজিটাল মার্কেট', en: 'Digital Market', bg: '#1e293b', accent: '#22d3ee', face: 'W' },
      },
      {
        x: 38,
        z: 20,
        w: 15,
        d: 15,
        h: 22,
        style: 'mint',
        sign: { bn: 'গুলশান গ্যারেজ', en: 'Auto Repair & Paint', bg: '#431407', accent: '#fb923c', face: 'N' },
      },
      {
        x: 20,
        z: 38,
        w: 15,
        d: 15,
        h: 25,
        style: 'brick',
        sign: { bn: 'পদ্মা মোটরস', en: 'Padma Motors Showroom', bg: '#450a0a', accent: '#f87171', face: 'S' },
      },
      {
        x: 38,
        z: 38,
        w: 16,
        d: 15,
        h: 42,
        style: 'glassBlue',
        stepped: true,
        sign: { bn: 'স্পেশাল অপস হেডকোয়ার্টার', en: 'Special Ops HQ', bg: '#0b1e38', accent: '#38bdf8', face: 'S' },
      },

      // Outer Perimeter Blocks
      { x: -86, z: -34, w: 20, d: 24, h: 32, style: 'cream' },
      { x: -86, z: 26, w: 20, d: 26, h: 28, style: 'ochre' },
      { x: -112, z: -26, w: 18, d: 24, h: 24, style: 'brick' },
      { x: -112, z: 32, w: 18, d: 24, h: 36, style: 'glassBlue' },
      { x: 86, z: -30, w: 20, d: 26, h: 40, style: 'glassTeal', stepped: true },
      { x: 86, z: 28, w: 20, d: 26, h: 26, style: 'mint' },
      { x: 112, z: -28, w: 18, d: 24, h: 24, style: 'ochre' },
      { x: 112, z: 30, w: 18, d: 24, h: 34, style: 'cream' },
      { x: -30, z: -88, w: 28, d: 22, h: 38, style: 'glassBlue', stepped: true },
      { x: 30, z: -88, w: 28, d: 22, h: 34, style: 'brick' },
      { x: -90, z: -88, w: 26, d: 22, h: 26, style: 'mint' },
      { x: 90, z: -88, w: 26, d: 22, h: 30, style: 'cream' },
    ];

    const styleMap: Record<BuildingSpec['style'], { pair: FacadeTexturePair; isGlass: boolean; mapHex: string }> = {
      glassBlue: { pair: glassBlue, isGlass: true, mapHex: '#335a7d' },
      glassTeal: { pair: glassTeal, isGlass: true, mapHex: '#2b676d' },
      ochre: { pair: dhakaOchre, isGlass: false, mapHex: '#9c774a' },
      brick: { pair: dhakaBrick, isGlass: false, mapHex: '#8d5342' },
      mint: { pair: dhakaMint, isGlass: false, mapHex: '#638275' },
      cream: { pair: dhakaCream, isGlass: false, mapHex: '#8e8a80' },
    };

    specs.forEach((b, idx) => {
      const entry = styleMap[b.style];
      const bGroup = new THREE.Group();
      bGroup.position.set(b.x, 0.18, b.z);

      const repX = Math.max(1, Math.round(b.w / 10));
      const repY = Math.max(1, Math.round(b.h / 12));
      const wallMat = makeFacadeMat(entry.pair, entry.isGlass, repX, repY);

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(b.w, b.h, b.d),
        [wallMat, wallMat, roofMat, roofMat, wallMat, wallMat]
      );
      body.position.y = b.h * 0.5;
      body.castShadow = true;
      body.receiveShadow = true;
      bGroup.add(body);

      const podium = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.8, 3.6, b.d + 0.8), darkMetalMat);
      podium.position.y = 1.8;
      podium.receiveShadow = true;
      bGroup.add(podium);

      const canopy = new THREE.Mesh(new THREE.BoxGeometry(b.w + 1.8, 0.32, b.d + 1.8), trimMat);
      canopy.position.y = 3.75;
      bGroup.add(canopy);

      if (b.stepped) {
        const crownH = 5.5;
        const crown = new THREE.Mesh(new THREE.BoxGeometry(b.w * 0.68, crownH, b.d * 0.68), wallMat);
        crown.position.y = b.h + crownH * 0.5;
        crown.castShadow = true;
        bGroup.add(crown);

        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.18, 7, 6), darkMetalMat);
        spire.position.y = b.h + crownH + 3.5;
        bGroup.add(spire);
      } else {
        const mech = new THREE.Mesh(new THREE.BoxGeometry(b.w * 0.35, 2.8, b.d * 0.35), roofMat);
        mech.position.set(-b.w * 0.18, b.h + 1.4, -b.d * 0.15);
        bGroup.add(mech);

        const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 2.1, 10), tankBlueMat);
        tank.position.set(b.w * 0.22, b.h + 1.05, b.d * 0.18);
        bGroup.add(tank);
      }

      if (b.sign) {
        const signTex = textures.createSignboardTexture(b.sign.bn, b.sign.en, b.sign.bg, b.sign.accent);
        const signMat = new THREE.MeshStandardMaterial({
          map: signTex,
          emissive: 0xffffff,
          emissiveMap: signTex,
          emissiveIntensity: 0.25,
          roughness: 0.35,
        });
        this.nightTargets.push({ material: signMat, dayIntensity: 0.22, nightIntensity: 1.05 });
        const sw = Math.min(b.w * 0.72, 9.2);
        const signMesh = new THREE.Mesh(new THREE.BoxGeometry(sw, 2.4, 0.28), signMat);
        const sy = 5.2;
        if (b.sign.face === 'S') {
          signMesh.position.set(0, sy, b.d * 0.5 + 0.25);
        } else if (b.sign.face === 'N') {
          signMesh.position.set(0, sy, -b.d * 0.5 - 0.25);
          signMesh.rotation.y = Math.PI;
        } else if (b.sign.face === 'E') {
          signMesh.position.set(b.w * 0.5 + 0.25, sy, 0);
          signMesh.rotation.y = Math.PI * 0.5;
        } else {
          signMesh.position.set(-b.w * 0.5 - 0.25, sy, 0);
          signMesh.rotation.y = -Math.PI * 0.5;
        }
        bGroup.add(signMesh);
      }

      this.group.add(bGroup);
      physics.addStaticBox(`bldg_${idx}`, b.x, b.z, b.w + 0.9, b.d + 0.9, b.h, 'building');
      this.buildingFootprints.push({ x: b.x, z: b.z, w: b.w, d: b.d, color: entry.mapHex });
    });
  }

  private buildDhakaFlyover(textures: TextureFactory, physics: PhysicsWorld): void {
    const flyoverGroup = new THREE.Group();
    const deckY = 7.6;

    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x8b9097, roughness: 0.88, metalness: 0.08 });
    const darkDeckMat = new THREE.MeshStandardMaterial({ color: 0x353941, roughness: 0.9, metalness: 0.05 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0xb4bac2, roughness: 0.72, metalness: 0.22 });

    const deck = new THREE.Mesh(new THREE.BoxGeometry(276, 1.15, 11.4), concreteMat);
    deck.position.set(0, deckY, -60);
    deck.castShadow = true;
    deck.receiveShadow = true;
    flyoverGroup.add(deck);

    const topRoad = new THREE.Mesh(new THREE.PlaneGeometry(276, 10.2), darkDeckMat);
    topRoad.rotation.x = -Math.PI / 2;
    topRoad.position.set(0, deckY + 0.59, -60);
    flyoverGroup.add(topRoad);

    for (const side of [-5.4, 5.4]) {
      const barrier = new THREE.Mesh(new THREE.BoxGeometry(276, 1.05, 0.55), railMat);
      barrier.position.set(0, deckY + 0.95, -60 + side);
      flyoverGroup.add(barrier);
    }

    const muralMats = [0, 1, 2].map(
      (v) =>
        new THREE.MeshStandardMaterial({
          map: textures.createFlyoverMuralTexture(v),
          roughness: 0.78,
          metalness: 0.05,
        })
    );

    const pierXs = [-108, -84, -40, -20, 20, 40, 84, 108];
    pierXs.forEach((px, i) => {
      const pier = new THREE.Mesh(
        new THREE.CylinderGeometry(1.15, 1.32, deckY - 0.5, 14),
        muralMats[i % muralMats.length]
      );
      pier.position.set(px, (deckY - 0.5) * 0.5, -60);
      pier.castShadow = true;
      pier.receiveShadow = true;
      flyoverGroup.add(pier);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 9.6), concreteMat);
      cap.position.set(px, deckY - 0.85, -60);
      flyoverGroup.add(cap);

      physics.addStaticBox(`flyover_pier_${i}`, px, -60, 2.7, 2.7, deckY, 'prop');
    });

    this.group.add(flyoverGroup);
  }

  private buildHatirjheelLakeAndBridge(physics: PhysicsWorld): void {
    const lakeGroup = new THREE.Group();

    const waterGeo = new THREE.PlaneGeometry(290, 62, 24, 10);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x133c55,
      roughness: 0.14,
      metalness: 0.78,
      emissive: 0x071a38,
      emissiveIntensity: 0.15,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.55, 99);
    water.receiveShadow = true;
    lakeGroup.add(water);
    this.waterMesh = water;
    this.nightTargets.push({ material: waterMat, dayIntensity: 0.05, nightIntensity: 0.42 });

    const embMat = new THREE.MeshStandardMaterial({ color: 0x858a90, roughness: 0.88, metalness: 0.06 });
    const northWalk = new THREE.Mesh(new THREE.BoxGeometry(272, 1.1, 4.2), embMat);
    northWalk.position.set(0, -0.25, 69.5);
    northWalk.receiveShadow = true;
    lakeGroup.add(northWalk);

    const southShore = new THREE.Mesh(new THREE.BoxGeometry(290, 1.2, 26), embMat);
    southShore.position.set(0, -0.3, 134);
    lakeGroup.add(southShore);

    const railMat = new THREE.MeshStandardMaterial({ color: 0xd0d7df, roughness: 0.45, metalness: 0.65 });
    const railSpans: Array<[number, number]> = [
      [-104, 58],
      [0, 102],
      [104, 58],
    ];
    railSpans.forEach(([cx, len], idx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.95, 0.22), railMat);
      rail.position.set(cx, 0.72, 71.2);
      lakeGroup.add(rail);
      physics.addStaticBox(`lake_rail_${idx}`, cx, 71.4, len, 1.0, 2.0, 'water');
    });

    physics.addStaticBox('lake_water_south_guard', 0, 118, 280, 12, 4, 'water');
    physics.addStaticBox('lake_water_mid_north', 0, 77.5, 84, 5.5, 3, 'water');
    physics.addStaticBox('lake_water_mid_south', 0, 99.5, 84, 6.5, 3, 'water');

    const bridgeGroup = new THREE.Group();
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x30343c, roughness: 0.85, metalness: 0.08 });
    const segments = 22;
    const segW = 88 / segments;
    for (let i = 0; i < segments; i++) {
      const x1 = -44 + i * segW;
      const x2 = x1 + segW;
      const xc = (x1 + x2) * 0.5;
      const y1 = physics.getGroundHeightAt(x1, 88);
      const y2 = physics.getGroundHeightAt(x2, 88);
      const yc = (y1 + y2) * 0.5;
      const slope = Math.atan2(y2 - y1, segW);
      const segLen = Math.hypot(segW, y2 - y1) + 0.08;

      const slab = new THREE.Mesh(new THREE.BoxGeometry(segLen, 0.55, 13.4), deckMat);
      slab.position.set(xc, yc - 0.24, 88);
      slab.rotation.z = slope;
      slab.receiveShadow = true;
      bridgeGroup.add(slab);

      for (const side of [-6.4, 6.4]) {
        const kerb = new THREE.Mesh(new THREE.BoxGeometry(segLen, 0.72, 0.36), railMat);
        kerb.position.set(xc, yc + 0.36, 88 + side);
        kerb.rotation.z = slope;
        bridgeGroup.add(kerb);
      }
    }

    const archMat = new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      emissive: 0x2563eb,
      emissiveIntensity: 0.12,
      roughness: 0.28,
      metalness: 0.78,
    });
    this.nightTargets.push({ material: archMat, dayIntensity: 0.08, nightIntensity: 2.35 });

    for (const sideZ of [81.6, 94.4]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const x = THREE.MathUtils.lerp(-40, 40, t);
        const h = Math.sin(t * Math.PI) * 14.5;
        pts.push(new THREE.Vector3(x, h + 0.2, sideZ));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const archMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.48, 10, false), archMat);
      archMesh.castShadow = true;
      bridgeGroup.add(archMesh);

      for (let c = -32; c <= 32; c += 8) {
        const ct = (c + 40) / 80;
        const archY = Math.sin(ct * Math.PI) * 14.5 + 0.2;
        const deckY = physics.getGroundHeightAt(c, 88);
        const h = Math.max(0.5, archY - deckY);
        const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, h, 6), archMat);
        cable.position.set(c, deckY + h * 0.5, sideZ);
        bridgeGroup.add(cable);
      }
    }

    for (let x = -20; x <= 20; x += 10) {
      const t = (x + 40) / 80;
      const archY = Math.sin(t * Math.PI) * 14.5 + 0.2;
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 12.8, 8), archMat);
      rib.rotation.x = Math.PI * 0.5;
      rib.position.set(x, archY, 88);
      bridgeGroup.add(rib);
    }

    const bridgeGlow = new THREE.PointLight(0x3b82f6, 0, 52, 1.5);
    bridgeGlow.position.set(0, 10, 88);
    bridgeGroup.add(bridgeGlow);
    this.nightPointLights.push(bridgeGlow);

    lakeGroup.add(bridgeGroup);
    this.group.add(lakeGroup);
  }

  private buildStreetlights(): void {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3b424d, roughness: 0.45, metalness: 0.72 });
    const lampBulbMat = new THREE.MeshStandardMaterial({
      color: 0xfff0cc,
      emissive: 0xffc66e,
      emissiveIntensity: 0.1,
      roughness: 0.2,
    });
    this.nightTargets.push({ material: lampBulbMat, dayIntensity: 0.08, nightIntensity: 2.8 });

    const positions: Array<[number, number, number]> = [];
    for (const z of [-44, -20, 20, 44]) {
      positions.push([-9.4, z, Math.PI * 0.5]);
      positions.push([9.4, z, -Math.PI * 0.5]);
      positions.push([-50.6, z, -Math.PI * 0.5]);
      positions.push([50.6, z, Math.PI * 0.5]);
    }
    for (const x of [-44, -22, 22, 44]) {
      positions.push([x, 9.4, Math.PI]);
      positions.push([x, -9.4, 0]);
      positions.push([x, 68.2, 0]);
    }

    const poleInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.14, 6.8, 7), poleMat, positions.length);
    const armInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.12, 2.0), poleMat, positions.length);
    const lampInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, 0.14, 0.85), lampBulbMat, positions.length);

    const dummy = new THREE.Object3D();
    positions.forEach(([x, z, rotY], i) => {
      dummy.position.set(x, 3.55, z);
      dummy.rotation.set(0, rotY, 0);
      dummy.updateMatrix();
      poleInst.setMatrixAt(i, dummy.matrix);

      const dx = Math.sin(rotY) * 0.9;
      const dz = Math.cos(rotY) * 0.9;
      dummy.position.set(x + dx, 6.85, z + dz);
      dummy.updateMatrix();
      armInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x + dx * 1.9, 6.75, z + dz * 1.9);
      dummy.updateMatrix();
      lampInst.setMatrixAt(i, dummy.matrix);
    });

    poleInst.instanceMatrix.needsUpdate = true;
    armInst.instanceMatrix.needsUpdate = true;
    lampInst.instanceMatrix.needsUpdate = true;
    poleInst.computeBoundingSphere();
    armInst.computeBoundingSphere();
    lampInst.computeBoundingSphere();
    this.group.add(poleInst, armInst, lampInst);

    const keyPoints: Array<[number, number]> = [
      [0, 0],
      [-14, 18],
      [0, 60],
    ];
    for (const [lx, lz] of keyPoints) {
      const pt = new THREE.PointLight(0xffb960, 0, 38, 1.5);
      pt.position.set(lx, 7.2, lz);
      this.group.add(pt);
      this.nightPointLights.push(pt);
    }
  }

  private buildTropicalTrees(): void {
    const coords: Array<[number, number]> = [
      [-10.2, -32],
      [-10.2, -16],
      [-10.2, 16],
      [-10.2, 34],
      [10.2, -34],
      [10.2, -16],
      [10.2, 18],
      [10.2, 36],
      [-30, 10.2],
      [30, 10.2],
      [-30, -10.2],
      [30, -10.2],
      [-48, 69.2],
      [-32, 69.2],
      [-16, 69.2],
      [16, 69.2],
      [32, 69.2],
      [48, 69.2],
      [-76, 69.2],
      [76, 69.2],
      [-49, -28],
      [-49, 28],
      [49, -28],
      [49, 28],
      [-26, 126],
      [0, 126],
      [26, 126],
    ];

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4738, roughness: 0.95 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x3b7a40, roughness: 0.85 });

    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.34, 4.4, 7), trunkMat, coords.length);
    const crownsA = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.35, 1), canopyMat, coords.length);
    const crownsB = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.65, 1), canopyMat, coords.length);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    coords.forEach(([x, z], i) => {
      const s = 0.86 + ((i * 7) % 10) * 0.032;
      dummy.position.set(x, 0.18 + 2.2 * s, z);
      dummy.rotation.set(0, i * 1.1, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, 0.18 + 4.7 * s, z);
      dummy.scale.set(s * 1.15, s * 0.78, s * 1.15);
      dummy.updateMatrix();
      crownsA.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x + 0.65 * s, 0.18 + 5.55 * s, z - 0.45 * s);
      dummy.scale.set(s * 0.9, s * 0.72, s * 0.9);
      dummy.updateMatrix();
      crownsB.setMatrixAt(i, dummy.matrix);

      color.setHSL(0.32 + (i % 4) * 0.015, 0.46, 0.28 + (i % 3) * 0.04);
      crownsA.setColorAt(i, color);
      color.offsetHSL(0.01, 0.04, 0.05);
      crownsB.setColorAt(i, color);
    });

    trunks.instanceMatrix.needsUpdate = true;
    crownsA.instanceMatrix.needsUpdate = true;
    crownsB.instanceMatrix.needsUpdate = true;
    if (crownsA.instanceColor) crownsA.instanceColor.needsUpdate = true;
    if (crownsB.instanceColor) crownsB.instanceColor.needsUpdate = true;
    trunks.computeBoundingSphere();
    crownsA.computeBoundingSphere();
    crownsB.computeBoundingSphere();
    trunks.castShadow = true;
    crownsA.castShadow = true;

    this.group.add(trunks, crownsA, crownsB);
  }

  private buildStreetProps(textures: TextureFactory, physics: PhysicsWorld): void {
    // Mama's Tea Corner shifted slightly south to z=26 so Royal Biryani door at z=20 is wide open!
    const stall = new THREE.Group();
    stall.position.set(-11.8, 0.18, 26.2);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.88 });
    const tinMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.45, metalness: 0.55 });
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.05, 1.5), woodMat);
    counter.position.y = 0.52;
    counter.castShadow = true;
    stall.add(counter);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.14, 2.0), tinMat);
    roof.position.y = 2.45;
    roof.rotation.z = 0.08;
    stall.add(roof);

    for (const px of [-1.2, 1.2]) {
      for (const pz of [-0.65, 0.65]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), woodMat);
        post.position.set(px, 1.2, pz);
        stall.add(post);
      }
    }

    const teaSignTex = textures.createSignboardTexture('মামার চা স্টল', 'Gulshan Tea Corner', '#065f46', '#fde047');
    const teaSignMat = new THREE.MeshStandardMaterial({
      map: teaSignTex,
      emissive: 0xffffff,
      emissiveMap: teaSignTex,
      emissiveIntensity: 0.25,
    });
    this.nightTargets.push({ material: teaSignMat, dayIntensity: 0.2, nightIntensity: 0.95 });
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.72, 0.12), teaSignMat);
    signBoard.position.set(0, 2.82, 0.8);
    stall.add(signBoard);

    this.group.add(stall);
    physics.addStaticBox('tea_stall', -11.8, 26.2, 3.0, 2.0, 2.6, 'prop');

    const gantry = new THREE.Group();
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4, metalness: 0.78 });
    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 7.2, 8), steelMat);
    leftPost.position.set(-9.6, 3.6, -24);
    const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 7.2, 8), steelMat);
    rightPost.position.set(9.6, 3.6, -24);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(19.6, 0.45, 0.45), steelMat);
    beam.position.set(0, 6.9, -24);
    gantry.add(leftPost, rightPost, beam);

    const dirTex = textures.createSignboardTexture(
      '↑ উত্তরা / বিমানবন্দর   ↓ হাতিরঝিল',
      'Uttara · Airport   |   Hatirjheel',
      '#065f46',
      '#ffffff'
    );
    const dirMat = new THREE.MeshStandardMaterial({
      map: dirTex,
      emissive: 0xffffff,
      emissiveMap: dirTex,
      emissiveIntensity: 0.15,
      roughness: 0.35,
    });
    this.nightTargets.push({ material: dirMat, dayIntensity: 0.1, nightIntensity: 0.85 });
    const dirBoard = new THREE.Mesh(new THREE.BoxGeometry(9.6, 2.4, 0.24), dirMat);
    dirBoard.position.set(0, 6.8, -23.7);
    gantry.add(dirBoard);
    this.group.add(gantry);
  }

  /**
   * Architectural exterior detailing for Dhaka Special Operations HQ at (38, 38):
   * - Illuminated tactical entrance arch at (38, 46.8)
   * - Rooftop helipad ring & glowing comms mast atop the tower
   * - Marked cyan-striped HQ tactical vehicle parking bay at (49.5, 42.0)
   */
  private buildSpecialOpsHqExterior(): void {
    const hqGroup = new THREE.Group();
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.72 });
    const cyanGlowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.4,
      roughness: 0.25,
    });
    this.nightTargets.push({ material: cyanGlowMat, dayIntensity: 0.9, nightIntensity: 2.8 });

    // Entrance canopy & cyan accent light bar facing South (doorX=38, doorZ=46.8)
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.34, 2.4), steelMat);
    canopy.position.set(38.0, 3.65, 46.5);
    const canopyTrim = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.14, 2.48), cyanGlowMat);
    canopyTrim.position.set(38.0, 3.84, 46.5);
    const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.6, 0.32), steelMat);
    leftPillar.position.set(34.9, 1.8, 47.45);
    const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.6, 0.32), steelMat);
    rightPillar.position.set(41.1, 1.8, 47.45);
    hqGroup.add(canopy, canopyTrim, leftPillar, rightPillar);

    // Tactical bollard markers flanking entrance walkway
    for (const bx of [35.4, 40.6]) {
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.95, 8), steelMat);
      bollard.position.set(bx, 0.48, 48.2);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 8), cyanGlowMat);
      cap.position.set(bx, 0.96, 48.2);
      hqGroup.add(bollard, cap);
    }

    // Rooftop communications mast & helipad ring atop HQ tower (h = 42 + stepped crown)
    const roofY = 48.2;
    const heliRing = new THREE.Mesh(
      new THREE.RingGeometry(2.6, 3.2, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
    );
    heliRing.rotation.x = -Math.PI * 0.5;
    heliRing.position.set(38, roofY, 38);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.24, 9.5, 8), steelMat);
    mast.position.set(41.8, roofY + 4.7, 34.5);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), cyanGlowMat);
    beacon.position.set(41.8, roofY + 9.5, 34.5);
    hqGroup.add(heliRing, mast, beacon);

    // Outdoor HQ Tactical Vehicle Parking Bay at (49.5, 42.0)
    const bayPad = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 7.6),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.78 })
    );
    bayPad.rotation.x = -Math.PI * 0.5;
    bayPad.position.set(49.5, 0.21, 42.0);
    hqGroup.add(bayPad);

    const stripeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    for (const sx of [47.25, 51.75]) {
      const sideLine = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 7.6), stripeMat);
      sideLine.rotation.x = -Math.PI * 0.5;
      sideLine.position.set(sx, 0.22, 42.0);
      hqGroup.add(sideLine);
    }
    const frontLine = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.22), stripeMat);
    frontLine.rotation.x = -Math.PI * 0.5;
    frontLine.position.set(49.5, 0.22, 38.25);
    hqGroup.add(frontLine);

    this.group.add(hqGroup);
  }

  /**
   * GTA Dhaka 3.0 Open-World Additions:
   * - Hatirjheel Waterfront Helipad (72, 54) for Dhaka SkyHawk Chopper
   * - Hatirjheel Timber Boat Pier (-68, 70..76.5) for Jet Cruiser Speedboat
   * - 5 Yellow/Black Hazard-Striped 3D Stunt Ramps registered in PhysicsWorld
   * - 3 Large Illuminated HD Billboards displaying custom Dhaka artwork
   */
  private buildHelipadPierStuntsAndBillboards(physics: PhysicsWorld): void {
    const extGroup = new THREE.Group();

    // 1) HATIRJHEEL WATERFRONT HELIPAD at (72, 54)
    const padMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72, metalness: 0.2 });
    const yellowPaintMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const amberBeaconMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.8,
    });
    this.nightTargets.push({ material: amberBeaconMat, dayIntensity: 1.0, nightIntensity: 3.0 });

    const helipadBase = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 7.2, 0.34, 8), padMat);
    helipadBase.position.set(72, 0.17, 54);
    helipadBase.receiveShadow = true;
    extGroup.add(helipadBase);

    const heliRing = new THREE.Mesh(new THREE.RingGeometry(4.9, 5.4, 24), yellowPaintMat);
    heliRing.rotation.x = -Math.PI * 0.5;
    heliRing.position.set(72, 0.36, 54);
    extGroup.add(heliRing);

    // Crisp yellow painted 'H'
    const hLeft = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 4.4), yellowPaintMat);
    hLeft.rotation.x = -Math.PI * 0.5;
    hLeft.position.set(70.5, 0.365, 54);
    const hRight = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 4.4), yellowPaintMat);
    hRight.rotation.x = -Math.PI * 0.5;
    hRight.position.set(73.5, 0.365, 54);
    const hCross = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.68), yellowPaintMat);
    hCross.rotation.x = -Math.PI * 0.5;
    hCross.position.set(72, 0.365, 54);
    extGroup.add(hLeft, hRight, hCross);

    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), amberBeaconMat);
      lamp.position.set(72 + Math.cos(ang) * 6.2, 0.44, 54 + Math.sin(ang) * 6.2);
      extGroup.add(lamp);
    }

    // 2) HATIRJHEEL BOAT PIER at (-68, 70..76.5) leading directly into the open railing gap
    const pierWoodMat = new THREE.MeshStandardMaterial({ color: 0x7c4a24, roughness: 0.88 });
    const pilingMat = new THREE.MeshStandardMaterial({ color: 0x452814, roughness: 0.92 });
    const cyanLampMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.9,
    });
    this.nightTargets.push({ material: cyanLampMat, dayIntensity: 1.0, nightIntensity: 3.1 });

    const pierDeck = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.32, 7.6), pierWoodMat);
    pierDeck.position.set(-68, 0.16, 73.2);
    pierDeck.receiveShadow = true;
    extGroup.add(pierDeck);

    for (const px of [-70.1, -65.9]) {
      for (const pz of [70.4, 73.4, 76.4]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 2.2, 8), pilingMat);
        post.position.set(px, 0.1, pz);
        extGroup.add(post);
      }
    }
    const pierBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), cyanLampMat);
    pierBeacon.position.set(-65.9, 1.32, 76.4);
    extGroup.add(pierBeacon);

    // Subtle pier shoreline bumpers so on-foot players never walk off into Hatirjheel Lake
    physics.addStaticBox('pier_end_guard', -68, 77.6, 5.2, 0.8, 2.0, 'water');
    physics.addStaticBox('pier_west_guard', -72.8, 74.2, 4.6, 6.2, 2.0, 'water');

    // 3) FIVE 3D YELLOW/BLACK HAZARD STUNT RAMPS ON OPEN AVENUES
    const rampConfigs = [
      { id: 'ramp_gulshan_south', x: 0, z: 32, width: 4.8, length: 9.2, height: 2.35, yaw: 0 },
      { id: 'ramp_gulshan_north', x: 0, z: -34, width: 4.8, length: 9.2, height: 2.35, yaw: Math.PI },
      { id: 'ramp_east_ring', x: 60, z: -14, width: 4.8, length: 9.2, height: 2.4, yaw: 0 },
      { id: 'ramp_west_ring', x: -60, z: 14, width: 4.8, length: 9.2, height: 2.4, yaw: Math.PI },
      { id: 'ramp_waterfront', x: 24, z: 60, width: 4.8, length: 9.6, height: 2.55, yaw: -Math.PI * 0.5 },
    ];

    const rampMetalMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.55,
      metalness: 0.45,
    });
    const rampHazardMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xd97706,
      emissiveIntensity: 0.22,
      roughness: 0.4,
    });
    this.nightTargets.push({ material: rampHazardMat, dayIntensity: 0.15, nightIntensity: 1.15 });

    for (const rc of rampConfigs) {
      physics.addStuntRamp(rc);
      const rg = new THREE.Group();
      rg.position.set(rc.x, 0, rc.z);
      rg.rotation.y = rc.yaw;

      // Sloped driving wedge deck (base at -length/2 y=0 -> lip at +length/2 y=height)
      const diagLen = Math.hypot(rc.length, rc.height);
      const slopeAng = Math.atan2(rc.height, rc.length);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(rc.width, 0.22, diagLen), rampMetalMat);
      deck.position.set(0, rc.height * 0.5, 0);
      deck.rotation.x = -slopeAng;
      deck.receiveShadow = true;
      rg.add(deck);

      // Glowing yellow/amber hazard side rails
      for (const sx of [-rc.width * 0.46, rc.width * 0.46]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, diagLen), rampHazardMat);
        rail.position.set(sx, rc.height * 0.5 + 0.16, 0);
        rail.rotation.x = -slopeAng;
        rg.add(rail);
      }

      // Rear steel support pillars beneath the lip
      for (const sx of [-rc.width * 0.38, rc.width * 0.38]) {
        const strut = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, rc.height, 0.36),
          rampMetalMat
        );
        strut.position.set(sx, rc.height * 0.5, rc.length * 0.45);
        rg.add(strut);
      }

      extGroup.add(rg);
    }

    // 4) THREE ILLUMINATED HD DHAKA BILLBOARDS (real generated HD artwork!)
    const loader = new THREE.TextureLoader();
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.42,
      metalness: 0.78,
    });

    const billboards = [
      {
        url: gulshanBillboardImg,
        x: 13.5,
        y: 10.5,
        z: -13.5,
        rotY: -Math.PI * 0.25,
        w: 11.2,
        h: 6.3,
      },
      {
        url: hatirjheelMarinaImg,
        x: -44.0,
        y: 9.6,
        z: 67.5,
        rotY: 0,
        w: 11.6,
        h: 6.5,
      },
      {
        url: dhakaSkylineImg,
        x: 48.0,
        y: 10.2,
        z: 66.5,
        rotY: Math.PI,
        w: 11.6,
        h: 6.5,
      },
    ];

    for (const bb of billboards) {
      const bg = new THREE.Group();
      bg.position.set(bb.x, bb.y, bb.z);
      bg.rotation.y = bb.rotY;

      const tex = loader.load(bb.url);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const artMat = new THREE.MeshStandardMaterial({
        map: tex,
        emissive: 0xffffff,
        emissiveMap: tex,
        emissiveIntensity: 0.35,
        roughness: 0.32,
      });
      this.nightTargets.push({ material: artMat, dayIntensity: 0.28, nightIntensity: 1.15 });

      const board = new THREE.Mesh(new THREE.BoxGeometry(bb.w, bb.h, 0.38), [
        frameMat,
        frameMat,
        frameMat,
        frameMat,
        artMat,
        artMat,
      ]);
      bg.add(board);

      // Steel gantry support pole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, bb.y, 8), frameMat);
      pole.position.set(0, -bb.y * 0.5, 0);
      bg.add(pole);

      extGroup.add(bg);
    }

    this.group.add(extGroup);
  }

  private registerMapMarkers(): void {
    this.mapMarkers.push(
      { id: 'gulshan_circle', x: 0, z: 0, labelEn: 'Gulshan Circle', labelBn: 'গুলশান সার্কেল', type: 'landmark' },
      { id: 'hatirjheel_bridge', x: 0, z: 88, labelEn: 'Hatirjheel Bridge', labelBn: 'হাতিরঝিল ব্রিজ', type: 'bridge' },
      { id: 'flyover_link', x: 0, z: -60, labelEn: 'Mohakhali Flyover', labelBn: 'মহাখালী ফ্লাইওভার', type: 'landmark' },
      { id: 'hatirjheel_helipad', x: 72, z: 54, labelEn: 'SkyHawk Helipad', labelBn: 'স্কাইহক হেলিপ্যাড', type: 'helipad' },
      { id: 'hatirjheel_pier', x: -68, z: 75, labelEn: 'Hatirjheel Boat Pier', labelBn: 'হাতিরঝিল বোট পিয়ার', type: 'pier' },
      { id: 'stunt_gulshan', x: 0, z: 32, labelEn: 'Gulshan South Stunt Ramp', labelBn: 'গুলশান দক্ষিণ স্টান্ট র‍্যাম্প', type: 'ramp' },
      { id: 'stunt_gulshan_n', x: 0, z: -34, labelEn: 'Gulshan North Stunt Ramp', labelBn: 'গুলশান উত্তর স্টান্ট র‍্যাম্প', type: 'ramp' },
      { id: 'stunt_waterfront', x: 24, z: 60, labelEn: 'Waterfront Stunt Jump', labelBn: 'ওয়াটারফ্রন্ট স্টান্ট জাম্প', type: 'ramp' },
      { id: 'stunt_east', x: 60, z: -14, labelEn: 'East Ring Stunt Ramp', labelBn: 'ইস্ট রিং স্টান্ট র‍্যাম্প', type: 'ramp' },
      { id: 'stunt_west', x: -60, z: 14, labelEn: 'West Ring Stunt Ramp', labelBn: 'ওয়েস্ট রিং স্টান্ট র‍্যাম্প', type: 'ramp' }
    );

    for (const b of ENTERABLE_BUILDINGS) {
      const mType: MapMarker['type'] = b.isSpecOpsHq
        ? 'hq'
        : b.isGarage
          ? 'garage'
          : b.isDealership
            ? 'dealership'
            : b.isSafeHouse
              ? 'safehouse'
              : b.isHospital
                ? 'hospital'
                : 'shop';
      this.mapMarkers.push({
        id: b.id,
        x: b.doorX,
        z: b.doorZ,
        labelEn: b.nameEn,
        labelBn: b.nameBn,
        type: mType,
        buildingId: b.id,
      });
    }
  }

  public setNightFactor(nightFactor: number): void {
    for (let i = 0; i < this.nightTargets.length; i++) {
      const t = this.nightTargets[i];
      t.material.emissiveIntensity = THREE.MathUtils.lerp(t.dayIntensity, t.nightIntensity, nightFactor);
    }
    for (let i = 0; i < this.nightPointLights.length; i++) {
      const pl = this.nightPointLights[i];
      pl.intensity = nightFactor * (i === 0 ? 48 : 34);
    }
  }

  public update(dt: number): void {
    this.roads.update(dt);
    this.waterTime += dt;
    if (this.waterMesh) {
      this.waterMesh.position.y = -0.55 + Math.sin(this.waterTime * 1.4) * 0.035;
    }
    if (this.beaconGroup.visible) {
      this.beaconRing.rotation.z += dt * 1.8;
      this.beaconRing.position.y = 0.35 + Math.sin(this.waterTime * 3.5) * 0.14;
    }
  }

  public getDistrictAt(x: number, z: number): { en: string; bn: string } {
    if (z > 54) return { en: 'Hatirjheel Waterfront', bn: 'হাতিরঝিল ওয়াটারফ্রন্ট' };
    if (z < -42) return { en: 'Mohakhali Flyover Link', bn: 'মহাখালী ফ্লাইওভার লিংক' };
    if (z < -22 && x > 10) return { en: 'Banani Link', bn: 'বনানী লিংক' };
    if (x > 30 && z > 28) return { en: 'Special Ops Command District', bn: 'স্পেশাল অপস কমান্ড এলাকা' };
    if (x > 46) return { en: 'Gulshan East', bn: 'গুলশান পূর্ব' };
    return { en: 'Gulshan Avenue', bn: 'গুলশান এভিনিউ' };
  }

  public getRoadCoords(): number[] {
    return ROAD_COORDS;
  }
}
