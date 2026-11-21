import * as THREE from 'three';
import { TextureFactory } from './TextureFactory';

export type AxisDirection = 'NS' | 'EW';

export interface TrafficSignalState {
  nsState: 'green' | 'yellow' | 'red';
  ewState: 'green' | 'yellow' | 'red';
}

export interface RoadLane {
  id: string;
  axis: 'x' | 'z';
  direction: 1 | -1;
  fixedCoord: number; // X for Z-axis road, Z for X-axis road
  min: number;
  max: number;
}

export interface FootpathLoop {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

interface TrafficLightVisual {
  axis: AxisDirection;
  redMat: THREE.MeshStandardMaterial;
  yellowMat: THREE.MeshStandardMaterial;
  greenMat: THREE.MeshStandardMaterial;
}

export const ROAD_COORDS = [-60, 0, 60];
export const ROAD_WIDTH = 16;
export const ROAD_HALF = ROAD_WIDTH * 0.5; // 8m

export class RoadSystem {
  public readonly group = new THREE.Group();
  public readonly lanes: RoadLane[] = [];
  public readonly footpathLoops: FootpathLoop[] = [];
  public readonly signalState: TrafficSignalState = {
    nsState: 'green',
    ewState: 'red',
  };

  private signalTimer = 0;
  private signalVisuals: TrafficLightVisual[] = [];

  constructor(textures: TextureFactory) {
    this.buildRoadNetwork(textures);
    this.defineTrafficLanes();
    this.defineFootpathLoops();
  }

  private buildRoadNetwork(textures: TextureFactory): void {
    const asphaltBase = textures.createAsphaltTexture();

    // Helper for textured road strip
    const addRoadStrip = (
      x: number,
      z: number,
      w: number,
      d: number,
      yOffset = 0.02
    ) => {
      const tex = asphaltBase.clone();
      tex.needsUpdate = true;
      tex.repeat.set(Math.max(1, w / 8), Math.max(1, d / 8));
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.86,
        metalness: 0.05,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, yOffset, z);
      mesh.receiveShadow = true;
      this.group.add(mesh);
    };

    // North-South Avenues at X = -60, 0, 60 (Z from -136 to +68)
    for (const rx of ROAD_COORDS) {
      addRoadStrip(rx, -34, ROAD_WIDTH, 204, 0.02);
    }

    // East-West Boulevards at Z = -60, 0, 60 (X from -136 to +136)
    for (const rz of ROAD_COORDS) {
      addRoadStrip(0, rz, 272, ROAD_WIDTH, 0.026);
    }

    // Southern Hatirjheel Bridge approach connectors (from Z=60 down to Z=88 at X=-60 and X=+60)
    addRoadStrip(-60, 78, ROAD_WIDTH, 32, 0.024);
    addRoadStrip(60, 78, ROAD_WIDTH, 32, 0.024);
    // East/West approach shoulders to bridge (Z=88, X=-68..-44 and X=44..68)
    addRoadStrip(-56, 88, 28, 14, 0.028);
    addRoadStrip(56, 88, 28, 14, 0.028);

