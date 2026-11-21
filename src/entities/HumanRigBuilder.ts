import * as THREE from 'three';
import { WeaponId } from '../types/game';

export interface HumanRigOptions {
  skinHex?: number;
  hairHex?: number;
  jacketHex?: number;
  shirtHex?: number;
  pantsHex?: number;
  shoeHex?: number;
  scale?: number;
  hasJacket?: boolean;
  hasSunglasses?: boolean;
  hasBackpack?: boolean;
  hasCap?: boolean;
  capHex?: number;
  hasHelmet?: boolean;
  helmetHex?: number;
  hasVest?: boolean;
  vestHex?: number;
  femaleHair?: boolean;
  castShadow?: boolean;
}

export interface ArticulatedHumanRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  torsoGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftForearmPivot: THREE.Group;
  rightForearmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  leftShinPivot: THREE.Group;
  rightShinPivot: THREE.Group;
  weaponSocket: THREE.Group;
  // Dynamic materials for outfit customization
  jacketMat: THREE.MeshStandardMaterial;
  shirtMat: THREE.MeshStandardMaterial;
  pantsMat: THREE.MeshStandardMaterial;
  shoeMat: THREE.MeshStandardMaterial;
  hairMat: THREE.MeshStandardMaterial;
  shadesMesh: THREE.Object3D;
  backpackMesh: THREE.Object3D;
}

/**
 * Shared Anatomical 3D Human Character Builder.
 * Replaces blocky boxes with realistic, sculpted human proportions (~1.76m tall,
 * rounded cranium with ears/nose/eyes/eyebrows/hair, tapered torso, collar, belt,
 * deltoid shoulders, 2-segment arms with elbows & hands, 2-segment legs with knees & sneakers)
 * plus a right-hand weapon socket for GTA-style firearms.
 */
