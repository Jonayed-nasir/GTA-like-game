import * as THREE from 'three';
import { createInitialAmmoState, WEAPON_CATALOG, WeaponAmmoState, WEAPON_ORDER } from '../data/weapons';
import { HitMarkerType, WeaponId } from '../types/game';

export interface ShootableTarget {
  kind: 'hostile' | 'npc' | 'vehicle' | 'traffic' | 'police';
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  height: number;
  headY?: number; // If defined, hits near headY count as headshot!
}

export interface CombatHitResult {
  kind: ShootableTarget['kind'] | 'world';
  targetId?: string;
  point: THREE.Vector3;
  isHeadshot: boolean;
  damage: number;
  vehicleDamage: number;
}

interface BulletTracer {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

interface ImpactParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scaleGrow: number;
}

interface ExplosionEffect {
  fireball: THREE.Mesh;
  ring: THREE.Mesh;
  light: THREE.PointLight;
  life: number;
  maxLife: number;
}

const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _toTarget = new THREE.Vector3();
const _hitPoint = new THREE.Vector3();
const _muzzlePos = new THREE.Vector3();

/**
 * Full GTA 5 / GTA 6 / Vice City-Style 3D Weapon, Ballistics, Sparks & Explosion System.
 * Supports shooting ANY object in the 3D world: mission hostiles/bosses, city NPCs,
 * parked/traffic/police vehicles (with fire & explosions), and buildings/roads/ground.
 */
export class CombatSystem {
  public readonly group = new THREE.Group();

  public equippedWeapon: WeaponId = 'pistol';
  public ammo: Record<WeaponId, WeaponAmmoState> = createInitialAmmoState();
  public isAiming = false;
  public isReloading = false;
  public reloadTimer = 0;
  public fireCooldown = 0;
  public hitMarker: HitMarkerType = 'none';
  public hitMarkerTimer = 0;
  public punchSwingTimer = 0;
  public cameraShake = 0;

  private muzzleLight: THREE.PointLight;
  private muzzleFlashMesh: THREE.Mesh;
  private muzzleTimer = 0;
  private tracers: BulletTracer[] = [];
  private particles: ImpactParticle[] = [];
  private explosions: ExplosionEffect[] = [];

  // Shared geometries for zero allocation spike
  private sparkGeo = new THREE.SphereGeometry(0.08, 6, 6);
  private tracerGeo = new THREE.BoxGeometry(0.045, 0.045, 1);
  private explosionGeo = new THREE.SphereGeometry(1.0, 14, 12);
  private ringGeo = new THREE.RingGeometry(0.6, 1.2, 22);

