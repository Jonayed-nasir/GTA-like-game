# GTA DHAKA: City of Chaos — Development Status (Update 2.0)

This matrix separates what is **implemented and verified via TypeScript/Vite build and automated Node logic checks** from what **still requires live browser / mobile touch device playtesting** (no unverified live-device claims are made).

---

## Verification Legend

- **BUILD + LOGIC VERIFIED**: Source code implemented, compiled cleanly with `tsc --noEmit` and `npm run build`, and core state/data logic executed and verified via automated Node runtime checks (`npx tsx`).
- **BUILD VERIFIED · LIVE PLAYTEST PENDING**: Source code implemented, wired end-to-end, and passes strict TypeScript (`tsc --noEmit`) + Vite production build (`npm run build`), but requires interactive WebGL browser/mobile device testing to confirm 3D visuals, frame pacing, audio output, and touch ergonomics.

---

## System-by-System Status Matrix

| System / Feature | Status | Notes & Evidence |
|---|---|---|
| **Core 3D Dhaka Open World** (Gulshan, Banani Link, Mohakhali Flyover, Hatirjheel Lake & Arch Bridge) | BUILD VERIFIED · LIVE PLAYTEST PENDING | Preserved existing geometry, collision boxes, day/night cycle, monsoon rain/storm, and added Special Ops Command District labels & map markers (`src/world/DhakaWorld.ts`). |
| **Special Operations HQ Exterior** (`38, 46.8`) | BUILD VERIFIED · LIVE PLAYTEST PENDING | 3D HQ building facade, entrance canopy, cyan bollards, rooftop helipad & comms mast, outdoor cyan-striped Tactical Parking Bay (`49.5, 42.0`) with unlocked `Spec Ops Tactical SUV`. |
| **Special Operations HQ 3D Walk-In Interior** | BUILD VERIFIED · LIVE PLAYTEST PENDING | 11.5m×11.5m×5.2m multi-zone interior (`src/world/InteriorManager.ts`): Reception desk, central holographic Dhaka Briefing Table, Operations Control Room Terminal (`-6.8, -2.4`), Tactical Armory (`6.8, -2.4`), indoor Tactical SUV bay, Results Board, and 4 NPC officers. |
| **12 Existing Enterable 3D Buildings** | BUILD + LOGIC VERIFIED (Catalog) · LIVE PLAYTEST PENDING (3D) | Verified `ENTERABLE_BUILDINGS.length === 13` (all 12 preserved + `bldg_spec_ops_hq`). |
| **9 Drivable Vehicle Classes + Mode A/B Controls + NOS + Drift** | BUILD VERIFIED · LIVE PLAYTEST PENDING | All existing physics, vehicle models, Mode A (joystick) and Mode B (buttons), driving assist, cameras, and audio preserved; added HQ parked `veh_specops_suv` and unlockable `Tactical Interceptor SUV`. |
| **5 Playable Special Operations Missions** | BUILD + LOGIC VERIFIED | Verified in `MissionManager` catalog (`specOps: 5`), prerequisite lock on `specops_05_final_resolve` (requires Op 01 & Op 02), multi-stage clue → hostile → escort flow, and Platinum rank calculation. |
| **8 Playable Open-World Side Activities** | BUILD + LOGIC VERIFIED | Verified in `MissionManager` catalog (`activities: 8`), completion rewards, replay scaling, and cooldown blocking (`getCooldownRemainingSec`). |
| **10 Original Missions** | BUILD + LOGIC VERIFIED | All 10 original missions preserved (`original: 10`, total catalog `23`). |
| **Special Ops Encounters (Clues, Hostiles, Boss Raza, Rescued Civilians/VIPs)** | BUILD VERIFIED · LIVE PLAYTEST PENDING | `src/ai/SpecialOpsEncounterManager.ts` spawns 3D clues, fictional gang actors (*Iron Syndicate* / *Black Viper Crew* / Boss *Raza*) with HP bars, escorted civilians/VIPs, pulse tracers, and disposes meshes/materials in `clearEncounter()`. |
| **3-Member Squad Companion AI** (*Sgt. Hasan*, *Cpl. Rafi*, *Medic Nabila*) | BUILD VERIFIED · LIVE PLAYTEST PENDING | `src/ai/SquadManager.ts` implements obstacle avoidance, auto vehicle enter/exit, hostile engagement tracers, medic healing, stuck recovery, and 5 commands (`Follow`, `Hold`, `Objective`, `Regroup`, `Protect`) via `SquadCommandBar` & keys `1`–`5`. |
| **Enhanced NPC Roles & Ambient/Support Police** | BUILD VERIFIED · LIVE PLAYTEST PENDING | `src/npcs/NPCManager.ts` adds civilian, shopkeeper, police, medical, security, and stationed HQ Duty Officer roles; `src/police/PoliceManager.ts` adds 1 ambient DMP patrol cruiser at 0 stars + `setSupportZone()` mission backup. |
| **Live Dhaka Emergency Alerts** | BUILD + LOGIC VERIFIED | `src/ai/EmergencyResponseManager.ts` verified with 3 seeded alerts + rotating dynamic dispatch alerts, each carrying `linkedMissionId` and valid world coordinates. |
| **Mission Progression, Ranking & Replay Protection** | BUILD + LOGIC VERIFIED | Verified Bronze/Silver/Gold/Platinum ranking, completion %, first-clear reward tracking (`claimedRewardIds`), and scaled replay payouts to prevent duplicate first-clear farming. |
| **8-Step Interactive New-Player Tutorial** | BUILD + LOGIC VERIFIED (Save/State) · LIVE PLAYTEST PENDING (UI) | `TUTORIAL_STEPS` (8 steps) + `TutorialOverlay` with `Skip Tutorial`; verified auto-skip (`tutorialCompleted: true`) when migrating legacy v1/v2 saves. |
| **DhakaOS Smartphone (9 Apps)** | BUILD VERIFIED · LIVE PLAYTEST PENDING | Upgraded `src/ui/SmartphoneModal.tsx` with Ops, Alerts, Squad, Log (History), Stats, FM Radio/Weather, GPS, Ride, and City Services/Photo Mode. |
| **Save System v3 (`gta_dhaka_save_v3`) & Migration** | BUILD + LOGIC VERIFIED | Automated Node test verified `gta_dhaka_save_v2` → `gta_dhaka_save_v3` migration preserves money, inventory, vehicles, completed missions, keeps `gta_dhaka_save_v2` intact as backup, and sets `tutorialCompleted: true`. |
| **Bilingual EN / BN Localization** | BUILD VERIFIED | Strict `TranslationBundle` interface verified via `tsc --noEmit` with 0 missing keys across both English and Bangla bundles. |
| **Audio Chimes & Web Audio Synth** | BUILD VERIFIED · LIVE PLAYTEST PENDING | Added `'briefing'`, `'squad_cmd'`, `'clue'`, and `'alert'` synthesized sound effects to `src/audio/AudioManager.ts`. |
| **Responsive Mobile & Desktop UI** | BUILD VERIFIED · LIVE PLAYTEST PENDING | Uses `100dvh`, `safe-area-inset`, compact touch buttons, and avoids `backdrop-blur` over WebGL. Requires manual check on 360px portrait, short mobile landscape, tablet, and desktop viewports. |

