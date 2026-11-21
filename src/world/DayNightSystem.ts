import * as THREE from 'three';
import { GraphicsQuality } from '../types/game';

interface LightingCallbacks {
  onNightFactorChange: (nightFactor: number) => void;
}

const _skyColor = new THREE.Color();
const _fogColor = new THREE.Color();
const _sunColor = new THREE.Color();
const _hemiSky = new THREE.Color();
const _hemiGround = new THREE.Color();

const COLOR_NIGHT_SKY = new THREE.Color(0x0c1426);
const COLOR_DAWN_SKY = new THREE.Color(0xe68b5a);
const COLOR_DAY_SKY = new THREE.Color(0x7fb4de);
const COLOR_SUNSET_SKY = new THREE.Color(0xd96b43);

const COLOR_NIGHT_FOG = new THREE.Color(0x0e182d);
const COLOR_DAWN_FOG = new THREE.Color(0xd99b78);
const COLOR_DAY_FOG = new THREE.Color(0xaec8dc);
const COLOR_SUNSET_FOG = new THREE.Color(0xc97b59);

const COLOR_SUN_WARM = new THREE.Color(0xffb06b);
const COLOR_SUN_NOON = new THREE.Color(0xfff5e4);
const COLOR_MOON = new THREE.Color(0x88a8e6);

export class DayNightSystem {
  public timeOfDay = 16.4; // Default golden late afternoon in Dhaka
  public timeScale = 1.0; // 1.0 => ~12 real minutes per 24h cycle
  public nightFactor = 0;

  private scene: THREE.Scene;
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private fillLight: THREE.DirectionalLight;
  private sunDisc: THREE.Mesh;
  private callbacks: LightingCallbacks | null = null;
  private isSoftwareGl: boolean;

