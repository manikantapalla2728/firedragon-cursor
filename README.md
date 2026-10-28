# 02 — Fire Dragon

Procedural 3D dragon in Three.js (r149 bundled in `assets/`, works offline from `file://`).

- **Body:** 43 lava-scaled segments with glowing dorsal spikes and a heat pulse travelling head to tail; bladed tail tip.
- **Head:** skull, snout, hinged jaw with teeth, swept horns and brow ridges, glowing eyes and nostrils, glowing throat.
- **Wings:** bone-and-membrane wings rebuilt every frame (arm, forearm, three fingers, vertex-coloured membrane). Slow flap when idle, faster and deeper with speed, trailing lag at the tips.
- **Legs:** four legs with real two-bone IK, trot gait (diagonal pairs), stride grows with speed.
- **Fire:** GPU point-sprite shader with a white-yellow → orange → red ramp; mouth flame, spine licks, turbulence noise; flickering point light.

## Run
Open `index.html`. **Click** = fire breath. **F** or double-click = fullscreen.

## Movement
Head = damped spring toward the pointer with small offset (overshoot gives inertia). Body follows head as a chain with a gentle wave. When the mouse is still for 0.7 s the head circles slowly, wings keep flapping, legs settle.

## 15-second demo
`index.html?demo` (scripted path, flame breaths at ~9 s and ~12.6 s).
`index.html?demo&record` records the canvas and downloads `fire_dragon_preview.webm` — put it in `preview/`.

## Status
Syntax-checked only; not yet viewed in a browser by the author. Wing/leg proportions may need tuning after a first look.