---

## Automated Verification Runs Completed

1. **`tsc --noEmit` (`lint_applet`)**: **PASSED (exit code 0, 0 errors)**.
2. **Production Build (`compile_applet` / Vite)**: **PASSED (Build succeeded)**.
3. **Node Core Logic Smoke Suite (`npx tsx`)**: **PASSED**:
   - Save v2 → v3 migration preserved `money: 42500`, `completedMissionIds: 2`, kept `gta_dhaka_save_v2`, wrote `gta_dhaka_save_v3`, and set `tutorialCompleted: true`.
   - Mission catalog counts verified: `23` total (`10` original, `5` Special Ops, `8` Side Activities).
   - Prerequisite lock verified: `specops_05_final_resolve` blocked until `specops_01_safe_passage` and `specops_02_silent_rescue` are completed.
   - Replay & cooldown verified on `act_exploration_challenge`: first clear paid `৳ 3,500` (`PLATINUM`), immediate restart blocked by cooldown, post-cooldown replay paid scaled `৳ 2,975` (`firstClear: false`).
   - Multi-stage Special Ops simulation verified on `specops_02_silent_rescue` (`HARD`): stage 1 clues → stage 2 hostiles → stage 3 civilian escort completed with `PLATINUM` rank.
   - World catalogs verified: `13` enterable buildings (including `bldg_spec_ops_hq`), `8` outfits (`5` original + `3` Special Ops), `3` seeded emergency alerts with valid `linkedMissionId` bindings.

---

## Remaining Manual QA Checklist (Not Yet Executed on Live Device)

- [ ] Launch WebGL preview on desktop Chromium/Firefox and confirm 0 console errors.
- [ ] Walk into Special Operations HQ (`38, 46.8`), interact with Operations Terminal (`-6.8, -2.4`) and Armory (`6.8, -2.4`), equip tactical uniform, and exit smoothly.
- [ ] Play through Operations 01–05 end-to-end and confirm squad vehicle boarding/alighting, clue inspection, Tactical Subdue (`R`), and Boss Raza encounter visuals.
- [ ] Verify mobile touch responsiveness on narrow portrait (~360×800) and short landscape (~800×360) screens for `HUD`, `SquadCommandBar`, `TutorialOverlay`, and `SmartphoneModal`.
- [ ] Verify Web Audio playback after initial user gesture on iOS Safari / Android Chrome.