  constructor(scene: THREE.Scene, isSoftwareGl: boolean, quality: GraphicsQuality) {
    this.scene = scene;
    this.isSoftwareGl = isSoftwareGl;

    // Warm directional sunlight (Key Light)
    this.sunLight = new THREE.DirectionalLight(0xfff1dc, 2.2);
    this.sunLight.position.set(60, 75, 45);
    this.sunLight.castShadow = !isSoftwareGl && quality !== 'LOW';
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 230;
    const d = 68;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.03;
    this.applyShadowQuality(quality);

    scene.add(this.sunLight);
    scene.add(this.sunLight.target);

    // Cool sky / warm ground bounce fill
    this.hemiLight = new THREE.HemisphereLight(0x9bc4e8, 0x564c42, 0.85);
    this.hemiLight.position.set(0, 80, 0);
    scene.add(this.hemiLight);

    // Subtle opposite rim/fill directional light (no shadow) for crisp architectural depth
    this.fillLight = new THREE.DirectionalLight(0x8cb8e8, 0.42);
    this.fillLight.position.set(-55, 32, -45);
    scene.add(this.fillLight);

    // Visible glowing sun/moon disc in sky
    const discGeo = new THREE.SphereGeometry(7.5, 16, 16);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0xffdf9e,
      fog: false,
    });
    this.sunDisc = new THREE.Mesh(discGeo, discMat);
    scene.add(this.sunDisc);

    this.applyLighting(0, 0);
  }

  public setCallbacks(callbacks: LightingCallbacks): void {
    this.callbacks = callbacks;
    this.callbacks.onNightFactorChange(this.nightFactor);
  }

  public applyShadowQuality(quality: GraphicsQuality): void {
    if (this.isSoftwareGl || quality === 'LOW') {
      this.sunLight.castShadow = false;
      return;
    }
    this.sunLight.castShadow = true;
    const size = quality === 'ULTRA' ? 2048 : quality === 'HIGH' ? 1536 : 1024;
    if (this.sunLight.shadow.mapSize.width !== size) {
      this.sunLight.shadow.mapSize.set(size, size);
      this.sunLight.shadow.map?.dispose();
      this.sunLight.shadow.map = null;
    }
  }

  public setTimeOfDay(hours: number): void {
    this.timeOfDay = ((hours % 24) + 24) % 24;
    this.applyLighting(this.sunLight.target.position.x, this.sunLight.target.position.z);
  }

  public update(
    dt: number,
    focusX: number,
    focusZ: number,
    rainIntensity = 0,
    lightningFlash = 0
  ): void {
    if (this.timeScale > 0) {
      // 0.035 game-hours per second => full 24h cycle in ~11 minutes at 1x
      this.timeOfDay = (this.timeOfDay + dt * 0.035 * this.timeScale) % 24;
    }
    this.applyLighting(focusX, focusZ, rainIntensity, lightningFlash);
  }

  private applyLighting(
    focusX: number,
    focusZ: number,
    rainIntensity = 0,
    lightningFlash = 0
  ): void {
    const h = this.timeOfDay;
    const sunAngle = ((h - 6) / 24) * Math.PI * 2;
    const elevation = Math.sin(sunAngle);
    const horizontal = Math.cos(sunAngle);

    const nf = THREE.MathUtils.clamp(1 - (elevation + 0.14) / 0.36, 0, 1);
    this.nightFactor = nf;

    const dist = 105;
    const isDaySide = elevation >= -0.08;
    const activeElev = isDaySide ? Math.max(0.16, elevation) : Math.max(0.28, -elevation);
    const dirX = (isDaySide ? horizontal : -horizontal) * dist;
    const dirY = activeElev * dist;
    const dirZ = 42;

    this.sunLight.target.position.set(focusX, 0, focusZ);
    this.sunLight.target.updateMatrixWorld();
    this.sunLight.position.set(focusX + dirX, dirY, focusZ + dirZ);

    this.sunDisc.position.set(
      focusX + horizontal * 220,
      Math.max(-25, elevation * 210),
      focusZ - 110
    );
    this.sunDisc.visible = rainIntensity < 0.45;
    const discMat = this.sunDisc.material as THREE.MeshBasicMaterial;

    if (h >= 5 && h < 8) {
      const t = (h - 5) / 3;
      if (t < 0.5) {
        _skyColor.lerpColors(COLOR_NIGHT_SKY, COLOR_DAWN_SKY, t * 2);
        _fogColor.lerpColors(COLOR_NIGHT_FOG, COLOR_DAWN_FOG, t * 2);
      } else {
        _skyColor.lerpColors(COLOR_DAWN_SKY, COLOR_DAY_SKY, (t - 0.5) * 2);
        _fogColor.lerpColors(COLOR_DAWN_FOG, COLOR_DAY_FOG, (t - 0.5) * 2);
      }
      _sunColor.lerpColors(COLOR_SUN_WARM, COLOR_SUN_NOON, t);
      discMat.color.setHex(0xffc978);
    } else if (h >= 8 && h < 16) {
      _skyColor.copy(COLOR_DAY_SKY);
      _fogColor.copy(COLOR_DAY_FOG);
      _sunColor.copy(COLOR_SUN_NOON);
      discMat.color.setHex(0xfff6d6);
    } else if (h >= 16 && h < 19.5) {
      const t = (h - 16) / 3.5;
      if (t < 0.55) {
        const k = t / 0.55;
        _skyColor.lerpColors(COLOR_DAY_SKY, COLOR_SUNSET_SKY, k);
        _fogColor.lerpColors(COLOR_DAY_FOG, COLOR_SUNSET_FOG, k);
      } else {
        const k = (t - 0.55) / 0.45;
        _skyColor.lerpColors(COLOR_SUNSET_SKY, COLOR_NIGHT_SKY, k);
        _fogColor.lerpColors(COLOR_SUNSET_FOG, COLOR_NIGHT_FOG, k);
      }
      _sunColor.lerpColors(COLOR_SUN_NOON, COLOR_SUN_WARM, Math.min(1, t * 1.2));
      discMat.color.setHex(0xff9b54);
    } else {
      _skyColor.copy(COLOR_NIGHT_SKY);
      _fogColor.copy(COLOR_NIGHT_FOG);
      _sunColor.copy(COLOR_MOON);
      discMat.color.setHex(0xcfe0ff);
    }

    // Monsoon overcast mood & lightning flash
    if (rainIntensity > 0.01) {
      _skyColor.lerp(new THREE.Color(0x283548), rainIntensity * 0.62);
      _fogColor.lerp(new THREE.Color(0x324256), rainIntensity * 0.65);
    }
    if (lightningFlash > 0.02) {
      _skyColor.lerp(new THREE.Color(0xdbeafe), lightningFlash * 0.55);
    }

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(_skyColor);
    }
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(_fogColor);
      const baseDensity = THREE.MathUtils.lerp(0.0034, 0.0052, nf);
      this.scene.fog.density = baseDensity + rainIntensity * 0.0046;
    }

    this.sunLight.color.copy(_sunColor);
    const rainDim = 1 - rainIntensity * 0.42;
    this.sunLight.intensity =
      THREE.MathUtils.lerp(2.35, 0.62, nf) * rainDim + lightningFlash * 2.1;

    _hemiSky.lerpColors(COLOR_DAY_SKY, new THREE.Color(0x28406e), nf);
    _hemiGround.lerpColors(new THREE.Color(0x695d50), new THREE.Color(0x1b202b), nf);
    this.hemiLight.color.copy(_hemiSky);
    this.hemiLight.groundColor.copy(_hemiGround);
    this.hemiLight.intensity =
      THREE.MathUtils.lerp(0.88, 0.44, nf) * (1 - rainIntensity * 0.25) + lightningFlash * 0.9;

    this.fillLight.intensity = THREE.MathUtils.lerp(0.42, 0.22, nf);
    this.scene.environmentIntensity = THREE.MathUtils.lerp(0.68, 0.24, nf) + rainIntensity * 0.14;

    this.callbacks?.onNightFactorChange(Math.max(nf, rainIntensity * 0.55));
  }
}
