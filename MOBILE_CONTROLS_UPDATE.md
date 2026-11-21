# MOBILE CONTROLS & CAMERA UPDATE

## 1. Mobile Driving & Shooting Controls Overhaul (`src/ui/MobileControls.tsx`)
All primary touch controls were audited against small-screen Android phones (portrait & landscape) and redesigned for ergonomic thumb reach and zero accidental misses:

### Steering Controls
- **Dual Mode Support**: Switch seamlessly between **Virtual Steering Joystick** (`w-28 h-28` / `sm:w-34 sm:h-34`, enlarged tactile knob with smooth non-linear response curve for fine steering control) and **Left/Right Steering Buttons** (`w-16 h-16` / `sm:w-20 sm:h-20` with `gap-3`).
- **Adjustable Steering Sensitivity**: Tunable from `50%` to `180%` inside both Pause Settings and the live Control Layout Editor.
- **Pressed Feedback**: High-contrast amber highlight, `scale-95` tactile press animation, and outer glow ring (`ring-4`) while held.

### Accelerator (Gas) & Brake/Reverse Pedals
- **Larger Touch Targets**:
  - **GAS Pedal**: `w-17 h-21` (`sm:w-20 sm:h-24`) with icon + crisp `GAS` / `গ্যাস` label and bright emerald press highlight.
  - **BRAKE / REVERSE Pedal**: `w-15 h-17` (`sm:w-18 sm:h-20`) with `BRAKE` / `ব্রেক` label and vivid crimson press highlight.
  - **Generous Spacing**: `gap-2.5` between Drift, Reverse, Brake, and Gas so thumbs do not accidentally trigger adjacent pedals.
- **Helicopter Flight Controls**: Enlarged `DOWN`, `LIFT`, and `FLY` triggers when piloting the Dhaka Rescue Helicopter.

### Enlarged Shooting / Fire Trigger
- **On-Foot Fire/Punch Button**: Upgraded to `w-18 h-18` (`sm:w-20 sm:h-20`) with independent `fireScale` (`90%–145%`, default `115%`) and independent drag offset (`fireOffset`), allowing comfortable simultaneous movement, camera aiming, and firing.
- **Drive-By Fire Trigger**: Enlarged to `w-12 h-12` (`sm:w-13 sm:h-13`) on the driving utility bar — never overlapping Gas or Brake pedals.

---

## 2. Custom Mobile Control Layout System (`src/ui/ControlLayoutEditor.tsx`)
Accessible via **Pause Menu → Settings → Customize Button Size, Position & Opacity** (or Controls tab):
- **3 Built-in Presets**:
  1. **Classic**: Balanced Joystick + enlarged right pedals & fire trigger (`108%` scale, `115%` fire scale, `92%` opacity).
  2. **Advanced**: Left/Right Steering Pads + extra-large action pedals (`114%` scale, `122%` fire scale, `94%` opacity).
  3. **Custom**: Automatically activated whenever you drag clusters or adjust sliders.
- **Interactive Drag-to-Reposition**: Touch-drag **Steering**, **Gas/Brake/Action**, and **Fire** clusters directly on screen.
- **Live Sliders**: Button Size (`85%–135%`), Fire Button Size (`90%–145%`), Opacity (`45%–100%`), and Steering Sensitivity (`50%–180%`).
- **Persistence & Reset**: Saves directly into persistent `SaveData.settings.mobileControls` and includes one-tap **Reset** to default Classic layout.

---

## 3. Vehicle Visual Scale & 3-Mode Vehicle Camera (`src/player/PlayerCamera.ts`, `src/core/PhysicsWorld.ts`)
To fix vehicles looking too small on mobile screens **without altering 3D physical collision boxes or road alignment**, camera framing and projection were re-engineered:
- **3 Selectable Vehicle Camera Modes** (+ Driver Cabin First-Person):
  - **Close Camera**: `4.75m` base distance, `50°` base FOV — bold, hero-sized vehicle framing on phones.
  - **Normal Camera** (Default): `5.85m` base distance, `54°` base FOV (~35–45% larger on-screen vehicle presence than legacy `7.8m / 62°`).
  - **Far Camera**: `7.55m` base distance, `58°` base FOV — wide highway visibility for high-speed chases & stunts.
- **Vehicle-Class Compensation**: Automatic distance/height adjustments for Motorcycles & CNGs (`-0.42m`), Buses/Trucks (`+1.65m`), Speedboats (`+0.85m`), and Helicopters (`+2.6m`).
- **Live Manual Camera Zoom**: Players can tap **Zoom In (`+`) / Zoom Out (`−`)** directly while driving (`72%–145%`) or drag the slider in Pause Settings, with smooth exponential damping.
- **Anti-Clipping Building Raycast**: Zero-allocation AABB slab raycast (`PhysicsWorld.raycastCameraFraction`) pulls the camera smoothly forward whenever a Dhaka building blocks line-of-sight to the vehicle.
