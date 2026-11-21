# GTA DHAKA: City of Chaos — Update 2.0 Changelog

**Release:** Update 2.0 — *Life, Crime & Special Operations*  
**Compatibility:** Non-destructive upgrade over Save v1 & Save v2 (`gta_dhaka_save_v3`)

---

## Highlights

- **Dhaka Special Operations HQ:** Dedicated 3D exterior (entrance canopy, cyan bollards, rooftop helipad & comms mast, outdoor tactical parking bay with unlocked `Spec Ops Tactical SUV`) and multi-zone 3D walk-in interior (Reception, Holographic Briefing Table, Operations Control Room Terminal, Tactical Armory, Indoor Vehicle Bay, Results Board, and 4 HQ officers).
- **5 Playable Special Operations Missions:** Fictional gangs only (*Iron Syndicate*, *Black Viper Crew*, Boss *Raza*) featuring clue investigation, hostile neutralization, civilian/VIP rescue & escort, police support, prerequisites, and finale unlock rewards (`Platinum Ops Commander` uniform + `Tactical Interceptor SUV`).
- **3-Member Squad Companion AI:** *Sgt. Hasan*, *Cpl. Rafi*, and *Medic Nabila* with obstacle avoidance, automatic vehicle boarding/exit, hostile engagement, medic healing, stuck recovery, 5 commands (`1`–`5` / touch bar), and Tactical Subdue (`R` / touch button).
- **8 Playable Open-World Side Activities:** Emergency rescue, taxi passenger run, medical supply drop, executive VIP chauffeur, garage vehicle recovery, city express delivery, police patrol assist, and Hatirjheel skyline photo tour—all with rewards and cooldowns.
- **Expanded World Life & Police:** Diverse Dhaka NPC roles (civilian, shopkeeper, security, medical, DMP police, HQ duty officer *Capt. Imran*), 0-star ambient DMP police patrol, mission police backup zones, and live Dhaka Emergency Dispatch alerts.
- **Progression, Ranking & Onboarding:** Bronze/Silver/Gold/Platinum mission ranks, completion %, mission history, career stats, duplicate first-clear reward protection, and an 8-step interactive tutorial with Skip support.
- **Upgraded DhakaOS Smartphone (9 Apps):** Ops, Alerts, Squad, Log, Stats, FM Radio/Weather, Quick GPS, Summon Ride, and City Services/Photo Mode.

---

## New Files Added

| File | Purpose |
|---|---|
| `src/data/specialOps.ts` | Defines `SPEC_OPS_OUTFITS` (3 tactical uniforms), `SPECIAL_OPS_MISSIONS` (5 operations), `SIDE_ACTIVITY_MISSIONS` (8 side activities), and `TUTORIAL_STEPS` (8 steps). |
| `src/ai/SpecialOpsEncounterManager.ts` | Spawns and manages 3D clues, hostile gang actors & Boss *Raza* with HP bars, rescued civilians/VIPs (follow, vehicle board, extract), pulse tracers, and Three.js disposal (`clearEncounter`). |
| `src/ai/SquadManager.ts` | Manages 3-member companion squad AI, 5 tactical commands, obstacle avoidance, vehicle boarding, hostile targeting, medic healing, and stuck recovery. |
| `src/ai/EmergencyResponseManager.ts` | Generates seeded & dynamic Dhaka Emergency Dispatch alerts linked to playable missions/activities and GPS coordinates. |
| `src/ui/SpecialOpsModal.tsx` | HQ Command Terminal UI (briefings, ranks, prerequisites, difficulty, deploy), Tactical Armory (try-on/equip + unlock gates), and HQ Results Board. |
| `src/ui/SquadCommandBar.tsx` | Floating mobile/desktop squad health & 5-command tactical bar plus contextual `Subdue Hostile [R]` action button. |
| `src/ui/TutorialOverlay.tsx` | Non-blocking 8-step onboarding guide with progress indicator and `Skip Tutorial` button. |
| `DEVELOPMENT_STATUS.md` | Honest system-by-system verification matrix. |
| `BUG_REPORT.md` | Audit of fixed bugs, known limitations, and manual QA checklist. |
| `UPDATE_2_0_CHANGELOG.md` | This release changelog. |
| `SPECIAL_OPERATIONS_MISSION_GUIDE.md` | Complete tactical guide to HQ, missions, side activities, and squad commands. |

---

## Existing Files Modified

