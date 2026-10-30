# project-rescue
Rescue map and cordoned rescue teams

## First Light mock (presentation demo)

A simulated, offline demo of the SAR Multi-Team Platform. Nothing in it is live data. Run it with `npm start`, then open http://localhost:3000.

- **Views:** National readiness, Event workspace (Map / Building plans / Digital twin), Teams & coordination, Scenario.
- **Presenter keys:**
  - `→` / `Space` next step, `←` previous step.
  - `Home` restarts the demo.
  - `P` toggles present mode, `F` toggles fullscreen, `Esc` exits.
- **Building plans** is an exploded view: the street plan at the base and every floor of the chosen building stacked above it. It can be saved as PNG or SVG.
- **Your own images:** set `images.before` and `images.after` in `dist/scenario.json` to paths of 1000×600 images. They are laid over the drawn aerial.

AI image prompts (5:3, top-down, building positions must match `buildings` in `scenario.json`):
1. Before: "Top-down orthophoto of a sunny Southern California suburban neighbourhood, wide boulevard across the top, mid-rise condos and apartment blocks along it, single-family homes with pools, palm and oak trees, photorealistic, no text."
2. After: "The same neighbourhood immediately after a major earthquake: two mid-rise buildings pancaked into rubble, partial collapses, dust, debris in streets, same camera and lighting, photorealistic, no text."
3. Drone feed still: "Thermal drone view over earthquake rubble at dusk, warm human-shaped signature in a void, HUD-free, photorealistic."
4. Digital twin: "Isometric 3D reconstruction of a six-storey condo building, half collapsed into rubble, clean point-cloud style, dark background."
