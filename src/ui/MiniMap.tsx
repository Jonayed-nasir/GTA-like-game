import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Car,
  CheckCircle2,
  Compass,
  Globe2,
  ListFilter,
  LocateFixed,
  MapPin,
  Maximize2,
  Minus,
  Navigation,
  Plane,
  Plus,
  RotateCcw,
  Search,
  Ship,
  Star,
  TrainFront,
  X,
} from 'lucide-react';
import {
  BANGLADESH_DISTRICTS,
  BANGLADESH_DIVISIONS,
  DivisionId,
  PLAYABLE_DISTRICTS_COUNT,
} from '../data/bangladeshAtlas';
import { TRANSLATIONS } from '../i18n/translations';
import { BuildingFootprint, Language, MapMarker, MiniMapSnapshot } from '../types/game';

interface MiniMapProps {
  getSnapshot: () => MiniMapSnapshot;
  buildings: BuildingFootprint[];
  markers: MapMarker[];
  roadCoords: number[];
  districtLabel: string;
  language: Language;
  expanded: boolean;
  gpsActive: boolean;
  favoriteMapIds: string[];
  discoveredPlaceIds: string[];
  onToggleExpand: () => void;
  onSetGps: (x: number, z: number, labelEn: string, labelBn: string) => void;
  onClearGps: () => void;
  onToggleFavoriteMap: (markerId: string) => void;
}

type PoiCategory = 'all' | 'favorites' | 'action' | 'empire' | 'services';
type MapSidebarTab = 'dhaka' | 'bangladesh';

interface MapViewport {
  centerX: number;
  centerZ: number;
  zoom: number;
}

const WORLD_SPAN = 290;

function markerColor(type: MapMarker['type']): string {
  switch (type) {
    case 'hq':
      return '#0ea5e9';
    case 'bridge':
      return '#60a5fa';
    case 'garage':
      return '#fb923c';
    case 'dealership':
      return '#f87171';
    case 'safehouse':
      return '#38bdf8';
    case 'hospital':
      return '#fb7185';
    case 'shop':
      return '#34d399';
    case 'helipad':
      return '#f59e0b';
    case 'pier':
      return '#06b6d4';
    case 'ramp':
      return '#facc15';
    default:
      return '#fbbf24';
  }
}

function markerGlyph(type: MapMarker['type']): string {
  switch (type) {
    case 'helipad':
      return 'H';
    case 'pier':
      return 'B';
    case 'ramp':
      return '▲';
    case 'hq':
      return '★';
    case 'hospital':
      return '+';
    case 'garage':
      return 'G';
    case 'dealership':
      return 'D';
    case 'safehouse':
      return 'S';
    default:
      return '';
  }
}

function matchesCategory(
  marker: MapMarker,
  cat: PoiCategory,
  favoriteSet: Set<string>
): boolean {
  if (cat === 'all') return true;
  if (cat === 'favorites') return favoriteSet.has(marker.id);
  if (cat === 'action') {
    return (
      marker.type === 'helipad' ||
      marker.type === 'pier' ||
      marker.type === 'ramp' ||
      marker.type === 'bridge' ||
      marker.type === 'landmark'
    );
  }
  if (cat === 'empire') {
    return (
      marker.type === 'hq' ||
      marker.type === 'safehouse' ||
      marker.type === 'garage' ||
      marker.type === 'dealership'
    );
  }
  return marker.type === 'shop' || marker.type === 'hospital';
}

function getBaseScale(w: number, h: number, fullMode: boolean, zoom: number): number {
  if (!fullMode) {
    return Math.min(w, h) / 118;
  }
  return (Math.min(w, h) / WORLD_SPAN) * zoom;
}