    // Road lane markings (dashed white dividers + yellow center median stripes)
    const whitePaint = new THREE.MeshStandardMaterial({
      color: 0xe8edf2,
      roughness: 0.72,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const yellowPaint = new THREE.MeshStandardMaterial({
      color: 0xf4be2a,
      roughness: 0.68,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    const dashNSGeo = new THREE.PlaneGeometry(0.24, 3.2);
    const dashEWGeo = new THREE.PlaneGeometry(3.2, 0.24);
    const medianNSGeo = new THREE.PlaneGeometry(0.32, 38);
    const medianEWGeo = new THREE.PlaneGeometry(38, 0.32);
    const zebraNSGeo = new THREE.PlaneGeometry(0.65, 3.2);
    const zebraEWGeo = new THREE.PlaneGeometry(3.2, 0.65);

    const segments = [-90, -30, 30];
    // NS road markings
    for (const rx of ROAD_COORDS) {
      for (const segCenter of segments) {
        // Double yellow center line
        for (const off of [-0.26, 0.26]) {
          const med = new THREE.Mesh(medianNSGeo, yellowPaint);
          med.rotation.x = -Math.PI / 2;
          med.position.set(rx + off, 0.045, segCenter);
          this.group.add(med);
        }
        // Dashed lane lines at +/- 4.0m
        for (const laneOff of [-4.0, 4.0]) {
          for (let z = segCenter - 16; z <= segCenter + 16; z += 7) {
            const d = new THREE.Mesh(dashNSGeo, whitePaint);
            d.rotation.x = -Math.PI / 2;
            d.position.set(rx + laneOff, 0.045, z);
            this.group.add(d);
          }
        }
      }
    }

    // EW road markings
    for (const rz of ROAD_COORDS) {
      for (const segCenter of [-90, -30, 30, 90]) {
        for (const off of [-0.26, 0.26]) {
          const med = new THREE.Mesh(medianEWGeo, yellowPaint);
          med.rotation.x = -Math.PI / 2;
          med.position.set(segCenter, 0.048, rz + off);
          this.group.add(med);
        }
        for (const laneOff of [-4.0, 4.0]) {
          for (let x = segCenter - 16; x <= segCenter + 16; x += 7) {
            const d = new THREE.Mesh(dashEWGeo, whitePaint);
            d.rotation.x = -Math.PI / 2;
            d.position.set(x, 0.048, rz + laneOff);
            this.group.add(d);
          }
        }
      }
    }

    // Intersections: Zebra crosswalks & Traffic Light Gantries
    for (const rx of ROAD_COORDS) {
      for (const rz of ROAD_COORDS) {
        // Zebra stripes on 4 sides of intersection
        for (let i = -5; i <= 5; i += 2) {
          // North & South crosswalks
          for (const side of [-10.2, 10.2]) {
            const z1 = new THREE.Mesh(zebraNSGeo, whitePaint);
            z1.rotation.x = -Math.PI / 2;
            z1.position.set(rx + i, 0.052, rz + side);
            this.group.add(z1);
          }
          // East & West crosswalks
          for (const side of [-10.2, 10.2]) {
            const z2 = new THREE.Mesh(zebraEWGeo, whitePaint);
            z2.rotation.x = -Math.PI / 2;
            z2.position.set(rx + side, 0.052, rz + i);
            this.group.add(z2);
          }
        }

        // Traffic light posts on key intersections (not directly under flyover at Z=-60 except corners)
        if (rz >= 0 || rx === 0) {
          this.addTrafficLightPost(rx + 9.2, rz + 9.2, 'NS', Math.PI);
          this.addTrafficLightPost(rx - 9.2, rz - 9.2, 'NS', 0);
          this.addTrafficLightPost(rx - 9.2, rz + 9.2, 'EW', Math.PI * 0.5);
          this.addTrafficLightPost(rx + 9.2, rz - 9.2, 'EW', -Math.PI * 0.5);
        }
      }
    }

    // Raised concrete footpaths + Dhaka yellow/black curbs around the 4 central blocks & outer edges
    const footpathTex = textures.createFootpathTexture();
    const curbTex = textures.createDhakaCurbTexture();
    const footpathMat = new THREE.MeshStandardMaterial({
      map: footpathTex,
      roughness: 0.9,
      metalness: 0.04,
    });
    const curbMat = new THREE.MeshStandardMaterial({
      map: curbTex,
      roughness: 0.78,
      metalness: 0.08,
    });

    const blocks: Array<[number, number, number, number]> = [
      // Central 4 blocks (each 44x44m between roads)
      [-30, -30, 44, 44],
      [30, -30, 44, 44],
      [-30, 30, 44, 44],
      [30, 30, 44, 44],
      // Outer west & east blocks
      [-98, -30, 60, 44],
      [-98, 30, 60, 44],
      [98, -30, 60, 44],
      [98, 30, 60, 44],
      // Outer north blocks beyond flyover
      [-30, -98, 44, 60],
      [30, -98, 44, 60],
      [-98, -98, 60, 60],
      [98, -98, 60, 60],
    ];

    for (const [bx, bz, bw, bd] of blocks) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.18, bd), [
        curbMat,
        curbMat,
        footpathMat,
        footpathMat,
        curbMat,
        curbMat,
      ]);
      slab.position.set(bx, 0.09, bz);
      slab.receiveShadow = true;
      this.group.add(slab);
    }
  }

