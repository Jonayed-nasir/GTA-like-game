# BUG REPORT & PHASE 1 FIX AUDIT

## Phase 1 Critical Mobile Issues Identified & Fixed

### 1. Mobile Map Visibility, Clipping & Z-Index Overlap
- **Root Cause**: Full-screen map modal previously rendered at `z-40` inside the HUD tree, risking overlap with fixed overlays on small Android screens; lacked a personal vehicle indicator, location search, saved favorites, discovered-place feedback, and reset its selected GPS label on close/reopen.
- **Fix Applied (`src/ui/MiniMap.tsx`, `src/core/Game.ts`)**:
  - Elevated full-screen interactive map to `z-50` with `safe-inset` padding and `max-h-[96dvh]` so it stays fully visible in both portrait and landscape on small Android displays.
  - Added dedicated **Personal Vehicle Indicator** (`snap.playerVehicle`) + one-tap **Locate Vehicle** button.
  - Added **Search**, **Saved Favorites** (persisted in `SaveData.favoriteMapIds`), **Discovered Places Tracker**, and **Official 8 Divisions / 64 Districts Atlas Tab**.
  - GPS destination label and route now persist cleanly when closing and reopening the map.

### 2. Undersized Mobile Driving & Shooting Controls
- **Root Cause**: Driving steering arrows (`w-13 h-13`), brake (`w-12 h-13`), gas (`w-14 h-16`), and fire button (`w-15 h-15`) were further shrunk on landscape phones by `.compact-landscape-scale` (`0.75–0.84x`), making thumbs miss controls during fast turns or gunfights.
- **Fix Applied (`src/ui/MobileControls.tsx`, `src/ui/ControlLayoutEditor.tsx`)**:
  - Removed forced shrinkage on mobile touch clusters and enlarged base button footprints (`w-16 h-16` steering arrows, `w-28 h-28` joystick, `w-15 h-17` brake, `w-17 h-21` gas, `w-18 h-18` fire trigger).
  - Added explicit pressed visual states (`scale-95`, bright active fill, outer ring glow) and generous spacing (`gap-2.5` / `gap-3`).
  - Built full **Custom Control Layout Editor** with **Classic / Advanced / Custom** presets, drag-to-reposition clusters, Button Size, Fire Size, Opacity, and Steering Sensitivity sliders persisted to `localStorage`.

### 3. Vehicles Appearing Too Small & Camera Clipping Into Buildings
- **Root Cause**: `PlayerCamera.ts` used a distant `7.8m` chase offset with wide `62°–76°` FOV and performed no building wall raycast, causing vehicles to look miniature on phones and allowing the camera to clip through nearby facades.
- **Fix Applied (`src/player/PlayerCamera.ts`, `src/core/PhysicsWorld.ts`)**:
  - Preserved exact 3D vehicle meshes, hitboxes, and road physics without artificially scaling models.
  - Re-tuned vehicle framing to **Close (`4.75m / 50°`)**, **Normal (`5.85m / 54°`)**, and **Far (`7.55m / 58°`)** modes with vehicle-class offsets (`motorcycle`/`cng`, `bus`/`truck`, `speedboat`, `helicopter`) and smooth **Manual Camera Zoom (`72%–145%`)** accessible directly while driving.
  - Added zero-allocation `PhysicsWorld.raycastCameraFraction(...)` building-wall raycast so the camera pulls smoothly forward instead of clipping inside buildings.

---

## Residual / Watchlist Items (Monitored for Phase 3)
- **WebGL Multi-Chunk Streaming Memory**: Currently all 4 Dhaka core chunks fit comfortably inside Android WebGL memory (~30–60 FPS). Before adding Faridpur District terrain in Phase 3, procedural mesh disposal/pooling in `WorldChunkManager` will be attached to Three.js geometry/material caches to maintain zero memory leaks across chunk crossings.
- **Small Portrait Viewport Ergonomics**: Full-screen map and Pause menus work cleanly in both portrait and landscape; live driving remains optimized for landscape via `RotateLandscapeGuard` (with optional dismiss for quick portrait map/settings checks).
