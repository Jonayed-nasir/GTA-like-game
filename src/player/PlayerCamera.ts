import * as THREE from 'three';
import { PhysicsWorld } from '../core/PhysicsWorld';
import { CameraMode, VehicleCameraPreset, VehicleKind } from '../types/game';

const _targetPos = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();

function presetToMode(preset: VehicleCameraPreset): CameraMode {
  if (preset === 'close') return 'vehicle_close';
  if (preset === 'far') return 'vehicle_far';
  return 'vehicle_normal';
}

export class PlayerCamera {
  public yaw = 0.35;
  public pitch = 0.22;
  public mode: CameraMode = 'third_person';
  public preferredVehiclePreset: VehicleCameraPreset = 'normal';
  public manualVehicleZoom = 0.96; // 0.72..1.45

  private camera: THREE.PerspectiveCamera;
  private smoothLookAt = new THREE.Vector3();
  private userLookCooldown = 0;
  private initialized = false;
  private currentRightOffset = 0;
  private currentDistance = 5.8;
  private currentClipFraction = 1.0;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  public rotate(deltaX: number, deltaY: number, sensitivity = 1.0): void {
    this.yaw -= deltaX * 0.0058 * sensitivity;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch + deltaY * 0.0045 * sensitivity,
      -0.26,
      0.82
    );
    this.userLookCooldown = 2.2;
  }

  public addRecoilKick(amount: number): void {
    this.pitch = THREE.MathUtils.clamp(this.pitch - amount, -0.26, 0.82);
  }

  public snapTo(yaw: number, pitch = 0.22): void {
    this.yaw = yaw;
    this.pitch = pitch;
    this.initialized = false;
    this.currentClipFraction = 1.0;
  }

  public setVehicleCameraPreset(preset: VehicleCameraPreset, inVehicle: boolean): void {
    this.preferredVehiclePreset = preset;
    if (inVehicle) {
      this.mode = presetToMode(preset);
    }
  }

  public setManualVehicleZoom(zoom: number): void {
    this.manualVehicleZoom = THREE.MathUtils.clamp(zoom, 0.72, 1.45);
  }

  public cycleMode(inVehicle: boolean): CameraMode {
    if (!inVehicle) {
      this.mode = 'third_person';
      return this.mode;
    }
    const order: CameraMode[] = [
      'vehicle_close',
      'vehicle_normal',
      'vehicle_far',
      'vehicle_first_person',
    ];
    const idx = order.indexOf(this.mode);
    const next = order[(idx + 1) % order.length];
    this.mode = next;
    if (next === 'vehicle_close') this.preferredVehiclePreset = 'close';
    else if (next === 'vehicle_normal') this.preferredVehiclePreset = 'normal';
    else if (next === 'vehicle_far') this.preferredVehiclePreset = 'far';
    return this.mode;
  }

  public setInVehicle(inVehicle: boolean, vehicleYaw: number): void {
    if (inVehicle) {
      this.mode = presetToMode(this.preferredVehiclePreset);
      this.yaw = vehicleYaw + Math.PI;
      this.pitch = 0.2;
    } else {
      this.mode = 'third_person';
      this.pitch = 0.22;
    }
  }

  public update(
    dt: number,
    targetX: number,
    targetY: number,
    targetZ: number,
    targetYaw: number,
    inVehicle: boolean,
    vehicleSpeed: number,
    physics: PhysicsWorld,
    isAiming = false,
    aimFov = 48,
    cameraShake = 0,
    holdingGun = false,
    vehicleKind: VehicleKind | null = null
  ): void {
    this.userLookCooldown = Math.max(0, this.userLookCooldown - dt);
    const inside = physics.isInteriorMode();
    const onFootAim = !inVehicle && isAiming;
    const onFootArmed = !inVehicle && !inside && (holdingGun || onFootAim);

    // Tuned lower base FOV for vehicles so cars/CNGs/bikes look appropriately large & bold on mobile screens
    const speedNorm = Math.min(1, Math.abs(vehicleSpeed) / 36);
    let targetFov = 60;
    if (inVehicle) {
      if (this.mode === 'vehicle_first_person') {
        targetFov = 66 + speedNorm * 8;
      } else if (this.mode === 'vehicle_close') {
        targetFov = 50 + speedNorm * 7;
      } else if (this.mode === 'vehicle_far') {
        targetFov = 58 + speedNorm * 9;
      } else {
        targetFov = 54 + speedNorm * 8;
      }
    } else if (onFootAim) {
      targetFov = aimFov;
    } else if (inside) {
      targetFov = 63;
    }

    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, onFootAim ? 10 : 6.5, dt);
      this.camera.updateProjectionMatrix();
    }

    if (inVehicle && this.mode === 'vehicle_first_person') {
      const forwardX = Math.sin(targetYaw);
      const forwardZ = Math.cos(targetYaw);
      const cabinH = vehicleKind === 'bus' || vehicleKind === 'truck' ? 2.25 : 1.52;
      _desiredCamPos.set(
        targetX + forwardX * 0.4,
        targetY + cabinH,
        targetZ + forwardZ * 0.4
      );
      _targetPos.set(
        targetX + forwardX * 15,
        targetY + cabinH - 0.14,
        targetZ + forwardZ * 15
      );
      this.camera.position.lerp(_desiredCamPos, 1 - Math.exp(-22 * dt));
      this.smoothLookAt.lerp(_targetPos, 1 - Math.exp(-22 * dt));
      this.camera.lookAt(this.smoothLookAt);
      return;
    }

    // Smooth auto-align chase camera behind vehicle
    if (inVehicle && this.userLookCooldown <= 0 && Math.abs(vehicleSpeed) > 1.4) {
      const behindYaw = vehicleSpeed >= 0 ? targetYaw + Math.PI : targetYaw;
      let diff = behindYaw - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * (1 - Math.exp(-4.6 * dt));
    }

    // Over-the-shoulder offset on foot keeps player in lower-left third and center reticle clear
    const desiredRight = onFootAim ? 0.96 : onFootArmed ? 0.64 : !inVehicle && !inside ? 0.34 : 0;
    this.currentRightOffset = THREE.MathUtils.damp(this.currentRightOffset, desiredRight, 12, dt);

    // Vehicle-aware hero camera framing (preserves 100% real 3D vehicle physics & collision dimensions)
    let vehicleSizeOffset = 0;
    let vehicleHeightBoost = 0;
    if (inVehicle) {
      if (vehicleKind === 'helicopter') {
        vehicleSizeOffset = 2.6;
        vehicleHeightBoost = 0.7;
      } else if (vehicleKind === 'bus' || vehicleKind === 'truck') {
        vehicleSizeOffset = 1.65;
        vehicleHeightBoost = 0.65;
      } else if (vehicleKind === 'speedboat') {
        vehicleSizeOffset = 0.85;
        vehicleHeightBoost = 0.2;
      } else if (vehicleKind === 'motorcycle' || vehicleKind === 'cng') {
        vehicleSizeOffset = -0.42;
        vehicleHeightBoost = -0.14;
      }
    }

    let baseVehDist = 5.85;
    let baseVehHeight = 1.58;
    if (this.mode === 'vehicle_close') {
      baseVehDist = 4.75;
      baseVehHeight = 1.38;
    } else if (this.mode === 'vehicle_far') {
      baseVehDist = 7.55;
      baseVehHeight = 2.02;
    }

    const desiredDist = onFootAim
      ? 2.45
      : inside
        ? 3.55
        : inVehicle
          ? Math.max(3.6, (baseVehDist + vehicleSizeOffset + speedNorm * 0.55) * this.manualVehicleZoom)
          : onFootArmed
            ? 4.35
            : 4.85;

    this.currentDistance = THREE.MathUtils.damp(this.currentDistance, desiredDist, 8.5, dt);

    const heightOffset = onFootAim
      ? 1.66
      : inside
        ? 1.45
        : inVehicle
          ? baseVehHeight + vehicleHeightBoost
          : onFootArmed
            ? 1.68
            : 1.56;
    const effectivePitch = inside
      ? THREE.MathUtils.clamp(this.pitch, 0.05, 0.42)
      : inVehicle
        ? THREE.MathUtils.clamp(this.pitch, 0.04, 0.65)
        : this.pitch;

    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);
    const forwardX = -Math.sin(this.yaw);
    const forwardZ = -Math.cos(this.yaw);

    const anchorX = targetX + rightX * this.currentRightOffset * (inVehicle ? 0 : 0.65);
    const anchorY = targetY + heightOffset;
    const anchorZ = targetZ + rightZ * this.currentRightOffset * (inVehicle ? 0 : 0.65);

    const horizDist = Math.cos(effectivePitch) * this.currentDistance;
    let rawCamX = targetX + Math.sin(this.yaw) * horizDist + rightX * this.currentRightOffset;
    let rawCamZ = targetZ + Math.cos(this.yaw) * horizDist + rightZ * this.currentRightOffset;
    const rawCamY = anchorY + Math.sin(effectivePitch) * this.currentDistance;

    // Anti-clipping building raycast so camera never phases through Dhaka walls/buildings
    let targetClipFrac = 1.0;
    if (!inside) {
      targetClipFrac = physics.raycastCameraFraction(
        anchorX,
        anchorY,
        anchorZ,
        rawCamX,
        rawCamY,
        rawCamZ,
        0.46
      );
    }
    const clipSpeed = targetClipFrac < this.currentClipFraction ? 22 : 6.5;
    this.currentClipFraction = THREE.MathUtils.damp(
      this.currentClipFraction,
      targetClipFrac,
      clipSpeed,
      dt
    );

    let camX = anchorX + (rawCamX - anchorX) * this.currentClipFraction;
    let camZ = anchorZ + (rawCamZ - anchorZ) * this.currentClipFraction;
    const camYRaw = anchorY + (rawCamY - anchorY) * this.currentClipFraction;

    if (inside) {
      const b = physics.getWorldBounds();
      camX = THREE.MathUtils.clamp(camX, b.minX + 0.35, b.maxX - 0.35);
      camZ = THREE.MathUtils.clamp(camZ, b.minZ + 0.35, b.maxZ - 0.35);
    }

    const groundUnderCam = physics.getGroundHeightAt(camX, camZ);
    const maxCamY = inside ? 3.35 : 999;
    const camY = THREE.MathUtils.clamp(
      camYRaw,
      Math.max(targetY + 0.95, groundUnderCam + 0.78),
      maxCamY
    );

    const shakeX = cameraShake > 0.01 ? (Math.random() - 0.5) * cameraShake * 0.75 : 0;
    const shakeY = cameraShake > 0.01 ? (Math.random() - 0.5) * cameraShake * 0.75 : 0;

    _desiredCamPos.set(camX + shakeX, camY + shakeY, camZ);

    if (onFootArmed) {
      const lookDist = 36;
      const pitchSlope = onFootAim ? 0.92 : 0.72;
      _targetPos.set(
        targetX + rightX * this.currentRightOffset + forwardX * lookDist,
        targetY + heightOffset - Math.sin(effectivePitch) * lookDist * pitchSlope,
        targetZ + rightZ * this.currentRightOffset + forwardZ * lookDist
      );
    } else if (inVehicle) {
      // Slightly forward-weighted focus point keeps vehicle large & centered while showing road ahead
      _targetPos.set(
        targetX + Math.sin(targetYaw) * 1.15,
        targetY + (vehicleKind === 'bus' || vehicleKind === 'truck' ? 1.85 : 1.18),
        targetZ + Math.cos(targetYaw) * 1.15
      );
    } else {
      _targetPos.set(anchorX, anchorY, anchorZ);
    }

    if (!this.initialized) {
      this.camera.position.copy(_desiredCamPos);
      this.smoothLookAt.copy(_targetPos);
      this.initialized = true;
    } else {
      const stiffness = onFootAim ? 18.0 : onFootArmed ? 14.0 : inVehicle ? 11.5 : 12.0;
      const alpha = 1 - Math.exp(-stiffness * dt);
      this.camera.position.lerp(_desiredCamPos, alpha);
      this.smoothLookAt.lerp(_targetPos, 1 - Math.exp(-(onFootAim ? 20 : 16) * dt));
    }

    this.camera.lookAt(this.smoothLookAt);
  }
}