function drawDhakaMap(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  snap: MiniMapSnapshot,
  buildings: BuildingFootprint[],
  markers: MapMarker[],
  roadCoords: number[],
  fullMode: boolean,
  language: Language,
  viewport: MapViewport,
  rotateRadar: boolean,
  favoriteSet: Set<string>,
  discoveredSet: Set<string>
) {
  ctx.clearRect(0, 0, w, h);

  // Base asphalt/city terrain fill
  ctx.fillStyle = '#0e1522';
  ctx.fillRect(0, 0, w, h);

  const scale = getBaseScale(w, h, fullMode, viewport.zoom);
  const cx = w * 0.5;
  const cy = h * 0.5;
  const now = performance.now();

  ctx.save();
  ctx.translate(cx, cy);

  if (!fullMode) {
    if (rotateRadar) {
      ctx.rotate(snap.playerYaw - Math.PI);
    }
    ctx.translate(-snap.playerX * scale, -snap.playerZ * scale);
  } else {
    ctx.translate(-viewport.centerX * scale, -viewport.centerZ * scale);
  }

  // City playable boundary glow
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
  ctx.lineWidth = Math.max(1, 1.4);
  ctx.strokeRect(-135 * scale, -130 * scale, 270 * scale, 255 * scale);

  // Subtle district grid backdrop
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
  ctx.lineWidth = 1;
  for (let gx = -120; gx <= 120; gx += 30) {
    ctx.beginPath();
    ctx.moveTo(gx * scale, -130 * scale);
    ctx.lineTo(gx * scale, 125 * scale);
    ctx.stroke();
  }
  for (let gz = -120; gz <= 120; gz += 30) {
    ctx.beginPath();
    ctx.moveTo(-135 * scale, gz * scale);
    ctx.lineTo(135 * scale, gz * scale);
    ctx.stroke();
  }

  // Hatirjheel Lake water body + shoreline highlight
  ctx.fillStyle = '#0c3556';
  ctx.fillRect(-146 * scale, 71 * scale, 292 * scale, 56 * scale);
  ctx.fillStyle = '#10446e';
  ctx.fillRect(-142 * scale, 74 * scale, 284 * scale, 48 * scale);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.38)';
  ctx.lineWidth = Math.max(1, 1.3);
  ctx.beginPath();
  ctx.moveTo(-146 * scale, 71 * scale);
  ctx.lineTo(146 * scale, 71 * scale);
  ctx.stroke();

  // Boat Pier deck on map (-68, 70..76.5)
  ctx.fillStyle = '#a16207';
  ctx.fillRect(-70.5 * scale, 69.5 * scale, 5 * scale, 7.8 * scale);

  // Helipad circular pad (72, 54)
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(72 * scale, 54 * scale, 6.8 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = Math.max(1.2, 1.5);
  ctx.stroke();

  // Road grid
  ctx.fillStyle = '#263143';
  for (const rx of roadCoords) {
    ctx.fillRect((rx - 8) * scale, -134 * scale, 16 * scale, 205 * scale);
  }
  for (const rz of roadCoords) {
    ctx.fillRect(-135 * scale, (rz - 8) * scale, 270 * scale, 16 * scale);
  }

  // Crisp dashed center road dividers
  ctx.save();
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.15)';
  ctx.lineWidth = Math.max(0.75, 0.9);
  ctx.setLineDash([4, 4]);
  for (const rx of roadCoords) {
    ctx.beginPath();
    ctx.moveTo(rx * scale, -132 * scale);
    ctx.lineTo(rx * scale, 70 * scale);
    ctx.stroke();
  }
  for (const rz of roadCoords) {
    ctx.beginPath();
    ctx.moveTo(-132 * scale, rz * scale);
    ctx.lineTo(132 * scale, rz * scale);
    ctx.stroke();
  }
  ctx.restore();

  // Hatirjheel Bridge connectors & iconic blue arched span
  ctx.fillStyle = '#263143';
  ctx.fillRect((-60 - 8) * scale, 60 * scale, 16 * scale, 35 * scale);
  ctx.fillRect((60 - 8) * scale, 60 * scale, 16 * scale, 35 * scale);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(-62 * scale, 82 * scale, 124 * scale, 12 * scale);
  ctx.strokeStyle = '#93c5fd';
  ctx.lineWidth = Math.max(1, 1.4);
  ctx.strokeRect(-62 * scale, 82 * scale, 124 * scale, 12 * scale);

  // Elevated Flyover highlight along Z = -60
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = Math.max(1.6, 2.2 * Math.min(1.6, viewport.zoom));
  ctx.beginPath();
  ctx.moveTo(-130 * scale, -60 * scale);
  ctx.lineTo(130 * scale, -60 * scale);
  ctx.stroke();

  // Buildings
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    const bx = (b.x - b.w * 0.5) * scale;
    const bz = (b.z - b.d * 0.5) * scale;
    const bw = b.w * scale;
    const bd = b.d * scale;
    ctx.fillStyle = '#1b2638';
    ctx.fillRect(bx, bz, bw, bd);
    ctx.strokeStyle = '#33455e';
    ctx.lineWidth = 0.85;
    ctx.strokeRect(bx, bz, bw, bd);
  }

  // District watermark labels in Full Map
  if (fullMode) {
    ctx.save();
    ctx.font = `700 ${Math.max(9, Math.min(13, 10 * viewport.zoom))}px "Chakra Petch", sans-serif`;
    ctx.fillStyle = 'rgba(148, 163, 184, 0.38)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(language === 'bn' ? 'মহাখালী ফ্লাইওভার' : 'MOHAKHALI FLYOVER', 0, -76 * scale);
    ctx.fillText(language === 'bn' ? 'গুলশান এভিনিউ' : 'GULSHAN AVENUE', 0, -18 * scale);
    ctx.fillText(language === 'bn' ? 'স্পেশাল অপস কমান্ড' : 'SPEC OPS DISTRICT', 52 * scale, 36 * scale);
    ctx.fillStyle = 'rgba(125, 211, 252, 0.45)';
    ctx.fillText(language === 'bn' ? 'হাতিরঝিল লেক' : 'HATIRJHEEL LAKE', 0, 108 * scale);
    ctx.restore();
  }

  // GPS Route Polyline
  if (snap.gps.active && snap.gps.path.length >= 2) {
    ctx.save();
    ctx.strokeStyle = snap.missionTarget ? 'rgba(245, 158, 11, 0.35)' : 'rgba(34, 211, 238, 0.35)';
    ctx.lineWidth = fullMode ? 7 : 5.2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(snap.gps.path[0].x * scale, snap.gps.path[0].z * scale);
    for (let i = 1; i < snap.gps.path.length; i++) {
      ctx.lineTo(snap.gps.path[i].x * scale, snap.gps.path[i].z * scale);
    }
    ctx.stroke();

    ctx.strokeStyle = snap.missionTarget ? '#fbbf24' : '#22d3ee';
    ctx.lineWidth = fullMode ? 3.2 : 2.4;
    ctx.stroke();

    const pulse = 1 + Math.sin(now * 0.007) * 0.25;
    ctx.strokeStyle = snap.missionTarget ? '#fbbf24' : '#22d3ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      snap.gps.targetX * scale,
      snap.gps.targetZ * scale,
      (fullMode ? 7.5 : 5.5) * pulse,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(snap.gps.targetX * scale, snap.gps.targetZ * scale, fullMode ? 3 : 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Dedicated Golden Pulsing Mission Target Beacon
  if (snap.missionTarget) {
    const mx = snap.missionTarget.x * scale;
    const mz = snap.missionTarget.z * scale;
    const ringR = (fullMode ? 9 : 6.5) + Math.sin(now * 0.008) * 2.2;
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(mx, mz, ringR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(mx, mz, fullMode ? 4 : 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // POI Markers (with favorite golden ring & discovered subtle halo)
  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];
    const mx = m.x * scale;
    const mz = m.z * scale;
    const col = markerColor(m.type);
    const glyph = markerGlyph(m.type);
    const isFav = favoriteSet.has(m.id);
    const isDiscovered = discoveredSet.has(m.id);

    ctx.save();
    if (isFav && fullMode) {
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(mx, mz, 9.2, 0, Math.PI * 2);
      ctx.stroke();
    } else if (isDiscovered && fullMode) {
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(mx, mz, 8.2, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (m.type === 'ramp') {
      const sz = fullMode ? 5.2 : 3.6;
      ctx.fillStyle = col;
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(mx, mz - sz);
      ctx.lineTo(mx - sz * 0.9, mz + sz * 0.75);
      ctx.lineTo(mx + sz * 0.9, mz + sz * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      const rad = fullMode ? (glyph ? 6.2 : 4.6) : glyph ? 4.2 : 3.0;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(mx, mz, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      if (glyph && (fullMode || m.type === 'helipad' || m.type === 'pier' || m.type === 'hq')) {
        ctx.fillStyle = '#090d16';
        ctx.font = `800 ${fullMode ? 8.5 : 6.5}px "Chakra Petch", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(glyph, mx, mz + 0.5);
      }
    }

    const showLabel =
      fullMode &&
      (viewport.zoom >= 1.15 ||
        isFav ||
        m.type === 'helipad' ||
        m.type === 'pier' ||
        m.type === 'hq' ||
        m.type === 'bridge' ||
        m.type === 'dealership' ||
        m.type === 'garage' ||
        m.type === 'safehouse' ||
        m.type === 'hospital');

    if (showLabel) {
      const label = language === 'bn' ? m.labelBn : m.labelEn;
      ctx.font = '600 10px "Plus Jakarta Sans", "Noto Sans Bengali", sans-serif';
      const tw = ctx.measureText(label).width;
      const py = mz - 12;
      ctx.fillStyle = 'rgba(9, 13, 22, 0.86)';
      ctx.fillRect(mx - tw * 0.5 - 3, py - 6.5, tw + 6, 12.5);
      ctx.fillStyle = isFav ? '#fde047' : '#f1f5f9';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, mx, py);
    }
    ctx.restore();
  }

  // Parked drivable vehicles
  for (let i = 0; i < snap.parkedVehicles.length; i++) {
    const v = snap.parkedVehicles[i];
    const vx = v.x * scale;
    const vz = v.z * scale;
    if (v.kind === 'helicopter') {
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(vx, vz, fullMode ? 5.5 : 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (v.kind === 'speedboat') {
      ctx.fillStyle = '#06b6d4';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(vx, vz - 4.5);
      ctx.lineTo(vx + 3.8, vz + 3.5);
      ctx.lineTo(vx - 3.8, vz + 3.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = v.kind === 'cng' ? '#22c55e' : v.kind === 'sports' ? '#ef4444' : '#38bdf8';
      ctx.fillRect(vx - 2.3, vz - 2.3, 4.6, 4.6);
    }
  }

  // Dedicated Player Vehicle Indicator (Personal / Last Driven Vehicle when parked nearby)
  if (snap.playerVehicle && !snap.inVehicle) {
    const pv = snap.playerVehicle;
    const vx = pv.x * scale;
    const vz = pv.z * scale;
    ctx.save();
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(vx, vz, fullMode ? 8.2 : 6.2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#14b8a6';
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.3;
    ctx.fillRect(vx - (fullMode ? 4.4 : 3.2), vz - (fullMode ? 4.4 : 3.2), fullMode ? 8.8 : 6.4, fullMode ? 8.8 : 6.4);
    ctx.strokeRect(vx - (fullMode ? 4.4 : 3.2), vz - (fullMode ? 4.4 : 3.2), fullMode ? 8.8 : 6.4, fullMode ? 8.8 : 6.4);

    if (fullMode) {
      const vLabel = language === 'bn' ? 'আপনার গাড়ি' : 'YOUR VEHICLE';
      ctx.font = '700 9px "Chakra Petch", sans-serif';
      const tw = ctx.measureText(vLabel).width;
      ctx.fillStyle = 'rgba(13, 148, 136, 0.92)';
      ctx.fillRect(vx - tw * 0.5 - 3, vz + 10, tw + 6, 12);
      ctx.fillStyle = '#042f2e';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(vLabel, vx, vz + 16);
    }
    ctx.restore();
  }

  // Live traffic blips
  ctx.fillStyle = 'rgba(148, 163, 184, 0.72)';
  for (let i = 0; i < snap.traffic.length; i++) {
    const tr = snap.traffic[i];
    ctx.beginPath();
    ctx.arc(tr.x * scale, tr.z * scale, fullMode ? 2.1 : 1.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Active Police Cruisers + Translucent Vision Cones
  const flashBlue = Math.floor(now / 220) % 2 === 0;
  for (let i = 0; i < snap.police.length; i++) {
    const p = snap.police[i];
    const px = p.x * scale;
    const pz = p.z * scale;
    if (p.chasing || p.searching) {
      const r = p.visionRange * scale;
      const centerAngle = Math.atan2(Math.cos(p.yaw), Math.sin(p.yaw));
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(px, pz);
      ctx.arc(px, pz, r, centerAngle - p.visionHalfAngle, centerAngle + p.visionHalfAngle);
      ctx.closePath();
      ctx.fillStyle = p.searching
        ? flashBlue
          ? 'rgba(56, 189, 248, 0.24)'
          : 'rgba(244, 63, 94, 0.16)'
        : flashBlue
          ? 'rgba(59, 130, 246, 0.3)'
          : 'rgba(239, 68, 68, 0.3)';
      ctx.fill();
      ctx.strokeStyle = flashBlue ? 'rgba(96, 165, 250, 0.72)' : 'rgba(248, 113, 113, 0.72)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle =
      p.chasing || p.searching ? (flashBlue ? '#3b82f6' : '#ef4444') : '#60a5fa';
    ctx.beginPath();
    ctx.arc(px, pz, fullMode ? 5 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }

  // Squad Companion Cyan Blips
  for (let i = 0; i < snap.squad.length; i++) {
    const s = snap.squad[i];
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(s.x * scale, s.z * scale, fullMode ? 4.4 : 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }

  // Protected Civilians / VIP Emerald Blips
  for (let i = 0; i < snap.civilians.length; i++) {
    const c = snap.civilians[i];
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(c.x * scale, c.z * scale, fullMode ? 4.2 : 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hostile Crimson / Gold Boss Blips
  for (let i = 0; i < snap.hostiles.length; i++) {
    const host = snap.hostiles[i];
    ctx.fillStyle = host.isBoss ? '#f59e0b' : '#ef4444';
    ctx.beginPath();
    ctx.arc(host.x * scale, host.z * scale, host.isBoss ? 5.5 : 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }

  // Player directional arrow (with cyan vehicle ring if currently driving)
  ctx.save();
  ctx.translate(snap.playerX * scale, snap.playerZ * scale);
  ctx.rotate(-snap.playerYaw);
  ctx.fillStyle = snap.inVehicle ? 'rgba(45, 212, 191, 0.28)' : 'rgba(245, 158, 11, 0.22)';
  ctx.beginPath();
  ctx.arc(0, 0, fullMode ? 12 : 9, 0, Math.PI * 2);
  ctx.fill();
  if (snap.inVehicle) {
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  ctx.fillStyle = '#fbbf24';
  ctx.strokeStyle = '#090d14';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, fullMode ? 8.5 : 7);
  ctx.lineTo(fullMode ? -5.8 : -4.8, fullMode ? -6 : -5);
  ctx.lineTo(0, fullMode ? -2.8 : -2.2);
  ctx.lineTo(fullMode ? 5.8 : 4.8, fullMode ? -6 : -5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.restore();

  // North indicator pill
  ctx.save();
  if (!fullMode && rotateRadar) {
    const angle = snap.playerYaw - Math.PI - Math.PI * 0.5;
    const rx = cx + Math.cos(angle) * (w * 0.43);
    const ry = cy + Math.sin(angle) * (h * 0.41);
    ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
    ctx.beginPath();
    ctx.arc(rx, ry, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.font = '800 9px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', rx, ry + 0.5);
  } else {
    ctx.fillStyle = 'rgba(9, 13, 22, 0.88)';
    ctx.fillRect(w * 0.5 - 10, 4, 20, 14);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(w * 0.5 - 10, 4, 20, 14);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 9.5px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', w * 0.5, 11.5);
  }
  ctx.restore();
}

export function MiniMap({
  getSnapshot,
  buildings,
  markers,
  roadCoords,
  districtLabel,
  language,
  expanded,
  gpsActive,
  favoriteMapIds,
  discoveredPlaceIds,
  onToggleExpand,
  onSetGps,
  onClearGps,
  onToggleFavoriteMap,
}: MiniMapProps) {
  const miniCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullContainerRef = useRef<HTMLDivElement | null>(null);

  const [sidebarTab, setSidebarTab] = useState<MapSidebarTab>('dhaka');
  const [selectedDivision, setSelectedDivision] = useState<DivisionId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<PoiCategory>('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rotateRadar, setRotateRadar] = useState(false);
  const [viewport, setViewport] = useState<MapViewport>({ centerX: 0, centerZ: 0, zoom: 1.05 });
  const [liveGpsDist, setLiveGpsDist] = useState<number>(0);
  const [playerCoords, setPlayerCoords] = useState<{ x: number; z: number }>({ x: 0, z: 0 });
  const [hasPlayerVehicle, setHasPlayerVehicle] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const favoriteSet = useMemo(() => new Set(favoriteMapIds), [favoriteMapIds]);
  const discoveredSet = useMemo(() => new Set(discoveredPlaceIds), [discoveredPlaceIds]);
  const favoriteSetRef = useRef(favoriteSet);
  favoriteSetRef.current = favoriteSet;
  const discoveredSetRef = useRef(discoveredSet);
  discoveredSetRef.current = discoveredSet;

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragStartRef = useRef<{
    x: number;
    y: number;
    centerX: number;
    centerZ: number;
    moved: number;
    pinchDist: number | null;
    pinchZoom: number;
  } | null>(null);

  const t = TRANSLATIONS[language];

  // Preserve current GPS destination label when reopening the full map
  useEffect(() => {
    if (!expanded) return;
    const snap = getSnapshot();
    setPlayerCoords({ x: snap.playerX, z: snap.playerZ });
    setHasPlayerVehicle(Boolean(snap.playerVehicle));
    setSelectedLabel(
      snap.gps.active ? (language === 'bn' ? snap.gps.labelBn : snap.gps.labelEn) : null
    );
  }, [expanded, getSnapshot, language]);

  const syncCanvasDpr = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return { w: 0, h: 0, dpr: 1 };
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const targetW = Math.round(cssW * dpr);
    const targetH = Math.round(cssH * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    return { w: cssW, h: cssH, dpr };
  }, []);

  useEffect(() => {
    let rafId = 0;
    let lastDraw = 0;

    const frame = (now: number) => {
      rafId = requestAnimationFrame(frame);
      if (document.hidden) return;
      const interval = expanded ? 45 : 85;
      if (now - lastDraw < interval) return;
      lastDraw = now;

      const snap = getSnapshot();

      const mini = miniCanvasRef.current;
      if (mini && !expanded) {
        const { w, h, dpr } = syncCanvasDpr(mini);
        const ctx = mini.getContext('2d');
        if (ctx && w > 0 && h > 0) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          drawDhakaMap(
            ctx,
            w,
            h,
            snap,
            buildings,
            markers,
            roadCoords,
            false,
            language,
            viewportRef.current,
            rotateRadar,
            favoriteSetRef.current,
            discoveredSetRef.current
          );
        }
      }

      if (expanded && fullCanvasRef.current) {
        const full = fullCanvasRef.current;
        const { w, h, dpr } = syncCanvasDpr(full);
        const fctx = full.getContext('2d');
        if (fctx && w > 0 && h > 0) {
          fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          drawDhakaMap(
            fctx,
            w,
            h,
            snap,
            buildings,
            markers,
            roadCoords,
            true,
            language,
            viewportRef.current,
            false,
            favoriteSetRef.current,
            discoveredSetRef.current
          );
        }
      }

      if (snap.gps.active) {
        const d = Math.round(snap.gps.distanceMeters);
        setLiveGpsDist((prev) => (Math.abs(prev - d) >= 2 ? d : prev));
      }
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [getSnapshot, buildings, markers, roadCoords, expanded, language, rotateRadar, syncCanvasDpr]);

  const clampCenter = (cx: number, cz: number, z: number): MapViewport => {
    const maxPan = Math.max(20, 140 * (1 - 0.55 / Math.max(0.75, z)));
    return {
      centerX: Math.max(-maxPan, Math.min(maxPan, cx)),
      centerZ: Math.max(-maxPan, Math.min(maxPan, cz)),
      zoom: Math.max(0.8, Math.min(3.4, z)),
    };
  };

  const handleZoomBy = (delta: number) => {
    setViewport((prev) => clampCenter(prev.centerX, prev.centerZ, prev.zoom + delta));
  };

  const handleCenterOnPlayer = () => {
    const snap = getSnapshot();
    setPlayerCoords({ x: snap.playerX, z: snap.playerZ });
    setViewport((prev) => clampCenter(snap.playerX, snap.playerZ, Math.max(1.5, prev.zoom)));
  };

  const handleCenterOnVehicle = () => {
    const snap = getSnapshot();
    if (!snap.playerVehicle) return;
    setViewport((prev) =>
      clampCenter(snap.playerVehicle!.x, snap.playerVehicle!.z, Math.max(1.6, prev.zoom))
    );
  };

  const handleResetView = () => {
    setViewport({ centerX: 0, centerZ: 0, zoom: 1.05 });
  };

  const placeWaypointAtClientPoint = (clientX: number, clientY: number) => {
    const canvas = fullCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cssX = clientX - rect.left;
    const cssY = clientY - rect.top;

    const vp = viewportRef.current;
    const scale = getBaseScale(rect.width, rect.height, true, vp.zoom);
    const worldX = (cssX - rect.width * 0.5) / scale + vp.centerX;
    const worldZ = (cssY - rect.height * 0.5) / scale + vp.centerZ;

    let snapped: MapMarker | null = null;
    let bestWorldDist = Math.max(10, 18 / Math.max(0.5, scale));
    for (const m of markers) {
      const d = Math.hypot(m.x - worldX, m.z - worldZ);
      if (d < bestWorldDist) {
        bestWorldDist = d;
        snapped = m;
      }
    }

    if (snapped) {
      onSetGps(snapped.x, snapped.z, snapped.labelEn, snapped.labelBn);
      setSelectedLabel(language === 'bn' ? snapped.labelBn : snapped.labelEn);
    } else {
      const rx = Math.max(-130, Math.min(130, Math.round(worldX)));
      const rz = Math.max(-124, Math.min(116, Math.round(worldZ)));
      onSetGps(rx, rz, 'Custom Waypoint', 'কাস্টম গন্তব্য');
      setSelectedLabel(language === 'bn' ? 'কাস্টম গন্তব্য' : 'Custom Waypoint');
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1) {
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        centerX: viewportRef.current.centerX,
        centerZ: viewportRef.current.centerZ,
        moved: 0,
        pinchDist: null,
        pinchZoom: viewportRef.current.zoom,
      };
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      dragStartRef.current = {
        x: (pts[0].x + pts[1].x) * 0.5,
        y: (pts[0].y + pts[1].y) * 0.5,
        centerX: viewportRef.current.centerX,
        centerZ: viewportRef.current.centerZ,
        moved: 99,
        pinchDist: Math.max(10, dist),
        pinchZoom: viewportRef.current.zoom,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const drag = dragStartRef.current;
    const canvas = fullCanvasRef.current;
    if (!drag || !canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (pointersRef.current.size === 2 && drag.pinchDist) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const nextZoom = Math.max(0.8, Math.min(3.4, drag.pinchZoom * (dist / drag.pinchDist)));
      setViewport((prev) => clampCenter(prev.centerX, prev.centerZ, nextZoom));
      return;
    }

    if (pointersRef.current.size === 1) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
      if (drag.moved > 4) {
        const scale = getBaseScale(rect.width, rect.height, true, viewportRef.current.zoom);
        setViewport(
          clampCenter(drag.centerX - dx / scale, drag.centerZ - dy / scale, viewportRef.current.zoom)
        );
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const wasSingleTap =
      pointersRef.current.size === 1 && dragStartRef.current && dragStartRef.current.moved < 8;
    pointersRef.current.delete(e.pointerId);

    if (wasSingleTap) {
      placeWaypointAtClientPoint(e.clientX, e.clientY);
    }
    if (pointersRef.current.size === 0) {
      dragStartRef.current = null;
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.22 : -0.22;
    handleZoomBy(delta);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredMarkers = useMemo(() => {
    return markers
      .filter((m) => matchesCategory(m, category, favoriteSet))
      .filter((m) => {
        if (!normalizedQuery) return true;
        return (
          m.labelEn.toLowerCase().includes(normalizedQuery) ||
          m.labelBn.toLowerCase().includes(normalizedQuery) ||
          m.type.toLowerCase().includes(normalizedQuery)
        );
      })
      .map((m) => ({
        ...m,
        dist: Math.round(Math.hypot(m.x - playerCoords.x, m.z - playerCoords.z)),
      }))
      .sort((a, b) => a.dist - b.dist);
  }, [markers, category, favoriteSet, normalizedQuery, playerCoords]);

  const filteredDistricts = useMemo(() => {
    return BANGLADESH_DISTRICTS.filter((d) => {
      if (selectedDivision !== 'all' && d.divisionId !== selectedDivision) return false;
      if (!normalizedQuery) return true;
      return (
        d.nameEn.toLowerCase().includes(normalizedQuery) ||
        d.nameBn.toLowerCase().includes(normalizedQuery) ||
        d.sampleUpazilasEn.some((u) => u.toLowerCase().includes(normalizedQuery)) ||
        d.sampleUpazilasBn.some((u) => u.toLowerCase().includes(normalizedQuery))
      );
    });
  }, [selectedDivision, normalizedQuery]);

  const categoryTabs: Array<{ id: PoiCategory; en: string; bn: string }> = [
    { id: 'all', en: 'All', bn: 'সব' },
    { id: 'favorites', en: 'Saved', bn: 'প্রিয়' },
    { id: 'action', en: 'Air/Sea', bn: 'এয়ার/স্টান্ট' },
    { id: 'empire', en: 'Empire', bn: 'এম্পায়ার' },
    { id: 'services', en: 'Shops', bn: 'দোকান' },
  ];

  const discoveredCount = markers.filter((m) => discoveredSet.has(m.id)).length;

  return (
    <>
      {/* Responsive Crisp Top-Left Mini-Map Radar */}
      <button
        type="button"
        onClick={onToggleExpand}
        aria-label={t.worldMap}
        className="group relative block rounded-lg overflow-hidden border border-white/25 bg-[#090e18]/94 shadow-xl cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-amber-400 active:scale-[0.98] transition-transform"
      >
        <div className="relative w-[104px] h-[74px] min-[420px]:w-[120px] min-[420px]:h-[84px] sm:w-[148px] sm:h-[106px] md:w-[166px] md:h-[118px]">
          <canvas ref={miniCanvasRef} className="block w-full h-full" />
          <span className="absolute top-1 right-1 p-0.5 rounded bg-[#090d16]/80 text-slate-300 group-hover:text-amber-300 transition-colors">
            <Maximize2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </span>
        </div>
        <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#080c14] border-t border-white/10 flex items-center justify-between gap-1">
          <span className="text-[9px] sm:text-[11px] font-semibold text-slate-100 truncate max-w-[74px] min-[420px]:max-w-[88px] sm:max-w-[116px]">
            {districtLabel}
          </span>
          {gpsActive && (
            <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-mono font-bold text-cyan-300 shrink-0">
              <Navigation className="w-2.5 h-2.5 text-cyan-400" />
              {liveGpsDist > 0 ? `${liveGpsDist}m` : ''}
            </span>
          )}
        </div>
      </button>

      {/* 100% Responsive Full-Screen Interactive Dhaka & Bangladesh Atlas Modal (z-50: always above HUD & controls) */}
      {expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05080f]/95 p-1 sm:p-2.5 md:p-4 safe-inset pointer-events-auto">
          <div className="w-full h-full max-w-6xl max-h-[96dvh] flex flex-col rounded-xl bg-[#0c121e] border border-white/15 overflow-hidden shadow-2xl">
            {/* Compact Responsive Header */}
            <div className="flex items-center justify-between gap-2 px-2.5 sm:px-4 py-2 border-b border-white/10 bg-[#080c15] shrink-0">
              <div className="min-w-0 flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/15 border border-amber-400/35 flex items-center justify-center shrink-0">
                  <Navigation className="w-4 h-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-xs sm:text-base font-bold text-white truncate leading-tight">
                      {language === 'bn' ? 'বাংলাদেশ ও ঢাকা ম্যাপ' : 'Bangladesh & Dhaka Map'}
                    </h2>
                    <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/35 text-[10px] font-display font-bold text-emerald-300">
                      {discoveredCount}/{markers.length} {language === 'bn' ? 'আবিষ্কৃত' : 'Discovered'}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-400 truncate leading-tight">
                    {selectedLabel
                      ? `${language === 'bn' ? 'জিপিএস:' : 'GPS:'} ${selectedLabel}`
                      : t.tapToSetGps}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {/* Switch Dhaka Live Map vs Bangladesh 64-District Official Atlas */}
                <button
                  type="button"
                  onClick={() => {
                    setSidebarOpen(true);
                    setSidebarTab((prev) => (prev === 'dhaka' ? 'bangladesh' : 'dhaka'));
                  }}
                  className={`px-2 sm:px-2.5 py-1.5 rounded-lg border text-[10px] sm:text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                    sidebarTab === 'bangladesh'
                      ? 'bg-emerald-500/20 border-emerald-400/55 text-emerald-200'
                      : 'bg-white/5 border-white/15 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <Globe2 className="w-3.5 h-3.5" />
                  <span className="hidden min-[440px]:inline">
                    {language === 'bn' ? '৬৪ জেলা' : '64 Districts'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRotateRadar((v) => !v)}
                  title={rotateRadar ? 'Radar: Heading-Up' : 'Radar: North-Up'}
                  className={`px-2 py-1.5 rounded-lg border text-[10px] sm:text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                    rotateRadar
                      ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                      : 'bg-white/5 border-white/15 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">
                    {rotateRadar
                      ? language === 'bn'
                        ? 'রোটেট'
                        : 'Rotate'
                      : language === 'bn'
                        ? 'নর্থ-আপ'
                        : 'North'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSidebarOpen((v) => !v)}
                  className={`px-2 py-1.5 rounded-lg border text-[10px] sm:text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                    sidebarOpen
                      ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                      : 'bg-white/5 border-white/15 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {language === 'bn' ? 'তালিকা' : 'Places'}
                  </span>
                </button>

                {gpsActive && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearGps();
                      setSelectedLabel(null);
                    }}
                    className="px-2 sm:px-2.5 py-1.5 rounded-lg bg-rose-600/85 hover:bg-rose-500 text-white text-[10px] sm:text-xs font-semibold cursor-pointer"
                  >
                    {t.clearGps}
                  </button>
                )}

                <button
                  type="button"
                  onClick={onToggleExpand}
                  className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                  aria-label={t.close}
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Responsive Split Workspace: Side-by-side on Landscape/Tablet/Desktop, Stacked on Portrait */}
            <div className="flex-1 min-h-0 flex flex-col landscape:flex-row md:flex-row overflow-hidden">
              {/* Interactive Pan & Zoom Map Canvas */}
              <div
                ref={fullContainerRef}
                className="relative flex-1 min-w-0 min-h-[180px] bg-[#0a101b] overflow-hidden"
              >
                <canvas
                  ref={fullCanvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onWheel={handleWheel}
                  className="block w-full h-full cursor-grab active:cursor-grabbing touch-none"
                />

                {/* Touch-Friendly Zoom / Locate Player / Locate Vehicle / Reset Controls */}
                <div className="absolute right-2 sm:right-3 top-2 sm:top-3 flex flex-col gap-1.5 z-10">
                  <button
                    type="button"
                    onClick={() => handleZoomBy(0.34)}
                    aria-label="Zoom In"
                    className="w-10 h-10 rounded-lg bg-[#090e18]/94 hover:bg-slate-800 border border-white/25 text-white flex items-center justify-center shadow-lg cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleZoomBy(-0.34)}
                    aria-label="Zoom Out"
                    className="w-10 h-10 rounded-lg bg-[#090e18]/94 hover:bg-slate-800 border border-white/25 text-white flex items-center justify-center shadow-lg cursor-pointer active:scale-95"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCenterOnPlayer}
                    aria-label="Center on Player"
                    title={language === 'bn' ? 'নিজের লোকেশনে যান' : 'Center on Player'}
                    className="w-10 h-10 rounded-lg bg-amber-500/25 hover:bg-amber-500/40 border border-amber-400/55 text-amber-300 flex items-center justify-center shadow-lg cursor-pointer active:scale-95"
                  >
                    <LocateFixed className="w-4 h-4" />
                  </button>
                  {hasPlayerVehicle && (
                    <button
                      type="button"
                      onClick={handleCenterOnVehicle}
                      aria-label="Locate Vehicle"
                      title={language === 'bn' ? 'আপনার গাড়ি দেখুন' : 'Locate Vehicle'}
                      className="w-10 h-10 rounded-lg bg-teal-500/25 hover:bg-teal-500/40 border border-teal-400/55 text-teal-300 flex items-center justify-center shadow-lg cursor-pointer active:scale-95"
                    >
                      <Car className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResetView}
                    aria-label="Reset Map View"
                    title={language === 'bn' ? 'রিসেট ম্যাপ' : 'Reset Map'}
                    className="w-10 h-10 rounded-lg bg-[#090e18]/94 hover:bg-slate-800 border border-white/20 text-slate-300 flex items-center justify-center shadow-lg cursor-pointer active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Zoom & Playable Status Pill */}
                <div className="absolute left-2 sm:left-3 top-2 sm:top-3 flex items-center gap-1.5 pointer-events-none">
                  <span className="px-2 py-1 rounded-md bg-[#090e18]/92 border border-white/15 text-[10px] font-mono font-bold text-slate-200">
                    {Math.round(viewport.zoom * 100)}%
                  </span>
                  <span className="px-2 py-1 rounded-md bg-emerald-950/90 border border-emerald-400/40 text-[10px] font-display font-bold text-emerald-300">
                    {language === 'bn'
                      ? `ঢাকা লাইভ (${PLAYABLE_DISTRICTS_COUNT}/৬৪ জেলা)`
                      : `DHAKA LIVE (${PLAYABLE_DISTRICTS_COUNT}/64 DISTRICTS)`}
                  </span>
                </div>

                {/* Compact Color-Coded Legend */}
                <div className="absolute left-2 right-2 bottom-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 px-2.5 py-1.5 rounded-lg bg-[#080c15]/92 border border-white/12 text-[9.5px] sm:text-[10.5px] text-slate-300 pointer-events-none">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    {language === 'bn' ? 'আপনি / হেলিপ্যাড' : 'You / Helipad'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-teal-400" />
                    {language === 'bn' ? 'আপনার গাড়ি' : 'Vehicle'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    {language === 'bn' ? 'বোট পিয়ার' : 'Pier'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {language === 'bn' ? 'পুলিশ কোণ' : 'Police'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    {language === 'bn' ? 'দোকান / আবিষ্কৃত' : 'Shops / Found'}
                  </span>
                </div>
              </div>

              {/* Filterable Sidebar: Playable Dhaka POIs OR Official Bangladesh 8-Division / 64-District Atlas */}
              {sidebarOpen && (
                <div className="w-full h-[42%] landscape:h-auto landscape:w-[240px] sm:landscape:w-[270px] md:h-auto md:w-[285px] lg:w-[310px] shrink-0 flex flex-col border-t landscape:border-t-0 landscape:border-l md:border-t-0 md:border-l border-white/10 bg-[#0a0f1a] min-h-0">
                  {/* Sidebar Mode Switch + Search Box */}
                  <div className="p-2 border-b border-white/10 space-y-2 shrink-0">
                    <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-[#060911] border border-white/10">
                      <button
                        type="button"
                        onClick={() => setSidebarTab('dhaka')}
                        className={`py-1.5 rounded-md text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                          sidebarTab === 'dhaka'
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        <MapPin className="w-3 h-3" />
                        <span>{language === 'bn' ? 'ঢাকা লোকেশন' : 'Dhaka Places'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSidebarTab('bangladesh')}
                        className={`py-1.5 rounded-md text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                          sidebarTab === 'bangladesh'
                            ? 'bg-emerald-500 text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        <Globe2 className="w-3 h-3" />
                        <span>{language === 'bn' ? 'বাংলাদেশ (৬৪)' : 'Bangladesh (64)'}</span>
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={
                          sidebarTab === 'dhaka'
                            ? language === 'bn'
                              ? 'লোকেশন খুঁজুন...'
                              : 'Search Dhaka locations...'
                            : language === 'bn'
                              ? 'জেলা বা উপজেলা খুঁজুন...'
                              : 'Search 64 districts / upazilas...'
                        }
                        className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-[#060a13] border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400/60"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          aria-label="Clear search"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {sidebarTab === 'dhaka' ? (
                      <div className="flex items-center gap-1 overflow-x-auto strip-scroll">
                        {categoryTabs.map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setCategory(tab.id)}
                            className={`px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                              category === tab.id
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-white/5 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            {language === 'bn' ? tab.bn : tab.en}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 overflow-x-auto strip-scroll">
                        <button
                          type="button"
                          onClick={() => setSelectedDivision('all')}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                            selectedDivision === 'all'
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {language === 'bn' ? 'সব (৮)' : 'All (8)'}
                        </button>
                        {BANGLADESH_DIVISIONS.map((div) => (
                          <button
                            key={div.id}
                            type="button"
                            onClick={() => setSelectedDivision(div.id)}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                              selectedDivision === div.id
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-white/5 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            {language === 'bn'
                              ? div.nameBn.replace(' বিভাগ', '')
                              : div.nameEn.replace(' Division', '')}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Scrollable Directory List */}
                  <div className="flex-1 min-h-0 overflow-y-auto modal-scroll p-2 space-y-1.5">
                    {sidebarTab === 'dhaka' ? (
                      filteredMarkers.length > 0 ? (
                        filteredMarkers.map((m) => {
                          const isFav = favoriteSet.has(m.id);
                          const isDiscovered = discoveredSet.has(m.id);
                          return (
                            <div
                              key={m.id}
                              className="w-full rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/10 flex items-center gap-1 pr-1.5 transition-colors"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  onSetGps(m.x, m.z, m.labelEn, m.labelBn);
                                  setSelectedLabel(language === 'bn' ? m.labelBn : m.labelEn);
                                  setViewport((prev) =>
                                    clampCenter(m.x, m.z, Math.max(1.45, prev.zoom))
                                  );
                                }}
                                className="flex-1 min-w-0 px-2.5 py-2 text-left flex items-center justify-between gap-1.5 cursor-pointer"
                              >
                                <div className="min-w-0 flex items-center gap-2">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: markerColor(m.type) }}
                                  />
                                  <span className="text-[11px] sm:text-xs font-semibold text-slate-100 truncate">
                                    {language === 'bn' ? m.labelBn : m.labelEn}
                                  </span>
                                  {isDiscovered && (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                  )}
                                </div>
                                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                  {m.dist}m
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onToggleFavoriteMap(m.id)}
                                aria-label="Toggle favorite location"
                                className="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center shrink-0 cursor-pointer"
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    isFav ? 'text-amber-400 fill-amber-400' : 'text-slate-500'
                                  }`}
                                />
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-6 text-center text-xs text-slate-400">
                          {language === 'bn'
                            ? 'কোনো লোকেশন পাওয়া যায়নি'
                            : 'No matching Dhaka locations'}
                        </div>
                      )
                    ) : (
                      <>
                        <div className="px-2 py-1.5 rounded-lg bg-[#0d1526] border border-emerald-500/25 text-[10px] text-slate-300 leading-snug">
                          {language === 'bn'
                            ? 'সঠিক ৮ বিভাগ ও ৬৪ জেলা তালিকা। বর্তমানে ঢাকা প্লেয়েবল; ফেজ ৩-এ ফরিদপুর জেলা ও পদ্মা ফেরি রুট যুক্ত হবে।'
                            : 'Official 8 Divisions & 64 Districts catalog. Dhaka is playable now; Faridpur District & Padma ferry corridor are scheduled next in Phase 3.'}
                        </div>
                        {filteredDistricts.map((dist) => {
                          const isPlayable = dist.status === 'playable';
                          const isPhase3 = dist.status === 'planned_phase3';
                          return (
                            <div
                              key={dist.id}
                              onClick={() => {
                                if (isPlayable) {
                                  setSidebarTab('dhaka');
                                  handleResetView();
                                }
                              }}
                              className={`p-2 rounded-lg border text-left space-y-1 ${
                                isPlayable
                                  ? 'bg-emerald-500/12 border-emerald-400/45 cursor-pointer hover:bg-emerald-500/20'
                                  : isPhase3
                                    ? 'bg-amber-500/10 border-amber-400/35'
                                    : 'bg-white/[0.03] border-white/10'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-xs font-bold text-white truncate">
                                  {language === 'bn' ? dist.nameBn : dist.nameEn}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-display font-bold uppercase shrink-0 ${
                                    isPlayable
                                      ? 'bg-emerald-500 text-slate-950'
                                      : isPhase3
                                        ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40'
                                        : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {isPlayable
                                    ? language === 'bn'
                                      ? 'প্লেয়েবল'
                                      : 'PLAYABLE'
                                    : isPhase3
                                      ? language === 'bn'
                                        ? 'ফেজ ৩ পরবর্তী'
                                        : 'PHASE 3 NEXT'
                                      : language === 'bn'
                                        ? 'পরিকল্পিত'
                                        : 'PLANNED'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {(language === 'bn' ? dist.sampleUpazilasBn : dist.sampleUpazilasEn).join(
                                  ' · '
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[9.5px] text-slate-400">
                                {dist.highwayLinks.length > 0 && (
                                  <span className="font-mono text-amber-300/90">
                                    {dist.highwayLinks.join('/')}
                                  </span>
                                )}
                                {dist.hasRailway && (
                                  <span className="inline-flex items-center gap-0.5 text-sky-300">
                                    <TrainFront className="w-2.5 h-2.5" />
                                    Rail
                                  </span>
                                )}
                                {dist.hasFerryPort && (
                                  <span className="inline-flex items-center gap-0.5 text-cyan-300">
                                    <Ship className="w-2.5 h-2.5" />
                                    Ferry
                                  </span>
                                )}
                                {dist.hasAirport && (
                                  <span className="inline-flex items-center gap-0.5 text-amber-300">
                                    <Plane className="w-2.5 h-2.5" />
                                    Air
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