| File | Summary of Changes |
|---|---|
| `src/types/game.ts` | Added `MissionRank`, `SquadCommand`, `NpcRole`, `'spec_ops_hq'`, `'spec_ops' \| 'activity'`, HQ/clue/hostile interactions, `MissionHistoryEntry`, `PlayerStats`, `SquadMemberSnapshot`, `EmergencyAlert`, `TutorialProgress`, and Save v3 types. |
| `src/save/SaveManager.ts` | Upgraded to `gta_dhaka_save_v3` with non-destructive v1/v2 migration (preserves legacy keys, auto-completes tutorial for returning players), `detectRecommendedQuality()`, and `DEFAULT_STATS`. |
| `src/audio/AudioManager.ts` | Added `'briefing'`, `'squad_cmd'`, `'clue'`, and `'alert'` synthesized chimes. |
| `src/i18n/translations.ts` | Added complete English & Bangla translations for all Update 2.0 UI strings. |
| `src/data/missions.ts` | Preserved all 10 original missions and re-exported `SPECIAL_OPS_MISSIONS` & `SIDE_ACTIVITY_MISSIONS`. |
| `src/data/shops.ts` | Merged `SPEC_OPS_OUTFITS` into `OUTFIT_CATALOG` (8 total outfits) and added 13th enterable building `bldg_spec_ops_hq` (`38.0, 46.8`). |
| `src/missions/MissionManager.ts` | Added `getAllMissionsCatalog()` (23 total), `loadProgression()`, prerequisite gating, activity cooldowns, completion %, Bronze–Platinum ranking, first-clear tracking, and stages (`investigate_clue`, `neutralize_hostiles`, `escort_civilians`, `protect_zone`). |
| `src/world/DhakaWorld.ts` | Added Special Ops HQ exterior, rooftop helipad/comms mast, cyan-striped tactical parking bay, `'hq'` map marker, and Banani Link / Special Ops Command District labels. |
| `src/world/InteriorManager.ts` | Added multi-zone `spec_ops_hq` 3D walk-in interior with Operations Terminal, Tactical Armory, Briefing Table, Vehicle Bay, Results Board, and 4 officers. |
| `src/vehicles/VehicleManager.ts` | Added unlocked parked `Spec Ops Tactical SUV` (`veh_specops_suv`) at HQ parking bay `(49.5, 42.0)`. |
| `src/npcs/NPCManager.ts` | Added diverse NPC roles & uniforms plus stationed HQ Duty Officer *Capt. Imran* at `(35.8, 48.0)`. |
| `src/police/PoliceManager.ts` | Added 1 ambient patrolling DMP cruiser at 0 stars and `setSupportZone(active, x, z)` for mission backup. |
| `src/core/Game.ts` | Wired `SpecialOpsEncounterManager`, `SquadManager`, `EmergencyResponseManager`, HQ stations, clue inspection, Tactical Subdue (`KeyR`), squad commands (`Digit1`–`Digit5`), 8-step tutorial tracking, finale unlocks, Save v3, and clean disposal. |
| `src/ui/SmartphoneModal.tsx` | Expanded DhakaOS from 4 tabs to 9 functional apps (Ops, Alerts, Squad, Log, Stats, FM/Weather, GPS, Ride, Services/Photo). |
| `src/ui/MissionModal.tsx` | Updated to list all 23 missions with category filters, rank badges, prerequisite locks, cooldown timers, and completion %. |
| `src/ui/HUD.tsx` | Added live encounter counters (civilians safe, hostiles left, clues found), secondary bonus indicator, and mission rank/unlock banner. |
| `src/ui/MiniMap.tsx` | Added HQ marker (`#0ea5e9`), Squad cyan blips, Civilian emerald blips, and Hostile/Boss blips. |
| `src/App.tsx` | Integrated `SpecialOpsModal`, `SquadCommandBar`, `TutorialOverlay`, and updated HUD/player state wiring. |
| `GAME_REVIEW_DOCUMENTATION.md` | Updated full bilingual game review to document all Update 2.0 systems. |

---

## Save System v3 Migration Notes

- **New Storage Key:** `gta_dhaka_save_v3`
- **Legacy Keys Preserved:** `gta_dhaka_save_v1` and `gta_dhaka_save_v2` are **never deleted** during migration.
- **Returning Players:** Money, health, appearance, inventory, owned vehicles, completed missions, time of day, and settings carry over automatically; `tutorialCompleted` is automatically set to `true` so returning players are not forced through onboarding.

---

## Verification Summary

- **`tsc --noEmit`**: Passed (0 errors).
- **Vite Production Build (`npm run build`)**: Passed.
- **Automated Core Logic Smoke Checks (`npx tsx`)**: Passed for Save v2→v3 migration, 23-mission catalog, prerequisite lock on Op 05, first-clear vs. replay payout scaling, activity cooldowns, multi-stage Op 02 Platinum simulation, 13 buildings, 8 outfits, and emergency alerts.
- **Live Browser / Mobile Device Playtesting**: Not executed in this automated environment; see `DEVELOPMENT_STATUS.md` and `BUG_REPORT.md` for manual QA checklist.
