# BANGLADESH OPEN WORLD ARCHITECTURE

## 1. Architectural Vision
**GTA Dhaka: City of Chaos** is engineered on a modular Three.js/WebGL + React 19 + TypeScript architecture designed to scale safely from the current playable Dhaka metropolitan core to a connected multi-division Bangladesh open world optimized for mid-range Android devices.

Rather than loading an entire country into GPU memory simultaneously, the world architecture separates **Administrative Data**, **Chunk Streaming & LOD**, **Regional Biomes**, and **Persistent Save State**.

---

## 2. World Data Hierarchy
The official administrative hierarchy of Bangladesh is encoded in `src/data/bangladeshAtlas.ts`:

```
Bangladesh (Country)
 └── 8 Official Administrative Divisions
      ├── Dhaka (13 districts)
      ├── Chattogram (11 districts)
      ├── Rajshahi (8 districts)
      ├── Khulna (10 districts)
      ├── Barishal (6 districts)
      ├── Sylhet (4 districts)
      ├── Rangpur (8 districts)
      └── Mymensingh (4 districts)
           └── 64 Official Districts
                ├── District Headquarters (HQ)
                ├── Official Upazilas (representative set per district)
                ├── National Highway Corridors (N1–N8, regional links)
                ├── Transport Infrastructure Flags (Railway / Ferry Port / Airport)
                └── Explicit Playability Status (`playable` | `planned_phase3` | `planned`)
```

---

## 3. Modular Chunk Streaming & LOD Architecture (`src/world/WorldChunkManager.ts`)
Each district is decomposed into bounded spatial chunks (`WorldChunkDescriptor`) with three runtime states:
- **`active`**: Full high-detail geometry, collision boxes, enterable doors, traffic lanes, NPCs, and interactive POIs.
- **`lod_proxy`**: Low-poly horizon silhouettes and highway connectors rendered beyond active radius.
- **`unloaded`**: Released from scene graph and physics collision queries to keep Android RAM and draw calls flat.

### Quality-Scaled Streaming Radii (Android Performance Guardrails)
| Quality Preset | Active Radius | LOD Proxy Radius |
| --- | --- | --- |
| `LOW` | 150m | 260m |
| `MEDIUM` | 190m | 340m |
| `HIGH` | 240m | 440m |
| `ULTRA` | 300m | 560m |

### Active Chunks Today
1. `dhaka_gulshan_core` — Gulshan Avenue & Circle (`playable`, `active`)
2. `dhaka_mohakhali_flyover` — Mohakhali Flyover & Banani Link (`playable`, `active`)
3. `dhaka_hatirjheel_waterfront` — Hatirjheel Lake, Boat Pier & Helipad (`playable`, `active`)
4. `dhaka_spec_ops_east` — Special Ops Command & East Ring (`playable`, `active`)

### Registered Expansion Stub (Next Phase)
- `faridpur_corridor_phase3` — Faridpur District & Padma Ferry Corridor (`playable: false`, `unloaded` until Phase 3 3D terrain, village roads, and Padma crossing are built)

---

## 4. Regional Biome Palette System
Eight regional biomes are defined for future district streaming so urban centers, villages, rivers, hills, and coastal areas retain distinct visual identity without monolithic asset duplication:
- `urban_megacity` (Dhaka metropolitan core, flyovers, commercial towers)
- `riverine_delta` (Faridpur, Barishal, Munshiganj, ferry ghats, canals, bridges)
- `coastal_port` (Chattogram, Cox's Bazar, port cranes, coastal highways)
- `tea_hills` (Sylhet, Moulvibazar, tea garden slopes, rain-rich valleys)
- `barind_agri` (Rajshahi, Bogura, Naogaon, agricultural fields, mango orchards)
- `mangrove_coastal` (Khulna, Bagerhat, Satkhira, tidal waterways)
- `northern_plains` (Rangpur, Dinajpur, open agricultural roads)
- `haor_greenery` (Mymensingh, Netrokona, Kishoreganj, wetlands and green plains)

---

## 5. Discovery & Save Persistence Compatibility
- `WorldChunkManager` performs throttled (`0.45s`) zero-GC proximity checks against playable map POIs to unlock discovered places (`+৳250` exploration bonus).
- `SaveManager` (`src/save/SaveManager.ts`) preserves full backward compatibility with all existing player save files (v1/v2/v3), hydrating new fields (`favoriteMapIds`, `discoveredPlaceIds`, `vehicleCameraPreset`, `vehicleCameraZoom`, `mobileControls`) safely with defaults if absent.
