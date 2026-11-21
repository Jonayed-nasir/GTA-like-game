import * as THREE from 'three';
import { VehicleKind } from '../types/game';

export interface VehicleRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  doorPivot: THREE.Group | null;
  wheels: THREE.Object3D[];
  frontWheelPivots: THREE.Object3D[];
  paintMat: THREE.MeshPhysicalMaterial;
  headlightMat: THREE.MeshStandardMaterial;
  brakeLightMat: THREE.MeshStandardMaterial;
  sirenRedMat?: THREE.MeshStandardMaterial;
  sirenBlueMat?: THREE.MeshStandardMaterial;
  mainRotor?: THREE.Object3D;
  tailRotor?: THREE.Object3D;
  radius: number;
  length: number;
  width: number;
}

const WHEEL_MAT = new THREE.MeshStandardMaterial({
  color: 0x181b20,
  roughness: 0.88,
  metalness: 0.08,
});

const RIM_MAT = new THREE.MeshStandardMaterial({
  color: 0xcbd5e1,
  roughness: 0.24,
  metalness: 0.86,
});

const GLASS_MAT = new THREE.MeshPhysicalMaterial({
  color: 0x102234,
  roughness: 0.1,
  metalness: 0.15,
  clearcoat: 1.0,
  clearcoatRoughness: 0.08,
});

const TRIM_DARK_MAT = new THREE.MeshStandardMaterial({
  color: 0x1f242d,
  roughness: 0.72,
  metalness: 0.25,
});

const CHROME_MAT = new THREE.MeshStandardMaterial({
  color: 0xe2e8f0,
  roughness: 0.2,
  metalness: 0.9,
});

function createWheel(radius: number, width: number): THREE.Group {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, width, 14),
    WHEEL_MAT
  );
  tire.rotation.z = Math.PI * 0.5;
  tire.castShadow = true;
  g.add(tire);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.56, radius * 0.56, width + 0.02, 10),
    RIM_MAT
  );
  hub.rotation.z = Math.PI * 0.5;
  g.add(hub);
  return g;
}

function addContactShadow(
  parent: THREE.Group,
  w: number,
  l: number,
  shadowTex: THREE.Texture
): void {
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.35, l * 1.25), shadowMat);
  plane.rotation.x = -Math.PI * 0.5;
  plane.position.y = 0.035;
  parent.add(plane);
}

function createSwingingDoor(
  paintMat: THREE.Material,
  x: number,
  y: number,
  zHinge: number,
  length: number,
  height: number
): THREE.Group {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, zHinge);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.08, height, length), paintMat);
  panel.position.set(0, 0, -length * 0.5);
  pivot.add(panel);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.05, 0.16), CHROME_MAT);
  handle.position.set(-0.02, height * 0.15, -length * 0.72);
  pivot.add(handle);
  return pivot;
}

