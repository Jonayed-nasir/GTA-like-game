import * as THREE from 'three';
import { WeatherType } from '../types/game';

/**
 * Lightweight GPU-pooled 3D Dhaka Monsoon Weather System.
 * Renders up to 900 slanted monsoon rain streaks in a single LineSegments draw call,
 * drives thunder lightning flashes in Storm mode, and automatically hides indoors.
 */
export class WeatherSystem {
  public readonly group = new THREE.Group();
  public currentWeather: WeatherType = 'clear';
  public autoCycle = true;
  public rainIntensity = 0; // 0..1 smooth transition
  public lightningFlash = 0; // 0..1 brief sky flash

  private rainLines: THREE.LineSegments;
  private rainMat: THREE.LineBasicMaterial;
  private dropCount = 900;
  private positions: Float32Array;
  private speeds: Float32Array;
  private autoTimer = 75;
  private thunderTimer = 7;

  constructor() {
    this.positions = new Float32Array(this.dropCount * 6);
    this.speeds = new Float32Array(this.dropCount);

    for (let i = 0; i < this.dropCount; i++) {
      const rx = (Math.random() - 0.5) * 68;
      const ry = Math.random() * 28;
      const rz = (Math.random() - 0.5) * 68;
      const idx = i * 6;
      this.positions[idx] = rx;
      this.positions[idx + 1] = ry;
      this.positions[idx + 2] = rz;
      this.positions[idx + 3] = rx - 0.16;
      this.positions[idx + 4] = ry - 0.95;
      this.positions[idx + 5] = rz - 0.1;
      this.speeds[i] = 22 + Math.random() * 12;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    this.rainMat = new THREE.LineBasicMaterial({
      color: 0xcbe3ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    this.rainLines = new THREE.LineSegments(geo, this.rainMat);
    this.rainLines.frustumCulled = false;
    this.rainLines.visible = false;
    this.group.add(this.rainLines);
  }

  public setWeather(weather: WeatherType, auto: boolean): void {
    this.currentWeather = weather;
    this.autoCycle = auto;
    this.autoTimer = 85;
  }

  public update(
    dt: number,
    focusX: number,
    focusZ: number,
    insideBuilding: boolean
  ): { thunderTriggered: boolean } {
    let thunderTriggered = false;

    if (this.autoCycle) {
      this.autoTimer -= dt;
      if (this.autoTimer <= 0) {
        const order: WeatherType[] = ['clear', 'rain', 'storm'];
        const nextIdx = (order.indexOf(this.currentWeather) + 1) % order.length;
        this.currentWeather = order[nextIdx];
        this.autoTimer = this.currentWeather === 'clear' ? 95 : 55;
      }
    }

    const targetRain =
      this.currentWeather === 'storm' ? 1.0 : this.currentWeather === 'rain' ? 0.68 : 0;
    this.rainIntensity = THREE.MathUtils.damp(this.rainIntensity, targetRain, 2.2, dt);

    // Decay lightning flash
    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 3.8);
    }

    if (this.currentWeather === 'storm' && !insideBuilding) {
      this.thunderTimer -= dt;
      if (this.thunderTimer <= 0) {
        this.lightningFlash = 1.0;
        thunderTriggered = true;
        this.thunderTimer = 9 + Math.random() * 11;
      }
    }

    const showRain = !insideBuilding && this.rainIntensity > 0.03;
    this.rainLines.visible = showRain;
    if (!showRain) return { thunderTriggered };

    this.rainLines.position.set(focusX, 0, focusZ);
    this.rainMat.opacity = this.rainIntensity * 0.42;

    const windX = this.currentWeather === 'storm' ? 0.45 : 0.16;
    const streakLen = this.currentWeather === 'storm' ? 1.35 : 0.95;
    const posArr = this.positions;

    for (let i = 0; i < this.dropCount; i++) {
      const idx = i * 6;
      let y = posArr[idx + 1] - this.speeds[i] * (0.8 + this.rainIntensity * 0.5) * dt;
      let x = posArr[idx] - windX * 7 * dt;
      if (y < 0.2) {
        y = 24 + Math.random() * 5;
        x = (Math.random() - 0.5) * 68;
        posArr[idx + 2] = (Math.random() - 0.5) * 68;
      }
      posArr[idx] = x;
      posArr[idx + 1] = y;
      posArr[idx + 3] = x - windX;
      posArr[idx + 4] = y - streakLen;
      posArr[idx + 5] = posArr[idx + 2] - 0.08;
    }

    const attr = this.rainLines.geometry.getAttribute('position') as THREE.BufferAttribute;
    attr.needsUpdate = true;

    return { thunderTriggered };
  }
}