  constructor() {
    this.muzzleLight = new THREE.PointLight(0xffb74d, 0, 14, 1.8);
    this.group.add(this.muzzleLight);

    this.muzzleFlashMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18, 0),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.95 })
    );
    this.muzzleFlashMesh.visible = false;
    this.group.add(this.muzzleFlashMesh);
  }

  public equipWeapon(weaponId: WeaponId): void {
    if (this.equippedWeapon === weaponId) return;
    this.equippedWeapon = weaponId;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.fireCooldown = 0.14;
  }

  public cycleWeapon(delta = 1): WeaponId {
    const idx = WEAPON_ORDER.indexOf(this.equippedWeapon);
    const nextIdx = (idx + delta + WEAPON_ORDER.length) % WEAPON_ORDER.length;
    this.equipWeapon(WEAPON_ORDER[nextIdx]);
    return this.equippedWeapon;
  }

  public refillAllAmmo(): void {
    this.ammo = createInitialAmmoState();
    this.isReloading = false;
    this.reloadTimer = 0;
  }

  public startReload(): boolean {
    const def = WEAPON_CATALOG[this.equippedWeapon];
    if (def.magSize <= 0 || this.isReloading) return false;
    const st = this.ammo[this.equippedWeapon];
    if (st.mag >= def.magSize || st.reserve <= 0) return false;
    this.isReloading = true;
    this.reloadTimer = def.reloadSec;
    return true;
  }

  public triggerHitMarker(type: HitMarkerType): void {
    // Prefer stronger marker if already flashing
    const rank: Record<HitMarkerType, number> = { none: 0, hit: 1, headshot: 2, kill: 3 };
    if (rank[type] >= rank[this.hitMarker] || this.hitMarkerTimer <= 0.04) {
      this.hitMarker = type;
      this.hitMarkerTimer = type === 'kill' || type === 'headshot' ? 0.34 : 0.2;
    }
  }

  /**
   * Fast zero-allocation center-ray probe to highlight the crosshair crimson when hovering over a valid target.
   */
  public hasTargetUnderCrosshair(
    camera: THREE.PerspectiveCamera,
    muzzleWorldPos: THREE.Vector3,
    targets: ShootableTarget[],
    inVehicle: boolean
  ): boolean {
    const def = WEAPON_CATALOG[this.equippedWeapon];
    if (inVehicle && !def.driveByAllowed) return false;
    camera.getWorldPosition(_rayOrigin);
    camera.getWorldDirection(_rayDir).normalize();
    const origin = def.category === 'melee' ? muzzleWorldPos : _rayOrigin;
    const maxRange = def.range;

    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const centerY = t.y + t.height * 0.5;
      _toTarget.set(t.x - origin.x, centerY - origin.y, t.z - origin.z);
      const along = _toTarget.dot(_rayDir);
      if (along < (def.category === 'melee' ? -0.3 : 1.8) || along > maxRange) continue;
      const cx = origin.x + _rayDir.x * along;
      const cy = origin.y + _rayDir.y * along;
      const cz = origin.z + _rayDir.z * along;
      const horizDist = Math.hypot(cx - t.x, cz - t.z);
      const withinHeight = cy >= t.y - 0.2 && cy <= t.y + t.height + 0.35;
      const hitRadius = t.radius + (t.kind === 'hostile' || t.kind === 'npc' ? 0.34 : 0.25);
      if (horizDist <= hitRadius && withinHeight) {
        return true;
      }
    }
    return false;
  }

  /**
   * Fires the currently equipped weapon along the camera's 3D crosshair ray
   * (with subtle GTA-style lock-assist inside a tight cone for smooth mobile play).
   */
  public tryFire(
    camera: THREE.PerspectiveCamera,
    muzzleWorldPos: THREE.Vector3,
    targets: ShootableTarget[],
    worldRayObjects: THREE.Object3D[],
    inVehicle: boolean
  ): { fired: boolean; weaponId: WeaponId; hits: CombatHitResult[]; startedReload: boolean } {
    const def = WEAPON_CATALOG[this.equippedWeapon];
    if (this.fireCooldown > 0 || this.isReloading) {
      return { fired: false, weaponId: this.equippedWeapon, hits: [], startedReload: false };
    }
    if (inVehicle && !def.driveByAllowed) {
      return { fired: false, weaponId: this.equippedWeapon, hits: [], startedReload: false };
    }

    // Check magazine
    if (def.magSize > 0) {
      const st = this.ammo[this.equippedWeapon];
      if (st.mag <= 0) {
        const started = this.startReload();
        return { fired: false, weaponId: this.equippedWeapon, hits: [], startedReload: started };
      }
      st.mag -= 1;
    }

    this.fireCooldown = def.fireRateSec;
    if (def.category === 'melee') {
      this.punchSwingTimer = 0.28;
    } else {
      this.triggerMuzzleFlash(muzzleWorldPos);
    }

    // Base aim ray from center of screen (crosshair)
    camera.getWorldPosition(_rayOrigin);
    camera.getWorldDirection(_rayDir).normalize();

    const hits: CombatHitResult[] = [];
    const raycaster = new THREE.Raycaster();
    raycaster.far = def.range;

    for (let p = 0; p < def.pellets; p++) {
      const dir = _rayDir.clone();
      const spreadScale = this.isAiming ? 0.45 : 1.0;
      const spread = def.spreadRad * spreadScale;
      if (spread > 0) {
        dir.x += (Math.random() - 0.5) * spread * 2;
        dir.y += (Math.random() - 0.5) * spread * 1.6;
        dir.z += (Math.random() - 0.5) * spread * 2;
        dir.normalize();
      }

      // 1) Check dynamic targets (hostiles, NPCs, vehicles, traffic, police) via ray-cylinder/sphere test
      let bestTargetHit: {
        target: ShootableTarget;
        dist: number;
        point: THREE.Vector3;
        isHeadshot: boolean;
      } | null = null;

      // For melee, measure distance from muzzle/player origin rather than camera
      const origin = def.category === 'melee' ? muzzleWorldPos : _rayOrigin;
      const maxRange = def.category === 'melee' ? def.range : def.range;

      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        const centerY = t.y + t.height * 0.5;
        _toTarget.set(t.x - origin.x, centerY - origin.y, t.z - origin.z);
        const along = _toTarget.dot(dir);
        if (along < (def.category === 'melee' ? -0.4 : 1.2) || along > maxRange) continue;

        // Closest point on ray to target center
        const cx = origin.x + dir.x * along;
        const cy = origin.y + dir.y * along;
        const cz = origin.z + dir.z * along;

        const horizDist = Math.hypot(cx - t.x, cz - t.z);
        const withinHeight = cy >= t.y - 0.25 && cy <= t.y + t.height + 0.35;
        // Subtle GTA-style aim magnetism radius boost for human targets on mobile
        const hitRadius = t.radius + (t.kind === 'hostile' || t.kind === 'npc' ? 0.34 : 0.25);

        if (horizDist <= hitRadius && withinHeight) {
          const dist = Math.hypot(cx - muzzleWorldPos.x, cy - muzzleWorldPos.y, cz - muzzleWorldPos.z);
          if (dist <= maxRange && (!bestTargetHit || dist < bestTargetHit.dist)) {
            const isHeadshot =
              t.headY !== undefined && Math.abs(cy - (t.y + t.headY)) <= 0.34;
            bestTargetHit = {
              target: t,
              dist,
              point: new THREE.Vector3(cx, cy, cz),
              isHeadshot,
            };
          }
        }
      }

      // 2) Check 3D world geometry (buildings, roads, flyover, bridge) for wall/ground bullet sparks
      let worldDist = maxRange;
      let worldPoint: THREE.Vector3 | null = null;
      if (def.category !== 'melee' && worldRayObjects.length > 0) {
        raycaster.set(_rayOrigin, dir);
        raycaster.far = bestTargetHit ? Math.min(maxRange, bestTargetHit.dist + 5) : maxRange;
        const worldHits = raycaster.intersectObjects(worldRayObjects, true);
        if (worldHits.length > 0 && worldHits[0].distance > 1.8) {
          worldDist = worldHits[0].distance;
          worldPoint = worldHits[0].point.clone();
        }
      }

      // Pick whichever impact is closer!
      const targetCamDist = bestTargetHit
        ? bestTargetHit.point.distanceTo(_rayOrigin)
        : Infinity;

      if (bestTargetHit && targetCamDist <= worldDist + 0.6) {
        const dmg = Math.round(
          def.damage * (bestTargetHit.isHeadshot ? def.headshotMult : 1.0)
        );
        hits.push({
          kind: bestTargetHit.target.kind,
          targetId: bestTargetHit.target.id,
          point: bestTargetHit.point,
          isHeadshot: bestTargetHit.isHeadshot,
          damage: dmg,
          vehicleDamage: def.vehicleDamage,
        });

        if (def.category !== 'melee') {
          this.spawnTracer(muzzleWorldPos, bestTargetHit.point, def.tracerColor);
        }
        const isMetallic =
          bestTargetHit.target.kind === 'vehicle' ||
          bestTargetHit.target.kind === 'traffic' ||
          bestTargetHit.target.kind === 'police';
        this.spawnImpactBurst(
          bestTargetHit.point,
          isMetallic ? 0xfbbf24 : 0xef4444,
          isMetallic ? 6 : 5
        );
      } else if (def.category !== 'melee') {
        const endPt =
          worldPoint ??
          _hitPoint.copy(_rayOrigin).addScaledVector(dir, Math.min(maxRange, 65)).clone();
        hits.push({
          kind: 'world',
          point: endPt,
          isHeadshot: false,
          damage: 0,
          vehicleDamage: 0,
        });
        this.spawnTracer(muzzleWorldPos, endPt, def.tracerColor);
        if (worldPoint) {
          this.spawnImpactBurst(worldPoint, 0xe2e8f0, 4);
        }
      }
    }

    // Auto-reload smoothly when mag hits 0
    let startedReload = false;
    if (def.magSize > 0 && this.ammo[this.equippedWeapon].mag <= 0) {
      startedReload = this.startReload();
    }

    return { fired: true, weaponId: this.equippedWeapon, hits, startedReload };
  }

  /**
   * Spawns a fiery GTA-style 3D vehicle explosion (expanding fireball + shockwave ring + debris + shake).
   */
  public spawnExplosion(x: number, y: number, z: number): void {
    const fireball = new THREE.Mesh(
      this.explosionGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff6b00,
        transparent: true,
        opacity: 0.95,
      })
    );
    fireball.position.set(x, y + 1.0, z);
    fireball.scale.setScalar(0.6);

    const ring = new THREE.Mesh(
      this.ringGeo,
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      })
    );
    ring.rotation.x = -Math.PI * 0.5;
    ring.position.set(x, y + 0.16, z);

    const light = new THREE.PointLight(0xff7a18, 9, 28, 1.5);
    light.position.set(x, y + 2.2, z);

    this.group.add(fireball, ring, light);
    this.explosions.push({ fireball, ring, light, life: 0.95, maxLife: 0.95 });

    // Debris + dark rising smoke particles
    this.spawnImpactBurst(new THREE.Vector3(x, y + 1.2, z), 0xf97316, 12, 11);
    this.spawnImpactBurst(new THREE.Vector3(x, y + 1.4, z), 0x1e293b, 8, 5, 3.2);
    this.cameraShake = Math.max(this.cameraShake, 0.55);
  }

  /**
   * Spawns an enemy gunfire tracer so syndicate shootouts look intense and readable.
   */
  public spawnEnemyTracer(ax: number, ay: number, az: number, bx: number, by: number, bz: number): void {
    _muzzlePos.set(ax, ay, az);
    _hitPoint.set(bx, by, bz);
    this.spawnTracer(_muzzlePos, _hitPoint, 0xff453a);
  }

  private triggerMuzzleFlash(pos: THREE.Vector3): void {
    this.muzzleLight.position.copy(pos);
    this.muzzleLight.intensity = 6.5;
    this.muzzleFlashMesh.position.copy(pos);
    this.muzzleFlashMesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    this.muzzleFlashMesh.scale.setScalar(0.85 + Math.random() * 0.45);
    this.muzzleFlashMesh.visible = true;
    this.muzzleTimer = 0.055;
  }

  private spawnTracer(from: THREE.Vector3, to: THREE.Vector3, colorHex: number): void {
    const dist = Math.max(0.5, from.distanceTo(to));
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(this.tracerGeo, mat);
    mesh.scale.set(1, 1, Math.min(dist, 42));
    mesh.position.copy(from).lerp(to, 0.5);
    mesh.lookAt(to);
    this.group.add(mesh);
    this.tracers.push({ mesh, life: 0.09, maxLife: 0.09 });
  }

  public spawnImpactBurst(
    pos: THREE.Vector3,
    colorHex: number,
    count = 5,
    speed = 6,
    scaleGrow = 0.4
  ): void {
    // Cap total particles for stable mobile 60 FPS
    if (this.particles.length > 48) return;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.92,
      });
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.position.copy(pos);
      this.group.add(mesh);
      const ang = Math.random() * Math.PI * 2;
      const spd = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        mesh,
        vx: Math.cos(ang) * spd,
        vy: 1.5 + Math.random() * speed * 0.65,
        vz: Math.sin(ang) * spd,
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        scaleGrow,
      });
    }
  }

  public update(dt: number): void {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.punchSwingTimer = Math.max(0, this.punchSwingTimer - dt);
    this.cameraShake = Math.max(0, this.cameraShake - dt * 1.4);

    if (this.hitMarkerTimer > 0) {
      this.hitMarkerTimer -= dt;
      if (this.hitMarkerTimer <= 0) {
        this.hitMarker = 'none';
      }
    }

    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        const def = WEAPON_CATALOG[this.equippedWeapon];
        const st = this.ammo[this.equippedWeapon];
        const needed = Math.max(0, def.magSize - st.mag);
        const take = Math.min(needed, st.reserve);
        st.mag += take;
        st.reserve -= take;
      }
    }

    if (this.muzzleTimer > 0) {
      this.muzzleTimer -= dt;
      if (this.muzzleTimer <= 0) {
        this.muzzleLight.intensity = 0;
        this.muzzleFlashMesh.visible = false;
      }
    }

    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const tr = this.tracers[i];
      tr.life -= dt;
      if (tr.life <= 0) {
        (tr.mesh.material as THREE.Material).dispose();
        this.group.remove(tr.mesh);
        this.tracers.splice(i, 1);
      } else {
        (tr.mesh.material as THREE.MeshBasicMaterial).opacity = tr.life / tr.maxLife;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        (p.mesh.material as THREE.Material).dispose();
        this.group.remove(p.mesh);
        this.particles.splice(i, 1);
      } else {
        p.vy -= 14 * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y = Math.max(0.05, p.mesh.position.y + p.vy * dt);
        p.mesh.position.z += p.vz * dt;
        const t = 1 - p.life / p.maxLife;
        p.mesh.scale.setScalar(1 + t * p.scaleGrow);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.life / p.maxLife);
      }
    }

    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      ex.life -= dt;
      if (ex.life <= 0) {
        (ex.fireball.material as THREE.Material).dispose();
        (ex.ring.material as THREE.Material).dispose();
        this.group.remove(ex.fireball, ex.ring, ex.light);
        this.explosions.splice(i, 1);
      } else {
        const progress = 1 - ex.life / ex.maxLife;
        ex.fireball.scale.setScalar(0.8 + progress * 4.4);
        ex.fireball.position.y += dt * 1.4;
        (ex.fireball.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - progress * 1.15);
        ex.ring.scale.setScalar(1 + progress * 8.5);
        (ex.ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - progress);
        ex.light.intensity = Math.max(0, 9 * (1 - progress * 1.3));
      }
    }
  }

  public dispose(): void {
    for (const tr of this.tracers) {
      (tr.mesh.material as THREE.Material).dispose();
      this.group.remove(tr.mesh);
    }
    for (const p of this.particles) {
      (p.mesh.material as THREE.Material).dispose();
      this.group.remove(p.mesh);
    }
    for (const ex of this.explosions) {
      (ex.fireball.material as THREE.Material).dispose();
      (ex.ring.material as THREE.Material).dispose();
      this.group.remove(ex.fireball, ex.ring, ex.light);
    }
    this.sparkGeo.dispose();
    this.tracerGeo.dispose();
    this.explosionGeo.dispose();
    this.ringGeo.dispose();
  }
}