export function createVehicleMesh(
  kind: VehicleKind,
  paintHex: number,
  shadowTex: THREE.Texture
): VehicleRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const wheels: THREE.Object3D[] = [];
  const frontWheelPivots: THREE.Object3D[] = [];
  let doorPivot: THREE.Group | null = null;
  let sirenRedMat: THREE.MeshStandardMaterial | undefined;
  let sirenBlueMat: THREE.MeshStandardMaterial | undefined;

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: paintHex,
    roughness: kind === 'bus' || kind === 'truck' ? 0.48 : 0.22,
    metalness: kind === 'sports' ? 0.65 : 0.35,
    clearcoat: kind === 'bus' || kind === 'truck' ? 0.3 : 1.0,
    clearcoatRoughness: 0.12,
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfff8e6,
    emissive: 0xfff2c6,
    emissiveIntensity: 0.35,
    roughness: 0.15,
  });

  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: 0x6b1010,
    emissive: 0xff1e1e,
    emissiveIntensity: 0.25,
    roughness: 0.2,
  });

  if (kind === 'helicopter') {
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.35,
      metalness: 0.55,
    });
    const navRedMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xff2222,
      emissiveIntensity: 1.8,
    });
    const navGreenMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22ff66,
      emissiveIntensity: 1.8,
    });

    // Main fuselage pod
    const fuselage = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.55, 4.3), paintMat);
    fuselage.position.set(0, 1.55, 0.25);
    fuselage.castShadow = true;
    bodyGroup.add(fuselage);

    // Tapered nose & curved glass cockpit canopy
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.92, 1.35), paintMat);
    nose.position.set(0, 1.24, 2.75);
    nose.rotation.x = 0.24;
    bodyGroup.add(nose);

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.96, 2.05), GLASS_MAT);
    canopy.position.set(0, 1.82, 1.65);
    canopy.rotation.x = 0.18;
    bodyGroup.add(canopy);

    // Gold tactical side racing stripe
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 4.35), accentMat);
    stripe.position.set(0, 1.35, 0.25);
    bodyGroup.add(stripe);

    // Turbine intake housing on top
    const turbine = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.58, 2.3), TRIM_DARK_MAT);
    turbine.position.set(0, 2.52, -0.2);
    bodyGroup.add(turbine);

    // Tapered tail boom & vertical tail fin
    const tailBoom = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.58, 4.9), paintMat);
    tailBoom.position.set(0, 1.78, -3.7);
    tailBoom.castShadow = true;
    bodyGroup.add(tailBoom);

    const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.65, 0.92), accentMat);
    tailFin.position.set(0, 2.38, -5.95);
    tailFin.rotation.x = -0.22;
    bodyGroup.add(tailFin);

    const hStab = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 0.52), TRIM_DARK_MAT);
    hStab.position.set(0, 1.78, -5.2);
    bodyGroup.add(hStab);

    // Twin tubular landing skids & cross struts
    for (const sx of [-1.22, 1.22]) {
      const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 4.4, 8), CHROME_MAT);
      skid.rotation.x = Math.PI * 0.5;
      skid.position.set(sx, 0.12, 0.35);
      bodyGroup.add(skid);

      for (const sz of [-0.7, 1.35]) {
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.92, 6), TRIM_DARK_MAT);
        strut.position.set(sx * 0.85, 0.56, sz);
        strut.rotation.z = sx > 0 ? 0.28 : -0.28;
        bodyGroup.add(strut);
      }
    }

    // Nose searchlight + port/starboard aviation nav lights
    const searchlight = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 10), headlightMat);
    searchlight.rotation.x = Math.PI * 0.5;
    searchlight.position.set(0, 0.92, 3.4);
    bodyGroup.add(searchlight);

    const portLight = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), navRedMat);
    portLight.position.set(-1.14, 1.55, 1.4);
    const starLight = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), navGreenMat);
    starLight.position.set(1.14, 1.55, 1.4);
    bodyGroup.add(portLight, starLight);

    // Spinning 4-blade Main Rotor Assembly
    const mainRotor = new THREE.Group();
    mainRotor.position.set(0, 3.12, 0.15);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.65, 8), CHROME_MAT);
    mast.position.y = -0.25;
    mainRotor.add(mast);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 10), accentMat);
    mainRotor.add(hub);
    const bladeGeo = new THREE.BoxGeometry(9.2, 0.05, 0.32);
    const bladeA = new THREE.Mesh(bladeGeo, TRIM_DARK_MAT);
    const bladeB = new THREE.Mesh(bladeGeo, TRIM_DARK_MAT);
    bladeB.rotation.y = Math.PI * 0.5;
    mainRotor.add(bladeA, bladeB);
    bodyGroup.add(mainRotor);

    // Spinning side Tail Rotor Assembly
    const tailRotor = new THREE.Group();
    tailRotor.position.set(0.22, 2.55, -6.1);
    const tBladeGeo = new THREE.BoxGeometry(0.06, 1.55, 0.16);
    const tBladeA = new THREE.Mesh(tBladeGeo, TRIM_DARK_MAT);
    const tBladeB = new THREE.Mesh(tBladeGeo, TRIM_DARK_MAT);
    tBladeB.rotation.x = Math.PI * 0.5;
    tailRotor.add(tBladeA, tBladeB);
    bodyGroup.add(tailRotor);

    addContactShadow(root, 4.6, 7.2, shadowTex);
    return {
      root,
      bodyGroup,
      doorPivot: null,
      wheels,
      frontWheelPivots,
      paintMat,
      headlightMat,
      brakeLightMat,
      mainRotor,
      tailRotor,
      radius: 2.6,
      length: 7.4,
      width: 2.8,
    };
  }

  if (kind === 'speedboat') {
    const deckMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.32, metalness: 0.15 });
    const tealTrimMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.25, metalness: 0.55 });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.78 });

    // Main V-hull lower body
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.72, 5.2), paintMat);
    hull.position.set(0, 0.42, -0.35);
    hull.castShadow = true;
    bodyGroup.add(hull);

    // Tapered speedboat bow cone
    const bow = new THREE.Mesh(new THREE.ConeGeometry(1.48, 2.35, 4), paintMat);
    bow.rotation.x = Math.PI * 0.5;
    bow.rotation.y = Math.PI * 0.25;
    bow.scale.set(1.12, 1.0, 0.48);
    bow.position.set(0, 0.48, 3.15);
    bodyGroup.add(bow);

    // Crisp white top deck & cyan racing stripe
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.18, 4.8), deckMat);
    deck.position.set(0, 0.84, -0.25);
    bodyGroup.add(deck);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.14, 5.25), tealTrimMat);
    stripe.position.set(0, 0.66, -0.35);
    bodyGroup.add(stripe);

    // Wrap-around swept tinted windshield
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.54, 1.15), GLASS_MAT);
    windshield.position.set(0, 1.15, 0.95);
    windshield.rotation.x = -0.32;
    bodyGroup.add(windshield);

    // Cockpit dashboard & dual luxury leather seats
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.42, 0.58), seatMat);
    dash.position.set(0, 1.05, 0.58);
    bodyGroup.add(dash);

    for (const sx of [-0.52, 0.52]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.62, 0.62), seatMat);
      seat.position.set(sx, 1.14, -0.55);
      bodyGroup.add(seat);
    }

    // Twin chrome outboard engines at stern
    for (const sx of [-0.46, 0.46]) {
      const motor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.88, 0.62), TRIM_DARK_MAT);
      motor.position.set(sx, 0.86, -3.12);
      bodyGroup.add(motor);
      const cowling = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 0.64), CHROME_MAT);
      cowling.position.set(sx, 1.24, -3.12);
      bodyGroup.add(cowling);
    }

    // Bow spotlight + stern wake light
    const bowLight = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.14, 0.1), headlightMat);
    bowLight.position.set(0, 0.94, 2.25);
    bodyGroup.add(bowLight);

    const sternLight = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.08), brakeLightMat);
    sternLight.position.set(0, 0.96, -2.95);
    bodyGroup.add(sternLight);

    return {
      root,
      bodyGroup,
      doorPivot: null,
      wheels,
      frontWheelPivots,
      paintMat,
      headlightMat,
      brakeLightMat,
      radius: 2.35,
      length: 6.4,
      width: 2.4,
    };
  }

  if (kind === 'cng') {
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x1b2420, roughness: 0.9 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });

    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.72, 2.55), paintMat);
    lowerBody.position.set(0, 0.68, -0.05);
    lowerBody.castShadow = true;
    bodyGroup.add(lowerBody);

    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.78, 0.78), paintMat);
    nose.position.set(0, 0.74, 1.32);
    nose.castShadow = true;
    bodyGroup.add(nose);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.12, 2.58), stripeMat);
    stripe.position.set(0, 0.92, -0.05);
    bodyGroup.add(stripe);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.24, 2.2), canopyMat);
    roof.position.set(0, 1.92, -0.15);
    roof.castShadow = true;
    bodyGroup.add(roof);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.62, 0.08), GLASS_MAT);
    windshield.position.set(0, 1.48, 1.18);
    windshield.rotation.x = -0.18;
    bodyGroup.add(windshield);

    for (const sx of [-0.66, 0.66]) {
      for (const sz of [-1.15, 0.05, 0.95]) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.95, 6), TRIM_DARK_MAT);
        pillar.position.set(sx, 1.44, sz);
        bodyGroup.add(pillar);
      }
    }

    // Swinging CNG passenger gate on left side
    doorPivot = createSwingingDoor(TRIM_DARK_MAT, -0.71, 1.15, 0.05, 0.92, 0.6);
    bodyGroup.add(doorPivot);

    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12), headlightMat);
    head.rotation.x = Math.PI * 0.5;
    head.position.set(0, 0.88, 1.72);
    bodyGroup.add(head);

    for (const sx of [-0.5, 0.5]) {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.06), brakeLightMat);
      tail.position.set(sx, 0.72, -1.34);
      bodyGroup.add(tail);
    }

    const fPivot = new THREE.Group();
    fPivot.position.set(0, 0.3, 1.28);
    const fWheel = createWheel(0.3, 0.22);
    fPivot.add(fWheel);
    root.add(fPivot);
    frontWheelPivots.push(fPivot);
    wheels.push(fWheel);

    for (const sx of [-0.68, 0.68]) {
      const rw = createWheel(0.3, 0.22);
      rw.position.set(sx, 0.3, -0.95);
      root.add(rw);
      wheels.push(rw);
    }

    addContactShadow(root, 1.6, 2.9, shadowTex);
    return {
      root,
      bodyGroup,
      doorPivot,
      wheels,
      frontWheelPivots,
      paintMat,
      headlightMat,
      brakeLightMat,
      radius: 1.5,
      length: 3.1,
      width: 1.5,
    };
  }

  if (kind === 'motorcycle') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.45, 1.35), TRIM_DARK_MAT);
    frame.position.set(0, 0.62, 0);
    frame.castShadow = true;
    bodyGroup.add(frame);

    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.68), paintMat);
    tank.position.set(0, 0.94, 0.22);
    tank.castShadow = true;
    bodyGroup.add(tank);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.72), TRIM_DARK_MAT);
    seat.position.set(0, 0.86, -0.4);
    bodyGroup.add(seat);

    const fairing = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.46), paintMat);
    fairing.position.set(0, 0.98, 0.74);
    fairing.rotation.x = -0.25;
    bodyGroup.add(fairing);

    const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.76, 8), CHROME_MAT);
    handlebar.rotation.z = Math.PI * 0.5;
    handlebar.position.set(0, 1.12, 0.56);
    bodyGroup.add(handlebar);

    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.8, 8), CHROME_MAT);
    exhaust.rotation.x = Math.PI * 0.5;
    exhaust.position.set(0.22, 0.45, -0.46);
    bodyGroup.add(exhaust);

    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.08), headlightMat);
    hl.position.set(0, 0.96, 0.98);
    bodyGroup.add(hl);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.06), brakeLightMat);
    tl.position.set(0, 0.85, -0.92);
    bodyGroup.add(tl);

    const fPivot = new THREE.Group();
    fPivot.position.set(0, 0.33, 0.78);
    const fWheel = createWheel(0.33, 0.15);
    fPivot.add(fWheel);
    root.add(fPivot);
    frontWheelPivots.push(fPivot);
    wheels.push(fWheel);

    const rWheel = createWheel(0.33, 0.18);
    rWheel.position.set(0, 0.33, -0.74);
    root.add(rWheel);
    wheels.push(rWheel);

    addContactShadow(root, 0.9, 2.2, shadowTex);
    return {
      root,
      bodyGroup,
      doorPivot: null,
      wheels,
      frontWheelPivots,
      paintMat,
      headlightMat,
      brakeLightMat,
      radius: 1.05,
      length: 2.1,
      width: 0.82,
    };
  }

  if (kind === 'sports') {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.56, 4.45), paintMat);
    chassis.position.set(0, 0.58, 0);
    chassis.castShadow = true;
    bodyGroup.add(chassis);

    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.24, 1.65), paintMat);
    hood.position.set(0, 0.86, 1.15);
    hood.rotation.x = 0.12;
    bodyGroup.add(hood);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.5, 1.85), GLASS_MAT);
    cabin.position.set(0, 1.08, -0.15);
    cabin.castShadow = true;
    bodyGroup.add(cabin);

    const roofCap = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.08, 1.25), paintMat);
    roofCap.position.set(0, 1.34, -0.22);
    bodyGroup.add(roofCap);

    doorPivot = createSwingingDoor(paintMat, -1.03, 0.64, 0.58, 1.25, 0.52);
    bodyGroup.add(doorPivot);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.07, 0.34), TRIM_DARK_MAT);
    wing.position.set(0, 1.15, -2.02);
    bodyGroup.add(wing);
    for (const sx of [-0.62, 0.62]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.22), TRIM_DARK_MAT);
      strut.position.set(sx, 0.98, -2.0);
      bodyGroup.add(strut);
    }

    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.24, 0.2), TRIM_DARK_MAT);
    diffuser.position.set(0, 0.38, -2.2);
    bodyGroup.add(diffuser);

    for (const sx of [-0.72, 0.72]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.08), headlightMat);
      hl.position.set(sx, 0.68, 2.22);
      bodyGroup.add(hl);
    }
    const brakeBar = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.12, 0.08), brakeLightMat);
    brakeBar.position.set(0, 0.74, -2.23);
    bodyGroup.add(brakeBar);

    const wheelCoords: Array<[number, number, boolean]> = [
      [-0.98, 1.36, true],
      [0.98, 1.36, true],
      [-0.98, -1.36, false],
      [0.98, -1.36, false],
    ];
    for (const [wx, wz, isFront] of wheelCoords) {
      const w = createWheel(0.36, 0.28);
      if (isFront) {
        const pivot = new THREE.Group();
        pivot.position.set(wx, 0.36, wz);
        pivot.add(w);
        root.add(pivot);
        frontWheelPivots.push(pivot);
      } else {
        w.position.set(wx, 0.36, wz);
        root.add(w);
      }
      wheels.push(w);
    }

    addContactShadow(root, 2.2, 4.7, shadowTex);
    return {
      root,
      bodyGroup,
      doorPivot,
      wheels,
      frontWheelPivots,
      paintMat,
      headlightMat,
      brakeLightMat,
      radius: 2.05,
      length: 4.5,
      width: 2.05,
    };
  }

  if (kind === 'suv') {
    const lower = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.78, 4.7), paintMat);
    lower.position.set(0, 0.8, 0);
    lower.castShadow = true;
    bodyGroup.add(lower);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.74, 2.85), GLASS_MAT);
    cabin.position.set(0, 1.5, -0.35);
    cabin.castShadow = true;
    bodyGroup.add(cabin);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.12, 2.65), paintMat);
    roof.position.set(0, 1.9, -0.35);
    bodyGroup.add(roof);

    for (const sx of [-0.78, 0.78]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 2.2), TRIM_DARK_MAT);
      rail.position.set(sx, 2.0, -0.35);
      bodyGroup.add(rail);
    }

    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.34, 0.12), CHROME_MAT);
    grille.position.set(0, 0.85, 2.36);
    bodyGroup.add(grille);

    doorPivot = createSwingingDoor(paintMat, -1.06, 0.9, 0.65, 1.15, 0.7);
    bodyGroup.add(doorPivot);

    for (const sx of [-0.74, 0.74]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.08), headlightMat);
      hl.position.set(sx, 0.9, 2.36);
      bodyGroup.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.08), brakeLightMat);
      tl.position.set(sx, 0.95, -2.36);
      bodyGroup.add(tl);
    }

    const coords: Array<[number, number, boolean]> = [
      [-1.02, 1.48, true],
      [1.02, 1.48, true],
      [-1.02, -1.48, false],
      [1.02, -1.48, false],
    ];
    for (const [wx, wz, isFront] of coords) {
      const w = createWheel(0.42, 0.3);
      if (isFront) {
        const pivot = new THREE.Group();
        pivot.position.set(wx, 0.42, wz);
        pivot.add(w);
        root.add(pivot);
        frontWheelPivots.push(pivot);
      } else {
        w.position.set(wx, 0.42, wz);
        root.add(w);
      }
      wheels.push(w);
    }

    addContactShadow(root, 2.25, 4.9, shadowTex);
    return {
      root,
      bodyGroup,
      doorPivot,
      wheels,
      frontWheelPivots,
      paintMat,
      headlightMat,
      brakeLightMat,
      radius: 2.2,
      length: 4.75,
      width: 2.1,
    };
  }

  if (kind === 'pickup') {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.68, 4.9), paintMat);
    chassis.position.set(0, 0.76, 0);
    chassis.castShadow = true;
    bodyGroup.add(chassis);

    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.76, 1.75), GLASS_MAT);
    cab.position.set(0, 1.44, 0.42);
    cab.castShadow = true;
    bodyGroup.add(cab);

    const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.12, 1.55), paintMat);
    cabRoof.position.set(0, 1.84, 0.42);
    bodyGroup.add(cabRoof);

    // Open cargo bed floor
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.15, 2.05), TRIM_DARK_MAT);
    bed.position.set(0, 1.06, -1.38);
    bodyGroup.add(bed);

    doorPivot = createSwingingDoor(paintMat, -1.03, 0.88, 0.92, 1.1, 0.66);
    bodyGroup.add(doorPivot);

    for (const sx of [-0.72, 0.72]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.08), headlightMat);
      hl.position.set(sx, 0.86, 2.46);
      bodyGroup.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.08), brakeLightMat);
      tl.position.set(sx, 0.88, -2.46);
      bodyGroup.add(tl);
    }

    const coords: Array<[number, number, boolean]> = [
      [-1.0, 1.56, true],
      [1.0, 1.56, true],
      [-1.0, -1.52, false],
      [1.0, -1.52, false],
    ];
    for (const [wx, wz, isFront] of coords) {
      const w = createWheel(0.42, 0.3);
      if (isFront) {
        const pivot = new THREE.Group();
        pivot.position.set(wx, 0.42, wz);
        pivot.add(w);
        root.add(pivot);
        frontWheelPivots.push(pivot);
      } else {
        w.position.set(wx, 0.42, wz);
        root.add(w);
      }
      wheels.push(w);
    }

    addContactShadow(root, 2.2, 5.1, shadowTex);
    return {
      root,
      bodyGroup,
      doorPivot,
      wheels,
      frontWheelPivots,
      paintMat,
      headlightMat,
      brakeLightMat,
      radius: 2.25,
      length: 4.95,
      width: 2.05,
    };
  }

  if (kind === 'truck') {
    const cargoMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.62 });
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.85, 2.15), paintMat);
    cab.position.set(0, 1.48, 2.25);
    cab.castShadow = true;
    bodyGroup.add(cab);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.82, 0.1), GLASS_MAT);
    windshield.position.set(0, 1.82, 3.33);
    bodyGroup.add(windshield);

    const cargoBox = new THREE.Mesh(new THREE.BoxGeometry(2.48, 2.35, 4.7), cargoMat);
    cargoBox.position.set(0, 1.85, -1.25);
    cargoBox.castShadow = true;
    bodyGroup.add(cargoBox);

    const chassisBar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.36, 6.8), TRIM_DARK_MAT);
    chassisBar.position.set(0, 0.56, 0);
    bodyGroup.add(chassisBar);

    doorPivot = createSwingingDoor(paintMat, -1.2, 1.42, 2.85, 1.1, 1.1);
    bodyGroup.add(doorPivot);

    for (const sx of [-0.88, 0.88]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.08), headlightMat);
      hl.position.set(sx, 0.92, 3.35);
      bodyGroup.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.08), brakeLightMat);
      tl.position.set(sx, 0.9, -3.62);
      bodyGroup.add(tl);
    }

    const coords: Array<[number, number, boolean]> = [
      [-1.18, 2.15, true],
      [1.18, 2.15, true],
      [-1.18, -2.05, false],
      [1.18, -2.05, false],
    ];
    for (const [wx, wz, isFront] of coords) {
      const w = createWheel(0.48, 0.36);
      if (isFront) {
        const pivot = new THREE.Group();
        pivot.position.set(wx, 0.48, wz);
        pivot.add(w);
        root.add(pivot);
        frontWheelPivots.push(pivot);
      } else {
        w.position.set(wx, 0.48, wz);
        root.add(w);
      }
      wheels.push(w);
    }

    addContactShadow(root, 2.65, 7.2, shadowTex);
    return {
      root,
      bodyGroup,
      doorPivot,
      wheels,
      frontWheelPivots,
      paintMat,
      headlightMat,
      brakeLightMat,
      radius: 3.0,
      length: 7.0,
      width: 2.5,
    };
  }

  if (kind === 'bus') {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.55, 2.25, 8.4), paintMat);
    hull.position.set(0, 1.65, 0);
    hull.castShadow = true;
    hull.receiveShadow = true;
    bodyGroup.add(hull);

    const winBand = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.92, 7.4), GLASS_MAT);
    winBand.position.set(0, 2.05, 0.25);
    bodyGroup.add(winBand);

    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.15, 0.1), GLASS_MAT);
    frontGlass.position.set(0, 2.0, 4.21);
    bodyGroup.add(frontGlass);

    const roofAC = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.34, 3.2), TRIM_DARK_MAT);
    roofAC.position.set(0, 2.94, 0);
    bodyGroup.add(roofAC);

    doorPivot = createSwingingDoor(paintMat, -1.3, 1.4, 3.4, 1.0, 1.65);
    bodyGroup.add(doorPivot);

    for (const sx of [-0.92, 0.92]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.08), headlightMat);
      hl.position.set(sx, 0.95, 4.22);
      bodyGroup.add(hl);
      const bl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.08), brakeLightMat);
      bl.position.set(sx, 1.0, -4.22);
      bodyGroup.add(bl);
    }

    const busWheels: Array<[number, number, boolean]> = [
      [-1.24, 2.5, true],
      [1.24, 2.5, true],
      [-1.24, -2.4, false],
      [1.24, -2.4, false],
    ];
    for (const [wx, wz, isFront] of busWheels) {
      const w = createWheel(0.5, 0.36);
      if (isFront) {
        const pivot = new THREE.Group();
        pivot.position.set(wx, 0.5, wz);
        pivot.add(w);
        root.add(pivot);
        frontWheelPivots.push(pivot);
      } else {
        w.position.set(wx, 0.5, wz);
        root.add(w);
      }
      wheels.push(w);
    }

    addContactShadow(root, 2.7, 8.6, shadowTex);
    return {
      root,
      bodyGroup,
      doorPivot,
      wheels,
      frontWheelPivots,
      paintMat,
      headlightMat,
      brakeLightMat,
      radius: 3.3,
      length: 8.5,
      width: 2.6,
    };
  }

  // Sedan or Dhaka Police Patrol Cruiser
  const isPolice = kind === 'police';
  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.64, 4.4), paintMat);
  lower.position.set(0, 0.68, 0);
  lower.castShadow = true;
  bodyGroup.add(lower);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.56, 2.15), GLASS_MAT);
  cabin.position.set(0, 1.24, -0.12);
  cabin.castShadow = true;
  bodyGroup.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.1, 1.68), paintMat);
  roof.position.set(0, 1.54, -0.14);
  bodyGroup.add(roof);

  if (isPolice) {
    // Dhaka Metropolitan Police blue stripe + flashing red/blue rooftop lightbar
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(1.94, 0.14, 4.42),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35 })
    );
    stripe.position.set(0, 0.72, 0);
    bodyGroup.add(stripe);

    sirenRedMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xff1111,
      emissiveIntensity: 0.2,
    });
    sirenBlueMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.2,
    });
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.09, 0.26), TRIM_DARK_MAT);
    barBase.position.set(0, 1.62, -0.1);
    bodyGroup.add(barBase);
    const redBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.22), sirenRedMat);
    redBeacon.position.set(-0.3, 1.69, -0.1);
    const blueBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.22), sirenBlueMat);
    blueBeacon.position.set(0.3, 1.69, -0.1);
    bodyGroup.add(redBeacon, blueBeacon);
  }

  doorPivot = createSwingingDoor(paintMat, -0.96, 0.72, 0.62, 1.15, 0.56);
  bodyGroup.add(doorPivot);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.24, 0.1), TRIM_DARK_MAT);
  grille.position.set(0, 0.66, 2.21);
  bodyGroup.add(grille);

  for (const sx of [-0.66, 0.66]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.08), headlightMat);
    hl.position.set(sx, 0.72, 2.21);
    bodyGroup.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.08), brakeLightMat);
    tl.position.set(sx, 0.74, -2.21);
    bodyGroup.add(tl);
  }

  const sedanWheels: Array<[number, number, boolean]> = [
    [-0.92, 1.32, true],
    [0.92, 1.32, true],
    [-0.92, -1.32, false],
    [0.92, -1.32, false],
  ];
  for (const [wx, wz, isFront] of sedanWheels) {
    const w = createWheel(0.35, 0.25);
    if (isFront) {
      const pivot = new THREE.Group();
      pivot.position.set(wx, 0.35, wz);
      pivot.add(w);
      root.add(pivot);
      frontWheelPivots.push(pivot);
    } else {
      w.position.set(wx, 0.35, wz);
      root.add(w);
    }
    wheels.push(w);
  }

  addContactShadow(root, 2.05, 4.6, shadowTex);
  return {
    root,
    bodyGroup,
    doorPivot,
    wheels,
    frontWheelPivots,
    paintMat,
    headlightMat,
    brakeLightMat,
    sirenRedMat,
    sirenBlueMat,
    radius: 1.95,
    length: 4.45,
    width: 1.92,
  };
}
