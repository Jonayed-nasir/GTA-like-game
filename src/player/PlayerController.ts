import * as THREE from 'three';
import { DynamicObstacleCircle, PhysicsWorld } from '../core/PhysicsWorld';
import {
  ArticulatedHumanRig,
  buildRealisticHumanRig,
  buildWeaponMesh,
} from '../entities/HumanRigBuilder';
import { DEFAULT_APPEARANCE } from '../save/SaveManager';
import { InputState, PlayerAppearance, WeaponId } from '../types/game';

const _resolved = { x: 0, z: 0 };

export class PlayerController {
  public readonly root: THREE.Group;
  public x = -12.5;
  public y = 0.18;
  public z = 17.5;
  public yaw = 0.35;
  public speed = 0;
  public speedRatio = 0;
  public stamina = 100; // 0..100
  public grounded = true;
  public visible = true;

  private vy = 0;
  private animPhase = 0;
  private rig: ArticulatedHumanRig;
  private currentWeaponId: WeaponId = 'fist';
  private activeWeaponMesh: THREE.Group | null = null;
  private weaponCache = new Map<WeaponId, THREE.Group>();
  private combatStanceTimer = 0;
  private punchSide: 1 | -1 = 1;

  private readonly walkSpeed = 4.4;
  private readonly sprintSpeed = 8.4;
  private readonly aimWalkSpeed = 3.2;
  private readonly jumpSpeed = 7.4;
  private readonly gravity = 20.0;
  private readonly playerRadius = 0.48;

  constructor(shadowTex: THREE.Texture, initialAppearance?: PlayerAppearance) {
    this.rig = buildRealisticHumanRig(shadowTex, {
      hasJacket: true,
      hasSunglasses: true,
      hasBackpack: true,
      castShadow: true,
    });
    this.root = this.rig.root;
    this.applyAppearance(initialAppearance ?? DEFAULT_APPEARANCE);
    this.setEquippedWeapon('pistol');
    this.root.position.set(this.x, this.y, this.z);
    this.root.rotation.y = this.yaw;
  }

  public setEquippedWeapon(weaponId: WeaponId): void {
    if (this.currentWeaponId === weaponId && this.activeWeaponMesh) return;
    this.currentWeaponId = weaponId;
    if (this.activeWeaponMesh) {
      this.activeWeaponMesh.visible = false;
    }
    let mesh = this.weaponCache.get(weaponId);
    if (!mesh) {
      mesh = buildWeaponMesh(weaponId);
      this.weaponCache.set(weaponId, mesh);
      this.rig.weaponSocket.add(mesh);
    }
    mesh.visible = weaponId !== 'fist';
    this.activeWeaponMesh = mesh;
  }

  public notifyFired(isMelee: boolean): void {
    this.combatStanceTimer = isMelee ? 0.55 : 1.6;
    if (isMelee) {
      this.punchSide = this.punchSide === 1 ? -1 : 1;
    }
  }

  public getMuzzleWorldPosition(out: THREE.Vector3): THREE.Vector3 {
    this.root.updateWorldMatrix(true, true);
    this.rig.weaponSocket.getWorldPosition(out);
    // Project slightly forward along player facing direction for gun barrel tip
    const fwdOffset = this.currentWeaponId === 'fist' ? 0.35 : 0.48;
    out.x += Math.sin(this.yaw) * fwdOffset;
    out.z += Math.cos(this.yaw) * fwdOffset;
    return out;
  }

  public applyAppearance(app: PlayerAppearance): void {
    this.rig.jacketMat.color.setHex(app.jacketColor);
    this.rig.shirtMat.color.setHex(app.shirtColor);
    this.rig.pantsMat.color.setHex(app.pantsColor);
    this.rig.shoeMat.color.setHex(app.shoeColor);
    this.rig.hairMat.color.setHex(app.hairColor);
    this.rig.shadesMesh.visible = app.hasSunglasses;
    this.rig.backpackMesh.visible = app.hasBackpack;
  }

  public setPosition(x: number, z: number, yaw = 0, y?: number): void {
    this.x = x;
    this.z = z;
    if (typeof y === 'number') this.y = y;
    this.yaw = yaw;
    this.vy = 0;
    this.speed = 0;
    this.root.position.set(this.x, this.y, this.z);
    this.root.rotation.y = this.yaw;
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.root.visible = visible;
  }

