/**
 * Modular World Chunk & Regional Discovery Manager — Phase 2 Streaming Architecture.
 *
 * Manages division/district chunk metadata, distance-based LOD activation radii
 * tuned for mobile Android devices, and real-time location discovery tracking
 * across playable Dhaka sectors (and future Faridpur / national chunks).
 */

import { DivisionId, RegionalBiome } from '../data/bangladeshAtlas';
import { GraphicsQuality, MapMarker } from '../types/game';

export type ChunkLoadState = 'unloaded' | 'lod_proxy' | 'active';

export interface WorldChunkDescriptor {
  id: string;
  divisionId: DivisionId;
  districtId: string;
  nameEn: string;
  nameBn: string;
  biome: RegionalBiome;
  centerX: number;
  centerZ: number;
  radius: number;
  playable: boolean;
  state: ChunkLoadState;
}

const STREAM_RADIUS_BY_QUALITY: Record<GraphicsQuality, { active: number; proxy: number }> = {
  LOW: { active: 150, proxy: 260 },
  MEDIUM: { active: 190, proxy: 340 },
  HIGH: { active: 240, proxy: 440 },
  ULTRA: { active: 300, proxy: 560 },
};

export class WorldChunkManager {
  public readonly chunks: WorldChunkDescriptor[] = [
    {
      id: 'dhaka_gulshan_core',
      divisionId: 'dhaka',
      districtId: 'dhaka',
      nameEn: 'Gulshan Avenue & Circle',
      nameBn: 'গুলশান এভিনিউ ও সার্কেল',
      biome: 'urban_megacity',
      centerX: 0,
      centerZ: 0,
      radius: 65,
      playable: true,
      state: 'active',
    },
    {
      id: 'dhaka_mohakhali_flyover',
      divisionId: 'dhaka',
      districtId: 'dhaka',
      nameEn: 'Mohakhali Flyover & Banani Link',
      nameBn: 'মহাখালী ফ্লাইওভার ও বনানী লিংক',
      biome: 'urban_megacity',
      centerX: 0,
      centerZ: -64,
      radius: 65,
      playable: true,
      state: 'active',
    },
    {
      id: 'dhaka_hatirjheel_waterfront',
      divisionId: 'dhaka',
      districtId: 'dhaka',
      nameEn: 'Hatirjheel Lake, Pier & Helipad',
      nameBn: 'হাতিরঝিল লেক, পিয়ার ও হেলিপ্যাড',
      biome: 'riverine_delta',
      centerX: 0,
      centerZ: 76,
      radius: 75,
      playable: true,
      state: 'active',
    },
    {
      id: 'dhaka_spec_ops_east',
      divisionId: 'dhaka',
      districtId: 'dhaka',
      nameEn: 'Special Ops Command & East Ring',
      nameBn: 'স্পেশাল অপস কমান্ড ও পূর্ব রিং',
      biome: 'urban_megacity',
      centerX: 64,
      centerZ: 18,
      radius: 65,
      playable: true,
      state: 'active',
    },
    // Phase 3 Registered Expansion Stub (not yet streamed until Phase 3 terrain/roads are built)
    {
      id: 'faridpur_corridor_phase3',
      divisionId: 'dhaka',
      districtId: 'faridpur',
      nameEn: 'Faridpur District & Padma Ferry Corridor (Phase 3)',
      nameBn: 'ফরিদপুর জেলা ও পদ্মা ফেরি করিডোর (ফেজ ৩)',
      biome: 'riverine_delta',
      centerX: -480,
      centerZ: 360,
      radius: 180,
      playable: false,
      state: 'unloaded',
    },
  ];

  private discoveredIds = new Set<string>(['gulshan_circle']);
  private probeAccum = 0;

  public hydrateDiscovered(ids: string[] | undefined): void {
    this.discoveredIds.clear();
    this.discoveredIds.add('gulshan_circle');
    if (Array.isArray(ids)) {
      for (const id of ids) {
        if (typeof id === 'string' && id.length > 0) {
          this.discoveredIds.add(id);
        }
      }
    }
  }

  public getDiscoveredIds(): string[] {
    return Array.from(this.discoveredIds);
  }

  public isDiscovered(id: string): boolean {
    return this.discoveredIds.has(id);
  }

  /**
   * Updates chunk LOD states based on player position & graphics quality,
   * and returns any newly discovered playable Dhaka landmark/POI marker.
   */
  public update(
    dt: number,
    playerX: number,
    playerZ: number,
    quality: GraphicsQuality,
    markers: MapMarker[]
  ): MapMarker | null {
    this.probeAccum += dt;
    if (this.probeAccum < 0.45) return null;
    this.probeAccum = 0;

    const radii = STREAM_RADIUS_BY_QUALITY[quality] ?? STREAM_RADIUS_BY_QUALITY.MEDIUM;
    for (let i = 0; i < this.chunks.length; i++) {
      const ch = this.chunks[i];
      if (!ch.playable) {
        ch.state = 'unloaded';
        continue;
      }
      const dist = Math.hypot(playerX - ch.centerX, playerZ - ch.centerZ);
      if (dist <= radii.active + ch.radius) {
        ch.state = 'active';
      } else if (dist <= radii.proxy + ch.radius) {
        ch.state = 'lod_proxy';
      } else {
        ch.state = 'unloaded';
      }
    }

    // Real proximity discovery for playable map POIs
    for (let i = 0; i < markers.length; i++) {
      const m = markers[i];
      if (this.discoveredIds.has(m.id)) continue;
      if (Math.hypot(playerX - m.x, playerZ - m.z) <= 22) {
        this.discoveredIds.add(m.id);
        return m;
      }
    }
    return null;
  }
}