  private addTrafficLightPost(
    x: number,
    z: number,
    axis: AxisDirection,
    rotY: number
  ): void {
    const g = new THREE.Group();
    g.position.set(x, 0.18, z);
    g.rotation.y = rotY;

    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x333a45,
      roughness: 0.45,
      metalness: 0.72,
    });
    const housingMat = new THREE.MeshStandardMaterial({
      color: 0x16191e,
      roughness: 0.65,
      metalness: 0.25,
    });

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 5.4, 8), poleMat);
    pole.position.y = 2.7;
    pole.castShadow = true;
    g.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 2.8), poleMat);
    arm.position.set(0, 5.15, 1.3);
    g.add(arm);

    const box = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.25, 0.34), housingMat);
    box.position.set(0, 4.95, 2.55);
    g.add(box);

    const redMat = new THREE.MeshStandardMaterial({
      color: 0x3a0c0c,
      emissive: 0xff2626,
      emissiveIntensity: 0.05,
      roughness: 0.25,
    });
    const yellowMat = new THREE.MeshStandardMaterial({
      color: 0x3a2e08,
      emissive: 0xffb71c,
      emissiveIntensity: 0.05,
      roughness: 0.25,
    });
    const greenMat = new THREE.MeshStandardMaterial({
      color: 0x0a331d,
      emissive: 0x18e06c,
      emissiveIntensity: 0.05,
      roughness: 0.25,
    });

    const bulbGeo = new THREE.SphereGeometry(0.11, 8, 8);
    const rBulb = new THREE.Mesh(bulbGeo, redMat);
    rBulb.position.set(0, 5.3, 2.72);
    const yBulb = new THREE.Mesh(bulbGeo, yellowMat);
    yBulb.position.set(0, 4.95, 2.72);
    const gBulb = new THREE.Mesh(bulbGeo, greenMat);
    gBulb.position.set(0, 4.6, 2.72);
    g.add(rBulb, yBulb, gBulb);

    this.signalVisuals.push({ axis, redMat, yellowMat, greenMat });
    this.group.add(g);
  }

  private defineTrafficLanes(): void {
    // Bangladesh drives on the LEFT side of the road!
    // Going +Z (south): left side is +X (+3.8m)
    // Going -Z (north): left side is -X (-3.8m)
    // Going +X (east): left side is -Z (-3.8m)
    // Going -X (west): left side is +Z (+3.8m)
    for (const rx of ROAD_COORDS) {
      this.lanes.push({
        id: `NS_${rx}_S`,
        axis: 'z',
        direction: 1,
        fixedCoord: rx + 3.8,
        min: -125,
        max: 64,
      });
      this.lanes.push({
        id: `NS_${rx}_N`,
        axis: 'z',
        direction: -1,
        fixedCoord: rx - 3.8,
        min: -125,
        max: 64,
      });
    }

    for (const rz of ROAD_COORDS) {
      this.lanes.push({
        id: `EW_${rz}_E`,
        axis: 'x',
        direction: 1,
        fixedCoord: rz - 3.8,
        min: -128,
        max: 128,
      });
      this.lanes.push({
        id: `EW_${rz}_W`,
        axis: 'x',
        direction: -1,
        fixedCoord: rz + 3.8,
        min: -128,
        max: 128,
      });
    }
  }

  private defineFootpathLoops(): void {
    // Perimeter footpath paths around the 4 central Gulshan blocks
    const centers: Array<[number, number]> = [
      [-30, -30],
      [30, -30],
      [-30, 30],
      [30, 30],
    ];
    for (const [cx, cz] of centers) {
      this.footpathLoops.push({
        minX: cx - 20.4,
        maxX: cx + 20.4,
        minZ: cz - 20.4,
        maxZ: cz + 20.4,
      });
    }
  }

  public update(dt: number): void {
    // 22-second traffic light cycle:
    // 0..9s: NS green, EW red
    // 9..11s: NS yellow, EW red
    // 11..20s: NS red, EW green
    // 20..22s: NS red, EW yellow
    this.signalTimer = (this.signalTimer + dt) % 22;

    if (this.signalTimer < 9) {
      this.signalState.nsState = 'green';
      this.signalState.ewState = 'red';
    } else if (this.signalTimer < 11) {
      this.signalState.nsState = 'yellow';
      this.signalState.ewState = 'red';
    } else if (this.signalTimer < 20) {
      this.signalState.nsState = 'red';
      this.signalState.ewState = 'green';
    } else {
      this.signalState.nsState = 'red';
      this.signalState.ewState = 'yellow';
    }

    for (let i = 0; i < this.signalVisuals.length; i++) {
      const v = this.signalVisuals[i];
      const st = v.axis === 'NS' ? this.signalState.nsState : this.signalState.ewState;
      v.redMat.emissiveIntensity = st === 'red' ? 2.4 : 0.04;
      v.yellowMat.emissiveIntensity = st === 'yellow' ? 2.4 : 0.04;
      v.greenMat.emissiveIntensity = st === 'green' ? 2.4 : 0.04;
    }
  }

  public isRedForLane(axis: 'x' | 'z'): boolean {
    if (axis === 'z') {
      return this.signalState.nsState !== 'green';
    }
    return this.signalState.ewState !== 'green';
  }
}