  public update(
    dt: number,
    input: InputState,
    cameraYaw: number,
    physics: PhysicsWorld,
    dynamicObstacles: DynamicObstacleCircle[] = [],
    isAiming = false,
    punchSwingTimer = 0
  ): void {
    if (!this.visible) return;

    this.combatStanceTimer = Math.max(0, this.combatStanceTimer - dt);
    const combatActive = isAiming || input.fire || this.combatStanceTimer > 0;
    const holdingGun = this.currentWeaponId !== 'fist';

    const mag = Math.min(1, Math.hypot(input.moveX, input.moveY));
    const canSprint = this.stamina > 4 && !isAiming;
    const wantsSprint = input.sprint && mag > 0.35 && !physics.isInteriorMode() && canSprint;
    if (wantsSprint) {
      this.stamina = Math.max(0, this.stamina - 22 * dt);
    } else {
      this.stamina = Math.min(100, this.stamina + (mag > 0.1 ? 14 : 26) * dt);
    }

    const baseMax = isAiming
      ? this.aimWalkSpeed
      : wantsSprint
        ? this.sprintSpeed
        : this.walkSpeed;
    const targetSpeed = mag > 0.06 ? mag * baseMax : 0;

    this.speed = THREE.MathUtils.damp(this.speed, targetSpeed, 11, dt);
    this.speedRatio = this.speed / this.sprintSpeed;

    // Face camera forward direction smoothly whenever aiming or firing (GTA 5 strafe-aim!)
    const camForwardYaw = Math.atan2(-Math.sin(cameraYaw), -Math.cos(cameraYaw));

    if (mag > 0.08) {
      const forwardX = -Math.sin(cameraYaw);
      const forwardZ = -Math.cos(cameraYaw);
      const rightX = Math.cos(cameraYaw);
      const rightZ = -Math.sin(cameraYaw);

      const dirX = forwardX * input.moveY + rightX * input.moveX;
      const dirZ = forwardZ * input.moveY + rightZ * input.moveX;
      const len = Math.hypot(dirX, dirZ) || 1;
      const ndx = dirX / len;
      const ndz = dirZ / len;

      const desiredYaw = combatActive ? camForwardYaw : Math.atan2(ndx, ndz);
      let diff = desiredYaw - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * (1 - Math.exp(-(combatActive ? 18 : 13) * dt));

      const nx = this.x + ndx * this.speed * dt;
      const nz = this.z + ndz * this.speed * dt;
      physics.resolveCircleStatic(nx, nz, this.playerRadius, _resolved);
      if (dynamicObstacles.length > 0 && !physics.isInteriorMode()) {
        physics.resolveCircleDynamic(
          _resolved.x,
          _resolved.z,
          this.playerRadius,
          dynamicObstacles,
          null,
          _resolved
        );
      }
      this.x = _resolved.x;
      this.z = _resolved.z;
    } else if (combatActive) {
      let diff = camForwardYaw - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * (1 - Math.exp(-18 * dt));
    }

    const groundY = physics.getGroundHeightAt(this.x, this.z);
    if (input.jump && this.grounded && !physics.isInteriorMode()) {
      this.vy = this.jumpSpeed;
      this.grounded = false;
    }

    this.vy -= this.gravity * dt;
    this.y += this.vy * dt;
    if (this.y <= groundY) {
      this.y = groundY;
      this.vy = 0;
      this.grounded = true;
    }

    this.root.position.set(this.x, this.y, this.z);
    this.root.rotation.y = this.yaw;

    // Articulated human locomotion + knee bend + realistic combat aiming/punching poses
    const {
      bodyPivot,
      leftArmPivot,
      rightArmPivot,
      leftForearmPivot,
      rightForearmPivot,
      leftLegPivot,
      rightLegPivot,
      leftShinPivot,
      rightShinPivot,
    } = this.rig;

    if (!this.grounded) {
      leftLegPivot.rotation.x = THREE.MathUtils.damp(leftLegPivot.rotation.x, 0.45, 10, dt);
      rightLegPivot.rotation.x = THREE.MathUtils.damp(rightLegPivot.rotation.x, -0.35, 10, dt);
      leftShinPivot.rotation.x = THREE.MathUtils.damp(leftShinPivot.rotation.x, 0.45, 10, dt);
      rightShinPivot.rotation.x = THREE.MathUtils.damp(rightShinPivot.rotation.x, 0.35, 10, dt);
      bodyPivot.position.y = THREE.MathUtils.damp(bodyPivot.position.y, 0.98, 12, dt);
    } else if (this.speed > 0.25) {
      const freq = wantsSprint ? 12.2 : 8.2;
      const amp = wantsSprint ? 0.72 : 0.44;
      this.animPhase += dt * freq;

      const swing = Math.sin(this.animPhase) * amp;
      leftLegPivot.rotation.x = swing;
      rightLegPivot.rotation.x = -swing;
      // Natural knee bend during stride
      leftShinPivot.rotation.x = Math.max(0, -swing * 0.75 + 0.12);
      rightShinPivot.rotation.x = Math.max(0, swing * 0.75 + 0.12);

      const bob = Math.abs(Math.cos(this.animPhase)) * (wantsSprint ? 0.065 : 0.036);
      bodyPivot.position.y = 0.92 + bob;
      bodyPivot.rotation.x = THREE.MathUtils.damp(
        bodyPivot.rotation.x,
        wantsSprint ? 0.12 : 0.04,
        8,
        dt
      );
    } else {
      this.animPhase += dt * 2.1;
      const breath = Math.sin(this.animPhase) * 0.012;
      bodyPivot.position.y = THREE.MathUtils.damp(bodyPivot.position.y, 0.92 + breath, 8, dt);
      bodyPivot.rotation.x = THREE.MathUtils.damp(bodyPivot.rotation.x, 0, 8, dt);
      leftLegPivot.rotation.x = THREE.MathUtils.damp(leftLegPivot.rotation.x, 0, 10, dt);
      rightLegPivot.rotation.x = THREE.MathUtils.damp(rightLegPivot.rotation.x, 0, 10, dt);
      leftShinPivot.rotation.x = THREE.MathUtils.damp(leftShinPivot.rotation.x, 0.04, 10, dt);
      rightShinPivot.rotation.x = THREE.MathUtils.damp(rightShinPivot.rotation.x, 0.04, 10, dt);
    }

    // Upper-body Arm Animation: Aiming/Shooting, Melee Punching, or Natural Stride
    if (punchSwingTimer > 0 && !holdingGun) {
      const punchArc = Math.sin((punchSwingTimer / 0.28) * Math.PI);
      if (this.punchSide === 1) {
        rightArmPivot.rotation.x = -1.55 * punchArc - 0.35;
        rightForearmPivot.rotation.x = -0.35 * (1 - punchArc);
        leftArmPivot.rotation.x = -0.65;
        leftForearmPivot.rotation.x = -0.9;
      } else {
        leftArmPivot.rotation.x = -1.55 * punchArc - 0.35;
        leftForearmPivot.rotation.x = -0.35 * (1 - punchArc);
        rightArmPivot.rotation.x = -0.65;
        rightForearmPivot.rotation.x = -0.9;
      }
      rightArmPivot.rotation.y = 0;
      leftArmPivot.rotation.y = 0;
    } else if (holdingGun && combatActive) {
      // Realistic GTA-style shooting stance: right arm raised straight forward, left arm supports grip/handguard
      rightArmPivot.rotation.x = THREE.MathUtils.damp(rightArmPivot.rotation.x, -1.52, 16, dt);
      rightForearmPivot.rotation.x = THREE.MathUtils.damp(rightForearmPivot.rotation.x, -0.05, 16, dt);
      rightArmPivot.rotation.y = THREE.MathUtils.damp(rightArmPivot.rotation.y, 0.06, 14, dt);

      const twoHanded =
        this.currentWeaponId === 'rifle' ||
        this.currentWeaponId === 'shotgun' ||
        this.currentWeaponId === 'sniper';
      leftArmPivot.rotation.x = THREE.MathUtils.damp(
        leftArmPivot.rotation.x,
        twoHanded ? -1.35 : -1.15,
        16,
        dt
      );
      leftArmPivot.rotation.y = THREE.MathUtils.damp(
        leftArmPivot.rotation.y,
        twoHanded ? -0.45 : -0.32,
        14,
        dt
      );
      leftForearmPivot.rotation.x = THREE.MathUtils.damp(
        leftForearmPivot.rotation.x,
        twoHanded ? -0.32 : -0.45,
        16,
        dt
      );
    } else if (this.speed > 0.25 && this.grounded) {
      const swing = Math.sin(this.animPhase) * (wantsSprint ? 0.62 : 0.38);
      leftArmPivot.rotation.x = -swing;
      leftArmPivot.rotation.y = THREE.MathUtils.damp(leftArmPivot.rotation.y, 0, 12, dt);
      leftForearmPivot.rotation.x = THREE.MathUtils.damp(leftForearmPivot.rotation.x, -0.28, 10, dt);

      rightArmPivot.rotation.x = holdingGun ? -0.35 + swing * 0.35 : swing;
      rightArmPivot.rotation.y = THREE.MathUtils.damp(rightArmPivot.rotation.y, 0, 12, dt);
      rightForearmPivot.rotation.x = THREE.MathUtils.damp(
        rightForearmPivot.rotation.x,
        holdingGun ? -0.45 : -0.28,
        10,
        dt
      );
    } else {
      leftArmPivot.rotation.x = THREE.MathUtils.damp(leftArmPivot.rotation.x, 0.03, 10, dt);
      leftArmPivot.rotation.y = THREE.MathUtils.damp(leftArmPivot.rotation.y, 0, 10, dt);
      leftForearmPivot.rotation.x = THREE.MathUtils.damp(leftForearmPivot.rotation.x, -0.14, 10, dt);

      rightArmPivot.rotation.x = THREE.MathUtils.damp(
        rightArmPivot.rotation.x,
        holdingGun ? -0.26 : -0.03,
        10,
        dt
      );
      rightArmPivot.rotation.y = THREE.MathUtils.damp(rightArmPivot.rotation.y, 0, 10, dt);
      rightForearmPivot.rotation.x = THREE.MathUtils.damp(
        rightForearmPivot.rotation.x,
        holdingGun ? -0.35 : -0.14,
        10,
        dt
      );
    }
  }
}