export function buildRealisticHumanRig(
  shadowTex: THREE.Texture,
  opts: HumanRigOptions = {}
): ArticulatedHumanRig {
  const scale = opts.scale ?? 1.0;
  const castShadow = opts.castShadow ?? true;

  const skinMat = new THREE.MeshStandardMaterial({
    color: opts.skinHex ?? 0xbc835d,
    roughness: 0.68,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: opts.hairHex ?? 0x17181d,
    roughness: 0.86,
  });
  const jacketMat = new THREE.MeshStandardMaterial({
    color: opts.jacketHex ?? 0x1e293b,
    roughness: 0.72,
    metalness: 0.08,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: opts.shirtHex ?? 0xe2e8f0,
    roughness: 0.82,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: opts.pantsHex ?? 0x334155,
    roughness: 0.86,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: opts.shoeHex ?? 0xf1f5f9,
    roughness: 0.48,
    metalness: 0.06,
  });
  const soleMat = new THREE.MeshStandardMaterial({ color: 0x181c24, roughness: 0.92 });
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.55 });
  const buckleMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.25,
    metalness: 0.85,
  });
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 });
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.2 });
  const lipMat = new THREE.MeshStandardMaterial({ color: 0x915643, roughness: 0.75 });
  const shadesMat = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    roughness: 0.12,
    metalness: 0.85,
  });
  const packMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });

  const root = new THREE.Group();

  // Contact shadow flush on ground
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.12 * scale, 1.12 * scale),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI * 0.5;
  shadow.position.y = 0.03;
  root.add(shadow);

  // Body pivot sits at pelvis height (~0.92m)
  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.92 * scale;
  bodyPivot.scale.setScalar(scale);
  root.add(bodyPivot);

  const torsoGroup = new THREE.Group();
  bodyPivot.add(torsoGroup);

  // Contoured Pelvis / Hips
  const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(0.145, 0.12, 6, 12), pantsMat);
  pelvis.rotation.z = Math.PI * 0.5;
  pelvis.scale.set(0.85, 1.0, 0.82);
  pelvis.position.y = -0.02;
  pelvis.castShadow = castShadow;
  torsoGroup.add(pelvis);

  // Belt & Metallic Buckle
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.174, 0.055, 14), beltMat);
  belt.scale.set(1.12, 1, 0.74);
  belt.position.y = 0.055;
  torsoGroup.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.046, 0.025), buckleMat);
  buckle.position.set(0, 0.055, 0.128);
  torsoGroup.add(buckle);

  // Anatomical Tapered Torso (athletic V-taper chest + waist)
  const useJacket = opts.hasJacket !== false;
  const upperTorso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.205, 0.165, 0.48, 14),
    useJacket ? jacketMat : shirtMat
  );
  upperTorso.scale.set(1.08, 1, 0.68);
  upperTorso.position.y = 0.31;
  upperTorso.castShadow = castShadow;
  torsoGroup.add(upperTorso);

  // Chest / Inner Shirt V-panel when wearing jacket
  if (useJacket) {
    const innerShirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.1, 0.44, 10),
      shirtMat
    );
    innerShirt.scale.set(0.75, 1, 0.72);
    innerShirt.position.set(0, 0.31, 0.068);
    torsoGroup.add(innerShirt);

    // Jacket Collar
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.026, 6, 14, Math.PI * 1.45), jacketMat);
    collar.rotation.x = Math.PI * 0.5;
    collar.rotation.z = Math.PI * 0.78;
    collar.position.set(0, 0.54, -0.01);
    torsoGroup.add(collar);
  }

  // Optional Tactical Armor Vest (Spec Ops / Gang Boss / Police)
  if (opts.hasVest) {
    const vestMat = new THREE.MeshStandardMaterial({
      color: opts.vestHex ?? 0x0f172a,
      roughness: 0.52,
      metalness: 0.22,
    });
    const vestPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.19, 0.36, 12), vestMat);
    vestPlate.scale.set(1.06, 1, 0.76);
    vestPlate.position.y = 0.32;
    vestPlate.castShadow = castShadow;
    torsoGroup.add(vestPlate);

    // Front tactical pouches
    for (let p = -1; p <= 1; p++) {
      const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.09, 0.04), vestMat);
      pouch.position.set(p * 0.088, 0.2, 0.155);
      torsoGroup.add(pouch);
    }
  }

  // Trapezius / Clavicle slope connecting shoulders naturally to neck
  const trap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.088, 0.215, 0.11, 12),
    useJacket ? jacketMat : shirtMat
  );
  trap.scale.set(1.12, 1, 0.64);
  trap.position.set(0, 0.555, -0.004);
  torsoGroup.add(trap);

  // Rounded Shoulder Caps (Deltoids)
  const shoulderGeo = new THREE.SphereGeometry(0.088, 12, 10);
  const leftShoulderCap = new THREE.Mesh(shoulderGeo, useJacket ? jacketMat : shirtMat);
  leftShoulderCap.scale.set(1.0, 1.08, 0.92);
  leftShoulderCap.position.set(-0.228, 0.508, 0);
  const rightShoulderCap = new THREE.Mesh(shoulderGeo, useJacket ? jacketMat : shirtMat);
  rightShoulderCap.scale.set(1.0, 1.08, 0.92);
  rightShoulderCap.position.set(0.228, 0.508, 0);
  torsoGroup.add(leftShoulderCap, rightShoulderCap);

  // Sculpted Backpack (toggleable)
  const backpackMesh = new THREE.Group();
  const packBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.19, 6, 10), packMat);
  packBody.scale.set(1.18, 1.0, 0.65);
  packBody.position.set(0, 0.33, -0.175);
  packBody.castShadow = castShadow;
  const packPocket = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.06), packMat);
  packPocket.position.set(0, 0.25, -0.245);
  backpackMesh.add(packBody, packPocket);
  backpackMesh.visible = Boolean(opts.hasBackpack);
  torsoGroup.add(backpackMesh);

  // ========================
  // REALISTIC SCULPTED HEAD
  // ========================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.56, 0);
  torsoGroup.add(headGroup);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.072, 0.11, 10), skinMat);
  neck.position.y = 0.04;
  headGroup.add(neck);

  // Cranium + sculpted jaw ellipsoid
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 14), skinMat);
  cranium.scale.set(0.88, 1.08, 0.96);
  cranium.position.set(0, 0.185, 0.006);
  cranium.castShadow = castShadow;
  headGroup.add(cranium);

  // Jaw / Chin contour + sculpted cheekbones
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.084, 12, 10), skinMat);
  jaw.scale.set(0.86, 0.8, 0.9);
  jaw.position.set(0, 0.116, 0.036);
  headGroup.add(jaw);

  const cheekGeo = new THREE.SphereGeometry(0.036, 8, 8);
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(cheekGeo, skinMat);
    cheek.scale.set(1.0, 0.82, 0.8);
    cheek.position.set(side * 0.068, 0.168, 0.088);
    headGroup.add(cheek);
  }

  // Ears
  const earGeo = new THREE.SphereGeometry(0.028, 8, 8);
  const leftEar = new THREE.Mesh(earGeo, skinMat);
  leftEar.scale.set(0.46, 1.18, 0.72);
  leftEar.position.set(-0.112, 0.18, 0.0);
  const rightEar = new THREE.Mesh(earGeo, skinMat);
  rightEar.scale.set(0.46, 1.18, 0.72);
  rightEar.position.set(0.112, 0.18, 0.0);
  headGroup.add(leftEar, rightEar);

  // Sculpted Nose bridge + tip
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.019, 0.054, 6), skinMat);
  nose.rotation.x = Math.PI * 0.42;
  nose.position.set(0, 0.174, 0.125);
  headGroup.add(nose);

  // Eyes (Sclera + Iris) & Eyebrows
  const eyeGeo = new THREE.SphereGeometry(0.017, 8, 8);
  const irisGeo = new THREE.SphereGeometry(0.009, 6, 6);
  const browGeo = new THREE.BoxGeometry(0.036, 0.009, 0.012);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    eye.scale.set(1.1, 0.75, 0.6);
    eye.position.set(side * 0.04, 0.2, 0.108);
    const iris = new THREE.Mesh(irisGeo, irisMat);
    iris.position.set(side * 0.04, 0.2, 0.116);
    const brow = new THREE.Mesh(browGeo, hairMat);
    brow.position.set(side * 0.04, 0.224, 0.112);
    brow.rotation.z = side * -0.08;
    headGroup.add(eye, iris, brow);
  }

  // Mouth / Lips
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.011, 0.012), lipMat);
  mouth.position.set(0, 0.132, 0.11);
  headGroup.add(mouth);

  // Sculpted Hair Volume (rounded crown + side taper or female bun)
  const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.132, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), hairMat);
  hairTop.scale.set(0.9, 1.05, 0.99);
  hairTop.position.set(0, 0.195, -0.002);
  headGroup.add(hairTop);

  const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), hairMat);
  hairBack.scale.set(0.86, 0.95, 0.65);
  hairBack.position.set(0, 0.195, -0.055);
  headGroup.add(hairBack);

  if (opts.femaleHair) {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 10), hairMat);
    bun.position.set(0, 0.18, -0.135);
    headGroup.add(bun);
  }

  // Optional Cap or Tactical Helmet
  if (opts.hasCap) {
    const capMat = new THREE.MeshStandardMaterial({ color: opts.capHex ?? 0x1e3a8a, roughness: 0.65 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), capMat);
    dome.position.set(0, 0.215, 0.004);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.13, 0.014, 12, 1, false, -0.9, 1.8), capMat);
    brim.position.set(0, 0.222, 0.075);
    headGroup.add(dome, brim);
  } else if (opts.hasHelmet) {
    const hMat = new THREE.MeshStandardMaterial({
      color: opts.helmetHex ?? 0x1e293b,
      roughness: 0.36,
      metalness: 0.45,
    });
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.145, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), hMat);
    helmet.position.set(0, 0.205, 0);
    headGroup.add(helmet);
  }

  // Aviator / Tactical Sunglasses (toggleable)
  const shadesMesh = new THREE.Group();
  const lensGeo = new THREE.BoxGeometry(0.058, 0.032, 0.014);
  const leftLens = new THREE.Mesh(lensGeo, shadesMat);
  leftLens.position.set(-0.042, 0.2, 0.124);
  const rightLens = new THREE.Mesh(lensGeo, shadesMat);
  rightLens.position.set(0.042, 0.2, 0.124);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.01, 0.012), shadesMat);
  bridge.position.set(0, 0.206, 0.125);
  shadesMesh.add(leftLens, rightLens, bridge);
  shadesMesh.visible = Boolean(opts.hasSunglasses);
  headGroup.add(shadesMesh);

  // ========================
  // ARTICULATED 2-SEGMENT ARMS + WEAPON SOCKET
  // ========================
  const buildArm = (side: -1 | 1) => {
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(side * 0.25, 0.5, 0);
    torsoGroup.add(shoulderPivot);

    const upperArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.056, 0.21, 6, 10),
      useJacket ? jacketMat : shirtMat
    );
    upperArm.position.y = -0.145;
    upperArm.castShadow = castShadow;
    shoulderPivot.add(upperArm);

    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -0.275, 0);
    shoulderPivot.add(forearmPivot);

    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), skinMat);
    forearmPivot.add(elbow);

    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.044, 0.19, 6, 10), skinMat);
    forearm.position.y = -0.13;
    forearmPivot.add(forearm);

    // Sculpted Palm + Thumb block for natural human hands
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.046, 8, 8), skinMat);
    hand.scale.set(0.82, 1.18, 0.68);
    hand.position.set(0, -0.264, 0.012);
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.034, 4, 6), skinMat);
    thumb.position.set(-side * 0.032, -0.255, 0.032);
    thumb.rotation.x = 0.45;
    thumb.rotation.z = side * 0.35;
    forearmPivot.add(hand, thumb);

    return { shoulderPivot, forearmPivot };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // Right-Hand Weapon Mount Socket (aligned forward when arm raises to aim!)
  const weaponSocket = new THREE.Group();
  weaponSocket.position.set(0, -0.275, 0.04);
  rightArm.forearmPivot.add(weaponSocket);

  // ========================
  // ARTICULATED 2-SEGMENT LEGS + SNEAKERS
  // ========================
  const buildLeg = (side: -1 | 1) => {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(side * 0.105, -0.05, 0);
    bodyPivot.add(hipPivot);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.076, 0.3, 6, 10), pantsMat);
    thigh.position.y = -0.21;
    thigh.castShadow = castShadow;
    hipPivot.add(thigh);

    const shinPivot = new THREE.Group();
    shinPivot.position.set(0, -0.41, 0);
    hipPivot.add(shinPivot);

    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 8), pantsMat);
    shinPivot.add(knee);

    const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.28, 6, 10), pantsMat);
    calf.position.y = -0.19;
    calf.castShadow = castShadow;
    shinPivot.add(calf);

    // Trouser cuff hem at ankle
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.07, 0.045, 10), pantsMat);
    cuff.position.y = -0.355;
    shinPivot.add(cuff);

    // Contoured Sneaker / Boot + Heel Counter + Tongue + Sole
    const shoeUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.115, 6, 10), shoeMat);
    shoeUpper.rotation.x = Math.PI * 0.5;
    shoeUpper.scale.set(1.04, 1.0, 0.8);
    shoeUpper.position.set(0, -0.4, 0.048);
    shinPivot.add(shoeUpper);

    const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.042, 0.065), shoeMat);
    tongue.position.set(0, -0.378, 0.068);
    tongue.rotation.x = 0.32;
    shinPivot.add(tongue);

    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.116, 0.032, 0.235), soleMat);
    sole.position.set(0, -0.435, 0.048);
    shinPivot.add(sole);

    return { hipPivot, shinPivot };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  return {
    root,
    bodyPivot,
    torsoGroup,
    headGroup,
    leftArmPivot: leftArm.shoulderPivot,
    rightArmPivot: rightArm.shoulderPivot,
    leftForearmPivot: leftArm.forearmPivot,
    rightForearmPivot: rightArm.forearmPivot,
    leftLegPivot: leftLeg.hipPivot,
    rightLegPivot: rightLeg.hipPivot,
    leftShinPivot: leftLeg.shinPivot,
    rightShinPivot: rightLeg.shinPivot,
    weaponSocket,
    jacketMat,
    shirtMat,
    pantsMat,
    shoeMat,
    hairMat,
    shadesMesh,
    backpackMesh,
  };
}

/**
 * Builds composite multi-part metallic/polymer 3D weapon models for the right-hand socket.
 * Oriented so barrel points along +Y (or +Z once arm pitches up -PI/2 into aiming stance!).
 * Specifically: when rightArmPivot.rotation.x = -Math.PI/2, local -Y points forward (+Z in character space)!
 * So weapon barrels are oriented along local -Y, grips along +Z (facing wrist).
 */
export function buildWeaponMesh(weaponId: WeaponId): THREE.Group {
  const g = new THREE.Group();
  if (weaponId === 'fist') return g;

  const gunMetal = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.34,
    metalness: 0.82,
  });
  const darkPolymer = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.72,
    metalness: 0.18,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x7c3f1d,
    roughness: 0.68,
    metalness: 0.05,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.22,
    metalness: 0.9,
  });

  // Orient weapon sub-group so +Z in sub-group points out along -Y of arm (forward when aiming!)
  const w = new THREE.Group();
  w.rotation.x = Math.PI * 0.5;
  g.add(w);

  if (weaponId === 'pistol') {
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.055, 0.24), gunMetal);
    slide.position.set(0, 0.03, 0.11);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.11, 0.05), darkPolymer);
    grip.position.set(0, -0.035, 0.02);
    grip.rotation.x = 0.2;
    const barrelTip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.04, 8), chromeMat);
    barrelTip.rotation.x = Math.PI * 0.5;
    barrelTip.position.set(0, 0.032, 0.24);
    w.add(slide, grip, barrelTip);
  } else if (weaponId === 'smg') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.075, 0.3), gunMetal);
    body.position.set(0, 0.035, 0.12);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.052), darkPolymer);
    grip.position.set(0, -0.04, 0.04);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.036), darkPolymer);
    mag.position.set(0, -0.09, 0.16);
    mag.rotation.x = -0.15;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8), chromeMat);
    barrel.rotation.x = Math.PI * 0.5;
    barrel.position.set(0, 0.04, 0.32);
    w.add(body, grip, mag, barrel);
  } else if (weaponId === 'shotgun') {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.078, 0.28), gunMetal);
    receiver.position.set(0, 0.03, 0.14);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.48, 8), gunMetal);
    barrel.rotation.x = Math.PI * 0.5;
    barrel.position.set(0, 0.046, 0.44);
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.18, 8), woodMat);
    pump.rotation.x = Math.PI * 0.5;
    pump.position.set(0, 0.018, 0.39);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.09, 0.24), woodMat);
    stock.position.set(0, -0.01, -0.08);
    stock.rotation.x = 0.15;
    w.add(receiver, barrel, pump, stock);
  } else if (weaponId === 'rifle') {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.082, 0.34), gunMetal);
    receiver.position.set(0, 0.035, 0.16);
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.068, 0.22), woodMat);
    handguard.position.set(0, 0.035, 0.42);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.28, 8), gunMetal);
    barrel.rotation.x = Math.PI * 0.5;
    barrel.position.set(0, 0.042, 0.62);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.2, 0.056), darkPolymer);
    mag.position.set(0, -0.095, 0.24);
    mag.rotation.x = -0.25;
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.095, 0.25), woodMat);
    stock.position.set(0, 0.0, -0.1);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.11, 0.048), darkPolymer);
    grip.position.set(0, -0.04, 0.06);
    grip.rotation.x = 0.22;
    w.add(receiver, handguard, barrel, mag, stock, grip);
  } else if (weaponId === 'sniper') {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.082, 0.42), darkPolymer);
    receiver.position.set(0, 0.035, 0.2);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.56, 8), gunMetal);
    barrel.rotation.x = Math.PI * 0.5;
    barrel.position.set(0, 0.046, 0.65);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.022, 0.26, 10), chromeMat);
    scope.rotation.x = Math.PI * 0.5;
    scope.position.set(0, 0.105, 0.22);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.095, 0.28), darkPolymer);
    stock.position.set(0, 0.01, -0.12);
    w.add(receiver, barrel, scope, stock);
  }

  return g;
}
